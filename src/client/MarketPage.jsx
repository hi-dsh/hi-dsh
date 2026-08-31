/**
 * The hi-dsh market page: search / category filter / sort over the shared
 * awesome-dsh-plugin catalog feed. Rendered identically in two seats:
 *   - sidebar-aware overlay panel (opened by the Hi button) — no close button:
 *     clicking anywhere in the host UI (sessions, workspaces, the Hi button
 *     itself) dismisses it; Esc also works
 *   - conversation.view tab ("插件市场") — embedded in the session view ring
 *
 * v1 is read-only: browse, search, and copy an install command. The actual
 * install action (forward to `dsh plugin --profile <name> add <pkg>`) is the
 * next milestone.
 */
import { createElement as h, useEffect, useMemo, useRef, useState } from 'react'
import { loadFeed } from './feed.js'

const PAGE_SIZE = 30

function detectZh() {
  try {
    return (navigator.language || 'zh-CN').toLowerCase().startsWith('zh')
  } catch {
    return true
  }
}

function formatCount(n) {
  if (typeof n !== 'number') return '·'
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n)
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    // Fallback for non-secure contexts / denied clipboard permission.
    try {
      const ta = document.createElement('textarea')
      ta.value = text
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.select()
      const ok = document.execCommand('copy')
      ta.remove()
      return ok
    } catch {
      return false
    }
  }
}

const s = {
  page: { display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, colorScheme: 'light dark', font: 'inherit' },
  header: {
    display: 'flex', alignItems: 'center', gap: 10, padding: '12px 20px',
    borderBottom: '1px solid light-dark(rgba(0,0,0,.1), rgba(255,255,255,.12))',
  },
  title: { fontSize: 16, fontWeight: 700, margin: 0 },
  count: { fontSize: 12, color: 'light-dark(#6b7280, #9aa0a6)' },
  close: {
    marginLeft: 'auto', cursor: 'pointer', font: 'inherit', fontSize: 13, lineHeight: 1,
    padding: '6px 10px', borderRadius: 8, border: '1px solid light-dark(rgba(0,0,0,.15), rgba(255,255,255,.2))',
    background: 'transparent', color: 'inherit',
  },
  toolbar: { display: 'flex', gap: 8, padding: '10px 20px', flexWrap: 'wrap', alignItems: 'center' },
  input: {
    flex: '1 1 220px', font: 'inherit', fontSize: 13, color: 'inherit', padding: '7px 10px',
    borderRadius: 8, border: '1px solid light-dark(rgba(0,0,0,.18), rgba(255,255,255,.24))',
    background: 'transparent', outline: 'none',
  },
  select: {
    font: 'inherit', fontSize: 13, color: 'inherit', padding: '7px 8px', borderRadius: 8,
    border: '1px solid light-dark(rgba(0,0,0,.18), rgba(255,255,255,.24))',
    background: 'transparent',
  },
  list: { flex: 1, overflow: 'auto', padding: '2px 20px 28px', minHeight: 0 },
  card: {
    border: '1px solid light-dark(rgba(0,0,0,.12), rgba(255,255,255,.14))',
    borderRadius: 10, padding: '12px 14px', marginBottom: 10,
  },
  cardHead: { display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' },
  name: { fontSize: 14, fontWeight: 650 },
  npm: { fontSize: 11, color: 'light-dark(#6b7280, #9aa0a6)', fontFamily: 'ui-monospace, monospace' },
  meta: { marginLeft: 'auto', fontSize: 12, color: 'light-dark(#6b7280, #9aa0a6)', whiteSpace: 'nowrap' },
  desc: { fontSize: 13, lineHeight: 1.55, marginTop: 6, color: 'light-dark(#374151, #c5c9cf)' },
  cardFoot: { display: 'flex', gap: 6, marginTop: 8, alignItems: 'center', flexWrap: 'wrap' },
  pill: {
    fontSize: 11, padding: '2px 8px', borderRadius: 999,
    border: '1px solid light-dark(rgba(0,0,0,.14), rgba(255,255,255,.18))',
    color: 'light-dark(#6b7280, #9aa0a6)',
  },
  spacer: { marginLeft: 'auto' },
  cmd: {
    display: 'block', marginTop: 8, fontSize: 11, fontFamily: 'ui-monospace, monospace',
    padding: '6px 8px', borderRadius: 6,
    background: 'light-dark(rgba(0,0,0,.05), rgba(255,255,255,.07))',
    overflowWrap: 'anywhere',
  },
  copyBtn: {
    cursor: 'pointer', font: 'inherit', fontSize: 12, padding: '4px 10px', borderRadius: 8,
    border: '1px solid light-dark(rgba(0,0,0,.18), rgba(255,255,255,.24))',
    background: 'transparent', color: 'inherit',
  },
  moreBtn: {
    display: 'block', margin: '14px auto 4px', cursor: 'pointer', font: 'inherit', fontSize: 13,
    padding: '8px 18px', borderRadius: 8,
    border: '1px solid light-dark(rgba(0,0,0,.18), rgba(255,255,255,.24))',
    background: 'transparent', color: 'inherit',
  },
  note: { padding: '24px 20px', fontSize: 13, color: 'light-dark(#6b7280, #9aa0a6)' },
  sentinel: { textAlign: 'center', padding: '14px 0 6px', fontSize: 12, color: 'light-dark(#9aa0a6, #6b7280)' },
  retry: { marginLeft: 10, cursor: 'pointer', font: 'inherit', fontSize: 13, padding: '4px 12px', borderRadius: 8, border: '1px solid currentColor', background: 'transparent', color: 'inherit' },
}

function PluginCard({ plugin, zh }) {
  const [copied, setCopied] = useState(false)
  const d = plugin.description
  const desc = typeof d === 'string' ? d : d?.[zh ? 'zh' : 'en'] ?? d?.en ?? ''
  const onCopy = async () => {
    if (!plugin.install) return
    const ok = await copyText(plugin.install)
    if (!ok) return
    setCopied(true)
    setTimeout(() => setCopied(false), 1400)
  }
  return h('div', { style: s.card },
    h('div', { style: s.cardHead },
      h('span', { style: s.name }, plugin.name),
      plugin.npm ? h('span', { style: s.npm }, plugin.npm) : null,
      h('span', { style: s.meta }, `★ ${formatCount(plugin.stars)} · ↓ ${formatCount(plugin.downloads)}${plugin.added ? ` · ${plugin.added}` : ''}`),
    ),
    desc ? h('div', { style: s.desc }, desc) : null,
    h('div', { style: s.cardFoot },
      plugin.install
        ? h('button', { style: s.copyBtn, onClick: onCopy }, copied ? '已复制 ✓' : '复制安装命令')
        : h('span', { style: s.pill }, '无安装命令'),
      plugin.url ? h('a', { href: plugin.url, target: '_blank', rel: 'noreferrer', style: { ...s.pill, color: 'inherit' } }, 'GitHub ↗') : null,
    ),
    plugin.install ? h('code', { style: s.cmd }, plugin.install) : null,
  )
}

export function MarketPage({ onClose } = {}) {
  const zh = useMemo(detectZh, [])
  const [state, setState] = useState({ status: 'loading', feed: null, error: null })
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('all')
  const [sort, setSort] = useState('hot')
  const [visible, setVisible] = useState(PAGE_SIZE)
  const sentinelRef = useRef(null)

  const load = (force = false) => {
    setState((prev) => ({ ...prev, status: 'loading', error: null }))
    loadFeed({ force })
      .then(({ feed }) => setState({ status: 'ready', feed, error: null }))
      .catch((err) => setState((prev) => ({ ...prev, status: 'error', error: err?.message ?? String(err) })))
  }
  useEffect(() => { load(false) }, [])

  const plugins = state.feed?.plugins ?? []
  const categories = state.feed?.categories ?? {}

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase()
    let rows = plugins.filter((p) => {
      if (category !== 'all') {
        const cats = Array.isArray(p.category) ? p.category : [p.category]
        if (!cats.includes(category)) return false
      }
      if (!needle) return true
      const d = p.description
      const text = [p.name, p.npm, typeof d === 'string' ? d : d?.en, d?.zh]
        .filter(Boolean).join(' ').toLowerCase()
      return text.includes(needle)
    })
    rows = rows.slice().sort((a, b) => {
      if (sort === 'new') return String(b.added ?? '').localeCompare(String(a.added ?? ''))
      if (sort === 'downloads') return (b.downloads ?? 0) - (a.downloads ?? 0)
      return (b.stars ?? 0) - (a.stars ?? 0)
    })
    return rows
  }, [plugins, search, category, sort])

  // Reset the render window whenever the filter changes.
  useEffect(() => { setVisible(PAGE_SIZE) }, [search, category, sort])

  // Infinite scroll: when the sentinel nears the viewport bottom, grow the
  // render window by one page. IntersectionObserver avoids scroll-event
  // spam entirely; the click button stays as the fallback for hosts without it.
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return undefined
    const el = sentinelRef.current
    if (!el || filtered.length <= visible) return undefined
    const io = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        setVisible((v) => Math.min(v + PAGE_SIZE, filtered.length))
      }
    }, { rootMargin: '200px' })
    io.observe(el)
    return () => io.disconnect()
  }, [filtered.length, visible])

  const catLabel = (id) => {
    const c = categories[id]
    if (!c) return id
    return zh ? c.zh ?? c.en ?? id : c.en ?? c.zh ?? id
  }

  return h('div', { style: s.page },
    h('div', { style: s.header },
      h('h1', { style: s.title }, '插件市场'),
      state.status === 'ready'
        ? h('span', { style: s.count }, `${filtered.length} / ${plugins.length} 个插件 · 数据更新于 ${state.feed?.updated ?? '未知'}`)
        : null,
      onClose ? h('button', { style: s.close, onClick: onClose, title: '关闭 (Esc)' }, '关闭 ✕') : null,
    ),
    h('div', { style: s.toolbar },
      h('input', {
        style: s.input, value: search, placeholder: '搜索插件（名称 / 描述）…',
        onChange: (e) => setSearch(e.target.value),
      }),
      h('select', { style: s.select, value: category, onChange: (e) => setCategory(e.target.value) },
        h('option', { value: 'all' }, '全部分类'),
        Object.keys(categories).map((id) => h('option', { key: id, value: id }, catLabel(id))),
      ),
      h('select', { style: s.select, value: sort, onChange: (e) => setSort(e.target.value) },
        h('option', { value: 'hot' }, '最热（star）'),
        h('option', { value: 'downloads' }, '下载量'),
        h('option', { value: 'new' }, '最新收录'),
      ),
    ),
    h('div', { style: s.list },
      state.status === 'error'
        ? h('div', { style: s.note },
            `目录加载失败：${state.error}`,
            h('button', { style: s.retry, onClick: () => load(true) }, '重试'))
        : state.status === 'loading' && !state.feed
          ? h('div', { style: s.note }, '正在拉取目录（awesome-dsh-plugin.com）…')
          : filtered.length === 0
            ? h('div', { style: s.note }, '没有匹配的插件。')
            : [
                ...filtered.slice(0, visible).map((p) => h(PluginCard, { key: `${p.owner}/${p.name}`, plugin: p, zh })),
                filtered.length > visible
                  ? typeof IntersectionObserver === 'undefined'
                    ? h('button', { key: 'more', style: s.moreBtn, onClick: () => setVisible((v) => v + PAGE_SIZE) },
                        `加载更多（还有 ${filtered.length - visible} 个）`)
                    : h('div', { key: 'sentinel', ref: sentinelRef, style: s.sentinel },
                        `↓ 继续滚动加载（还有 ${filtered.length - visible} 个）`)
                  : null,
              ],
    ),
  )
}
