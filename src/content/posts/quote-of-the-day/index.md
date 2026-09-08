---
title: 每天留一句话：我在侧边栏做了一个本地每日一言
published: 2026-07-14
description: 不调用外部语录接口，也不需要数据库，用日期从十条本地名句中选出当天固定的一句。
aiSummary: 我没有给每日一言接随机 API，而是把筛选过的名句放进本地数组，用日期决定当天固定的一句。文章同时记录组件注册、旁白式排版和让文字库随博客一起成长的取舍。
image: ./cover.webp
tags: [博客改造, Astro, JavaScript, 写作]
category: 博客改造
draft: false
---

重新开始写博客以后，我越来越在意“文字是不是自己的”。

以前赶项目时，我习惯把资料交给 AI，让它快速整理出完整文章。效率很高，可当博客真正准备长期更新时，我又希望页面里能多留一点与文字有关的气息。每日一言正好给了我一个很小的位置：它不需要展开成一篇文章，也不负责讲清某项技术，只是在访客打开首页时，留下一句值得慢慢读的话。

![每日一言侧边栏效果](./effect.webp)

## 为什么没有直接接语录 API

网上有很多现成的一言接口，请求一次就能得到一句随机内容。接入确实方便，但我最终没有用。

原因有三个。

第一，第三方接口的速度和稳定性不受我控制。侧边栏本来是静态页面的一部分，不值得为了十几个字增加一次网络依赖。

第二，接口返回什么内容无法预先检查，偶尔可能出现过长、重复或不符合博客气质的句子。自己维护内容，排版和语气都更可控。

第三，也是最重要的一点：我想让它逐渐变成自己筛选过的句子库，而不是另一个站点内容的转发器。

所以组件内放的是十条经过核对的经典名句，例如：

> 千里之行，始于足下。

> 学而不思则罔，思而不学则殆。

> 纸上得来终觉浅，绝知此事要躬行。

十条内容来自《道德经》《论语》《荀子》以及陆游、屈原的诗文。它们都保存在本地数组中，页面不需要为了十几个字再等待一次网络请求。

## 今天固定，明天再换

“今日一言”不应该像轮播图一样十几秒换一次。我的规则很简单：语录库里共有十条，同一天无论刷新多少次都显示同一句，日期变化后再显示下一句。

实现时先把访客本地日期换算成一个稳定的天数，再对语录总数取余：

```ts
const now = new Date()
const dayNumber = Math.floor(
  Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) / 86_400_000,
)
const quoteIndex = dayNumber % quotes.length
```

这里使用年、月、日，而不是当前的小时和分钟，所以刷新页面不会改变结果。天数每天只增加一，索引也会依次向后移动；十条全部出现一遍后，再从第一条重新开始。

## 让它看起来像一句旁白

视觉上我没有给它加复杂背景，只沿用侧边栏卡片：

- 标题是“今日一言”；
- 正文使用略微倾斜的字形；
- 两侧引号用主题色降低透明度；
- 作者放在右下角；
- 鼠标经过时，正文才轻轻变成主题色。

它的存在感比时间卡片低，也比统计组件更松。页面滚动到这里时，像在一组数字和工具之间短暂停了一下。

## 把每日一言做成可注册的侧栏组件

组件文件放在：

```txt
src/components/widget/QuoteOfTheDay.astro
```

外层继续使用主题自带的 `WidgetLayout`，这样圆角、标题、内边距和暗色模式不用重新造一套：

```astro
---
import WidgetLayout from "@/components/common/WidgetLayout.astro"
const { class: className, style } = Astro.props
---

<WidgetLayout
  id="quote-of-the-day"
  name="今日一言"
  class={className}
  style={style}
>
  <daily-quote>
    <blockquote>
      <span class="quote-mark">“</span>
      <span class="quote-text">慢一点，也是在向前走。</span>
      <span class="quote-mark">”</span>
    </blockquote>
    <cite class="quote-author">—— Rain</cite>
  </daily-quote>
</WidgetLayout>
```

文字数组和日期选择逻辑放在组件脚本中。每一项都保存正文与署名，后续也可以把署名换成书名、项目名或记录日期：

```ts
const quotes = [
  ["千里之行，始于足下。", "《道德经》"],
  ["学而不思则罔，思而不学则殆。", "《论语》"],
  ["纸上得来终觉浅，绝知此事要躬行。", "陆游"],
] as const

class DailyQuote extends HTMLElement {
  private midnightTimer?: number

  connectedCallback() {
    this.showTodayQuote()
    this.scheduleMidnightRefresh()
  }

  disconnectedCallback() {
    if (this.midnightTimer) clearTimeout(this.midnightTimer)
  }

  private showTodayQuote() {
    const now = new Date()
    const dayNumber = Math.floor(
      Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) / 86_400_000,
    )
    const index = dayNumber % quotes.length
    const [text, author] = quotes[index]
    this.querySelector(".quote-text")!.textContent = text
    this.querySelector(".quote-author")!.textContent = `—— ${author}`
  }

  private scheduleMidnightRefresh() {
    const now = new Date()
    const nextMidnight = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + 1,
    )

    this.midnightTimer = window.setTimeout(() => {
      this.showTodayQuote()
      this.scheduleMidnightRefresh()
    }, nextMidnight.getTime() - now.getTime() + 100)
  }
}

customElements.define("daily-quote", DailyQuote)
```

如果项目启用了无刷新切页，注册前需要先判断元素是否已经存在，避免重复定义报错：

```ts
if (!customElements.get("daily-quote")) {
  customElements.define("daily-quote", DailyQuote)
}
```

## 注册到左侧栏

先在 `src/types/sidebarConfig.ts` 中加入类型：

```ts
export type WidgetComponentType =
  | "profile"
  | "announcement"
  | "quoteOfTheDay"
  // ...
```

再在 `SideBar.astro` 中导入并注册映射：

```ts
import QuoteOfTheDay from "@/components/widget/QuoteOfTheDay.astro"

const componentMap = {
  // ...
  quoteOfTheDay: QuoteOfTheDay,
}
```

我把它放在左侧资料与公告之后、音乐播放器之前：

```ts
{
  type: "quoteOfTheDay",
  enable: true,
  position: "top",
  showOnPostPage: false,
}
```

这里的顺序就是实际渲染顺序。想把它移到右边，不需要改组件，只要把这段配置从 `leftComponents` 移到 `rightComponents`。

## 修改内容时要注意什么

如果句子里包含英文引号、反斜杠或换行，记得按照 TypeScript 字符串规则转义。句子过长时，侧栏会明显变高，因此我会尽量控制在一到两行。

日期索引会严格按顺序走完十条。想确认逻辑是否正确，可以在浏览器控制台中临时把日期改成连续几天，检查索引是否依次变化；同时反复刷新当天页面，确认正文始终一致。

我还额外设置了一个指向本地午夜的定时器。这样即使页面从晚上一直开到第二天，它也会在零点后主动更新，而不必依赖访客手动刷新。组件被移除时要清理这个定时器，避免无刷新切页后留下多余任务。

## 文字库会跟着博客一起长大

这个组件现在保留十句话，不算很多，但每条都经过选择。

有些内容适合写成长文，有些只值得记成一行。以后做完新的自动化项目、踩过新的坑，或者某天只是突然想明白一件小事，我都可以把它补进去。几年之后再看，这个数组也许会变成一份非常简短的时间线。

每日一言真正吸引我的地方，不只是它会自动变化，而是它给零散文字留了一个固定入口。博客不只有完整、正式、可以被搜索到的文章，也可以有这些短暂停留，却仍然值得被记住的句子。
