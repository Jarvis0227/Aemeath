<div align="center">
  <h1>Aemeath</h1>
  <p><strong>朝朝听雨 · 物物而不物于物，念念而不念于念</strong></p>
  <p>基于 Astro 7 的个人博客，提供 Aemeath 与 Pure 两套主题。</p>
  <p>
    <a href="https://rainzt.cn/">访问博客</a> ·
    <a href="https://github.com/Jarvis0227/Aemeath">GitHub 仓库</a> ·
    <a href="https://github.com/Jarvis0227/Aemeath/issues">反馈问题</a>
  </p>
  <p>
    <a href="https://astro.build/"><img src="https://img.shields.io/badge/Astro-7-BC52EE?logo=astro&logoColor=white" alt="Astro 7"></a>
    <img src="https://img.shields.io/badge/Aemeath-V4.3.0-4A67D6" alt="Aemeath V4.3.0">
    <a href="https://svelte.dev/"><img src="https://img.shields.io/badge/Svelte-UI-FF3E00?logo=svelte&logoColor=white" alt="Svelte UI"></a>
    <img src="https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white" alt="TypeScript">
    <img src="https://img.shields.io/badge/Node.js-%3E%3D22.12-339933?logo=node.js&logoColor=white" alt="Node.js 22.12+">
    <img src="https://img.shields.io/badge/pnpm-9-F69220?logo=pnpm&logoColor=white" alt="pnpm 9">
    <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-97CA00" alt="MIT License"></a>
  </p>
  <p><strong>简体中文</strong> · <a href="README.en.md">English</a></p>
</div>

<p align="center">
  <a href="#双主题预览">双主题预览</a> ·
  <a href="#功能一览">功能一览</a> ·
  <a href="#快速开始">快速开始</a> ·
  <a href="#内容与配置">内容与配置</a> ·
  <a href="#仓库结构">仓库结构</a> ·
  <a href="#版权与致谢">版权与致谢</a>
</p>

## 双主题预览

### Aemeath · 壁纸、卡片与个人主页

全屏壁纸搭配个人介绍卡片、角色装饰和侧栏组件，保留博客的个性与氛围。

<p align="center">
  <a href="https://rainzt.cn/?siteTheme=aemeath">
    <img src="docs/images/home-aemeath.png" alt="Aemeath 主题主页：全屏壁纸、个人介绍卡片、顶部导航与角色装饰" width="100%">
  </a>
</p>

<p align="center"><a href="https://rainzt.cn/?siteTheme=aemeath">查看 Aemeath 主题 →</a></p>

### Pure · 简洁导航与文章阅读

以留白、文章列表和轻边框卡片组织内容，配合简洁导航、个人资料与最新评论侧栏。

<p align="center">
  <a href="https://rainzt.cn/?siteTheme=pure">
    <img src="docs/images/home-pure.png" alt="Pure 主题主页：简洁导航、文章列表、渐隐封面与个人资料侧栏" width="100%">
  </a>
</p>

<p align="center"><a href="https://rainzt.cn/?siteTheme=pure">查看 Pure 主题 →</a></p>

| | Aemeath | Pure |
| --- | --- | --- |
| 主页 | 壁纸与个人介绍，卡片式内容区 | 文章列表，简介与封面 |
| 布局 | 多侧栏与装饰组件 | 简洁导航与阅读侧栏 |
| 外观 | 壁纸、色相、卡片与显示偏好 | 留白、轻边框与正文层次 |
| 共用内容 | 文章、页面、导航、评论和配置共用一套 | 切换主题后沿用相同内容与路由 |

导航栏中的“主题”入口可随时切换两套布局，主题选择与深浅色模式分别保存。默认主题在 [`src/config/siteThemeConfig.ts`](src/config/siteThemeConfig.ts) 中设置，更多说明见 [双主题文档](docs/site-themes.md)。

> 以上为作者线上博客的实景截图。截图中的文章、评论、访问统计和个人资料用于展示效果；开源版保留完整页面与组件，初始内容和服务连接使用空模板，方便添加自己的数据。

## 项目简介

Aemeath 是「朝朝听雨」的开源博客项目，对应线上站点 [rainzt.cn](https://rainzt.cn/)。它基于 **Astro 7、Svelte 和 TypeScript**，以 Markdown / MDX 管理内容，将文章阅读、个人展示和日常内容放在同一个站点中。

两套主题提供不同的浏览体验，文章与配置只需维护一份。你可以从空模板开始，替换头像、壁纸与站点资料，再逐步加入文章、友链、相册和其他页面内容。

## 功能一览

<table>
  <tr>
    <td width="33%"><strong>🎨 双主题与外观</strong><br>Aemeath / Pure 切换、深浅色、字体、色相、壁纸与响应式布局。</td>
    <td width="33%"><strong>✍️ 写作与阅读</strong><br>Markdown / MDX、分类、标签、归档、Pagefind 全文搜索、RSS 与阅读目录。</td>
    <td width="33%"><strong>🧭 个人页面</strong><br>关于、项目、友链、朋友圈、留言板、工具与更新日志。</td>
  </tr>
  <tr>
    <td><strong>🖼️ 兴趣与记录</strong><br>相册、追番、音乐、赞助与账单可视化，按自己的需要填写内容。</td>
    <td><strong>💬 评论与站点数据</strong><br>评论系统、表情与标签展示、访问统计、友链响应探测及状态展示。</td>
    <td><strong>📝 本地内容维护</strong><br>文章脚手架、本地编辑工具、内容类型检查、图片与字体处理、静态构建。</td>
  </tr>
</table>

评论、统计及部分状态展示需要配置自己的服务。未配置时，相关页面保留说明或空状态。

## 快速开始

环境要求：**Node.js 22.12 或更高版本**、**pnpm 9**。

```sh
git clone https://github.com/Jarvis0227/Aemeath.git
cd Aemeath
pnpm install
pnpm dev
```

开发服务器默认运行在 `http://localhost:4321`。首次启动后，先填写站点资料，再创建自己的第一篇文章。

### 常用命令

| 命令 | 用途 |
| --- | --- |
| `pnpm dev` | 启动本地开发服务器 |
| `pnpm new-post <文件名>` | 在 `src/content/posts/` 创建文章 |
| `pnpm post-studio` | 启动本地文章编辑工具 |
| `pnpm check` | 运行 Astro 诊断并同步内容类型 |
| `pnpm type-check` | 运行 TypeScript 检查 |
| `pnpm build` | 生成网站、优化资源和 Pagefind 搜索索引 |
| `pnpm preview` | 预览生产构建 |
| `pnpm friend-latency` | 生成友链响应探测快照 |

## 内容与配置

### 先配置自己的站点

| 配置入口 | 用途 |
| --- | --- |
| [`siteConfig.ts`](src/config/siteConfig.ts) | 标题、域名、语言、建站日期与页面开关 |
| [`profileConfig.ts`](src/config/profileConfig.ts) | 昵称、头像、简介与社交链接 |
| [`siteThemeConfig.ts`](src/config/siteThemeConfig.ts) | 默认主题与主题切换开关 |
| [`navBarConfig.ts`](src/config/navBarConfig.ts) | 导航名称、顺序与菜单 |
| [`backgroundWallpaper.ts`](src/config/backgroundWallpaper.ts)、[`fontConfig.ts`](src/config/fontConfig.ts) | 壁纸、背景视频与字体 |
| [`friendsConfig.ts`](src/config/friendsConfig.ts)、[`galleryConfig.ts`](src/config/galleryConfig.ts) | 友链、RSS 与相册 |
| [`commentConfig.ts`](src/config/commentConfig.ts)、[`analyticsConfig.ts`](src/config/analyticsConfig.ts) | 评论与访问统计服务 |
| [`serviceConfig.ts`](src/config/serviceConfig.ts) | 可选的服务器状态、友链状态、评论标签、管理入口与位置服务 |
| [`footerConfig.ts`](src/config/footerConfig.ts)、[`FooterConfig.html`](src/config/FooterConfig.html) | 页脚内容与备案链接 |
| [`musicConfig.ts`](src/config/musicConfig.ts)、[`sponsorConfig.ts`](src/config/sponsorConfig.ts) | 音乐列表与赞助方式 |
| [`billsSummary.json`](src/data/billsSummary.json) | 账单数据模板 |

将 `site_url` 从 `https://example.com` 改为自己的域名，并设置自己的建站日期。关于、友链与留言板的独立内容位于 [`src/content/spec/`](src/content/spec/)，关于页项目和工具页列表也可自行填写。

### 添加第一篇文章

运行 `pnpm new-post my-first-post.md`，然后在 [`src/content/posts/`](src/content/posts/) 中编写 Markdown 或 MDX。一个最小 frontmatter 示例：

```yaml
---
title: 我的第一篇文章
published: 2026-10-29
description: 用一句话介绍文章内容
image: ""
tags: [随笔]
category: 日常
draft: true
---
```

准备发布时，将 `draft` 改为 `false`，运行 `pnpm check`、`pnpm type-check` 和 `pnpm build` 检查生成结果。文章场景组件保留动画结构，文字与图片可通过组件属性提供。

### 接入服务与数据

评论和统计默认关闭，在对应配置文件中填写自己的服务信息后启用。`serviceConfig.ts` 的地址默认留空；自定义评论标签、友链状态等功能需要兼容的后端服务。

开源版中的文章、友链、相册、音乐列表和账单等使用空内容或模板。账单文件保留结构后填写自己的数据；构建产物、本地调试文件、评论服务端与部署运维环境由使用者单独管理。

## 仓库结构

```text
src/
├── config/       站点与主题配置
├── content/      文章与独立页面内容
├── components/   Astro 与 Svelte 组件
├── layouts/      页面布局
├── pages/        页面路由与静态 API
├── styles/       全局与组件样式
└── data/         站点数据模板
public/           网站静态资源
scripts/          构建与内容辅助工具
docs/
├── images/       README 主题预览图
└── licenses/     第三方许可与版权说明
```

## 版权与致谢

Aemeath 在 [CuteLeaf / Firefly](https://github.com/CuteLeaf/Firefly) 与 [saicaca / Fuwari](https://github.com/saicaca/fuwari) 的基础上继续开发，感谢原作者与贡献者。Pure 布局参考并适配 [Astro Theme Pure](https://github.com/cworld1/astro-theme-pure)，保留其 [Apache-2.0 许可声明](docs/licenses/astro-theme-pure-LICENSE.txt)。

项目代码许可见 [MIT License](LICENSE)，第三方声明见 [`docs/licenses/`](docs/licenses/)。角色、壁纸、音乐和其他第三方素材的权利属于对应权利人，使用与再分发时请分别核对其适用许可。
