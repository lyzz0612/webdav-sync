import './styles.css'

const state = {
  tab: 'overview',
  runtime: { connected: true, events: [] },

  targets: [],
  jobs: [],
  logs: [],
  policy: { watch: true, scanOnStart: true, scanMinutes: 5, concurrency: 2, retries: 3, remoteDelete: false, ignore: ['~$*', '*.tmp', '*.part', '.DS_Store'] },
}

const icons = {
  grid: '<svg viewBox="0 0 24 24"><rect x="4" y="4" width="6" height="6"/><rect x="14" y="4" width="6" height="6"/><rect x="4" y="14" width="6" height="6"/><rect x="14" y="14" width="6" height="6"/></svg>',
  cloud: '<svg viewBox="0 0 24 24"><path d="M7.5 18h9.2a4.3 4.3 0 0 0 .5-8.57A6.3 6.3 0 0 0 5.2 10.6 3.7 3.7 0 0 0 7.5 18Z"/></svg>',
  folder: '<svg viewBox="0 0 24 24"><path d="M3 7.5h7l1.7 2H21v8.8A1.7 1.7 0 0 1 19.3 20H4.7A1.7 1.7 0 0 1 3 18.3Z"/><path d="M3 7.5V5.7A1.7 1.7 0 0 1 4.7 4h4l1.6 2H20a1 1 0 0 1 1 1.5"/></svg>',
  sliders: '<svg viewBox="0 0 24 24"><path d="M4 7h10M18 7h2M4 17h2M10 17h10M14 4v6M8 14v6"/><circle cx="16" cy="7" r="2"/><circle cx="8" cy="17" r="2"/></svg>',
  activity: '<svg viewBox="0 0 24 24"><path d="M4 12h3l2.1-6 4.2 12 2.1-6H20"/></svg>',
  plus: '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
  arrow: '<svg viewBox="0 0 24 24"><path d="M4 12h15M13 6l6 6-6 6"/></svg>',
  refresh: '<svg viewBox="0 0 24 24"><path d="M20 11a8 8 0 0 0-14.7-4L3 10M4 5v5h5M4 13a8 8 0 0 0 14.7 4L21 14m-1 5v-5h-5"/></svg>',
  more: '<svg viewBox="0 0 24 24"><circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/></svg>',
  check: '<svg viewBox="0 0 24 24"><path d="m5 12 4 4L19 7"/></svg>',
  warning: '<svg viewBox="0 0 24 24"><path d="M12 4 3 20h18L12 4Z"/><path d="M12 9v5m0 3h.01"/></svg>',
  clock: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/><path d="M12 7v5l3 2"/></svg>',
  chevron: '<svg viewBox="0 0 24 24"><path d="m9 18 6-6-6-6"/></svg>',
}

function navItem(id, label, icon) {
  return `<button class="nav-item ${state.tab === id ? 'active' : ''}" data-tab="${id}">${icons[icon]}<span>${label}</span>${id === 'jobs' && state.jobs.length ? `<b class="nav-count">${state.jobs.length}</b>` : ''}</button>`
}

function app() {
  document.querySelector('#app').innerHTML = `
    <div class="shell">
      <aside class="sidebar">
        <div class="brand"><div class="brand-mark">↗</div><div><strong>webdev</strong><span>SYNC DESK</span></div></div>
        <div class="nav-section"><small>工作台</small>${navItem('overview','概览','grid')}${navItem('targets','WebDAV 目标','cloud')}${navItem('jobs','同步文件夹','folder')}</div>
        <div class="nav-section second"><small>管理</small>${navItem('policies','同步策略','sliders')}${navItem('logs','运行日志','activity')}</div>
        <div class="sidebar-bottom">${serviceBadge()}</div>
      </aside>
      <main class="main"><header class="topbar"><div class="crumb">Webdev Sync <span>/</span> ${tabTitle()}</div>${errorCount() ? `<div class="top-actions"><button class="icon-btn notification" title="查看失败日志" data-tab="logs" data-goto-errors>${icons.warning}<i></i></button></div>` : ''}</header>${content()}</main>
    </div>
    <div id="toast" class="toast"></div>
    <div id="modal-root"></div>
  `
  bind()
}

function errorCount() { return state.logs.filter(l => l[1] !== 'success').length }
function serviceBadge() {
  const running = state.jobs.filter(j => j.status === 'running').length
  const last = state.logs[0]
  return `<div class="sync-pulse ${running ? '' : 'idle'}"><i></i><div><strong>${running ? `${running} 个任务监听中` : '没有运行中的任务'}</strong><span>${last ? `最近事件 · ${last[0]}` : '暂无事件'}</span></div></div>`
}
function tabTitle() { return ({overview:'概览',targets:'WebDAV 目标',jobs:'同步文件夹',policies:'同步策略',logs:'运行日志'})[state.tab] }

function content() {
  if (state.tab === 'overview') return overview()
  if (state.tab === 'targets') return targets()
  if (state.tab === 'jobs') return jobs()
  if (state.tab === 'policies') return policies()
  return logs()
}

function pageHead(kicker, title, desc, action='') { return `<div class="page-head"><div><div class="eyebrow">${kicker}</div><h1>${title}</h1><p>${desc}</p></div>${action}</div>` }
function button(label, cls='', data='') { return `<button class="btn ${cls}" ${data}>${label}</button>` }

function empty(text, action='') { return `<div class="empty-state"><p>${text}</p>${action}</div>` }
function overview() {
  const today = new Date().toDateString()
  const todayOk = state.logs.filter(l => l[1]==='success' && l.date===today).length
  const errors = state.logs.filter(l => l[1]!=='success').length
  const active = state.jobs.filter(j => j.status==='running').length
  const dateLabel = new Date().toLocaleDateString('zh-CN', { year:'numeric', month:'long', day:'numeric', weekday:'long' })
  return `<section class="page">${pageHead(dateLabel,'保持文档，随时可达。','本地文件变更会自动发布到你的 WebDAV 空间。',button('+ 新建同步任务','primary','data-action="new-job"'))}
    <div class="hero-grid"><div class="hero-card"><div class="hero-label"><span class="live-dot"></span>${active ? '同步服务运行中' : '暂无运行中的任务'}</div><div class="hero-number">${active} <span>个任务正在监听</span></div><div class="hero-meta"><span>共 ${state.jobs.length} 个同步任务</span><span>${state.targets.length} 个 WebDAV 目标</span></div><div class="hero-visual"><div class="orb orb-a"></div><div class="orb orb-b"></div><div class="orbit"></div><div class="visual-label v1">本地</div><div class="visual-label v2">WebDAV</div><div class="route-line"><b></b><i></i><em></em></div></div></div>
    <div class="stat-stack"><div class="stat-card"><div class="stat-icon green">${icons.check}</div><div><span>今日成功事件</span><strong>${todayOk} <small>条</small></strong></div></div><div class="stat-card"><div class="stat-icon amber">${icons.clock}</div><div><span>失败 / 警告</span><strong>${errors} <small>条</small></strong></div></div><div class="stat-card"><div class="stat-icon blue">${icons.cloud}</div><div><span>WebDAV 目标</span><strong>${state.targets.length} <small>个</small></strong></div></div></div></div>
    <div class="section-head"><div><h2>同步任务</h2><span>所有本地目录的实时状态</span></div><button class="text-btn" data-tab="jobs">管理全部 ${icons.arrow}</button></div>${state.jobs.length ? `<div class="job-grid">${state.jobs.map(jobCard).join('')}</div>` : empty(state.targets.length ? '还没有同步任务。' : '先添加一个 WebDAV 目标，再创建同步任务。', state.targets.length ? button('+ 新建同步任务','primary','data-action="new-job"') : button('+ 添加 WebDAV 目标','primary','data-action="new-target"'))}
    <div class="section-head log-head"><div><h2>最近活动</h2><span>来自所有同步任务</span></div><button class="text-btn" data-tab="logs">查看日志 ${icons.arrow}</button></div>${state.logs.length ? `<div class="activity-list">${state.logs.slice(0,5).map(logRow).join('')}</div>` : empty('暂无活动。')}
  </section>`
}

function jobCard(j) { return `<article class="job-card"><div class="job-top"><span class="folder-badge">${icons.folder}</span><button class="icon-btn" title="立即同步" data-sync-job="${j.id}">${icons.refresh}</button></div><h3>${esc(j.name)}</h3><div class="path-line">${esc(j.local)}</div><div class="flow-line"><span></span>${icons.arrow}<b>${esc(j.target)} · ${esc(j.remote)}</b></div><div class="job-footer"><span class="status ${j.status}"><i></i>${j.status==='running'?'监听中':'已暂停'}</span><span>${esc(j.last)}</span></div></article>` }
function logRow(l) { return `<div class="activity-row"><span class="time">${l[0]}</span><span class="log-dot ${l[1]}">${l[1]==='success'?icons.check:icons.warning}</span><div><strong>${esc(l[2])}</strong><span>${esc(l[3])}</span></div></div>` }
function esc(v) { return String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]) }

function targets() { return `<section class="page">${pageHead('连接管理','WebDAV 目标','管理你要发布文档的远程空间。支持多个目标，按任务独立使用。',button('+ 添加 WebDAV 目标','primary','data-action="new-target"'))}<div class="notice"><div class="notice-icon">✦</div><div><strong>标准 WebDAV</strong><span>配置保存在本机用户目录，不会上传到任何服务器。</span></div></div>${state.targets.length ? `<div class="target-list">${state.targets.map((t,i)=>`<article class="target-card"><div class="target-brand ${i%2?'blue':'gold'}">${esc((t.name||'W').slice(0,1))}</div><div class="target-info"><div class="target-title"><h3>${esc(t.name)}</h3></div><p>${esc(t.host)}</p><small>${esc(t.username)} · ${esc(t.meta || 'WebDAV 目标')}</small></div><div class="target-actions">${button('测试连接','quiet',`data-test-target="${t.id}"`)}${button('编辑','quiet',`data-edit-target="${t.id}"`)}${button('删除','quiet danger',`data-delete-target="${t.id}"`)}</div></article>`).join('')}</div>` : empty('还没有 WebDAV 目标。', button('+ 添加 WebDAV 目标','primary','data-action="new-target"'))}</section>` }

function jobs() { const p=state.policy; return `<section class="page">${pageHead('目录映射','同步文件夹','将本地目录映射到 WebDAV 远端路径，文件变更将自动上传。',button('+ 新建同步任务','primary','data-action="new-job"'))}${state.jobs.length ? `<div class="filter-row"><div class="search">⌕ <input id="job-search" placeholder="搜索同步任务" /></div><span class="result-count">${state.jobs.length} 个同步任务</span></div><div class="jobs-table"><div class="table-head"><span>任务</span><span>远端目标</span><span>状态</span><span>最近同步</span><span></span></div>${state.jobs.map(j=>`<div class="table-row"><div class="task-cell"><span class="folder-badge">${icons.folder}</span><div><strong>${esc(j.name)}</strong><small>${esc(j.local)}</small></div></div><div><strong>${esc(j.target)}</strong><small>${esc(j.remote)}</small></div><div><span class="status ${j.status}"><i></i>${j.status==='running'?'监听中':'已暂停'}</span></div><div><strong>${esc(j.last)}</strong><small>${p.scanMinutes ? `定时扫描 · ${p.scanMinutes} 分钟` : '定时扫描关闭'}</small></div><div class="row-actions"><button class="icon-btn" title="立即同步" data-sync-job="${j.id}">${icons.refresh}</button><button class="icon-btn" title="编辑" data-edit-job="${j.id}">${icons.sliders}</button><button class="icon-btn" title="删除" data-delete-job="${j.id}">×</button></div></div>`).join('')}</div>` : empty(state.targets.length ? '还没有同步任务。' : '先添加一个 WebDAV 目标。', state.targets.length ? button('+ 新建同步任务','primary','data-action="new-job"') : button('前往添加目标','primary','data-tab="targets"'))}</section>` }

function policies() { const p=state.policy || {}; return `<section class="page">${pageHead('运行规则','同步策略','控制监听、扫描和上传队列的工作方式。全局策略会应用到新建任务。',button('保存更改','primary','data-action="save-policy"'))}<div class="policy-layout"><div class="settings-card"><div class="card-title"><div><h3>自动化</h3><p>让同步服务安静地在后台工作。</p></div><span class="section-number">01</span></div><div class="setting-row"><div><strong>监听文件变化</strong><span>保存文档后自动加入上传队列</span></div><label class="switch"><input data-policy="watch" type="checkbox" ${p.watch !== false?'checked':''}><i></i></label></div><div class="setting-row"><div><strong>启动时扫描</strong><span>应用启动后检查未完成的变更</span></div><label class="switch"><input data-policy="scanOnStart" type="checkbox" ${p.scanOnStart !== false?'checked':''}><i></i></label></div><div class="setting-row"><div><strong>定时补偿扫描</strong><span>每隔一段时间确认没有漏掉文件</span></div><select data-policy="scanMinutes"><option value="5" ${p.scanMinutes==5?'selected':''}>每 5 分钟</option><option value="15" ${p.scanMinutes==15?'selected':''}>每 15 分钟</option><option value="30" ${p.scanMinutes==30?'selected':''}>每 30 分钟</option><option value="0" ${p.scanMinutes==0?'selected':''}>关闭</option></select></div></div><div class="settings-card"><div class="card-title"><div><h3>上传队列</h3><p>为不稳定的网络预留足够的韧性。</p></div><span class="section-number">02</span></div><div class="setting-row"><div><strong>同时上传</strong><span>同时处理的文件数量</span></div><select data-policy="concurrency"><option value="2" ${p.concurrency==2?'selected':''}>2 个文件</option><option value="3" ${p.concurrency==3?'selected':''}>3 个文件</option><option value="5" ${p.concurrency==5?'selected':''}>5 个文件</option></select></div><div class="setting-row"><div><strong>失败后重试</strong><span>网络错误时自动重试上传</span></div><select data-policy="retries"><option value="3" ${p.retries==3?'selected':''}>3 次</option><option value="5" ${p.retries==5?'selected':''}>5 次</option><option value="0" ${p.retries==0?'selected':''}>不重试</option></select></div><input data-policy="remoteDelete" type="hidden" value=""></div><div class="settings-card wide"><div class="card-title"><div><h3>忽略规则</h3><p>匹配到的文件不会被上传。</p></div><span class="section-number">03</span></div><div class="tags-input"><input data-policy="ignore" value="${esc((p.ignore||[]).join(', '))}" placeholder="规则以逗号分隔，例如 *.tmp, ~$*" /></div></div></div></section>` }
function logs() { const filter=state.logFilter||'all'; const rows=state.logs.filter(l=>filter==='all'||(filter==='success'&&l[1]==='success')||(filter==='warning'&&l[1]!=='success')); return `<section class="page">${pageHead('系统记录','运行日志','每一次监听、上传和重试都在这里留下痕迹。',button('清空日志','quiet','data-action="clear-logs"'))}<div class="log-toolbar"><div class="log-filters"><span data-log-filter="all" class="${filter==='all'?'active':''}">全部</span><span data-log-filter="success" class="${filter==='success'?'active':''}">成功</span><span data-log-filter="warning" class="${filter==='warning'?'active':''}">失败</span></div><div class="result-count">共 ${rows.length} 条记录</div></div>${rows.length ? `<div class="activity-list full">${rows.map(logRow).join('')}</div>` : empty('暂无日志。')}</section>` }

const on = (sel, ev, fn) => document.querySelectorAll(sel).forEach(el => el.addEventListener(ev, e => fn(el, e)))
function bind() {
  on('[data-tab]', 'click', el => { state.tab = el.dataset.tab; if (el.hasAttribute('data-goto-errors')) state.logFilter = 'warning'; app() })
  on('[data-action="new-job"]', 'click', () => state.targets.length ? openJobModal() : (toast('请先添加 WebDAV 目标'), openTargetModal()))
  on('[data-action="new-target"]', 'click', () => openTargetModal())
  on('[data-test-target]', 'click', async el => { el.textContent = '测试中…'; el.disabled = true; try { await api().testTarget(el.dataset.testTarget); el.textContent = '连接正常 ✓'; toast('连接测试成功') } catch (e) { el.textContent = '测试失败'; toast(`连接失败：${cleanError(e)}`) } finally { el.disabled = false } })
  on('[data-edit-target]', 'click', el => openTargetModal(el.dataset.editTarget))
  on('[data-delete-target]', 'click', el => deleteTarget(el.dataset.deleteTarget))
  on('[data-edit-job]', 'click', el => openJobModal(el.dataset.editJob))
  on('[data-delete-job]', 'click', el => deleteJob(el.dataset.deleteJob))
  on('[data-sync-job]', 'click', async el => { el.disabled = true; toast('开始同步…'); try { const count = await api().syncOnce(el.dataset.syncJob); toast(`同步完成：上传 ${count} 个文件`) } catch (e) { toast(`同步失败：${cleanError(e)}`) } finally { el.disabled = false } })
  on('[data-action="save-policy"]', 'click', savePolicy)
  on('[data-action="clear-logs"]', 'click', async () => { state.logs = []; await api().clearLogs(); app(); toast('日志已清空') })
  on('[data-log-filter]', 'click', el => { state.logFilter = el.dataset.logFilter; app() })
  on('#job-search', 'input', el => document.querySelectorAll('.table-row').forEach(row => { row.style.display = row.textContent.toLowerCase().includes(el.value.toLowerCase()) ? '' : 'none' }))
}

// Fallback keeps the UI usable in a plain browser (vite dev) without Electron.
function api() { return window.syncDesk || { getConfig: async () => ({}), saveConfig: async () => ({}), testTarget: async () => { throw new Error('浏览器预览模式不支持连接测试') }, syncOnce: async () => { throw new Error('浏览器预览模式不支持同步') }, clearLogs: async () => true, pickFolder: async () => null, onEvent: () => {} } }
function cleanError(e) { return String(e?.message || e).replace(/^Error invoking remote method '[^']+': (Error: )?/, '') }

function modalFrame(title, body) { document.querySelector('#modal-root').innerHTML = `<div class="modal-backdrop" data-close-modal><div class="modal-card"><div class="modal-head"><div><div class="eyebrow">WEBDEV SYNC</div><h2>${title}</h2></div><button type="button" class="icon-btn" data-close-modal>×</button></div>${body}</div></div>`; document.querySelector('.modal-card').addEventListener('click', e => e.stopPropagation()); on('[data-close-modal]', 'click', closeModal) }
function closeModal() { const root = document.querySelector('#modal-root'); if (root) root.innerHTML = '' }

function openTargetModal(id = '') {
  const t = state.targets.find(x => x.id === id)
  modalFrame(t ? '编辑 WebDAV 目标' : '添加 WebDAV 目标', `<form id="target-form" class="modal-form"><label>目标名称<input name="name" required value="${esc(t?.name)}" placeholder="例如：123 网盘"></label><label>WebDAV 地址<input name="url" type="url" required value="${esc(t?.host)}" placeholder="https://webdav.123pan.cn/webdav"></label><div class="form-grid"><label>用户名<input name="username" required value="${esc(t?.username)}"></label><label>密码<input name="password" type="password" value="${esc(t?.password)}"></label></div><label>备注<input name="meta" value="${esc(t?.meta)}" placeholder="可选"></label><div class="modal-actions"><button type="button" class="btn quiet" data-close-modal>取消</button><button class="btn primary">保存目标</button></div></form>`)
  document.querySelector('#target-form').addEventListener('submit', async e => {
    e.preventDefault()
    const d = Object.fromEntries(new FormData(e.target))
    const item = { id: t?.id || crypto.randomUUID(), name: d.name.trim(), host: d.url.trim(), username: d.username.trim(), password: d.password, meta: d.meta.trim() }
    state.targets = t ? state.targets.map(x => x.id === t.id ? item : x) : [...state.targets, item]
    refreshJobLabels()
    await persistConfig(); closeModal(); app(); toast('WebDAV 目标已保存')
  })
}

function openJobModal(id = '') {
  const j = state.jobs.find(x => x.id === id)
  modalFrame(j ? '编辑同步任务' : '新建同步任务', `<form id="job-form" class="modal-form"><label>任务名称<input name="name" required value="${esc(j?.name)}" placeholder="例如：产品文档"></label><label>本地目录<div class="input-row"><input name="localPath" required value="${esc(j?.local)}" placeholder="G:\\docs\\product"><button type="button" class="btn quiet" data-pick-folder>浏览…</button></div></label><label>WebDAV 目标<select name="targetId" required>${state.targets.map(t => `<option value="${t.id}" ${t.id === j?.targetId ? 'selected' : ''}>${esc(t.name)}</option>`).join('')}</select></label><label>远程目录<input name="remotePath" required value="${esc(j?.remote || '/')}" placeholder="/产品文档"></label><label class="check-line"><input name="enabled" type="checkbox" ${j?.status !== 'paused' ? 'checked' : ''}> 启用（文件监听与定时扫描）</label><div class="modal-actions"><button type="button" class="btn quiet" data-close-modal>取消</button><button class="btn primary">保存任务</button></div></form>`)
  const form = document.querySelector('#job-form')
  form.querySelector('[data-pick-folder]').addEventListener('click', async () => { const dir = await api().pickFolder(); if (dir) { form.localPath.value = dir; if (!form.name.value) form.name.value = dir.split(/[\\/]/).filter(Boolean).pop() || '' } })
  form.addEventListener('submit', async e => {
    e.preventDefault()
    const d = Object.fromEntries(new FormData(form))
    const remote = '/' + d.remotePath.trim().replace(/\\/g, '/').replace(/^\/+/, '')
    const item = { ...(j || { last: '尚未同步' }), id: j?.id || crypto.randomUUID(), name: d.name.trim(), local: d.localPath.trim(), remote, targetId: d.targetId, status: form.enabled.checked ? 'running' : 'paused' }
    state.jobs = j ? state.jobs.map(x => x.id === j.id ? item : x) : [...state.jobs, item]
    refreshJobLabels()
    await persistConfig(); closeModal(); app(); toast('同步任务已保存')
  })
}

function refreshJobLabels() { state.jobs.forEach(j => { j.target = state.targets.find(t => t.id === j.targetId)?.name || '（目标已删除）' }) }
async function deleteTarget(id) { const n = state.jobs.filter(j => j.targetId === id).length; if (!confirm(n ? `删除这个 WebDAV 目标？使用它的 ${n} 个同步任务也会被删除。` : '删除这个 WebDAV 目标？')) return; state.targets = state.targets.filter(t => t.id !== id); state.jobs = state.jobs.filter(j => j.targetId !== id); await persistConfig(); app(); toast('目标已删除') }
async function deleteJob(id) { if (!confirm('删除这个同步任务？远端文件不会被删除。')) return; state.jobs = state.jobs.filter(j => j.id !== id); await persistConfig(); app(); toast('任务已删除') }

async function persistConfig() {
  await api().saveConfig({
    targets: state.targets.map(t => ({ id: t.id, name: t.name, url: t.host, username: t.username || '', password: t.password || '', meta: t.meta || '' })),
    jobs: state.jobs.map(j => ({ id: j.id, name: j.name, localPath: j.local, targetId: j.targetId, remotePath: j.remote, enabled: j.status !== 'paused' })),
  })
}
async function savePolicy() {
  const get = k => document.querySelector(`[data-policy="${k}"]`)
  const p = { watch: get('watch').checked, scanOnStart: get('scanOnStart').checked, scanMinutes: Number(get('scanMinutes').value), concurrency: Number(get('concurrency').value), retries: Number(get('retries').value), remoteDelete: false, ignore: get('ignore').value.split(',').map(s => s.trim()).filter(Boolean) }
  state.policy = p
  await api().saveConfig({ policy: p })
  toast('策略已保存，同步服务已应用')
}
function toast(message) { const t = document.querySelector('#toast'); if (!t) return; t.textContent = message; t.classList.add('show'); clearTimeout(toast.timer); toast.timer = setTimeout(() => t.classList.remove('show'), 2600) }

function pushEvent(event) {
  const at = new Date(event.at)
  const job = state.jobs.find(j => j.id === event.jobId)
  const row = [at.toLocaleTimeString('zh-CN', { hour12: false }), event.type === 'error' ? 'error' : 'success', job?.name || event.file || '同步服务', event.type === 'error' ? `失败 · ${event.file ? event.file + ' · ' : ''}${event.error}` : (event.message || `已上传 · ${event.file}`)]
  row.date = at.toDateString()
  state.logs.unshift(row); state.logs = state.logs.slice(0, 500)
  if (job && event.type !== 'error') job.last = at.toLocaleString('zh-CN', { hour12: false })
}

async function bootstrapRuntime() {
  const cfg = await api().getConfig()
  state.targets = (cfg.targets || []).map(t => ({ id: t.id, name: t.name, host: t.url, username: t.username, password: t.password, meta: t.meta }))
  state.jobs = (cfg.jobs || []).map(j => ({ id: j.id, name: j.name, local: j.localPath, remote: j.remotePath, targetId: j.targetId, status: j.enabled === false ? 'paused' : 'running', last: j.lastScanAt ? new Date(j.lastScanAt).toLocaleString('zh-CN', { hour12: false }) : '尚未同步' }))
  refreshJobLabels()
  state.policy = { ...state.policy, ...(cfg.policy || {}) }
  ;(cfg.logs || []).slice().reverse().forEach(pushEvent)
  app()
  api().onEvent(event => { pushEvent(event); if (!document.querySelector('.modal-backdrop') && ['logs', 'overview', 'jobs'].includes(state.tab)) app() })
}
app()
bootstrapRuntime().catch(error => { console.error(error); toast(`加载配置失败：${cleanError(error)}`) })
