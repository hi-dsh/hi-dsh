/**
 * Node smoke test for the hi-dsh client bundle (no browser needed):
 *   1. exact `window.__ModuleLoader__.load({ id: "hi-dsh"` bundle prefix;
 *   2. the factory loads against a mock host require (react + dsh externals
 *      resolved from the dsh installation) and exports name/inject/apply;
 *   3. apply() registers the three additive seats (Hi button, market
 *      overlay, conversation tab) on a mock slots host;
 *   4. the one-click install UI and the installed tab are wired in: 安装/
 *      卸载 buttons, 确认安装/确认卸载 dialogs, both tab labels, both routes;
 *   5. the server modules parse and export the route + ledger surface;
 *   6. hiDsh() wiring: three routes register, getFeed reads the service via
 *      ctx.get(), and the ledger behaves (record ∩ dependencies display,
 *      honest corrupt-ledger 500, feedReady:false, uninstall validations).
 *
 * All host objects (window/document) are mocked HERE, in the test — the
 * production code stays guard-free per AGENTS.md.
 */
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
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

// --- 4. one-click install UI + installed tab surface -------------------------
check('安装按钮存在', code.includes('"安装"') || code.includes("'安装'"))
check('确认安装按钮存在', code.includes('确认安装'))
check('卸载按钮存在', code.includes('"卸载"') || code.includes("'卸载'"))
check('确认卸载按钮存在', code.includes('确认卸载'))
check('两个标签页存在', code.includes('插件市场') && code.includes('已安装插件'))
check('安装路由路径', code.includes('/hi-dsh/install'))
check('卸载路由路径', code.includes('/hi-dsh/uninstall'))
check('已安装路由路径', code.includes('/hi-dsh/installed'))
check('旧复制按钮已移除', !code.includes('复制安装命令'))

// --- 4b. 账号入口(头部右上角)+ 登录弹窗流程 surface -------------------------
check('账号入口存在(GitHub 登录文案)', code.includes('使用 GitHub 登录'))
check('Gitee 占位存在(即将支持)', code.includes('Gitee 登录') && code.includes('即将支持'))
check('已登录/退出登录文案存在', code.includes('已登录') && code.includes('退出登录'))
check('账号服务器地址(hi-dsh.com)', code.includes('https://hi-dsh.com'))
check('弹窗回传消息来源标记', code.includes('hi-dsh-auth'))
const q = (str) => code.includes(`'${str}'`) || code.includes(`"${str}"`)
check('登录态 phases 完整', q('loading') && q('login') && q('out') && q('in') && q('error'))

// --- 5. server modules parse & export the route + ledger surface -------------
const install = await import('../src/install.js')
check('install.js 导出 registerRoutes', typeof install.registerRoutes === 'function')
check('install.js 导出 runDshPlugin', typeof install.runDshPlugin === 'function')
check('install.js 导出账本工具', typeof install.ledgerPath === 'function'
  && typeof install.readLedger === 'function'
  && typeof install.recordInstalled === 'function'
  && typeof install.recordRemoved === 'function')
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

// --- 6. hiDsh() wiring: three routes, ctx.get feed access, ledger behavior ----
// Regression for "cannot get property marketplace without inject": the route
// handlers run outside hi-dsh's fiber, so request-time service access must go
// through ctx.get(). Driven against a mock host with a temp DSH_HOME.
const tmpHome = mkdtempSync(join(tmpdir(), 'hidsh-smoke-'))
process.env.DSH_HOME = tmpHome
const { hiDsh } = await import('../src/index.js')

const marketState = {
  feed: { plugins: [{ name: 'x', npm: 'x', url: 'https://github.com/o/x' }] },
  // Models the real service's on-demand refresh; here the feed stays null
  // (continued fetch failure) so getFeed must answer null, not throw.
  refreshFeed: async () => {},
}
const routes = {}
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
        routes[route.path] = route
        return () => {}
      },
    },
    effect: (fn) => fn(),
  },
}
let wired = false
try {
  await hiDsh(hiMock, {})
  wired = routes['/hi-dsh/install'] !== undefined
    && routes['/hi-dsh/installed'] !== undefined
    && routes['/hi-dsh/uninstall'] !== undefined
  check('hiDsh 注册三个路由（installed/install/uninstall）', wired, JSON.stringify(Object.keys(routes)))
} catch (err) {
  check('hiDsh() 无异常', false, err.stack)
}
if (wired) {
  async function call(path, method, body) {
    let settle
    const done = new Promise((r) => { settle = r })
    const res = { code: null, sent: null, writeHead(c) { this.code = c }, end(b) { this.sent = { code: this.code, body: b ? JSON.parse(b) : null }; settle() } }
    const req = { method, headers: { origin: 'http://h:1', host: 'h:1' }, async *[Symbol.asyncIterator]() { if (body) yield Buffer.from(JSON.stringify(body)) } }
    await Promise.race([done, routes[path].handler(req, res)])
    return res.sent
  }
  // getFeed 经 ctx.get 拿到目录：目录内未收录的来源被拒（400 而非 503/500）。
  const viaGet = await call('/hi-dsh/install', 'POST', { url: 'https://github.com/other/y' })
  check('getFeed 经 ctx.get 读取目录', viaGet.code === 400 && viaGet.body.error === '该插件不在目录中，拒绝安装',
    JSON.stringify(viaGet))
  // 服务缺失（ctx.get 返回 undefined）→ 诚实的 503，而不是抛错。
  marketState.feed = null
  const missing = await call('/hi-dsh/install', 'POST', { url: 'https://github.com/o/x' })
  check('服务缺失 → 503 目录未就绪', missing.code === 503, JSON.stringify(missing))
  marketState.feed = { plugins: [{ name: 'x', npm: 'x', url: 'https://github.com/o/x' }] }

  // profile 未初始化（无 package.json）→ 诚实的 500，而非装作空列表。
  const noProfile = await call('/hi-dsh/installed', 'GET')
  check('GET installed：profile 未初始化 → 500', noProfile.code === 500 && noProfile.body.error.includes('读取 profile 依赖失败'),
    JSON.stringify(noProfile))

  // 空账本是合法初始态（从未通过 hi-dsh 安装过）→ 200 + 空列表。
  const profileDir = join(tmpHome, 'profiles', 'web')
  mkdirSync(profileDir, { recursive: true })
  const manifestWith = (deps) => writeFileSync(join(profileDir, 'package.json'),
    JSON.stringify({ name: 'dsh-profile-web', private: true, dependencies: deps }))
  manifestWith({})
  const empty = await call('/hi-dsh/installed', 'GET')
  check('GET installed：无账本 → 200 空列表', empty.code === 200 && empty.body.ok === true
    && empty.body.plugins.length === 0 && empty.body.feedReady === true, JSON.stringify(empty))

  // 记账后：账本 ∩ 依赖 显示该插件，并按 npm 名 join 目录元数据。
  manifestWith({ x: '^1.0.0' })
  install.recordInstalled(profileDir, ['x'], { target: 'x', source: 'https://github.com/o/x' })
  const listed = await call('/hi-dsh/installed', 'GET')
  check('GET installed：账本∩依赖 + catalog join', listed.code === 200 && listed.body.plugins.length === 1
    && listed.body.plugins[0].name === 'x' && listed.body.plugins[0].spec === '^1.0.0'
    && listed.body.plugins[0].version === null && listed.body.plugins[0].catalog?.name === 'x'
    && listed.body.plugins[0].source === 'https://github.com/o/x', JSON.stringify(listed))

  // 终端直接安装的包（依赖里有、账本里没有）不进列表。
  manifestWith({ x: '^1.0.0', y: '^2.0.0' })
  const filtered = await call('/hi-dsh/installed', 'GET')
  check('GET installed：终端安装的包不显示', filtered.code === 200 && filtered.body.plugins.length === 1
    && filtered.body.plugins[0].name === 'x', JSON.stringify(filtered))

  // 卸载校验：非账本包 / hi-dsh 自身 / 非法包名 → 400，不触发 pnpm。
  const notLedger = await call('/hi-dsh/uninstall', 'POST', { name: 'y' })
  check('uninstall：非 hi-dsh 安装的包被拒', notLedger.code === 400 && notLedger.body.error.includes('不是通过 hi-dsh 安装'),
    JSON.stringify(notLedger))
  const self = await call('/hi-dsh/uninstall', 'POST', { name: 'hi-dsh' })
  check('uninstall：拒绝卸载 hi-dsh 自身', self.code === 400 && self.body.error.includes('hi-dsh 自身'),
    JSON.stringify(self))
  const bad = await call('/hi-dsh/uninstall', 'POST', { name: 'bad name' })
  check('uninstall：非法包名被拒', bad.code === 400, JSON.stringify(bad))

  // 账本损坏 → 诚实的 500（可行动的错误信息），不装作空列表。
  writeFileSync(join(profileDir, 'hi-dsh.json'), '{oops')
  const corrupt = await call('/hi-dsh/installed', 'GET')
  check('GET installed：账本损坏 → 500', corrupt.code === 500 && corrupt.body.error.includes('账本'),
    JSON.stringify(corrupt))
  const corruptUninstall = await call('/hi-dsh/uninstall', 'POST', { name: 'x' })
  check('uninstall：账本损坏 → 500', corruptUninstall.code === 500, JSON.stringify(corruptUninstall))
  rmSync(join(profileDir, 'hi-dsh.json'))

  // feed 不可用 → feedReady:false，本地记录照常返回、catalog 为 null。
  install.recordInstalled(profileDir, ['x'], { target: 'x', source: 'https://github.com/o/x' })
  marketState.feed = null
  const nofeed = await call('/hi-dsh/installed', 'GET')
  check('GET installed：feed 不可用 → feedReady:false 且仍列出本地记录', nofeed.code === 200
    && nofeed.body.feedReady === false && nofeed.body.plugins.length === 1 && nofeed.body.plugins[0].catalog === null,
    JSON.stringify(nofeed))
  marketState.feed = { plugins: [{ name: 'x', npm: 'x', url: 'https://github.com/o/x' }] }

  // recordRemoved 后列表为空（卸载成功路径的账本部分）。
  install.recordRemoved(profileDir, 'x')
  const afterRemove = await call('/hi-dsh/installed', 'GET')
  check('recordRemoved 后列表为空', afterRemove.code === 200 && afterRemove.body.plugins.length === 0,
    JSON.stringify(afterRemove))
}

console.log(failures === 0 ? '\nsmoke: 全部通过' : `\nsmoke: ${failures} 项失败`)
process.exit(failures === 0 ? 0 : 1)
