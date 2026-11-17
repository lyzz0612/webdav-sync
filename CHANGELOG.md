# 更新日志

本项目的所有重要变更都记录在此文件中。

格式遵循 [Keep a Changelog 1.1.0](https://keepachangelog.com/zh-CN/1.1.0/)，版本号遵循 [语义化版本 2.0.0](https://semver.org/lang/zh-CN/)。

## [Unreleased]

### 新增

- 发布流水线自动更新 `CHANGELOG.md`：把 `[Unreleased]` 归档为新版本小节（为空时按 Conventional Commits 生成），并用该小节作为 GitHub Release 说明。

## [0.1.0] - 2026-11-17

首个发布版本：Windows 桌面端 WebDAV 单向文档同步工具，把本地目录的变更上传到 WebDAV 远程目录（如 123 网盘）。

### 新增

- WebDAV 目标管理：添加、编辑、删除目标，支持测试连接；可配置多个目标，供不同任务使用。
- 同步任务：把本地目录映射到指定目标的远程目录，可单独启用、暂停或立即同步。
- 文件监听：基于 chokidar 监听本地文件变化，等待写入稳定后自动上传。
- 扫描补偿：启动时扫描未同步的变更，并支持每 5/15/30 分钟定时扫描（可关闭）。
- 上传队列：可配置并发数（2/3/5 个文件）和失败重试次数（0/3/5 次）。
- 忽略规则：支持 `*`、`?` 通配符，匹配到的文件不上传。
- 运行日志：按全部、成功、失败筛选，可清空；顶栏在有失败记录时显示提醒。
- 系统托盘：关闭窗口后隐藏到托盘，同步继续在后台运行。
- 配置与主进程日志保存在本机用户数据目录（`webdev-sync.json`、`main.log`）。
- Windows 打包：通过 electron-builder 生成 NSIS 安装包和便携版。
- 发布流水线：GitHub Actions 在 `package.json` 版本号变化且对应 tag 不存在时，构建并发布 GitHub Release（安装包 + 便携 zip）。

### 修复

- CI 中 `pnpm install` 允许执行 electron 与 esbuild 的构建脚本，避免依赖安装后缺少二进制文件。

[Unreleased]: https://github.com/lyzz0612/webdav-sync/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/lyzz0612/webdav-sync/releases/tag/v0.1.0
