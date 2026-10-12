// 把平台的每一次请求-响应对写进链上合约。
//
// 上传是串行的：合约写入的 nonce 由节点的预存账户单独记账，多个写入并发提交
// 会互相顶掉 nonce，导致交易被拒。这里用一条队列保证同一时刻只有一笔在飞。
import { getKeypair } from './signing'
import { currentUser } from './identity'
import { batchSetKeyValue, shardBaseUrl } from './kvDatabase'

// 模块加载即打点：控制台看不到这一行，说明部署的构建里根本没有本模块，
// 后续所有 KV 记录都不会发生 —— 这是排查「没生效」的第一判据。
console.log('[kv] kvLogger 模块已加载（无本行 = 线上是旧构建）')

const STORAGE_KEY = 'kv_database_config'
export const CONFIG_CHANGED = 'kv_database_config_changed'

// 内存中的配置副本。localStorage 是唯一真相，这里是读取加速。
let config = null

export function loadConfig() {
    if (config) return config
    try {
        config = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')
    } catch (_) {
        config = {}
    }
    return config
}

export function saveConfig(patch) {
    config = { ...loadConfig(), ...patch }
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(config)) } catch (_) {}
    window.dispatchEvent(new CustomEvent(CONFIG_CHANGED, { detail: config }))
    return config
}

/** 把时间戳补零成 yyyyMMddHHmmss —— 合约键的 `database_` 后缀格式 */
export function timestampKey(date = new Date()) {
    const p = (n) => String(n).padStart(2, '0')
    return `database_${date.getFullYear()}${p(date.getMonth() + 1)}${p(date.getDate())}`
        + `${p(date.getHours())}${p(date.getMinutes())}${p(date.getSeconds())}`
}

// ─────────────────────────────────────────────────────────────────────────────
// 串行写入队列
// ─────────────────────────────────────────────────────────────────────────────

let queue = Promise.resolve()
const recent = []
const MAX_RECENT = 200

/** 最近一次写入的结果，供管理页面展示 */
export function recentWrites() {
    return recent.slice()
}

function pushRecent(entry) {
    recent.unshift(entry)
    if (recent.length > MAX_RECENT) recent.length = MAX_RECENT
}

// ─────────────────────────────────────────────────────────────────────────────
// 攒批写入
//
// 每条请求都单独发一笔合约交易代价太高（一笔一 nonce、一垫付、一回执），
// 因此改为先攒在内存缓冲里，满足以下任一条件才用 batchSet 一次性写进合约：
//   - 缓冲达到 MAX_BATCH_COUNT 条；
//   - 距上一条进缓冲已过 FLUSH_INTERVAL_MS 毫秒（定时兜底，避免长时间不落链）；
//   - 缓冲累计字节达到 MAX_BATCH_BYTES（单笔交易 calldata 受 gas 上限约束，
//     256 条 × 每条约 4KB 会远超 gas，故按字节提前切批）。
// ─────────────────────────────────────────────────────────────────────────────

const MAX_BATCH_COUNT = 256
const FLUSH_INTERVAL_MS = 10000
const MAX_BATCH_BYTES = 200000

let buffer = []            // 待写入记录：{ key, value, at, size, payload }
let bufferedBytes = 0
let flushTimer = null

/**
 * 把一条请求-响应记录放进缓冲，按需触发批量写入。
 *
 * 键在入缓冲时就定好（含同秒去重后缀），因为键的粒度只到秒，并发请求可能同秒
 * 产生多条，若等到 flush 时再取时间戳就分不出先后了。
 */
export function enqueue(payload) {
    const cfg = loadConfig()
    if (!cfg.enabled || !cfg.contractAddress || !cfg.privateKey) {
        console.log('[kv] 跳过写入：开关/合约地址/私钥未配齐', {
            enabled: !!cfg.enabled,
            contractAddress: cfg.contractAddress || '(空)',
            hasPrivateKey: !!cfg.privateKey,
        })
        return
    }

    const date = new Date()
    let key = timestampKey(date)
    const suffix = pickFreeSuffix(key)
    if (suffix > 0) key = `${key}_${suffix}`

    const value = JSON.stringify(payload)
    buffer.push({ key, value, at: date.toISOString(), size: value.length, payload })
    bufferedBytes += value.length
    console.log(`[kv] 入缓冲 key=${key}（${value.length} 字节，当前 ${buffer.length} 条 / ${bufferedBytes} 字节）`)

    if (buffer.length >= MAX_BATCH_COUNT) {
        console.log(`[kv] 缓冲达到 ${MAX_BATCH_COUNT} 条，立即批量写入`)
        flush()
        return
    }
    if (bufferedBytes >= MAX_BATCH_BYTES) {
        console.log(`[kv] 缓冲达到 ${MAX_BATCH_BYTES} 字节，立即批量写入`)
        flush()
        return
    }
    if (flushTimer === null) {
        flushTimer = setTimeout(() => { flush() }, FLUSH_INTERVAL_MS)
    }
}

/**
 * 把当前缓冲整批写入合约。由数量/字节阈值或定时器触发。
 *
 * 写入本身经串行 queue 排队：一次 flush 是一笔 batchSet 交易，同一时刻只有一笔
 * 在飞，避免 step=8 的预存账户 nonce 互相顶掉。
 */
export function flush() {
    if (flushTimer !== null) {
        clearTimeout(flushTimer)
        flushTimer = null
    }
    if (buffer.length === 0) return queue

    const batch = buffer
    buffer = []
    bufferedBytes = 0
    console.log(`[kv] 开始批量写入 ${batch.length} 条`, batch.map(b => b.key))

    const cfg = loadConfig()
    const task = async () => {
        const keys = batch.map(b => b.key)
        const values = batch.map(b => b.value)
        let res
        try {
            const keypair = getKeypair(cfg.privateKey)
            res = await batchSetKeyValue(shardBaseUrl(cfg.shardId, cfg.nodeUrl), {
                privateKeyHex: cfg.privateKey,
                shardId: cfg.shardId ?? 3,
                contractAddr: cfg.contractAddress,
                fromAddr: keypair.accountId,
                keys,
                values,
                prepay: cfg.prepay ?? 3000000,
            })
        } catch (e) {
            res = { ok: false, msg: String(e?.message ?? e) }
            console.error(`[kv] 批量写入抛异常（${batch.length} 条）`, e)
        }
        console.log(`[kv] 批量写入结果（${batch.length} 条）`, {
            ok: res.ok, txHash: res.txHash, from: res.from, msg: res.msg,
        })
        // 整批共享一笔交易的结果，逐条回填供管理页面展示
        for (const b of batch) {
            pushRecent({
                key: b.key, at: b.at, size: b.size, payload: b.payload,
                ok: res.ok, msg: res.msg, txHash: res.txHash,
            })
        }
        // 等待期间又攒下的记录，重新起定时器
        if (buffer.length > 0 && flushTimer === null) {
            flushTimer = setTimeout(() => { flush() }, FLUSH_INTERVAL_MS)
        }
    }

    queue = queue.then(task).catch(() => {})
    return queue
}

// 页面关闭前把残留缓冲冲掉，否则最多 255 条记录会随之丢失。
if (typeof window !== 'undefined') {
    window.addEventListener('pagehide', () => { flush() })
}

// 撞键只可能发生在同一秒内（键自带秒级时间戳），所以记忆只需覆盖当前这一秒：
// 秒一变就整体重置。这样既不必回链上查重，也不会随时间无界增长。
let sameSecBase = ''
let sameSecSuffixes = new Set()

function pickFreeSuffix(base) {
    if (base !== sameSecBase) {
        sameSecBase = base
        sameSecSuffixes = new Set()
        return 0
    }
    let i = 1
    while (sameSecSuffixes.has(i)) i++
    sameSecSuffixes.add(i)
    return i
}

// ─────────────────────────────────────────────────────────────────────────────
// axios 拦截器
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 安装拦截器：把每个请求的报文与响应报文配对后写入合约。
 *
 * 请求体与响应体都先做截断，单条记录过大时链上交易的 calldata 会超出 gas 上限。
 * 写入自身造成的请求被排除，否则会无限递归。
 */
export function installAxiosLogger(axiosInstance, opts = {}) {
    const maxBody = opts.maxBody ?? 4000
    const skip = opts.skip ?? (() => false)

    axiosInstance.interceptors.request.use((reqConfig) => {
        // 记录发起时刻，请求与响应共用这一个配对标识
        reqConfig.__kvStartedAt = Date.now()
        return reqConfig
    })

    axiosInstance.interceptors.response.use(
        (response) => {
            record(response.config, response)
            return response
        },
        (error) => {
            record(error?.config, undefined, error)
            return Promise.reject(error)
        },
    )

    function record(reqConfig, response, error) {
        if (!reqConfig) return
        const cfg = loadConfig()
        if (!cfg.enabled || !cfg.contractAddress || !cfg.privateKey) return
        if (skip(reqConfig)) return

        const url = String(reqConfig.url ?? '')
        // 写合约的接口本身不记录，否则每条日志又触发一条日志
        if (url.includes('/transaction') || url.includes('/abi_query_contract')) {
            console.log(`[kv] 跳过自请求（避免递归）：${url}`)
            return
        }

        const startedAt = reqConfig.__kvStartedAt
        const record = {
            user: {
                name: currentUser() || '(未登录)',
                // 链上可查的写入账户地址。私钥绝不入记录。
                address: safeAddress(cfg.privateKey),
            },
            request: {
                method: String(reqConfig.method ?? 'get').toUpperCase(),
                url,
                baseURL: reqConfig.baseURL ?? '',
                params: truncate(reqConfig.params, maxBody),
                data: truncate(reqConfig.data, maxBody),
                at: startedAt ? new Date(startedAt).toISOString() : null,
            },
            response: error
                ? {
                    error: true,
                    status: error.response?.status ?? null,
                    message: String(error.message ?? error),
                    data: truncate(error.response?.data, maxBody),
                }
                : {
                    error: false,
                    status: response?.status ?? null,
                    data: truncate(response?.data, maxBody),
                },
            durationMs: startedAt ? Date.now() - startedAt : null,
        }
        const method = String(reqConfig.method ?? 'get').toUpperCase()
        console.log(`[kv] 捕获请求 ${method} ${url}`, {
            user: record.user.name,
            status: record.response.status,
            error: record.response.error,
            durationMs: record.durationMs,
        })
        enqueue(record)
    }
}

/** 由写入私钥推出链上账户地址，私钥本身不入记录。推导失败就不带地址。 */
function safeAddress(privateKey) {
    if (!privateKey) return ''
    try {
        return getKeypair(String(privateKey).trim()).accountId
    } catch (_) {
        return ''
    }
}

/** 转成可入库的形态：对象序列化后按字符数截断 */
function truncate(value, max) {
    if (value === undefined || value === null) return null
    let text
    if (typeof value === 'string') {
        text = value
    } else {
        try {
            text = JSON.stringify(value)
        } catch (_) {
            text = String(value)
        }
    }
    if (text === undefined) return null
    if (text.length <= max) {
        // 字符串原样返回，其余类型保留 JSON 形态便于阅读
        return typeof value === 'string' ? text : value
    }
    return text.slice(0, max) + `…(已截断，共 ${text.length} 字符)`
}
