<div align="center">
  <h1>Aemeath</h1>
  <p><strong>朝朝听雨 · Notes on technology, projects, and everyday life</strong></p>
  <p>
    <a href="https://rainzt.cn/">Visit the blog</a> ·
    <a href="https://github.com/Jarvis0227/Aemeath">GitHub repository</a> ·
    <a href="https://github.com/Jarvis0227/Aemeath/issues">Report an issue</a>
  </p>
  <p>
    <img src="https://img.shields.io/badge/Astro-7-BC52EE?logo=astro&logoColor=white" alt="Astro 7">
    <img src="https://img.shields.io/badge/Aemeath-V4.1.9-4A67D6" alt="Aemeath V4.1.9">
    <img src="https://img.shields.io/badge/Svelte-UI-FF3E00?logo=svelte&logoColor=white" alt="Svelte">
    <img src="https://img.shields.io/badge/Node.js-%3E%3D22-339933?logo=node.js&logoColor=white" alt="Node.js 22+">
    <img src="https://img.shields.io/badge/pnpm-%3E%3D9-F69220?logo=pnpm&logoColor=white" alt="pnpm 9+">
    <img src="https://img.shields.io/github/license/Jarvis0227/Aemeath" alt="License">
  </p>
  <p><a href="README.md">简体中文</a> · <a href="README.en.md">English</a></p>
</div>

<p align="center">
  <img src="./public/index.png" alt="Preview of the 朝朝听雨 blog homepage" width="100%">
</p>

<p align="center">
  <a href="#about">About</a> ·
  <a href="#features">Features</a> ·
  <a href="#quick-start">Quick start</a> ·
  <a href="#content-and-configuration">Content and configuration</a> ·
  <a href="#repository-layout">Repository layout</a> ·
  <a href="#credits-and-license">Credits and license</a>
</p>

## About

Aemeath is the source code for Rain’s personal blog, [rainzt.cn](https://rainzt.cn/). The site brings together technical notes, project updates, personal writing, and a collection of pages for links, galleries, and small tools.

It is built with **Astro**, uses **Svelte** for interactive components, and stores posts in Markdown / MDX. The public repository focuses on reusable site code and public content; deployment details and personal data are kept out of the repository.

## Features

<table>
  <tr>
    <td width="33%"><strong>✍️ Writing and reading</strong><br>Posts, categories, tags, archives, full-text search, RSS, and Markdown / MDX extensions.</td>
    <td width="33%"><strong>🧭 Personal pages</strong><br>About, projects, friend links, moments, guestbook, changelog, and useful tools.</td>
    <td width="33%"><strong>🖼️ Interests</strong><br>Gallery, anime tracking, wallpapers, and images or media embedded in posts.</td>
  </tr>
  <tr>
    <td><strong>🎛️ Browsing experience</strong><br>Responsive layouts, light and dark themes, sidebar and display settings, and reading progress.</td>
    <td><strong>📊 Data pages</strong><br>Bill visualizations and public analytics pages; personal bill records are omitted from this repository.</td>
    <td><strong>📝 Content workflow</strong><br>A local post editor for preparing and reviewing Markdown content before publication.</td>
  </tr>
</table>

## Technology

| Part | Purpose |
| --- | --- |
| Astro | Page routing, static generation, and content collections |
| Svelte | Search, settings panels, and other interactive components |
| TypeScript | Site configuration and component logic |
| Markdown / MDX | Posts and special-page content |
| Pagefind | Build-time full-text search index |

## Quick start

Requirements: **Node.js 22 or later** and **pnpm 9 or later**.

~~~bash
git clone https://github.com/Jarvis0227/Aemeath.git
cd Aemeath
pnpm install
pnpm dev
~~~

The development server runs at <code>http://localhost:4321</code> by default.

### Common commands

| Command | Description |
| --- | --- |
| <code>pnpm dev</code> | Start the local development server |
| <code>pnpm check</code> | Check Astro pages, content, and types |
| <code>pnpm type-check</code> | Run TypeScript checks |
| <code>pnpm build</code> | Build the site, search index, and optimized assets |
| <code>pnpm preview</code> | Preview the production build |
| <code>pnpm new-post</code> | Create a post |
| <code>pnpm post-studio</code> | Start the local post editor |

## Content and configuration

### Add a post

Posts live in <code>src/content/posts/</code> and can be written in Markdown or MDX. Here is a minimal frontmatter example:

~~~yaml
---
title: My first post
published: 2025-01-01
description: A short description of the post
image: ""
tags: [Notes]
category: Journal
draft: true
---
~~~

Set <code>draft</code> to <code>false</code> when the post is ready, then run <code>pnpm build</code> to inspect the generated site.

### Configuration entry points

| File | Purpose |
| --- | --- |
| <code>src/config/siteConfig.ts</code> | Site name, language, feature switches, and other basics |
| <code>src/config/navBarConfig.ts</code> | Navigation items and page links |
| <code>src/config/profileConfig.ts</code> | Profile and sidebar content |
| <code>src/config/backgroundWallpaper.ts</code> | Background and wallpaper options |
| <code>src/config/commentConfig.ts</code> | Comment system type and connection settings |
| <code>src/config/analyticsConfig.ts</code> | Analytics service settings |
| <code>src/data/billsSummary.json</code> | Template data for the bills page |

Comment and analytics integrations start with empty settings. Add your own service details when deploying. The bills file is an empty template; check that no personal transactions or service secrets are included before committing your own data.

## Repository layout

~~~text
src/
├── config/       Site configuration
├── content/      Posts and special-page content
├── components/   Astro and Svelte components
├── layouts/      Page layouts
├── pages/        Pages and API routes
├── styles/       Global and component styles
└── data/         Site data templates
public/           Static assets served directly
scripts/          Build and content utilities
docs/licenses/    Third-party licenses and copyright notices
~~~

## Public repository

The repository keeps reusable site code, public content, and static assets. Deployment-provider configuration, server operations, comment-service server code, host details, and credentials are managed by the deployment environment and should not be committed here. The public copy has empty comment and analytics connections and uses a template for bills data.

## Credits and license

My blog source code is open in Aemeath. This site continues the work of the original authors through further customization of CuteLeaf’s Firefly theme, and I would like to thank them here.

Aemeath also builds on the upstream [Fuwari](https://github.com/saicaca/fuwari) project. Copyright and license notices are listed in [LICENSE](LICENSE) and <code>docs/licenses/</code>.

Firefly assets depicting the character Firefly from *Honkai: Star Rail* remain the property of miHoYo, the game’s developer. Review the applicable notices before using or redistributing code or assets.