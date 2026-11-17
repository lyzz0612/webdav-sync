#!/usr/bin/env node
// 发版时更新 CHANGELOG.md（Keep a Changelog 格式）。
//
// 用法：node scripts/changelog.mjs <version> [date] [notesFile]
//   - 把 [Unreleased] 下的内容移到新的 [version] - date 小节，并更新底部比较链接。
//   - [Unreleased] 为空时，按 Conventional Commits 从上个 tag 以来的提交生成条目。
//   - CHANGELOG 里已有该版本小节时不再改写，只提取说明（便于重跑）。
//   - 把该版本的说明写入 notesFile（默认 release-notes.md），供 GitHub Release 使用。

import { readFileSync, writeFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'

const FILE = 'CHANGELOG.md'
const [version, dateArg, notesArg] = process.argv.slice(2)
const date = dateArg || new Date().toISOString().slice(0, 10)
const notesFile = notesArg || 'release-notes.md'
if (!/^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/.test(version || '')) {
  console.error('用法：node scripts/changelog.mjs <version> [date] [notesFile]')
  process.exit(1)
}

const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim()

const text = readFileSync(FILE, 'utf8').replace(/\r\n/g, '\n')
const linkRe = /^\[[^\]]+\]: \S+$/
const lines = text.split('\n')
while (lines.length && lines.at(-1) === '') lines.pop()
let linkStart = lines.length
while (linkStart > 0 && (linkRe.test(lines[linkStart - 1]) || lines[linkStart - 1] === '')) linkStart--
const body = lines.slice(0, linkStart).join('\n').replace(/\n+$/, '')
const links = lines.slice(linkStart).filter(l => linkRe.test(l))

// 按 "## [" 切分版本小节
const parts = body.split(/^(?=## \[)/m)
const head = parts[0]
const sections = parts.slice(1)
const sectionName = s => s.match(/^## \[([^\]]+)\]/)[1]
const sectionBody = s => s.replace(/^## .*\n?/, '').trim()

const existing = sections.find(s => sectionName(s) === version)
if (existing) {
  writeFileSync(notesFile, sectionBody(existing) + '\n')
  console.log(`CHANGELOG 已包含 ${version}，仅提取说明。`)
  process.exit(0)
}

const uIndex = sections.findIndex(s => sectionName(s) === 'Unreleased')
if (uIndex < 0) throw new Error('CHANGELOG.md 缺少 ## [Unreleased] 小节')
let notes = sectionBody(sections[uIndex])
if (!notes) notes = fromCommits()

const prev = sections.slice(uIndex + 1).map(sectionName)[0]
sections.splice(uIndex, 1, '## [Unreleased]\n\n', `## [${version}] - ${date}\n\n${notes}\n\n`)

// 比较链接
const repoUrl = process.env.GITHUB_REPOSITORY
  ? `${process.env.GITHUB_SERVER_URL || 'https://github.com'}/${process.env.GITHUB_REPOSITORY}`
  : (links.join('\n').match(/(https?:\/\/\S+?)\/(?:compare|releases)\//) || [])[1]
if (!repoUrl) throw new Error('无法确定仓库地址，请设置 GITHUB_REPOSITORY')
const newLinks = links.filter(l => !l.startsWith('[Unreleased]: ') && !l.startsWith(`[${version}]: `))
newLinks.unshift(
  `[Unreleased]: ${repoUrl}/compare/v${version}...HEAD`,
  prev ? `[${version}]: ${repoUrl}/compare/v${prev}...v${version}` : `[${version}]: ${repoUrl}/releases/tag/v${version}`
)

const out = (head + sections.join('')).replace(/\n{3,}/g, '\n\n').replace(/\n+$/, '') + '\n\n' + newLinks.join('\n') + '\n'
writeFileSync(FILE, out)
writeFileSync(notesFile, notes + '\n')
console.log(`CHANGELOG 已更新：${version} - ${date}`)

function fromCommits() {
  let range = 'HEAD'
  try { range = `${git('describe', '--tags', '--abbrev=0', '--match', 'v*')}..HEAD` } catch { /* 没有 tag，取全部提交 */ }
  const subjects = git('log', '--no-merges', '--pretty=format:%s', range).split('\n').filter(Boolean)
  const groups = { 新增: [], 变更: [], 修复: [] }
  for (const s of subjects) {
    const m = s.match(/^(\w+)(?:\(([^)]*)\))?(!)?:\s*(.+)$/)
    if (!m) continue
    const [, type, scope, breaking, desc] = m
    const group = type === 'feat' ? '新增' : type === 'fix' ? '修复' : ['perf', 'refactor'].includes(type) || breaking ? '变更' : null
    if (!group) continue
    groups[group].push(`- ${breaking ? '**不兼容**：' : ''}${scope ? `${scope}：` : ''}${desc}`)
  }
  const out = Object.entries(groups).filter(([, items]) => items.length).map(([k, items]) => `### ${k}\n\n${items.join('\n')}`)
  return out.length ? out.join('\n\n') : '### 变更\n\n- 内部维护与构建调整，无用户可见变更。'
}
