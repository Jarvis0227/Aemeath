---
title: 作品展示页动画实现原理
published: 2026-07-27
updated: 2026-07-31
description: 从滚动读数、目标与渲染进度、分镜区间出发，拆解 Rainzt.cn 作品展示页当前的工程化实现：长滚动固定舞台、requestAnimationFrame 平滑、媒体解码、快门转场与内容可访问性边界。
aiSummary: 作品展示页不再把动画当作几段独立淡入，而是把滚动位置变成一条可控的 0 到 1 时间轴。文章解释分镜、requestAnimationFrame 平滑、资源预热、快门转场和可访问性如何共同保证叙事连续。
image: ./cover.webp
tags: [Astro, 前端动画, CSS, JavaScript, 性能优化]
category: 博客改造
draft: false
---

最初做作品展示页时，我把它理解成“让五张卡片依次动起来”。后来页面经历了几轮调整，真正变化的不是多加了几个位移或淡入，而是实现的重心从“堆动画效果”转成了“维护一条可控制、可验证的滚动时间轴”。

现在的页面仍然没有引入重型动画库。Astro 负责结构和资源声明，CSS 负责固定舞台、裁切和图层关系，原生 TypeScript 只做一件事：把浏览器滚动位置转换为稳定的分镜状态。卡片、黑场快门、角色、视频和结尾文案都消费同一个进度值，但它们不再直接绑定原始滚动事件。

这篇文章记录作品展示页的实现思路。文中的区间、资源策略和代码片段以当时的实现为准，不再使用早期的 <code>760vh / 680vh</code> 时间轴或“滚一下就立刻改样式”的写法。

## 目标不是播放，而是让读者控制节奏

作品展示区有几个约束，它们决定了这不是一组普通的 CSS 入场动画：

- 读者慢慢滚动时，每一张作品卡片都要有足够的停留时间；停下来时，画面也应停住。
- 快速滚动、触摸板惯性和不同刷新率不应让画面突然跳帧。
- 转场要有连续的图层关系，不能让黑场、角色和下一幕像三次互不相干的淡入。
- 首次进入展示区时，图片解码不能集中阻塞主线程。
- 动画不是作品信息的唯一载体；键盘和辅助技术用户仍应能在普通作品列表中访问每个链接。

换句话说，这一页的输入不是“经过了多少秒”，而是“读者在叙事中的位置”。页面滚动位置只是输入信号，真正被渲染的是一个受控的 <code>0 ~ 1</code> 进度。

~~~text
scroll / resize
      |
      v
目标进度 targetShowcaseProgress
      |
      v
requestAnimationFrame 平滑追赶
      |
      v
渲染进度 renderedShowcaseProgress
      |
      v
phaseAt() 分镜区间 -> 卡片 / 快门 / 结尾场景
~~~

## 固定舞台：用滚动距离换取阅读时间

展示区使用“长容器 + sticky 舞台”的结构。长容器提供滚动距离，舞台始终固定在视口内，所有镜头都在这个舞台上完成。

~~~astro
<section class="cinematic-showcase" id="showcase">
  <div class="showcase-pin" data-showcase>
    <div class="showcase-intro">...</div>
    <div class="showcase-panels">...</div>
    <div class="showcase-interlude">...</div>
    <div class="showcase-finale">...</div>
  </div>
</section>
~~~

当前 CSS 使用的是桌面端 <code>850vh</code>、窄屏端 <code>760vh</code>，而不是早期更短的数值：

~~~css
.cinematic-showcase {
  position: relative;
  height: 850vh;
  margin-top: 2rem;
}

.showcase-pin {
  position: sticky;
  top: 0;
  height: 100svh;
  min-height: 37.2rem;
  overflow: hidden;
  isolation: isolate;
}

@media (max-width: 600px) {
  .cinematic-showcase { height: 760vh; }
}
~~~

这里的 <code>850vh</code> 不是动画持续时间，更像是时间轴的可用长度。真正可用的滚动距离不是容器高度本身，而是容器高度减去视口高度：

~~~ts
const measureShowcase = () => {
  if (!showcaseSection) return;
  showcaseStart = window.scrollY + showcaseSection.getBoundingClientRect().top;
  showcaseDistance = Math.max(
    1,
    showcaseSection.offsetHeight - window.innerHeight,
  );
};

const getShowcaseProgress = () =>
  clamp((window.scrollY - showcaseStart) / showcaseDistance);
~~~

这样做有两个细节。

第一，<code>showcaseStart</code> 在测量时写成相对文档的绝对位置，而不是每一帧都重新读取 <code>getBoundingClientRect()</code>。滚动路径中只需计算一次减法和一次夹取，避免不必要的布局读取。

第二，舞台高度选用 <code>100svh</code>。手机浏览器地址栏展开和收起时，<code>svh</code> 比传统 <code>vh</code> 更稳定；同时在 <code>resize</code> 时重新测量，并立即同步渲染进度，避免视口变化后动画从旧位置缓慢追赶到新位置。

~~~ts
const resizeShowcase = () => {
  measureShowcase();
  targetShowcaseProgress = getShowcaseProgress();
  renderedShowcaseProgress = targetShowcaseProgress;
  lastShowcaseProgress = -1;
  applyShowcaseProgress(renderedShowcaseProgress);
};
~~~

移动端并没有简单地把故事压缩得更快。当前实现缩短了总行程，并隐藏卡片中的长说明文字；保留编号和标题，让每个镜头仍有可理解的停留。

## 不在 scroll 回调里直接渲染

最容易写出的版本，是在每次 <code>scroll</code> 事件中读取进度并修改所有元素的 <code>style</code>。它在鼠标滚轮上似乎可行，但触摸板惯性、主线程短暂停顿和高刷新率设备会让同一段动画显得忽快忽慢。

当前实现把“用户想去哪里”和“当前画面画到哪里”分开：

~~~ts
const SCROLL_SCRUB_DURATION = 180;
const SHOWCASE_SETTLE_EPSILON = .00008;

let targetShowcaseProgress = 0;
let renderedShowcaseProgress = 0;
let showcaseFrame = 0;
let lastShowcaseTimestamp = 0;

const requestShowcaseUpdate = () => {
  targetShowcaseProgress = getShowcaseProgress();
  if (showcaseFrame) return;
  lastShowcaseTimestamp = 0;
  showcaseFrame = window.requestAnimationFrame(renderShowcase);
};
~~~

滚动事件只更新目标值，并且以被动监听注册：

~~~ts
window.addEventListener("scroll", requestShowcaseUpdate, { passive: true });
window.addEventListener("resize", resizeShowcase, { passive: true });
~~~

实际渲染发生在 <code>requestAnimationFrame</code> 中。这里没有使用固定比例的 <code>progress += 0.1</code>，而是使用基于时间差的指数平滑：

~~~ts
const renderShowcase = (timestamp: number) => {
  const elapsed = lastShowcaseTimestamp
    ? Math.min(64, Math.max(0, timestamp - lastShowcaseTimestamp))
    : 16.67;

  lastShowcaseTimestamp = timestamp;

  const blend = 1 - Math.exp(-elapsed / SCROLL_SCRUB_DURATION);
  renderedShowcaseProgress +=
    (targetShowcaseProgress - renderedShowcaseProgress) * blend;

  if (
    Math.abs(targetShowcaseProgress - renderedShowcaseProgress) <
    SHOWCASE_SETTLE_EPSILON
  ) {
    renderedShowcaseProgress = targetShowcaseProgress;
  }

  applyShowcaseProgress(renderedShowcaseProgress);

  if (
    Math.abs(targetShowcaseProgress - renderedShowcaseProgress) >=
    SHOWCASE_SETTLE_EPSILON
  ) {
    showcaseFrame = window.requestAnimationFrame(renderShowcase);
    return;
  }

  showcaseFrame = 0;
  lastShowcaseTimestamp = 0;
};
~~~

<code>blend = 1 - exp(-dt / duration)</code> 的好处是刷新率无关：在 60Hz 和 120Hz 屏幕上，画面趋近目标的速度一致。<code>elapsed</code> 被限制到 64ms，标签页从后台恢复时也不会因一个异常大的时间差直接跳到终点。进度足够接近后停止申请下一帧，减少静止状态下的无效工作。

渲染函数内部还有一层更细的保护：当新旧进度相差小于 <code>0.00001</code> 时，不再重写样式。这一层在慢速滚动或停住后很有价值，因为页面的图层比普通卡片页多得多。

## phaseAt：把连续进度切成可维护的分镜

所有镜头都从同一个 <code>progress</code> 出发，但每个镜头只关心属于自己的时间窗口。为此实现了一个“局部阶段函数”：

~~~ts
const clamp = (value: number) => Math.min(1, Math.max(0, value));

const ease = (value: number) => {
  const t = clamp(value);
  return t * t * (3 - 2 * t);
};

const phaseAt = (progress: number, start: number, end: number) =>
  ease((progress - start) / Math.max(.001, end - start));
~~~

<code>phaseAt(progress, start, end)</code> 会先把任意区间归一化到 <code>0 ~ 1</code>，再套一层 smoothstep。它有三个稳定的状态：开始前为 0，区间内平滑变化，结束后为 1。这样每段动画不需要知道页面总高度，也不用自己处理越界。

当前时间轴大致如下：

| 分镜 | 进度区间 | 目的 |
| --- | --- | --- |
| 引导文案淡出 | 0.00 - 约 0.21 | 让读者从引导进入作品卡片 |
| 五张卡片入场 | 第 <em>i</em> 张为 0.04 + 0.055i 到 0.16 + 0.055i | 逐张落位，最后一张不被前几张挤压 |
| 卡片文字入场 | 第 <em>i</em> 张为 0.16 + 0.05i 到 0.25 + 0.05i | 图片先建立画面，再交代标题 |
| 卡片退场 | 0.60 - 0.72 | 统一清空，不留下半透明边框 |
| 黑场与角色 | 0.63 - 0.97 | 把卡片阶段交给快门转场 |
| 上下快门合拢 / 展开 | 0.72 - 0.84 / 0.91 - 0.97 | 形成完整的一次闭合与打开 |
| 结尾场景 | 0.88 - 1.00 | 在转场遮挡下预热，再分层揭示 |

表格里的数字不是“魔法常量”，而是对叙事节奏的显式描述。它们集中在渲染函数里，调整某一幕时只需要移动相邻区间，不会牵连一堆独立的 <code>@keyframes</code>。

## 卡片为什么要同时算透明度和几何退场

五张作品卡片由数据数组生成，动画代码只使用索引。入场和退场使用同一组局部进度：

~~~ts
const inProgress = phase(.04 + index * .055, .16 + index * .055);
const dissolve = phase(.60, .72);
const direction = index % 2 === 0 ? 1 : -1;

const startingY = (1 - inProgress) * direction * 150;
const fanX = (index - 2) * dissolve * -3.25;
const fanY = (index - 2) * dissolve * 1.35;

panel.style.opacity = String(inProgress * (1 - dissolve));
panel.style.transform =
  "translate3d(" + fanX + "vw, " +
  (startingY + fanY) + "%, 0) " +
  "scale(" + (1 - dissolve * .12) + ") " +
  "rotate(" + ((index - 2) * dissolve * 1.35) + "deg)";
~~~

入场时，奇偶卡片从相反方向进入；退场时，它们微微散开、缩小并旋转。更重要的是，透明度使用 <code>inProgress * (1 - dissolve)</code>，所以退场结束时一定回到 0。

这个约束是有原因的。早期版本曾保留少量半透明残影，卡片边框会在纯黑转场和窗景上变成一层浅灰横带。对于这种需要明确切镜的页面，残影不是氛围，而是上一幕没有离开干净的证据。

卡片文字单独安排了入场和退场，避免与图片一起仓促消失：

~~~ts
const copyIn = phase(.16 + index * .05, .25 + index * .05);
const copyOut = phase(.58, .70);

copy.style.opacity = String(copyIn * (1 - copyOut));
copy.style.transform =
  "translate3d(0, " +
  ((1 - copyIn) * 18 - dissolve * 26) +
  "px, 0)";
~~~

这让“图像抵达”和“文字可阅读”成为两个独立的节拍。设计上真正需要保证的不是卡片出现得多炫，而是最后一张卡片完全出现后，读者仍有机会理解它。

## 快门转场不是淡出，而是一段可交接的场景

卡片退场后，展示区进入黑场。这里的核心不是给画面叠一层黑色，而是明确每一层的职责：

| 图层 | 作用 |
| --- | --- |
| 黑色背景 | 切断前一段丰富的卡片画面，给下一幕提供干净底色 |
| 上下两条横幅 | 从左右移动，完成快门的合拢和再次展开 |
| 前景角色 | 在黑场中连接卡片阶段与结尾场景 |
| 两个大字 | 只在快门闭合后的短暂读秒出现 |
| 结尾场景 | 先在黑场后方完成准备，再在遮挡结束后被看见 |

上下横幅不是只进不出。它们先从画面外移动到中间，在角色和文字退出时回到两侧：

~~~ts
const stripsIn = phase(.72, .84);
const stripsOut = phase(.91, .97);
const stripPosition = stripsIn * (1 - stripsOut);

shutterStripLeft.style.transform =
  "translate3d(" + ((1 - stripPosition) * -108) + "%, 0, 0)";
shutterStripRight.style.transform =
  "translate3d(" + ((1 - stripPosition) * 108) + "%, 0, 0)";
~~~

结尾场景则从 <code>0.88</code> 就开始在快门后方进入：整体场景先渐显，视频和中景在 <code>0.90 - 0.97</code> 进入，前景角色到 <code>0.94 - 1.00</code> 才落位。这个重叠不是浪费，而是为了让读者先看到“场景已在”，再感受到前、中、后景的空间关系。

视频只在进度超过一个很小的阈值后尝试播放，并忽略被浏览器自动播放策略拒绝的结果：

~~~ts
const v = phase(.90, .97);
finaleVideo.style.opacity = String(v);
setVisibility(finaleVideo, v > 0);

if (v > .02 && finaleVideo.paused) {
  finaleVideo.play().catch(() => undefined);
}
~~~

<code>visibility</code> 会在图层完全不可见时关闭其可见性；视频仍然带有 <code>muted</code>、<code>loop</code>、<code>playsinline</code> 和 <code>preload="auto"</code>。即使视频不能自动播放，静态中景和前景仍会完整呈现，结尾不会变成空白。

## 资源预热：不要把所有图片同时 decode

展示区一次会用到卡片、快门和结尾场景的多张图片。如果在首次进入页面时对所有图片立即调用 <code>decode()</code>，图片解码可能和首段滚动竞争主线程，反而让第一幕出现卡顿。

当前策略按两个图片为一组预热，每完成一组就让出一个动画帧：

~~~ts
const warmShowcaseMedia = async () => {
  for (const batch of showcaseImageBatches) {
    await Promise.all(
      batch.map(async (image) => {
        await waitForImage(image);
        await image.decode?.().catch(() => undefined);
      }),
    );

    await new Promise((resolve) => {
      window.requestAnimationFrame(() => resolve());
    });
  }
};
~~~

<code>waitForImage()</code> 同时监听 <code>load</code> 和 <code>error</code>，单张资源失败不会把整条预热链卡住。这个策略不追求“最早把所有内容解码完”，而是控制一次被调度到主线程的工作量，让首页和第一段滚动仍保持响应。

## 动画层不承担链接职责

展示区不承担项目链接职责：卡片列表和快门转场容器标记为 <code>aria-hidden</code>，结尾场景中的图片使用空的 <code>alt</code>。真正可点击、带标题和描述的项目内容在下面的普通作品网格中：

~~~astro
<div class="showcase-panels" aria-hidden="true">...</div>

<section class="works-section" id="works">
  <article class="work-card">
    <a class="work-card-link" href="...">...</a>
  </article>
</section>
~~~

这避免了同一批作品被屏幕阅读器重复朗读，也让动效失效、被跳过或尚未加载时，内容仍有一条稳定的阅读路径。首屏的“向下看作品”入口指向 <code>#showcase</code>，保证想体验叙事的读者进入动画开头；而普通网格则负责承载可访问的项目导航。

这里还有一个应继续完善的点：当前的 <code>prefers-reduced-motion</code> 已经关闭了常规内容的 reveal 过渡，但还没有为整段分镜提供专门的静态展示模式。由于作品链接不依赖动画层，内容不会丢失；下一步更理想的做法是让该媒体查询直接展示首帧或静态作品列表，并跳过滚动平滑与视频播放。

## 验证不是“看起来能动”

每次调整分镜后，我会从三个方向检查：

1. 节奏：慢慢滚动时，第五张卡片和结尾文案是否都有可阅读的停留；快速滚动后画面是否平稳追上目标，而不是闪到终点。
2. 图层：卡片退场后是否确实为 0；黑场是否干净；快门再次打开时，结尾场景是否已经准备好而没有白屏或裸露的中间状态。
3. 环境：在展示区内改变窗口尺寸或旋转手机，进度是否保持；禁用或拒绝视频自动播放时，结尾是否仍可理解；键盘访问时，作品链接是否只在普通列表中出现一次。

内容改动完成后，仓库内使用以下命令检查：

~~~bash
pnpm check
pnpm type-check
pnpm build
~~~

## 结语

这页最终留下的不是一套“滚动动画技巧”，而是一种更适合维护的拆分方式：

- CSS 管舞台、裁切和图层；
- 滚动事件只更新目标；
- rAF 负责在帧间平滑渲染；
- 分镜函数把连续进度切成可读的区间；
- 资源预热和可访问内容各自有独立边界。

当动画需要继续加镜头、换素材或调整节奏时，最重要的不是继续往页面里塞效果，而是先问清楚：这段变化处在哪个区间、它和前后镜头如何交接、内容是否仍有不依赖动画的路径。把这些问题写进结构之后，滚动才会真正成为叙事，而不是一串碰巧同时发生的视觉效果。
