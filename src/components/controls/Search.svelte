<script lang="ts">
import I18nKey from "@i18n/i18nKey";
import { i18n } from "@i18n/translation";
import { navigateToPage } from "@utils/navigation-utils";
import { onMount } from "svelte";
import Icon from "@/components/common/Icon.svelte";
import type { SearchResult } from "@/global";
import { getSearchUrl, url as formatUrl } from "@/utils/url-utils";

type LocalSearchPost = {
	id: string;
	url: string;
	title: string;
	description: string;
	category: string;
	tags: string[];
	searchText: string;
};

let keywordDesktop = "";
let keywordMobile = "";
let result: SearchResult[] = [];
let isSearching = false;
let initialized = false;
let debounceTimer: NodeJS.Timeout;
let localSearchCache: LocalSearchPost[] | null = null;

const escapeHtml = (value: string): string =>
	value.replace(/[&<>"']/g, (char) => {
		const entities: Record<string, string> = {
			"&": "&amp;",
			"<": "&lt;",
			">": "&gt;",
			'"': "&quot;",
			"'": "&#39;",
		};
		return entities[char] || char;
	});

const highlightKeyword = (value: string, keyword: string): string => {
	const trimmedKeyword = keyword.trim();
	const escapedValue = escapeHtml(value);
	if (!trimmedKeyword) return escapedValue;

	const escapedKeyword = trimmedKeyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
	return escapedValue.replace(
		new RegExp(escapedKeyword, "gi"),
		(match) => `<mark>${match}</mark>`,
	);
};

const loadLocalSearchPosts = async (): Promise<LocalSearchPost[]> => {
	if (localSearchCache) return localSearchCache;

	const response = await fetch(formatUrl("/api/allPostMeta.json"));
	if (!response.ok) {
		localSearchCache = [];
		return localSearchCache;
	}

	localSearchCache = await response.json();
	return localSearchCache;
};

const searchLocalPosts = async (keyword: string): Promise<SearchResult[]> => {
	const normalizedKeyword = keyword.trim().toLowerCase();
	if (!normalizedKeyword) return [];

	const posts = await loadLocalSearchPosts();
	return posts
		.map((post) => {
			const haystack = [
				post.searchText,
				post.title,
				post.description,
				post.category,
				...(post.tags || []),
			]
				.filter(Boolean)
				.join(" ")
				.toLowerCase();

			if (!haystack.includes(normalizedKeyword)) return null;

			const metaParts = [
				post.category ? `分类：${post.category}` : "",
				post.tags?.length ? `标签：${post.tags.join(" / ")}` : "",
			].filter(Boolean);

			return {
				url: post.url,
				meta: { title: highlightKeyword(post.title, keyword) },
				excerpt: highlightKeyword(
					post.description || metaParts.join("; ") || post.title,
					keyword,
				),
				content: metaParts.length
					? highlightKeyword(metaParts.join("；"), keyword)
					: undefined,
			} satisfies SearchResult;
		})
		.filter((item): item is SearchResult => item !== null);
};

const togglePanel = () => {
	document
		.getElementById("search-panel")
		?.classList.toggle("float-panel-closed");
};

const setPanelVisibility = (show: boolean, isDesktop: boolean): void => {
	const panel = document.getElementById("search-panel");
	if (
		!panel ||
		(isDesktop && !keywordDesktop) ||
		(!isDesktop && !keywordMobile)
	) {
		return;
	}

	panel.classList.toggle("float-panel-closed", !show);
};

const closeSearchPanel = (): void => {
	document.getElementById("search-panel")?.classList.add("float-panel-closed");
	keywordDesktop = "";
	keywordMobile = "";
	result = [];
};

const handleResultClick = (event: Event, targetUrl: string): void => {
	event.preventDefault();
	closeSearchPanel();
	navigateToPage(targetUrl);
};

const search = async (keyword: string, isDesktop: boolean): Promise<void> => {
	if (!keyword.trim()) {
		setPanelVisibility(false, isDesktop);
		result = [];
		return;
	}
	if (!initialized) return;

	isSearching = true;
	clearTimeout(debounceTimer);

	debounceTimer = setTimeout(async () => {
		try {
			let searchResults: SearchResult[] = [];

			if (window.pagefind) {
				const response = await window.pagefind.search(keyword);
				const pagefindResults = await Promise.all(
					response.results.map((item) => item.data()),
				);

				// Pagefind 的 content 是整篇文章正文，不适合放进导航栏下拉结果。
				// 保留标题与摘要，避免长文把搜索面板撑满。
				searchResults = pagefindResults.map(({ content: _content, ...item }) => item);
			}

			if (searchResults.length === 0) {
				searchResults = await searchLocalPosts(keyword);
			}

			result = searchResults;
			setPanelVisibility(true, isDesktop);
		} catch (error) {
			console.error("Search error:", error);
			result = [];
			setPanelVisibility(true, isDesktop);
		} finally {
			isSearching = false;
		}
	}, 300);
};

onMount(() => {
	const initializeSearch = () => {
		initialized = true;
		if (keywordDesktop) search(keywordDesktop, true);
		if (keywordMobile) search(keywordMobile, false);
	};

	if (window.pagefind || import.meta.env.DEV) {
		initializeSearch();
	} else {
		document.addEventListener("pagefindready", initializeSearch, { once: true });
		document.addEventListener("pagefindloaderror", initializeSearch, {
			once: true,
		});
	}
});

$: if (initialized && (keywordDesktop || keywordDesktop === "")) {
	search(keywordDesktop, true);
}

$: if (initialized && (keywordMobile || keywordMobile === "")) {
	search(keywordMobile, false);
}
</script>

<div id="search-bar" class="search-bar hidden lg:flex transition-all items-center h-11 mr-2 rounded-lg
      bg-black/4 hover:bg-black/6 focus-within:bg-black/6
      dark:bg-white/5 dark:hover:bg-white/10 dark:focus-within:bg-white/10
">
    <Icon icon="material-symbols:search"
          class="absolute text-[1.25rem] pointer-events-none ml-3 transition my-auto text-black/30 dark:text-white/30"></Icon>
    <input placeholder={i18n(I18nKey.search)} bind:value={keywordDesktop}
           on:focus={() => search(keywordDesktop, true)}
           class="transition-all pl-10 text-sm bg-transparent outline-0
         h-full w-40 active:w-64 focus:w-64 text-black/50 dark:text-white/50"
    >
</div>

<button on:click={togglePanel} aria-label="Search Panel" id="search-switch"
        class="btn-plain scale-animation rounded-lg w-11 h-11 active:scale-90">
    <Icon icon="material-symbols:search" class="text-[1.25rem]"></Icon>
</button>

<div id="search-panel" class="float-panel float-panel-closed search-panel absolute
top-20 left-4 md:left-[unset] right-4 shadow-2xl rounded-2xl p-2">

    <div id="search-bar-inside" class="flex relative lg:hidden transition-all items-center h-11 rounded-xl
      bg-black/4 hover:bg-black/6 focus-within:bg-black/6
      dark:bg-white/5 dark:hover:bg-white/10 dark:focus-within:bg-white/10
  ">
        <Icon icon="material-symbols:search"
              class="absolute text-[1.25rem] pointer-events-none ml-3 transition my-auto text-black/30 dark:text-white/30"></Icon>
        <input placeholder={i18n(I18nKey.search)} bind:value={keywordMobile}
               class="pl-10 absolute inset-0 text-sm bg-transparent outline-0
               text-black/50 dark:text-white/50"
        >
    </div>

    {#if isSearching}
        <div class="transition first-of-type:mt-2 lg:first-of-type:mt-0 block rounded-xl text-lg px-3 py-2 text-50">
            {i18n(I18nKey.searchLoading)}
        </div>
    {:else if result.length > 0}
        <div class="search-results">
            {#each result.slice(0, 5) as item}
                <a href={item.url}
                   on:click={(e) => handleResultClick(e, item.url)}
                   class="search-result-item group"
                   style="display:block;width:100%;min-width:0;max-width:100%;box-sizing:border-box;">
                    <div class="search-result-title" style="display:block;width:100%;min-width:0;max-width:100%;white-space:normal;">
                        {@html item.meta.title}
                    </div>
                    {#if item.content}
                        <div class="search-result-meta">
                            文章 · {@html item.content}
                        </div>
                    {/if}
                    {#if item.excerpt}
                        <div class="search-result-snippet">
                            {@html item.excerpt}
                        </div>
                    {/if}
                </a>
            {/each}
        </div>
        {#if result.length > 5}
            <a href={getSearchUrl(keywordDesktop || keywordMobile)}
               on:click={(e) => handleResultClick(e, getSearchUrl(keywordDesktop || keywordMobile))}
               class="search-more-link">
                <span class="inline-flex items-center">
                    {i18n(I18nKey.searchViewMore).replace('{count}', (result.length - 5).toString())}
                    <Icon icon="fa7-solid:arrow-right" class="transition text-[0.75rem] ml-1"></Icon>
                </span>
            </a>
        {/if}
    {:else if keywordDesktop || keywordMobile}
        <div class="transition first-of-type:mt-2 lg:first-of-type:mt-0 block rounded-xl text-lg px-3 py-2 text-50">
            {i18n(I18nKey.searchNoResults)}
        </div>
    {:else}
        <div class="transition first-of-type:mt-2 lg:first-of-type:mt-0 block rounded-xl text-lg px-3 py-2 text-50">
            {i18n(I18nKey.searchTypeSomething)}
        </div>
    {/if}
</div>

<style>
	input:focus {
		outline: 0;
	}

	.search-bar {
		position: relative;
		flex: 0 0 auto;
	}

	.search-panel {
		box-sizing: border-box;
		width: min(32rem, calc(100vw - 2rem));
		max-height: calc(100vh - 100px);
		max-width: calc(100vw - 2rem);
		min-width: 0;
		overflow-x: hidden;
		overflow-y: auto;
	}

	.search-results {
		box-sizing: border-box;
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
		width: 100%;
		min-width: 0;
		max-width: 100%;
	}

	.search-result-item {
		box-sizing: border-box;
		display: block;
		width: 100%;
		min-width: 0;
		max-width: 100%;
		min-height: 4.75rem;
		overflow: hidden;
		border: 1px solid transparent;
		border-radius: 0.85rem;
		padding: 0.85rem 0.95rem;
		text-decoration: none;
		transition:
			background-color 0.15s ease-out,
			border-color 0.15s ease-out;
	}

	.search-result-item:hover {
		background: var(--btn-plain-bg-hover);
		border-color: color-mix(in oklab, var(--primary) 18%, transparent);
	}

	.search-more-link {
		box-sizing: border-box;
		display: block;
		width: 100%;
		margin-top: 0.35rem;
		border-radius: 0.85rem;
		padding: 0.75rem 0.95rem;
		color: var(--primary);
		font-size: 0.95rem;
		font-weight: 800;
		text-align: center;
		text-decoration: none;
		transition: background-color 0.15s ease-out;
	}

	.search-more-link:hover {
		background: var(--btn-plain-bg-hover);
	}

	:global(#navbar.firefly-navbar #search-panel a.search-more-link::before),
	:global(#navbar.firefly-navbar #search-panel a.search-more-link::after) {
		content: none !important;
		display: none !important;
	}

	:global(#navbar.firefly-navbar #search-panel a.search-more-link),
	:global(#navbar.firefly-navbar #search-panel a.search-more-link:hover),
	:global(#navbar.firefly-navbar #search-panel a.search-more-link:active) {
		position: static !important;
		transform: none !important;
		box-shadow: none !important;
	}

	:global(#navbar.firefly-navbar #search-panel a.search-result-item::before),
	:global(#navbar.firefly-navbar #search-panel a.search-result-item::after) {
		content: none !important;
		display: none !important;
	}

	:global(#navbar.firefly-navbar #search-panel a.search-result-item),
	:global(#navbar.firefly-navbar #search-panel a.search-result-item:hover),
	:global(#navbar.firefly-navbar #search-panel a.search-result-item:active) {
		position: static !important;
		transform: none !important;
		box-shadow: none !important;
		color: inherit !important;
	}

	.search-result-title {
		display: block;
		width: 100%;
		color: rgb(0 0 0 / 0.86);
		font-size: 1rem;
		font-weight: 800;
		line-height: 1.35;
		min-width: 0;
		max-width: 100%;
		white-space: normal;
		overflow-wrap: break-word;
		word-break: normal;
	}

	:global(.dark) .search-result-title {
		color: rgb(255 255 255 / 0.9);
	}

	.search-result-snippet,
	.search-result-meta {
		display: block;
		width: 100%;
		min-width: 0;
		max-width: 100%;
		overflow-wrap: break-word;
		word-break: normal;
	}

	.search-result-snippet {
		margin-top: 0.35rem;
		color: rgb(0 0 0 / 0.58);
		font-size: 0.86rem;
		line-height: 1.55;
		display: -webkit-box;
		overflow: hidden;
		-webkit-box-orient: vertical;
		-webkit-line-clamp: 3;
	}

	:global(.dark) .search-result-snippet {
		color: rgb(255 255 255 / 0.58);
	}

	.search-result-meta {
		margin-top: 0.35rem;
		overflow: hidden;
		color: rgb(0 0 0 / 0.42);
		font-size: 0.76rem;
		line-height: 1.45;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	:global(.dark) .search-result-meta {
		color: rgb(255 255 255 / 0.42);
	}
</style>
