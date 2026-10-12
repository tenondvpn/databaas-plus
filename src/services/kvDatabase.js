// 去中心化数据库（StringKeyValueDatabase 合约）访问层。
//
// 合约源码与 clipy/test_kv.py 中的 KV_DATABASE_SOL 完全一致，这里只做前端调用。
// 读写走两条不同通道：
//   读 —— POST /abi_query_contract，EVM kJustCall，无需签名，不消耗 gas
//   写 —— POST /transaction，自定义报文 + secp256k1 签名，需要 prefund 垫付 gas
import axios from 'axios'
import qs from 'qs'
import { buildAndSignTx, getKeypair } from './signing'
import {
    encodeSet,
    encodeBatchSet,
    encodeGetPaginated,
    decodeEntryArray,
    decodeUint256,
    selector,
} from './abi'

/** step 类型，对应 pools::protobuf::StepType */
export const STEP = {
    NORMAL: 0,
    CONTRACT_GAS_PREFUND: 7,
    CONTRACT_EXECUTE: 8,
}

/**
 * 专用 axios 实例。
 *
 * 不能直接用全局 axios：main.js 在登录后会给它挂上
 * `Authorization: Bearer <token>`，而 Authorization 不在 CORS 简单请求头里，
 * 一旦带上，浏览器就会先发 OPTIONS 预检。链节点（uWS）只实现了 POST，
 * 对 OPTIONS 一律回 404，于是真正的 POST 还没发出去就被浏览器拦掉了。
 *
 * 这里用独立实例并且 withCredentials=false，既不继承那个全局头，
 * 也不带 Cookie —— 链上调用本来就不需要平台的登录态。
 */
const chain = axios.create({ withCredentials: false })

// 节点返回 text/plain，即使内容是 JSON —— 不要交给 axios 自动解析。
const textTransform = [(data) => {
    if (typeof data === 'string') {
        try { return JSON.parse(data) } catch (_) { return data }
    }
    return data
}]

/**
 * 规范化分片节点地址。
 * 支持三种写法：完整 URL、`/api/shardN/` 相对路径、纯主机:端口。
 */
export function shardBaseUrl(shardId, explicitUrl) {
    if (explicitUrl) {
        const trimmed = String(explicitUrl).trim().replace(/\/+$/, '')
        return trimmed.endsWith('/') ? trimmed : trimmed + '/'
    }
    return `/api/shard${shardId}/`
}

async function post(url, endpoint, params, timeout = 15000) {
    const resp = await chain.post(url + endpoint, qs.stringify(params), {
        // 既不要显式声明 Content-Type（qs 序列化后 axios 会自动带上
        // application/x-www-form-urlencoded，且它本就是 CORS 简单类型），
        // 也不要任何自定义头，最大限度避免预检。
        timeout,
        responseType: 'text',
        transformResponse: textTransform,
    })
    return resp.data
}

// ─────────────────────────────────────────────────────────────────────────────
// 账户与 nonce
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 查询账户。节点对不存在的地址返回空 body，因此把「没有 balance 字段」
 * 一律当作未找到。
 */
export async function queryAccount(baseUrl, address) {
    const hex = String(address).toLowerCase().replace(/^0x/, '')
    try {
        const data = await post(baseUrl, 'query_account', { address: hex })
        if (data && typeof data === 'object' && data.balance !== undefined) return data
    } catch (_) {}
    return null
}

/**
 * 合约写入（step=8）的 nonce 记在 40 字节的 `合约地址‖用户地址` 预存账户上，
 * 而不是用户自己的账户 —— 这与 Python SDK 的 send_transaction_auto 一致。
 */
export function prefundAddress(contractAddr, userAddr) {
    const c = String(contractAddr).toLowerCase().replace(/^0x/, '').slice(-40).padStart(40, '0')
    const u = String(userAddr).toLowerCase().replace(/^0x/, '').slice(-40).padStart(40, '0')
    return c + u
}

/** 读取这笔合约调用应该使用的 nonce（未提交前的下一个值） */
export async function nextNonce(baseUrl, nonceAddr) {
    const acc = await queryAccount(baseUrl, nonceAddr)
    return acc ? parseInt(acc.nonce ?? '0', 10) + 1 : 1
}

/**
 * 预存账户的余额读数。账户不存在时节点返回 `get address failed from cache: ...`
 * 而不是 0，因此把「查不到」记成 0，两种写法在下游处理一致。
 */
export async function prefundBalance(baseUrl, contractAddr, userAddr) {
    const acc = await queryAccount(baseUrl, prefundAddress(contractAddr, userAddr))
    return acc ? Number(acc.balance ?? 0) : 0
}

// ─────────────────────────────────────────────────────────────────────────────
// 写：提交交易
// ─────────────────────────────────────────────────────────────────────────────

// 回执状态。节点在交易刚进池、还没落块时也回 HTTP 200，
// 只有拿到终态才算有结论 —— 这与 Python SDK 的 wait_for_receipt 一致。
const RECEIPT_PENDING = new Set([10001, 10003])   // kMessageHandle / kTxAccept
const RECEIPT_NOT_EXISTS = 100010                  // kNotExists
const RECEIPT_SUCCESS = 0                          // kConsensusSuccess

/**
 * 轮询交易回执，直到落块或超时。
 *
 * `/transaction` 只要交易被池子收下就返回 "ok"，那**不代表**共识通过 ——
 * 校验失败（地址不存在、预存不足、gas 不够）都发生在入池之后。
 * 只看 "ok" 会把必然失败的交易报成成功，所以这里必须回执确认。
 */
export async function waitForReceipt(baseUrl, txHash, { timeoutMs = 60000, pollMs = 1000 } = {}) {
    const deadline = Date.now() + timeoutMs
    let notExists = 0

    while (Date.now() < deadline) {
        let data
        try {
            data = await post(baseUrl, 'transaction_receipt', { tx_hash: txHash })
        } catch (_) {
            data = null
        }

        const status = data && typeof data === 'object' ? Number(data.status) : NaN

        if (Number.isFinite(status)) {
            if (status === RECEIPT_SUCCESS) {
                return { ok: true, status, msg: 'ok', receipt: data }
            }
            if (RECEIPT_PENDING.has(status)) {
                notExists = 0
            } else if (status === RECEIPT_NOT_EXISTS) {
                // 入池前的一小段时间查不到是正常的；连续查不到太多轮就当没提交成功
                if (++notExists >= 10) {
                    return { ok: false, status, msg: describeStatus(status), receipt: data }
                }
            } else {
                return { ok: false, status, msg: data.msg || describeStatus(status), receipt: data }
            }
        }

        await new Promise(r => setTimeout(r, pollMs))
    }

    return { ok: false, status: null, msg: `等待回执超时（${Math.round(timeoutMs / 1000)}s），交易可能仍在池中` }
}

/** 把节点状态码翻成人话。表在 src/transport/transport_utils.h */
function describeStatus(status) {
    const table = {
        10001: '交易仍在池中',
        10003: '交易已受理，等待落块',
        10005: '地址无效：合约或预存账户不存在',
        10007: 'nonce 冲突，已有同 nonce 的交易',
        10009: '请求参数无效',
        100010: '交易不存在（未进入池子）',
        5010: '账户余额不足',
        5030: 'gas 不足',
        5049: '预存 gas 不足',
        5051: 'nonce 不合法',
        5053: '合约已销毁',
    }
    return table[status] ?? `交易失败（状态码 ${status}）`
}

/**
 * 签署并提交一笔交易。
 *
 * 节点在 nonce 冲突时返回 `kTxUserNonceInvalid`，这通常意味着上一笔刚提交的交易
 * 还没落块。此时重新拉取 nonce 并重签发送，而不是直接把错误抛给用户。
 *
 * confirm=true 时会等到回执落块再返回。写入类调用应当开启：`/transaction`
 * 的 "ok" 只代表入池，池内校验失败（地址不存在、预存不足、gas 不够）同样返回 "ok"。
 */
export async function sendTransaction(opts) {
    const {
        baseUrl, privateKeyHex, shardId, to, step,
        input, contractBytes, amount = 0, prepay = 0,
        gasLimit = 999999999, nonceAddr, retries = 30,
        confirm = false, confirmTimeoutMs = 60000,
    } = opts

    let nonce = opts.nonce
    let lastErr = ''

    // nonce 记在哪个账户上由 step 决定，不能一律用 to：
    // step=8 走 `合约‖用户` 预存账户，其余（含 step=7 垫付）走用户自己的账户。
    // 如果拿合约地址去查 nonce，通常查不到而返回 1，节点会回 kTxUserNonceInvalid。
    // 对应 shardora_sdk.py 的 `nonce_addr = to + my_addr if step in (8, 9) else my_addr`
    // （step=9 退预存前端未实现，等实现时在此一并加入）。
    const signer = getKeypair(privateKeyHex).accountId
    const idFor = (addr) => {
        const hex = String(addr ?? '').replace(/^0x/, '').toLowerCase()
        return hex.length === 40 ? hex : ''
    }
    const settleAddr = step === STEP.CONTRACT_EXECUTE
        ? prefundAddress(to, signer)
        : signer
    const nonceAddrResolved = idFor(nonceAddr) || settleAddr

    for (let attempt = 0; attempt <= retries; attempt++) {
        if (nonce === undefined) {
            nonce = await nextNonce(baseUrl, nonceAddrResolved)
        }

        let signed
        try {
            signed = buildAndSignTx({
                privateKeyHex, nonce, to, step,
                amount, input, contractBytes, prepay, gasLimit, shardId,
            })
        } catch (e) {
            return { ok: false, msg: String(e?.message ?? e) }
        }

        let raw
        try {
            raw = await post(baseUrl, 'transaction', signed.params)
        } catch (e) {
            console.error('[kv] 提交交易失败（网络层）', { step, nonce, to, error: e?.message ?? e })
            return { ok: false, msg: String(e?.message ?? e), raw: e?.response?.data }
        }

        console.log(`[kv] 提交交易 step=${step} nonce=${nonce} to=${to}`, {
            txHash: signed.txHash, nodeReply: raw,
        })

        // 节点成功时返回纯文本 "ok"，失败时返回错误串。
        if (typeof raw === 'string' && raw.trim() !== 'ok' && raw.trim() !== '') {
            lastErr = raw.trim()
            if (lastErr.includes('kTxUserNonceInvalid') && attempt < retries) {
                // nonce 冲突说明池子里已经有一笔同 nonce 的交易（多半是上一次提交
                // 还没落块）。等它落块后重新查一次该账户的 nonce 再 +1 重签。
                // Python SDK 是「1 秒一轮、等 cur_nonce != old_nonce」，
                // 这里同样先等再查，不能置空后立刻重查 —— 那会读到同一个旧值再撞一次。
                const stale = nonce
                await new Promise(r => setTimeout(r, 1000))
                nonce = undefined
                for (let w = 0; w < retries; w++) {
                    const cur = await nextNonce(baseUrl, nonceAddrResolved)
                    if (cur !== stale) break
                    await new Promise(r => setTimeout(r, 1000))
                }
                continue
            }
            return { ok: false, msg: lastErr, raw }
        }

        // "ok" 只说明池子收下了。这里再查回执，把真实的执行结果取回来 ——
        // 否则预存不足、gas 不够之类的失败会显示成成功，页面上却查不到数据。
        if (confirm) {
            const done = await waitForReceipt(baseUrl, signed.txHash, { timeoutMs: confirmTimeoutMs })
            console.log(`[kv] 回执确认 txHash=${signed.txHash}`, done)
            return { ...done, txHash: signed.txHash, from: signed.from, raw }
        }

        return { ok: true, msg: 'ok', txHash: signed.txHash, from: signed.from, raw }
    }

    return { ok: false, msg: lastErr || '交易提交失败' }
}

/**
 * 为合约垫付 gas（step=7, kContractGasPrefund）。
 *
 * 只设 prefund、不设 amount —— 对应 Python SDK 的
 * `send_transaction(..., kContractGasPrefund, prefund=amount)`。
 * 两个都填会让节点额外从用户账户再划走一笔 amount。
 */
export async function prefundGas(baseUrl, privateKeyHex, shardId, contractAddr, amount) {
    const to = String(contractAddr).toLowerCase().replace(/^0x/, '')
    return sendTransaction({
        baseUrl, privateKeyHex, shardId, to,
        step: STEP.CONTRACT_GAS_PREFUND,
        amount: 0,
        prepay: amount,
        confirm: true,
    })
}

// 低于这个余额就重新垫付。gas 用量的量级是「21000 基础 + calldata」，
// 这个阈值远高于单次写入的开销，又不至于每笔都重垫。
const MIN_PREFUND = 100000

// sendTransaction 的默认 gas_limit / gas_price，垫付的余额门槛按它们估算。
const PREFUND_GAS_LIMIT = 5000000
const PREFUND_GAS_PRICE = 1

/**
 * 保证 `合约‖用户` 预存账户存在且有足够余额。
 *
 * 这是合约写入的前置条件，不是可选项：step=8 在入池校验阶段就要读这个账户
 * （src/pools/tx_pool_manager.cc 的 HandleContractExcute），读不到直接按地址无效
 * 拒掉。它只会由 step=7(kContractGasPrefund) 创建，所以每次写入前先补齐。
 *
 * @returns {{ok:boolean, msg?:string, prefunded?:boolean, balance?:number}}
 */
export async function ensurePrefund(baseUrl, opts) {
    const { privateKeyHex, shardId, contractAddr, userAddr, amount = 3000000 } = opts

    const balance = await prefundBalance(baseUrl, contractAddr, userAddr)
    console.log(`[kv] ensurePrefund 预存账户余额=${balance}（门槛 ${MIN_PREFUND}）`,
        { contract: contractAddr, user: userAddr })
    // 已经垫过且够用就不再补 —— 重复垫付会把用户账户的余额划走，没有意义
    if (balance >= MIN_PREFUND) {
        return { ok: true, prefunded: false, balance }
    }

    const to = String(contractAddr).toLowerCase().replace(/^0x/, '')

    // 合约本身必须已部署。地址写错或还没部署时，垫付交易会被节点拒掉，
    // 与其等回来一串状态码，不如在这里直接说清楚。
    if (!await queryAccount(baseUrl, to)) {
        console.warn(`[kv] 合约账户不存在：${to}`)
        return { ok: false, balance, msg: `合约账户不存在：${to} 上没有已部署的合约，请核对合约地址` }
    }

    // 用户账户必须先在链上注册过（test_kv.py 里靠一笔原生转账完成）。
    const userAcc = await queryAccount(baseUrl, userAddr)
    if (!userAcc) {
        console.warn(`[kv] 写入账户未在链上注册：${userAddr}`)
        return {
            ok: false,
            balance,
            msg: '写入账户尚未在链上注册：需要先由已激活账户向该地址转一笔原生代币'
                + '（或用该私钥做过一次转账）后才能写入合约',
        }
    }

    // 垫付的钱是从用户自己账户扣的，不是凭空生出来的。
    // 入池校验（tx_pool_manager.cc:1358）要求：
    //   balance >= amount + contract_prefund + gas_limit * gas_price
    // 注意这里乘的是 gas_limit（默认 500 万）而不是实际用量，所以门槛很高。
    const need = Math.max(amount, MIN_PREFUND)
    const required = need + PREFUND_GAS_LIMIT * PREFUND_GAS_PRICE
    const userBalance = Number(userAcc.balance ?? 0)
    if (userBalance < required) {
        return {
            ok: false,
            balance,
            msg: `写入账户余额不足：垫付 ${need} + 预留 gas ${required - need}，`
                + `共需 ${required}，当前余额 ${userBalance}。`
                + '请先从其他已激活账户向该地址转入原生代币。',
        }
    }

    const res = await sendTransaction({
        baseUrl, privateKeyHex, shardId, to,
        step: STEP.CONTRACT_GAS_PREFUND,
        amount: 0,
        prepay: need,
        confirm: true,
    })
    if (!res.ok) return { ok: false, balance, msg: `垫付 gas 失败：${res.msg}` }

    // 落块后账户余额才更新，给一个短暂的重试窗口
    let now = balance
    for (let i = 0; i < 20; i++) {
        now = await prefundBalance(baseUrl, contractAddr, userAddr)
        if (now >= MIN_PREFUND) break
        await new Promise(r => setTimeout(r, 500))
    }
    if (now < MIN_PREFUND) {
        return { ok: false, balance: now, msg: `垫付后预存余额仍不足（${now}）` }
    }
    return { ok: true, prefunded: true, balance: now }
}

/**
 * 调用合约的 set(string,string) 写入一个键值对。
 *
 * 默认 autoPrefund：预存账户不存在时先自动垫付再写。
 * 关掉它只在预存账户已确认存在时才有意义 —— 否则交易一定会被拒。
 */
export async function setKeyValue(baseUrl, opts) {
    const { privateKeyHex, shardId, contractAddr, key, value, prepay = 3000000, autoPrefund = true } = opts
    const to = String(contractAddr).toLowerCase().replace(/^0x/, '')
    const userAddr = opts.fromAddr ?? ''

    console.log(`[kv] 调用合约 set(string,string) key=${key}`, {
        contract: to, shardId, user: userAddr, valueBytes: value.length,
    })

    if (autoPrefund) {
        const pre = await ensurePrefund(baseUrl, {
            privateKeyHex, shardId, contractAddr, userAddr, amount: prepay,
        })
        if (!pre.ok) {
            console.warn(`[kv] 垫付失败，放弃写入 key=${key}：${pre.msg}`)
            return { ok: false, msg: pre.msg }
        }
    }

    const input = encodeSet(key, value)
    return sendTransaction({
        baseUrl, privateKeyHex, shardId, to,
        step: STEP.CONTRACT_EXECUTE,
        input,
        prepay,
        confirm: true,
        // step=8 的 nonce 在 合约‖用户 预存账户上
        nonceAddr: prefundAddress(contractAddr, userAddr),
    })
}

/**
 * 批量调用合约的 batchSet(string[],string[]) 写入多组键值对（单笔交易）。
 *
 * 与 setKeyValue 共用同一套垫付/nonce/回执逻辑，区别只在 calldata 换成批量编码。
 * 键值数量必须一一对应。
 */
export async function batchSetKeyValue(baseUrl, opts) {
    const { privateKeyHex, shardId, contractAddr, keys, values, prepay = 3000000, autoPrefund = true } = opts
    if (!keys?.length || keys.length !== values?.length) {
        return { ok: false, msg: '批量写入要求 keys 与 values 等长且非空' }
    }
    const to = String(contractAddr).toLowerCase().replace(/^0x/, '')
    const userAddr = opts.fromAddr ?? ''

    console.log(`[kv] 调用合约 batchSet(string[],string[]) 共 ${keys.length} 条`, {
        contract: to, shardId, user: userAddr,
    })

    if (autoPrefund) {
        const pre = await ensurePrefund(baseUrl, {
            privateKeyHex, shardId, contractAddr, userAddr, amount: prepay,
        })
        if (!pre.ok) {
            console.warn(`[kv] 垫付失败，放弃批量写入 ${keys.length} 条：${pre.msg}`)
            return { ok: false, msg: pre.msg }
        }
    }

    const input = encodeBatchSet(keys, values)
    return sendTransaction({
        baseUrl, privateKeyHex, shardId, to,
        step: STEP.CONTRACT_EXECUTE,
        input,
        prepay,
        confirm: true,
        nonceAddr: prefundAddress(contractAddr, userAddr),
    })
}

// ─────────────────────────────────────────────────────────────────────────────
// 读：view 调用
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 只读调用。
 *
 * 失败时节点不会返回 HTTP 错误，而是把一段 ABI 编码的字符串（以 "0x" 开头）
 * 放在 body 里；成功则是不带前缀的裸 hex。因此前缀本身就是成败判据。
 */
export async function abiQuery(baseUrl, contractAddr, inputHex, fromHex) {
    const address = String(contractAddr).toLowerCase().replace(/^0x/, '')
    const from = (fromHex ?? '0000000000000000000000000000000000000000')
        .toLowerCase().replace(/^0x/, '')
    const resp = await post(baseUrl, 'abi_query_contract', {
        address,
        input: inputHex,
        from,
    })

    if (typeof resp === 'string') {
        const text = resp.trim()
        if (text.startsWith('0x') || text.startsWith('0X')) {
            return { ok: false, outputHex: '', msg: decodeEvmError(text) ?? '合约调用失败' }
        }
        return { ok: true, outputHex: text }
    }
    if (resp && typeof resp === 'object') {
        if (resp.status === 0 || resp.code === 0) {
            return { ok: true, outputHex: resp.output ?? resp.data ?? '' }
        }
        return { ok: false, outputHex: '', msg: resp.msg ?? String(resp) }
    }
    return { ok: false, outputHex: '', msg: '节点返回格式无法识别' }
}

/** 把节点返回的 ABI 编码错误串还原成可读文本 */
function decodeEvmError(body) {
    try {
        const hex = body.replace(/^0x/, '')
        if (!/^[0-9a-fA-F]+$/.test(hex) || hex.length < 128) return null
        const offset = parseInt(hex.slice(0, 64), 16) * 2
        if (!Number.isFinite(offset) || offset + 64 > hex.length) return null
        const len = parseInt(hex.slice(offset, offset + 64), 16) * 2
        if (!Number.isFinite(len) || len <= 0 || offset + 64 + len > hex.length) return null
        // 长度字段计的是字节数，按字节读取后再按 utf-8 解码，
        // 否则遇到多字节字符会在第一个字符处截断。
        const raw = hex.slice(offset + 64, offset + 64 + len)
        const buf = new Uint8Array(raw.length / 2)
        for (let i = 0; i < buf.length; i++) {
            buf[i] = parseInt(raw.slice(i * 2, i * 2 + 2), 16)
        }
        return new TextDecoder('utf-8').decode(buf) || null
    } catch (_) {
        return null
    }
}

/** totalKeys() —— 合约里键的总数，用于算总页数 */
export async function totalKeys(baseUrl, contractAddr) {
    const res = await abiQuery(baseUrl, contractAddr, selector('totalKeys()'))
    if (!res.ok) return { ok: false, msg: res.msg }
    return { ok: true, total: Number(decodeUint256(res.outputHex)) }
}

/** 分页查询 getPaginated(offset, limit) —— 一页一条合约调用取回 */
export async function getPaginated(baseUrl, contractAddr, offset, limit) {
    const input = selector('getPaginated(uint256,uint256)') + encodeGetPaginated(offset, limit)
    const res = await abiQuery(baseUrl, contractAddr, input)
    if (!res.ok) return { ok: false, msg: res.msg, entries: [] }
    let entries = []
    try {
        entries = decodeEntryArray(res.outputHex)
    } catch (e) {
        return { ok: false, msg: '回包解析失败: ' + String(e?.message ?? e), entries: [] }
    }
    return { ok: true, entries }
}

// ─────────────────────────────────────────────────────────────────────────────
// 探测 —— 判断合约地址是否可用
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 检查合约是否已部署且可读。
 * totalKeys() 是纯 view 函数，能调用成功即说明地址上确实有这段字节码。
 */
export async function probeContract(baseUrl, contractAddr) {
    const hex = String(contractAddr).toLowerCase().replace(/^0x/, '')
    if (hex.length !== 40) {
        return { ok: false, msg: '合约地址应为 40 位十六进制字符' }
    }
    const res = await totalKeys(baseUrl, contractAddr)
    if (!res.ok) return { ok: false, msg: res.msg ?? '合约不可读，请确认地址正确且已部署' }
    return { ok: true, total: res.total }
}
