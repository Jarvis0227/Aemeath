---
title: "在文章中嵌入视频（修改）"
published: 1970-01-01
description: "这篇文章演示如何在博客文章中嵌入视频。"
aiSummary: 这篇示例说明把 YouTube 或 Bilibili 的嵌入代码直接放进 Markdown 的方式，并分别展示两个平台的 iframe 写法。
image: ''
tags: ["示例", "视频", "Rain"]
category: "文章示例"
draft: true
pinned: false
---


只需从 YouTube 或其他平台复制嵌入代码，然后将其粘贴到 markdown 文件中。

```yaml
---
title: 在文章中嵌入视频
published: 2023-10-19
// ...
---

<iframe width="100%" height="468" src="https://www.youtube.com/embed/5gIf0_xpFPI?si=N1WTorLKL0uwLsU_" title="YouTube video player" frameborder="0" allowfullscreen></iframe>
```
## YouTube

<iframe width="100%" height="468" src="https://www.youtube.com/embed/5gIf0_xpFPI?si=N1WTorLKL0uwLsU_" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>

## Bilibili

<iframe width="100%" height="468" src="//player.bilibili.com/player.html?bvid=BV1fK4y1s7Qf&p=1&autoplay=0" scrolling="no" border="0" frameborder="no" framespacing="0" allowfullscreen="true" &autoplay=0> </iframe>
