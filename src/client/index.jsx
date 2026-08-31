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
import { createElement as h, useEffect, useSyncExternalStore } from 'react'
import { MarketPage } from './MarketPage.jsx'
import { setMarketOpen, subscribeUi, uiState } from './state.js'

export const name = 'hi-dsh'
export const inject = ['slots']

function useMarketOpen() {
  return useSyncExternalStore(subscribeUi, () => uiState.marketOpen)
}

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
  if (typeof document === 'undefined') return
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
  ].join('\n')
  document.head.appendChild(tag)
}

function HiButton(props = {}) {
  const open = () => setMarketOpen(true)
  const shared = {
    className: 'hi-dsh-btn',
    title: '打开 hi-dsh 插件市场', onClick: open, 'aria-label': 'hi-dsh 插件市场',
  }
  // wide = sidebar expanded → a full-width row beside Settings;
  // collapsed → a 36px icon-size control in the rail (same box as search).
  return props.wide
    ? h('button', { ...shared, style: { ...btnBase, width: '100%', height: 36, borderRadius: 8 } }, 'Hi')
    : h('button', { ...shared, style: { ...btnBase, width: 36, height: 36, borderRadius: 8 } }, 'Hi')
}

function MarketOverlay() {
  const open = useMarketOpen()
  useEffect(() => {
    if (!open) return undefined
    const onKey = (e) => {
      if (e.key === 'Escape') setMarketOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])
  if (!open) return null
  return h('div', {
    style: {
      position: 'fixed', inset: 0, zIndex: 2000, display: 'flex', flexDirection: 'column',
      background: 'light-dark(#ffffff, #1f2126)', color: 'light-dark(#1f2328, #e8eaed)',
      colorScheme: 'light dark',
    },
  }, h(MarketPage, { onClose: () => setMarketOpen(false) }))
}

function MarketTab() {
  return h('div', { style: { height: '100%', minHeight: 0, display: 'flex' } },
    h(MarketPage, { embedded: true }))
}

export function apply(ctx) {
  injectButtonStyle()
  // The Hi button (official third-party seat at the sidebar foot).
  ctx.slots.inject('sidebar.footer.action', () => ctx.slots.register(
    { name: 'sidebar.footer.action', id: 'hi-dsh', label: () => 'Hi' },
    (owner) => h(HiButton, owner ?? {}),
  ))
  // Fullscreen market page, opened by Hi (works with or without a session).
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
