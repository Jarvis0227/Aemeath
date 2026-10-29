<div align="center">
  <h1>Aemeath</h1>
  <p><strong>朝朝听雨 · 物物而不物于物，念念而不念于念</strong></p>
  <p>A personal blog built with Astro 7, with Aemeath and Pure themes.</p>
  <p>
    <a href="https://rainzt.cn/">Visit the blog</a> ·
    <a href="https://github.com/Jarvis0227/Aemeath">GitHub</a> ·
    <a href="https://github.com/Jarvis0227/Aemeath/issues">Report an issue</a>
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
  <p><a href="README.md">简体中文</a> · <strong>English</strong></p>
</div>

<p align="center">
  <a href="#theme-previews">Theme previews</a> ·
  <a href="#features">Features</a> ·
  <a href="#getting-started">Getting started</a> ·
  <a href="#content-and-configuration">Configuration</a> ·
  <a href="#project-structure">Project structure</a> ·
  <a href="#license-and-credits">Credits</a>
</p>

## Theme previews

### Aemeath · Wallpapers, cards and a personal homepage

A full-screen wallpaper, an introduction card, character decorations and sidebar widgets give the homepage its own atmosphere.

<p align="center">
  <a href="https://rainzt.cn/?siteTheme=aemeath">
    <img src="docs/images/home-aemeath.png" alt="Aemeath homepage with a full-screen wallpaper, introduction card, top navigation and character decorations" width="100%">
  </a>
</p>

<p align="center"><a href="https://rainzt.cn/?siteTheme=aemeath">Explore Aemeath →</a></p>

### Pure · Simple navigation and a focus on reading

Whitespace, article previews and lightly bordered cards organize the page, with a profile and recent comments alongside the post list.

<p align="center">
  <a href="https://rainzt.cn/?siteTheme=pure">
    <img src="docs/images/home-pure.png" alt="Pure homepage with simple navigation, article previews, fading covers and a profile sidebar" width="100%">
  </a>
</p>

<p align="center"><a href="https://rainzt.cn/?siteTheme=pure">Explore Pure →</a></p>

| | Aemeath | Pure |
| --- | --- | --- |
| Homepage | Wallpaper, personal introduction and content cards | Article list with descriptions and covers |
| Layout | Multiple sidebars and decorative widgets | Simple navigation and a reading sidebar |
| Appearance | Wallpapers, hue, cards and display preferences | Whitespace, light borders and clear text hierarchy |
| Shared content | One set of posts, pages, navigation, comments and configuration | The same content and routes after switching themes |

Use the theme control in the navigation bar to switch layouts. Theme selection is saved separately from light/dark mode. Set the default in [`src/config/siteThemeConfig.ts`](src/config/siteThemeConfig.ts); see the [theme guide](docs/site-themes.md) for details.

> These screenshots show the author's live blog. Posts, comments, visitor counts and profile details illustrate the finished site. The public edition keeps the pages and components, with empty content templates and service connections ready for your own data.

## About

Aemeath is the open-source project behind Rain's personal blog, [rainzt.cn](https://rainzt.cn/). Built with **Astro 7, Svelte and TypeScript**, it brings writing, a personal homepage and everyday collections into one site, with content stored in Markdown / MDX.

Both themes use the same posts and configuration. Start with the empty template, replace the profile and wallpapers, then add your posts, friends, albums and other page content.

## Features

<table>
  <tr>
    <td width="33%"><strong>🎨 Themes and appearance</strong><br>Aemeath / Pure switching, light and dark modes, fonts, hue, wallpapers and responsive layouts.</td>
    <td width="33%"><strong>✍️ Writing and reading</strong><br>Markdown / MDX, categories, tags, archives, Pagefind search, RSS and article navigation.</td>
    <td width="33%"><strong>🧭 Personal pages</strong><br>About, projects, friends, friend feeds, guestbook, tools and changelogs.</td>
  </tr>
  <tr>
    <td><strong>🖼️ Collections and records</strong><br>Galleries, anime tracking, music, sponsorship and bill charts, ready for your own content.</td>
    <td><strong>💬 Comments and site data</strong><br>Comment providers, emoji and label displays, analytics, friend-response probes and status displays.</td>
    <td><strong>📝 Local authoring</strong><br>Post scaffolding, a local editor, content checks, image and font processing, and static builds.</td>
  </tr>
</table>

Comments, analytics and some status displays require your own services. Pages show configuration guidance or an empty state until those services are configured.

## Getting started

Requirements: **Node.js 22.12 or later** and **pnpm 9**.

```sh
git clone https://github.com/Jarvis0227/Aemeath.git
cd Aemeath
pnpm install
pnpm dev
```

The development server runs at `http://localhost:4321` by default. Configure your site profile, then create your first post.

### Commands

| Command | Purpose |
| --- | --- |
| `pnpm dev` | Start the development server |
| `pnpm new-post <filename>` | Create a post under `src/content/posts/` |
| `pnpm post-studio` | Start the local post editor |
| `pnpm check` | Run Astro diagnostics and synchronize content types |
| `pnpm type-check` | Run TypeScript checks |
| `pnpm build` | Build the site, optimized assets and Pagefind index |
| `pnpm preview` | Preview the production build |
| `pnpm friend-latency` | Generate a friend-response snapshot |

## Content and configuration

### Make the site yours

| Configuration | Purpose |
| --- | --- |
| [`siteConfig.ts`](src/config/siteConfig.ts) | Title, domain, language, start date and page switches |
| [`profileConfig.ts`](src/config/profileConfig.ts) | Name, avatar, bio and social links |
| [`siteThemeConfig.ts`](src/config/siteThemeConfig.ts) | Default theme and theme-switch control |
| [`navBarConfig.ts`](src/config/navBarConfig.ts) | Navigation labels, order and menus |
| [`backgroundWallpaper.ts`](src/config/backgroundWallpaper.ts), [`fontConfig.ts`](src/config/fontConfig.ts) | Wallpapers, background video and fonts |
| [`friendsConfig.ts`](src/config/friendsConfig.ts), [`galleryConfig.ts`](src/config/galleryConfig.ts) | Friends, RSS and galleries |
| [`commentConfig.ts`](src/config/commentConfig.ts), [`analyticsConfig.ts`](src/config/analyticsConfig.ts) | Comments and analytics services |
| [`serviceConfig.ts`](src/config/serviceConfig.ts) | Optional server metrics, friend status, comment labels, administration and location services |
| [`footerConfig.ts`](src/config/footerConfig.ts), [`FooterConfig.html`](src/config/FooterConfig.html) | Footer content and registration links |
| [`musicConfig.ts`](src/config/musicConfig.ts), [`sponsorConfig.ts`](src/config/sponsorConfig.ts) | Music and sponsorship |
| [`billsSummary.json`](src/data/billsSummary.json) | Bill data template |

Replace `https://example.com` in `site_url` with your domain and set your own start date. Independent About, friends and guestbook content lives in [`src/content/spec/`](src/content/spec/). Fill in the About-page projects and tool lists as needed.

### Add your first post

Run `pnpm new-post my-first-post.md`, then write Markdown or MDX under [`src/content/posts/`](src/content/posts/). A minimal frontmatter example:

```yaml
---
title: My first post
published: 2026-10-29
description: A short introduction to this post
image: ""
tags: [Notes]
category: Journal
draft: true
---
```

Set `draft` to `false` when ready to publish, then run `pnpm check`, `pnpm type-check` and `pnpm build`. Article-scene components retain their animation structure and accept your own text and images through component properties.

### Connect services and add data

Comments and analytics are disabled by default. Configure your own services in their respective files to enable them. Endpoints in `serviceConfig.ts` are empty by default; custom comment labels, friend status and related features require a compatible backend.

Posts, friends, galleries, music and bill data start empty or as templates. Keep the bill file's structure when adding your own records. Build output, local debugging files, comment servers and deployment operations are managed separately.

## Project structure

```text
src/
├── config/       Site and theme configuration
├── content/      Posts and independent page content
├── components/   Astro and Svelte components
├── layouts/      Page layouts
├── pages/        Routes and static APIs
├── styles/       Global and component styles
└── data/         Site data templates
public/           Website static assets
scripts/          Build and authoring tools
docs/
├── images/       README theme previews
└── licenses/     Third-party licenses and notices
```

## License and credits

Aemeath builds on [CuteLeaf / Firefly](https://github.com/CuteLeaf/Firefly) and [saicaca / Fuwari](https://github.com/saicaca/fuwari). Thank you to the original authors and contributors. The Pure layouts adapt [Astro Theme Pure](https://github.com/cworld1/astro-theme-pure) and retain its [Apache-2.0 notice](docs/licenses/astro-theme-pure-LICENSE.txt).

See the [MIT License](LICENSE) for project code and [`docs/licenses/`](docs/licenses/) for third-party notices. Characters, wallpapers, music and other third-party assets remain subject to their respective rights and licenses.
