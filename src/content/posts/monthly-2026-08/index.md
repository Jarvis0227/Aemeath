---
title: 月刊
published: 2026-08-28
pinned: true
pinnedOrder: 2
description: 记录 8 月 7 日到 26 日之间的博客更新、自动上架项目、被我停掉的功能、刚搭好的小家，以及本期想认真推荐的几位博友。
aiSummary: 第一期月刊，写博客运营第二个月的更新，也写自动上架系统里的型号和标题规则、SSE 状态同步、图片参数联动、旧链接折扣，以及 Rain 记账停更、任务工作台烂尾、小家搭建和本月友链推荐。
tags: [月刊, 博客, 开发随笔, 自动化, 生活记录, 友链]
category: 随笔
draft: false
image: ./monthly-cover-2026-08-final.png
---

最近做的事情有点杂：博客、自动上架、采购工具、几个做到一半又收手的小项目，还有终于布置好的小家。它们看起来没什么关系，却一起占掉了这个月的大部分时间。

这篇不想写成一份冷冰冰的完成事项清单。做成了什么当然要记，为什么返工、哪里没做完、哪些东西最后被我删掉，也一样值得写下来。

## 先看一下这个月的数据

这次统计从 8 月 7 日到 8 月 26 日。先把 Umami 里的数字放在这里：

<div class="monthly-data-strip" aria-label="本月 Umami 站点数据">
  <div>
    <span class="monthly-data-value">2.08k</span>
    <span class="monthly-data-label">位访客</span>
  </div>
  <div>
    <span class="monthly-data-value">2.87k</span>
    <span class="monthly-data-label">次访问</span>
  </div>
  <div>
    <span class="monthly-data-value">12.3k</span>
    <span class="monthly-data-label">次页面浏览</span>
  </div>
  <div>
    <span class="monthly-data-value">39%</span>
    <span class="monthly-data-label">跳出率</span>
  </div>
  <div>
    <span class="monthly-data-value">4′37″</span>
    <span class="monthly-data-label">平均访问时长</span>
  </div>
</div>
<p class="monthly-data-source">数据来自 Umami，统计时间：8 月 7 日—8 月 26 日。</p>

这些数字没法直接证明博客做得好不好，但至少说明这里开始有人路过了。有人从友链点进来，有人看完一篇文章又翻到另一篇，也有人愿意在评论区留句话。对一个还在慢慢搭建中的个人博客来说，这种“真的有人来过”的感觉，还是挺开心的。

![Umami 站点数据统计](/monthly-2026-08/umami-dashboard.png)

## 本月更新

翻项目记录的时候，我发现这个月没有什么特别大的版本号，更多是一些零零碎碎的调整：一张页面补完整一点，一个后台入口变得能用一点，一段状态同步终于不再装死。单看每一项都不算惊天动地，但博客确实比月初更像一个我会长期使用的地方了。

### 博客内容和页面，慢慢长出自己的样子

<div class="monthly-wechat-thread" data-monthly-chat-thread aria-label="8 月发布的两篇文章">
  <span class="monthly-wechat-thread__notice">8 月 · 两篇新文章</span>
  <article class="monthly-wechat-message monthly-wechat-message--incoming" data-monthly-chat-message>
    <img class="monthly-wechat-message__avatar" src="/favicon/chaoc-tingyu-avatar-180.png" alt="" width="44" height="44" loading="lazy" decoding="async">
    <div class="monthly-wechat-message__bubble">
      <time datetime="2026-08-14">8 月 14 日</time>
      <p>今天发了这篇：<br><a href="/posts/chao-chao-listening-rain-years-wind/">《朝朝听雨，岁岁有风》</a></p>
    </div>
  </article>
  <article class="monthly-wechat-message monthly-wechat-message--outgoing" data-monthly-chat-message>
    <div class="monthly-wechat-message__bubble">
      <p>那篇写的是高中时期的一段感情，也是我第一次比较完整地把那段青春重新翻出来。写的时候有点犹豫，毕竟这和技术文章完全不是一回事，但写完之后反而觉得，博客本来就不应该只放“有用的东西”。有些记忆如果不找个地方放着，过几年可能连自己都说不清了。</p>
    </div>
    <img class="monthly-wechat-message__avatar" src="/assets/images/rain-avatar.webp" alt="" width="44" height="44" loading="lazy" decoding="async">
  </article>
  <article class="monthly-wechat-message monthly-wechat-message--incoming" data-monthly-chat-message>
    <img class="monthly-wechat-message__avatar" src="/favicon/chaoc-tingyu-avatar-180.png" alt="" width="44" height="44" loading="lazy" decoding="async">
    <div class="monthly-wechat-message__bubble">
      <time datetime="2026-08-20">8 月 20 日</time>
      <p>这一篇也发出来了：<br><a href="/posts/from-matriarchal-society-to-patriarchy/">《从母系社会到父权制度：亲缘、私有制与现代性别关系的演变（浅谈男女对立）》</a></p>
    </div>
  </article>
  <article class="monthly-wechat-message monthly-wechat-message--outgoing" data-monthly-chat-message>
    <div class="monthly-wechat-message__bubble">
      <p>这篇更像一次长一点的思考练习，我想把亲缘、继承、私有制和现代性别矛盾之间的关系捋一遍。它当然不可能把这么大的问题讲完，但至少把我当时的疑问和判断留下来了，之后想改也有地方可改。</p>
    </div>
    <img class="monthly-wechat-message__avatar" src="/assets/images/rain-avatar.webp" alt="" width="44" height="44" loading="lazy" decoding="async">
  </article>
</div>

<div class="monthly-article-cover-pair" aria-label="本月发布的两篇文章主图">
  <a href="/posts/chao-chao-listening-rain-years-wind/" class="monthly-article-cover" aria-label="阅读《朝朝听雨，岁岁有风》">
    <img src="/monthly-2026-08/article-cover-rain.webp" alt="《朝朝听雨，岁岁有风》文章主图" loading="lazy" decoding="async">
    <span>朝朝听雨，岁岁有风</span>
  </a>
  <a href="/posts/from-matriarchal-society-to-patriarchy/" class="monthly-article-cover" aria-label="阅读《从母系社会到父权制度》">
    <img src="/monthly-2026-08/article-cover-gender-history.webp" alt="《从母系社会到父权制度》文章主图" loading="lazy" decoding="async">
    <span>从母系社会到父权制度</span>
  </a>
</div>

“关于我”页面也重新整理过。以前它更像一张简单的名片，后来我把头像、个人状态、本机信息、导航栏 Logo、页脚和移动端文章信息一点点补上。做这些时经常会怀疑：这真的重要吗？但页面最后呈现出来的感觉，往往就是这些小地方一起决定的。

<div class="monthly-about-gallery" aria-label="关于我页面更新截图">
  <figure><img src="/monthly-2026-08/about-profile-page.png" alt="关于我页面的个人资料区" loading="lazy" decoding="async"><figcaption>个人资料和 README</figcaption></figure>
  <figure><img src="/monthly-2026-08/about-projects-page.png" alt="关于我页面的项目和更新日志区" loading="lazy" decoding="async"><figcaption>项目、更新日志和状态区</figcaption></figure>
</div>

评论区也没有闲着。评论区身份标记、登录入口、AI 摘要、AI 评论员、评论图片处理，这些功能前前后后改了几轮；站长后台还加了小爱回复入口和安全验证。现在我暂时没有把“完全自动回复”放开，公开评论区还是要留一点人工确认。AI 可以帮忙整理和起草，但最后发出去的话，至少应该有人看过。

<div class="monthly-review-trace" aria-label="AI 网页检修审查轨迹">
  <div class="monthly-review-trace__head"><span>AI review trace</span><small>当前权限：只读建议</small></div>
  <ol>
    <li><span>inspect</span><div><strong>先查页面</strong><small>从评论里的描述开始，定位对应的组件和页面。</small></div></li>
    <li><span>found</span><div><strong>找到问题</strong><small>确认过一次 icon not found，追到 Svelte 图标组件。</small></div></li>
    <li><span>proposed</span><div><strong>提出修改</strong><small>整理原因和处理方案，交给站长确认。</small></div></li>
    <li><span>reverted</span><div><strong>自动修改撤回</strong><small>能发现问题不等于能直接改代码，最后保留人工检查。</small></div></li>
  </ol>
  <p class="monthly-review-trace__result"><span>result</span><strong>自动修改已撤回</strong><small>只留下发现问题和整理线索的部分</small></p>
</div>

### 友链页面终于不只是几张卡片

这个月在友链上花的时间，比我一开始想的多。

最早的友链页面就是头像、站名、描述和链接，排整齐了就算结束。后来越看越觉得不太对：既然叫友链，不能只是把朋友的网站摆在那里，然后大家各自沉默。于是我给它加了站点截图、推荐标记、申请说明、推荐语和交互式预览。鼠标移到卡片上时，可以先看看站点大概长什么样，再决定要不要点进去。

<a class="monthly-friend-page-demo friend-card friend-list-card friend-card--recommended" href="https://daily.yybb.us/" target="_blank" rel="noopener noreferrer" aria-label="打开推荐友链 AIOVTUE-雪">
  <span class="friend-card-surface" aria-hidden="true"><span class="friend-recommended-flow"><canvas class="friend-recommended-canvas"></canvas></span></span>
  <span class="friend-card-avatar"><img src="https://r2tc.20030327.xyz/file/博客/主题/1780655293662_avatar_me.jpg.PNG" alt="AIOVTUE-雪头像" loading="lazy" decoding="async"></span>
  <span class="friend-card-content">
    <span class="friend-card-heading"><span class="friend-card-title friend-card-title--recommended">AIOVTUE-雪</span><svg class="friend-card-arrow" viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M7 17 17 7M9 7h8v8"/></svg></span>
    <span class="friend-card-description">雨滴会记录生命中的每一个瞬间</span>
    <span class="friend-card-tags"><i>博客主题</i><i>开源</i><i>教程</i></span>
  </span>
  <figure class="friend-site-preview" aria-hidden="true"><img src="/friends/screenshots/aiovtue.webp" alt="" width="1200" height="675" loading="lazy" decoding="async"></figure>
</a>

预览功能看起来只是一个悬浮卡片，实际要处理的东西不少：截图加载失败怎么办，卡片放在屏幕边缘会不会被截掉，手机上没有鼠标该怎么交互，页面切换回来之后事件还在不在。它不是本月最重要的功能，却是那种做完之后每天都会顺手用一下的改动。

后来我又做了“朋友圈”页面，读取友链站点的 RSS，把朋友们最近写的文章放进一条时间线里，再配上分页、文章元信息和随机文章过渡。友链因此不再是静态列表，朋友们更新文章时，这里也会跟着动起来。

<article class="monthly-moments-random moments-random-article" data-monthly-moments-random data-state="loading" aria-label="朋友圈随机文章示例">
  <svg class="moments-random-article__filters" aria-hidden="true" focusable="false" width="0" height="0"><defs><filter id="monthly-random-article-displacement" x="-12%" y="-20%" width="124%" height="140%"><feTurbulence type="fractalNoise" baseFrequency="0.018" numOctaves="2" seed="23" result="noise"/><feDisplacementMap in="SourceGraphic" in2="noise" scale="7" xChannelSelector="R" yChannelSelector="B"/></filter></defs></svg>
  <span class="monthly-moments-random__noise moments-random-article__noise" aria-hidden="true"></span>
  <span class="monthly-moments-random__sheen moments-random-article__sheen" aria-hidden="true"></span>
  <div class="monthly-moments-random__icon moments-random-article__icon">
    <img data-monthly-random-avatar alt="" width="40" height="40" loading="lazy" decoding="async" hidden>
    <span data-monthly-random-avatar-fallback aria-hidden="true"><svg viewBox="0 0 24 24"><path fill="currentColor" d="M7.05 6.05 4.5 8.6 1.95 6.05 0.54 7.46l3.96 3.96 3.96-3.96-1.41-1.41Zm9.9 11.9 2.55-2.55 2.55 2.55 1.41-1.41-3.96-3.96-3.96 3.96 1.41 1.41ZM7.05 17.95 4.5 15.4l-2.55 2.55-1.41-1.41 3.96-3.96 3.96 3.96-1.41 1.41Zm9.9-11.9L19.5 8.6l2.55-2.55 1.41 1.41-3.96 3.96-3.96-3.96 1.41-1.41Z"/></svg></span>
  </div>
  <div class="monthly-moments-random__body moments-random-article__body">
    <div class="monthly-moments-random__eyebrow moments-random-article__eyebrow"><span>随机一篇文章</span><span>随手翻翻</span><span class="monthly-moments-random__badge moments-random-article__badge moment-identity-badge" data-monthly-random-badge hidden></span></div>
    <a class="monthly-moments-random__link moments-random-article__link" data-monthly-random-link href="/moments/">
      <strong data-monthly-random-title>正在挑选一篇文章…</strong>
      <span data-monthly-random-description>从朋友圈文章里随机选一篇，换个角度继续阅读。</span>
      <span data-monthly-random-meta aria-hidden="true"></span>
    </a>
  </div>
  <span class="monthly-moments-random__countdown moments-random-article__countdown" data-monthly-random-countdown aria-hidden="true">5</span>
  <button type="button" class="monthly-moments-random__auto moments-random-article__auto is-active" data-monthly-random-auto aria-pressed="true" aria-label="关闭自动随机"><svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M17.65 6.35A7.96 7.96 0 0 0 12 4c-1.95 0-3.73.7-5.1 1.86L5.5 4.46V9h4.54L8.32 7.28A5.96 5.96 0 0 1 12 6c1.48 0 2.83.54 3.87 1.43L14 9.3h5.54V3.76l-1.89 1.89ZM5.5 14.7H0v5.54l1.89-1.89A7.96 7.96 0 0 0 12 20c1.95 0 3.73-.7 5.1-1.86l1.4 1.4V15H14l1.72 1.72A5.96 5.96 0 0 1 12 18c-1.48 0-2.83-.54-3.87-1.43L10 14.7H5.5Z"/></svg><span>自动随机</span></button>
  <button type="button" class="monthly-moments-random__refresh moments-random-article__refresh" data-monthly-random-refresh aria-label="换一篇随机文章"><svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M17.65 6.35A7.96 7.96 0 0 0 12 4c-1.95 0-3.73.7-5.1 1.86L5.5 4.46V9h4.54L8.32 7.28A5.96 5.96 0 0 1 12 6c1.48 0 2.83.54 3.87 1.43L14 9.3h5.54V3.76l-1.89 1.89ZM5.5 14.7H0v5.54l1.89-1.89A7.96 7.96 0 0 0 12 20c1.95 0 3.73-.7 5.1-1.86l1.4 1.4V15H14l1.72 1.72A5.96 5.96 0 0 1 12 18c-1.48 0-2.83-.54-3.87-1.43L10 14.7H5.5Z"/></svg><span>换一篇</span></button>
</article>

我还试过自动检查友链是否可用，最后又把它撤掉了。网络请求本来就有偶发失败，站点临时维护、证书抖一下、接口响应慢一点，都可能让一个正常的网站被错判。做出来不难，做到足够可靠才难；既然现在还做不到，我宁愿先不让它替我下结论。

8 月 25 日，我把“友链穿梭”补了出来。它带着启动动画、终端感文字和一段穿梭过渡，为了让这几秒看起来不像突然弹了个新页面，我又来回调了文字对比度、终端填充、表面纹理、启动和退出动画。它对效率没有帮助，但确实让这个博客多了一点自己的脾气。

<figure class="monthly-portal-figure">
  <img src="/monthly-2026-08/friends-portal-page.png" alt="友链穿梭页面的漫游舱效果" loading="lazy" decoding="async">
  <figcaption>友链穿梭：从一面面站点截图之间穿过去。</figcaption>
</figure>

<p class="monthly-theme-switch-note">顺带一提，穿梭页顶部那个小太阳 / 月亮不只是装饰：它会把整个界面切到浅色或暗色，不知道有没有人发现。</p>

### 按日期回放，才知道这个月有多碎

如果只看最后留下来的页面，很容易以为这些东西是一次性做完的。按日期回放就不是这样了。

<div class="monthly-date-replay" data-monthly-date-replay aria-label="8 月的更新时间回放">
  <article class="monthly-date-replay__entry" data-monthly-date-entry>
    <time datetime="2026-08-09"><span>08</span><strong>09—14</strong></time>
    <div class="monthly-commit-entry__meta" aria-label="更新状态"><span class="monthly-commit-entry__state">merged</span><code>main / friends</code><span>友链与文章</span></div>
    <p>主要是在补友链、整理文章和调整站点基础信息。MingBlog、Ditto、sssr7844、S17、桃之夭夭、林子浩的日记、九仞之行、王一君 Mew 等站点陆续加进来，博客也把新的生活文章发了出去。</p>
  </article>

<div class="monthly-drift-wall" data-monthly-drift-wall aria-label="八月新增友链的站点截图">
  <template data-drift-source>
    <img data-drift-source-item src="/friends/screenshots/0c0.webp" alt="" loading="lazy" decoding="async">
    <img data-drift-source-item src="/friends/screenshots/80tz.webp" alt="" loading="lazy" decoding="async">
    <img data-drift-source-item src="/friends/screenshots/aiovtue.webp" alt="" loading="lazy" decoding="async">
    <img data-drift-source-item src="/friends/screenshots/asteri5m.webp" alt="" loading="lazy" decoding="async">
    <img data-drift-source-item src="/friends/screenshots/blogplanet.webp" alt="" loading="lazy" decoding="async">
    <img data-drift-source-item src="/friends/screenshots/blogroll.webp" alt="" loading="lazy" decoding="async">
    <img data-drift-source-item src="/friends/screenshots/blogsclub.webp" alt="" loading="lazy" decoding="async">
    <img data-drift-source-item src="/friends/screenshots/boyouquan.webp" alt="" loading="lazy" decoding="async">
    <img data-drift-source-item src="/friends/screenshots/chenyicheng.webp" alt="" loading="lazy" decoding="async">
    <img data-drift-source-item src="/friends/screenshots/detached.webp" alt="" loading="lazy" decoding="async">
    <img data-drift-source-item src="/friends/screenshots/ditto.webp" alt="" loading="lazy" decoding="async">
    <img data-drift-source-item src="/friends/screenshots/dreamcenter.webp" alt="" loading="lazy" decoding="async">
    <img data-drift-source-item src="/friends/screenshots/fwneko.webp" alt="" loading="lazy" decoding="async">
    <img data-drift-source-item src="/friends/screenshots/lemonadorable.webp" alt="" loading="lazy" decoding="async">
    <img data-drift-source-item src="/friends/screenshots/linyu.webp" alt="" loading="lazy" decoding="async">
    <img data-drift-source-item src="/friends/screenshots/linzihao.webp" alt="" loading="lazy" decoding="async">
    <img data-drift-source-item src="/friends/screenshots/luming.webp" alt="" loading="lazy" decoding="async">
    <img data-drift-source-item src="/friends/screenshots/mingblog.webp" alt="" loading="lazy" decoding="async">
    <img data-drift-source-item src="/friends/screenshots/mingcy.webp" alt="" loading="lazy" decoding="async">
    <img data-drift-source-item src="/friends/screenshots/nanzhiy.webp" alt="" loading="lazy" decoding="async">
    <img data-drift-source-item src="/friends/screenshots/s17.webp" alt="" loading="lazy" decoding="async">
    <img data-drift-source-item src="/friends/screenshots/silvercode-nexus.webp" alt="" loading="lazy" decoding="async">
    <img data-drift-source-item src="/friends/screenshots/sssr7844.webp" alt="" loading="lazy" decoding="async">
    <img data-drift-source-item src="/friends/screenshots/styunlen.webp" alt="" loading="lazy" decoding="async">
    <img data-drift-source-item src="/friends/screenshots/sunrise.webp" alt="" loading="lazy" decoding="async">
    <img data-drift-source-item src="/friends/screenshots/talen.webp" alt="" loading="lazy" decoding="async">
    <img data-drift-source-item src="/friends/screenshots/taozhiyy.webp" alt="" loading="lazy" decoding="async">
    <img data-drift-source-item src="/friends/screenshots/telyra.webp" alt="" loading="lazy" decoding="async">
    <img data-drift-source-item src="/friends/screenshots/weasel6.webp" alt="" loading="lazy" decoding="async">
    <img data-drift-source-item src="/friends/screenshots/whitebear.webp" alt="" loading="lazy" decoding="async">
    <img data-drift-source-item src="/friends/screenshots/wyjmew.webp" alt="" loading="lazy" decoding="async">
    <img data-drift-source-item src="/friends/screenshots/xeiu.webp" alt="" loading="lazy" decoding="async">
    <img data-drift-source-item src="/friends/screenshots/xgrblog.webp" alt="" loading="lazy" decoding="async">
    <img data-drift-source-item src="/friends/screenshots/xiaoxi.webp" alt="" loading="lazy" decoding="async">
  </template>
  <div class="monthly-drift-wall__plane" data-drift-plane aria-hidden="true">
    <div class="monthly-drift-wall__column" data-drift-column></div>
    <div class="monthly-drift-wall__column" data-drift-column></div>
    <div class="monthly-drift-wall__column" data-drift-column></div>
    <div class="monthly-drift-wall__column" data-drift-column></div>
    <div class="monthly-drift-wall__column" data-drift-column></div>
  </div>
  <div class="monthly-drift-wall__signal" aria-hidden="true"><span>FRIEND FEED</span><b>08 · scrolling</b></div>
</div>

  <article class="monthly-date-replay__entry" data-monthly-date-entry>
    <time datetime="2026-08-15"><span>08</span><strong>15—18</strong></time>
    <div class="monthly-commit-entry__meta" aria-label="更新状态"><span class="monthly-commit-entry__state monthly-commit-entry__state--review">reviewed</span><code>main / interface</code><span>页面与评论区</span></div>
    <p>重点变成友链预览、申请说明、推荐卡片和评论区。这几天还处理了字体自托管、移动端布局、评论区身份、AI 摘要、AI 推荐和站长邮件验证，改完一个地方，另一个地方往往又冒出一点间距问题。</p>
  </article>
  <article class="monthly-date-replay__entry" data-monthly-date-entry>
    <time datetime="2026-08-19"><span>08</span><strong>19—24</strong></time>
    <div class="monthly-commit-entry__meta" aria-label="更新状态"><span class="monthly-commit-entry__state monthly-commit-entry__state--sync">synced</span><code>main / moments</code><span>RSS 与关于我</span></div>
    <p>朋友圈开始接入 RSS，随机文章和分页也跟着补上。关于我页面、头像、Logo、页脚和图片资源重新整理了一遍，站内图片也逐步迁移到 WebP。</p>
  </article>
  <article class="monthly-date-replay__entry" data-monthly-date-entry>
    <time datetime="2026-08-25"><span>08</span><strong>25—26</strong></time>
    <div class="monthly-commit-entry__meta" aria-label="更新状态"><span class="monthly-commit-entry__state monthly-commit-entry__state--release">released</span><code>main / portal</code><span>友链穿梭与收尾</span></div>
    <p>主要是把友链穿梭补完整，继续增加友链，调整导航栏光标和页面动画，再把小爱回复后台、自动部署这些收尾工作接起来。</p>
  </article>
  <p class="monthly-date-replay__closing">有些改动现在已经看不出来当时花了多久，但它们叠在一起，才是这个月博客真正发生的变化。</p>
</div>

## 自动上架：这个月真正新增了什么

自动上架这个月修了不少底层问题，但这些东西对博客读者没有直接影响，同事只要知道它们已经处理好就够了。真正值得展开写的，是两个会改变实际工作方式的新功能：旧链接折扣批量处理，以及可以直接交到别人电脑上的采购工具。

修 Bug 的过程我没有删，只是先收起来。想看细节可以展开；只关心这月多了什么，直接往下读就行。

<details class="monthly-fix-notes">
  <summary>
    <span><strong>本月修复记录</strong><small>型号与标题 · 状态同步 · 图片参数联动</small></span>
  </summary>
  <div class="monthly-fix-notes__body">
    <section>
      <h3>型号和标题规则，先把地基打牢</h3>
      <p>这个月先更新了印尼备货型号表。旧表有 299 条记录，新表变成了 301 条，新增两条 8.8 英寸型号，也调整了两处货位。更新之后，我又重新检查品牌、尺寸、字段完整性、重复冲突和 SKU 前缀，确认没有未知品牌、缺字段或非法前缀。</p>
      <p>表格制作器里的图案编号也重新对过：3Y 对应 3Y-Fold，书本款要区分 No Pen Slot 和 With Pen Slot。这些词看着只是几个字符串，最后却会进入 SKU、图片目录和标题规则。前面改得随意一点，后面就可能出现图片匹配不上、型号分错组的问题。</p>
      <p>标题这边也检查了 AI 随机组合、固定品牌、型号字段和字符上限。平台给出的上限是一回事，实际生成时还得留出安全余量，不能每次都贴着边缘写。配置检查中还发现过店铺档案和当前活动配置之间的细小不一致，这类问题平时可能不报错，批量发布时却很容易被放大。</p>
    </section>
    <section>
      <h3>后台已经结束，页面为什么还卡着</h3>
      <p>自动上架期间遇到过一次很典型的问题：Shopee 任务实际上已经 12/12、100%，后台状态也结束了，页面却还停在原来的步骤。</p>
      <p>后来查清楚，任务没有停，卡住的是前台。SSE 长连接中途断掉，最后那条完成事件没有送到页面，所以用户看到的还是旧状态。这个问题如果只看界面，很容易误以为整个任务失败了。</p>
      <p>之后我给服务端补了心跳、自动重试、TCP keepalive 和禁止代理缓冲，前端再加一层每 5 秒一次的轻量状态同步。SSE 出错、网络恢复、窗口重新聚焦或页面重新可见时，都会主动把状态重新对齐。Shopee 和 TikTok Shop 的事件流也保持独立，一个平台的连接坏了，不能把另一个平台一起带偏。</p>
      <p>这次之后，我不太敢再把“有长连接”直接叫作实时了。连接会断，断了要有人补，补回来的状态还要和已经显示过的日志合并，这些都算在实时功能里面。</p>
    </section>
    <section>
      <h3>图片参数联动，范围不能串</h3>
      <p>设置页面还加了图片参数联动。以前改不同品牌时，需要重复填写每组图数、辅图数量、AI 识图和跳过序号几项参数。现在在当前店铺、当前平台、当前模板和当前通用类型的范围内，可以指定一个品牌作为同步源，其他品牌跟着更新。</p>
      <p>这里最容易出错的不是同步本身，而是同步范围。普通模板和通用模板要分开，3Y、书本、笔槽、旋转也要分开；主图、变种图、偏移、标题和视频配置不能顺手一起覆盖。保存时原有的跳过序号冲突检查和九张产品图上限也必须保留。</p>
      <p>配置功能特别容易出现一种错觉：页面上看起来只是改了当前这一组，实际上却把别的模板也一起改了。等到真正上架时才发现，通常已经晚了。所以这次我更在意“只改该改的地方”。</p>
    </section>
  </div>
</details>

### 旧链接折扣，先学会识别再批量处理

这个月还加了“批量开启旧链接折扣”。它会逐个打开旧链接的促销设置，识别折扣列，开启全部变种；只有非空折扣值一致时才继续批量更新，不一致的链接就跳过，并记录跳过原因。

<ol class="monthly-discount-path" aria-label="旧链接折扣处理逻辑">
  <li><strong>识别折扣列</strong><small>促销价格不算折扣</small></li>
  <li><strong>只比较非空值</strong><small>空白行不参与判断</small></li>
  <li><strong>相同才继续</strong><small>50 / 50 / 50</small></li>
</ol>
<p class="monthly-discount-path__outcomes"><span><b>一致</b>批量处理</span><span><b>不一致</b>跳过，并记录原因</span></p>

![批量工具面板](/monthly-2026-08/toolbox.png)

这个工具一开始也踩了坑：未开启变种的空白行，被误当成了无法识别；折扣列和促销价格也不能混在一起看，不能看到一个 0 到 100 的数字，就认定那是折扣。后来规则改成只比较折扣列里非空的数值，空白行不参与一致性判断。50、50、50 可以继续处理，50、50、51 就必须停下来。

现场读到过一个 96 个变种的促销弹窗，其中 78 个非空折扣值全部是 50%，另外 18 个为空。识别完成后弹窗正常关闭，核心读取逻辑是通的；不过重启后台服务后的完整批量提交验证还需要单独补一轮，所以这件事我只写到“识别和跳过逻辑已经验证”，不把它夸成百分之百完成。

自动化最怕自信过头。标题错一次，可能只是一个商品；折扣错一次，可能就是一批链接。能识别、能跳过、能留下理由，有时比不管三七二十一都执行更重要。

### 写出来是一回事，交到别人电脑上又是另一回事

这个月还把采购工具整理成了可以交付的版本。以前工具能在我电脑上运行，不代表换一台 Windows 电脑也能顺利启动。于是我把安装和启动流程收成双击就能执行的脚本，数据也放进本地数据库里，尽量不让接手的人先去补一套开发环境。

这种工作不太有“做完一个功能”的爽感，更多时候是在另一台电脑上反复点安装、点启动，再看它到底能不能真的打开。对我来说，能交到别人手里正常使用，比我自己本地跑通更像完成。

## 这个月也做了几次“停止”

<div class="monthly-stop-pair" aria-label="本月做出的两次停止决定">
  <article class="monthly-stop-pair__item monthly-stop-pair__item--left">
    <div><strong>Rain 记账</strong><span>已停更</span></div>
    <small>不再给自己新开一条线</small>
  </article>
  <span class="monthly-stop-pair__pause" aria-hidden="true"><i></i><i></i></span>
  <article class="monthly-stop-pair__item monthly-stop-pair__item--right">
    <div><strong>8888 元项目</strong><span>未接</span></div>
    <small>不把接下来几个月押进去</small>
  </article>
</div>

8 月 26 日起，Rain 记账项目正式停更。中转那边余留的 Pro 号也都处理掉了。不是它完全没有继续做的价值，而是我现在确实没有那么多精力，再开一条线只会让手上的事情越来越散。

这月还碰到了一笔 8888 元的企业级自动上架项目。对方愿意买下这套独家系统，听起来确实很诱人，但我当时第一反应不是“赚到了”，而是“接下来是不是要被它拴住”。

我爸说，我赚的这点钱，他躺着都能赚到，没必要为了这点钱糟蹋身体。话听起来有点扎心，但我后来想想，确实有道理。我只是刚出来没多久的大学生，第一次接这么大的单，项目一旦接下，后面几个月很可能都要围着它转。那这 8888 元到底能不能换回我失去的休息、生活和做自己项目的时间，我自己都没法确定。

所以最后还是没接。不是不想赚钱，就是不想还没开始过日子，先把接下来几个月都押给一个项目。

以前我可能会觉得，别人愿意付钱，就应该赶紧答应。现在至少会先问自己几句：这件事是不是非我不可？会不会把接下来的时间全部占满？拿到的钱，能不能抵消掉我放弃的东西？这些问题没有标准答案，但问一遍之后，很多决定会清楚一点。

## 这个月最有意思的事：我一直在加，也一直在删

这个月真正让我觉得有意思的，不是又加了什么按钮，而是删掉了几样看起来挺酷的东西。

我做过一个加载动画，里面是一个忙着写代码的小人，旁边还有猫和各种代码窗口。单看原图其实很可爱，做成动效之后也确实会忙起来。可放回博客整体的浅色简约风里，总觉得它太热闹了，人物、代码框、装饰线同时动起来，页面的气质有点接不上。看了几遍之后，我自己先看不顺眼了，于是把它放进了废案。

<center>
  <figure>
    <img class="monthly-rejected-image monthly-rejected-image--loading" src="/monthly-2026-08/loading-girl.webp" alt="最后没有放进博客的加载小人" loading="lazy" decoding="async">
  </figure>
</center>
<p class="monthly-rejected-note monthly-rejected-note--loading"><span>没上线</span><strong>不知道为什么，和网站整体的风格就是不太搭。</strong></p>

<p class="monthly-workbench-intro">另一个是任务工作台。它做到一半时，已经有任务列表、项目脉络、右侧智能详情和时间线，看起来像一个很完整的后台。问题也正是从这里开始：为了让它“看起来像个工作台”，我加了太多暗色卡片、状态、层级和装饰，信息反而没有飞书那么清楚。工作台这种东西，第一要求应该是找得到任务、看得懂状态、知道下一步做什么，不是每个角落都要有光效。</p>

<img class="monthly-rejected-image monthly-rejected-image--workbench" src="/monthly-2026-08/task-workbench.png" alt="做到一半的任务工作台" loading="lazy" decoding="async">
<p class="monthly-rejected-note monthly-rejected-note--workbench"><span>没继续</span><strong>信息太多，还是飞书更清楚。</strong></p>

最后这个工作台没有继续做下去，我还是用回了飞书。图和代码都留着，项目先停在这里。以后如果再做，我会先从信息结构开始，而不是先想“这一块做成什么效果”。

还有一个更冒险的东西：我把 AI 接进了博客的反馈流程。它会读评论里描述的问题，自己打开页面检查，尝试找到出错的组件，再把原因和处理结果回复到评论区。截图里“小爱客服”的几条回复，就是它真的跑起来后的样子。从 `icon not found` 一路查到 Svelte 图标组件，它甚至已经开始用站长的口吻告诉用户“已确认”“正在修”。

<img class="monthly-rejected-image monthly-rejected-image--review" src="/monthly-2026-08/ai-bug-review.png" alt="被撤回的 AI 网页检修功能" loading="lazy" decoding="async">
<p class="monthly-rejected-note monthly-rejected-note--review"><span>没放开</span><strong>权限太高，最后还得我看一眼。</strong></p>

刚跑起来的时候确实挺爽，像是有人替我值班。可很快就觉得不对：它不只是回答问题，而是真的能碰代码、改页面，再把结论发出去。判断对了当然省事，判断错一次，就可能把一个小 Bug 修成另一个 Bug；把权限收紧后，它又只能给出一份看起来很完整、最后仍然要我重新检查的答案。

所以自动修改被我撤了，现在最多让它帮忙发现问题、整理线索，真正要动代码时还是先让我看一眼。友链自动可用性检查也一起收紧了——漏掉一次提醒没什么，把正常链接误判掉才麻烦。

<details class="monthly-idea-drawer">
  <summary>打开废案抽屉</summary>
  <p>这三份废案我都留了下来。它们至少提醒我：可爱不等于适合，做出来也不等于一定要上线；功能越“聪明”，越要想清楚它能碰什么、出了错由谁兜底。以后再冒出类似的点子，先看看它能不能和现有页面待在一起，也看看权限是不是给得太多，再决定要不要继续。</p>
</details>

以前总觉得项目应该不断加功能，加到看起来越来越强。现在反而觉得，知道什么不该留下，也算是在做产品。尤其是自动修改、自动判断和高权限操作，程序该停的时候停，不确定的时候把问题交给人，可能比“什么都替你做”更靠谱。

## 生活篇

我的小家折腾了两三个月，终于算是搭起来了，给你们看看。

<figure class="monthly-home-story" data-home-story>
  <div class="monthly-home-story__photo">
    <span class="monthly-home-story__tape monthly-home-story__tape--top" aria-hidden="true"></span>
    <img class="monthly-home-image" src="/monthly-2026-08/desk-setup.png" alt="我的小家：白色桌面、粉色椅子和正在使用的电脑" loading="lazy" decoding="async">
    <span class="monthly-home-story__sticker" aria-hidden="true">下班后 · 20:47</span>
    <span class="monthly-home-story__pin" aria-hidden="true"></span>
    <span class="monthly-home-story__photo-note" aria-hidden="true">桌面还没收拾好<br><b>但我已经回来了</b></span>
  </div>
  <figcaption>
    <div class="monthly-home-story__caption-meta"><span>HOME / 2026.08</span><span>AFTER WORK</span></div>
    <strong>下班以后，终于有个地方可以慢下来。</strong>
    <span class="monthly-home-story__caption-echo">桌面还是会乱，但愿意回来坐下来的时候，我就觉得它搭对了。</span>
    <div class="monthly-home-story__details" aria-label="桌面上的小细节">
      <span><i aria-hidden="true"></i><b>电竞椅子</b><small>坐下来就不想动</small></span>
      <span><i aria-hidden="true"></i><b>橘色鼠标</b><small>写代码也打游戏</small></span>
      <span><i aria-hidden="true"></i><b>一张长桌</b><small>把日子放在一起</small></span>
    </div>
  </figcaption>
</figure>
<p class="monthly-home-note"><span>下班以后</span>想写东西就写东西，想玩游戏就玩游戏。</p>

地方不算大，东西也不是什么特别贵的配置：显示器、键盘、鼠标、主机，再加上一些零零碎碎的生活用品。桌面乱的时候还是会乱，但它是我一点点整理出来的地方，工作、写博客、折腾代码、打游戏和休息都在这里发生。

白天上班，晚上回到家，换个舒服的姿势坐下来，想写东西就写东西，想玩游戏就玩游戏，中间不用再切换场景，也不用一直担心有人催进度。每天下完班在这里玩一会儿，真的挺自在。

以前总觉得，等以后赚到更多钱、住进更大的房子，生活才算真正开始。现在倒觉得，能有一个下班后愿意回去坐一会儿的地方，已经是很不错的事情了。

## 8 月推荐友链

月刊里还有一个我很喜欢的部分：每个月挑一些站点，认真推荐给看到这里的人。

它不是永久榜单，每个月都会刷新。因为这是第一次正式做月刊，上月的推荐暂时延续到 9 月底。这次一共放 10 个站点，里面有我平时会看的，也有这段时间刚好逛到、留下印象的。

我主要看文章，也会看设计。有些站点是我自己长期关注的，有些是最近翻到之后觉得值得留下，还有几位是先让 AI 筛的，由我Ai每月固定点进去读文章、看页面。AI 负责帮我找站，最后推不推荐，也是完全看Ai脸色。

### [AIOVTUE-雪](https://daily.yybb.us/)

<span class="monthly-friend-avatar" data-mark="雪"><img src="https://r2tc.20030327.xyz/file/博客/主题/1780655293662_avatar_me.jpg.PNG" alt="AIOVTUE-雪头像" loading="lazy" decoding="async"></span>

<div class="monthly-friend-meta" aria-label="站点标签"><span class="monthly-friend-recommend">本月推荐</span><span>博客主题</span><span>开源</span><span>教程</span></div>

这个站一直在更新，主题和页面也在持续打磨。能看出来站长不是换完模板就放着，而是真的在把它当成一个会长期使用的地方。很多细节不抢眼，但你多看几眼就会发现，它们都不是随便放上去的。

### [Homulilly](https://homulilly.com)

<span class="monthly-friend-avatar" data-mark="H"><img src="https://homulilly.com/images/avatar.jpg" alt="Homulilly头像" loading="lazy" decoding="async"></span>

<div class="monthly-friend-meta" aria-label="站点标签"><span class="monthly-friend-recommend">本月推荐</span><span>Hexo</span><span>博客主题</span><span>开源</span></div>

这个站把个人博客、主题开发和实用工具放在了一起，最近也一直在打磨 FlatPaper 主题和站点之间的连接。想先读一篇的话，可以从《[Hexo Theme Flatpaper 加入朋友圈大家庭](https://homulilly.com/post/hexo-theme-flapaper-now-support-friend-circle-md.html)》开始；既能看到作者对 Hexo 主题的思路，也能看到他如何把自己的博客继续往前做。

### [番茄主理人](https://blog.fqzlr.top/)

<span class="monthly-friend-avatar" data-mark="番"><img src="https://q1.qlogo.cn/g?b=qq&nk=20447289&s=640" alt="番茄主理人头像" loading="lazy" decoding="async"></span>

<div class="monthly-friend-meta" aria-label="站点标签"><span class="monthly-friend-recommend">本月推荐</span><span>个人博客</span><span>技术分享</span><span>建站记录</span></div>

这是一个很有自己表达的个人博客，页面里既有文章、归档和知识索引，也有不少围绕站点本身做的交互和整理。它不只是把内容放上去，还在持续把博客当成一个长期经营的空间，这种认真劲儿很容易让人多逛一会儿。

### [小曦的园子](https://xiaoxi.ac.cn/)

<span class="monthly-friend-avatar" data-mark="曦"><img src="https://img.xiaoxi.ac.cn/logo.png" alt="小曦的园子头像" loading="lazy" decoding="async"></span>

<div class="monthly-friend-meta" aria-label="站点标签"><span class="monthly-friend-recommend">本月推荐</span><span>个人博客</span><span>生活记录</span></div>

很会把小互动做得可爱，又不会为了动效把内容盖住。站里的小巧思不少，评论区的一些视觉灵感我也是逛到之后才发现，原来还可以这样处理。

### [Detached](https://detached.online/)

<span class="monthly-friend-avatar" data-mark="D"><img src="https://detached.online/icon-512.png" alt="Detached头像" loading="lazy" decoding="async"></span>

<div class="monthly-friend-meta" aria-label="站点标签"><span class="monthly-friend-recommend">本月推荐</span><span>独立开发</span><span>技术工具</span><span>生活记录</span></div>

文章写独立开发、技术工具和日常观察，更新节奏也比较稳。它的页面不花，读起来却不会觉得单薄，有一种安安静静把事情记录下来的感觉。

### [Ditto](https://blog.blueke.top/)

<span class="monthly-friend-avatar" data-mark="Di"><img src="https://gcore.jsdelivr.net/gh/Keduoli03/My_img@img/avatar.jpg" alt="Ditto头像" loading="lazy" decoding="async"></span>

<div class="monthly-friend-meta" aria-label="站点标签"><span class="monthly-friend-recommend">本月推荐</span><span>Astro</span><span>AI</span><span>技术分享</span></div>

我是真的喜欢他的文章。技术部分写得清楚，表达又不端着，偶尔还会带一点自己的判断和脾气。看完之后不会只记住一个结论，也会记住他是怎么想到那里去的，这点挺难得。

### [桃之夭夭](https://taozhiyy.top/)

<span class="monthly-friend-avatar" data-mark="桃"><img src="https://taozhiyy.top/cos/1.png" alt="桃之夭夭头像" loading="lazy" decoding="async"></span>

<div class="monthly-friend-meta" aria-label="站点标签"><span class="monthly-friend-recommend">本月推荐</span><span>React</span><span>AI</span><span>建站记录</span></div>

我最先注意到的是站里的动画和小互动。它们都不算特别夸张，但很会把页面的气氛撑起来，动起来的时候有一种轻松的感觉。我最近折腾博客交互时，确实偷偷看了不少——抄是不可能承认的，借鉴了一点点。

### [爱吃猫的鱼](https://blog.talen.top/)

<span class="monthly-friend-avatar" data-mark="鱼"><img src="https://image.talen.top/20251229184705_wgsva7g9.png" alt="爱吃猫的鱼头像" loading="lazy" decoding="async"></span>

<div class="monthly-friend-meta" aria-label="站点标签"><span class="monthly-friend-recommend">本月推荐</span><span>建站</span><span>自动化</span><span>技术分享</span></div>

内容比较扎实，技术文章、自动化、博客建设和生活记录都有。尤其是自研博客系统和 FlecBlog 相关内容，能看出来作者不是只写一篇就走，而是在认真维护自己的工具和写作空间。

### [Petrichor's Blog](https://blog.telyra.top/)

<span class="monthly-friend-avatar" data-mark="P"><img src="https://blog.telyra.top/avatar.webp" alt="Petrichor's Blog头像" loading="lazy" decoding="async"></span>

<div class="monthly-friend-meta" aria-label="站点标签"><span class="monthly-friend-recommend">本月推荐</span><span>个人博客</span><span>技术随笔</span><span>生活记录</span></div>

主要记录技术实践、AI 使用心得和各种折腾过程。最近写到 Codex、VibeCoding 和实际工具的内容，我觉得比较具体，不只是说“用了某个工具很方便”，还会写它到底怎么用、哪里会出问题。

### [MingBlog](https://mingblog.site/)

<span class="monthly-friend-avatar" data-mark="M"><img src="https://mingblog.site/icons/icon-512.png" alt="MingBlog头像" loading="lazy" decoding="async"></span>

<div class="monthly-friend-meta" aria-label="站点标签"><span class="monthly-friend-recommend">本月推荐</span><span>个人博客</span><span>生活记录</span><span>旅行观察</span></div>

这是一个很有自己审美的生活记录站点，内容有影像、观察、观读听，也有一些小工具。页面简洁但不单调，最近的 FloraForm 也很有意思，适合喜欢把生活记录和创作放在一起的人。

## 评选规则

这不是按权重排的榜单，也不是一次性打分。每期主要看五件事：

- 有持续更新、能读到内容的站点；
- 有自己的表达和长期打磨的痕迹；
- 读完文章或逛完页面后，仍会想多停一会儿、再点开几篇的那种吸引力。
- 界面符不符合Ai的审美
- Ai觉得你的文章写得不错

满足这些才会被Ai写进当期月刊；下期会重新观察，不把推荐当永久标签。

剩下就是我个人评选啦，私信肯定有但不多~

## 写在第一期月刊最后

回头看，这个月留下来的不只是几个新页面和几个新工具，还有一些被我删掉的想法，以及几次认真考虑过之后做出的“不做”。

我开始更在意一件事：功能加上去之后，事情有没有真的变简单；自动化跑完之后，能不能说明白自己改了什么；一个项目赚到钱之后，值不值得拿接下来很长一段时间去换。

博客也一样。它可以有动画、友链穿梭、AI 摘要和各种小功能，但最后还是要回到文章本身。有人愿意停下来读一会儿，有人愿意留下评论，我也还愿意继续写，这就已经挺好了。

再说一件事儿，上班说到底，当然是奔着财富自由去的。但赶路的时候也别一直闷头往前冲，该停就停一下，看看自己这段时间到底走了多远，哪些坑不必再踩第二次。

我打算休息半个月，已经请好假了。把前面的经验捋一捋，把该放下的东西放下，等下一次想做什么的时候，再有力气重新开始。

好啦，第一期就到这里。下个月见。
