const { app, BrowserWindow, ipcMain, dialog, Tray, Menu, nativeImage } = require('electron')
const path = require('node:path')
const fs = require('node:fs')
const { createClient } = require('webdav')
const chokidar = require('chokidar')

const logFile = () => path.join(app.getPath('userData'), 'main.log')
function fileLog(message) { try { fs.appendFileSync(logFile(), `${new Date().toISOString()} ${message}\n`) } catch {} }
process.on('uncaughtException', error => fileLog(`[uncaughtException] ${error.stack || error}`))
process.on('unhandledRejection', error => fileLog(`[unhandledRejection] ${error?.stack || error}`))

const configPath = path.join(app.getPath('userData'), 'webdev-sync.json')
let win
const watchers = new Map()
const scanTimers = new Map()
let config = { targets: [], jobs: [], policy: { watch: true, scanOnStart: true, debounceMs: 1000, scanMinutes: 5, concurrency: 2, retries: 3, remoteDelete: false, ignore: ['~$*', '*.tmp', '*.part', '.DS_Store'] } }
let logs = []

function loadConfig() {
  try {
    if (fs.existsSync(configPath)) {
      const saved = JSON.parse(fs.readFileSync(configPath, 'utf8'))
      config = { ...config, ...saved, policy: { ...config.policy, ...(saved.policy || {}) } }
    }
    if (!Array.isArray(config.targets)) config.targets = []
    if (!Array.isArray(config.jobs)) config.jobs = []
  } catch (e) { fileLog(`[loadConfig] ${e.stack || e}`) }
}
function saveConfig() { fs.mkdirSync(path.dirname(configPath), { recursive: true }); fs.writeFileSync(configPath, JSON.stringify(config, null, 2)) }
function emit(channel, payload) { if (win && !win.isDestroyed()) win.webContents.send(channel, payload) }
function addLog(event) { logs.unshift(event); logs = logs.slice(0, 500); emit('sync-event', event) }
function makeClient(target) { return createClient(target.url, { username: target.username, password: target.password }) }

// Convert simple glob rules (~$*, *.tmp) to a matcher on the file basename.
function ignoreMatcher() {
  const rules = (config.policy.ignore || []).map(rule => new RegExp('^' + rule.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.') + '$', 'i'))
  return file => rules.some(re => re.test(path.basename(file)))
}

async function ensureRemoteDir(client, dir) {
  const parts = dir.split('/').filter(Boolean)
  let current = ''
  for (const part of parts) {
    current += '/' + part
    if (!(await client.exists(current))) await client.createDirectory(current)
  }
}

async function uploadFile(job, filePath) {
  const target = config.targets.find(t => t.id === job.targetId)
  if (!target) throw new Error('目标不存在')
  const relative = path.relative(job.localPath, filePath).split(path.sep).join('/')
  const remote = `${(job.remotePath || '/').replace(/\/$/, '')}/${relative}`
  const client = makeClient(target)
  await ensureRemoteDir(client, path.posix.dirname(remote))
  await client.putFileContents(remote, fs.readFileSync(filePath), { overwrite: true })
  addLog({ jobId: job.id, type: 'success', file: relative, at: new Date().toISOString() })
}

async function uploadWithRetry(job, file) {
  const retries = Number(config.policy.retries) || 0
  for (let attempt = 0; attempt <= retries; attempt++) {
    try { await uploadFile(job, file); return true } catch (e) {
      if (attempt === retries) { addLog({ jobId: job.id, type: 'error', file: path.basename(file), error: e.message, at: new Date().toISOString() }); return false }
      await new Promise(r => setTimeout(r, (attempt + 1) * 1200))
    }
  }
}

function listFiles(dir, ignored) {
  const out = []
  const walk = d => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const full = path.join(d, e.name)
      if (ignored(full)) continue
      if (e.isDirectory()) walk(full); else out.push(full)
    }
  }
  walk(dir)
  return out
}

// Full scan uploads files changed since the last successful scan of this job.
async function scanJob(job, { force = false } = {}) {
  if (!fs.existsSync(job.localPath)) throw new Error(`本地目录不存在：${job.localPath}`)
  const since = force ? 0 : (job.lastScanAt || 0)
  const files = listFiles(job.localPath, ignoreMatcher()).filter(f => fs.statSync(f).mtimeMs > since)
  const started = Date.now()
  const limit = Math.max(1, Number(config.policy.concurrency) || 1)
  let index = 0, uploaded = 0
  await Promise.all(Array.from({ length: limit }, async () => {
    while (index < files.length) { const f = files[index++]; if (await uploadWithRetry(job, f)) uploaded++ }
  }))
  job.lastScanAt = started
  saveConfig()
  addLog({ jobId: job.id, type: 'success', file: job.name, message: `扫描完成 · 上传 ${uploaded}/${files.length} 个文件`, at: new Date().toISOString() })
  return uploaded
}

function stopJob(id) {
  const watcher = watchers.get(id); if (watcher) { watcher.close(); watchers.delete(id) }
  const timer = scanTimers.get(id); if (timer) { clearInterval(timer); scanTimers.delete(id) }
}

function startJob(job) {
  stopJob(job.id)
  if (!job.localPath || !fs.existsSync(job.localPath)) { addLog({ jobId: job.id, type: 'error', error: `本地目录不存在：${job.localPath}`, at: new Date().toISOString() }); return }
  const ignored = ignoreMatcher()
  if (config.policy.watch !== false) {
    const watcher = chokidar.watch(job.localPath, { ignored, ignoreInitial: true, awaitWriteFinish: { stabilityThreshold: 700, pollInterval: 100 } })
    const queue = new Set(); let timer
    const flush = async () => { const files = [...queue]; queue.clear(); for (const f of files) await uploadWithRetry(job, f) }
    const enqueue = file => { if (fs.existsSync(file) && fs.statSync(file).isFile()) { queue.add(file); clearTimeout(timer); timer = setTimeout(flush, config.policy.debounceMs || 1000) } }
    watcher.on('add', enqueue).on('change', enqueue).on('error', error => addLog({ jobId: job.id, type: 'error', error: error.message, at: new Date().toISOString() }))
    watchers.set(job.id, watcher)
  }
  const minutes = Number(config.policy.scanMinutes) || 0
  if (minutes > 0) scanTimers.set(job.id, setInterval(() => scanJob(job).catch(e => addLog({ jobId: job.id, type: 'error', error: e.message, at: new Date().toISOString() })), minutes * 60000))
}

function syncAll({ initial = false } = {}) {
  for (const id of [...watchers.keys(), ...scanTimers.keys()]) stopJob(id)
  for (const job of config.jobs.filter(j => j.enabled !== false)) {
    startJob(job)
    if (initial && config.policy.scanOnStart !== false && fs.existsSync(job.localPath || '')) scanJob(job).catch(e => addLog({ jobId: job.id, type: 'error', error: e.message, at: new Date().toISOString() }))
  }
}

function createWindow() {
  win = new BrowserWindow({ width: 1440, height: 900, minWidth: 980, minHeight: 680, backgroundColor: '#f5f2eb', title: 'Webdev Sync', webPreferences: { preload: path.join(__dirname, 'preload.cjs'), contextIsolation: true, nodeIntegration: false } })
  win.removeMenu()
  win.webContents.on('did-fail-load', (_e, code, desc, url) => fileLog(`[renderer] did-fail-load ${code} ${desc} ${url}`))
  win.webContents.on('render-process-gone', (_e, details) => fileLog(`[renderer] gone ${details.reason}`))
  if (process.env.VITE_DEV_SERVER_URL) win.loadURL(process.env.VITE_DEV_SERVER_URL)
  else win.loadFile(path.join(app.getAppPath(), 'dist', 'index.html'))
  // Closing the window hides it; syncing continues from the tray.
  win.on('close', event => { if (!app.isQuitting && tray) { event.preventDefault(); win.hide() } })
}

let tray
function showWindow() { if (!win) return; if (win.isMinimized()) win.restore(); win.show(); win.focus() }
function createTray() {
  try {
    tray = new Tray(nativeImage.createFromPath(path.join(__dirname, 'tray.png')))
    tray.setToolTip('Webdev Sync')
    tray.setContextMenu(Menu.buildFromTemplate([
      { label: '打开 Webdev Sync', click: showWindow },
      { type: 'separator' },
      { label: '退出', click: () => { app.isQuitting = true; app.quit() } },
    ]))
    tray.on('click', showWindow)
  } catch (error) { tray = null; fileLog(`[tray] ${error.stack || error}`) }
}

if (!app.requestSingleInstanceLock()) app.quit()
else {
  app.on('second-instance', showWindow)
  app.whenReady().then(() => { loadConfig(); createWindow(); createTray(); syncAll({ initial: true }) })
  app.on('before-quit', () => { app.isQuitting = true })
  app.on('window-all-closed', () => { if (!tray) app.quit() })
}

ipcMain.handle('config:get', () => ({ ...config, logs }))
ipcMain.handle('dialog:pick-folder', async () => {
  const result = await dialog.showOpenDialog(win, { properties: ['openDirectory'] })
  return result.canceled ? null : result.filePaths[0]
})
ipcMain.handle('config:save', (_, next) => {
  config = { ...config, ...next, policy: { ...config.policy, ...(next.policy || {}) } }
  if (next.jobs) {
    // Keep scan bookkeeping that the renderer does not know about.
    const old = new Map((config.jobs || []).map(j => [j.id, j]))
    config.jobs = next.jobs.map(j => ({ ...old.get(j.id), ...j }))
  }
  saveConfig(); syncAll(); return config
})
ipcMain.handle('logs:clear', () => { logs = []; return true })
ipcMain.handle('target:test', async (_, id) => {
  const target = config.targets.find(t => t.id === id)
  if (!target) throw new Error('目标不存在，请先保存')
  await makeClient(target).getDirectoryContents('/')
  return { ok: true }
})
ipcMain.handle('jobs:start', (_, id) => { const job = config.jobs.find(j => j.id === id); if (job) startJob(job); return true })
ipcMain.handle('jobs:stop', (_, id) => { stopJob(id); return true })
ipcMain.handle('sync:once', async (_, id) => {
  const job = config.jobs.find(j => j.id === id)
  if (!job) throw new Error('任务不存在')
  return scanJob(job, { force: true })
})
