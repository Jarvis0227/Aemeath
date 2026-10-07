<div align="center">
  <h1>Aemeath</h1>
  <p><strong>朝朝听雨 · 物物而不物于物，念念而不念于念</strong></p>
  <p>
    <a href="https://rainzt.cn/">访问博客</a> ·
    <a href="https://github.com/Jarvis0227/Aemeath">GitHub 仓库</a> ·
    <a href="https://github.com/Jarvis0227/Aemeath/issues">反馈问题</a>
  </p>
  <p>
    <img src="https://img.shields.io/badge/Astro-7-BC52EE?logo=astro&logoColor=white" alt="Astro 7">
    <img src="https://img.shields.io/badge/Aemeath-V4.1.8-4A67D6" alt="Aemeath V4.1.8">
    <img src="https://img.shields.io/badge/Svelte-UI-FF3E00?logo=svelte&logoColor=white" alt="Svelte">
    <img src="https://img.shields.io/badge/Node.js-%3E%3D22-339933?logo=node.js&logoColor=white" alt="Node.js 22+">
    <img src="https://img.shields.io/badge/pnpm-%3E%3D9-F69220?logo=pnpm&logoColor=white" alt="pnpm 9+">
    <img src="https://img.shields.io/github/license/Jarvis0227/Aemeath" alt="License">
  </p>
  <p><a href="README.md">简体中文</a> · <a href="README.en.md">English</a></p>
</div>

<p align="center">
  <img src="./public/index.png" alt="朝朝听雨博客首页预览" width="100%">
</p>

<p align="center">
  <a href="#项目简介">项目简介</a> ·
  <a href="#功能一览">功能一览</a> ·
  <a href="#快速开始">快速开始</a> ·
  <a href="#内容与配置">内容与配置</a> ·
  <a href="#仓库结构">仓库结构</a> ·
  <a href="#版权与致谢">版权与致谢</a>
</p>

## 项目简介

Aemeath 是“朝朝听雨”（Rain）的个人博客源码，对应线上站点 [rainzt.cn](https://rainzt.cn/)。这里记录技术实践、项目进展与日常写作，也收纳友链、相册、工具等个人页面。

站点基于 **Astro** 构建，交互界面使用 **Svelte**，文章以 Markdown / MDX 管理。仓库以可复用的站点源码和公开内容为主；部署环境与个人数据不放进公开仓库。

## 功能一览

<table>
  <tr>
    <td width="33%"><strong>✍️ 写作与阅读</strong><br>文章、分类、标签、归档、全文搜索、RSS，以及 Markdown / MDX 扩展。</td>
    <td width="33%"><strong>🧭 个人页面</strong><br>关于、项目、友链、朋友圈、留言板、更新日志与实用工具。</td>
    <td width="33%"><strong>🖼️ 兴趣内容</strong><br>相册、追番页面、壁纸展示与文章内的图片和媒体内容。</td>
  </tr>
  <tr>
    <td><strong>🎛️ 浏览体验</strong><br>响应式布局、深浅色模式、侧栏与显示选项、页面阅读进度。</td>
    <td><strong>📊 数据页面</strong><br>账单可视化和公开统计页面；公开仓库中的个人数据为空模板。</td>
    <td><strong>📝 内容维护</strong><br>本地文章编辑工具，适合在发布前预览和整理 Markdown 内容。</td>
  </tr>
</table>

## 技术组成

| 部分 | 用途 |
| --- | --- |
| Astro | 页面路由、静态生成与内容集合 |
| Svelte | 搜索、设置面板及其他交互组件 |
| TypeScript | 站点配置和组件逻辑 |
| Markdown / MDX | 文章与特殊页面内容 |
| Pagefind | 构建时生成站内全文搜索 |

## 快速开始

环境要求：**Node.js 22 或更高版本**、**pnpm 9 或更高版本**。

~~~bash
git clone https://github.com/Jarvis0227/Aemeath.git
cd Aemeath
pnpm install
pnpm dev
~~~

开发服务器默认运行在 <code>http://localhost:4321</code>。

### 常用命令

| 命令 | 说明 |
| --- | --- |
| <code>pnpm dev</code> | 启动本地开发服务器 |
| <code>pnpm check</code> | 检查 Astro 页面、内容与类型 |
| <code>pnpm type-check</code> | 执行 TypeScript 检查 |
| <code>pnpm build</code> | 构建网站、搜索索引和优化资源 |
| <code>pnpm preview</code> | 预览生产构建 |
| <code>pnpm new-post</code> | 创建文章 |
| <code>pnpm post-studio</code> | 启动本地文章编辑工具 |

## 内容与配置

### 新建文章

文章位于 <code>src/content/posts/</code>，可以用 Markdown 或 MDX 编写。下面是一个最小 frontmatter 示例：

~~~yaml
---
title: 我的第一篇文章
published: 2025-01-01
description: 用一句话介绍文章内容
image: ""
tags: [随笔]
category: 日常
draft: true
---
~~~

准备发布时，将 <code>draft</code> 改为 <code>false</code>，再运行 <code>pnpm build</code> 检查生成结果。

### 站点配置入口

| 文件 | 配置内容 |
| --- | --- |
| <code>src/config/siteConfig.ts</code> | 站点名称、语言、功能开关等基础信息 |
| <code>src/config/navBarConfig.ts</code> | 导航项目与页面入口 |
| <code>src/config/profileConfig.ts</code> | 个人资料和侧栏展示 |
| <code>src/config/backgroundWallpaper.ts</code> | 背景与壁纸选项 |
| <code>src/config/commentConfig.ts</code> | 评论系统类型与连接参数 |
| <code>src/config/analyticsConfig.ts</code> | 访问统计服务参数 |
| <code>src/data/billsSummary.json</code> | 账单页面数据模板 |

评论和统计服务默认使用空配置；部署时请填写自己的服务信息。账单文件也是不含个人流水的空模板。添加数据后，提交前再次确认没有带入真实账单记录或服务密钥。

## 仓库结构

~~~text
src/
├── config/       站点配置
├── content/      文章与特殊页面
├── components/   Astro 与 Svelte 组件
├── layouts/      页面布局
├── pages/        页面与 API 路由
├── styles/       全局与组件样式
└── data/         站点数据模板
public/           直接发布的静态资源
scripts/          构建和内容辅助脚本
docs/licenses/    第三方许可证与版权说明
~~~

## 公开仓库说明

仓库保留可复用的站点源码、公开内容和静态资源。部署平台配置、服务器运维文件、评论服务端代码、主机信息和密钥由部署环境单独管理，不应提交到这里。公开版的评论与统计连接为空，账单数据使用模板。

## 版权与致谢

我的博客源码开源在 Aemeath。本站基于 CuteLeaf 的 Firefly 主题继续二次创作，也在这里向原作者致谢。

Aemeath 也承袭了上游 [Fuwari](https://github.com/saicaca/fuwari) 项目的工作，感谢所有原作者与贡献者。适用的版权声明和许可证见 [LICENSE](LICENSE) 与 <code>docs/licenses/</code>。

Firefly 主题中与《崩坏：星穹铁道》相关的流萤素材版权归游戏开发商[米哈游](https://www.mihoyo.com/)所有。使用或再分发仓库中的代码和素材前，请分别查看对应许可与版权说明。