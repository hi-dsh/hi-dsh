/**
 * The hi-dsh page, rendered identically in two seats — the sidebar-aware
 * overlay panel (opened by the Hi button) and the conversation.view tab —
 * with two tabs:
 *   - 插件市场   search / category filter / sort over the shared
 *     awesome-dsh-plugin catalog feed; one-click install (mirrors dsh-market's
 *     flow: 安装 → confirm → POST /hi-dsh/install → `dsh plugin add` +
 *     hot-mount, outcome reported inline)
 *   - 已安装插件  packages the ledger recorded as installed through this
 *     market, with uninstall (see InstalledPage)
 */
import { createElement as h, useEffect, useMemo, useRef, useState } from 'react'
import { loadFeed } from './feed.js'
import { s } from './styles.js'
import { ConfirmDialog } from './dialog.jsx'
import { InstalledPage } from './InstalledPage.jsx'
import { AccountButton } from './AccountButton.jsx'

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

/**
 * Install confirm dialog. Esc and a backdrop click cancel; 确认安装 proceeds.
 */
function ConfirmInstallDialog({ plugin, zh, onCancel, onConfirm }) {
  const d = plugin.description
  const desc = typeof d === 'string' ? d : d?.[zh ? 'zh' : 'en'] ?? d?.en ?? ''
  return h(ConfirmDialog, {
    title: '安装插件',
    name: plugin.name,
    source: plugin.npm || plugin.url ? (plugin.npm ?? plugin.url) : '',
    desc,
    note: '将把该插件安装到当前 dsh profile；多数插件安装后立即可用，部分需要重启 dsh web 后生效。',
    confirmLabel: '确认安装',
    onCancel,
    onConfirm,
  })
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
        const ledgerNote = body.ledgerError ? ` — 注意：${body.ledgerError}` : ''
        const message = body.already
          ? '该插件已在本 profile 中，未发生变化'
          : body.hot
            ? `已安装并生效：${body.added.join('、')}${ledgerNote}`
            : `已安装（${body.added.join('、')}），重启 dsh web 后生效${Array.isArray(body.hotReasons) && body.hotReasons.length > 0 ? ` — ${body.hotReasons.join('；')}` : ''}${ledgerNote}`
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
      ? h(ConfirmInstallDialog, { plugin, zh, onCancel: () => setPhase('idle'), onConfirm: runInstall })
      : null,
  )
}

export function MarketPage({ onClose } = {}) {
  const zh = useMemo(detectZh, [])
  const [tab, setTab] = useState('market')
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
      h('div', { style: s.tabs },
        h('button', { style: tab === 'market' ? s.tabBtnActive : s.tabBtn, onClick: () => setTab('market') }, '插件市场'),
        h('button', { style: tab === 'installed' ? s.tabBtnActive : s.tabBtn, onClick: () => setTab('installed') }, '已安装插件'),
      ),
      tab === 'market' && state.status === 'ready'
        ? h('span', { style: s.count }, `${filtered.length} / ${plugins.length} 个插件 · 数据更新于 ${state.feed?.updated ?? '未知'}`)
        : null,
      h(AccountButton),
      onClose ? h('button', { style: s.close, onClick: onClose, title: '关闭 (Esc)' }, '关闭 ✕') : null,
    ),
    tab === 'installed'
      ? h(InstalledPage)
      : [
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
        ],
  )
}
