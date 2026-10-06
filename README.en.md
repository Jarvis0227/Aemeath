# Aemeath

> Source code for “朝朝听雨” (Rain), a personal blog at [rainzt.cn](https://rainzt.cn/)

[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D22-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![pnpm](https://img.shields.io/badge/pnpm-%3E%3D9-F69220?logo=pnpm&logoColor=white)](https://pnpm.io/)
[![Astro](https://img.shields.io/badge/Astro-7-BC52EE?logo=astro&logoColor=white)](https://astro.build/)
[![Aemeath](https://img.shields.io/badge/Aemeath-V4.1.6-4A67D6)](https://github.com/Jarvis0227/Aemeath)
[![License](https://img.shields.io/github/license/Jarvis0227/Aemeath)](LICENSE)

[Live site](https://rainzt.cn/) · [Repository](https://github.com/Jarvis0227/Aemeath) · [Report an issue](https://github.com/Jarvis0227/Aemeath/issues)

## About

Aemeath is the source code for Rain’s personal blog, “朝朝听雨”. It uses Astro to generate static pages and Svelte for interactive components, covering technical notes, project updates, and personal writing.

## Features

- Posts, archives, categories, tags, and full-text search
- About, projects, friend links, RSS feed snapshots, guestbook, bills, gallery, tools, and changelog pages
- Responsive layouts, dark mode, wallpapers, and display settings
- A Chinese-first multilingual interface
- Configurable comment and analytics integrations
- Markdown/MDX content with a local post editor

## Local development

Requirements:

- Node.js >= 22
- pnpm >= 9

Install dependencies and start the development server:

~~~bash
pnpm install
pnpm dev
~~~

Common commands:

~~~bash
pnpm check       # Astro page, content, and type diagnostics
pnpm type-check  # TypeScript checks
pnpm build       # Build the static site, search index, and optimized assets
pnpm preview     # Preview the production build
pnpm new-post    # Create a post
pnpm post-studio # Start the local post editor
~~~

## Repository layout

~~~text
src/config/       Site, navigation, sidebar, comment, and analytics config
src/content/      Posts and special-page content
src/components/   Astro / Svelte components
src/pages/        Pages and API routes
src/data/         Friend-feed snapshots and site data
public/           Static assets published directly
scripts/          Build and content utilities
~~~

Site configuration lives in src/config/. Posts use Markdown or MDX and belong in src/content/posts/.

## Public repository

The public repository contains reusable site source, public content, and static assets. Deployment-provider settings, server operations, comment-service server code, host details, and credentials should be managed by the target environment and kept out of the repository. The bills page uses an empty data template; do not commit personal transaction records.

## License

Aemeath is distributed under the [MIT License](LICENSE). License and copyright notices apply to their respective code and assets; review the third-party notices in docs/licenses/ before redistribution.

## Acknowledgements

Aemeath continues the [Firefly theme by CuteLeaf](https://github.com/CuteLeaf/Firefly), which builds on the upstream [Fuwari project](https://github.com/saicaca/fuwari). Thanks to the original authors and contributors. See [LICENSE](LICENSE) and `docs/licenses/` for the applicable copyright and license notices.

Firefly assets depicting the character Firefly from *Honkai: Star Rail* remain the property of miHoYo, the game's developer.
