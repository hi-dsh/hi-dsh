/**
 * Browser client bundle for the hi-dsh plugin, mirroring the DeepSeek
 * Harness client preset (as used by dsh-market for an external package): a
 * closure-factory artifact that calls window.__ModuleLoader__.load({ id,
 * factory }) and resolves externals through the injected require (the host's
 * loader module table).
 *
 * The emitted client/client.js must start with the exact
 * `window.__ModuleLoader__.load({ id: "hi-dsh"` prefix.
 */
import { defineConfig } from 'tsdown'

const id = 'hi-dsh'

// Externals resolved from the loader module table at runtime; everything
// else inlines. react/jsx-runtime covers the automatic JSX transform.
const CLIENT_EXTERNALS = [
  'react',
  'react/jsx-runtime',
  'react-dom',
  '@deepseek-ai/dsh-client-ui-primitives',
]

export default defineConfig({
  entry: { client: 'src/client/index.jsx' },
  // package.json exports "./client" points at client/client.js.
  outDir: 'client',
  format: 'cjs',
  platform: 'browser',
  target: 'es2022',
  dts: false,
  sourcemap: true,
  clean: false,
  deps: { neverBundle: CLIENT_EXTERNALS },
  outputOptions: {
    entryFileNames: 'client.js',
    banner: `window.__ModuleLoader__.load({ id: ${JSON.stringify(id)}, factory: (require) => {`,
    footer: 'return module.exports; } });',
    intro: 'var module = { exports: {} }; var exports = module.exports;',
  },
})
