window.__ModuleLoader__.load({
	id: "hi-dsh",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react = require("react");
		//#region src/client/feed.js
		const FEED_URL = "https://awesome-dsh-plugin.com/plugins.json";
		let cache = null;
		let inflight = null;
		function loadFeed({ force = false } = {}) {
			if (!force && cache) return Promise.resolve(cache);
			if (inflight) return inflight;
			inflight = fetch(FEED_URL).then((res) => {
				if (!res.ok) throw new Error(`HTTP ${res.status}`);
				return res.json();
			}).then((feed) => {
				if (!feed || !Array.isArray(feed.plugins)) throw new Error("目录格式不符合预期");
				cache = {
					feed,
					fetchedAt: /* @__PURE__ */ new Date()
				};
				return cache;
			}).catch((err) => {
				inflight = null;
				throw err;
			}).finally(() => {
				inflight = null;
			});
			return inflight;
		}
		//#endregion
		//#region src/client/styles.js
		const s = {
			page: {
				display: "flex",
				flexDirection: "column",
				height: "100%",
				minHeight: 0,
				colorScheme: "light dark",
				font: "inherit"
			},
			header: {
				display: "flex",
				alignItems: "center",
				gap: 10,
				padding: "12px 20px",
				borderBottom: "1px solid light-dark(rgba(0,0,0,.1), rgba(255,255,255,.12))"
			},
			tabs: {
				display: "flex",
				gap: 16,
				alignItems: "baseline"
			},
			tabBtn: {
				cursor: "pointer",
				font: "inherit",
				fontSize: 15,
				fontWeight: 600,
				lineHeight: 1.4,
				padding: "2px 2px 6px",
				border: "none",
				borderBottom: "2px solid transparent",
				background: "transparent",
				color: "light-dark(#6b7280, #9aa0a6)"
			},
			tabBtnActive: {
				cursor: "pointer",
				font: "inherit",
				fontSize: 15,
				fontWeight: 700,
				lineHeight: 1.4,
				padding: "2px 2px 6px",
				border: "none",
				borderBottom: "2px solid light-dark(#2563eb, #7ab0ff)",
				background: "transparent",
				color: "inherit"
			},
			count: {
				fontSize: 12,
				color: "light-dark(#6b7280, #9aa0a6)"
			},
			close: {
				marginLeft: "auto",
				cursor: "pointer",
				font: "inherit",
				fontSize: 13,
				lineHeight: 1,
				padding: "6px 10px",
				borderRadius: 8,
				border: "1px solid light-dark(rgba(0,0,0,.15), rgba(255,255,255,.2))",
				background: "transparent",
				color: "inherit"
			},
			toolbar: {
				display: "flex",
				gap: 8,
				padding: "10px 20px",
				flexWrap: "wrap",
				alignItems: "center"
			},
			input: {
				flex: "1 1 220px",
				font: "inherit",
				fontSize: 13,
				color: "inherit",
				padding: "7px 10px",
				borderRadius: 8,
				border: "1px solid light-dark(rgba(0,0,0,.18), rgba(255,255,255,.24))",
				background: "transparent",
				outline: "none"
			},
			select: {
				font: "inherit",
				fontSize: 13,
				color: "inherit",
				padding: "7px 8px",
				borderRadius: 8,
				border: "1px solid light-dark(rgba(0,0,0,.18), rgba(255,255,255,.24))",
				background: "transparent"
			},
			list: {
				flex: 1,
				overflow: "auto",
				padding: "2px 20px 28px",
				minHeight: 0
			},
			card: {
				border: "1px solid light-dark(rgba(0,0,0,.12), rgba(255,255,255,.14))",
				borderRadius: 10,
				padding: "12px 14px",
				marginBottom: 10
			},
			cardHead: {
				display: "flex",
				alignItems: "baseline",
				gap: 10,
				flexWrap: "wrap"
			},
			name: {
				fontSize: 14,
				fontWeight: 650
			},
			npm: {
				fontSize: 11,
				color: "light-dark(#6b7280, #9aa0a6)",
				fontFamily: "ui-monospace, monospace"
			},
			meta: {
				marginLeft: "auto",
				fontSize: 12,
				color: "light-dark(#6b7280, #9aa0a6)",
				whiteSpace: "nowrap"
			},
			desc: {
				fontSize: 13,
				lineHeight: 1.55,
				marginTop: 6,
				color: "light-dark(#374151, #c5c9cf)"
			},
			cardFoot: {
				display: "flex",
				gap: 6,
				marginTop: 8,
				alignItems: "center",
				flexWrap: "wrap"
			},
			pill: {
				fontSize: 11,
				padding: "2px 8px",
				borderRadius: 999,
				border: "1px solid light-dark(rgba(0,0,0,.14), rgba(255,255,255,.18))",
				color: "light-dark(#6b7280, #9aa0a6)"
			},
			installBtn: {
				cursor: "pointer",
				font: "inherit",
				fontSize: 12,
				padding: "4px 16px",
				borderRadius: 8,
				border: "1px solid light-dark(rgba(0,0,0,.18), rgba(255,255,255,.24))",
				background: "transparent",
				color: "inherit"
			},
			moreBtn: {
				display: "block",
				margin: "14px auto 4px",
				cursor: "pointer",
				font: "inherit",
				fontSize: 13,
				padding: "8px 18px",
				borderRadius: 8,
				border: "1px solid light-dark(rgba(0,0,0,.18), rgba(255,255,255,.24))",
				background: "transparent",
				color: "inherit"
			},
			note: {
				padding: "24px 20px",
				fontSize: 13,
				color: "light-dark(#6b7280, #9aa0a6)",
				lineHeight: 1.7
			},
			sentinel: {
				textAlign: "center",
				padding: "14px 0 6px",
				fontSize: 12,
				color: "light-dark(#9aa0a6, #6b7280)"
			},
			retry: {
				marginLeft: 10,
				cursor: "pointer",
				font: "inherit",
				fontSize: 13,
				padding: "4px 12px",
				borderRadius: 8,
				border: "1px solid currentColor",
				background: "transparent",
				color: "inherit"
			},
			status: {
				marginTop: 6,
				fontSize: 12,
				color: "light-dark(#6b7280, #9aa0a6)"
			},
			statusOk: {
				marginTop: 6,
				fontSize: 12,
				color: "light-dark(#15803d, #86efac)"
			},
			statusErr: {
				marginTop: 6,
				fontSize: 12,
				color: "light-dark(#b91c1c, #fca5a5)"
			},
			tails: {
				margin: "6px 0 0",
				fontSize: 11,
				lineHeight: 1.5,
				fontFamily: "ui-monospace, monospace",
				padding: "8px 10px",
				borderRadius: 6,
				maxHeight: 160,
				overflow: "auto",
				whiteSpace: "pre-wrap",
				overflowWrap: "anywhere",
				background: "light-dark(rgba(0,0,0,.05), rgba(255,255,255,.07))",
				color: "light-dark(#7f1d1d, #fca5a5)"
			},
			overlay: {
				position: "fixed",
				inset: 0,
				zIndex: 1100,
				display: "grid",
				placeItems: "center",
				background: "rgba(0,0,0,.35)"
			},
			dialog: {
				width: "min(480px, calc(100vw - 48px))",
				maxHeight: "calc(100vh - 96px)",
				overflow: "auto",
				borderRadius: 12,
				padding: "18px 20px",
				background: "light-dark(#ffffff, #26282e)",
				color: "light-dark(#1f2328, #e8eaed)",
				colorScheme: "light dark",
				border: "1px solid light-dark(rgba(0,0,0,.12), rgba(255,255,255,.14))",
				boxShadow: "0 18px 48px rgba(0,0,0,.25)"
			},
			dialogTitle: {
				fontSize: 15,
				fontWeight: 700,
				margin: 0
			},
			dialogName: {
				fontSize: 14,
				fontWeight: 650,
				marginTop: 10
			},
			dialogSource: {
				fontSize: 11,
				fontFamily: "ui-monospace, monospace",
				marginTop: 2,
				color: "light-dark(#6b7280, #9aa0a6)",
				overflowWrap: "anywhere"
			},
			dialogDesc: {
				fontSize: 13,
				lineHeight: 1.55,
				marginTop: 10,
				color: "light-dark(#374151, #c5c9cf)"
			},
			dialogNote: {
				fontSize: 12,
				lineHeight: 1.6,
				marginTop: 10,
				color: "light-dark(#6b7280, #9aa0a6)"
			},
			dialogActions: {
				display: "flex",
				justifyContent: "flex-end",
				gap: 8,
				marginTop: 16
			},
			ghostBtn: {
				cursor: "pointer",
				font: "inherit",
				fontSize: 13,
				padding: "7px 14px",
				borderRadius: 8,
				border: "1px solid light-dark(rgba(0,0,0,.18), rgba(255,255,255,.24))",
				background: "transparent",
				color: "inherit"
			},
			primaryBtn: {
				cursor: "pointer",
				font: "inherit",
				fontSize: 13,
				padding: "7px 16px",
				borderRadius: 8,
				border: "1px solid light-dark(#2563eb, #7ab0ff)",
				background: "light-dark(#2563eb, rgba(122,176,255,.25))",
				color: "light-dark(#ffffff, #dbe9ff)"
			},
			accountWrap: { position: "relative" },
			accountBtn: {
				cursor: "pointer",
				font: "inherit",
				color: "inherit",
				display: "grid",
				placeItems: "center",
				padding: 5,
				borderRadius: 8,
				lineHeight: 0,
				border: "1px solid light-dark(rgba(0,0,0,.15), rgba(255,255,255,.2))",
				background: "transparent"
			},
			accountAvatar: {
				width: 20,
				height: 20,
				borderRadius: "50%",
				display: "block"
			},
			accountPop: {
				position: "absolute",
				right: 0,
				top: "calc(100% + 8px)",
				width: 270,
				zIndex: 1200,
				padding: 12,
				borderRadius: 10,
				fontSize: 13,
				background: "light-dark(#ffffff, #26282e)",
				color: "light-dark(#1f2328, #e8eaed)",
				border: "1px solid light-dark(rgba(0,0,0,.12), rgba(255,255,255,.14))",
				boxShadow: "0 12px 32px rgba(0,0,0,.2)"
			},
			accountPopTitle: {
				fontSize: 12,
				fontWeight: 700,
				color: "light-dark(#6b7280, #9aa0a6)",
				margin: "0 0 8px"
			},
			accountRowBtn: {
				cursor: "pointer",
				font: "inherit",
				fontSize: 13,
				color: "inherit",
				width: "100%",
				display: "flex",
				alignItems: "center",
				gap: 8,
				padding: "8px 10px",
				borderRadius: 8,
				border: "1px solid light-dark(rgba(0,0,0,.15), rgba(255,255,255,.2))",
				background: "transparent",
				textAlign: "left"
			},
			accountRowDisabled: {
				font: "inherit",
				fontSize: 13,
				color: "light-dark(#9aa0a6, #6b7280)",
				width: "100%",
				display: "flex",
				alignItems: "center",
				gap: 8,
				padding: "8px 10px",
				borderRadius: 8,
				border: "1px dashed light-dark(rgba(0,0,0,.15), rgba(255,255,255,.2))",
				marginTop: 8
			},
			accountBadge: {
				marginLeft: "auto",
				fontSize: 11,
				padding: "1px 8px",
				borderRadius: 999,
				border: "1px solid light-dark(rgba(0,0,0,.14), rgba(255,255,255,.18))"
			},
			accountUser: {
				display: "flex",
				alignItems: "center",
				gap: 10,
				marginBottom: 10
			},
			accountAvatarLg: {
				width: 36,
				height: 36,
				borderRadius: "50%",
				flexShrink: 0
			},
			accountName: {
				fontSize: 14,
				fontWeight: 650
			},
			accountMeta: {
				fontSize: 12,
				color: "light-dark(#6b7280, #9aa0a6)",
				marginTop: 2,
				overflowWrap: "anywhere"
			},
			accountNote: {
				fontSize: 13,
				color: "light-dark(#6b7280, #9aa0a6)",
				padding: "4px 0"
			},
			accountError: {
				fontSize: 12,
				lineHeight: 1.6,
				color: "light-dark(#b91c1c, #fca5a5)",
				margin: "0 0 10px"
			}
		};
		//#endregion
		//#region src/client/dialog.jsx
		function ConfirmDialog({ title, name, source, desc, note, confirmLabel, onCancel, onConfirm }) {
			(0, react.useEffect)(() => {
				const onKey = (e) => {
					if (e.key === "Escape") {
						e.stopPropagation();
						e.preventDefault();
						onCancel();
					}
				};
				document.addEventListener("keydown", onKey, true);
				return () => document.removeEventListener("keydown", onKey, true);
			}, [onCancel]);
			return (0, react.createElement)("div", {
				style: s.overlay,
				onClick: onCancel
			}, (0, react.createElement)("div", {
				style: s.dialog,
				role: "dialog",
				"aria-modal": "true",
				onClick: (e) => e.stopPropagation()
			}, (0, react.createElement)("h2", { style: s.dialogTitle }, title), (0, react.createElement)("div", { style: s.dialogName }, name), source ? (0, react.createElement)("div", { style: s.dialogSource }, source) : null, desc ? (0, react.createElement)("div", { style: s.dialogDesc }, desc) : null, note ? (0, react.createElement)("div", { style: s.dialogNote }, note) : null, (0, react.createElement)("div", { style: s.dialogActions }, (0, react.createElement)("button", {
				style: s.ghostBtn,
				onClick: onCancel
			}, "取消"), (0, react.createElement)("button", {
				style: s.primaryBtn,
				onClick: onConfirm,
				autoFocus: true
			}, confirmLabel))));
		}
		//#endregion
		//#region src/client/InstalledPage.jsx
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
		const INSTALLED_URL = "/hi-dsh/installed";
		const UNINSTALL_URL = "/hi-dsh/uninstall";
		function descriptionText(description, zh) {
			if (typeof description === "string") return description;
			return description?.[zh ? "zh" : "en"] ?? description?.en ?? "";
		}
		function installedDate(iso) {
			const d = new Date(iso);
			return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
		}
		function InstalledPage() {
			const [zh] = (0, react.useState)(() => (navigator.language || "zh-CN").toLowerCase().startsWith("zh"));
			const [rows, setRows] = (0, react.useState)(null);
			const [feedReady, setFeedReady] = (0, react.useState)(true);
			const [error, setError] = (0, react.useState)(null);
			const [confirmRow, setConfirmRow] = (0, react.useState)(null);
			const [busyName, setBusyName] = (0, react.useState)(null);
			const [outcome, setOutcome] = (0, react.useState)(null);
			const load = () => {
				setError(null);
				fetch(INSTALLED_URL).then(async (res) => {
					const body = await res.json().catch(() => ({}));
					if (!res.ok || body?.ok !== true) throw new Error(body?.error ?? `HTTP ${res.status}`);
					setRows(Array.isArray(body.plugins) ? body.plugins : []);
					setFeedReady(body.feedReady !== false);
				}).catch((err) => setError(err?.message ?? String(err)));
			};
			(0, react.useEffect)(() => {
				load();
			}, []);
			const runUninstall = async (row) => {
				setBusyName(row.name);
				setOutcome(null);
				try {
					const res = await fetch(UNINSTALL_URL, {
						method: "POST",
						headers: { "content-type": "application/json" },
						body: JSON.stringify({ name: row.name })
					});
					const body = await res.json().catch(() => ({}));
					if (res.ok && body?.ok === true) {
						setOutcome({
							ok: true,
							name: row.name,
							message: `已从 profile 移除 ${row.name}，重启 dsh web 后完全停用`,
							tails: ""
						});
						setRows((prev) => (prev ?? []).filter((r) => r.name !== row.name));
					} else setOutcome({
						ok: false,
						name: row.name,
						message: body?.error ?? `卸载失败（HTTP ${res.status}）`,
						tails: [body?.stderrTail, body?.stdoutTail].filter(Boolean).join("\n")
					});
				} catch (err) {
					setOutcome({
						ok: false,
						name: row.name,
						message: `无法连接卸载服务：${err?.message ?? err}`,
						tails: ""
					});
				} finally {
					setBusyName(null);
				}
			};
			if (error !== null) return (0, react.createElement)("div", { style: s.list }, (0, react.createElement)("div", { style: s.note }, `已安装列表加载失败：${error}`, (0, react.createElement)("button", {
				style: s.retry,
				onClick: load
			}, "重试")));
			if (rows === null) return (0, react.createElement)("div", { style: s.list }, (0, react.createElement)("div", { style: s.note }, "正在读取已安装列表…"));
			return (0, react.createElement)("div", { style: s.list }, rows.length === 0 ? (0, react.createElement)("div", { style: s.note }, "还没有通过 hi-dsh 安装的插件。", (0, react.createElement)("div", null, "到「插件市场」标签页安装第一个插件，安装成功后会出现在这里。")) : [!feedReady ? (0, react.createElement)("div", {
				key: "feed-note",
				style: s.status
			}, "目录 feed 暂不可用，仅显示本地记录信息。") : null, ...rows.map((row) => {
				const d = row.catalog ? descriptionText(row.catalog.description, zh) : "";
				const date = installedDate(row.at);
				const busy = busyName === row.name;
				const outcomeHere = outcome?.name === row.name ? outcome : null;
				return (0, react.createElement)("div", {
					key: row.name,
					style: s.card
				}, (0, react.createElement)("div", { style: s.cardHead }, (0, react.createElement)("span", { style: s.name }, row.catalog?.name ?? row.name), (0, react.createElement)("span", { style: s.npm }, row.name), (0, react.createElement)("span", { style: s.meta }, date ? `安装于 ${date}` : "")), d ? (0, react.createElement)("div", { style: s.desc }, d) : null, (0, react.createElement)("div", { style: s.cardFoot }, (0, react.createElement)("span", { style: s.pill }, row.version ? `v${row.version}` : "版本未知"), (0, react.createElement)("span", { style: s.npm }, row.spec ?? ""), row.source ? (0, react.createElement)("a", {
					href: row.source,
					target: "_blank",
					rel: "noreferrer",
					style: {
						...s.pill,
						color: "inherit"
					}
				}, "GitHub ↗") : null, (0, react.createElement)("button", {
					style: busy ? {
						...s.installBtn,
						opacity: .6,
						cursor: "default"
					} : s.installBtn,
					disabled: busy || busyName !== null,
					onClick: () => setConfirmRow(row),
					title: "从当前 dsh profile 移除该插件"
				}, busy ? "卸载中…" : "卸载")), outcomeHere ? outcomeHere.ok ? (0, react.createElement)("div", { style: s.statusOk }, `✓ ${outcomeHere.message}`) : (0, react.createElement)("div", { style: s.statusErr }, `✕ ${outcomeHere.message}`) : null, outcomeHere && !outcomeHere.ok && outcomeHere.tails ? (0, react.createElement)("pre", { style: s.tails }, outcomeHere.tails) : null);
			})], confirmRow ? (0, react.createElement)(ConfirmDialog, {
				title: "卸载插件",
				name: confirmRow.catalog?.name ?? confirmRow.name,
				source: confirmRow.spec ?? confirmRow.name,
				desc: confirmRow.catalog ? descriptionText(confirmRow.catalog.description, zh) : "",
				note: "将从当前 dsh profile 移除该插件的依赖与层栈记录；当前进程内它仍会运行，重启 dsh web 后完全停用。",
				confirmLabel: "确认卸载",
				onCancel: () => setConfirmRow(null),
				onConfirm: () => {
					const row = confirmRow;
					setConfirmRow(null);
					runUninstall(row);
				}
			}) : null);
		}
		//#endregion
		//#region src/client/auth.js
		const AUTH_SERVER = "https://hi-dsh.com";
		const TOKEN_KEY = "hi-dsh.auth-token";
		const listeners$1 = /* @__PURE__ */ new Set();
		const authState = {
			phase: "loading",
			user: null,
			error: null
		};
		function subscribeAuth(listener) {
			listeners$1.add(listener);
			return () => listeners$1.delete(listener);
		}
		function setAuth(patch) {
			Object.assign(authState, patch);
			for (const listener of listeners$1) listener();
		}
		function serverOrigin() {
			return new URL(AUTH_SERVER).origin;
		}
		/** 启动时/重试时调用:有 token 就向服务器确认,没有就是未登录。失败显式报错。 */
		async function initAuth() {
			const token = localStorage.getItem(TOKEN_KEY);
			if (!token) {
				setAuth({
					phase: "out",
					user: null,
					error: null
				});
				return;
			}
			try {
				const res = await fetch(`${AUTH_SERVER}/api/auth/me`, { headers: { authorization: `Bearer ${token}` } });
				if (res.status === 401) {
					localStorage.removeItem(TOKEN_KEY);
					setAuth({
						phase: "out",
						user: null,
						error: null
					});
					return;
				}
				if (!res.ok) throw new Error(`账号服务返回 HTTP ${res.status}`);
				setAuth({
					phase: "in",
					user: (await res.json()).user,
					error: null
				});
			} catch (err) {
				setAuth({
					phase: "error",
					user: null,
					error: `无法确认登录状态:${err?.message ?? err}(网络或账号服务不可用,可重试;不影响市场浏览与安装)`
				});
			}
		}
		/** 打开登录弹窗。弹窗被浏览器拦截时报错,不静默降级。 */
		function startLogin() {
			const url = `${AUTH_SERVER}/api/auth/github/login?origin=${encodeURIComponent(window.location.origin)}`;
			if (!window.open(url, "hi-dsh-login", "width=680,height=760")) {
				setAuth({
					phase: "error",
					user: null,
					error: "浏览器拦截了登录弹窗,请允许本站弹出窗口后重试。"
				});
				return;
			}
			setAuth({
				phase: "login",
				user: null,
				error: null
			});
		}
		let listening = false;
		/** 监听登录弹窗回传的一次性 code 并换取 token。幂等,多次调用只注册一次。 */
		function ensureAuthListener() {
			if (listening) return;
			listening = true;
			window.addEventListener("message", async (event) => {
				if (event.origin !== serverOrigin() || event.data?.source !== "hi-dsh-auth") return;
				try {
					const res = await fetch(`${AUTH_SERVER}/api/auth/exchange`, {
						method: "POST",
						headers: { "content-type": "application/json" },
						body: JSON.stringify({ code: event.data.code })
					});
					const body = await res.json().catch(() => ({}));
					if (!res.ok) throw new Error(body?.error ?? `HTTP ${res.status}`);
					localStorage.setItem(TOKEN_KEY, body.token);
					setAuth({
						phase: "in",
						user: body.user,
						error: null
					});
				} catch (err) {
					setAuth({
						phase: "error",
						user: null,
						error: `登录码换取失败:${err?.message ?? err}(请重新登录)`
					});
				}
			});
		}
		/** 退出登录:本地态立即清除,服务器会话注销;注销失败也如实报错。 */
		async function logout() {
			const token = localStorage.getItem(TOKEN_KEY);
			localStorage.removeItem(TOKEN_KEY);
			if (token) {
				try {
					const res = await fetch(`${AUTH_SERVER}/api/auth/logout`, {
						method: "POST",
						headers: { authorization: `Bearer ${token}` }
					});
					if (!res.ok) throw new Error(`HTTP ${res.status}`);
					setAuth({
						phase: "out",
						user: null,
						error: null
					});
				} catch (err) {
					setAuth({
						phase: "error",
						user: null,
						error: `服务器注销失败(${err?.message ?? err});本地登录态已清除。`
					});
				}
				return;
			}
			setAuth({
				phase: "out",
				user: null,
				error: null
			});
		}
		//#endregion
		//#region src/client/AccountButton.jsx
		function useAuth() {
			return (0, react.useSyncExternalStore)(subscribeAuth, () => authState);
		}
		const PERSON_ICON = (0, react.createElement)("svg", {
			width: 18,
			height: 18,
			viewBox: "0 0 24 24",
			fill: "none",
			stroke: "currentColor",
			strokeWidth: 2,
			strokeLinecap: "round",
			strokeLinejoin: "round",
			"aria-hidden": true
		}, (0, react.createElement)("path", { d: "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" }), (0, react.createElement)("circle", {
			cx: 12,
			cy: 7,
			r: 4
		}));
		const GITHUB_ICON = (0, react.createElement)("svg", {
			width: 16,
			height: 16,
			viewBox: "0 0 24 24",
			fill: "currentColor",
			"aria-hidden": true
		}, (0, react.createElement)("path", { d: "M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" }));
		function avatarImg(url, style) {
			return (0, react.createElement)("img", {
				src: url,
				style,
				alt: "",
				referrerPolicy: "no-referrer"
			});
		}
		function popoverBody(auth, close) {
			if (auth.phase === "loading") return (0, react.createElement)("div", { style: s.accountNote }, "正在查询登录状态…");
			if (auth.phase === "error") return [
				(0, react.createElement)("div", {
					key: "t",
					style: s.accountPopTitle
				}, "账号服务异常"),
				(0, react.createElement)("div", {
					key: "e",
					style: s.accountError
				}, auth.error),
				(0, react.createElement)("button", {
					key: "r",
					style: s.retry,
					onClick: () => initAuth()
				}, "重试")
			];
			if (auth.phase === "login") return (0, react.createElement)("div", { style: s.accountNote }, "正在打开 GitHub 授权窗口…完成授权后本页自动更新。");
			if (auth.phase === "in") {
				const u = auth.user;
				return [
					(0, react.createElement)("div", {
						key: "t",
						style: s.accountPopTitle
					}, "已登录"),
					(0, react.createElement)("div", {
						key: "u",
						style: s.accountUser
					}, u.avatar_url ? avatarImg(u.avatar_url, s.accountAvatarLg) : null, (0, react.createElement)("div", { style: { minWidth: 0 } }, (0, react.createElement)("div", { style: s.accountName }, u.display_name), (0, react.createElement)("div", { style: s.accountMeta }, `${(u.providers ?? []).join(" / ")}${u.email ? ` · ${u.email}` : ""}`))),
					(0, react.createElement)("button", {
						key: "o",
						style: s.accountRowBtn,
						onClick: () => {
							close();
							logout();
						}
					}, "退出登录")
				];
			}
			return [
				(0, react.createElement)("div", {
					key: "t",
					style: s.accountPopTitle
				}, "选择登录方式"),
				(0, react.createElement)("button", {
					key: "gh",
					style: s.accountRowBtn,
					onClick: () => startLogin(),
					title: "通过 GitHub OAuth 登录 hi-dsh 账号"
				}, GITHUB_ICON, (0, react.createElement)("span", null, "使用 GitHub 登录")),
				(0, react.createElement)("div", {
					key: "ge",
					style: s.accountRowDisabled
				}, (0, react.createElement)("span", null, "Gitee 登录"), (0, react.createElement)("span", { style: s.accountBadge }, "即将支持"))
			];
		}
		function AccountButton() {
			const auth = useAuth();
			const [open, setOpen] = (0, react.useState)(false);
			(0, react.useEffect)(() => {
				ensureAuthListener();
				if (auth.phase === "loading") initAuth();
			}, []);
			(0, react.useEffect)(() => {
				if (!open) return void 0;
				const onDocClick = (e) => {
					if (!e.target.closest(".hi-dsh-account")) setOpen(false);
				};
				const onKey = (e) => {
					if (e.key === "Escape") {
						e.stopPropagation();
						e.preventDefault();
						setOpen(false);
					}
				};
				document.addEventListener("click", onDocClick, true);
				document.addEventListener("keydown", onKey, true);
				return () => {
					document.removeEventListener("click", onDocClick, true);
					document.removeEventListener("keydown", onKey, true);
				};
			}, [open]);
			const icon = auth.phase === "in" && auth.user?.avatar_url ? avatarImg(auth.user.avatar_url, s.accountAvatar) : PERSON_ICON;
			return (0, react.createElement)("div", {
				className: "hi-dsh-account",
				style: s.accountWrap
			}, (0, react.createElement)("button", {
				style: s.accountBtn,
				onClick: () => setOpen(!open),
				"aria-expanded": open,
				"aria-label": "hi-dsh 账号",
				title: auth.phase === "in" ? `已登录:${auth.user?.display_name ?? ""}` : "登录 hi-dsh 账号"
			}, icon), open ? (0, react.createElement)("div", {
				style: s.accountPop,
				role: "menu"
			}, popoverBody(auth, () => setOpen(false))) : null);
		}
		//#endregion
		//#region src/client/MarketPage.jsx
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
		const PAGE_SIZE = 30;
		const INSTALL_URL = "/hi-dsh/install";
		function detectZh() {
			try {
				return (navigator.language || "zh-CN").toLowerCase().startsWith("zh");
			} catch {
				return true;
			}
		}
		function formatCount(n) {
			if (typeof n !== "number") return "·";
			return n >= 1e3 ? `${(n / 1e3).toFixed(1)}k` : String(n);
		}
		/**
		* Install confirm dialog. Esc and a backdrop click cancel; 确认安装 proceeds.
		*/
		function ConfirmInstallDialog({ plugin, zh, onCancel, onConfirm }) {
			const d = plugin.description;
			const desc = typeof d === "string" ? d : d?.[zh ? "zh" : "en"] ?? d?.en ?? "";
			return (0, react.createElement)(ConfirmDialog, {
				title: "安装插件",
				name: plugin.name,
				source: plugin.npm || plugin.url ? plugin.npm ?? plugin.url : "",
				desc,
				note: "将把该插件安装到当前 dsh profile；多数插件安装后立即可用，部分需要重启 dsh web 后生效。",
				confirmLabel: "确认安装",
				onCancel,
				onConfirm
			});
		}
		function PluginCard({ plugin, zh }) {
			const [phase, setPhase] = (0, react.useState)("idle");
			const [outcome, setOutcome] = (0, react.useState)(null);
			const d = plugin.description;
			const desc = typeof d === "string" ? d : d?.[zh ? "zh" : "en"] ?? d?.en ?? "";
			const installable = Boolean(plugin.npm || plugin.url);
			const runInstall = async () => {
				setPhase("installing");
				setOutcome(null);
				try {
					const res = await fetch(INSTALL_URL, {
						method: "POST",
						headers: { "content-type": "application/json" },
						body: JSON.stringify({ url: plugin.url })
					});
					const body = await res.json().catch(() => ({}));
					if (res.ok && body?.ok === true) {
						const ledgerNote = body.ledgerError ? ` — 注意：${body.ledgerError}` : "";
						const message = body.already ? "该插件已在本 profile 中，未发生变化" : body.hot ? `已安装并生效：${body.added.join("、")}${ledgerNote}` : `已安装（${body.added.join("、")}），重启 dsh web 后生效${Array.isArray(body.hotReasons) && body.hotReasons.length > 0 ? ` — ${body.hotReasons.join("；")}` : ""}${ledgerNote}`;
						setOutcome({
							ok: true,
							message
						});
						setPhase("done");
					} else {
						setOutcome({
							ok: false,
							message: body?.error ?? `安装失败（HTTP ${res.status}）`,
							stdoutTail: typeof body?.stdoutTail === "string" ? body.stdoutTail : "",
							stderrTail: typeof body?.stderrTail === "string" ? body.stderrTail : ""
						});
						setPhase("error");
					}
				} catch (err) {
					setOutcome({
						ok: false,
						message: `无法连接安装服务：${err?.message ?? err}`,
						stdoutTail: "",
						stderrTail: ""
					});
					setPhase("error");
				}
			};
			const outputTail = outcome ? [outcome.stderrTail, outcome.stdoutTail].filter(Boolean).join("\n") : "";
			return (0, react.createElement)("div", { style: s.card }, (0, react.createElement)("div", { style: s.cardHead }, (0, react.createElement)("span", { style: s.name }, plugin.name), plugin.npm ? (0, react.createElement)("span", { style: s.npm }, plugin.npm) : null, (0, react.createElement)("span", { style: s.meta }, `★ ${formatCount(plugin.stars)} · ↓ ${formatCount(plugin.downloads)}${plugin.added ? ` · ${plugin.added}` : ""}`)), desc ? (0, react.createElement)("div", { style: s.desc }, desc) : null, (0, react.createElement)("div", { style: s.cardFoot }, installable ? (0, react.createElement)("button", {
				style: phase === "installing" ? {
					...s.installBtn,
					opacity: .6,
					cursor: "default"
				} : s.installBtn,
				disabled: phase === "installing",
				onClick: () => setPhase("confirm"),
				title: "安装到当前 dsh profile"
			}, phase === "installing" ? "安装中…" : "安装") : (0, react.createElement)("span", { style: s.pill }, "无安装来源"), plugin.url ? (0, react.createElement)("a", {
				href: plugin.url,
				target: "_blank",
				rel: "noreferrer",
				style: {
					...s.pill,
					color: "inherit"
				}
			}, "GitHub ↗") : null), phase === "installing" ? (0, react.createElement)("div", { style: s.status }, "正在安装（pnpm 可能需要下载依赖，请稍候）…") : null, phase === "done" && outcome ? (0, react.createElement)("div", { style: s.statusOk }, `✓ ${outcome.message}`) : null, phase === "error" && outcome ? (0, react.createElement)("div", { style: s.statusErr }, `✕ ${outcome.message}`) : null, phase === "error" && outcome && outputTail ? (0, react.createElement)("pre", { style: s.tails }, outputTail) : null, phase === "confirm" ? (0, react.createElement)(ConfirmInstallDialog, {
				plugin,
				zh,
				onCancel: () => setPhase("idle"),
				onConfirm: runInstall
			}) : null);
		}
		function MarketPage({ onClose } = {}) {
			const zh = (0, react.useMemo)(detectZh, []);
			const [tab, setTab] = (0, react.useState)("market");
			const [state, setState] = (0, react.useState)({
				status: "loading",
				feed: null,
				error: null
			});
			const [search, setSearch] = (0, react.useState)("");
			const [category, setCategory] = (0, react.useState)("all");
			const [sort, setSort] = (0, react.useState)("hot");
			const [visible, setVisible] = (0, react.useState)(PAGE_SIZE);
			const sentinelRef = (0, react.useRef)(null);
			const load = (force = false) => {
				setState((prev) => ({
					...prev,
					status: "loading",
					error: null
				}));
				loadFeed({ force }).then(({ feed }) => setState({
					status: "ready",
					feed,
					error: null
				})).catch((err) => setState((prev) => ({
					...prev,
					status: "error",
					error: err?.message ?? String(err)
				})));
			};
			(0, react.useEffect)(() => {
				load(false);
			}, []);
			const plugins = state.feed?.plugins ?? [];
			const categories = state.feed?.categories ?? {};
			const filtered = (0, react.useMemo)(() => {
				const needle = search.trim().toLowerCase();
				let rows = plugins.filter((p) => {
					if (category !== "all") {
						if (!(Array.isArray(p.category) ? p.category : [p.category]).includes(category)) return false;
					}
					if (!needle) return true;
					const d = p.description;
					return [
						p.name,
						p.npm,
						typeof d === "string" ? d : d?.en,
						d?.zh
					].filter(Boolean).join(" ").toLowerCase().includes(needle);
				});
				rows = rows.slice().sort((a, b) => {
					if (sort === "new") return String(b.added ?? "").localeCompare(String(a.added ?? ""));
					if (sort === "downloads") return (b.downloads ?? 0) - (a.downloads ?? 0);
					return (b.stars ?? 0) - (a.stars ?? 0);
				});
				return rows;
			}, [
				plugins,
				search,
				category,
				sort
			]);
			(0, react.useEffect)(() => {
				setVisible(PAGE_SIZE);
			}, [
				search,
				category,
				sort
			]);
			(0, react.useEffect)(() => {
				if (typeof IntersectionObserver === "undefined") return void 0;
				const el = sentinelRef.current;
				if (!el || filtered.length <= visible) return void 0;
				const io = new IntersectionObserver((entries) => {
					if (entries.some((entry) => entry.isIntersecting)) setVisible((v) => Math.min(v + PAGE_SIZE, filtered.length));
				}, { rootMargin: "200px" });
				io.observe(el);
				return () => io.disconnect();
			}, [filtered.length, visible]);
			const catLabel = (id) => {
				const c = categories[id];
				if (!c) return id;
				return zh ? c.zh ?? c.en ?? id : c.en ?? c.zh ?? id;
			};
			return (0, react.createElement)("div", { style: s.page }, (0, react.createElement)("div", { style: s.header }, (0, react.createElement)("div", { style: s.tabs }, (0, react.createElement)("button", {
				style: tab === "market" ? s.tabBtnActive : s.tabBtn,
				onClick: () => setTab("market")
			}, "插件市场"), (0, react.createElement)("button", {
				style: tab === "installed" ? s.tabBtnActive : s.tabBtn,
				onClick: () => setTab("installed")
			}, "已安装插件")), tab === "market" && state.status === "ready" ? (0, react.createElement)("span", { style: s.count }, `${filtered.length} / ${plugins.length} 个插件 · 数据更新于 ${state.feed?.updated ?? "未知"}`) : null, (0, react.createElement)(AccountButton), onClose ? (0, react.createElement)("button", {
				style: s.close,
				onClick: onClose,
				title: "关闭 (Esc)"
			}, "关闭 ✕") : null), tab === "installed" ? (0, react.createElement)(InstalledPage) : [(0, react.createElement)("div", { style: s.toolbar }, (0, react.createElement)("input", {
				style: s.input,
				value: search,
				placeholder: "搜索插件（名称 / 描述）…",
				onChange: (e) => setSearch(e.target.value)
			}), (0, react.createElement)("select", {
				style: s.select,
				value: category,
				onChange: (e) => setCategory(e.target.value)
			}, (0, react.createElement)("option", { value: "all" }, "全部分类"), Object.keys(categories).map((id) => (0, react.createElement)("option", {
				key: id,
				value: id
			}, catLabel(id)))), (0, react.createElement)("select", {
				style: s.select,
				value: sort,
				onChange: (e) => setSort(e.target.value)
			}, (0, react.createElement)("option", { value: "hot" }, "最热（star）"), (0, react.createElement)("option", { value: "downloads" }, "下载量"), (0, react.createElement)("option", { value: "new" }, "最新收录"))), (0, react.createElement)("div", { style: s.list }, state.status === "error" ? (0, react.createElement)("div", { style: s.note }, `目录加载失败：${state.error}`, (0, react.createElement)("button", {
				style: s.retry,
				onClick: () => load(true)
			}, "重试")) : state.status === "loading" && !state.feed ? (0, react.createElement)("div", { style: s.note }, "正在拉取目录（awesome-dsh-plugin.com）…") : filtered.length === 0 ? (0, react.createElement)("div", { style: s.note }, "没有匹配的插件。") : [...filtered.slice(0, visible).map((p) => (0, react.createElement)(PluginCard, {
				key: `${p.owner}/${p.name}`,
				plugin: p,
				zh
			})), filtered.length > visible ? typeof IntersectionObserver === "undefined" ? (0, react.createElement)("button", {
				key: "more",
				style: s.moreBtn,
				onClick: () => setVisible((v) => v + PAGE_SIZE)
			}, `加载更多（还有 ${filtered.length - visible} 个）`) : (0, react.createElement)("div", {
				key: "sentinel",
				ref: sentinelRef,
				style: s.sentinel
			}, `↓ 继续滚动加载（还有 ${filtered.length - visible} 个）`) : null])]);
		}
		//#endregion
		//#region src/client/state.js
		const listeners = /* @__PURE__ */ new Set();
		const uiState = { marketOpen: false };
		function setMarketOpen(open) {
			if (uiState.marketOpen === open) return;
			uiState.marketOpen = open;
			for (const listener of listeners) listener();
		}
		function subscribeUi(listener) {
			listeners.add(listener);
			return () => listeners.delete(listener);
		}
		//#endregion
		//#region src/client/index.jsx
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
		const name = "hi-dsh";
		const inject = ["slots"];
		function useMarketOpen() {
			return (0, react.useSyncExternalStore)(subscribeUi, () => uiState.marketOpen);
		}
		/**
		* Locate the sidebar column by walking up from the Hi button: the sidebar is
		* the outermost ancestor that starts near the left edge and stays narrower
		* than 45% of the viewport. Returns null when nothing matches (host DOM
		* changed) — the caller then falls back to fullscreen.
		*/
		function findSidebarAnchor() {
			const btn = document.querySelector(".hi-dsh-btn");
			let best = null;
			let el = btn?.parentElement ?? null;
			while (el && el !== document.body) {
				const r = el.getBoundingClientRect();
				if (r.width > 40 && r.width <= window.innerWidth * .45 && r.left < 60) best = el;
				else if (best) break;
				el = el.parentElement;
			}
			return best;
		}
		function MarketOverlay() {
			const open = useMarketOpen();
			const [left, setLeft] = (0, react.useState)(0);
			const [noSidebar, setNoSidebar] = (0, react.useState)(false);
			(0, react.useEffect)(() => {
				if (!open) return void 0;
				const onKey = (e) => {
					if (e.key === "Escape") setMarketOpen(false);
				};
				window.addEventListener("keydown", onKey);
				const anchor = findSidebarAnchor();
				if (!anchor) {
					setNoSidebar(true);
					return () => window.removeEventListener("keydown", onKey);
				}
				setNoSidebar(false);
				const measure = () => setLeft(Math.round(anchor.getBoundingClientRect().right));
				measure();
				const ro = new ResizeObserver(measure);
				ro.observe(anchor);
				window.addEventListener("resize", measure);
				const onDocClick = (e) => {
					const t = e.target;
					if (t.closest(".hi-dsh-market-panel") || t.closest(".hi-dsh-btn")) return;
					setMarketOpen(false);
				};
				document.addEventListener("click", onDocClick, true);
				return () => {
					window.removeEventListener("keydown", onKey);
					window.removeEventListener("resize", measure);
					document.removeEventListener("click", onDocClick, true);
					ro.disconnect();
				};
			}, [open]);
			if (!open) return null;
			return (0, react.createElement)("div", {
				className: "hi-dsh-market-panel",
				style: {
					position: "fixed",
					top: 0,
					bottom: 0,
					right: 0,
					left,
					zIndex: 1e3,
					display: "flex",
					flexDirection: "column",
					background: "light-dark(#ffffff, #1f2126)",
					color: "light-dark(#1f2328, #e8eaed)",
					colorScheme: "light dark",
					borderLeft: "1px solid light-dark(rgba(0,0,0,.1), rgba(255,255,255,.12))"
				}
			}, noSidebar ? (0, react.createElement)("div", { style: panelErrStyle }, "hi-dsh：无法定位侧栏（宿主 DOM 已变化），市场面板不可用。请到 github.com/hi-dsh/hi-dsh 提交反馈。") : (0, react.createElement)(MarketPage));
		}
		const panelErrStyle = {
			padding: 24,
			fontSize: 13,
			lineHeight: 1.7
		};
		const btnBase = {
			cursor: "pointer",
			font: "inherit",
			color: "inherit",
			display: "grid",
			placeItems: "center",
			fontWeight: 700,
			fontSize: 13,
			letterSpacing: .3,
			padding: 0,
			lineHeight: 1
		};
		/**
		* The Hi button's visual skin (border, subtle fill, hover/press feedback).
		* Inline styles cannot express :hover/:active, so these rules are injected
		* once into <head> (plugin-owned <style> tag, same pattern dsh-market uses);
		* the inline style keeps only layout (size/shape).
		*/
		function injectButtonStyle() {
			if (document.getElementById("hi-dsh-btn-style")) return;
			const tag = document.createElement("style");
			tag.id = "hi-dsh-btn-style";
			tag.textContent = [
				".hi-dsh-btn {",
				"  background: light-dark(rgba(0,0,0,.04), rgba(255,255,255,.07));",
				"  border: 1px solid light-dark(rgba(0,0,0,.22), rgba(255,255,255,.28));",
				"  transition: background .15s ease, border-color .15s ease, transform .06s ease;",
				"}",
				".hi-dsh-btn:hover {",
				"  background: light-dark(rgba(0,0,0,.09), rgba(255,255,255,.14));",
				"  border-color: light-dark(rgba(0,0,0,.34), rgba(255,255,255,.42));",
				"}",
				".hi-dsh-btn:active { transform: scale(.95); }",
				".hi-dsh-btn:focus-visible { outline: 2px solid light-dark(#2563eb, #7ab0ff); outline-offset: 1px; }",
				".hi-dsh-btn.active {",
				"  background: light-dark(rgba(37,99,235,.14), rgba(122,176,255,.2));",
				"  border-color: light-dark(#2563eb, #7ab0ff);",
				"  color: light-dark(#2563eb, #a8c8ff);",
				"}",
				".hi-dsh-btn.active:hover {",
				"  background: light-dark(rgba(37,99,235,.2), rgba(122,176,255,.26));",
				"  border-color: light-dark(#2563eb, #7ab0ff);",
				"}"
			].join("\n");
			document.head.appendChild(tag);
		}
		function HiButton(props = {}) {
			const open = useMarketOpen();
			const toggle = () => setMarketOpen(!open);
			const shared = {
				className: "hi-dsh-btn" + (open ? " active" : ""),
				title: "打开 / 关闭 hi-dsh 插件市场",
				onClick: toggle,
				"aria-label": "hi-dsh 插件市场"
			};
			return props.wide ? (0, react.createElement)("button", {
				...shared,
				style: {
					...btnBase,
					width: "100%",
					height: 36,
					borderRadius: 8
				}
			}, "Hi") : (0, react.createElement)("button", {
				...shared,
				style: {
					...btnBase,
					width: 36,
					height: 36,
					borderRadius: 8
				}
			}, "Hi");
		}
		function MarketTab() {
			return (0, react.createElement)("div", { style: {
				height: "100%",
				minHeight: 0,
				display: "flex"
			} }, (0, react.createElement)(MarketPage));
		}
		function apply(ctx) {
			injectButtonStyle();
			ctx.slots.inject("sidebar.footer.action", () => ctx.slots.register({
				name: "sidebar.footer.action",
				id: "hi-dsh",
				label: () => "Hi"
			}, (owner) => (0, react.createElement)(HiButton, owner ?? {})));
			ctx.slots.inject("shell.overlay", () => ctx.slots.register({
				name: "shell.overlay",
				id: "hi-dsh-market-overlay",
				label: () => "hi-dsh 插件市场"
			}, () => (0, react.createElement)(MarketOverlay)));
			ctx.slots.inject("conversation.view", () => ctx.slots.register({
				name: "conversation.view",
				id: "hi-dsh-market",
				label: () => "插件市场"
			}, () => (0, react.createElement)(MarketTab)));
		}
		//#endregion
		exports.apply = apply;
		exports.inject = inject;
		exports.name = name;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map