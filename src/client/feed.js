// Catalog source: the same feed dsh-market consumes
// (https://awesome-dsh-plugin.com/plugins.json, regenerated daily by the
// awesome-dsh-plugin CI). Fetched directly by the browser — GitHub Pages
// sends `access-control-allow-origin: *`, so no host proxy is needed for v1.
//
// Deliberately following dsh-market's no-stale-cache stance: we cache only
// within one page load, and a failed fetch surfaces an error with a retry
// instead of silently showing yesterday's catalog.

const FEED_URL = 'https://awesome-dsh-plugin.com/plugins.json'

let cache = null // { feed, fetchedAt }
let inflight = null

export function loadFeed({ force = false } = {}) {
  if (!force && cache) return Promise.resolve(cache)
  if (inflight) return inflight
  inflight = fetch(FEED_URL)
    .then((res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return res.json()
    })
    .then((feed) => {
      if (!feed || !Array.isArray(feed.plugins)) throw new Error('目录格式不符合预期')
      cache = { feed, fetchedAt: new Date() }
      return cache
    })
    .catch((err) => {
      // Do not poison the cache with a failure; drop the inflight marker so
      // the next call retries.
      inflight = null
      throw err
    })
    .finally(() => {
      inflight = null
    })
  return inflight
}
