/**
 * The hi-dsh market page: search / category filter / sort over the shared
 * awesome-dsh-plugin catalog feed. Rendered identically in two seats:
 *   - sidebar-aware overlay panel (opened by the Hi button) — no close button:
 *     clicking anywhere in the host UI (sessions, workspaces, the Hi button
 *     itself) dismisses it; Esc also works
 *   - conversation.view tab ("插件市场") — embedded in the session view ring
 *
 * One-click install (mirrors dsh-market's flow): the card's 安装 button opens
 * a confirm dialog; 确认安装 POSTs to /hi-dsh/install, which forwards to
 * `dsh plugin add` on the host and hot-mounts the result. The card then
 * reports the outcome inline — installed-and-live, restart-required, or the
 * failure with the pnpm output tail.
 */
import { createElement as h, useEffect, useMemo, useRef, useState } from 'react'
import { loadFeed } from './feed.js'

const PAGE_SIZE = 30
const INSTALL_URL = '/hi-dsh/install'

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
  installBtn: {
    cursor: 'pointer', font: 'inherit', fontSize: 12, padding: '4px 16px', borderRadius: 8,
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
  status: { marginTop: 6, fontSize: 12, color: 'light-dark(#6b7280, #9aa0a6)' },
  statusOk: { marginTop: 6, fontSize: 12, color: 'light-dark(#15803d, #86efac)' },
  statusErr: { marginTop: 6, fontSize: 12, color: 'light-dark(#b91c1c, #fca5a5)' },
  tails: {
    margin: '6px 0 0', fontSize: 11, lineHeight: 1.5, fontFamily: 'ui-monospace, monospace',
    padding: '8px 10px', borderRadius: 6, maxHeight: 160, overflow: 'auto',
    whiteSpace: 'pre-wrap', overflowWrap: 'anywhere',
    background: 'light-dark(rgba(0,0,0,.05), rgba(255,255,255,.07))',
    color: 'light-dark(#7f1d1d, #fca5a5)',
  },
  overlay: {
    position: 'fixed', inset: 0, zIndex: 1100, display: 'grid', placeItems: 'center',
    background: 'rgba(0,0,0,.35)',
  },
  dialog: {
    width: 'min(480px, calc(100vw - 48px))', maxHeight: 'calc(100vh - 96px)', overflow: 'auto',
    borderRadius: 12, padding: '18px 20px',
    background: 'light-dark(#ffffff, #26282e)', color: 'light-dark(#1f2328, #e8eaed)',
    colorScheme: 'light dark',
    border: '1px solid light-dark(rgba(0,0,0,.12), rgba(255,255,255,.14))',
    boxShadow: '0 18px 48px rgba(0,0,0,.25)',
  },
  dialogTitle: { fontSize: 15, fontWeight: 700, margin: 0 },
  dialogName: { fontSize: 14, fontWeight: 650, marginTop: 10 },
  dialogSource: {
    fontSize: 11, fontFamily: 'ui-monospace, monospace', marginTop: 2,
    color: 'light-dark(#6b7280, #9aa0a6)', overflowWrap: 'anywhere',
  },
  dialogDesc: { fontSize: 13, lineHeight: 1.55, marginTop: 10, color: 'light-dark(#374151, #c5c9cf)' },
  dialogNote: { fontSize: 12, lineHeight: 1.6, marginTop: 10, color: 'light-dark(#6b7280, #9aa0a6)' },
  dialogActions: { display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 },
  ghostBtn: {
    cursor: 'pointer', font: 'inherit', fontSize: 13, padding: '7px 14px', borderRadius: 8,
    border: '1px solid light-dark(rgba(0,0,0,.18), rgba(255,255,255,.24))',
    background: 'transparent', color: 'inherit',
  },
  primaryBtn: {
    cursor: 'pointer', font: 'inherit', fontSize: 13, padding: '7px 16px', borderRadius: 8,
    border: '1px solid light-dark(#2563eb, #7ab0ff)',
    background: 'light-dark(#2563eb, rgba(122,176,255,.25))', color: 'light-dark(#ffffff, #dbe9ff)',
  },
}

/**
 * Install confirm dialog. Esc and a backdrop click cancel; 确认安装 proceeds.
 * Esc is captured at document level so it closes only the dialog — not the
 * market panel underneath (the host overlay listens for the same key) —
 * regardless of where focus sits.
 */
function ConfirmDialog({ plugin, zh, onCancel, onConfirm }) {
  const d = plugin.description
  const desc = typeof d === 'string' ? d : d?.[zh ? 'zh' : 'en'] ?? d?.en ?? ''
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        e.preventDefault()
        onCancel()
      }
    }
    document.addEventListener('keydown', onKey, true)
    return () => document.removeEventListener('keydown', onKey, true)
  }, [onCancel])
  return h('div', {
    style: s.overlay,
    onClick: onCancel,
  },
    h('div', { style: s.dialog, role: 'dialog', 'aria-modal': 'true', onClick: (e) => e.stopPropagation() },
      h('h2', { style: s.dialogTitle }, '安装插件'),
      h('div', { style: s.dialogName }, plugin.name),
      plugin.npm || plugin.url
        ? h('div', { style: s.dialogSource }, plugin.npm ?? plugin.url)
        : null,
      desc ? h('div', { style: s.dialogDesc }, desc) : null,
      h('div', { style: s.dialogNote },
        '将把该插件安装到当前 dsh profile；多数插件安装后立即可用，部分需要重启 dsh web 后生效。'),
      h('div', { style: s.dialogActions },
        h('button', { style: s.ghostBtn, onClick: onCancel }, '取消'),
        h('button', { style: s.primaryBtn, onClick: onConfirm, autoFocus: true }, '确认安装'),
      ),
    ),
  )
}

function PluginCard({ plugin, zh }) {
  // idle → confirm → installing → done | error (error can re-enter confirm)
  const [phase, setPhase] = useState('idle')
  const [outcome, setOutcome] = useState(null)
  const d = plugin.description
  const desc = typeof d === 'string' ? d : d?.[zh ? 'zh' : 'en'] ?? d?.en ?? ''
  const installable = Boolean(plugin.npm || plugin.url)

  const runInstall = async () => {
    setPhase('installing')
    setOutcome(null)
    try {
      const res = await fetch(INSTALL_URL, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ url: plugin.url }),
      })
      const body = await res.json().catch(() => ({}))
      if (res.ok && body?.ok === true) {
        const message = body.already
          ? '该插件已在本 profile 中，未发生变化'
          : body.hot
            ? `已安装并生效：${body.added.join('、')}`
            : `已安装（${body.added.join('、')}），重启 dsh web 后生效${Array.isArray(body.hotReasons) && body.hotReasons.length > 0 ? ` — ${body.hotReasons.join('；')}` : ''}`
        setOutcome({ ok: true, message })
        setPhase('done')
      } else {
        setOutcome({
          ok: false,
          message: body?.error ?? `安装失败（HTTP ${res.status}）`,
          stdoutTail: typeof body?.stdoutTail === 'string' ? body.stdoutTail : '',
          stderrTail: typeof body?.stderrTail === 'string' ? body.stderrTail : '',
        })
        setPhase('error')
      }
    } catch (err) {
      setOutcome({ ok: false, message: `无法连接安装服务：${err?.message ?? err}`, stdoutTail: '', stderrTail: '' })
      setPhase('error')
    }
  }

  const outputTail = outcome ? [outcome.stderrTail, outcome.stdoutTail].filter(Boolean).join('\n') : ''

  return h('div', { style: s.card },
    h('div', { style: s.cardHead },
      h('span', { style: s.name }, plugin.name),
      plugin.npm ? h('span', { style: s.npm }, plugin.npm) : null,
      h('span', { style: s.meta }, `★ ${formatCount(plugin.stars)} · ↓ ${formatCount(plugin.downloads)}${plugin.added ? ` · ${plugin.added}` : ''}`),
    ),
    desc ? h('div', { style: s.desc }, desc) : null,
    h('div', { style: s.cardFoot },
      installable
        ? h('button', {
            style: phase === 'installing' ? { ...s.installBtn, opacity: 0.6, cursor: 'default' } : s.installBtn,
            disabled: phase === 'installing',
            onClick: () => setPhase('confirm'),
            title: '安装到当前 dsh profile',
          }, phase === 'installing' ? '安装中…' : '安装')
        : h('span', { style: s.pill }, '无安装来源'),
      plugin.url ? h('a', { href: plugin.url, target: '_blank', rel: 'noreferrer', style: { ...s.pill, color: 'inherit' } }, 'GitHub ↗') : null,
    ),
    phase === 'installing'
      ? h('div', { style: s.status }, '正在安装（pnpm 可能需要下载依赖，请稍候）…')
      : null,
    phase === 'done' && outcome
      ? h('div', { style: s.statusOk }, `✓ ${outcome.message}`)
      : null,
    phase === 'error' && outcome
      ? h('div', { style: s.statusErr }, `✕ ${outcome.message}`)
      : null,
    phase === 'error' && outcome && outputTail
      ? h('pre', { style: s.tails }, outputTail)
      : null,
    phase === 'confirm'
      ? h(ConfirmDialog, { plugin, zh, onCancel: () => setPhase('idle'), onConfirm: runInstall })
      : null,
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
