// 去中心化数据库（StringKeyValueDatabase 合约）访问层。
//
// 合约源码与 clipy/test_kv.py 中的 KV_DATABASE_SOL 完全一致，这里只做前端调用。
// 读写走两条不同通道：
//   读 —— POST /abi_query_contract，EVM kJustCall，无需签名，不消耗 gas
//   写 —— POST /transaction，自定义报文 + secp256k1 签名，需要 prefund 垫付 gas
import axios from 'axios'
import qs from 'qs'
import { buildAndSignTx } from './signing'
import {
    encodeSet,
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

// ─────────────────────────────────────────────────────────────────────────────
// 写：提交交易
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 签署并提交一笔交易。
 *
 * 节点在 nonce 冲突时返回 `kTxUserNonceInvalid`，这通常意味着上一笔刚提交的交易
 * 还没落块。此时重新拉取 nonce 并重签发送，而不是直接把错误抛给用户。
 */
export async function sendTransaction(opts) {
    const {
        baseUrl, privateKeyHex, shardId, to, step,
        input, contractBytes, amount = 0, prepay = 0,
        gasLimit = 5000000, nonceAddr, retries = 30,
    } = opts

    let nonce = opts.nonce
    let lastErr = ''

    for (let attempt = 0; attempt <= retries; attempt++) {
        if (nonce === undefined) {
            nonce = await nextNonce(baseUrl, nonceAddr ?? to)
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
            return { ok: false, msg: String(e?.message ?? e), raw: e?.response?.data }
        }

        // 节点成功时返回纯文本 "ok"，失败时返回错误串。
        if (typeof raw === 'string' && raw.trim() !== 'ok' && raw.trim() !== '') {
            lastErr = raw.trim()
            if (lastErr.includes('kTxUserNonceInvalid') && attempt < retries) {
                // 上一笔已确认，nonce 变了 —— 等 1 秒后重新查询再试。
                // Python SDK 同样是 1 秒一轮、最多 30 轮（链上出块没那么快，重试太少会白失败）。
                await new Promise(r => setTimeout(r, 1000))
                nonce = undefined
                continue
            }
            return { ok: false, msg: lastErr, raw }
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
    })
}

/** 调用合约的 set(string,string) 写入一个键值对 */
export async function setKeyValue(baseUrl, opts) {
    const { privateKeyHex, shardId, contractAddr, key, value, prepay = 3000000 } = opts
    const to = String(contractAddr).toLowerCase().replace(/^0x/, '')
    const input = encodeSet(key, value)
    return sendTransaction({
        baseUrl, privateKeyHex, shardId, to,
        step: STEP.CONTRACT_EXECUTE,
        input,
        prepay,
        // step=8 的 nonce 在 合约‖用户 预存账户上
        nonceAddr: prefundAddress(contractAddr, opts.fromAddr ?? ''),
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
