// 当前登录用户是谁 —— 供请求日志写入合约时带上「是谁发起的」。
//
// 只有 access_token 是登录时存下来的，用户名并没有落盘，所以这里先从 token 的
// payload 里解；解不出来（后端返回的是不透明 token）再退回登录时写入的缓存。
const USER_KEY = 'kv_user_name'

/** 解 JWT payload 里常见的用户名字段。token 不透明时返回空串。 */
function fromToken(token) {
    const parts = String(token ?? '').split('.')
    if (parts.length < 2) return ''
    try {
        // JWT 用 base64url，且载荷可能是非 ASCII，要先转成字节再按 UTF-8 解
        const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
        const bin = atob(b64.padEnd(Math.ceil(b64.length / 4) * 4, '='))
        const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0))
        const payload = JSON.parse(new TextDecoder().decode(bytes))
        return String(
            payload.username ?? payload.user_name ?? payload.name
            ?? payload.user ?? payload.sub ?? '',
        )
    } catch (_) {
        return ''
    }
}

/** 登录成功后调用，把用户名存下来备用 */
export function setUserName(name) {
    try { localStorage.setItem(USER_KEY, String(name ?? '')) } catch (_) {}
}

/** 当前用户标识，取不到时返回空串 */
export function currentUser() {
    let token = ''
    try { token = localStorage.getItem('access_token') ?? '' } catch (_) {}
    return fromToken(token) || cachedName()
}

function cachedName() {
    try { return localStorage.getItem(USER_KEY) ?? '' } catch (_) { return '' }
}

/** 退出登录时清掉，避免下个会话的日志挂在上一个用户名下 */
export function clearUserName() {
    try { localStorage.removeItem(USER_KEY) } catch (_) {}
}
