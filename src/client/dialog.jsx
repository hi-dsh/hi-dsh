// Shared confirm dialog for the market's mutating actions (install, uninstall).
// Esc and a backdrop click cancel; Esc is captured at document level so it
// closes only the dialog — not the market panel underneath (the host overlay
// listens for the same key) — regardless of where focus sits.
import { createElement as h, useEffect } from 'react'
import { s } from './styles.js'

export function ConfirmDialog({ title, name, source, desc, note, confirmLabel, onCancel, onConfirm }) {
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
      h('h2', { style: s.dialogTitle }, title),
      h('div', { style: s.dialogName }, name),
      source ? h('div', { style: s.dialogSource }, source) : null,
      desc ? h('div', { style: s.dialogDesc }, desc) : null,
      note ? h('div', { style: s.dialogNote }, note) : null,
      h('div', { style: s.dialogActions },
        h('button', { style: s.ghostBtn, onClick: onCancel }, '取消'),
        h('button', { style: s.primaryBtn, onClick: onConfirm, autoFocus: true }, confirmLabel),
      ),
    ),
  )
}
