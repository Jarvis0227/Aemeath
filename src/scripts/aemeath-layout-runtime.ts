// Swup swaps page content without running the changelog page's bundled script.
import "@/scripts/blog-changelog";
import {
	backgroundWallpaper,
	expressiveCodeConfig,
	siteConfig,
} from "@/config";
import {
	BANNER_HEIGHT,
	BANNER_HEIGHT_EXTEND,
	BANNER_HEIGHT_HOME,
	// MAIN_PANEL_OVERLAPS_BANNER_HEIGHT,
} from "@/constants/constants";
import { initLottieEmojis } from "@/scripts/lottie";
import { pathsEqual, url } from "@/utils/url-utils";

initLottieEmojis();

/* Preload fonts */
// (async function() {
// 	try {
// 		await Promise.all([
// 			document.fonts.load("400 1em Roboto"),
// 			document.fonts.load("700 1em Roboto"),
// 		]);
// 		document.body.classList.remove("hidden");
// 	} catch (error) {
// 		console.log("Failed to load fonts:", error);
// 	}
// })();

/* TODO This is a temporary solution for style flicker issue when the transition is activated */
/* issue link: https://github.com/withastro/astro/issues/8711, the solution get from here too */
/* update: fixed in Astro 3.2.4 */
/*
function disableAnimation() {
	const css = document.createElement('style')
	css.appendChild(
		document.createTextNode(
			`*{
              -webkit-transition:none!important;
              -moz-transition:none!important;
              -o-transition:none!important;
              -ms-transition:none!important;
              transition:none!important
              }`
		)
	)
	document.head.appendChild(css)

	return () => {
		// Force restyle
		;(() => window.getComputedStyle(document.body))()

		// Wait for next tick before removing
		setTimeout(() => {
			document.head.removeChild(css)
		}, 1)
	}
}
*/

const bannerEnabled = !!document.getElementById("wallpaper-wrapper");
const stickyNavbar = siteConfig.navbar.stickyNavbar ?? false;
const isPostListPath = (pathname: string) =>
	pathname === "/" || /^\/\d+\/?$/.test(pathname);

function syncPostListPageClass(pathname = window.location.pathname) {
	document.body?.classList.toggle("post-list-page", isPostListPath(pathname));
}

syncPostListPageClass();

function setClickOutsideToClose(panel: string, ignores: string[]) {
	document.addEventListener("click", (event) => {
		const panelDom = document.getElementById(panel);
		if (!panelDom) return;
		const tDom = event.target;
		if (!(tDom instanceof Node)) return; // Ensure the event target is an HTML Node
		for (const ig of ignores) {
			const ie = document.getElementById(ig);
			if (ie == tDom || ie?.contains(tDom)) {
				return;
			}
		}
		if (panel === "nav-menu-panel") {
			const setMenuOpen = (
				window as Window & {
					__fireflySetMobileMenuOpen?: (open: boolean) => void;
				}
			).__fireflySetMobileMenuOpen;
			if (setMenuOpen) {
				setMenuOpen(false);
			} else {
				panelDom.classList.add("float-panel-closed");
				panelDom.classList.remove("active");
				panelDom.setAttribute("aria-hidden", "true");
			}
		} else {
			panelDom.classList.add("float-panel-closed");
		}
	});
}
setClickOutsideToClose("display-setting", [
	"display-setting",
	"display-settings-switch",
]);
setClickOutsideToClose("nav-menu-panel", ["nav-menu-panel", "nav-menu-switch"]);
setClickOutsideToClose("search-panel", [
	"search-panel",
	"search-bar",
	"search-switch",
]);
setClickOutsideToClose("wallpaper-mode-panel", [
	"wallpaper-mode-panel",
	"wallpaper-mode-switch",
]);
setClickOutsideToClose("theme-mode-panel", [
	"theme-mode-panel",
	"scheme-switch",
]);

function initCustomScrollbar() {
	// 只处理katex元素的滚动条，使用浏览器原生滚动条
	const katexElements = document.querySelectorAll(
		".katex-display:not([data-scrollbar-initialized])",
	) as NodeListOf<HTMLElement>;
	katexElements.forEach((element) => {
		if (!element.parentNode) return;

		const container = document.createElement("div");
		container.className = "katex-display-container";
		element.parentNode.insertBefore(container, element);
		container.appendChild(element);

		// 使用浏览器原生滚动条，无自定义样式
		container.style.cssText = `
			overflow-x: auto;
		`;

		element.setAttribute("data-scrollbar-initialized", "true");
	});
}

function initHorizontalOverflowContainers() {
	const markdownTables = document.querySelectorAll(
		".custom-md table:not([data-horizontal-scroll-ready])",
	) as NodeListOf<HTMLElement>;

	markdownTables.forEach((table) => {
		if (
			table.parentElement?.classList.contains("horizontal-scroll-container")
		) {
			table.dataset.horizontalScrollReady = "true";
			return;
		}

		const container = document.createElement("div");
		container.className = "horizontal-scroll-container";
		table.parentNode?.insertBefore(container, table);
		container.appendChild(table);
		table.dataset.horizontalScrollReady = "true";
	});
}

function initContentOverflowEnhancements() {
	initCustomScrollbar();
	initHorizontalOverflowContainers();
}

function scheduleContentOverflowEnhancements() {
	initContentOverflowEnhancements();
	requestAnimationFrame(() => {
		initContentOverflowEnhancements();
	});
	setTimeout(() => {
		initContentOverflowEnhancements();
	}, 100);
}

function showBanner() {
	const isBannerMode = backgroundWallpaper.mode === "banner";
	if (!isBannerMode) return;

	// 使用requestAnimationFrame优化DOM操作
	requestAnimationFrame(() => {
		// Handle single image banner (desktop)
		const banner = document.getElementById("banner");
		if (banner) {
			banner.classList.remove("opacity-0", "scale-105");
		}

		// Handle mobile single image banner - 使用与电脑端相同的逻辑
		const mobileBanner = document.querySelector(
			'.block.lg\\:hidden[alt="Mobile banner image of the blog"]',
		);
		if (mobileBanner) {
			// 移动端使用与电脑端相同的初始化逻辑
			mobileBanner.classList.remove("opacity-0", "scale-105");
			mobileBanner.classList.add("opacity-100");
		}
	});
}

// 只有主页、文章列表/详情和友链保留在页面 0，
// 其余所有站内页面都直接进入主内容页面 1。
const isPageZeroPath = (pathname: string) => {
	const normalizedPathname = pathname.replace(/\/+$/, "") || "/";
	const basePath = url("/").replace(/\/+$/, "");
	const relativePath =
		basePath && normalizedPathname.startsWith(basePath)
			? normalizedPathname.slice(basePath.length) || "/"
			: normalizedPathname;
	const postsPath = url("/posts/").replace(/\/+$/, "");
	const isPostPath =
		postsPath.length > 0 &&
		(normalizedPathname === postsPath ||
			normalizedPathname.startsWith(`${postsPath}/`));
	const isPostListPath = relativePath === "/" || /^\/\d+$/.test(relativePath);

	return (
		pathsEqual(pathname, url("/")) ||
		pathsEqual(pathname, url("/friends/")) ||
		isPostListPath ||
		isPostPath
	);
};

const scrollToPage = (
	pathname: string,
	behavior: ScrollBehavior = "instant",
) => {
	const mainContent = document.querySelector(
		".w-full.z-30.pointer-events-none",
	) as HTMLElement | null;

	// 非首页已直接排在导航栏下方，无需再滚动到旧的“页面 1”位置。
	if (
		isPageZeroPath(pathname) ||
		mainContent?.classList.contains("non-home-main-layout")
	) {
		window.scrollTo({ top: 0, left: 0, behavior });
		return;
	}

	// 以真实主内容区为目标，页面 1 需要避开导航栏，
	// 这样全屏和横幅模式都能在内容区稳定落位。
	const navbarHeight =
		document.getElementById("navbar-wrapper")?.getBoundingClientRect().height ??
		0;
	const mainRect = mainContent?.getBoundingClientRect();
	const mainTop = mainRect ? mainRect.top + window.scrollY : window.innerHeight;
	const maxScrollTop = Math.max(
		0,
		document.documentElement.scrollHeight - window.innerHeight,
	);
	const pageOneTop = Math.min(
		maxScrollTop,
		Math.max(0, mainTop - navbarHeight - 8),
	);
	window.scrollTo({ top: pageOneTop, left: 0, behavior });
};

// Swup 和页面组件都可能在不同时间触发滚动恢复。用短时间的多次校正，
// 确保异步组件完成后仍遵守同一套页面 0/页面 1 规则。
let pageScrollScheduleId = 0;
let smoothRouteScrollPath: string | null = null;
let smoothRouteScrollUntil = 0;
const scheduleScrollToPage = (
	pathname: string,
	behavior: ScrollBehavior = "instant",
	onlyIfAtTop = false,
) => {
	const scheduleId = ++pageScrollScheduleId;
	const delays = [0, 80, 220, 500, 900];

	delays.forEach((delay, index) => {
		window.setTimeout(() => {
			if (scheduleId !== pageScrollScheduleId) return;
			if (
				!pathsEqual(window.location.pathname, pathname) ||
				window.location.hash
			)
				return;
			if (onlyIfAtTop && window.scrollY > 1) return;
			// Let the viewport carry the persistent sidebars into place. The later
			// correction still settles any layout shift after the smooth scroll.
			if (
				smoothRouteScrollPath &&
				pathsEqual(smoothRouteScrollPath, pathname) &&
				performance.now() < smoothRouteScrollUntil
			) {
				if (index === delays.length - 1) {
					window.setTimeout(
						() => {
							if (scheduleId !== pageScrollScheduleId) return;
							if (
								!pathsEqual(window.location.pathname, pathname) ||
								window.location.hash
							)
								return;
							smoothRouteScrollPath = null;
							scrollToPage(pathname);
						},
						smoothRouteScrollUntil - performance.now() + 80,
					);
				}
				return;
			}
			scrollToPage(pathname, index === 0 ? behavior : "instant");
		}, delay);
	});
};

const syncWallpaperWrapperClasses = (pathname = window.location.pathname) => {
	const wallpaperWrapper = document.getElementById("wallpaper-wrapper");
	if (!wallpaperWrapper) return;

	const isHome = pathsEqual(pathname, url("/"));
	const wallpaperMode = document.documentElement.getAttribute(
		"data-wallpaper-mode",
	);
	const mainContentWrapper = document.querySelector(
		".w-full.z-30.pointer-events-none",
	) as HTMLElement | null;

	wallpaperWrapper.classList.toggle("non-home-wallpaper-hidden", !isHome);
	if (isHome) {
		wallpaperWrapper.style.removeProperty("display");
	} else {
		wallpaperWrapper.style.setProperty("display", "none", "important");
	}
	if (mainContentWrapper) {
		mainContentWrapper.classList.toggle("non-home-main-layout", !isHome);
		mainContentWrapper.classList.toggle(
			"no-banner-layout",
			!isHome || wallpaperMode !== "banner",
		);

		if (!isHome) {
			mainContentWrapper.style.setProperty("top", "5.5rem", "important");
			mainContentWrapper.style.position = "";
			mainContentWrapper.style.zIndex = "";
			mainContentWrapper.style.setProperty("margin-top", "0", "important");
		}
	}

	const shouldShowHomeDecor =
		isHome &&
		(wallpaperMode === "fullscreen" ||
			wallpaperWrapper.classList.contains("wallpaper-fullscreen"));

	wallpaperWrapper.classList.toggle(
		"homepage-fullscreen-decor",
		shouldShowHomeDecor,
	);
	if (!shouldShowHomeDecor) {
		wallpaperWrapper.classList.remove("home-wallpaper-motion-ready");
	}

	if (isHome) {
		wallpaperWrapper.classList.remove("wallpaper-page-title");
		wallpaperWrapper.classList.add("overflow-hidden");
		return;
	}

	// banner-overlay-container 是 Swup 容器，page:view 时已经替换为目标页面的覆盖层。
	// 用它判断目标页是否需要标题层，避免沿用上一个页面的 wrapper class。
	const hasPageTitleOverlay = !!document.querySelector(
		".banner-page-title-overlay",
	);
	wallpaperWrapper.classList.toggle(
		"wallpaper-page-title",
		hasPageTitleOverlay,
	);
	wallpaperWrapper.classList.toggle("overflow-hidden", !hasPageTitleOverlay);
};

// 记录本次切页目标，等 Swup 完成内容替换后再按目标页面重新校准一次滚动位置。
// visit:start 阶段使用旧 DOM，直接定位主网格会在替换后被新布局覆盖。
let pendingScrollPath: string | null = null;
let routeTransitionCleanup: number | undefined;
let routeWhiteCleanup: number | undefined;
let homeToInnerScrollPath: string | null = null;
let returnHomeExitActive = false;
let homePageOneTop = 0;
let homeScrollStart = 0;
let previousRouteBodyMinHeight = "";

const finishHomeToInnerScroll = () => {
	const targetPath = homeToInnerScrollPath;
	if (!targetPath) return;
	// Rebase page 1 onto the inner-page origin in one frame. The sidebars stay
	// at the same viewport position while the homepage wallpaper disappears.
	syncWallpaperWrapperClasses(targetPath);
	document.body.classList.remove("is-home", "lg:is-home");
	syncPostListPageClass(targetPath);
	document.getElementById("navbar")?.setAttribute("data-is-home", "false");
	window.scrollTo({ top: 0, left: 0, behavior: "instant" });
	document.body.style.minHeight = previousRouteBodyMinHeight;
	homeToInnerScrollPath = null;
	smoothRouteScrollPath = null;
	document.documentElement.classList.remove("route-home-scroll-active");
	syncScrollProgress(true);
};

const watchHomeToInnerScroll = () => {
	const expectedPath = homeToInnerScrollPath;
	const deadline = performance.now() + 1500;
	const check = () => {
		if (!expectedPath || homeToInnerScrollPath !== expectedPath) return;
		const reachedPageOne = Math.abs(window.scrollY - homePageOneTop) <= 4;
		const contentReady = document.documentElement.classList.contains(
			"route-content-ready",
		);
		if (contentReady && (reachedPageOne || performance.now() >= deadline)) {
			finishHomeToInnerScroll();
			return;
		}
		requestAnimationFrame(check);
	};
	requestAnimationFrame(check);
};

const setup = () => {
	window.swup.hooks.on("visit:abort", () => {
		if (homeToInnerScrollPath) {
			document.body.style.minHeight = previousRouteBodyMinHeight;
		}
		homeToInnerScrollPath = null;
		returnHomeExitActive = false;
		document.documentElement.classList.remove(
			"route-home-scroll-active",
			"route-white-cover",
			"route-white-reveal",
			"route-home-to-inner",
			"route-home-to-post",
			"route-sidebar-reflow",
			"route-inner-to-home",
			"route-content-ready",
		);
		syncWallpaperWrapperClasses(window.location.pathname);
	});

	window.swup.hooks.on("animation:out:await", async () => {
		if (returnHomeExitActive) {
			// Swup's selector can finish before the three persistent columns do.
			await new Promise<void>((resolve) => window.setTimeout(resolve, 340));
			return;
		}
		if (!homeToInnerScrollPath) return;
		const started = performance.now();
		const enteringPost =
			document.documentElement.classList.contains("route-home-to-post");
		await new Promise<void>((resolve) => {
			const check = () => {
				const distance = Math.abs(homePageOneTop - homeScrollStart);
				const remaining = Math.abs(homePageOneTop - window.scrollY);
				const scrollReady = enteringPost
					? remaining <= distance * 0.72 || performance.now() - started > 260
					: remaining <= 4 || performance.now() - started > 1200;
				if (!homeToInnerScrollPath || scrollReady) {
					resolve();
				} else {
					requestAnimationFrame(check);
				}
			};
			check();
		});
	});

	window.swup.hooks.on("animation:out:end", async () => {
		if (!returnHomeExitActive) return;
		document.documentElement.classList.add("route-white-cover");
		await new Promise<void>((resolve) => {
			requestAnimationFrame(() =>
				requestAnimationFrame(() => window.setTimeout(resolve, 90)),
			);
		});
	});

	// 由目标页面决定进入页面 0 还是页面 1。
	window.swup.hooks.replace("scroll:top", (visit: { to: { url: string } }) => {
		const targetPathname = (() => {
			try {
				return new URL(visit.to.url, window.location.href).pathname;
			} catch {
				return visit.to.url;
			}
		})();
		scheduleScrollToPage(targetPathname);
		return true;
	});

	// Swup 的默认 content:scroll 会在内容替换后恢复缓存位置，
	// 这会把没有首屏装饰的页面重新拉回页面 0。由目标路径统一决定页面 0/页面 1，
	// 让“朋友圈”等页面在切换完成后稳定落到主内容区。
	window.swup.hooks.replace("content:scroll", (visit: any) => {
		const targetUrl = (() => {
			try {
				return new URL(visit.to.url, window.location.href);
			} catch {
				return new URL(window.location.href);
			}
		})();

		if (
			visit.history?.popstate ||
			visit.scroll?.target ||
			targetUrl.hash ||
			visit.scroll?.reset === false
		) {
			return true;
		}

		scheduleScrollToPage(targetUrl.pathname);
		if (visit.scroll) visit.scroll.scrolledToContent = true;
		return true;
	});

	// TODO: temp solution to change the height of the banner
	/*
	window.swup.hooks.on('animation:out:start', () => {
		const path = window.location.pathname
		const body = document.querySelector('body')
		if (path[path.length - 1] === '/' && !body.classList.contains('is-home')) {
			body.classList.add('is-home')
		} else if (path[path.length - 1] !== '/' && body.classList.contains('is-home')) {
			body.classList.remove('is-home')
		}
	})
*/
	window.swup.hooks.on(
		"link:click",
		(_visit: any, { el }: { el: HTMLAnchorElement }) => {
			// Remove the delay for the first time page load
			document.documentElement.style.setProperty("--content-delay", "0ms");

			// 同页链接点击不需要过渡保护
			const targetHref = el.getAttribute("href") || "";
			const targetPathname = (() => {
				try {
					return new URL(targetHref, window.location.href).pathname;
				} catch {
					return targetHref;
				}
			})();
			const isSamePage = pathsEqual(targetPathname, window.location.pathname);
			if (isSamePage) {
				document.documentElement.classList.remove("is-page-transitioning");
			}
			if (!isSamePage) {
				// 添加页面切换保护，防止导航栏闪烁
				document.documentElement.classList.add("is-page-transitioning");
			}

			const navbar = document.getElementById("navbar-wrapper");
			if (navbar && stickyNavbar) {
				navbar.classList.remove("navbar-hidden");
			} else if (bannerEnabled && navbar) {
				const threshold = window.innerHeight * (BANNER_HEIGHT_HOME / 100) - 88;
				if (document.documentElement.scrollTop >= threshold) {
					navbar.classList.add("navbar-hidden");
				}
			}
		},
	);
	window.swup.hooks.on("content:replace", () => {
		syncPostListPageClass();
		if (returnHomeExitActive) {
			document.body.classList.add("is-home", "lg:is-home");
			document.getElementById("navbar")?.setAttribute("data-is-home", "true");
		}
		const isHome = pathsEqual(window.location.pathname, url("/"));
		const currentMode = document.documentElement.getAttribute(
			"data-wallpaper-mode",
		);
		const isMobileForBanner = window.innerWidth < 1024;
		const mainEl = document.querySelector(
			".w-full.z-30.pointer-events-none",
		) as HTMLElement | null;

		// 移动端 banner/全屏模式非首页：隐藏壁纸并调整内容位置（首页由 visit:start 和 page:view 处理）
		if (
			!homeToInnerScrollPath &&
			isMobileForBanner &&
			(currentMode === "banner" || currentMode === "fullscreen") &&
			!isHome
		) {
			const wrapper = document.getElementById("wallpaper-wrapper");
			if (wrapper) {
				wrapper.style.display = "none";
				wrapper.classList.add("mobile-hide-banner");
			}
			if (mainEl) {
				mainEl.classList.add("mobile-main-no-banner");
				mainEl.style.setProperty("top", "5.5rem", "important");
				mainEl.style.position = "";
				mainEl.style.zIndex = "";
				mainEl.style.setProperty("margin-top", "0", "important");
			}
		}

		// 桌面端全屏壁纸模式：壁纸始终可见，内容用 relative 定位紧跟壁纸
		if (
			isHome &&
			!isMobileForBanner &&
			currentMode === "fullscreen" &&
			mainEl
		) {
			mainEl.style.position = "relative";
			mainEl.style.zIndex = "30";
			mainEl.style.setProperty("top", "0", "important");
			mainEl.style.setProperty("margin-top", "1rem", "important");
		}

		// 桌面端横幅模式：统一用banner高度定位，不改变grid transform
		if (isHome && !isMobileForBanner && currentMode === "banner" && mainEl) {
			mainEl.style.setProperty(
				"top",
				"calc(var(--banner-height) - 3.5rem)",
				"important",
			);
			mainEl.style.position = "";
			mainEl.style.zIndex = "";
			mainEl.style.setProperty("margin-top", "0", "important");
		}

		if (!homeToInnerScrollPath) {
			syncWallpaperWrapperClasses(window.location.pathname);
		}
		if (returnHomeExitActive) {
			scrollToPage(window.location.pathname);
		}
		if (
			document.documentElement.matches(
				".route-home-to-inner, .route-inner-to-home",
			)
		) {
			document
				.getElementById("content-wrapper")
				?.classList.add("route-motion-handled");
		}
		document.documentElement.classList.add("route-content-ready");

		// 更新侧边栏组件的可见性（根据新页面的 URL）
		updateSidebarComponentsVisibility();

		// 只处理katex元素的容器，使用浏览器原生滚动条
		scheduleContentOverflowEnhancements();

		// 重新初始化图标加载器
		import("@/utils/icon-loader").then(({ initIconLoader }) => {
			initIconLoader();
		});

		// 检查当前页面是否为文章页面（有TOC元素）
		const tocWrapper = document.getElementById("toc-wrapper");
		const isArticlePage = tocWrapper !== null;

		// 只在文章页面重新初始化桌面端 TOC 组件
		if (isArticlePage) {
			const tocElement = document.querySelector("table-of-contents");
			if (tocElement && typeof (tocElement as any).init === "function") {
				setTimeout(() => {
					(tocElement as any).init();
				}, 100);
			}
		}

		// 重新初始化semifull模式的滚动检测
		const navbar = document.getElementById("navbar");
		if (navbar) {
			const transparentMode = navbar.getAttribute("data-transparent-mode");

			if (transparentMode === "semifull") {
				// 重新调用初始化函数来重新绑定滚动事件
				if (typeof (window as any).initSemifullScrollDetection === "function") {
					(window as any).initSemifullScrollDetection();
				}
			}
		}
	});
	window.swup.hooks.on(
		"visit:start",
		(visit: { to: { url: string }; history?: { popstate?: boolean } }) => {
			// Keep the floating reading progress indicator in sync during navigation.
			syncScrollProgress(true);

			// change banner height immediately when a link is clicked
			const bodyElement = document.querySelector("body");
			const targetPathname = (() => {
				try {
					return new URL(visit.to.url, window.location.href).pathname;
				} catch {
					return visit.to.url;
				}
			})();
			const isHomePage = pathsEqual(targetPathname, url("/"));
			const wasHomePage = bodyElement?.classList.contains("is-home") ?? false;
			const canAnimateBoundary =
				!visit.history?.popstate &&
				!visit.to.url.includes("#") &&
				!window.matchMedia("(prefers-reduced-motion: reduce)").matches;
			const isHomeToInner = wasHomePage && !isHomePage;
			const isReturningHome = !wasHomePage && isHomePage;
			const isTargetPost =
				targetPathname.includes("/posts/") || targetPathname.includes("/post/");
			const isCurrentPost =
				window.location.pathname.includes("/posts/") ||
				window.location.pathname.includes("/post/");
			if (isHomeToInner) {
				// These columns persist across Swup visits. Their first-load animation
				// must not replay when a post-only widget becomes visible later.
				document
					.querySelectorAll(
						"#left-sidebar .onload-animation, #right-sidebar .onload-animation, #left-sidebar.onload-animation, #right-sidebar.onload-animation",
					)
					.forEach((element) => element.classList.remove("onload-animation"));
			}
			const homeMain = document.querySelector(
				".w-full.z-30.pointer-events-none",
			) as HTMLElement | null;
			const innerTop =
				Number.parseFloat(getComputedStyle(document.documentElement).fontSize) *
				5.5;
			const mainTop = homeMain
				? homeMain.getBoundingClientRect().top + window.scrollY
				: 0;
			const maxScrollTop = Math.max(
				0,
				document.documentElement.scrollHeight - window.innerHeight,
			);
			const pageOneTop = Math.min(
				maxScrollTop,
				Math.max(0, mainTop - innerTop),
			);
			const shouldScrollHomePageOne =
				canAnimateBoundary &&
				isHomeToInner &&
				Math.abs(pageOneTop - window.scrollY) > 24;
			const shouldSmoothScroll =
				!visit.history?.popstate &&
				!visit.to.url.includes("#") &&
				!pathsEqual(targetPathname, window.location.pathname) &&
				window.scrollY > 24 &&
				!isHomeToInner &&
				!isReturningHome &&
				!window.matchMedia("(prefers-reduced-motion: reduce)").matches;
			smoothRouteScrollPath = shouldSmoothScroll ? targetPathname : null;
			smoothRouteScrollUntil = shouldSmoothScroll ? performance.now() + 900 : 0;
			if (homeToInnerScrollPath) {
				document.body.style.minHeight = previousRouteBodyMinHeight;
			}
			homeToInnerScrollPath = null;
			returnHomeExitActive = false;
			pendingScrollPath = targetPathname;
			window.clearTimeout(routeTransitionCleanup);
			window.clearTimeout(routeWhiteCleanup);
			document.documentElement.classList.remove("route-content-ready");
			document.documentElement.classList.remove(
				"route-white-cover",
				"route-white-reveal",
				"route-home-scroll-active",
			);
			document.documentElement.classList.toggle(
				"route-home-to-inner",
				isHomeToInner,
			);
			document.documentElement.classList.toggle(
				"route-home-to-post",
				shouldScrollHomePageOne && isTargetPost,
			);
			document.documentElement.classList.toggle(
				"route-sidebar-reflow",
				canAnimateBoundary && !isCurrentPost && isTargetPost,
			);
			document.documentElement.classList.toggle(
				"route-inner-to-home",
				isReturningHome,
			);
			if (canAnimateBoundary && isReturningHome) {
				// Keep the inner-page layout in place until all three columns leave.
				returnHomeExitActive = true;
				return;
			}
			if (shouldScrollHomePageOne) {
				document.documentElement.classList.add("route-home-scroll-active");
				homeToInnerScrollPath = targetPathname;
				homePageOneTop = pageOneTop;
				homeScrollStart = window.scrollY;
				previousRouteBodyMinHeight = document.body.style.minHeight;
				document.body.style.minHeight = `${Math.ceil(pageOneTop + window.innerHeight + 2)}px`;
				smoothRouteScrollPath = targetPathname;
				smoothRouteScrollUntil = performance.now() + 1600;
				window.scrollTo({ top: pageOneTop, left: 0, behavior: "smooth" });
				watchHomeToInnerScroll();
				return;
			}
			if (isReturningHome) {
				document
					.getElementById("wallpaper-wrapper")
					?.style.setProperty("display", "block", "important");
			}
			syncWallpaperWrapperClasses(targetPathname);
			if (!visit.to.url.includes("#")) {
				scrollToPage(targetPathname, shouldSmoothScroll ? "smooth" : "instant");
			}
			syncPostListPageClass(targetPathname);

			// 禁用 #main-grid 的过渡动画，防止 lg:is-home 切换时 transform 产生 700ms 动画
			const mainGrid = document.getElementById("main-grid");
			if (mainGrid) {
				mainGrid.style.setProperty("transition", "none", "important");
			}

			if (isHomePage) {
				bodyElement!.classList.add("lg:is-home");
				bodyElement!.classList.add("is-home");
			} else {
				bodyElement!.classList.remove("lg:is-home");
				bodyElement!.classList.remove("is-home");
			}

			// 强制回流，确保 transform 立即生效，然后恢复过渡动画
			if (mainGrid) {
				void mainGrid.offsetWidth;
				mainGrid.style.removeProperty("transition");
			}

			// 同步壁纸模式的 body 类（防止 enable-banner 从初始加载残留到全屏/overlay/none 模式）
			const currentWallpaperMode = document.documentElement.getAttribute(
				"data-wallpaper-mode",
			);
			if (currentWallpaperMode !== "banner") {
				bodyElement!.classList.remove("enable-banner");
				bodyElement!.classList.add("no-banner-layout");
				if (currentWallpaperMode === "overlay") {
					bodyElement!.classList.add("wallpaper-transparent");
				} else {
					bodyElement!.classList.remove("wallpaper-transparent");
				}
			}

			// Control navbar transparency based on page
			const navbar = document.getElementById("navbar");
			if (navbar) {
				navbar.setAttribute("data-is-home", isHomePage.toString());

				// 重新初始化semifull模式的滚动检测
				const transparentMode = navbar.getAttribute("data-transparent-mode");
				if (transparentMode === "semifull") {
					// 重新调用初始化函数来重新绑定滚动事件
					if (
						typeof (window as any).initSemifullScrollDetection === "function"
					) {
						(window as any).initSemifullScrollDetection();
					}
				}
			}

			// Control mobile banner visibility based on page with improved staging animation
			// 只在移动端（1024px以下）处理banner隐藏
			const isMobile = window.innerWidth < 1024;

			// 在移动端禁用文章列表容器的过渡动画，防止与主内容区位置变化冲突
			if (isMobile) {
				const postListContainer = document.getElementById(
					"post-list-container",
				);
				if (postListContainer) {
					postListContainer.style.transition = "none";
				}
			}

			const wallpaperWrapper = document.getElementById("wallpaper-wrapper");
			const mainContentWrapper = document.querySelector(
				".w-full.z-30.pointer-events-none",
			) as HTMLElement | null;

			if (isMobile && wallpaperWrapper && mainContentWrapper) {
				if (isHomePage) {
					// 首页：禁用主内容区域的过渡动画，防止文章列表下移
					// 使用 setProperty + important 确保覆盖 CSS !important 规则
					mainContentWrapper.style.setProperty(
						"transition",
						"none",
						"important",
					);

					// 移除隐藏类让壁纸出现（display:none 由 CSS 类控制，需先移除类）
					wallpaperWrapper.classList.remove("mobile-hide-banner");
					wallpaperWrapper.style.display = "";
					setTimeout(() => {
						mainContentWrapper.classList.remove("mobile-main-no-banner");
						// 恢复与 SSR 一致的内联 top，而非 removeProperty（否则 CSS 的 70vh 会生效导致内容下移）
						const visitCurrentMode = document.documentElement.getAttribute(
							"data-wallpaper-mode",
						);
						if (visitCurrentMode === "fullscreen") {
							mainContentWrapper.style.position = "relative";
							mainContentWrapper.style.zIndex = "30";
							mainContentWrapper.style.setProperty("top", "0", "important");
							mainContentWrapper.style.setProperty(
								"margin-top",
								"1rem",
								"important",
							);
						} else if (
							visitCurrentMode === "overlay" ||
							visitCurrentMode === "none"
						) {
							mainContentWrapper.style.setProperty(
								"top",
								"5.5rem",
								"important",
							);
							mainContentWrapper.style.position = "";
							mainContentWrapper.style.zIndex = "";
							mainContentWrapper.style.setProperty(
								"margin-top",
								"0",
								"important",
							);
						} else if (isMobile) {
							// 移动端横幅模式首页：清除 inline top，让 CSS 响应式规则生效
							mainContentWrapper.style.removeProperty("top");
							mainContentWrapper.style.position = "";
							mainContentWrapper.style.zIndex = "";
							mainContentWrapper.style.setProperty(
								"margin-top",
								"0",
								"important",
							);
						} else {
							mainContentWrapper.style.setProperty(
								"top",
								"calc(var(--banner-height) - 3.5rem)",
								"important",
							);
							mainContentWrapper.style.position = "";
							mainContentWrapper.style.zIndex = "";
							mainContentWrapper.style.setProperty(
								"margin-top",
								"0",
								"important",
							);
						}
						// 不在此处恢复过渡动画，由 page:view 统一管理，避免与后续钩子冲突
					}, 150);
				} else {
					// 非首页：隐藏壁纸并移动内容
					wallpaperWrapper.classList.add("mobile-hide-banner");
					mainContentWrapper.classList.add("mobile-main-no-banner");
					mainContentWrapper.style.setProperty("top", "5.5rem", "important");
					mainContentWrapper.style.position = "";
					mainContentWrapper.style.zIndex = "";
					mainContentWrapper.style.setProperty("margin-top", "0", "important");
				}
			} else if (!isMobile && isHomePage && wallpaperWrapper) {
				// 桌面端：确保banner正常显示
				wallpaperWrapper.style.display = "";
				wallpaperWrapper.classList.remove("mobile-hide-banner");
				if (mainContentWrapper) {
					mainContentWrapper.classList.remove("mobile-main-no-banner");
					// 桌面端全屏壁纸模式：壁纸始终可见，内容用 relative 定位紧跟壁纸
					const visitDesktopMode = document.documentElement.getAttribute(
						"data-wallpaper-mode",
					);
					if (visitDesktopMode === "fullscreen") {
						mainContentWrapper.style.position = "relative";
						mainContentWrapper.style.zIndex = "30";
						mainContentWrapper.style.setProperty("top", "0", "important");
						mainContentWrapper.style.setProperty(
							"margin-top",
							"1rem",
							"important",
						);
					}
					// 桌面端横幅模式：统一用banner高度定位，不改变grid transform
					if (visitDesktopMode === "banner") {
						mainContentWrapper.style.setProperty(
							"top",
							"calc(var(--banner-height) - 3.5rem)",
							"important",
						);
						mainContentWrapper.style.position = "";
						mainContentWrapper.style.zIndex = "";
						mainContentWrapper.style.setProperty(
							"margin-top",
							"0",
							"important",
						);
					}
				}
			}

			// increase the page height during page transition to prevent the scrolling animation from jumping
			const heightExtend = document.getElementById("page-height-extend");
			if (heightExtend) {
				heightExtend.classList.remove("hidden");
			}

			// Hide the TOC while scrolling back to top
			const toc = document.getElementById("toc-wrapper");
			if (toc) {
				toc.classList.add("toc-not-ready");
			}

			// 桌面端先同步进入目标页面的页面 0/页面 1，避免切换动画期间保留旧页面滚动位置。
			// 移动端交给 scroll:top 钩子处理，避免主内容定位尚未完成时出现闪烁。
			if (window.innerWidth >= 768) {
				scheduleScrollToPage(targetPathname);
			}
		},
	);
	window.swup.hooks.on("page:view", () => {
		syncPostListPageClass();
		// 恢复 #main-grid 的过渡动画（visit:start 中禁用了）
		const mainGrid = document.getElementById("main-grid");
		if (mainGrid) {
			mainGrid.style.removeProperty("transition");
		}

		// 更新网格列数和侧边栏组件可见性
		updateMainGridCols();
		updateSidebarComponentsVisibility();

		// hide the temp high element when the transition is done
		const heightExtend = document.getElementById("page-height-extend");
		if (heightExtend) {
			heightExtend.classList.remove("hidden");
		}

		// 移动端 banner/全屏模式：非首页隐藏壁纸，首页恢复
		const isHome = pathsEqual(window.location.pathname, url("/"));
		const currentMode = document.documentElement.getAttribute(
			"data-wallpaper-mode",
		);
		const isMobileForBanner = window.innerWidth < 1024;
		const wrapper = document.getElementById(
			"wallpaper-wrapper",
		) as HTMLElement | null;
		const mainEl = document.querySelector(
			".w-full.z-30.pointer-events-none",
		) as HTMLElement | null;
		if (
			!homeToInnerScrollPath &&
			isMobileForBanner &&
			(currentMode === "banner" || currentMode === "fullscreen")
		) {
			if (!isHome) {
				if (wrapper) {
					wrapper.style.display = "none";
					wrapper.classList.add("mobile-hide-banner");
				}
				if (mainEl) {
					mainEl.classList.add("mobile-main-no-banner");
					mainEl.style.setProperty("top", "5.5rem", "important");
					mainEl.style.position = "";
					mainEl.style.zIndex = "";
					mainEl.style.setProperty("margin-top", "0", "important");
				}
			} else {
				if (wrapper) {
					wrapper.style.display = "block";
					wrapper.classList.remove("mobile-hide-banner");
				}
				if (mainEl) {
					// visit:start 已禁用过渡并移除了类，此处确认最终状态
					// 位置变化完成后，延迟恢复过渡动画（确保浏览器已应用新位置）
					setTimeout(() => {
						mainEl.style.removeProperty("transition");
					}, 50);
				}
			}
		}

		// 桌面端全屏壁纸模式：壁纸始终可见，内容用 relative 定位紧跟壁纸
		if (
			isHome &&
			!isMobileForBanner &&
			currentMode === "fullscreen" &&
			mainEl
		) {
			mainEl.style.position = "relative";
			mainEl.style.zIndex = "30";
			mainEl.style.setProperty("top", "0", "important");
			mainEl.style.setProperty("margin-top", "1rem", "important");
		}

		// 桌面端横幅模式：统一用banner高度定位，不改变grid transform
		if (isHome && !isMobileForBanner && currentMode === "banner" && mainEl) {
			mainEl.style.setProperty(
				"top",
				"calc(var(--banner-height) - 3.5rem)",
				"important",
			);
			mainEl.style.position = "";
			mainEl.style.zIndex = "";
			mainEl.style.setProperty("margin-top", "0", "important");
		}

		if (!homeToInnerScrollPath) {
			syncWallpaperWrapperClasses(window.location.pathname);
		}

		if (returnHomeExitActive) {
			requestAnimationFrame(() =>
				requestAnimationFrame(() => {
					if (!returnHomeExitActive) return;
					window.setTimeout(() => {
						if (!returnHomeExitActive) return;
						document.documentElement.classList.add("route-white-reveal");
						routeWhiteCleanup = window.setTimeout(() => {
							document.documentElement.classList.remove(
								"route-white-cover",
								"route-white-reveal",
							);
							returnHomeExitActive = false;
						}, 340);
					}, 90);
				}),
			);
		}

		const targetPathAfterReplace = pendingScrollPath;
		pendingScrollPath = null;
		if (targetPathAfterReplace && !window.location.hash) {
			scheduleScrollToPage(targetPathAfterReplace);
		}

		// 在移动端恢复文章列表容器的过渡动画（在主内容区位置动画完成后）
		const isMobile = window.innerWidth < 1024;
		if (isMobile) {
			setTimeout(() => {
				const postListContainer = document.getElementById(
					"post-list-container",
				);
				if (postListContainer) {
					postListContainer.style.transition = "";
				}
			}, 600); // 等待主内容区动画完成（0.4s + 0.1s delay + 100ms buffer）
		}

		// 同步主题状态 - 解决从首页进入文章页面时代码块渲染问题
		const storedTheme =
			localStorage.getItem("theme") ||
			siteConfig.themeColor.defaultMode ||
			"light";
		let isDark = false;

		// 处理 system 模式
		if (storedTheme === "system") {
			isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
		} else {
			isDark = storedTheme === "dark";
		}

		const expectedTheme = isDark
			? expressiveCodeConfig.darkTheme
			: expressiveCodeConfig.lightTheme;
		const currentTheme = document.documentElement.getAttribute("data-theme");

		// 如果主题不匹配，静默更新（不触发事件，避免重新加载效果）
		if (currentTheme !== expectedTheme) {
			document.documentElement.setAttribute("data-theme", expectedTheme);
		}

		// 检查当前页面是否为文章页面，如果是则触发自定义事件用于初始化评论系统
		setTimeout(() => {
			if (document.getElementById("tcomment")) {
				// 触发自定义事件，通知评论系统页面已完全加载
				const pageLoadedEvent = new CustomEvent("firefly:page:loaded", {
					detail: {
						path: window.location.pathname,
						timestamp: Date.now(),
					},
				});
				document.dispatchEvent(pageLoadedEvent);
				console.log(
					"Layout: 触发 firefly:page:loaded 事件，路径:",
					window.location.pathname,
				);
			}
		}, 300);

		// 页面布局完成并绘制首帧后，再通知需要视觉启动的组件。
		requestAnimationFrame(() => {
			requestAnimationFrame(() => {
				document.dispatchEvent(
					new CustomEvent("firefly:page-ready", {
						detail: {
							path: window.location.pathname,
							timestamp: Date.now(),
						},
					}),
				);
			});
		});
	});
	window.swup.hooks.on("visit:end", (_visit: { to: { url: string } }) => {
		requestAnimationFrame(() => syncScrollProgress(true));

		const clearRouteMotion = () => {
			if (homeToInnerScrollPath) {
				routeTransitionCleanup = window.setTimeout(clearRouteMotion, 80);
				return;
			}
			document.documentElement.classList.remove(
				"route-home-to-inner",
				"route-home-to-post",
				"route-sidebar-reflow",
				"route-inner-to-home",
				"route-content-ready",
			);
			syncWallpaperWrapperClasses(window.location.pathname);
		};
		routeTransitionCleanup = window.setTimeout(clearRouteMotion, 520);

		if (!window.location.hash) {
			scheduleScrollToPage(window.location.pathname);
		}

		setTimeout(() => {
			const heightExtend = document.getElementById("page-height-extend");
			if (heightExtend) {
				heightExtend.classList.add("hidden");
			}

			// Just make the transition looks better
			const toc = document.getElementById("toc-wrapper");
			if (toc) {
				toc.classList.remove("toc-not-ready");
			}

			// 移除页面切换保护，恢复过渡动画
			document.documentElement.classList.remove("is-page-transitioning");
			scrollFunction();
		}, 200);
	});

	// 直接打开关于、更新日志、归档等页面时没有 visit:start，
	// 因此需要在初始布局完成后同样落到页面 1；已有历史滚动位置则交给浏览器保留。
	requestAnimationFrame(() => {
		requestAnimationFrame(() => {
			if (window.scrollY <= 1 && !window.location.hash) {
				scheduleScrollToPage(window.location.pathname, "instant", true);
			}
		});
	});
};
if (window?.swup?.hooks) {
	setup();
} else {
	document.addEventListener("swup:enable", setup);
}
document.addEventListener("wallpaperModeChange", () => {
	syncWallpaperWrapperClasses();
});

document.addEventListener(
	"astro:page-load",
	scheduleContentOverflowEnhancements,
);
document.addEventListener("password:decrypted", () => {
	setTimeout(scheduleContentOverflowEnhancements, 200);
});
const backToTopBtn = document.getElementById("back-to-top-btn");
const toc = document.getElementById("toc-wrapper");
const navbar = document.getElementById("navbar-wrapper");
let scrollProgressCircle = document.getElementById("scroll-progress-circle");
let scrollProgressCircleValue = document.getElementById(
	"scroll-progress-circle-value",
);
let scrollProgressCircleLabel = document.getElementById(
	"scroll-progress-circle-label",
);
let lastScrollProgress = -1;
let lastScrollProgressPercent = -1;
let lastScrollProgressUpdateAt = Number.NEGATIVE_INFINITY;
let lastSidebarScrolled: boolean | null = null;
const sidebarStickyState: Record<
	"left" | "right",
	{ topClass: "top-0" | "top-4"; hasVisibleTop: boolean }
> = {
	left: { topClass: "top-0", hasVisibleTop: false },
	right: { topClass: "top-0", hasVisibleTop: false },
};

function syncScrollProgress(force = false) {
	// Reading document height and painting the SVG on every scroll frame is
	// expensive on long articles. The small indicator only needs ~12 updates/s.
	const now = performance.now();
	if (!force && now - lastScrollProgressUpdateAt < 80) return;
	lastScrollProgressUpdateAt = now;
	scrollProgressCircle ??= document.getElementById("scroll-progress-circle");
	scrollProgressCircleValue ??= document.getElementById(
		"scroll-progress-circle-value",
	);
	scrollProgressCircleLabel ??= document.getElementById(
		"scroll-progress-circle-label",
	);
	if (!scrollProgressCircle) return;

	const scrollingElement =
		document.scrollingElement || document.documentElement;
	const maxScroll = Math.max(
		0,
		scrollingElement.scrollHeight - window.innerHeight,
	);
	const scrollTop = Math.max(
		0,
		window.scrollY || scrollingElement.scrollTop || 0,
	);
	const nextProgress = maxScroll > 0 ? Math.min(1, scrollTop / maxScroll) : 0;

	// Avoid a style write on every scroll event when rounding leaves the visual state unchanged.
	if (Math.abs(nextProgress - lastScrollProgress) < 0.0005) return;
	lastScrollProgress = nextProgress;
	if (scrollProgressCircle) {
		const percentage = Math.round(nextProgress * 100);
		scrollProgressCircleValue?.style.setProperty(
			"stroke-dashoffset",
			`${(100 - nextProgress * 100).toFixed(2)}`,
		);
		if (percentage !== lastScrollProgressPercent) {
			lastScrollProgressPercent = percentage;
			scrollProgressCircleLabel &&
				(scrollProgressCircleLabel.textContent = `${percentage}%`);
			scrollProgressCircle.setAttribute(
				"aria-label",
				`页面滚动进度 ${percentage}%`,
			);
		}
	}
}

// 优化的滚动处理函数
function scrollFunction() {
	if (document.documentElement.classList.contains("is-page-transitioning")) {
		return;
	}

	syncScrollProgress();
	const scrollTop = document.documentElement.scrollTop;
	const bannerHeight = window.innerHeight * (BANNER_HEIGHT / 100);
	const navbarElement = document.getElementById("navbar");

	// Sticky spacing only changes when we cross the top of the page.
	updateSidebarStickySpacing();

	if (backToTopBtn) {
		const hidden = scrollTop <= bannerHeight;
		if (backToTopBtn.classList.contains("hide") !== hidden) {
			backToTopBtn.classList.toggle("hide", hidden);
		}
	}

	if (bannerEnabled && toc) {
		const hidden = scrollTop <= bannerHeight;
		if (toc.classList.contains("toc-hide") !== hidden) {
			toc.classList.toggle("toc-hide", hidden);
		}
	}

	if (stickyNavbar && navbar) {
		if (navbar.classList.contains("navbar-hidden")) {
			navbar.classList.remove("navbar-hidden");
		}
	} else if (bannerEnabled && navbar) {
		const threshold = window.innerHeight * (BANNER_HEIGHT_HOME / 100) - 88;
		const hidden = scrollTop >= threshold;
		if (navbar.classList.contains("navbar-hidden") !== hidden) {
			navbar.classList.toggle("navbar-hidden", hidden);
		}
	}

	if (navbarElement) {
		const shadow = scrollTop > 8;
		if (navbarElement.classList.contains("navbar-sticky-shadow") !== shadow) {
			navbarElement.classList.toggle("navbar-sticky-shadow", shadow);
		}
	}
}

// 使用优化的滚动性能处理
let scrollTimeout: number;
let ambientScrollIdleTimer = 0;
window.addEventListener(
	"scroll",
	() => {
		if (document.documentElement.dataset.siteTheme === "aemeath") {
			const root = document.documentElement;
			root.classList.add("is-aemeath-scrolling");
			window.clearTimeout(ambientScrollIdleTimer);
			ambientScrollIdleTimer = window.setTimeout(() => {
				root.classList.remove("is-aemeath-scrolling");
				ambientScrollIdleTimer = 0;
			}, 180);
		}
		if (scrollTimeout) {
			cancelAnimationFrame(scrollTimeout);
		}
		scrollTimeout = requestAnimationFrame(scrollFunction);
	},
	{ passive: true },
);

// 初始化滚动状态（例如从历史位置恢复时）
scrollFunction();

window.onresize = () => {
	// calculate the --banner-height-extend, which needs to be a multiple of 4 to avoid blurry text
	let offset = Math.floor(window.innerHeight * (BANNER_HEIGHT_EXTEND / 100));
	offset = offset - (offset % 4);
	document.documentElement.style.setProperty(
		"--banner-height-extend",
		`${offset}px`,
	);
	syncScrollProgress(true);
	updateSidebarStickySpacing(true);
};

// 页面加载完成后初始化banner和内容溢出容器
if (document.readyState === "loading") {
	document.addEventListener("DOMContentLoaded", () => {
		showBanner();
		scheduleContentOverflowEnhancements();
	});
} else {
	showBanner();
	scheduleContentOverflowEnhancements();
}

// 检查当前页面是否为文章详情页
const isCurrentPagePost = () =>
	window.location.pathname.includes("/posts/") ||
	window.location.pathname.includes("/post/");

// Grid 列类常量
const GRID_COL_CLASSES = [
	"grid-cols-1",
	"md:grid-cols-[17.5rem_1fr]",
	"md:grid-cols-[1fr_17.5rem]",
	"xl:grid-cols-[17.5rem_1fr_17.5rem]",
];

// 多列布局下的列定位类（需在切换单列时清除）
const MULTI_COL_POS_CLASSES = [
	"md:col-start-1",
	"md:col-start-2",
	"xl:col-start-1",
	"xl:col-start-2",
	"xl:col-start-3",
	"xl:col-end-3",
	"md:col-span-1",
	"xl:col-span-1",
];

// 清除元素上的多列定位类
function clearColPositioning(...elements: (Element | null | undefined)[]) {
	for (const el of elements) {
		if (!el) continue;
		for (const cls of MULTI_COL_POS_CLASSES) el.classList.remove(cls);
	}
}

// 设置单列布局：grid 设为 grid-cols-1，清除子元素的多列定位类
function applySingleColLayout(mainGrid: Element) {
	for (const cls of GRID_COL_CLASSES) mainGrid.classList.remove(cls);
	mainGrid.classList.add("grid-cols-1");
	const swupContainer = document.getElementById("swup-container");
	clearColPositioning(
		swupContainer,
		swupContainer?.parentElement,
		mainGrid.querySelector(".footer"),
	);
}

// 更新主网格的网格列数
function updateMainGridCols() {
	const mainGrid = document.getElementById("main-grid");
	if (!mainGrid) return;

	const sidebarEnabled =
		mainGrid.getAttribute("data-sidebar-enable") !== "false";
	const sidebarHideOnPost =
		mainGrid.getAttribute("data-grid-hide-sidebar-on-post") === "true";
	const isPostPage = isCurrentPagePost();
	const sidebarPosition =
		mainGrid.getAttribute("data-sidebar-position") || "left";
	const tabletSidebar = mainGrid.getAttribute("data-tablet-sidebar") || "left";
	const showBothSidebarsOnPostPage =
		mainGrid.getAttribute("data-show-both-sidebars-on-post") === "true";

	// 侧边栏禁用 或 文章详情页隐藏侧边栏时，保持单列布局
	if (!sidebarEnabled || (isPostPage && sidebarHideOnPost)) {
		applySingleColLayout(mainGrid);
		return;
	}

	const shouldBothSidebars =
		isPostPage && sidebarPosition !== "both" && showBothSidebarsOnPostPage;

	let newGridClasses: string;

	if (sidebarPosition === "both" || shouldBothSidebars) {
		const effectiveTabletSidebar =
			shouldBothSidebars && sidebarPosition === "right"
				? "right"
				: tabletSidebar;
		newGridClasses =
			effectiveTabletSidebar === "right"
				? "grid-cols-1 md:grid-cols-[1fr_17.5rem] xl:grid-cols-[17.5rem_1fr_17.5rem]"
				: "grid-cols-1 md:grid-cols-[17.5rem_1fr] xl:grid-cols-[17.5rem_1fr_17.5rem]";
	} else if (sidebarPosition === "right") {
		newGridClasses = "grid-cols-1 md:grid-cols-[1fr_17.5rem]";
	} else {
		newGridClasses = "grid-cols-1 md:grid-cols-[17.5rem_1fr]";
	}

	for (const cls of GRID_COL_CLASSES) mainGrid.classList.remove(cls);
	for (const cls of newGridClasses.split(" "))
		if (cls) mainGrid.classList.add(cls);

	// position为right时，swup导航不会替换静态元素的class，需手动更新列定位
	if (sidebarPosition === "right") {
		const rightSidebar = document.getElementById("right-sidebar");
		const swupContainer = document.getElementById("swup-container");
		const swupWrapper = swupContainer?.parentElement;
		const footer = mainGrid.querySelector(".footer");

		if (shouldBothSidebars) {
			// 文章页临时双侧栏：主内容移到第2列，右侧栏移到第3列，页脚居中
			clearColPositioning(swupContainer, swupWrapper, footer);
			swupContainer?.classList.add(
				"md:col-start-2",
				"xl:col-start-2",
				"xl:col-end-3",
			);
			swupWrapper?.classList.add("md:col-start-2");
			rightSidebar?.classList.add("xl:col-start-3");
			footer?.classList.add("md:col-start-2", "xl:col-start-2");
		} else {
			// 非文章页：恢复2列布局定位（右侧栏保持 md:col-start-2 不变）
			clearColPositioning(swupContainer, swupWrapper, footer);
			rightSidebar?.classList.remove("xl:col-start-3");
			swupContainer?.classList.add("md:col-start-1");
			swupWrapper?.classList.add("md:col-start-1");
			footer?.classList.add("md:col-start-1", "xl:col-start-1");
		}
	}
}

// 更新侧边栏组件的可见性
function updateSidebarComponentsVisibility() {
	const isPostPage = isCurrentPagePost();
	const animateReflow = document.documentElement.classList.contains(
		"route-sidebar-reflow",
	);
	const movingSections = animateReflow
		? Array.from(
				document.querySelectorAll<HTMLElement>(
					"#left-sidebar > div:not([id]) > .card-base, #right-sidebar > div:not([id]) > .card-base, #left-sidebar-sticky, #right-sidebar-sticky",
				),
			).filter(
				(card) =>
					!card.classList.contains("widget-hide-on-post") &&
					!card.classList.contains("widget-hide-on-non-post") &&
					card.getClientRects().length > 0,
			)
		: [];
	const previousTops = new Map(
		movingSections.map((section) => [
			section,
			section.getBoundingClientRect().top,
		]),
	);

	// 移动端文章页：若底部组件均配置为不在文章页显示，则隐藏整个容器，
	// 避免空容器保留间距，也防止任何子组件样式意外突破隐藏状态。
	const mobileBottomSidebar = document.getElementById("mobile-bottom-sidebar");
	if (mobileBottomSidebar) {
		const hideMobileBottomOnPost =
			mobileBottomSidebar.getAttribute("data-hide-mobile-bottom-on-post") ===
			"true";
		if (isPostPage && hideMobileBottomOnPost) {
			mobileBottomSidebar.style.setProperty("display", "none", "important");
		} else {
			mobileBottomSidebar.style.removeProperty("display");
		}
	}

	// 处理侧边栏级别的 hideSidebarOnPostPage 配置
	document
		.querySelectorAll<HTMLElement>("[data-hide-sidebar-on-post]")
		.forEach((wrapper) => {
			const hideOnPost =
				wrapper.getAttribute("data-hide-sidebar-on-post") === "true";
			if (isPostPage && hideOnPost) {
				wrapper.style.setProperty("display", "none", "important");
			} else {
				wrapper.style.removeProperty("display");
			}
		});

	// 处理组件级别的 showOnPostPage 配置
	document.querySelectorAll(".widget-hide-on-post").forEach((widget) => {
		isPostPage
			? widget.classList.add("hidden")
			: widget.classList.remove("hidden");
	});

	// 处理 hideOnNonPostPage === true 的组件
	document.querySelectorAll(".widget-hide-on-non-post").forEach((widget) => {
		!isPostPage
			? widget.classList.add("hidden")
			: widget.classList.remove("hidden");
	});

	// 组件可见性变化后，立即重算 sticky 间距，避免 swup 切页后残留旧间距
	updateSidebarStickySpacing(true);
	for (const section of movingSections) {
		const offset =
			previousTops.get(section)! - section.getBoundingClientRect().top;
		if (Math.abs(offset) > 1) {
			section.animate(
				[
					{ transform: `translateY(${offset}px)` },
					{ transform: "translateY(0)" },
				],
				{ duration: 420, easing: "ease-in-out" },
			);
		}
	}
	if (animateReflow) {
		document.documentElement.classList.remove("route-sidebar-reflow");
	}
}

// 根据当前页面实际可见的顶部组件与滚动位置，动态更新侧边栏 sticky 间距
function updateSidebarStickySpacing(force = false) {
	const scrollTop = document.documentElement.scrollTop || window.scrollY || 0;
	const isScrolled = scrollTop > 2;
	if (!force && lastSidebarScrolled === isScrolled) return;
	lastSidebarScrolled = isScrolled;

	(["left", "right"] as const).forEach((side) => {
		const sticky = document.getElementById(`${side}-sidebar-sticky`);
		if (!sticky) return;

		// 结构为：sidebar -> top 容器（可选） + sticky 容器
		const topContainer = sticky.previousElementSibling as HTMLElement | null;
		const hasVisibleTop = !!topContainer && topContainer.offsetHeight > 1;

		// swup 从非文章页切换到文章页时，top 容器可能残留 mb-4，需要按可见性动态修正
		if (topContainer) {
			if (hasVisibleTop !== sidebarStickyState[side].hasVisibleTop) {
				sidebarStickyState[side].hasVisibleTop = hasVisibleTop;
			}

			if (hasVisibleTop) {
				topContainer.classList.add("mb-4");
			} else {
				topContainer.classList.remove("mb-4");
			}
		}

		// 仅切换顶部偏移；组件间距由容器常驻 gap-4 保持
		const nextTopClass: "top-0" | "top-4" =
			hasVisibleTop || isScrolled ? "top-4" : "top-0";

		if (sidebarStickyState[side].topClass !== nextTopClass) {
			sticky.classList.remove(sidebarStickyState[side].topClass);
			sticky.classList.add(nextTopClass);
			sidebarStickyState[side].topClass = nextTopClass;
		}
	});
}

import { initIconLoader } from "@/utils/icon-loader";
// Initialize wallpaper mode
import {
	applyStoredSelectedWallpaper,
	initThemeListener,
	initWallpaperMode,
} from "@/utils/setting-utils";

if (document.readyState === "loading") {
	document.addEventListener("DOMContentLoaded", () => {
		updateMainGridCols();
		updateSidebarComponentsVisibility();
		initWallpaperMode();
		initThemeListener();
		initIconLoader();
	});
} else {
	updateMainGridCols();
	updateSidebarComponentsVisibility();
	initWallpaperMode();
	initThemeListener();
	initIconLoader();
}

// LQIP fade-in：图片加载完成后淡出占位渐变
function initImageLoadFadeIn() {
	const placeholders =
		document.querySelectorAll<HTMLElement>(".lqip-placeholder");
	placeholders.forEach((placeholder) => {
		const container = placeholder.parentElement;
		if (!container) return;
		const img = container.querySelector<HTMLImageElement>("img, picture img");
		if (!img) return;

		if (img.complete && img.naturalWidth > 0) {
			img.style.opacity = "1";
			placeholder.classList.add("loaded");
		} else {
			img.addEventListener(
				"load",
				() => {
					img.style.opacity = "1";
					placeholder.classList.add("loaded");
				},
				{ once: true },
			);
			img.addEventListener(
				"error",
				() => {
					placeholder.classList.add("loaded");
				},
				{ once: true },
			);
		}
	});
}

initImageLoadFadeIn();
applyStoredSelectedWallpaper();
document.addEventListener("astro:page-load", () => {
	initImageLoadFadeIn();
	applyStoredSelectedWallpaper();
});
document.addEventListener("swup:contentReplaced", () => {
	requestAnimationFrame(() => {
		initImageLoadFadeIn();
		applyStoredSelectedWallpaper();
	});
});
