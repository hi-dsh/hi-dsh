// 账号登录,对接 hi-dsh-server(独立仓库,生产部署于 https://hi-dsh.com)。
//
// dsh web(如 http://localhost:3080)与账号服务器跨域,cookie 不通用,
// 所以服务器签发自己的 Bearer token。弹窗流程(详见 server 仓库 README):
//   1. 点击「使用 GitHub 登录」→ 弹窗打开 /api/auth/github/login?origin=当前来源
//   2. GitHub 授权后回调服务器 → 服务器签发一次性 login_code → 弹窗落地页
//      把 code postMessage 给本页(window.opener)后自关
//   3. 本页 POST /api/auth/exchange 用 code 换长期 token,存 localStorage
//   4. 之后所有账号 API 带 Authorization: Bearer <token>
//
// 本地调试账号服务器时,把 AUTH_SERVER 改成如 http://127.0.0.1:8765,
// 并把本页 origin 加进服务器的 ALLOWED_ORIGINS。
const AUTH_SERVER = 'https://hi-dsh.com'
const TOKEN_KEY = 'hi-dsh.auth-token'

const listeners = new Set()

// phase: loading(启动时查登录态)| out | login(弹窗流程进行中)| in | error
export const authState = { phase: 'loading', user: null, error: null }

export function subscribeAuth(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function setAuth(patch) {
  Object.assign(authState, patch)
  for (const listener of listeners) listener()
}

function serverOrigin() {
  return new URL(AUTH_SERVER).origin
}

/** 启动时/重试时调用:有 token 就向服务器确认,没有就是未登录。失败显式报错。 */
export async function initAuth() {
  const token = localStorage.getItem(TOKEN_KEY)
  if (!token) {
    setAuth({ phase: 'out', user: null, error: null })
    return
  }
  try {
    const res = await fetch(`${AUTH_SERVER}/api/auth/me`, { headers: { authorization: `Bearer ${token}` } })
    if (res.status === 401) {
      // 服务器明确说 token 无效/过期:清掉本地态,回到未登录
      localStorage.removeItem(TOKEN_KEY)
      setAuth({ phase: 'out', user: null, error: null })
      return
    }
    if (!res.ok) throw new Error(`账号服务返回 HTTP ${res.status}`)
    const body = await res.json()
    setAuth({ phase: 'in', user: body.user, error: null })
  } catch (err) {
    setAuth({ phase: 'error', user: null, error: `无法确认登录状态:${err?.message ?? err}(网络或账号服务不可用,可重试;不影响市场浏览与安装)` })
  }
}

/** 打开登录弹窗。弹窗被浏览器拦截时报错,不静默降级。 */
export function startLogin() {
  const url = `${AUTH_SERVER}/api/auth/github/login?origin=${encodeURIComponent(window.location.origin)}`
  const popup = window.open(url, 'hi-dsh-login', 'width=680,height=760')
  if (!popup) {
    setAuth({ phase: 'error', user: null, error: '浏览器拦截了登录弹窗,请允许本站弹出窗口后重试。' })
    return
  }
  setAuth({ phase: 'login', user: null, error: null })
}

let listening = false

/** 监听登录弹窗回传的一次性 code 并换取 token。幂等,多次调用只注册一次。 */
export function ensureAuthListener() {
  if (listening) return
  listening = true
  window.addEventListener('message', async (event) => {
    if (event.origin !== serverOrigin() || event.data?.source !== 'hi-dsh-auth') return
    try {
      const res = await fetch(`${AUTH_SERVER}/api/auth/exchange`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ code: event.data.code }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body?.error ?? `HTTP ${res.status}`)
      localStorage.setItem(TOKEN_KEY, body.token)
      setAuth({ phase: 'in', user: body.user, error: null })
    } catch (err) {
      setAuth({ phase: 'error', user: null, error: `登录码换取失败:${err?.message ?? err}(请重新登录)` })
    }
  })
}

/** 退出登录:本地态立即清除,服务器会话注销;注销失败也如实报错。 */
export async function logout() {
  const token = localStorage.getItem(TOKEN_KEY)
  localStorage.removeItem(TOKEN_KEY)
  if (token) {
    try {
      const res = await fetch(`${AUTH_SERVER}/api/auth/logout`, {
        method: 'POST',
        headers: { authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setAuth({ phase: 'out', user: null, error: null })
    } catch (err) {
      setAuth({ phase: 'error', user: null, error: `服务器注销失败(${err?.message ?? err});本地登录态已清除。` })
    }
    return
  }
  setAuth({ phase: 'out', user: null, error: null })
}
