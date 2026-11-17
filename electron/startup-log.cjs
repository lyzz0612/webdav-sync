const fs = require('node:fs')
const path = require('node:path')
const { app } = require('electron')
function writeStartupLog(message) {
  try { fs.appendFileSync(path.join(app.getPath('userData'), 'startup.log'), `${new Date().toISOString()} ${message}\n`) } catch {}
}
module.exports = { writeStartupLog }
