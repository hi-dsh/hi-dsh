# hi-dsh

A dsh plugin marketplace — discover, catalog, and install **dsh** plugins.

`hi-dsh` is itself a dsh bundle: an npm package whose manifest declares
`"dsh": { "bundle": { "patch": "./cordis.patch.yml" } }`. When installed into a
profile, it mounts a `Marketplace` Cordis service that the rest of a profile's
surface (commands, the web UI, an agent tool) can render and extend.

> **Status: skeleton.** This package is the load-bearing host shape only. Real
> discovery (a curated catalog, a remote feed, or an npm-registry scan of
> packages that declare `dsh.bundle`), search, and install actions are the
> next milestone.

## What it does today

- Declares a valid dsh bundle (the `dsh.bundle.patch` marker).
- Mounts a `Marketplace` service (`ctx.marketplace`) with a `list(filter)`
  catalog lookup and a `count()`.
- Registers the **`/hi-dsh`** slash command, which answers with the placeholder
  text `功能更新中，敬请期待` (visible in the web UI command surface).
- Logs a single startup line so a booted profile confirms the bundle activated.

After installing into the `web` profile, type `/hi-dsh` in the session to see
the placeholder.

## Install into a profile

```sh
dsh plugin --profile <name> add hi-dsh
```

`dsh plugin` forwards the arguments to pnpm in the profile directory, then
reconciles `dsh.profile.bundles` so a dependency that declares `dsh.bundle`
joins the layer stack. The `<name>` profile must already exist (or be one of the
auto-initializing `web` / `headless` profiles).

## Development

```sh
# clone, then add a catalog or install it into a profile
dsh plugin --profile web add .
```

To confirm the plugin activates without a full session, inspect the composed
tree:

```sh
dsh --profile web --dump-config
```

## Layout

| Path | Purpose |
| --- | --- |
| `package.json` | Package manifest + `dsh.bundle.patch` marker. |
| `cordis.patch.yml` | The bundle patch layer that inserts the `hi-dsh` row. |
| `src/index.js` | Cordis plugin: `Marketplace` service + the default export. |

## License

MIT
