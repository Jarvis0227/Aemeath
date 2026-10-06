# Aemeath

> “朝朝听雨”（Rain）的个人博客源码，线上站点：[rainzt.cn](https://rainzt.cn/)

[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D22-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![pnpm](https://img.shields.io/badge/pnpm-%3E%3D9-F69220?logo=pnpm&logoColor=white)](https://pnpm.io/)
[![Astro](https://img.shields.io/badge/Astro-7-BC52EE?logo=astro&logoColor=white)](https://astro.build/)
[![Aemeath](https://img.shields.io/badge/Aemeath-V4.1.6-4A67D6)](https://github.com/Jarvis0227/Aemeath)
[![License](https://img.shields.io/github/license/Jarvis0227/Aemeath)](LICENSE)

[在线站点](https://rainzt.cn/) · [项目仓库](https://github.com/Jarvis0227/Aemeath) · [提交问题](https://github.com/Jarvis0227/Aemeath/issues)

## 项目介绍

Aemeath 是“朝朝听雨”的个人博客站点源码，由 Rain 维护。项目使用 Astro 生成静态页面，并以 Svelte 实现交互组件，记录技术实践、项目进展与日常写作。

## 站点功能

- 文章、归档、分类、标签和全文搜索
- 关于、项目、友链、朋友圈、留言板、账单、相册、工具和更新日志页面
- 响应式布局、暗色模式、壁纸与显示设置
- 中文优先的多语言界面
- 可配置的评论与访问统计集成
- 基于 Markdown/MDX 的内容维护与本地文章编辑工具

## 本地开发

环境要求：

- Node.js >= 22
- pnpm >= 9

安装依赖并启动开发服务器：

~~~bash
pnpm install
pnpm dev
~~~

常用命令：

~~~bash
pnpm check       # Astro 页面、内容和类型诊断
pnpm type-check  # TypeScript 检查
pnpm build       # 构建静态站点、搜索索引和优化资源
pnpm preview     # 预览生产构建
pnpm new-post    # 创建文章
pnpm post-studio # 启动本地文章编辑工具
~~~

## 仓库结构

~~~text
src/config/       站点、导航、侧栏、评论和统计配置
src/content/      文章与特殊页面内容
src/components/   Astro / Svelte 组件
src/pages/        页面与 API 路由
src/data/         朋友圈快照与站点数据
public/           直接发布的静态资源
scripts/          构建和内容辅助脚本
~~~

站点配置位于 src/config/，文章使用 Markdown 或 MDX，放在 src/content/posts/。

## 公开仓库说明

公开仓库保留可复用的站点源码、公开内容和静态资源。部署平台配置、服务器运维文件、评论服务端代码、主机信息和密钥应由部署环境单独管理，不应提交到仓库。账单页面使用空数据模板；请勿提交个人账单原始数据。

## 许可证

项目采用 [MIT License](LICENSE)。仓库中的许可证和版权声明适用于相应代码与素材；再分发前请一并查看 docs/licenses/ 中的第三方许可文件。

## 致谢

Aemeath 基于 [CuteLeaf 的 Firefly 主题](https://github.com/CuteLeaf/Firefly)继续二次创作，并承袭其上游 [Fuwari](https://github.com/saicaca/fuwari) 项目的工作。感谢原作者及所有贡献者；相关版权声明和许可详见 [LICENSE](LICENSE) 与 `docs/licenses/`。

Firefly 主题中与《崩坏：星穹铁道》相关的流萤素材版权归游戏开发商[米哈游](https://www.mihoyo.com/)所有。
