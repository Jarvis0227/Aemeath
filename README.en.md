# Aemeath

[中文](README.md) · [English](README.en.md) · [Live example](https://rainzt.cn/) · [Issues](https://github.com/Jarvis0227/Aemeath/issues)

Aemeath V4.3.0 is a personal blog built with Astro 7, Svelte and TypeScript. This public edition keeps the pages, components and themes, with empty personal-data templates and disabled service connections.

## Getting started

Use Node.js 22.12 or later and pnpm 9.

```sh
git clone https://github.com/Jarvis0227/Aemeath.git
cd Aemeath
pnpm install
pnpm dev
```

Open `http://localhost:4321`. Run `pnpm new-post` to create your first post, or `pnpm post-studio` to open the local editor. Validate with `pnpm check`, `pnpm type-check` and `pnpm build`; preview with `pnpm preview`.

## Features and configuration

The Aemeath and Pure themes share posts, navigation and comments. Both support light and dark appearance. The site includes Markdown/MDX, search, RSS, archives, tags, friend feeds, galleries, anime tracking, guestbook, tools, sponsorship, analytics and bill charts.

Start with `src/config/siteConfig.ts`: replace `https://example.com` and the example start date. Set your identity in `profileConfig.ts`, choose a theme in `siteThemeConfig.ts`, and add posts under `src/content/posts/`. Edit the independent pages under `src/content/spec/`.

Add your own friend links in `friendsConfig.ts`, albums in `galleryConfig.ts`, registration links in `footerConfig.ts`, music in `musicConfig.ts`, and sponsorship options in `sponsorConfig.ts`. About-page projects and tool-page lists are empty and ready for your content. `src/data/billsSummary.json` is a zero-value template; preserve its structure when adding data.

Comments and analytics are disabled until configured in `commentConfig.ts` and `analyticsConfig.ts`. Optional server metrics, friend visibility, comment labels and administration URLs belong in `serviceConfig.ts`. These integrations require a compatible backend; this repository provides the frontend and excludes the author's backend and operations environment. Empty URLs do not connect to the author's services.

The source lives in `src/`, direct static assets in `public/`, build and authoring tools in `scripts/`, and third-party notices in `docs/licenses/`. See [the Chinese guide](README.md) for the full configuration table and [the theme guide](docs/site-themes.md) for theme behavior.

Do not commit private bills, contact details, credentials, environment files or deployment configurations. Personal posts, friend snapshots, deployment workflows and comment-server operations are excluded from this public edition.

## License and credits

Aemeath builds on [Firefly](https://github.com/CuteLeaf/Firefly) and [Fuwari](https://github.com/saicaca/fuwari). The Pure layouts retain the Apache-2.0 attribution for [Astro Theme Pure](https://github.com/cworld1/astro-theme-pure).

See [LICENSE](LICENSE) and [docs/licenses/](docs/licenses/). Game characters, wallpapers, music and other third-party assets remain subject to their respective rights and licenses.
