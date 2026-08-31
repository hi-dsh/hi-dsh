/**
 * The 已安装插件 tab: packages the hi-dsh ledger recorded as installed through
 * this market (GET /hi-dsh/installed). The ledger only adds provenance — the
 * profile's dependency table stays the fact source, so the server answers
 * with ledger ∩ dependencies and a package removed out-of-band (e.g. a
 * terminal `dsh plugin remove`) simply stops appearing here.
 *
 * Uninstall (POST /hi-dsh/uninstall → `dsh plugin remove` on the host):
 * confirm dialog → inline outcome with the pnpm tail; the removal lands in
 * the profile immediately but the running process keeps the old layers until
 * restart, and the dialog says so — no fake instant-unmount.
 */
import { createElement as h, useEffect, useState } from 'react'
import { s } from './styles.js'
import { ConfirmDialog } from './dialog.jsx'

const INSTALLED_URL = '/hi-dsh/installed'
const UNINSTALL_URL = '/hi-dsh/uninstall'

function descriptionText(description, zh) {
  if (typeof description === 'string') return description
  return description?.[zh ? 'zh' : 'en'] ?? description?.en ?? ''
}

function installedDate(iso) {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10)
}

export function InstalledPage() {
  const [zh] = useState(() => (navigator.language || 'zh-CN').toLowerCase().startsWith('zh'))
  const [rows, setRows] = useState(null) // null = not loaded yet
  const [feedReady, setFeedReady] = useState(true)
  const [error, setError] = useState(null)
  const [confirmRow, setConfirmRow] = useState(null)
  const [busyName, setBusyName] = useState(null)
  const [outcome, setOutcome] = useState(null) // { name, ok, message, tails }

  const load = () => {
    setError(null)
    fetch(INSTALLED_URL)
      .then(async (res) => {
        const body = await res.json().catch(() => ({}))
        if (!res.ok || body?.ok !== true) throw new Error(body?.error ?? `HTTP ${res.status}`)
        setRows(Array.isArray(body.plugins) ? body.plugins : [])
        setFeedReady(body.feedReady !== false)
      })
      .catch((err) => setError(err?.message ?? String(err)))
  }
  useEffect(() => { load() }, [])

  const runUninstall = async (row) => {
    setBusyName(row.name)
    setOutcome(null)
    try {
      const res = await fetch(UNINSTALL_URL, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: row.name }),
      })
      const body = await res.json().catch(() => ({}))
      if (res.ok && body?.ok === true) {
        setOutcome({ ok: true, name: row.name, message: `已从 profile 移除 ${row.name}，重启 dsh web 后完全停用`, tails: '' })
        // The server removed the dependency and the ledger entry; drop the row
        // locally. The next tab activation refetches and reconciles anyway.
        setRows((prev) => (prev ?? []).filter((r) => r.name !== row.name))
      } else {
        setOutcome({
          ok: false,
          name: row.name,
          message: body?.error ?? `卸载失败（HTTP ${res.status}）`,
          tails: [body?.stderrTail, body?.stdoutTail].filter(Boolean).join('\n'),
        })
      }
    } catch (err) {
      setOutcome({ ok: false, name: row.name, message: `无法连接卸载服务：${err?.message ?? err}`, tails: '' })
    } finally {
      setBusyName(null)
    }
  }

  if (error !== null) {
    return h('div', { style: s.list },
      h('div', { style: s.note },
        `已安装列表加载失败：${error}`,
        h('button', { style: s.retry, onClick: load }, '重试')))
  }
  if (rows === null) {
    return h('div', { style: s.list }, h('div', { style: s.note }, '正在读取已安装列表…'))
  }
  return h('div', { style: s.list },
    rows.length === 0
      ? h('div', { style: s.note },
          '还没有通过 hi-dsh 安装的插件。',
          h('div', null, '到「插件市场」标签页安装第一个插件，安装成功后会出现在这里。'))
      : [
          !feedReady ? h('div', { key: 'feed-note', style: s.status }, '目录 feed 暂不可用，仅显示本地记录信息。') : null,
          ...rows.map((row) => {
            const d = row.catalog ? descriptionText(row.catalog.description, zh) : ''
            const date = installedDate(row.at)
            const busy = busyName === row.name
            const outcomeHere = outcome?.name === row.name ? outcome : null
            return h('div', { key: row.name, style: s.card },
              h('div', { style: s.cardHead },
                h('span', { style: s.name }, row.catalog?.name ?? row.name),
                h('span', { style: s.npm }, row.name),
                h('span', { style: s.meta }, date ? `安装于 ${date}` : '')),
              d ? h('div', { style: s.desc }, d) : null,
              h('div', { style: s.cardFoot },
                h('span', { style: s.pill }, row.version ? `v${row.version}` : '版本未知'),
                h('span', { style: s.npm }, row.spec ?? ''),
                row.source ? h('a', { href: row.source, target: '_blank', rel: 'noreferrer', style: { ...s.pill, color: 'inherit' } }, 'GitHub ↗') : null,
                h('button', {
                  style: busy ? { ...s.installBtn, opacity: 0.6, cursor: 'default' } : s.installBtn,
                  disabled: busy || busyName !== null,
                  onClick: () => setConfirmRow(row),
                  title: '从当前 dsh profile 移除该插件',
                }, busy ? '卸载中…' : '卸载'),
              ),
              outcomeHere
                ? outcomeHere.ok
                  ? h('div', { style: s.statusOk }, `✓ ${outcomeHere.message}`)
                  : h('div', { style: s.statusErr }, `✕ ${outcomeHere.message}`)
                : null,
              outcomeHere && !outcomeHere.ok && outcomeHere.tails
                ? h('pre', { style: s.tails }, outcomeHere.tails)
                : null,
            )
          }),
        ],
    confirmRow
      ? h(ConfirmDialog, {
          title: '卸载插件',
          name: confirmRow.catalog?.name ?? confirmRow.name,
          source: confirmRow.spec ?? confirmRow.name,
          desc: confirmRow.catalog ? descriptionText(confirmRow.catalog.description, zh) : '',
          note: '将从当前 dsh profile 移除该插件的依赖与层栈记录；当前进程内它仍会运行，重启 dsh web 后完全停用。',
          confirmLabel: '确认卸载',
          onCancel: () => setConfirmRow(null),
          onConfirm: () => { const row = confirmRow; setConfirmRow(null); runUninstall(row) },
        })
      : null,
  )
}
