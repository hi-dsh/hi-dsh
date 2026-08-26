import { Service } from '@deepseek-ai/cordis'

const NAME = 'hi-dsh'
const SERVICE = 'marketplace'

/**
 * The marketplace host service.
 *
 * Registered on the Cordis context as `marketplace`, so consumers read it via
 * `inject: ['marketplace']` and access `ctx.marketplace`. It owns the plugin
 * catalog the marketplace surfaces and grows a real discovery pipeline in a
 * later phase:
 *   - catalog source: a curated bundle in this package, or a remote JSON feed,
 *     or a live scan of the npm registry for packages that declare `dsh.bundle`;
 *   - install: forward to `dsh plugin --profile <name> add <pkg>` (or pnpm).
 *
 * For now it is the load-bearing host shape: mounted, observable, and ready to
 * be extended without changing how it is wired into a profile.
 */
export class Marketplace extends Service {
  constructor(ctx, config = {}) {
    super(ctx, SERVICE)
    this.catalog = config.catalog ?? []
  }

  /** Return the catalog, optionally filtered by a substring on name/description. */
  list(filter) {
    if (!filter) return this.catalog
    const needle = filter.toLowerCase()
    return this.catalog.filter((entry) => {
      const name = entry.name?.toLowerCase() ?? ''
      const description = entry.description?.toLowerCase() ?? ''
      return name.includes(needle) || description.includes(needle)
    })
  }

  count() {
    return this.catalog.length
  }
}

/**
 * Cordis plugin entry (the default export).
 *
 * The loader imports this module by the package name declared in the bundle
 * patch (`name: hi-dsh`) and applies the default export as a plugin. Mount the
 * Marketplace service, then log a single line so a booted profile can confirm
 * the bundle activated. `ctx.plugin(Marketplace, ...)` must be awaited: Cordis
 * registers the service (`ctx.marketplace`) during that application.
 *
 * @param ctx - the Cordis context.
 * @param config - this entry's row config (see cordis.patch.yml).
 */
export async function hiDsh(ctx, config = {}) {
  await ctx.plugin(Marketplace, config)
  // A plugin cannot read a service it itself provides without `inject`
  // (Cordis rule), so derive the log line from the config, not ctx.marketplace.
  ctx.logger.info('[%s] marketplace mounted (%d catalog entries)', NAME, config.catalog?.length ?? 0)
}

export default hiDsh
