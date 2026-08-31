/**
 * hi-dsh client entry (web platform). Registers three additive seats on the
 * host's slot system — nothing here replaces host-owned components:
 *
 *   - `sidebar.footer.action`  the "Hi" button, beside Settings at the
 *     sidebar foot (the official third-party seat; the host renders it as a
 *     36px control in the collapsed 56px rail and a row when expanded)
 *   - `shell.overlay`          the fullscreen market page opened by Hi
 *   - `conversation.view`      a "插件市场" tab in the session view ring,
 *     the same additive mechanism ui-trajectory uses
 *
 * Data comes from https://awesome-dsh-plugin.com/plugins.json, fetched
 * directly by the browser (see feed.js). Build: tsdown.config.js wraps this
 * entry into the window.__ModuleLoader__.load({ id, factory }) bundle.
 */
import { createElement as h, useEffect, useState, useSyncExternalStore } from 'react'
import { MarketPage } from './MarketPage.jsx'
import { setMarketOpen, subscribeUi, uiState } from './state.js'

export const name = 'hi-dsh'
export const inject = ['slots']

function useMarketOpen() {
  return useSyncExternalStore(subscribeUi, () => uiState.marketOpen)
}

/**
 * Locate the sidebar column by walking up from the Hi button: the sidebar is
 * the outermost ancestor that starts near the left edge and stays narrower
 * than 45% of the viewport. Returns null when nothing matches (host DOM
 * changed) — the caller then falls back to fullscreen.
 */
function findSidebarAnchor() {
  const btn = document.querySelector('.hi-dsh-btn')
  let best = null
  let el = btn?.parentElement ?? null
  while (el && el !== document.body) {
    const r = el.getBoundingClientRect()
    if (r.width > 40 && r.width <= window.innerWidth * 0.45 && r.left < 60) best = el
    else if (best) break
    el = el.parentElement
  }
  return best
}

function MarketOverlay() {
  const open = useMarketOpen()
  // Panel geometry: left edge = the sidebar's right edge, kept in sync via
  // ResizeObserver. When the sidebar can't be located we show an error in the
  // panel — no silent fullscreen fallback (mainline code, visible failures).
  const [left, setLeft] = useState(0)
  const [noSidebar, setNoSidebar] = useState(false)
  useEffect(() => {
    if (!open) return undefined
    const onKey = (e) => {
      if (e.key === 'Escape') setMarketOpen(false)
    }
    window.addEventListener('keydown', onKey)
    const anchor = findSidebarAnchor()
    if (!anchor) {
      setNoSidebar(true)
      return () => window.removeEventListener('keydown', onKey)
    }
    setNoSidebar(false)
    const measure = () => setLeft(Math.round(anchor.getBoundingClientRect().right))
    measure()
    // Keep the panel glued to the sidebar through collapse/expand and resize.
    const ro = new ResizeObserver(measure)
    ro.observe(anchor)
    window.addEventListener('resize', measure)
    // Click-outside dismissal (capture phase): any click that is not inside
    // the panel and not on the Hi button belongs to the host UI — session,
    // workspace, settings — so let it act AND take the panel down. Without
    // this, host clicks "work" behind the panel where nobody can see them.
    const onDocClick = (e) => {
      const t = e.target
      if (t.closest('.hi-dsh-market-panel') || t.closest('.hi-dsh-btn')) return
      setMarketOpen(false)
    }
    document.addEventListener('click', onDocClick, true)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('resize', measure)
      document.removeEventListener('click', onDocClick, true)
      ro.disconnect()
    }
  }, [open])
  if (!open) return null
  return h('div', {
    className: 'hi-dsh-market-panel',
    style: {
      position: 'fixed', top: 0, bottom: 0, right: 0, left, zIndex: 1000,
      display: 'flex', flexDirection: 'column',
      background: 'light-dark(#ffffff, #1f2126)', color: 'light-dark(#1f2328, #e8eaed)',
      colorScheme: 'light dark',
      borderLeft: '1px solid light-dark(rgba(0,0,0,.1), rgba(255,255,255,.12))',
    },
  }, noSidebar
    ? h('div', { style: panelErrStyle },
        'hi-dsh：无法定位侧栏（宿主 DOM 已变化），市场面板不可用。请到 github.com/hi-dsh/hi-dsh 提交反馈。')
    : h(MarketPage))
}

const panelErrStyle = { padding: 24, fontSize: 13, lineHeight: 1.7 }

const btnBase = {
  cursor: 'pointer', font: 'inherit', color: 'inherit',
  display: 'grid', placeItems: 'center',
  fontWeight: 700, fontSize: 13, letterSpacing: 0.3, padding: 0, lineHeight: 1,
}

/**
 * The Hi button's visual skin (border, subtle fill, hover/press feedback).
 * Inline styles cannot express :hover/:active, so these rules are injected
 * once into <head> (plugin-owned <style> tag, same pattern dsh-market uses);
 * the inline style keeps only layout (size/shape).
 */
function injectButtonStyle() {
  if (document.getElementById('hi-dsh-btn-style')) return
  const tag = document.createElement('style')
  tag.id = 'hi-dsh-btn-style'
  tag.textContent = [
    '.hi-dsh-btn {',
    '  background: light-dark(rgba(0,0,0,.04), rgba(255,255,255,.07));',
    '  border: 1px solid light-dark(rgba(0,0,0,.22), rgba(255,255,255,.28));',
    '  transition: background .15s ease, border-color .15s ease, transform .06s ease;',
    '}',
    '.hi-dsh-btn:hover {',
    '  background: light-dark(rgba(0,0,0,.09), rgba(255,255,255,.14));',
    '  border-color: light-dark(rgba(0,0,0,.34), rgba(255,255,255,.42));',
    '}',
    '.hi-dsh-btn:active { transform: scale(.95); }',
    '.hi-dsh-btn:focus-visible { outline: 2px solid light-dark(#2563eb, #7ab0ff); outline-offset: 1px; }',
    '.hi-dsh-btn.active {',
    '  background: light-dark(rgba(37,99,235,.14), rgba(122,176,255,.2));',
    '  border-color: light-dark(#2563eb, #7ab0ff);',
    '  color: light-dark(#2563eb, #a8c8ff);',
    '}',
    '.hi-dsh-btn.active:hover {',
    '  background: light-dark(rgba(37,99,235,.2), rgba(122,176,255,.26));',
    '  border-color: light-dark(#2563eb, #7ab0ff);',
    '}',
  ].join('\n')
  document.head.appendChild(tag)
}

function HiButton(props = {}) {
  const open = useMarketOpen()
  // Toggle: while the market panel is open the sidebar stays visible, so a
  // second click closes it.
  const toggle = () => setMarketOpen(!open)
  const shared = {
    className: 'hi-dsh-btn' + (open ? ' active' : ''),
    title: '打开 / 关闭 hi-dsh 插件市场', onClick: toggle, 'aria-label': 'hi-dsh 插件市场',
  }
  // wide = sidebar expanded → a full-width row beside Settings;
  // collapsed → a 36px icon-size control in the rail (same box as search).
  return props.wide
    ? h('button', { ...shared, style: { ...btnBase, width: '100%', height: 36, borderRadius: 8 } }, 'Hi')
    : h('button', { ...shared, style: { ...btnBase, width: 36, height: 36, borderRadius: 8 } }, 'Hi')
}

function MarketTab() {
  return h('div', { style: { height: '100%', minHeight: 0, display: 'flex' } },
    h(MarketPage))
}

export function apply(ctx) {
  injectButtonStyle()
  // The Hi button (official third-party seat at the sidebar foot).
  ctx.slots.inject('sidebar.footer.action', () => ctx.slots.register(
    { name: 'sidebar.footer.action', id: 'hi-dsh', label: () => 'Hi' },
    (owner) => h(HiButton, owner ?? {}),
  ))
  // Market panel, opened by Hi (works with or without a session).
  ctx.slots.inject('shell.overlay', () => ctx.slots.register(
    { name: 'shell.overlay', id: 'hi-dsh-market-overlay', label: () => 'hi-dsh 插件市场' },
    () => h(MarketOverlay),
  ))
  // Additive tab in the session view ring (chat / trajectory / 插件市场).
  ctx.slots.inject('conversation.view', () => ctx.slots.register(
    { name: 'conversation.view', id: 'hi-dsh-market', label: () => '插件市场' },
    () => h(MarketTab),
  ))
}
