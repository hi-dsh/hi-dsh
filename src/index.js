import { Service } from '@deepseek-ai/cordis'
import { argvProfile, cleanHotDir, profileDirectory, registerRoutes } from './install.js'

const NAME = 'hi-dsh'
const SERVICE = 'marketplace'
const FEED_URL = 'https://awesome-dsh-plugin.com/plugins.json'

/**
 * Last feed status, read by the /hi-dsh command. Module-level because the
 * command handler is registered synchronously while the feed refresh is
 * async — the handler must not require the service instance.
 */
let feedStatus = { state: 'loading', count: 0, updated: null, error: null }

/** Flatten one catalog entry (feed shape or legacy config shape) to text. */
function entryText(entry) {
  const d = entry.description
  const parts = [entry.name, entry.npm, typeof d === 'string' ? d : d?.en, d?.zh]
  return parts.filter(Boolean).join(' ').toLowerCase()
}

/**
 * The marketplace host service.
 *
 * Registered on the Cordis context as `marketplace`, so consumers read it via
 * `inject: ['marketplace']` and access `ctx.marketplace`.
 *
 * Catalog source (v1): the shared awesome-dsh-plugin feed — the same JSON
 * dsh-market consumes, refreshed daily by that repo's CI. Fetched once at
 * boot into memory; a failed fetch degrades to the static `config.catalog`
 * and is surfaced through status() instead of throwing.
 *
 * One-click install: on hosts with a webServer (web profile), a same-origin
 * POST /hi-dsh/install route forwards to `dsh plugin --profile <name> add`
 * and hot-mounts what it added (see install.js). Other profiles keep the
 * read-only service + command.
 */
export class Marketplace extends Service {
  constructor(ctx, config = {}) {
    super(ctx, SERVICE)
    this.hostCtx = ctx
    this.catalog = config.catalog ?? []
    this.feedUrl = config.feedUrl ?? FEED_URL
    this.feed = null
    this.refreshFeed()
  }

  /** Pull the shared catalog feed; never throws (reports via status()). */
  async refreshFeed() {
    feedStatus = { state: 'loading', count: 0, updated: null, error: null }
    try {
      const res = await fetch(this.feedUrl, { signal: AbortSignal.timeout(15_000) })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const feed = await res.json()
      if (!feed || !Array.isArray(feed.plugins)) throw new Error('unexpected feed shape')
      this.feed = feed
      feedStatus = {
        state: 'ready',
        count: feed.count ?? feed.plugins.length,
        updated: feed.updated ?? null,
        error: null,
      }
      this.hostCtx?.logger?.info?.('[%s] catalog feed: %d plugins (updated %s)', NAME, feedStatus.count, feedStatus.updated)
    } catch (err) {
      feedStatus = { state: 'error', count: 0, updated: null, error: err?.message ?? String(err) }
      this.hostCtx?.logger?.warn?.('[%s] catalog feed unavailable: %s', NAME, feedStatus.error)
    }
  }

  /** Live feed entries when loaded, the static config catalog otherwise. */
  entries() {
    if (this.feed?.plugins?.length) return this.feed.plugins
    return this.catalog
  }

  /** Return entries, optionally filtered by a substring across name/npm/description. */
  list(filter) {
    const entries = this.entries()
    if (!filter) return entries
    const needle = String(filter).toLowerCase()
    return entries.filter((entry) => entryText(entry).includes(needle))
  }

  count() {
    return this.entries().length
  }

  status() {
    return { ...feedStatus, source: this.feedUrl }
  }
}

/**
 * The `/hi-dsh` command handler. A slash command never reaches the model: the
 * dispatching UI renders the returned `CommandResult` directly.
 */
function hiDshCommandHandler() {
  const s = feedStatus
  const lines = ['插件市场 · hi-dsh']
  if (s.state === 'ready') {
    lines.push(`数据源 awesome-dsh-plugin.com — ${s.count} 个插件（更新于 ${s.updated ?? '未知'}）`)
  } else if (s.state === 'loading') {
    lines.push('正在拉取目录…')
  } else {
    lines.push(`目录暂不可用（${s.error}）— 市场面板内可重试`)
  }
  lines.push('打开方式：点击左侧栏底部的 Hi 按钮')
  return { kind: 'success', text: lines.join('\n') }
}

/**
 * Cordis plugin entry (the default export).
 *
 * Mounts the Marketplace service and registers the `/hi-dsh` command. The
 * web UI half (Hi button + market page) is declared in package.json
 * `dsh.client` and built by tsdown into client/client.js.
 *
 * The plugin injects `commands` (provided by `@deepseek-ai/dsh-commands`), so
 * it runs after the command registry exists and can register into it.
 *
 * @param ctx - the Cordis context.
 * @param config - this entry's row config (see cordis.patch.yml).
 */
export async function hiDsh(ctx, config = {}) {
  await ctx.plugin(Marketplace, config)
  ctx.commands.register({
    name: 'hi-dsh',
    description: 'hi-dsh 插件市场状态',
    handler: hiDshCommandHandler,
  })
  // The HTTP routes (GET /hi-dsh/installed, POST /hi-dsh/install,
  // POST /hi-dsh/uninstall) need the host webServer (web profile). Injecting
  // them here — instead of declaring it on the plugin — keeps the command and
  // the marketplace service alive on hosts without one (headless / tui).
  ctx.inject(['webServer'], (host) => {
    const profile = config.profile ?? argvProfile() ?? 'web'
    cleanHotDir(profileDirectory(profile))
    host.effect(() => registerRoutes({
      host,
      profile,
      // Server-side trust check: the route must verify the source against
      // this host's own catalog, not the browser's copy. If the boot fetch
      // failed, refresh once on demand — a stale "not ready" must not turn
      // every install into a dead end.
      //
      // Request-time service access must go through ctx.get(): the handler
      // runs outside hi-dsh's fiber, and plain property access is refused by
      // the host's inject guard (marketplace is a service hi-dsh itself
      // provides, so it cannot be declared on inject either). Same pattern
      // dsh-market uses for its agents lookup. A missing service maps to the
      // route's honest "目录未就绪" answer.
      getFeed: async () => {
        const marketplace = ctx.get('marketplace')
        if (marketplace?.feed === null) await marketplace.refreshFeed()
        return marketplace?.feed ?? null
      },
      logger: ctx.logger,
    }), 'hi-dsh: routes')
  })
  ctx.logger.info('[%s] marketplace mounted (feed: %s)', NAME, config.feedUrl ?? FEED_URL)
}
hiDsh.inject = ['commands']

export default hiDsh
