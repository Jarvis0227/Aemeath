<script lang="ts">
import { afterUpdate, onDestroy, onMount } from "svelte";
import {
	curatedLottieQqEmojiIds,
	featuredLottieEmojis,
	type LottieEmojiItem,
	qqLottieEmojiLabels,
} from "../../constants/lottieEmojis";
import { initLottieEmojis, setLottiePlayback } from "../../scripts/lottie";

type QqIndex = {
	items: Array<{
		name: string;
		emojiId: string;
		describe: string;
	}>;
};

let items: LottieEmojiItem[] = featuredLottieEmojis;
let query = "";
let filter: "全部" | "精选" | "QQ" = "全部";
let loading = true;
let error = "";
let copiedName = "";
let copyStatus = "";
let copyStatusIsError = false;
let copyResetTimer: ReturnType<typeof setTimeout> | undefined;

$: normalizedQuery = query.trim().toLowerCase();
$: filteredItems = items.filter((item) => {
	const matchesFilter = filter === "全部" || item.group === filter;
	const searchable = [item.name, item.label, item.emojiId, item.description]
		.filter(Boolean)
		.join(" ")
		.toLowerCase();
	return (
		matchesFilter && (!normalizedQuery || searchable.includes(normalizedQuery))
	);
});
$: visibleItems = filteredItems;

onMount(async () => {
	try {
		const response = await fetch(
			`${import.meta.env.BASE_URL}lottie/qq-index.json`,
		);
		if (!response.ok) throw new Error(`HTTP ${response.status}`);
		const data = (await response.json()) as QqIndex;
		const qqItems = data.items
			.filter((item) => curatedLottieQqEmojiIds.has(item.emojiId))
			.map((item) => ({
				name: item.name,
				label:
					item.describe.replace(/^\//, "").trim() ||
					qqLottieEmojiLabels[item.emojiId] ||
					`QQ 表情 ${item.emojiId}`,
				group: "QQ" as const,
				emojiId: item.emojiId,
				description: item.describe,
			}));
		items = [...featuredLottieEmojis, ...qqItems];
	} catch (loadError) {
		console.error("Failed to load the Lottie index", loadError);
		error = "QQ 表情索引暂时加载失败，但精选表情仍然可以预览。";
	} finally {
		loading = false;
	}
});

onDestroy(() => {
	if (copyResetTimer) clearTimeout(copyResetTimer);
});

afterUpdate(() => {
	initLottieEmojis();
});

function changeFilter(nextFilter: "全部" | "精选" | "QQ") {
	filter = nextFilter;
}

function playPreview(name: string) {
	setLottiePlayback(name, true);
}

function pausePreview(name: string) {
	setLottiePlayback(name, false);
}

async function copyCommentCode(item: LottieEmojiItem) {
	const shortcode = `:lottie_${item.name}:`;
	try {
		await navigator.clipboard.writeText(shortcode);
		copiedName = item.name;
		copyStatusIsError = false;
		copyStatus = `已复制 ${item.label} 的评论代码 ${shortcode}`;
	} catch {
		copiedName = "";
		copyStatusIsError = true;
		copyStatus = `复制失败，请手动复制 ${shortcode}`;
	}

	if (copyResetTimer) clearTimeout(copyResetTimer);
	copyResetTimer = setTimeout(() => {
		copiedName = "";
		copyStatus = "";
		copyStatusIsError = false;
	}, 2400);
}

function handleCardKeydown(event: KeyboardEvent, item: LottieEmojiItem) {
	if (event.key !== "Enter" && event.key !== " ") return;
	event.preventDefault();
	void copyCommentCode(item);
}
</script>

<section class="lottie-page" aria-labelledby="lottie-page-title">
	<header class="lottie-intro">
		<div class="lottie-intro__copy">
			<h1 id="lottie-page-title">动态表情库</h1>
			<p>悬停卡片预览动画，点击即可复制评论代码；粘贴到评论区发布后，会自动显示为动态表情。</p>
		</div>
		<div class="lottie-intro__meta">
			<strong>{items.length}</strong>
			<span>个 Lottie 表情</span>
			<small>首帧预览 · 悬停播放</small>
		</div>
	</header>

	<div class="lottie-comment-guide">
		<span class="lottie-comment-guide__mark" aria-hidden="true">↳</span>
		<div>
			<strong>评论区已支持 Lottie</strong>
			<p>直接粘贴短码即可使用，精选与 QQ 表情都支持。</p>
		</div>
		<code>:lottie_aini:</code>
	</div>
	{#if copyStatus}
		<div class:error={copyStatusIsError} class="lottie-copy-toast" role="status">{copyStatus}</div>
	{/if}

	<div class="lottie-toolbar">
		<div class="lottie-search">
			<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m20 20-4.4-4.4m2.4-5.1a7.5 7.5 0 1 1-15 0 7.5 7.5 0 0 1 15 0Z" /></svg>
			<label class="sr-only" for="lottie-search-input">搜索表情</label>
			<input id="lottie-search-input" type="search" bind:value={query} placeholder="搜索名称、编号或文件名…" />
			{#if query}<button type="button" class="lottie-clear" on:click={() => (query = "")} aria-label="清空搜索">×</button>{/if}
		</div>
		<div class="lottie-filters" role="group" aria-label="表情分类">
			{#each ["全部", "精选", "QQ"] as option}
				<button type="button" class:active={filter === option} aria-pressed={filter === option} on:click={() => changeFilter(option as "全部" | "精选" | "QQ")}>
					{option}<span>{option === "全部" ? items.length : items.filter((item) => item.group === option).length}</span>
				</button>
			{/each}
		</div>
	</div>

	<div class="lottie-results-head">
		<div>
			<strong>{loading ? "正在读取" : filteredItems.length}</strong>
			<span>个动态表情</span>
		</div>
		<span class="lottie-results-note">悬停播放 · 点击复制</span>
	</div>

	{#if error}<p class="lottie-notice" role="status">{error}</p>{/if}

	{#if visibleItems.length}
		<div class="lottie-grid">
			{#each visibleItems as item, index (item.name)}
				<article
					class="lottie-card"
					class:featured={item.group === "精选"}
					style={`--card-index:${index % 12}`}
					tabindex="0"
					role="button"
					aria-label={`复制${item.label}的评论代码`}
					on:mouseenter={() => playPreview(item.name)}
					on:mouseleave={() => pausePreview(item.name)}
					on:focus={() => playPreview(item.name)}
					on:blur={() => pausePreview(item.name)}
					on:click={() => copyCommentCode(item)}
					on:keydown={(event) => handleCardKeydown(event, item)}
				>
					<div class="lottie-card__topline">
						<span class="lottie-card__group">{item.group}</span>
						<span class="lottie-card__id">{item.emojiId ? `#${item.emojiId}` : "LOCAL"}</span>
					</div>
					<div class="lottie-card__stage">
						<div class="lottie-card__crosshair" aria-hidden="true"></div>
						<span class="lottie-emoji" data-lottie-name={item.name} data-lottie-size="3.05" data-lottie-lazy="true" data-lottie-static="true" role="img" aria-label={item.label}></span>
					</div>
					<div class="lottie-card__info">
						<strong>{item.label}</strong>
						<code class:copied={copiedName === item.name}>{copiedName === item.name ? "已复制" : `:lottie_${item.name}:`}</code>
					</div>
				</article>
			{/each}
		</div>
	{:else if loading}
		<div class="lottie-empty"><span class="lottie-spinner"></span><strong>正在整理表情档案…</strong><p>马上就能看到它们动起来。</p></div>
	{:else}
		<div class="lottie-empty"><strong>没有找到这个表情</strong><p>试试搜索“开心”、QQ 编号，或者清空筛选条件。</p></div>
	{/if}

	<footer class="lottie-footer-note">
		<span class="lottie-footer-note__mark">JSON</span>
		<p>这些文件本身是动画数据；页面与评论区都只加载视口附近的表情，离开可视区域后自动暂停，避免动画同时运行。</p>
	</footer>
</section>

<style>
	.lottie-page {
		--lottie-ink: color-mix(in oklab, var(--text-color, #24334a) 92%, #101827);
		--lottie-muted: color-mix(in oklab, var(--text-color, #64748b) 60%, transparent);
		--lottie-line: color-mix(in oklab, var(--primary, #4d74cb) 17%, var(--line-divider, #dbe4ef));
		--lottie-cyan: #50c8c3;
		--lottie-coral: #ef8367;
		padding-bottom: 1rem;
	}

	.lottie-intro { position: relative; display: flex; align-items: center; justify-content: space-between; gap: 1.5rem; overflow: hidden; padding: 1.35rem 1.5rem; border: 1px solid var(--lottie-line); border-radius: 1.15rem; background: color-mix(in oklab, var(--card-bg) 91%, #dff5fb 9%); box-shadow: 0 .65rem 1.5rem rgb(42 63 102 / .05); }
	.lottie-intro::after { position: absolute; right: -3.5rem; bottom: -5rem; width: 12rem; height: 12rem; border: 1px solid color-mix(in oklab, var(--primary) 16%, transparent); border-radius: 50%; content: ""; pointer-events: none; }
	.lottie-intro__copy { position: relative; z-index: 1; min-width: 0; }
	.lottie-intro h1 { margin: 0; color: var(--lottie-ink); font: 700 clamp(1.55rem, 3vw, 2.25rem)/1.15 var(--font-active-sans, system-ui, sans-serif); letter-spacing: -.045em; }
	.lottie-intro p { max-width: 38rem; margin: .55rem 0 0; color: var(--lottie-muted); font-size: .82rem; line-height: 1.7; }
	.lottie-intro__meta { position: relative; z-index: 1; display: grid; flex: 0 0 auto; grid-template-columns: auto auto; align-items: baseline; column-gap: .45rem; color: var(--lottie-muted); }
	.lottie-intro__meta strong { color: var(--primary); font: 700 2rem/1 var(--font-active-sans, system-ui, sans-serif); letter-spacing: -.06em; }
	.lottie-intro__meta span { font-size: .74rem; }
	.lottie-intro__meta small { grid-column: 1 / -1; margin-top: .38rem; color: var(--lottie-muted); font: 700 .58rem/1 ui-monospace, SFMono-Regular, Consolas, monospace; }
	.lottie-comment-guide { display: flex; align-items: center; gap: .7rem; margin-top: .85rem; padding: .72rem .88rem; border: 1px solid color-mix(in oklab, var(--lottie-cyan) 28%, var(--lottie-line)); border-radius: .85rem; background: color-mix(in oklab, var(--lottie-cyan) 7%, var(--card-bg)); color: var(--lottie-muted); }
	.lottie-comment-guide__mark { display: grid; flex: 0 0 auto; width: 1.8rem; height: 1.8rem; place-items: center; border-radius: 50%; background: color-mix(in oklab, var(--lottie-cyan) 16%, transparent); color: color-mix(in oklab, var(--lottie-cyan) 76%, var(--lottie-ink)); font: 800 1rem/1 ui-monospace, monospace; }
	.lottie-comment-guide > div { min-width: 0; flex: 1; }
	.lottie-comment-guide strong { display: block; color: var(--lottie-ink); font-size: .76rem; }
	.lottie-comment-guide p { margin: .16rem 0 0; font-size: .68rem; line-height: 1.5; }
	.lottie-comment-guide code { flex: 0 0 auto; padding: .42rem .55rem; border: 1px solid color-mix(in oklab, var(--primary) 18%, transparent); border-radius: .45rem; background: color-mix(in oklab, var(--primary) 8%, transparent); color: var(--primary); font: 700 .65rem/1 ui-monospace, SFMono-Regular, Consolas, monospace; }
	.lottie-copy-toast { position: fixed; z-index: 70; right: 1rem; bottom: 1rem; max-width: min(24rem, calc(100vw - 2rem)); padding: .7rem .85rem; border: 1px solid color-mix(in oklab, var(--lottie-cyan) 38%, var(--lottie-line)); border-radius: .72rem; background: color-mix(in oklab, var(--card-bg) 94%, var(--lottie-cyan) 6%); color: var(--lottie-ink); box-shadow: 0 .8rem 2rem rgb(30 45 72 / .16); font-size: .72rem; line-height: 1.5; animation: lottie-toast-in .22s ease-out both; }
	.lottie-copy-toast.error { border-color: color-mix(in oklab, var(--lottie-coral) 46%, var(--lottie-line)); }

	.lottie-toolbar { display: flex; align-items: center; gap: .8rem; padding: 1.1rem 0 .75rem; }
	.lottie-search { display: flex; min-width: 0; flex: 1; align-items: center; gap: .7rem; padding: .25rem .35rem .25rem .95rem; border: 1px solid var(--lottie-line); border-radius: .9rem; background: color-mix(in oklab, var(--card-bg) 88%, transparent); transition: .22s ease; }
	.lottie-search:focus-within { border-color: color-mix(in oklab, var(--primary) 56%, transparent); box-shadow: 0 0 0 .24rem color-mix(in oklab, var(--primary) 10%, transparent); }
	.lottie-search svg { flex: 0 0 auto; width: 1.18rem; height: 1.18rem; fill: none; stroke: var(--primary); stroke-linecap: round; stroke-linejoin: round; stroke-width: 1.8; }
	.lottie-search input { min-width: 0; flex: 1; border: 0; outline: 0; background: transparent; color: var(--lottie-ink); font-size: .88rem; line-height: 2rem; }
	.lottie-clear { display: grid; width: 1.8rem; height: 1.8rem; place-items: center; border: 1px solid var(--glass-control-border); border-radius: 50%; background: transparent; color: var(--primary); cursor: pointer; font-size: 1.15rem; line-height: 1; }
	.lottie-filters { display: flex; flex: 0 0 auto; gap: .3rem; padding: .26rem; border: 1px solid var(--lottie-line); border-radius: .9rem; background: color-mix(in oklab, var(--card-bg) 88%, transparent); }
	.lottie-filters button { display: flex; align-items: center; gap: .38rem; padding: .52rem .7rem; border: 1px solid var(--glass-control-border); border-radius: .62rem; background: transparent; color: var(--primary); cursor: pointer; font: 700 .7rem/1 var(--font-active-sans, system-ui, sans-serif); transition: .2s ease; }
	.lottie-filters button span { color: color-mix(in oklab, currentColor 65%, transparent); font: 700 .62rem/1 ui-monospace, monospace; }
	.lottie-filters button:hover { color: var(--primary); border-color: var(--primary); background: transparent; }
	.lottie-filters button.active { border-color: var(--primary); background: transparent; color: var(--primary); box-shadow: none; }

	.lottie-results-head { display: flex; align-items: baseline; justify-content: space-between; gap: 1rem; min-height: 3.4rem; padding: .55rem .15rem .8rem; color: var(--lottie-muted); }
	.lottie-results-head > div { display: flex; align-items: baseline; gap: .42rem; }
	.lottie-results-head strong { color: var(--lottie-ink); font: 700 1.4rem/1 var(--font-active-sans, system-ui, sans-serif); letter-spacing: -.05em; }
	.lottie-results-head span { font-size: .76rem; }
	.lottie-results-note { font: 700 .65rem/1 ui-monospace, SFMono-Regular, Consolas, monospace; letter-spacing: .05em; }
	.lottie-notice { margin: 0 0 1rem; padding: .7rem .85rem; border: 1px solid rgb(239 131 103 / .3); border-radius: .7rem; background: rgb(239 131 103 / .08); color: var(--lottie-ink); font-size: .78rem; }

	.lottie-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: .8rem; }
	.lottie-card { position: relative; overflow: hidden; min-width: 0; border: 1px solid var(--lottie-line); border-radius: 1.05rem; background: color-mix(in oklab, var(--card-bg) 90%, transparent); box-shadow: 0 .6rem 1.4rem rgb(42 63 102 / .045); animation: lottie-in .5s both; animation-delay: calc(var(--card-index) * 35ms); cursor: pointer; outline: 0; content-visibility: auto; contain-intrinsic-size: 12rem; transition: transform .24s ease, border-color .24s ease, box-shadow .24s ease; }
	.lottie-card:hover { z-index: 1; border-color: color-mix(in oklab, var(--primary) 48%, transparent); box-shadow: 0 1rem 2rem rgb(42 63 102 / .13); transform: translateY(-.24rem); }
	.lottie-card:focus-visible { border-color: var(--primary); box-shadow: 0 0 0 .24rem color-mix(in oklab, var(--primary) 13%, transparent), 0 1rem 2rem rgb(42 63 102 / .13); }
	.lottie-card__topline { display: flex; align-items: center; justify-content: space-between; padding: .7rem .75rem .42rem; color: var(--lottie-muted); font: 700 .59rem/1 ui-monospace, SFMono-Regular, Consolas, monospace; letter-spacing: .06em; }
	.lottie-card__group { color: color-mix(in oklab, var(--primary) 78%, var(--lottie-ink)); }
	.lottie-card.featured .lottie-card__group { color: var(--lottie-coral); }
	.lottie-card__id { opacity: .7; }
	.lottie-card__stage { position: relative; display: grid; min-height: 8.6rem; place-items: center; margin: 0 .55rem; overflow: hidden; border-radius: .75rem; background: radial-gradient(circle at 50% 48%, color-mix(in oklab, var(--primary) 10%, transparent), transparent 60%), linear-gradient(135deg, color-mix(in oklab, var(--card-bg) 94%, var(--primary) 6%), color-mix(in oklab, var(--card-bg) 82%, #edf2f6 18%)); }
	.lottie-card__stage::before { position: absolute; inset: 0; background: linear-gradient(90deg, transparent 49.7%, color-mix(in oklab, var(--primary) 8%, transparent) 50%, transparent 50.3%), linear-gradient(0deg, transparent 49.7%, color-mix(in oklab, var(--primary) 8%, transparent) 50%, transparent 50.3%); background-size: 2.6rem 2.6rem; content: ""; opacity: .65; }
	.lottie-card__crosshair { position: absolute; width: 3rem; height: 3rem; border: 1px solid color-mix(in oklab, var(--primary) 16%, transparent); border-radius: 50%; }
	.lottie-card__crosshair::before, .lottie-card__crosshair::after { position: absolute; content: ""; background: color-mix(in oklab, var(--primary) 22%, transparent); }
	.lottie-card__crosshair::before { top: 50%; right: -1.1rem; left: -1.1rem; height: 1px; }
	.lottie-card__crosshair::after { top: -1.1rem; bottom: -1.1rem; left: 50%; width: 1px; }
	.lottie-card__stage :global(.lottie-emoji) { position: relative; z-index: 1; display: block; color: var(--lottie-muted); filter: drop-shadow(0 .45rem .45rem rgb(36 51 74 / .1)); }
	.lottie-card__stage :global(.lottie-emoji[data-lottie-error="true"]) { width: auto !important; height: auto !important; color: var(--lottie-muted); font: 700 .66rem/1 ui-monospace, monospace; }
	.lottie-card__info { display: flex; align-items: baseline; justify-content: space-between; gap: .5rem; padding: .75rem .82rem .85rem; }
	.lottie-card__info strong { overflow: hidden; color: var(--lottie-ink); font-size: .82rem; text-overflow: ellipsis; white-space: nowrap; }
	.lottie-card__info code { overflow: hidden; max-width: 62%; color: var(--lottie-muted); font: .57rem/1 ui-monospace, SFMono-Regular, Consolas, monospace; text-overflow: ellipsis; white-space: nowrap; transition: color .18s ease, transform .18s ease; }
	.lottie-card__info code.copied { color: color-mix(in oklab, var(--lottie-cyan) 78%, var(--lottie-ink)); transform: translateY(-.04rem); }

	.lottie-empty { display: flex; min-height: 15rem; flex-direction: column; align-items: center; justify-content: center; border: 1px dashed color-mix(in oklab, var(--primary) 25%, var(--line-divider)); border-radius: 1rem; background: color-mix(in oklab, var(--card-bg) 60%, transparent); color: var(--lottie-muted); text-align: center; }
	.lottie-empty strong { color: var(--lottie-ink); font-size: 1rem; }
	.lottie-empty p { margin: .45rem 0 0; font-size: .78rem; }
	.lottie-spinner { width: 1.8rem; height: 1.8rem; margin-bottom: .9rem; border: 2px solid color-mix(in oklab, var(--primary) 18%, transparent); border-top-color: var(--primary); border-radius: 50%; animation: orbit 1s linear infinite; }
	.lottie-footer-note { display: flex; align-items: center; gap: .75rem; margin-top: 1.45rem; padding: 1rem 0 .2rem; border-top: 1px solid var(--lottie-line); color: var(--lottie-muted); }
	.lottie-footer-note__mark { flex: 0 0 auto; padding: .35rem .42rem; border-radius: .3rem; background: color-mix(in oklab, var(--primary) 10%, transparent); color: var(--primary); font: 800 .6rem/1 ui-monospace, monospace; }
	.lottie-footer-note p { margin: 0; font-size: .72rem; line-height: 1.65; }

	@keyframes orbit { to { transform: rotate(360deg); } }
	@keyframes lottie-in { from { opacity: 0; transform: translateY(.5rem); } to { opacity: 1; transform: translateY(0); } }
	@keyframes lottie-toast-in { from { opacity: 0; transform: translateY(.4rem); } to { opacity: 1; transform: translateY(0); } }
	@media (max-width: 900px) { .lottie-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
	@media (max-width: 680px) { .lottie-intro { align-items: flex-start; flex-direction: column; padding: 1.15rem 1rem; } .lottie-intro__meta { align-self: stretch; grid-template-columns: auto auto 1fr; } .lottie-intro__meta small { grid-column: 3; align-self: center; margin: 0; } .lottie-comment-guide { align-items: flex-start; } .lottie-comment-guide code { display: none; } .lottie-toolbar { align-items: stretch; flex-direction: column; } .lottie-filters { justify-content: space-between; } .lottie-filters button { flex: 1; justify-content: center; } .lottie-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: .6rem; } .lottie-card__stage { min-height: 7.4rem; } .lottie-card__info { display: block; } .lottie-card__info code { display: block; max-width: 100%; margin-top: .3rem; } .lottie-results-note { display: none; } }
	@media (max-width: 390px) { .lottie-grid { grid-template-columns: 1fr; } .lottie-card__stage { min-height: 10rem; } }
	@media (prefers-reduced-motion: reduce) { .lottie-page *, .lottie-page *::before, .lottie-page *::after { animation-duration: .01ms !important; animation-iteration-count: 1 !important; scroll-behavior: auto !important; transition-duration: .01ms !important; } }
</style>
