// 市场页头部右上角的账号入口,两个座位(悬浮面板 / 会话标签页)共用:
//   未登录 → 人形图标,点开是平台选择(当前只有 GitHub;Gitee 占位)
//   已登录 → GitHub 头像,点开是账号信息 + 退出登录
//   异常   → 图标不变,弹层内显式报错 + 重试(不做静默降级)
// 登录态来自 auth.js(localStorage token + hi-dsh-server)。
import { createElement as h, useEffect, useState, useSyncExternalStore } from 'react'
import { authState, subscribeAuth, initAuth, ensureAuthListener, startLogin, logout } from './auth.js'
import { s } from './styles.js'

function useAuth() {
  return useSyncExternalStore(subscribeAuth, () => authState)
}

// 本仓库不引图标库,自绘内联 SVG(人形:feather user;GitHub:官方 mark path)。
const PERSON_ICON = h('svg', {
  width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor',
  strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true,
},
  h('path', { d: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2' }),
  h('circle', { cx: 12, cy: 7, r: 4 }))

const GITHUB_ICON = h('svg', {
  width: 16, height: 16, viewBox: '0 0 24 24', fill: 'currentColor', 'aria-hidden': true,
},
  h('path', { d: 'M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12' }))

function avatarImg(url, style) {
  // GitHub 头像带 referrer 会偶发 403,与卡片里 GitHub ↗ 链接同一处理
  return h('img', { src: url, style, alt: '', referrerPolicy: 'no-referrer' })
}

function popoverBody(auth, close) {
  if (auth.phase === 'loading') {
    return h('div', { style: s.accountNote }, '正在查询登录状态…')
  }
  if (auth.phase === 'error') {
    return [
      h('div', { key: 't', style: s.accountPopTitle }, '账号服务异常'),
      h('div', { key: 'e', style: s.accountError }, auth.error),
      h('button', { key: 'r', style: s.retry, onClick: () => initAuth() }, '重试'),
    ]
  }
  if (auth.phase === 'login') {
    return h('div', { style: s.accountNote }, '正在打开 GitHub 授权窗口…完成授权后本页自动更新。')
  }
  if (auth.phase === 'in') {
    const u = auth.user
    return [
      h('div', { key: 't', style: s.accountPopTitle }, '已登录'),
      h('div', { key: 'u', style: s.accountUser },
        u.avatar_url ? avatarImg(u.avatar_url, s.accountAvatarLg) : null,
        h('div', { style: { minWidth: 0 } },
          h('div', { style: s.accountName }, u.display_name),
          h('div', { style: s.accountMeta },
            `${(u.providers ?? []).join(' / ')}${u.email ? ` · ${u.email}` : ''}`))),
      h('button', {
        key: 'o', style: s.accountRowBtn, onClick: () => { close(); logout() },
      }, '退出登录'),
    ]
  }
  // out:平台选择。Gitee 按用户要求预留占位,服务端与客户端后续各加一段即可。
  return [
    h('div', { key: 't', style: s.accountPopTitle }, '选择登录方式'),
    h('button', {
      key: 'gh', style: s.accountRowBtn, onClick: () => startLogin(),
      title: '通过 GitHub OAuth 登录 hi-dsh 账号',
    }, GITHUB_ICON, h('span', null, '使用 GitHub 登录')),
    h('div', { key: 'ge', style: s.accountRowDisabled },
      h('span', null, 'Gitee 登录'), h('span', { style: s.accountBadge }, '即将支持')),
  ]
}

export function AccountButton() {
  const auth = useAuth()
  const [open, setOpen] = useState(false)
  useEffect(() => {
    ensureAuthListener()
    if (auth.phase === 'loading') initAuth()
    // eslint 注释无关紧要:依赖为空,只在挂载时执行一次
  }, [])
  // 点外部 / Esc 关闭。Esc 在捕获阶段只关弹层、不波及市场面板(同 dialog.jsx 的做法)。
  useEffect(() => {
    if (!open) return undefined
    const onDocClick = (e) => {
      if (!e.target.closest('.hi-dsh-account')) setOpen(false)
    }
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        e.preventDefault()
        setOpen(false)
      }
    }
    document.addEventListener('click', onDocClick, true)
    document.addEventListener('keydown', onKey, true)
    return () => {
      document.removeEventListener('click', onDocClick, true)
      document.removeEventListener('keydown', onKey, true)
    }
  }, [open])

  const icon = auth.phase === 'in' && auth.user?.avatar_url
    ? avatarImg(auth.user.avatar_url, s.accountAvatar)
    : PERSON_ICON

  return h('div', { className: 'hi-dsh-account', style: s.accountWrap },
    h('button', {
      style: s.accountBtn, onClick: () => setOpen(!open), 'aria-expanded': open,
      'aria-label': 'hi-dsh 账号',
      title: auth.phase === 'in' ? `已登录:${auth.user?.display_name ?? ''}` : '登录 hi-dsh 账号',
    }, icon),
    open ? h('div', { style: s.accountPop, role: 'menu' }, popoverBody(auth, () => setOpen(false))) : null,
  )
}
