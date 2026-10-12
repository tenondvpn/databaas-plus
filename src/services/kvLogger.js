// 把平台的每一次请求-响应对写进链上合约。
//
// 上传是串行的：合约写入的 nonce 由节点的预存账户单独记账，多个写入并发提交
// 会互相顶掉 nonce，导致交易被拒。这里用一条队列保证同一时刻只有一笔在飞。
import { getKeypair } from './signing'
import { setKeyValue, shardBaseUrl } from './kvDatabase'

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

/**
 * 把一条请求-响应记录排入写入队列。
 *
 * 同一秒内可能产生多条记录（并发请求），而键的粒度只到秒，因此撞键时
 * 追加序号后缀，避免后一条覆盖前一条。
 */
export function enqueue(payload) {
    const cfg = loadConfig()
    if (!cfg.enabled || !cfg.contractAddress || !cfg.privateKey) return

    const task = async () => {
        const date = new Date()
        let key = timestampKey(date)
        // 同秒去重：查询该键是否已写入，撞了就加序号
        const suffix = await pickFreeSuffix(key)
        if (suffix > 0) key = `${key}_${suffix}`

        const value = JSON.stringify(payload)
        const entry = { key, at: date.toISOString(), size: value.length, payload }

        try {
            const keypair = getKeypair(cfg.privateKey)
            const res = await setKeyValue(shardBaseUrl(cfg.shardId, cfg.nodeUrl), {
                privateKeyHex: cfg.privateKey,
                shardId: cfg.shardId ?? 3,
                contractAddr: cfg.contractAddress,
                fromAddr: keypair.accountId,
                key,
                value,
                prepay: cfg.prepay ?? 3000000,
            })
            entry.ok = res.ok
            entry.msg = res.msg
            entry.txHash = res.txHash
        } catch (e) {
            entry.ok = false
            entry.msg = String(e?.message ?? e)
        }
        pushRecent(entry)
        return entry
    }

    // 排队，但把异常吞掉，避免一条失败阻断后续写入
    queue = queue.then(task).catch(() => {})
    return queue
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
        if (url.includes('/transaction') || url.includes('/abi_query_contract')) return

        const startedAt = reqConfig.__kvStartedAt
        const record = {
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
        enqueue(record)
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
