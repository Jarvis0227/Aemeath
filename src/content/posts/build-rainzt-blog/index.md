---
title: 从零搭建 Rainzt.cn：我的个人博客上线流程
published: 2026-07-08
description: 记录这个个人博客从本地运行、内容配置、生产构建到宝塔 Nginx 部署和 HTTPS 上线的完整流程。
aiSummary: 文章按真实上线顺序记录 Aemeath 与 Rainzt.cn：准备 Astro 和 pnpm、配置内容、写 Markdown、构建 dist，再交给宝塔 Nginx 和 HTTPS 发布。适合想把 Firefly 二创博客从本地推到服务器的读者。
image: /assets/images/wallpaper/wallpaper-20.webp
tags: [博客搭建, Astro, Aemeath, 宝塔, Nginx, HTTPS]
category: 博客指南
draft: false
---

## 为什么要搭这个博客

我想要一个真正属于自己的内容空间。它不只是用来发文章，也用来整理项目、记录折腾过程、放一些自己喜欢的页面和小工具。

最后，我把这套基于 Astro 与 Firefly 深度改造的站点命名为 Aemeath 主题。它保留了静态生成速度快、页面效果完整、文章用 Markdown 管理这些优点，部署后只需要一份 `dist` 静态文件就能跑起来。对个人博客来说，这种结构足够轻，也足够自由，同时也终于有了更贴近自己审美的名字。

这个站点最终部署在 `rainzt.cn`，服务器侧使用宝塔面板和 Nginx，HTTPS 证书也已经配置好。

## 项目准备

开始之前，先确认本地已经准备好 Node.js 和 pnpm。这个博客使用的是 Astro 项目结构，内容、配置和静态资源都放在源码目录中维护，生产环境只需要部署构建后的静态文件。

项目主要结构大概是这样：

```txt
src/content/posts/     文章目录
src/content/spec/      关于、友链、留言等特殊页面
src/config/            站点配置
public/                静态资源
dist/                  构建后的生产文件
package.json           项目脚本
wrangler.jsonc         Cloudflare Workers 静态资源配置
vercel.json            Vercel 输出目录配置
```

其中最常用的是 `src/content/posts/`。以后新文章基本都放在这里。

## 本地运行

项目使用 pnpm 管理依赖。进入项目根目录后，先安装依赖：

```bash
pnpm install
```

开发环境启动：

```bash
pnpm dev
```

本地开发服务会跑在类似下面的地址：

```txt
http://127.0.0.1:4333/
```

开发环境和生产环境有一个重要区别：开发环境会显示草稿文章，方便预览和调试；生产构建会自动过滤 `draft: true` 的文章。所以本地看到的文章数量可能比线上多，这是正常现象。

这个逻辑在 `src/utils/content-utils.ts` 里：

```ts
return import.meta.env.PROD ? data.draft !== true : true;
```

也就是说，生产环境只展示非草稿文章。

## 配置站点信息

站点的大部分基础信息都在 `src/config/siteConfig.ts` 里配置，例如：

- 站点标题
- 副标题
- 站点地址
- 导航栏标题和 Logo
- 页面开关
- 分页数量
- 壁纸、字体、主题色等显示配置

导航菜单在 `src/config/navBarConfig.ts` 里维护。比如首页、文章、工具、更新日志、友链、留言、我的、关于等菜单，都是从这里生成的。

如果某个菜单带有子菜单，它会渲染成下拉框。比如“文章”下面有归档、分类、标签；“我的”下面有相册、追番、番组计划。

## 写文章

文章使用 Markdown 或 MDX。最简单的一篇文章格式如下：

```md
---
title: 文章标题
published: 2026-07-08
description: 文章简介
image: /assets/images/wallpaper/wallpaper-20.webp
tags: [博客搭建, Astro]
category: 博客指南
draft: false
---

这里开始写正文。
```

`published` 是发布时间。  
`draft: false` 表示会在生产环境发布。  
`draft: true` 表示只在本地开发时显示。

如果文章需要配图，可以像现在这样创建一个文章目录：

```txt
src/content/posts/build-rainzt-blog/index.md
src/content/posts/build-rainzt-blog/cover.png
src/content/posts/build-rainzt-blog/step-1.png
```

正文里可以直接引用同目录图片：

```md
![部署截图](./step-1.png)
```

## 生产构建

确认文章和配置没问题后，执行生产构建：

```bash
pnpm build
```

这个命令不是只跑 Astro，它会连续做几件事：

```bash
node scripts/generate-icons.js
npx tsx scripts/generate-lqips.ts
astro build
npx tsx scripts/subset-fonts.ts
pagefind --site dist
```

分别对应：

- 生成项目用到的图标常量
- 为图片生成低质量占位图数据
- 生成 Astro 静态站点
- 处理字体子集
- 生成 Pagefind 搜索索引

构建完成后，生产文件会出现在：

```txt
dist/
```

部署到服务器的就是这个目录里的内容。

## 本地预览生产版本

开发环境正常不代表生产构建一定正常，所以部署前最好跑一次预览：

```bash
pnpm preview
```

也可以指定端口：

```bash
pnpm preview --host 127.0.0.1 --port 4334
```

这个预览服务读取的是 `dist`，更接近线上效果。如果这里正常，线上不正常，问题通常就在部署目录、静态资源缓存或服务器配置上。

## 服务器环境

线上使用的是宝塔面板加 Nginx。当前站点配置里，`rainzt.cn` 和 `www.rainzt.cn` 都指向同一个网站根目录。

Nginx 配置里核心部分是：

```nginx
root /path/to/site;
index index.html;

location / {
    try_files $uri $uri/ $uri.html =404;
}
```

HTTPS 证书由宝塔管理。部署静态文件时，只需要操作网站根目录，不要动证书配置。

## 部署流程

部署时的思路很简单：

1. 本地执行 `pnpm build`
2. 把 `dist` 打包上传到服务器
3. 备份旧站点目录
4. 清空网站根目录里的旧静态文件
5. 解压新的 `dist` 到网站根目录
6. 检查 Nginx 配置并 reload

清空旧文件很重要。Astro 生成的 `_astro` 资源带 hash，如果只覆盖不删除，旧 CSS、旧 JS 可能残留。浏览器或 Nginx 又会长期缓存这些带 hash 的资源，最后就容易出现“本地正常，线上某些交互异常”的情况。

部署前最好保留一份旧版本备份。这样就算新版本有问题，也可以快速回滚。

## 线上验证

部署完成后，需要检查几个点：

```txt
https://rainzt.cn/
https://rainzt.cn/api/allPostMeta.json
https://rainzt.cn/_astro/
```

首页能打开，说明 Nginx root 和静态文件没问题。  
`api/allPostMeta.json` 正常，说明文章元数据构建出来了。  
`_astro` 里的 CSS 和 JS 能访问，说明资源路径没问题。

如果刚部署完页面样式或下拉框还是旧状态，可以先强制刷新：

```txt
Ctrl + F5
```

如果仍然不对，就要检查线上 HTML 引用的资源文件名是不是最新构建生成的文件。

## Git 管理

项目已经初始化 Git。常用流程：

```bash
git status
git add .
git commit -m "Add new post"
```

注意 `dist/`、`node_modules/`、日志文件等不需要提交。源码、配置、文章、静态资源才是应该进入 Git 的内容。

## 后续更新文章

以后发新文章可以按这个流程：

1. 在 `src/content/posts/` 新建文章
2. 设置好 `published`、`tags`、`category`、`draft`
3. 本地 `pnpm dev` 预览
4. 确认无误后 `pnpm build`
5. 上传新的 `dist`
6. 访问线上确认

如果只是草稿，就保持：

```yaml
draft: true
```

等要发布时再改成：

```yaml
draft: false
```

## 小结

这个博客的核心链路可以概括成一句话：

用 Markdown 写内容，用 Astro 生成静态站点，用宝塔 Nginx 托管 `dist`，用 HTTPS 把它稳定地挂到 `rainzt.cn`。

它不是最复杂的部署方式，但对个人博客来说很舒服：本地写作足够快，线上访问足够轻，出问题时也容易定位。后面无论是加文章、加工具页、改导航、换壁纸，基本都能围绕这套流程继续迭代。
