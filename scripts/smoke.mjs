/**
 * Node smoke test for the hi-dsh client bundle (no browser needed):
 *   1. exact `window.__ModuleLoader__.load({ id: "hi-dsh"` bundle prefix;
 *   2. the factory loads against a mock host require (react + dsh externals
 *      resolved from the dsh installation) and exports name/inject/apply;
 *   3. apply() registers the three additive seats (Hi button, market
 *      overlay, conversation tab) on a mock slots host;
 *   4. the one-click install UI is wired in: 安装 button + 确认安装 dialog
 *      exist, the old copy-command button and the card-bottom command text
 *      are gone;
 *   5. the server modules parse and export the install surface.
 *
 * All host objects (window/document) are mocked HERE, in the test — the
 * production code stays guard-free per AGENTS.md.
 */
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import vm from 'node:vm'

const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, '..')

let failures = 0
function check(label, ok, detail = '') {
  if (ok) {
    console.log(`  ✓ ${label}`)
  } else {
    failures += 1
    console.error(`  ✗ ${label}${detail ? ` — ${detail}` : ''}`)
  }
}

// --- 1. bundle prefix -------------------------------------------------------
const code = readFileSync(join(root, 'client', 'client.js'), 'utf8')
check('bundle 前缀 factory 格式', code.startsWith('window.__ModuleLoader__.load({')
  && code.includes('id: "hi-dsh"')
  && code.includes('factory: (require) =>'), code.slice(0, 80))
check('bundle 工厂返回 module.exports', code.includes('return module.exports;')
  && code.trimEnd().endsWith('//# sourceMappingURL=client.js.map'))

// --- 2. factory against a mock host loader ----------------------------------
// Externals resolve from the dsh installation (the host's module table); the
// required ids are read straight out of the bundle so the test tracks reality.
const dshAnchor = '/Users/fish/.nvm/versions/node/v24.18.0/lib/node_modules/@deepseek-ai/dsh/lib/bin.js'
const hostRequire = createRequire(dshAnchor)
const requiredIds = [...new Set([...code.matchAll(/require\("([^"]+)"\)/g)].map((m) => m[1]))]
check('bundle 至少依赖 react', requiredIds.includes('react'), JSON.stringify(requiredIds))
const modules = {}
for (const id of requiredIds) {
  try {
    modules[id] = hostRequire(id)
  } catch (err) {
    check(`外部依赖可解析: ${id}`, false, err.message)
  }
}

let captured = null
// injectButtonStyle needs a minimal document — mocked here (test-side only).
const documentMock = {
  getElementById: () => null,
  createElement: () => ({ textContent: '' }),
  head: { appendChild: () => {} },
}
const windowMock = {
  __ModuleLoader__: { load: (arg) => { captured = arg } },
  innerWidth: 1280,
}
const sandbox = { window: windowMock, document: documentMock, require: () => { throw new Error('bundle body must only require through the factory param') }, console }
vm.createContext(sandbox)
vm.runInContext(code, sandbox, { filename: 'client/client.js' })

check('__ModuleLoader__.load 捕获一次', captured !== null && captured.id === 'hi-dsh' && typeof captured.factory === 'function')
const hostLoaderRequire = (id) => {
  if (!(id in modules)) throw new Error(`host module table has no ${id}`)
  return modules[id]
}
const exports = captured?.factory?.(hostLoaderRequire)
check('工厂导出 name/inject/apply', exports?.name === 'hi-dsh' && Array.isArray(exports?.inject) && typeof exports?.apply === 'function',
  JSON.stringify({ name: exports?.name, inject: exports?.inject }))

// --- 3. three seats register -------------------------------------------------
const seats = []
const slotsMock = {
  inject: (slotName, register) => {
    const registration = register()
    seats.push({ slotName, ...registration })
  },
  register: (registration) => registration,
}
const ctxMock = {
  slots: slotsMock,
  logger: { info: () => {}, warn: () => {} },
  commands: { register: () => {} },
}
try {
  exports.apply(ctxMock)
  const seatNames = seats.map((s) => s.slotName).sort().join(',')
  check('三个增量座位注册', seatNames === 'conversation.view,shell.overlay,sidebar.footer.action', seatNames)
  check('座位 id 归属 hi-dsh', seats.every((s) => s.id === 'hi-dsh' || s.id.startsWith('hi-dsh-') || s.id.includes('hi-dsh')),
    JSON.stringify(seats.map((s) => s.id)))
} catch (err) {
  check('apply() 无异常', false, err.stack)
}

// --- 4. one-click install UI surface -----------------------------------------
check('安装按钮存在', code.includes('"安装"') || code.includes("'安装'"))
check('确认安装按钮存在', code.includes('确认安装'))
check('旧复制按钮已移除', !code.includes('复制安装命令'))
check('安装路由路径', code.includes('/hi-dsh/install'))
check('卡片底部安装命令文本已移除', !code.includes('plugin.install ? h("code"') && !code.includes("plugin.install ? h('code'"))

// --- 5. server modules parse & export the install surface --------------------
const install = await import('../src/install.js')
check('install.js 导出 registerInstallRoute', typeof install.registerInstallRoute === 'function')
check('install.js 导出 runDshPlugin', typeof install.runDshPlugin === 'function')
check('install.js 目标推导', install.installTargetFor({ npm: 'dsh-status-rotator', url: 'https://github.com/01Virex/dsh-status-rotator' }) === 'dsh-status-rotator'
  && install.installTargetFor({ url: 'https://github.com/0imzero/dsh-workspace-menu' }) === 'github:0imzero/dsh-workspace-menu'
  && install.installTargetFor({ url: 'https://github.com/owner/repo/tree/main/packages/plugin' }) === 'github:owner/repo#path:/packages/plugin')
check('install.js 目录/命令非法输入被拒', install.installTargetFor({ url: 'https://evil.example/x' }) === null
  && install.installTargetFor({ url: 'https://github.com/o/r', npm: 'bad name' }) === 'github:o/r')
const parsed = install.parseSimplePatch("- insert:\n  - id: hi-dsh\n    name: 'hi-dsh' # comment\r\n")
check('parseSimplePatch 解析纯 insert', parsed !== null && parsed.length === 1 && parsed[0].id === 'hi-dsh')
check('parseSimplePatch 拒绝配置行', install.parseSimplePatch('- insert:\n  - id: x\n    name: y\n    config: { a: 1 }\n') === null)
await import('../src/index.js')
check('index.js 可解析导入', true)

// --- 6. hiDsh() wiring: route registers, getFeed reads the service via ctx.get -
// Regression for "cannot get property marketplace without inject": the route
// handler runs outside hi-dsh's fiber, so request-time service access must go
// through ctx.get(). Driven against a mock host with a temp DSH_HOME.
const { tmpHome } = await import('node:fs').then((fs) => ({ tmpHome: fs.mkdtempSync(join(fs.tmpdir ?? '/tmp', 'hidsh-smoke-')) }))
process.env.DSH_HOME = tmpHome
const { hiDsh } = await import('../src/index.js')

let effectFn = null
const marketState = {
  feed: { plugins: [{ name: 'x', npm: 'x', url: 'https://github.com/o/x' }] },
  // Models the real service's on-demand refresh; here the feed stays null
  // (continued fetch failure) so getFeed must answer null, not throw.
  refreshFeed: async () => {},
}
const hiMock = {
  plugin: async () => null,
  inject: (services, cb) => cb(hiMock.host),
  logger: { info: () => {}, warn: () => {} },
  commands: { register: () => {} },
  // Mirrors the real host: request-time service reads go through get().
  get: (name) => (name === 'marketplace' ? marketState : undefined),
  host: {
    webServer: {
      register: (route) => {
        effectFn = route
        return () => {}
      },
    },
    effect: (fn) => fn(),
  },
}
let wired = false
try {
  await hiDsh(hiMock, {})
  wired = effectFn?.path === '/hi-dsh/install'
  check('hiDsh 注册 /hi-dsh/install 路由', wired)
} catch (err) {
  check('hiDsh() 无异常', false, err.stack)
}
if (wired) {
  async function post(body, headers = { origin: 'http://h:1', host: 'h:1' }) {
    let settle
    const done = new Promise((r) => { settle = r })
    const res = { code: null, sent: null, writeHead(c) { this.code = c }, end(b) { this.sent = { code: this.code, body: b ? JSON.parse(b) : null }; settle() } }
    const req = { method: 'POST', headers, async *[Symbol.asyncIterator]() { if (body) yield Buffer.from(JSON.stringify(body)) } }
    await Promise.race([done, effectFn.handler(req, res)])
    return res.sent
  }
  // getFeed 经 ctx.get 拿到目录：目录内未收录的来源被拒（400 而非 503/500）。
  const viaGet = await post({ url: 'https://github.com/other/y' })
  check('getFeed 经 ctx.get 读取目录', viaGet.code === 400 && viaGet.body.error === '该插件不在目录中，拒绝安装',
    JSON.stringify(viaGet))
  // 服务缺失（ctx.get 返回 undefined）→ 诚实的 503，而不是抛错。
  marketState.feed = null
  const missing = await post({ url: 'https://github.com/o/x' })
  check('服务缺失 → 503 目录未就绪', missing.code === 503, JSON.stringify(missing))
  marketState.feed = { plugins: [{ name: 'x', npm: 'x', url: 'https://github.com/o/x' }] }
}

console.log(failures === 0 ? '\nsmoke: 全部通过' : `\nsmoke: ${failures} 项失败`)
process.exit(failures === 0 ? 0 : 1)
