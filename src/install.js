/**
 * hi-dsh HTTP routes, registered on the host webServer (web profile):
 *   GET  /hi-dsh/installed  — the provenance ledger joined with the profile's
 *                             dependency table (what hi-dsh installed);
 *   POST /hi-dsh/install    — forwards the install to
 *                             `dsh plugin --profile <name> add <target>` in
 *                             the host process, records the ledger entry, and
 *                             hot-mounts what it added so the plugin is
 *                             usable without a restart (the same
 *                             Include-subtree mechanism dsh-market uses);
 *   POST /hi-dsh/uninstall  — forwards `dsh plugin --profile <name> remove`.
 *
 * Install and uninstall share one busy lock (a profile directory must not
 * run two pnpm operations at once) and one hot-mount sequence counter.
 *
 * Trust boundary mirrors dsh-market:
 *   - mutating routes only accept same-origin POSTs;
 *   - install only accepts sources present in the curated catalog feed (the
 *     entry must be found by its GitHub url);
 *   - uninstall only accepts packages the ledger recorded as hi-dsh-installed
 *     and that are still profile dependencies — never a free-text target;
 *   - the pnpm target is derived from the entry's structured fields
 *     (npm name, GitHub url) — never from the free-text install command —
 *     and validated against a strict charset allowlist before spawning.
 */
import { spawn } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, isAbsolute, join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const TARGET_RE = /^[A-Za-z0-9@:./_#+~^=-]+$/
const NPM_NAME_RE = /^(@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/
const INSTALL_TIMEOUT_MS = Number(process.env.HI_DSH_INSTALL_TIMEOUT_MS) || 15 * 60 * 1000
const HOT_MOUNT_TIMEOUT_MS = Number(process.env.HI_DSH_HOT_MOUNT_TIMEOUT_MS) || 10_000
/** Runtime-only mount inputs live here; wiped on every boot. */
const HOT_DIR = '.hi-dsh'
const WIN_CMD_SHIM = process.platform === 'win32'

export function isDshProfileName(profile) {
  return typeof profile === 'string'
    && profile !== ''
    && profile !== '.'
    && profile !== '..'
    && profile !== 'node_modules'
    && !profile.includes('/')
    && !profile.includes('\\')
    && !profile.includes('\0')
}

/** The profile the host process booted (`--profile <name>`), else `web`. */
export function argvProfile() {
  const argv = process.argv
  const flag = argv.indexOf('--profile')
  if (flag !== -1 && flag + 1 < argv.length && !argv[flag + 1].startsWith('-')) {
    return argv[flag + 1]
  }
  return undefined
}

/** Resolve a profile name to its directory under DSH_HOME (default ~/.dsh). */
export function profileDirectory(profile) {
  if (!isDshProfileName(profile)) {
    throw new Error(`hi-dsh: invalid profile name ${JSON.stringify(profile)}`)
  }
  const home = process.env.DSH_HOME ?? join(homedir(), '.dsh')
  return join(home, 'profiles', profile)
}

function nodeExecutable() {
  if (process.argv0 && isAbsolute(process.argv0) && existsSync(process.argv0)) return process.argv0
  return process.execPath
}

/**
 * Locate the dsh CLI the same way dsh-market does: launched from the
 * installation (bin.js) → re-invoke node with that absolute entry so source
 * checkouts work; otherwise fall through to the bare `dsh` on PATH.
 */
function dshArgv() {
  const entry = process.argv[1]
  if (entry !== undefined && /[\\/](?:bin\.(?:js|ts)|dsh)$/.test(entry)) {
    const abs = isAbsolute(entry) ? entry : resolve(entry)
    return { file: nodeExecutable(), args: [...process.execArgv, abs], cwd: dirname(abs), viaShell: false }
  }
  return { file: 'dsh', args: [], cwd: undefined, viaShell: WIN_CMD_SHIM }
}

/**
 * Child env: CI mode so pnpm acts or fails instead of blocking on a silent
 * interactive prompt (no TTY here), with the toolchain dirs pnpm needs on
 * top of the inherited PATH.
 */
function spawnEnv() {
  const separator = process.platform === 'win32' ? ';' : ':'
  const parts = (process.env.PATH ?? '').split(separator).filter((part) => part !== '')
  const extra = [
    process.env.PNPM_HOME,
    '/opt/homebrew/bin', '/usr/local/bin',
    join(homedir(), '.local', 'bin'),
    join(homedir(), 'Library', 'pnpm'),
    join(homedir(), '.local', 'share', 'pnpm'),
    dirname(process.execPath),
  ].filter((dir) => typeof dir === 'string' && dir !== '')
  for (const dir of extra) {
    if (!parts.includes(dir)) parts.push(dir)
  }
  return { ...process.env, CI: 'true', PATH: parts.join(separator) }
}

function killTree(child) {
  if (process.platform === 'win32') {
    child.kill()
    return
  }
  try {
    process.kill(-child.pid, 'SIGKILL')
  } catch {
    // Already gone.
  }
}

/** Last `limit` characters of a stream, for the response payload. */
function tail(text, limit = 2000) {
  return text.length > limit ? text.slice(-limit) : text
}

/**
 * Run one `dsh plugin --profile <p> …` command. Resolves (never rejects) with
 * { exitCode, timedOut, stdout, stderr }.
 */
export function runDshPlugin(profile, pluginArgs) {
  const { file, args, cwd, viaShell } = dshArgv()
  // The bare-`dsh` fallback crosses a shell on Windows; profile names with
  // spaces or metacharacters would not survive it. Refuse explicitly.
  if (viaShell && !/^[\w.-]+$/.test(profile)) {
    const error = `hi-dsh: profile name ${JSON.stringify(profile)} cannot cross the Windows shell fallback; install from a terminal instead: dsh plugin --profile ${profile} add <pkg>`
    return Promise.resolve({ exitCode: 1, timedOut: false, stdout: '', stderr: error })
  }
  const target = pluginArgs[pluginArgs.length - 1] ?? ''
  if (!TARGET_RE.test(target)) {
    const error = `hi-dsh: unsafe install target rejected: ${JSON.stringify(target)}`
    return Promise.resolve({ exitCode: 1, timedOut: false, stdout: '', stderr: error })
  }
  return new Promise((resolvePromise) => {
    const child = spawn(file, [...args, 'plugin', '--profile', profile, ...pluginArgs], {
      cwd,
      env: spawnEnv(),
      stdio: ['ignore', 'pipe', 'pipe'],
      // Own process group on POSIX so a timeout kills the whole tree
      // (dsh wrapper + pnpm grandchild) with one signal.
      detached: process.platform !== 'win32',
      shell: viaShell,
    })
    let stdout = ''
    let stderr = ''
    let timedOut = false
    const timer = setTimeout(() => {
      timedOut = true
      killTree(child)
    }, INSTALL_TIMEOUT_MS)
    child.stdout?.on('data', (chunk) => {
      stdout = (stdout + chunk.toString()).slice(-256 * 1024)
    })
    child.stderr?.on('data', (chunk) => {
      stderr = (stderr + chunk.toString()).slice(-64 * 1024)
    })
    child.on('error', (error) => {
      clearTimeout(timer)
      resolvePromise({ exitCode: 127, timedOut: false, stdout, stderr: `${stderr}\n${error.message}` })
    })
    child.on('close', (code) => {
      clearTimeout(timer)
      resolvePromise({ exitCode: code, timedOut, stdout, stderr })
    })
  })
}

/** `owner/repo` of a GitHub catalog url, lowercased, or null. */
function repoSlugOf(url) {
  const m = /^https:\/\/github\.com\/([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)/.exec(String(url ?? '').trim())
  return m === null ? null : `${m[1]}/${m[2]}`.toLowerCase()
}

/** GitHub catalog url → pnpm target, honoring /tree/<ref>/<subpath> links. */
function githubTargetFromUrl(url) {
  const m = /^https:\/\/github\.com\/([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+?)(?:\.git)?(?:\/tree\/[^/]+(?:\/(.+))?)?\/?$/.exec(String(url ?? '').trim())
  if (m === null) return null
  const [, owner, repo, subpath] = m
  if (subpath !== undefined) {
    const clean = subpath.replace(/\/+$/, '')
    const valid = /^[A-Za-z0-9_./-]+$/.test(clean)
      && clean.split('/').every((segment) => segment !== '' && segment !== '.' && segment !== '..')
    if (!valid) return null
    return `github:${owner}/${repo}#path:/${clean}`
  }
  return `github:${owner}/${repo}`
}

/**
 * The pnpm target for a catalog entry, derived from structured fields:
 * a valid npm name wins; otherwise the GitHub url (with its subpath, if any).
 * Null when neither spelling exists — the route refuses such entries.
 */
export function installTargetFor(entry) {
  if (typeof entry.npm === 'string' && NPM_NAME_RE.test(entry.npm)) return entry.npm
  const target = githubTargetFromUrl(entry.url)
  if (target !== null && TARGET_RE.test(target)) return target
  return null
}

/** The profile's dependency table (package.json `dependencies`). */
function readInstalled(dir) {
  const manifest = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'))
  return manifest.dependencies ?? {}
}

// ---------------------------------------------------------------------------
// The provenance ledger: which packages were installed through hi-dsh.
// "Installed via hi-dsh" exists only at install time — pnpm records nothing
// about who ran the command — so the install route writes one durable entry
// per package here. The file lives beside the profile manifest, NOT in
// .hi-dsh/ (that hot-mount directory is wiped on every boot). The dependency
// table stays the fact source: the ledger is pruned against it on every
// write, and the installed list is ledger ∩ dependencies, so a package
// removed out-of-band (a terminal `dsh plugin remove`) drops out on its own.
// ---------------------------------------------------------------------------

const LEDGER_FILENAME = 'hi-dsh.json'

/** Packages hi-dsh refuses to manage through its own market. */
const SELF_NAME = 'hi-dsh'

export function ledgerPath(dir) {
  return join(dir, LEDGER_FILENAME)
}

/**
 * Read the ledger. A missing file is the defined initial state (nothing
 * installed through hi-dsh yet), not an error; a corrupt file is a real
 * error the caller surfaces instead of pretending the list is empty.
 */
export function readLedger(dir) {
  const file = ledgerPath(dir)
  if (!existsSync(file)) return { version: 1, installed: {} }
  const parsed = JSON.parse(readFileSync(file, 'utf8'))
  if (parsed === null || typeof parsed !== 'object'
    || parsed.installed === null || typeof parsed.installed !== 'object') {
    throw new Error('unexpected ledger shape')
  }
  return parsed
}

/** Atomic ledger write (tmp + rename; readers see old or new, never torn). */
function writeLedger(dir, ledger) {
  const file = ledgerPath(dir)
  const tmp = `${file}.tmp`
  writeFileSync(tmp, `${JSON.stringify(ledger, null, 2)}\n`)
  renameSync(tmp, file)
}

/** Record a successful install and prune entries whose package left the profile. */
export function recordInstalled(dir, added, { target, source }) {
  const deps = readInstalled(dir)
  const ledger = readLedger(dir)
  const installed = {}
  for (const [name, record] of Object.entries(ledger.installed)) {
    if (name in deps) installed[name] = record
  }
  const at = new Date().toISOString()
  for (const name of added) {
    if (!(name in deps)) continue
    installed[name] = { spec: deps[name], target, source, at }
  }
  writeLedger(dir, { version: 1, installed })
}

/** Drop one package from the ledger after a successful uninstall. */
export function recordRemoved(dir, name) {
  const ledger = readLedger(dir)
  if (!(name in ledger.installed)) return
  delete ledger.installed[name]
  writeLedger(dir, ledger)
}

/** The installed version of one package, or null when it cannot be read. */
function installedVersion(dir, name) {
  try {
    return JSON.parse(readFileSync(join(dir, 'node_modules', name, 'package.json'), 'utf8')).version ?? null
  } catch {
    return null
  }
}

/** Minimal HTTP helpers, shared with the route (same semantics as dsh-market). */
function sendJson(response, status, payload) {
  response.writeHead(status, {
    'cache-control': 'no-store',
    'content-type': 'application/json; charset=utf-8',
  })
  response.end(JSON.stringify(payload))
}

function sameOrigin(request) {
  const origin = request.headers.origin
  const host = request.headers.host
  if (origin === undefined || host === undefined) return false
  try {
    return new URL(origin).host === host
  } catch {
    return false
  }
}

async function readJsonBody(request, maxBytes = 4096) {
  const chunks = []
  let size = 0
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
    size += buffer.length
    if (size > maxBytes) throw new Error('request body too large')
    chunks.push(buffer)
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'))
}

// ---------------------------------------------------------------------------
// Restart-free activation: mount a freshly installed plugin into the running
// composition through a hi-dsh-owned Include subtree. Durable state stays
// with the profile's dsh.profile.bundles (reconciled by the dsh CLI at
// install time); the files here exist only for the current process and are
// wiped on every boot.
// ---------------------------------------------------------------------------

let hotTreeClass
async function loadHotTreeClass() {
  if (hotTreeClass !== undefined) return hotTreeClass
  try {
    // Ships with the harness (vendored, unpublished); resolves at runtime
    // through the dsh installation's node_modules.
    const mod = await import('@deepseek-ai/cordis-plugin-include')
    const Include = mod.Include
    if (Include === undefined) throw new Error('no Include export')
    class HiDshHotTree extends Include {
      /** Runtime-only mount list; the bundle layer owns persistence. */
      write() {}
      import(name, getOuterStack) {
        if (shimNames.has(name)) return { name, apply: () => {} }
        return super.import(name, getOuterStack)
      }
    }
    hotTreeClass = HiDshHotTree
  } catch {
    hotTreeClass = null
  }
  return hotTreeClass
}

/** Client-only packages get a no-op shim entry so their client half serves. */
const shimNames = new Set()

/**
 * The insert-only subset of the entry-list patch dialect. Any config row,
 * expression, or unknown shape returns null — such packages simply activate
 * on restart instead (reported in the response, never silently ignored).
 */
export function parseSimplePatch(patchText) {
  const rows = []
  let pending = null
  for (const raw of patchText.split(/\r?\n/)) {
    // Strip comments (a `#` cannot appear in ids/names, and \r-terminated
    // lines must not leak their comment into the row match).
    const line = raw.replace(/#.*$/, '').trimEnd()
    if (line.trim() === '') continue
    if (/^-\s+insert:\s*$/.test(line)) continue
    const id = /^\s+-\s+id:\s*(\S+)\s*$/.exec(line)
    if (id !== null) {
      if (pending !== null) return null
      pending = id[1]
      continue
    }
    const name = /^\s+name:\s*['"]?([^'"\s]+)['"]?\s*$/.exec(line)
    if (name !== null && pending !== null) {
      rows.push({ id: pending, name: name[1] })
      pending = null
      continue
    }
    return null
  }
  if (pending !== null || rows.length === 0) return null
  return rows
}

/**
 * Mount one installed package into the running composition.
 * Returns { ok: true } or { ok: false, reason } — a false result is not an
 * error: the plugin still activates on the next `dsh web` restart.
 */
export async function hotMount(ctx, dir, packageName, sequence) {
  const hotTree = await loadHotTreeClass()
  if (hotTree === null) {
    return { ok: false, reason: '宿主不支持热挂载（include 插件不可导入），重启 dsh web 后生效' }
  }
  const packageDir = join(dir, 'node_modules', packageName)
  const patchPath = join(packageDir, 'cordis.patch.yml')
  let rows
  if (existsSync(patchPath)) {
    const patchText = readFileSync(patchPath, 'utf8')
    rows = parseSimplePatch(patchText)
    if (rows === null) {
      return { ok: false, reason: 'bundle patch 含配置行/表达式，热挂载仅支持纯 insert，重启 dsh web 后生效' }
    }
  } else {
    const dsh = JSON.parse(readFileSync(join(packageDir, 'package.json'), 'utf8')).dsh
    if (dsh === undefined || dsh.client === undefined || dsh.bundle !== undefined) {
      return { ok: false, reason: '该包没有可热挂载的宿主条目（无 bundle patch 且未声明 dsh.client），重启 dsh web 后生效' }
    }
    shimNames.add(packageName)
    rows = [{ id: `client-${packageName.replace(/[^A-Za-z0-9_.-]/g, '-')}`, name: packageName }]
  }
  const hotDir = join(dir, HOT_DIR)
  mkdirSync(hotDir, { recursive: true, mode: 0o700 })
  const file = join(hotDir, `hot-${String(sequence)}.yml`)
  writeFileSync(file, rows.map((row) => `- id: 'hids-${row.id}'\n  name: '${row.name}'\n`).join(''))
  let timedOut = false
  let handle = null
  let timer = null
  try {
    handle = ctx.plugin(hotTree, { path: pathToFileURL(file).href })
    await Promise.race([
      handle.await(),
      new Promise((_, reject) => {
        timer = setTimeout(() => {
          timedOut = true
          reject(new Error('activation timeout'))
        }, HOT_MOUNT_TIMEOUT_MS)
      }),
    ])
  } catch {
    // A wedged activation must not hold the install response open; unwind
    // the half-mounted subtree best-effort and let the caller report
    // restart-activation honestly.
    try {
      Promise.resolve(handle?.dispose()).catch(() => {})
    } catch {
      // Best effort.
    }
    if (timedOut) {
      return { ok: false, reason: '热挂载激活超时（插件可能缺少所需服务），重启 dsh web 后生效' }
    }
    return { ok: false, reason: '热挂载激活失败，重启 dsh web 后生效' }
  } finally {
    if (timer !== null) clearTimeout(timer)
  }
  return { ok: true }
}

/** Wipe leftover hot-mount inputs; call once when the host plugin starts. */
export function cleanHotDir(dir) {
  rmSync(join(dir, HOT_DIR), { recursive: true, force: true })
}

/**
 * Register the hi-dsh HTTP routes on the host webServer:
 *   GET  /hi-dsh/installed  — ledger ∩ profile dependencies (+ catalog join);
 *   POST /hi-dsh/install    — one-click install (catalog-sourced, hot-mount);
 *   POST /hi-dsh/uninstall  — remove a hi-dsh-installed package.
 * Returns the route disposer. `getFeed()` returns the catalog feed
 * ({plugins: [...]}) or null while the server-side catalog is unavailable.
 */
export function registerRoutes({ host, profile, getFeed, logger }) {
  let busy = false
  let hotSequence = 0
  const guardBusy = (response) => {
    if (busy) {
      sendJson(response, 409, { error: '另一个安装或卸载正在进行中，请等它完成后再试' })
      return false
    }
    busy = true
    return true
  }
  const dispose = [
    host.webServer.register({
      kind: 'exact',
      path: '/hi-dsh/installed',
      handler: async (request, response) => {
        if (request.method !== 'GET') {
          response.writeHead(405, { allow: 'GET' })
          response.end()
          return
        }
        // Read-only: no same-origin gate here — the trust boundary lives on
        // the mutating POSTs; a GET changes nothing.
        const dir = profileDirectory(profile)
        let deps
        try {
          deps = readInstalled(dir)
        } catch (err) {
          sendJson(response, 500, { error: `读取 profile 依赖失败（${dir}）：${err?.message ?? err}` })
          return
        }
        let ledger
        try {
          ledger = readLedger(dir)
        } catch (err) {
          sendJson(response, 500, { error: `已安装账本无法读取（${ledgerPath(dir)}）：${err?.message ?? err}。删除该文件可重置记录，之后的安装会重新记账。` })
          return
        }
        const rows = []
        for (const [name, record] of Object.entries(ledger.installed)) {
          if (!(name in deps)) continue
          rows.push({
            name,
            spec: deps[name] ?? null,
            version: installedVersion(dir, name),
            source: record?.source ?? null,
            at: record?.at ?? null,
          })
        }
        // Catalog join is presentation, not substance: the local facts above
        // stand alone, and an unreachable feed only drops the enrichment —
        // reported to the client as feedReady:false, never silently omitted.
        let feed = null
        try {
          feed = await getFeed()
        } catch {
          feed = null
        }
        const byNpm = new Map()
        const bySlug = new Map()
        for (const entry of Array.isArray(feed?.plugins) ? feed.plugins : []) {
          if (typeof entry.npm === 'string' && !byNpm.has(entry.npm)) byNpm.set(entry.npm, entry)
          const slug = repoSlugOf(entry.url)
          if (slug !== null && !bySlug.has(slug)) bySlug.set(slug, entry)
        }
        for (const row of rows) {
          const slug = repoSlugOf(row.source)
          const entry = byNpm.get(row.name) ?? (slug !== null ? bySlug.get(slug) : undefined)
          row.catalog = entry === undefined ? null : {
            name: entry.name,
            description: entry.description ?? null,
            stars: entry.stars ?? null,
            downloads: entry.downloads ?? null,
            url: entry.url ?? null,
          }
        }
        sendJson(response, 200, {
          ok: true,
          feedReady: feed !== null && Array.isArray(feed.plugins),
          plugins: rows,
        })
      },
    }),
    host.webServer.register({
      kind: 'exact',
      path: '/hi-dsh/install',
      handler: async (request, response) => {
        if (request.method !== 'POST') {
          response.writeHead(405, { allow: 'POST' })
          response.end()
          return
        }
        if (!sameOrigin(request)) {
          sendJson(response, 403, { error: 'untrusted origin' })
          return
        }
        if (!guardBusy(response)) return
        try {
          const body = await readJsonBody(request)
          const url = typeof body.url === 'string' ? body.url : ''
          const feed = await getFeed()
          if (feed === null || !Array.isArray(feed.plugins)) {
            sendJson(response, 503, { error: '服务端目录未就绪，无法校验插件来源；请稍后重试（若持续失败，重启 dsh web）' })
            return
          }
          // Curated-catalog check: the same trust boundary dsh-market draws.
          const entry = feed.plugins.find((p) => typeof p.url === 'string' && p.url.toLowerCase() === url.toLowerCase())
          if (entry === undefined) {
            sendJson(response, 400, { error: '该插件不在目录中，拒绝安装' })
            return
          }
          const target = installTargetFor(entry)
          if (target === null) {
            sendJson(response, 400, { error: '该插件没有可用的安装来源（npm / GitHub）' })
            return
          }
          const dir = profileDirectory(profile)
          const before = Object.keys(readInstalled(dir))
          const result = await runDshPlugin(profile, ['add', target])
          const ok = result.exitCode === 0 && !result.timedOut
          let added = []
          let already = false
          let error
          if (ok) {
            added = Object.keys(readInstalled(dir)).filter((name) => !before.includes(name))
            if (added.length === 0) {
              // Clean exit that changed nothing: either the plugin was already
              // installed (fine), or the install silently did nothing (a broken
              // channel — report it instead of a fake success).
              const slug = repoSlugOf(entry.url)
              const match = Object.entries(readInstalled(dir)).find(([name, spec]) => {
                if (typeof entry.npm === 'string' && name === entry.npm) return true
                return slug !== null && String(spec).toLowerCase().includes(slug)
              })
              if (match !== undefined) {
                already = true
              } else {
                ok = false
                error = '安装命令报告成功，但 profile 没有任何变化——请在终端运行 `dsh plugin add` 验证，并把输出附到 github.com/hi-dsh/hi-dsh 反馈'
              }
            }
          } else {
            error = `dsh plugin add 失败（exit ${result.exitCode}${result.timedOut ? '，超时' : ''}）`
          }
          let hot = false
          const hotReasons = []
          let ledgerError
          if (ok && !already && added.length > 0) {
            // Record provenance before hot-mounting: the install happened
            // regardless of whether the hot-mount succeeds.
            try {
              recordInstalled(dir, added, { target, source: entry.url })
            } catch (err) {
              ledgerError = `记账失败（${err?.message ?? err}），该插件不会出现在已安装列表；重装一次可重建记录`
            }
            hot = true
            for (const name of added) {
              const mounted = await hotMount(host, dir, name, ++hotSequence)
              if (!mounted.ok) {
                hot = false
                hotReasons.push(`${name}: ${mounted.reason}`)
              }
            }
          }
          if (ledgerError !== undefined) logger?.warn?.('[hi-dsh] ledger write failed: %s', ledgerError)
          const payload = {
            ok,
            target,
            added,
            already: already || undefined,
            hot: hot || undefined,
            hotReasons: hotReasons.length > 0 ? hotReasons : undefined,
            ledgerError: ledgerError ?? undefined,
            error: ok ? undefined : error,
            exitCode: result.exitCode,
            timedOut: result.timedOut || undefined,
            stdoutTail: tail(result.stdout),
            stderrTail: tail(result.stderr),
          }
          if (logger?.warn && !ok) {
            logger.warn('[hi-dsh] install failed: %s — %s', target, tail(result.stderr || result.stdout, 300))
          }
          sendJson(response, ok ? 200 : 502, payload)
        } catch (err) {
          const message = err?.message ?? String(err)
          logger?.warn?.('[hi-dsh] install route error: %s', message)
          sendJson(response, 500, { error: message })
        } finally {
          busy = false
        }
      },
    }),
    host.webServer.register({
      kind: 'exact',
      path: '/hi-dsh/uninstall',
      handler: async (request, response) => {
        if (request.method !== 'POST') {
          response.writeHead(405, { allow: 'POST' })
          response.end()
          return
        }
        if (!sameOrigin(request)) {
          sendJson(response, 403, { error: 'untrusted origin' })
          return
        }
        if (!guardBusy(response)) return
        try {
          const body = await readJsonBody(request)
          const name = typeof body.name === 'string' ? body.name.trim() : ''
          if (!NPM_NAME_RE.test(name)) {
            sendJson(response, 400, { error: '缺少或无效的插件包名' })
            return
          }
          // 卸载 hi-dsh 自身只能在终端执行（`dsh plugin remove hi-dsh`），由 dsh CLI
          // 完成，本插件代码不参与，因此无从清理。那次卸载只移除 hi-dsh 包和它自己的
          // bundle 层——既不卸载它装过的插件，也不删除记账账本。账本放在 profile 目录
          // （包外）正是为了活得比 hi-dsh 久：重装后这些插件仍在已安装列表，仍可从这里卸载。
          if (name === SELF_NAME) {
            sendJson(response, 400, { error: `不能通过市场卸载 hi-dsh 自身；请在终端执行 dsh plugin --profile ${profile} remove ${SELF_NAME}` })
            return
          }
          const dir = profileDirectory(profile)
          let deps
          try {
            deps = readInstalled(dir)
          } catch (err) {
            sendJson(response, 500, { error: `读取 profile 依赖失败（${dir}）：${err?.message ?? err}` })
            return
          }
          let ledger
          try {
            ledger = readLedger(dir)
          } catch (err) {
            sendJson(response, 500, { error: `已安装账本无法读取（${ledgerPath(dir)}）：${err?.message ?? err}。删除该文件可重置记录，之后的安装会重新记账。` })
            return
          }
          if (!(name in ledger.installed)) {
            sendJson(response, 400, { error: `该插件不是通过 hi-dsh 安装的（账本无记录）；请在终端执行 dsh plugin --profile ${profile} remove ${name} 管理` })
            return
          }
          if (!(name in deps)) {
            sendJson(response, 400, { error: '该插件已不在当前 profile 的依赖中，无需卸载' })
            return
          }
          const result = await runDshPlugin(profile, ['remove', name])
          const ok = result.exitCode === 0 && !result.timedOut
          let error
          if (!ok) {
            error = `dsh plugin remove 失败（exit ${result.exitCode}${result.timedOut ? '，超时' : ''}）`
          } else {
            // Mirror the install route's honesty: a clean exit that left the
            // dependency in place is a failure, not a success.
            const after = readInstalled(dir)
            if (name in after) {
              error = '卸载命令报告成功，但依赖仍存在于 profile——请在终端运行 `dsh plugin remove` 验证，并把输出附到 github.com/hi-dsh/hi-dsh 反馈'
              sendJson(response, 502, {
                ok: false,
                name,
                error,
                exitCode: result.exitCode,
                stdoutTail: tail(result.stdout),
                stderrTail: tail(result.stderr),
              })
              logger?.warn?.('[hi-dsh] uninstall left no change: %s', name)
              return
            }
            recordRemoved(dir, name)
          }
          const payload = {
            ok,
            name,
            restartRequired: ok || undefined,
            error: ok ? undefined : error,
            exitCode: result.exitCode,
            timedOut: result.timedOut || undefined,
            stdoutTail: tail(result.stdout),
            stderrTail: tail(result.stderr),
          }
          if (logger?.warn && !ok) {
            logger.warn('[hi-dsh] uninstall failed: %s — %s', name, tail(result.stderr || result.stdout, 300))
          }
          sendJson(response, ok ? 200 : 502, payload)
        } catch (err) {
          const message = err?.message ?? String(err)
          logger?.warn?.('[hi-dsh] uninstall route error: %s', message)
          sendJson(response, 500, { error: message })
        } finally {
          busy = false
        }
      },
    }),
  ]
  return () => {
    for (const d of dispose) d()
  }
}
