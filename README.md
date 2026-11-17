<a id="readme-top"></a>

<!-- PROJECT SHIELDS -->
[![Release][release-shield]][release-url]
[![Release Workflow][workflow-shield]][workflow-url]
[![Issues][issues-shield]][issues-url]
[![Stargazers][stars-shield]][stars-url]

<!-- PROJECT LOGO -->
<br />
<div align="center">
  <a href="https://github.com/lyzz0612/webdav-sync">
    <img src="electron/tray.png" alt="Logo" width="64" height="64">
  </a>

  <h3 align="center">Webdev Sync</h3>

  <p align="center">
    Windows 桌面端 WebDAV 单向同步工具：本地文件一改动，就自动上传到 WebDAV 远端目录。
    <br />
    <a href="#usage"><strong>查看使用说明 »</strong></a>
    <br />
    <br />
    <a href="https://github.com/lyzz0612/webdav-sync/releases/latest">下载最新版本</a>
    &middot;
    <a href="https://github.com/lyzz0612/webdav-sync/issues/new?labels=bug">报告问题</a>
    &middot;
    <a href="https://github.com/lyzz0612/webdav-sync/issues/new?labels=enhancement">功能建议</a>
  </p>
</div>

<!-- TABLE OF CONTENTS -->
<details>
  <summary>目录</summary>
  <ol>
    <li>
      <a href="#about-the-project">关于项目</a>
      <ul>
        <li><a href="#built-with">技术栈</a></li>
      </ul>
    </li>
    <li>
      <a href="#getting-started">快速开始</a>
      <ul>
        <li><a href="#prerequisites">环境要求</a></li>
        <li><a href="#installation">安装</a></li>
      </ul>
    </li>
    <li><a href="#usage">使用说明</a></li>
    <li><a href="#roadmap">路线图</a></li>
    <li><a href="#contributing">参与贡献</a></li>
    <li><a href="#license">许可证</a></li>
    <li><a href="#contact">联系方式</a></li>
    <li><a href="#acknowledgments">致谢</a></li>
  </ol>
</details>

<!-- ABOUT THE PROJECT -->
<a id="about-the-project"></a>
## 关于项目

Webdev Sync 把本地目录映射到 WebDAV 远端路径，只做**本地 → 远端**的单向覆盖上传。它最初为 123 网盘的 WebDAV 接口编写，也适用于其他标准 WebDAV 服务。

主要功能：

* **多目标、多任务**：可以配置多个 WebDAV 目标，每个同步任务把一个本地目录映射到某个目标下的远端目录。
* **实时监听**：用 chokidar 监听新增和修改的文件。文件写入稳定 700 ms 后加入队列，队列防抖 1 秒后上传。
* **补偿扫描**：启动时扫描一次，之后每 5 / 15 / 30 分钟定时扫描（可关闭），上传修改时间晚于上次扫描的文件。
* **上传队列**：可设置并发数（2 / 3 / 5）和失败重试次数（0 / 3 / 5），重试间隔逐次递增 1.2 秒。
* **忽略规则**：按文件名通配匹配，默认忽略 `~$*`、`*.tmp`、`*.part`、`.DS_Store`。
* **托盘常驻**：关闭窗口只是隐藏，同步继续在后台运行；从托盘菜单退出程序。只允许运行一个实例。

> [!NOTE]
> 本地删除的文件**不会**同步删除远端文件；删除同步任务也不会动远端文件。

<p align="right">(<a href="#readme-top">返回顶部</a>)</p>

<a id="built-with"></a>
### 技术栈

* [![Electron][Electron-shield]][Electron-url]
* [![Vite][Vite-shield]][Vite-url]
* [![JavaScript][JS-shield]][JS-url]
* [webdav](https://github.com/perry-mitchell/webdav-client)：WebDAV 客户端
* [chokidar](https://github.com/paulmillr/chokidar)：文件监听
* [electron-builder](https://www.electron.build/)：打包 NSIS 安装包与便携版

<p align="right">(<a href="#readme-top">返回顶部</a>)</p>

<!-- GETTING STARTED -->
<a id="getting-started"></a>
## 快速开始

普通用户直接到 [Releases](https://github.com/lyzz0612/webdav-sync/releases/latest) 下载即可：

* `Webdev-Sync-<版本>-x64.exe`：NSIS 安装包，可以选择安装目录，会创建桌面和开始菜单快捷方式。
* `Webdev-Sync-<版本>-portable-x64.zip`：免安装版，解压后运行 `Webdev Sync.exe`。

下面是从源码运行和打包的步骤。

<a id="prerequisites"></a>
### 环境要求

* Windows 10 / 11 x64
* Node.js 22 或更高版本（CI 使用 22）
* pnpm 12（与 CI 和 `pnpm-lock.yaml` 保持一致）
  ```sh
  npm install -g pnpm@12
  ```

<a id="installation"></a>
### 安装

1. 克隆仓库
   ```sh
   git clone https://github.com/lyzz0612/webdav-sync.git
   cd webdav-sync
   ```
2. 安装依赖。`electron`、`electron-winstaller`、`esbuild` 的安装脚本已在 `pnpm-workspace.yaml` 的 `allowBuilds` 中放行。
   ```sh
   pnpm install
   ```
3. 开发模式运行：先启动 Vite 开发服务器（`127.0.0.1:5173`），再启动 Electron。
   ```sh
   pnpm run desktop:dev
   ```
   只调界面时可以运行 `pnpm run dev`，在浏览器中预览。浏览器预览模式下无法测试连接，也无法同步。
4. 打包 Windows 版本，产物输出到 `release/`
   ```sh
   pnpm run dist:installer   # 只打 NSIS 安装包
   pnpm run dist:dir         # 只生成 win-unpacked 目录
   pnpm run dist             # NSIS + portable
   ```
   也可以使用脚本 `scripts\build-windows.bat [installer|portable|dir|all]`。

<p align="right">(<a href="#readme-top">返回顶部</a>)</p>

<!-- USAGE EXAMPLES -->
<a id="usage"></a>
## 使用说明

1. **添加 WebDAV 目标**：进入「WebDAV 目标」，填写名称、WebDAV 地址（例如 `https://webdav.123pan.cn/webdav`）、用户名和密码，保存后点「测试连接」。
2. **新建同步任务**：进入「同步文件夹」，选择本地目录、WebDAV 目标和远端目录（例如 `/产品文档`）。勾选「启用」后，任务会开始监听文件变化，并按设定的间隔定时扫描。远端缺少的目录会逐级自动创建。
3. **立即同步**：点击任务上的刷新按钮，会忽略上次扫描时间，把目录下所有未被忽略的文件全量上传一遍。
4. **调整策略**：在「同步策略」中设置监听、启动扫描、定时扫描间隔、并发数、重试次数和忽略规则。保存后会立即对所有任务生效。
5. **查看日志**：「运行日志」显示最近 500 条上传和失败记录，可以按成功或失败筛选。

### 数据位置

配置和日志保存在 Electron 的 `userData` 目录中，打包版一般是 `%APPDATA%\Webdev Sync\`：

| 文件 | 内容 |
| --- | --- |
| `webdev-sync.json` | WebDAV 目标、同步任务、同步策略、各任务的上次扫描时间 |
| `main.log` | 主进程未捕获的异常、渲染进程加载失败、托盘创建失败等 |

> [!WARNING]
> WebDAV 密码以明文形式保存在 `webdev-sync.json` 中，不要把这个文件分享或提交到任何地方。

### 发布新版本

修改 `package.json` 中的 `version` 并推送到 `master`。[Release 工作流](.github/workflows/release.yml)检测到 `v<version>` 这个 tag 还不存在时，会在 Windows runner 上构建，并发布带安装包和便携版的 GitHub Release；tag 已存在则跳过。

<p align="right">(<a href="#readme-top">返回顶部</a>)</p>

<!-- ROADMAP -->
<a id="roadmap"></a>
## 路线图

- [x] 多目标、多任务的单向上传
- [x] 文件监听 + 启动扫描 + 定时补偿扫描
- [x] 托盘常驻、单实例运行
- [x] GitHub Actions 自动发布 Windows 安装包和便携版
- [ ] 远端删除同步（配置中已预留 `remoteDelete`，尚未实现）
- [ ] 加密保存 WebDAV 密码
- [ ] 自定义应用图标（`build/icon.ico`）

完整的需求和已知问题见 [open issues](https://github.com/lyzz0612/webdav-sync/issues)。

<p align="right">(<a href="#readme-top">返回顶部</a>)</p>

<!-- CONTRIBUTING -->
<a id="contributing"></a>
## 参与贡献

欢迎提交 Issue 和 Pull Request。

1. Fork 本项目
2. 创建功能分支（`git checkout -b feature/AmazingFeature`）
3. 提交修改（`git commit -m 'Add some AmazingFeature'`）
4. 推送分支（`git push origin feature/AmazingFeature`）
5. 发起 Pull Request

<p align="right">(<a href="#readme-top">返回顶部</a>)</p>

<!-- LICENSE -->
<a id="license"></a>
## 许可证

暂未选择开源许可证。

<p align="right">(<a href="#readme-top">返回顶部</a>)</p>

<!-- CONTACT -->
<a id="contact"></a>
## 联系方式

lyzz0612 - [GitHub](https://github.com/lyzz0612)

项目地址：[https://github.com/lyzz0612/webdav-sync](https://github.com/lyzz0612/webdav-sync)

<p align="right">(<a href="#readme-top">返回顶部</a>)</p>

<!-- ACKNOWLEDGMENTS -->
<a id="acknowledgments"></a>
## 致谢

* [Best-README-Template](https://github.com/othneildrew/Best-README-Template)
* [webdav-client](https://github.com/perry-mitchell/webdav-client)
* [chokidar](https://github.com/paulmillr/chokidar)
* [electron-builder](https://www.electron.build/)
* [Img Shields](https://shields.io)

<p align="right">(<a href="#readme-top">返回顶部</a>)</p>

<!-- MARKDOWN LINKS & IMAGES -->
[release-shield]: https://img.shields.io/github/v/release/lyzz0612/webdav-sync.svg?style=for-the-badge
[release-url]: https://github.com/lyzz0612/webdav-sync/releases/latest
[workflow-shield]: https://img.shields.io/github/actions/workflow/status/lyzz0612/webdav-sync/release.yml?style=for-the-badge&label=release
[workflow-url]: https://github.com/lyzz0612/webdav-sync/actions/workflows/release.yml
[issues-shield]: https://img.shields.io/github/issues/lyzz0612/webdav-sync.svg?style=for-the-badge
[issues-url]: https://github.com/lyzz0612/webdav-sync/issues
[stars-shield]: https://img.shields.io/github/stars/lyzz0612/webdav-sync.svg?style=for-the-badge
[stars-url]: https://github.com/lyzz0612/webdav-sync/stargazers
[Electron-shield]: https://img.shields.io/badge/Electron-47848F?style=for-the-badge&logo=electron&logoColor=white
[Electron-url]: https://www.electronjs.org/
[Vite-shield]: https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white
[Vite-url]: https://vitejs.dev/
[JS-shield]: https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black
[JS-url]: https://developer.mozilla.org/docs/Web/JavaScript
