# Aemeath

[中文](README.md) · [English](README.en.md) · [在线示例](https://rainzt.cn/) · [问题反馈](https://github.com/Jarvis0227/Aemeath/issues)

Aemeath V4.3.0 是基于 Astro 7、Svelte 和 TypeScript 的个人博客。这个公开版本保留页面、组件和主题功能，个人内容与服务连接使用空模板，方便配置成自己的站点。

## 功能

- Aemeath / Pure 双主题，支持深浅色、字体、壁纸和响应式布局。
- Markdown / MDX、归档、分类、标签、全文搜索、RSS 和本地文章编辑工具。
- 关于、友链、朋友圈、相册、追番、留言板、工具、赞助、账单和统计页面。
- 评论表情与展示、友链响应探测和状态展示；需要服务支持的功能通过独立配置启用。

## 快速开始

使用 Node.js 22.12 或更高版本和 pnpm 9。

```sh
git clone https://github.com/Jarvis0227/Aemeath.git
cd Aemeath
pnpm install
pnpm dev
```

默认开发地址为 `http://localhost:4321`。首页没有文章时会显示添加提示。

```sh
pnpm new-post       # 在 src/content/posts 中创建文章
pnpm post-studio    # 启动本地文章编辑工具
pnpm check         # Astro 检查并同步内容类型
pnpm type-check    # TypeScript 检查
pnpm build         # 生成网站、资源与 Pagefind 索引
pnpm preview       # 预览生产构建
```

## 内容与配置

| 入口 | 用途 |
| --- | --- |
| `src/config/siteConfig.ts` | 标题、URL、语言、页面开关和追番账号 |
| `src/config/profileConfig.ts` | 昵称、头像、简介与社交链接 |
| `src/config/siteThemeConfig.ts` | 默认主题与主题切换开关 |
| `src/config/navBarConfig.ts` | 导航菜单 |
| `src/config/backgroundWallpaper.ts`、`fontConfig.ts` | 壁纸与字体 |
| `src/content/posts/`、`src/content/spec/` | 文章、关于与留言板内容 |
| `src/config/friendsConfig.ts` | 友链及 RSS，`pnpm friend-latency` 生成探测快照 |
| `src/config/galleryConfig.ts`、`public/gallery/` | 相册元信息与图片 |
| `src/config/commentConfig.ts`、`analyticsConfig.ts` | 自己的评论和统计服务 |
| `src/config/serviceConfig.ts` | 可选的服务器状态、友链状态、评论标签、管理入口和可选位置服务 |
| `src/config/footerConfig.ts`、`FooterConfig.html` | 自己的备案链接与页脚 HTML |
| `src/config/sponsorConfig.ts`、`musicConfig.ts` | 赞助方式和音乐列表 |
| `src/data/billsSummary.json` | 零值账单模板，保留结构后填写自己的数据 |
| `src/data/blog-changelog.ts`、`auto-listing-notices.ts`、`notice.html` | 自己的日志和公告 |

首次使用请将 `site_url` 从 `https://example.com` 改为自己的域名，并修改示例建站日期。关于页的项目和工具页的列表也需要自行填写。文章场景组件保留动画结构，文字与配图通过组件属性自行提供。

评论与统计默认关闭。`serviceConfig.ts` 的地址默认留空，不会请求作者的服务。自定义评论标签、情感标签或友链状态需要兼容后端；仓库包含前端展示，不附带作者的评论服务端和运维环境。未配置的数据页面保留空状态，不会导入作者的文章、账单、联系人和友链快照。

## 仓库结构

```text
src/config/       站点配置
src/content/      文章与独立页面内容
src/components/   Astro 与 Svelte 组件
src/layouts/      页面布局
src/pages/        页面与静态 API
src/styles/       样式
src/data/         数据模板
public/           静态资源
scripts/          构建与内容辅助工具
docs/licenses/    第三方许可
```

不要提交真实账单、个人联系方式、密钥、环境文件或部署运维配置。构建输出、调试产物、作者部署流程、评论服务端和管理后台不在本公开版本的范围内。

主题切换说明见 [docs/site-themes.md](docs/site-themes.md)。

## 许可与致谢

Aemeath 在 [Firefly](https://github.com/CuteLeaf/Firefly) 与 [Fuwari](https://github.com/saicaca/fuwari) 的基础上继续开发。Pure 相关布局保留 [Astro Theme Pure](https://github.com/cworld1/astro-theme-pure) 的 Apache-2.0 许可声明。

项目许可见 [LICENSE](LICENSE)，其他依赖的声明见 [docs/licenses/](docs/licenses/)。游戏角色、壁纸、音乐和其他第三方素材的权利属于对应权利人，使用前请分别核对适用许可。
