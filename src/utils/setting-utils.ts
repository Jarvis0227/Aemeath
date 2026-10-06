import {
	BANNER_HEIGHT_EXTEND,
	DARK_MODE,
	DEFAULT_THEME,
	LIGHT_MODE,
	SYSTEM_MODE,
	WALLPAPER_BANNER,
	WALLPAPER_FULLSCREEN,
	WALLPAPER_NONE,
	WALLPAPER_OVERLAY,
} from "@constants/constants";
import type { LIGHT_DARK_MODE, WALLPAPER_MODE } from "@/types/config";
import {
	backgroundWallpaper,
	expressiveCodeConfig,
	sakuraConfig,
	siteConfig,
} from "../config";
import {
	alternateHomepageWallpaper,
	homepageWallpaper,
	mobileHomepageWallpaper,
} from "../config/backgroundWallpaper";
import { nationalDayTheme } from "../config/nationalDayTheme";
import {
	getBackgroundImages,
	isHomePage as checkIsHomePage,
} from "./layout-utils";

// Declare global functions
declare global {
	interface Window {
		initSemifullScrollDetection?: () => void;
		semifullScrollHandler?: () => void;
	}
}

const SELECTED_WALLPAPER_INDEX_KEY = "selectedWallpaperIndex";
const SELECTED_WALLPAPER_INDEX_SCHEMA_KEY = "selectedWallpaperIndexSchemaVersion";
const SELECTED_WALLPAPER_SCHEMA_VERSION = "3";
const SELECTED_WALLPAPER_SOURCE_KEY = "selectedWallpaperSourceByTheme";
const LEGACY_CUSTOM_WALLPAPER_KEY = "customWallpaper";
const CARD_DECORATION_MODE_KEY = "cardDecorationMode";
// The previous key stored "auto" even when it was the default. Use a new key
// so existing visitors receive the new expanded default once.
const NAVBAR_BEHAVIOR_KEY = "navbarBehaviorV2";
const NATIONAL_DAY_THEME_KEY = "nationalDayThemeEnabled";
const BANNER_CAROUSEL_KEY = "bannerCarouselEnabled";
const BANNER_CAROUSEL_MODE_KEY = "bannerCarouselEnabledByTheme";

function isNationalDayWallpaperSource(source: string): boolean {
	return (
		source === homepageWallpaper ||
		source === alternateHomepageWallpaper ||
		source === mobileHomepageWallpaper
	);
}

function isNationalDayWallpaperIndex(index: number): boolean {
	return isNationalDayWallpaperSource(getBackgroundImages().desktop[index] ?? "");
}

function getSelectedWallpaperSourceKey(isNationalDayEnabled: boolean): string {
	return `${SELECTED_WALLPAPER_SOURCE_KEY}.${isNationalDayEnabled ? "national-day" : "normal"}`;
}

function getWallpaperThemeOrdinal(index: number): number {
	const desktopImages = getBackgroundImages().desktop;
	const source = desktopImages[index];
	if (!source) return -1;
	const isNationalDay = isNationalDayWallpaperSource(source);
	return (
		desktopImages
			.slice(0, index + 1)
			.filter((image) => isNationalDayWallpaperSource(image) === isNationalDay)
			.length - 1
	);
}

function isWallpaperIndexAllowedForCurrentTheme(index: number): boolean {
	const source = getBackgroundImages().desktop[index];
	return Boolean(source) &&
		(isNationalDayWallpaperIndex(index) === getNationalDayThemeEnabled());
}

function getWallpaperMobileIndex(index: number): number {
	const desktopSource = getBackgroundImages().desktop[index];
	if (!desktopSource) return index;
	const isNationalDay = isNationalDayWallpaperSource(desktopSource);
	const mobileIndices = getBackgroundImages().mobile.flatMap((source, mobileIndex) =>
		isNationalDayWallpaperSource(source) === isNationalDay
			? [mobileIndex]
			: [],
	);
	const ordinal = getWallpaperThemeOrdinal(index);
	return mobileIndices[Math.min(ordinal, mobileIndices.length - 1)] ?? index;
}

function getWallpaperDisplayIndex(index: number): number {
	return typeof window !== "undefined" && window.innerWidth < 1024
		? getWallpaperMobileIndex(index)
		: index;
}

function getBannerCarouselModeKey(isNationalDayEnabled: boolean): string {
	return `${BANNER_CAROUSEL_MODE_KEY}.${isNationalDayEnabled ? "national-day" : "normal"}`;
}

export type CardDecorationMode = "soft" | "flat";
export type NavbarBehavior = "auto" | "static";

export function getStoredNavbarBehavior(): NavbarBehavior {
	if (typeof window === "undefined") return "static";
	try {
		return window.localStorage.getItem(NAVBAR_BEHAVIOR_KEY) === "auto"
			? "auto"
			: "static";
	} catch {
		return "static";
	}
}

export function setNavbarBehavior(behavior: NavbarBehavior): void {
	const safeBehavior: NavbarBehavior =
		behavior === "static" ? "static" : "auto";
	if (typeof document !== "undefined") {
		document.documentElement.setAttribute("data-navbar-behavior", safeBehavior);
	}
	if (typeof window === "undefined") return;
	try {
		window.localStorage.setItem(NAVBAR_BEHAVIOR_KEY, safeBehavior);
	} catch {
		// Keep the selected behavior active for the current page.
	}
	window.dispatchEvent(
		new CustomEvent("navbarBehaviorChange", {
			detail: { behavior: safeBehavior },
		}),
	);
}

export function getStoredCardDecorationMode(): CardDecorationMode {
	if (typeof window === "undefined") return "flat";
	try {
		return window.localStorage.getItem(CARD_DECORATION_MODE_KEY) === "soft"
			? "soft"
			: "flat";
	} catch {
		return "flat";
	}
}

export function setCardDecorationMode(mode: CardDecorationMode): void {
	const safeMode: CardDecorationMode = mode === "flat" ? "flat" : "soft";
	if (typeof document !== "undefined") {
		document.documentElement.setAttribute("data-card-decoration", safeMode);
	}
	try {
		if (typeof window !== "undefined") {
			window.localStorage.setItem(CARD_DECORATION_MODE_KEY, safeMode);
		}
	} catch {
		// The appearance change still applies for this page when storage is unavailable.
	}
}

function migrateSelectedWallpaperIndex(): void {
	if (
		typeof localStorage === "undefined" ||
		typeof localStorage.getItem !== "function" ||
		typeof localStorage.setItem !== "function" ||
		typeof localStorage.removeItem !== "function"
	) {
		return;
	}
	try {
		const schemaVersion = localStorage.getItem(
			SELECTED_WALLPAPER_INDEX_SCHEMA_KEY,
		);
		if (schemaVersion === SELECTED_WALLPAPER_SCHEMA_VERSION) {
			return;
		}
		const storedIndex = localStorage.getItem(SELECTED_WALLPAPER_INDEX_KEY);
		const parsedIndex = storedIndex === null ? null : Number.parseInt(storedIndex, 10);
		if (parsedIndex !== null && Number.isInteger(parsedIndex) && parsedIndex >= 0) {
			const desktopImages = getBackgroundImages().desktop;
			const firstNormalIndex = desktopImages.findIndex(
				(source) => !isNationalDayWallpaperSource(source),
			);
			const insertedCount = Math.max(firstNormalIndex, 0);
			// Schema 2 shifted old indices above zero by one, but left old zero unchanged.
			const nextIndex =
				schemaVersion === "2"
					? parsedIndex === 1
						? 1
						: parsedIndex === 0
							? insertedCount
							: parsedIndex + insertedCount - 1
					: parsedIndex + insertedCount;
			const source = desktopImages[nextIndex];
			if (source) {
				const key = getSelectedWallpaperSourceKey(
					isNationalDayWallpaperSource(source),
				);
				if (localStorage.getItem(key) === null) {
					localStorage.setItem(key, source);
				}
			}
		}
		localStorage.removeItem(SELECTED_WALLPAPER_INDEX_KEY);
		localStorage.setItem(
			SELECTED_WALLPAPER_INDEX_SCHEMA_KEY,
			SELECTED_WALLPAPER_SCHEMA_VERSION,
		);
	} catch {
		// Keep the existing selection when browser storage is unavailable.
	}
}

export function getDefaultHue(): number {
	const fallback = "250";
	// 检查是否在浏览器环境中
	if (typeof document === "undefined") {
		return Number.parseInt(fallback, 10);
	}
	const configCarrier = document.getElementById("config-carrier");
	return Number.parseInt(configCarrier?.dataset.hue || fallback, 10);
}

export function getDefaultTheme(): LIGHT_DARK_MODE {
	// 如果配置文件中设置了 defaultMode，使用配置的值
	// 否则使用 DEFAULT_THEME（向后兼容）
	return siteConfig.themeColor.defaultMode ?? DEFAULT_THEME;
}

// 获取系统主题
export function getSystemTheme(): LIGHT_DARK_MODE {
	if (typeof window === "undefined") {
		return LIGHT_MODE;
	}
	return window.matchMedia("(prefers-color-scheme: dark)").matches
		? DARK_MODE
		: LIGHT_MODE;
}

// 解析主题（如果是system模式，则获取系统主题）
export function resolveTheme(theme: LIGHT_DARK_MODE): LIGHT_DARK_MODE {
	if (theme === SYSTEM_MODE) {
		return getSystemTheme();
	}
	return theme;
}

export function getHue(): number {
	// 先检查全局对象
	if (typeof window === "undefined" || !window.localStorage) {
		return getDefaultHue();
	}
	const stored = localStorage.getItem("hue");
	return stored ? Number.parseInt(stored, 10) : getDefaultHue();
}

export function getNationalDayThemeEnabled(): boolean {
	if (typeof window === "undefined") {
		return nationalDayTheme.defaultEnabled;
	}
	try {
		const stored = window.localStorage.getItem(NATIONAL_DAY_THEME_KEY);
		return stored === null ? nationalDayTheme.defaultEnabled : stored === "true";
	} catch {
		return document.documentElement.dataset.nationalDayTheme !== "false";
	}
}

export function setNationalDayThemeEnabled(enabled: boolean): void {
	if (typeof document !== "undefined") {
		document.documentElement.dataset.nationalDayTheme = String(enabled);
		if (enabled) {
			document
				.querySelectorAll<HTMLImageElement>("img[data-national-day-src]")
				.forEach((image) => {
					const src = image.dataset.nationalDaySrc;
					if (src && image.getAttribute("src") !== src) {
						image.setAttribute("src", src);
					}
				});
		}
	}
	if (typeof window === "undefined") return;
	try {
		window.localStorage.setItem(NATIONAL_DAY_THEME_KEY, String(enabled));
	} catch {
		// Keep the selected theme active for this page when storage is unavailable.
	}
	window.dispatchEvent(
		new CustomEvent("nationalDayThemeChange", { detail: { enabled } }),
	);
}

export function setHue(hue: number): void {
	// 先检查是否在浏览器环境
	if (
		typeof window === "undefined" ||
		!window.localStorage ||
		typeof document === "undefined"
	) {
		return;
	}
	localStorage.setItem("hue", String(hue));
	const r = document.querySelector(":root") as HTMLElement;
	if (!r) {
		return;
	}
	r.style.setProperty("--hue", String(hue));
}

export function applyThemeToDocument(theme: LIGHT_DARK_MODE): void {
	// 检查是否在浏览器环境中
	if (typeof document === "undefined") {
		return;
	}

	// 解析主题
	const resolvedTheme = resolveTheme(theme);

	// 获取当前主题状态的完整信息
	const currentIsDark = document.documentElement.classList.contains("dark");
	const currentTheme = document.documentElement.getAttribute("data-theme");

	// 计算目标主题状态
	let targetIsDark = false; // 初始化默认值
	switch (resolvedTheme) {
		case LIGHT_MODE:
			targetIsDark = false;
			break;
		case DARK_MODE:
			targetIsDark = true;
			break;
		default:
			// 处理默认情况，使用当前主题状态
			targetIsDark = currentIsDark;
			break;
	}

	// 检测是否真的需要主题切换：
	// 1. dark类状态是否改变
	// 2. expressiveCode主题是否需要更新
	const needsThemeChange = currentIsDark !== targetIsDark;
	const expectedTheme = targetIsDark
		? expressiveCodeConfig.darkTheme
		: expressiveCodeConfig.lightTheme;
	const needsCodeThemeUpdate = currentTheme !== expectedTheme;

	// 如果既不需要主题切换也不需要代码主题更新，直接返回
	if (!needsThemeChange && !needsCodeThemeUpdate) {
		return;
	}

	const root = document.documentElement;
	const commitTheme = () => {
		if (needsThemeChange) root.classList.toggle("dark", targetIsDark);
		if (needsCodeThemeUpdate) root.setAttribute("data-theme", expectedTheme);
		window.dispatchEvent(new CustomEvent("theme-change"));
	};

	if (!needsThemeChange) {
		commitTheme();
		return;
	}

	type ThemeTransitionDocument = Document & {
		startViewTransition?: (callback: () => void) => { finished: Promise<void> };
	};
	const transitionDocument = document as ThemeTransitionDocument;
	const reducedMotion = window.matchMedia?.(
		"(prefers-reduced-motion: reduce)",
	).matches;

	if (!reducedMotion && transitionDocument.startViewTransition) {
		root.classList.add("is-theme-transitioning", "use-view-transition");
		const transition = transitionDocument.startViewTransition(commitTheme);
		void transition.finished.finally(() => {
			root.classList.remove("is-theme-transitioning", "use-view-transition");
		});
		return;
	}

	root.classList.add("is-theme-transitioning");
	window.requestAnimationFrame(() => {
		commitTheme();
		window.setTimeout(
			() => root.classList.remove("is-theme-transitioning"),
			360,
		);
	});
}

// 系统主题监听器引用
let systemThemeListener:
	| ((e: MediaQueryListEvent | MediaQueryList) => void)
	| null = null;

export function setTheme(theme: LIGHT_DARK_MODE): void {
	// 检查是否在浏览器环境中
	if (
		typeof localStorage === "undefined" ||
		typeof localStorage.setItem !== "function"
	) {
		return;
	}

	// 先应用主题
	applyThemeToDocument(theme);

	// 保存到localStorage
	localStorage.setItem("theme", theme);

	// 如果切换到 system 模式，需要监听系统主题变化
	if (theme === SYSTEM_MODE) {
		setupSystemThemeListener();
	} else {
		// 如果切换其他模式，移除系统主题监听
		cleanupSystemThemeListener();
	}
}

// 设置系统主题监听器
export function setupSystemThemeListener(): void {
	// 先清理之前的监听器
	cleanupSystemThemeListener();

	if (typeof window === "undefined") {
		return;
	}

	const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

	// 处理系统主题变化的回调
	const handleSystemThemeChange = (e: MediaQueryListEvent | MediaQueryList) => {
		const isDark = e.matches;
		const currentIsDark = document.documentElement.classList.contains("dark");

		// 如果主题状态没有变化，直接返回
		if (currentIsDark === isDark) {
			return;
		}

		applyThemeToDocument(SYSTEM_MODE);
	};

	// 立即调用一次以设置初始状态
	handleSystemThemeChange(mediaQuery);

	// 监听系统主题变化（现代浏览器）
	if (mediaQuery.addEventListener) {
		mediaQuery.addEventListener("change", handleSystemThemeChange);
	} else {
		// 兼容旧浏览器
		mediaQuery.addListener(handleSystemThemeChange);
	}

	systemThemeListener = handleSystemThemeChange;
}

// 清理系统主题监听器
function cleanupSystemThemeListener() {
	if (typeof window === "undefined" || !systemThemeListener) {
		return;
	}

	const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

	if (mediaQuery.removeEventListener) {
		mediaQuery.removeEventListener("change", systemThemeListener);
	} else {
		// 兼容旧浏览器
		mediaQuery.removeListener(systemThemeListener);
	}

	systemThemeListener = null;
}

export function getStoredTheme(): LIGHT_DARK_MODE {
	// 检查是否在浏览器环境中
	if (
		typeof localStorage === "undefined" ||
		typeof localStorage.getItem !== "function"
	) {
		return getDefaultTheme();
	}
	return (
		(localStorage.getItem("theme") as LIGHT_DARK_MODE) || getDefaultTheme()
	);
}

// 初始化主题监听器（用于页面加载后）
export function initThemeListener(): void {
	if (
		typeof localStorage === "undefined" ||
		typeof localStorage.getItem !== "function"
	) {
		return;
	}

	const theme = getStoredTheme();

	// 如果主题是 system 模式，需要监听系统主题变化
	if (theme === SYSTEM_MODE) {
		setupSystemThemeListener();
	}
}

// Wallpaper mode functions
export function applyWallpaperModeToDocument(
	mode: WALLPAPER_MODE,
	animate = true,
): void {
	// 获取当前的壁纸模式
	const currentMode =
		(document.documentElement.getAttribute(
			"data-wallpaper-mode",
		) as WALLPAPER_MODE) || backgroundWallpaper.mode;

	// 检查是否允许切换壁纸模式
	const isSwitchable = backgroundWallpaper.switchable ?? true;
	if (!isSwitchable) {
		// 不允许切换时，仍需初始化当前模式的UI状态（添加 wallpaper-initialized 等）
		if (currentMode === mode) {
			adjustMainContentPosition(mode, false);
			ensureWallpaperState(mode);
		}
		return;
	}

	// 如果模式没有变化，直接返回
	if (currentMode === mode) {
		// 即使是相同模式，也要确保UI状态正确
		ensureWallpaperState(mode);
		return;
	}

	// 添加过渡保护类
	document.documentElement.classList.add("is-wallpaper-transitioning");

	// 更新数据属性
	document.documentElement.setAttribute("data-wallpaper-mode", mode);

	// 使用 requestAnimationFrame 确保在下一帧执行，避免闪屏
	requestAnimationFrame(() => {
		const body = document.body;

		// 移除所有壁纸相关的CSS类
		body.classList.remove(
			"enable-banner",
			"wallpaper-transparent",
			"no-banner-layout",
		);

		// 根据模式添加相应的CSS类
		switch (mode) {
			case WALLPAPER_BANNER:
				body.classList.add("enable-banner");
				showBannerMode(true);
				break;
			case WALLPAPER_FULLSCREEN:
				body.classList.add("no-banner-layout");
				showFullscreenMode(animate);
				break;
			case WALLPAPER_OVERLAY:
				body.classList.add("wallpaper-transparent");
				body.classList.add("no-banner-layout");
				showOverlayMode();
				break;
			case WALLPAPER_NONE:
				body.classList.add("no-banner-layout");
				hideAllWallpapers();
				break;
			default:
				body.classList.add("no-banner-layout");
				hideAllWallpapers();
				break;
		}

		// 更新导航栏透明模式
		updateNavbarTransparency(mode);

		// 在下一帧移除过渡保护类
		requestAnimationFrame(() => {
			document.documentElement.classList.remove("is-wallpaper-transitioning");
		});
	});
}

// 确保壁纸状态正确
function ensureWallpaperState(mode: WALLPAPER_MODE) {
	const body = document.body;

	// 移除所有壁纸相关的CSS类
	body.classList.remove(
		"enable-banner",
		"wallpaper-transparent",
		"no-banner-layout",
	);

	// 根据模式添加相应的CSS类
	switch (mode) {
		case WALLPAPER_BANNER:
			body.classList.add("enable-banner");
			showBannerMode();
			break;
		case WALLPAPER_FULLSCREEN:
			body.classList.add("no-banner-layout");
			showFullscreenMode();
			break;
		case WALLPAPER_OVERLAY:
			body.classList.add("wallpaper-transparent");
			body.classList.add("no-banner-layout");
			showOverlayMode();
			break;
		case WALLPAPER_NONE:
			body.classList.add("no-banner-layout");
			hideAllWallpapers();
			break;
	}

	// 更新导航栏透明模式
	updateNavbarTransparency(mode);
}

function showBannerMode(animate = false) {
	// 显示 wallpaper-wrapper 并切换为 banner 模式
	const wallpaperWrapper = document.getElementById("wallpaper-wrapper");
	if (wallpaperWrapper) {
		// 移除 overlay 和全屏壁纸模式类
		wallpaperWrapper.classList.remove("wallpaper-overlay");
		wallpaperWrapper.classList.remove("wallpaper-fullscreen");

		// 恢复 banner 模式的 top 定位
		wallpaperWrapper.style.top = `-${BANNER_HEIGHT_EXTEND}vh`;

		// 检查当前是否为首页
		const isHomePage = checkIsHomePage(window.location.pathname);

		// 非首页使用导航栏下方的紧凑布局，不保留横幅占位。
		if (!isHomePage) {
			wallpaperWrapper.style.setProperty("display", "none", "important");
			wallpaperWrapper.classList.add("mobile-hide-banner");
		} else {
			// 首页先设置 display，再在下一帧恢复壁纸可见状态。
			wallpaperWrapper.style.display = "block";
			wallpaperWrapper.style.setProperty("display", "block", "important");
			requestAnimationFrame(() => {
				wallpaperWrapper.classList.remove("hidden");
				wallpaperWrapper.classList.remove("opacity-0");
				wallpaperWrapper.classList.add("opacity-100");
				wallpaperWrapper.classList.remove("mobile-hide-banner");
			});
		}
	}

	// 显示横幅首页文本（如果启用且是首页）
	const bannerTextOverlay = document.querySelector(
		".banner-home-text-overlay",
	) as HTMLElement | null;
	if (bannerTextOverlay) {
		// 检查是否启用 homeText
		const homeTextEnabled = backgroundWallpaper.common?.homeText?.enable;

		// 检查当前是否为首页
		const isHomePage = checkIsHomePage(window.location.pathname);

		// 只有在启用且在首页时才显示
		if (homeTextEnabled && isHomePage) {
			bannerTextOverlay.classList.remove("hidden");
		} else {
			bannerTextOverlay.classList.add("hidden");
		}
		// 重置全屏模式的下移transform
		bannerTextOverlay.style.transition = "";
		bannerTextOverlay.style.transform = "";
	}

	// 调整主内容位置
	adjustMainContentPosition("banner", animate);

	// 处理移动端非首页主内容区域位置
	const mainContentWrapper = document.querySelector(
		".w-full.z-30.pointer-events-none",
	);
	if (mainContentWrapper) {
		const isHomePage = checkIsHomePage(window.location.pathname);
		const isMobile = window.innerWidth < 1024;
		// 只在移动端非首页时调整主内容位置
		if (isMobile && !isHomePage) {
			mainContentWrapper.classList.add("mobile-main-no-banner");
		} else {
			mainContentWrapper.classList.remove("mobile-main-no-banner");
		}
	}

	// 移除透明效果（横幅模式不使用半透明）
	adjustMainContentTransparency(false);

	// 调整导航栏透明度
	const navbar = document.getElementById("navbar");
	if (navbar) {
		// 获取导航栏透明模式配置（banner模式）
		const transparentMode =
			backgroundWallpaper.common?.navbar?.transparentMode || "semi";
		navbar.setAttribute("data-transparent-mode", transparentMode);

		// 重新初始化半透明模式滚动检测（如果需要）
		if (
			transparentMode === "semifull" &&
			typeof window.initSemifullScrollDetection === "function"
		) {
			window.initSemifullScrollDetection();
		}
	}
}

function showFullscreenMode(animate = false) {
	// 显示 wallpaper-wrapper 并切换为全屏壁纸模式
	const wallpaperWrapper = document.getElementById("wallpaper-wrapper");
	const isHomePage = checkIsHomePage(window.location.pathname);
	if (wallpaperWrapper) {
		// 移除 overlay 模式类
		wallpaperWrapper.classList.remove("wallpaper-overlay");
		// 添加全屏壁纸模式类
		wallpaperWrapper.classList.add("wallpaper-fullscreen");

		if (!isHomePage) {
			// 非首页统一隐藏壁纸，避免桌面端保留全屏占位。
			wallpaperWrapper.style.setProperty("display", "none", "important");
			wallpaperWrapper.classList.add("mobile-hide-banner");
		} else {
			// 显示壁纸
			wallpaperWrapper.style.display = "block";
			wallpaperWrapper.style.setProperty("display", "block", "important");
			wallpaperWrapper.style.top = "";
			requestAnimationFrame(() => {
				wallpaperWrapper.classList.remove("hidden");
				wallpaperWrapper.classList.remove("opacity-0");
				wallpaperWrapper.classList.add("opacity-100");
				wallpaperWrapper.classList.remove("mobile-hide-banner");
			});
		}
	}

	// 全屏模式使用自定义主页卡片，不显示旧的横幅首页文本
	const bannerTextOverlay = document.querySelector(
		".banner-home-text-overlay",
	) as HTMLElement | null;
	if (bannerTextOverlay) {
		bannerTextOverlay.classList.add("hidden");
		bannerTextOverlay.style.transition = "";
		bannerTextOverlay.style.transform = "";
	}

	// 调整主内容位置
	adjustMainContentPosition("fullscreen", animate);

	// 移除透明效果（全屏壁纸模式不使用半透明）
	adjustMainContentTransparency(false);

	// 调整导航栏透明度
	const navbar = document.getElementById("navbar");
	if (navbar) {
		const transparentMode =
			backgroundWallpaper.common?.navbar?.transparentMode || "semi";
		navbar.setAttribute("data-transparent-mode", transparentMode);

		if (
			transparentMode === "semifull" &&
			typeof window.initSemifullScrollDetection === "function"
		) {
			window.initSemifullScrollDetection();
		}
	}
}

function showOverlayMode() {
	// 切换 wallpaper-wrapper 为 overlay 模式
	const wallpaperWrapper = document.getElementById("wallpaper-wrapper");
	if (wallpaperWrapper) {
		// 添加 overlay 模式类，移除全屏壁纸模式类
		wallpaperWrapper.classList.remove("wallpaper-fullscreen");
		wallpaperWrapper.classList.add("wallpaper-overlay");
		const isHomePage = checkIsHomePage(window.location.pathname);
		wallpaperWrapper.style.setProperty(
			"display",
			isHomePage ? "block" : "none",
			"important",
		);
		wallpaperWrapper.style.top = "";
		if (isHomePage) {
			requestAnimationFrame(() => {
				wallpaperWrapper.classList.remove("hidden");
				wallpaperWrapper.classList.remove("opacity-0");
				wallpaperWrapper.classList.add("opacity-100");
				wallpaperWrapper.classList.remove("mobile-hide-banner");
			});
		}
	}

	// 隐藏横幅首页文本
	const bannerTextOverlay = document.querySelector(".banner-home-text-overlay");
	if (bannerTextOverlay) {
		bannerTextOverlay.classList.add("hidden");
	}

	// 调整主内容透明度
	adjustMainContentTransparency(true);

	// 调整布局为紧凑模式
	adjustMainContentPosition("overlay");
}

function hideAllWallpapers() {
	// 隐藏壁纸
	const wallpaperWrapper = document.getElementById("wallpaper-wrapper");

	if (wallpaperWrapper) {
		wallpaperWrapper.style.display = "none";
		wallpaperWrapper.classList.add("hidden");
		wallpaperWrapper.classList.add("opacity-0");
		wallpaperWrapper.classList.remove("wallpaper-overlay");
		wallpaperWrapper.classList.remove("wallpaper-fullscreen");
	}

	// 隐藏横幅首页文本
	const bannerTextOverlay = document.querySelector(".banner-home-text-overlay");
	if (bannerTextOverlay) {
		bannerTextOverlay.classList.add("hidden");
	}

	// 调整主内容位置和透明度
	adjustMainContentPosition("none");
	adjustMainContentTransparency(false);
}

function updateNavbarTransparency(mode: WALLPAPER_MODE) {
	const navbar = document.getElementById("navbar");
	if (!navbar) return;

	let transparentMode: string;
	let enableBlur: boolean;
	let blurAmount: number;

	// 根据当前壁纸模式设置导航栏透明模式和模糊效果
	if (mode === WALLPAPER_OVERLAY) {
		// 全屏透明模式
		transparentMode = "none";
		enableBlur = false;
		blurAmount = 0;
	} else if (mode === WALLPAPER_NONE) {
		// 纯色背景模式
		transparentMode = "none";
		enableBlur = false;
		blurAmount = 0;
	} else if (mode === WALLPAPER_FULLSCREEN) {
		// 全屏壁纸模式：使用 fullscreen 配置的透明模式和模糊效果
		transparentMode =
			backgroundWallpaper.common?.navbar?.transparentMode || "semi";
		enableBlur = backgroundWallpaper.common?.navbar?.enableBlur ?? true;
		blurAmount = backgroundWallpaper.common?.navbar?.blur ?? 20;
	} else {
		// Banner模式：使用配置的透明模式和模糊效果
		transparentMode =
			backgroundWallpaper.common?.navbar?.transparentMode || "semi";
		enableBlur = backgroundWallpaper.common?.navbar?.enableBlur ?? true;
		blurAmount = backgroundWallpaper.common?.navbar?.blur ?? 20;
	}

	// 更新导航栏的透明模式属性
	navbar.setAttribute("data-transparent-mode", transparentMode);
	navbar.setAttribute("data-enable-blur", String(enableBlur));
	navbar.style.setProperty("--navbar-glass-blur", `${blurAmount}px`);

	// 移除现有的透明模式类
	navbar.classList.remove(
		"navbar-transparent-semi",
		"navbar-transparent-full",
		"navbar-transparent-semifull",
	);

	// 移除scrolled类
	navbar.classList.remove("scrolled");

	// 滚动检测功能
	if (
		transparentMode === "semifull" &&
		(mode === WALLPAPER_BANNER || mode === WALLPAPER_FULLSCREEN) &&
		typeof window.initSemifullScrollDetection === "function"
	) {
		// 在Banner和全屏壁纸模式的semifull下启用滚动检测
		window.initSemifullScrollDetection();
	} else if (window.semifullScrollHandler) {
		// 移除滚动监听器
		window.removeEventListener("scroll", window.semifullScrollHandler);
		delete window.semifullScrollHandler;
	}
}

// 跟踪全屏模式动画的 setTimeout，快速切换时需要取消
let fullscreenAnimationTimeout: ReturnType<typeof setTimeout> | null = null;

function adjustMainContentPosition(
	mode: WALLPAPER_MODE | "banner" | "none" | "overlay" | "fullscreen",
	animate = false,
) {
	const mainContent = document.querySelector(
		".w-full.z-30.pointer-events-none",
	) as HTMLElement;
	if (!mainContent) return;

	// 取消上一次全屏模式动画的 setTimeout，防止快速切换时竞态覆盖
	if (fullscreenAnimationTimeout) {
		clearTimeout(fullscreenAnimationTimeout);
		fullscreenAnimationTimeout = null;
	}

	if (!checkIsHomePage(window.location.pathname)) {
		mainContent.classList.add("non-home-main-layout", "no-banner-layout");
		mainContent.classList.toggle(
			"mobile-main-no-banner",
			window.innerWidth < 1024,
		);
		mainContent.style.setProperty("top", "5.5rem", "important");
		mainContent.style.setProperty("margin-top", "0", "important");
		mainContent.style.position = "";
		mainContent.style.zIndex = "";
		mainContent.style.minHeight = "";
		mainContent.style.transition = "";
		mainContent.style.visibility = "visible";
		document.body.classList.add("wallpaper-initialized");
		return;
	}
	mainContent.classList.remove("non-home-main-layout");

	// 移除现有的位置类
	mainContent.classList.remove("mobile-main-no-banner", "no-banner-layout");

	switch (mode) {
		case "banner": {
			// Banner模式：主内容在banner下方
			const isHome = checkIsHomePage(window.location.pathname);
			const bannerTargetTop = "calc(var(--banner-height) - 3.5rem)";

			// 禁用 CSS transition，防止整个定位过程中的值变化触发过渡动画
			mainContent.style.setProperty("transition", "none", "important");
			// 清除 fullscreen 模式特有的 inline 样式（position: relative, top: 0 等）
			mainContent.style.position = "";
			mainContent.style.zIndex = "";
			mainContent.style.top = "";
			mainContent.style.setProperty("margin-top", "");

			if (!isHome) {
				mainContent.classList.add("mobile-main-no-banner");
				if (window.innerWidth < 1024) {
					mainContent.style.setProperty("top", "5.5rem", "important");
				} else {
					mainContent.style.setProperty("top", bannerTargetTop, "important");
				}
			} else {
				mainContent.style.setProperty("top", bannerTargetTop, "important");
			}
			const bannerGrid = document.getElementById("main-grid");
			if (bannerGrid) {
				bannerGrid.style.transform = "";
				bannerGrid.style.transition = "";
			}
			// 所有定位操作完成后，强制回流并恢复 CSS transition
			void mainContent.offsetWidth;
			mainContent.style.removeProperty("transition");
			break;
		}
		case "fullscreen": {
			// 全屏壁纸模式：壁纸已在文档流中占100vh，主内容紧跟其后
			const isFullscreenMobile = window.innerWidth < 1024;
			const isFullscreenHome = checkIsHomePage(window.location.pathname);
			if (isFullscreenMobile && !isFullscreenHome) {
				// 移动端非首页：壁纸已隐藏，主内容从导航栏下方开始
				mainContent.classList.add("mobile-main-no-banner");
				mainContent.classList.add("no-banner-layout");
				mainContent.style.setProperty("top", "5.5rem", "important");
				mainContent.style.setProperty("margin-top", "0", "important");
				mainContent.style.position = "";
				mainContent.style.minHeight = "";
				mainContent.style.transition = "";
				break;
			}

			if (animate) {
				// 运行时切换：从当前位置动画滑到壁纸下方，完成后切换为 relative
				const computedTop = mainContent.getBoundingClientRect().top;
				mainContent.style.transition = "none";
				mainContent.style.position = "absolute";
				mainContent.style.zIndex = "30";
				mainContent.style.setProperty("top", `${computedTop}px`, "important");
				// absolute 定位下 margin-top 不影响布局，提前设好最终值避免切换 relative 时跳变
				mainContent.style.setProperty("margin-top", "1rem", "important");
				mainContent.classList.add("no-banner-layout");
				void mainContent.offsetWidth;
				mainContent.style.setProperty(
					"transition",
					"top 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)",
					"important",
				);
				mainContent.style.setProperty("top", "100vh", "important");
				fullscreenAnimationTimeout = setTimeout(() => {
					mainContent.style.transition = "none";
					mainContent.style.position = "relative";
					mainContent.style.setProperty("top", "0", "important");
					void mainContent.offsetWidth;
					mainContent.style.transition = "";
				}, 450);
			} else {
				// 初始化：直接设置位置，无需动画
				mainContent.classList.add("no-banner-layout");
				mainContent.style.position = "relative";
				mainContent.style.zIndex = "30";
				mainContent.style.setProperty("top", "0", "important");
				mainContent.style.setProperty("margin-top", "1rem", "important");
				mainContent.style.transition = "";
			}
			break;
		}
		case "overlay":
			// Overlay模式：使用紧凑布局，主内容从导航栏下方开始
			mainContent.classList.add("no-banner-layout");
			mainContent.style.setProperty("top", "5.5rem", "important");
			mainContent.style.setProperty("margin-top", "0", "important");
			mainContent.style.position = "";
			mainContent.style.minHeight = "";
			mainContent.style.transition = "";
			break;
		case "none":
			// 无壁纸模式：主内容从导航栏下方开始
			mainContent.classList.add("no-banner-layout");
			mainContent.style.setProperty("top", "5.5rem", "important");
			mainContent.style.setProperty("margin-top", "0", "important");
			mainContent.style.position = "";
			mainContent.style.minHeight = "";
			mainContent.style.transition = "";
			break;
		default:
			mainContent.style.setProperty("top", "5.5rem", "important");
			mainContent.style.position = "";
			mainContent.style.minHeight = "";
			mainContent.style.transition = "";
			break;
	}

	// 定位完成后显示主内容，防止初始加载时壁纸初始化前的内容闪烁
	mainContent.style.visibility = "visible";
	document.body.classList.add("wallpaper-initialized");
}

function adjustMainContentTransparency(enable: boolean) {
	const mainContent = document.querySelector(
		".w-full.z-30.pointer-events-none",
	);
	const body = document.body;

	if (enable) {
		if (mainContent) {
			mainContent.classList.add("wallpaper-transparent");
		}
		if (body) {
			body.classList.add("wallpaper-transparent");
		}
	} else {
		if (mainContent) {
			mainContent.classList.remove("wallpaper-transparent");
		}
		if (body) {
			body.classList.remove("wallpaper-transparent");
		}
	}
}

export function setWallpaperMode(mode: WALLPAPER_MODE): void {
	// 检查是否在浏览器环境中
	if (
		typeof localStorage === "undefined" ||
		typeof localStorage.setItem !== "function"
	) {
		return;
	}
	localStorage.setItem("wallpaperMode", mode);
	applyWallpaperModeToDocument(mode);
	if (typeof window !== "undefined") {
		window.dispatchEvent(
			new CustomEvent("wallpaperModeChange", {
				detail: { mode },
			}),
		);
	}
}

export function initWallpaperMode(): void {
	// 初始化透明模式参数（透明度/模糊度/卡片透明度）
	applyStoredOverlaySettingsToDocument();
	const storedMode = getStoredWallpaperMode();
	applyWallpaperModeToDocument(storedMode, false);
	applyStoredSelectedWallpaper();
}

export function getStoredWallpaperMode(): WALLPAPER_MODE {
	// 检查是否在浏览器环境中
	if (
		typeof localStorage === "undefined" ||
		typeof localStorage.getItem !== "function"
	) {
		return backgroundWallpaper.mode;
	}

	const isSwitchable = backgroundWallpaper.switchable ?? true;
	if (!isSwitchable) {
		localStorage.removeItem("wallpaperMode");
		return backgroundWallpaper.mode;
	}

	return (
		(localStorage.getItem("wallpaperMode") as WALLPAPER_MODE) ||
		backgroundWallpaper.mode
	);
}

export function getStoredSelectedWallpaperIndex(): number | null {
	migrateSelectedWallpaperIndex();
	if (
		typeof localStorage === "undefined" ||
		typeof localStorage.getItem !== "function"
	) {
		return null;
	}
	const sourceKey = getSelectedWallpaperSourceKey(getNationalDayThemeEnabled());
	const storedSource = localStorage.getItem(sourceKey);
	if (storedSource === null) return null;
	const index = getBackgroundImages().desktop.indexOf(storedSource);
	if (index < 0 || !isWallpaperIndexAllowedForCurrentTheme(index)) {
		localStorage.removeItem(sourceKey);
		return null;
	}
	return index;
}

export function setSelectedWallpaperIndex(index: number): void {
	migrateSelectedWallpaperIndex();
	if (!isWallpaperIndexAllowedForCurrentTheme(index)) {
		return;
	}
	if (
		typeof localStorage === "undefined" ||
		typeof localStorage.setItem !== "function"
	) {
		return;
	}
	const source = getBackgroundImages().desktop[index];
	if (!source) return;
	localStorage.removeItem(LEGACY_CUSTOM_WALLPAPER_KEY);
	localStorage.setItem(
		getSelectedWallpaperSourceKey(getNationalDayThemeEnabled()),
		source,
	);
	localStorage.removeItem(SELECTED_WALLPAPER_INDEX_KEY);
	applySelectedWallpaperToDocument(index);
	if (typeof window !== "undefined") {
		window.dispatchEvent(
			new CustomEvent("selectedWallpaperChange", {
				detail: {
					selected: true,
					index,
					displayIndex: getWallpaperDisplayIndex(index),
				},
			}),
		);
	}
}

export function clearSelectedWallpaper(): void {
	migrateSelectedWallpaperIndex();
	if (
		typeof localStorage !== "undefined" &&
		typeof localStorage.removeItem === "function"
	) {
		localStorage.removeItem(
			getSelectedWallpaperSourceKey(getNationalDayThemeEnabled()),
		);
		localStorage.removeItem(SELECTED_WALLPAPER_INDEX_KEY);
		localStorage.removeItem(LEGACY_CUSTOM_WALLPAPER_KEY);
	}
	clearSelectedWallpaperFromDocument();
	if (typeof window !== "undefined") {
		window.dispatchEvent(
			new CustomEvent("selectedWallpaperChange", {
				detail: { selected: false },
			}),
		);
	}
}

export function applyStoredSelectedWallpaper(): void {
	const index = getStoredSelectedWallpaperIndex();
	if (
		typeof localStorage !== "undefined" &&
		typeof localStorage.removeItem === "function"
	) {
		localStorage.removeItem(LEGACY_CUSTOM_WALLPAPER_KEY);
		if (getStoredBannerCarouselEnabled()) {
			clearSelectedWallpaperFromDocument(true);
			if (typeof window !== "undefined") {
				window.dispatchEvent(
					new CustomEvent("selectedWallpaperChange", {
						detail: { selected: false },
					}),
				);
			}
			return;
		}
	}
	if (index !== null) {
		applySelectedWallpaperToDocument(index);
		if (typeof window !== "undefined") {
			window.dispatchEvent(
				new CustomEvent("selectedWallpaperChange", {
					detail: {
						selected: true,
						index,
						displayIndex: getWallpaperDisplayIndex(index),
					},
				}),
			);
		}
	} else {
		clearSelectedWallpaperFromDocument(true);
		if (typeof window !== "undefined") {
			window.dispatchEvent(
				new CustomEvent("selectedWallpaperChange", {
					detail: { selected: false },
				}),
			);
		}
	}
}

function loadWallpaperSlideImage(slide: HTMLElement | null): void {
	const image = slide?.querySelector<HTMLImageElement>("img");
	if (!image) return;
	const deferredSrc = image.getAttribute("data-src");
	if (deferredSrc && !image.getAttribute("src")) {
		image.setAttribute("src", deferredSrc);
		image.removeAttribute("data-src");
	}
	image.style.opacity = "1";
	image.parentElement
		?.querySelector<HTMLElement>(".lqip-placeholder")
		?.classList.add("loaded");
}

function syncWallpaperFallbackToSlide(
	wallpaperWrapper: HTMLElement,
	slide: HTMLElement | null,
): void {
	const image = slide?.querySelector<HTMLImageElement>("img");
	const source = image?.getAttribute("data-src") || image?.getAttribute("src");
	const device = slide?.dataset.wallpaperDevice;
	if (!source || !device) return;
	const theme = slide.dataset.originalWallpaper === "true" ? "national" : "normal";
	wallpaperWrapper.style.setProperty(
		`--wallpaper-fallback-${theme}-${device}`,
		`url("${source}")`,
	);
}

export function applySelectedWallpaperToDocument(index: number): void {
	if (
		typeof document === "undefined" ||
		!isWallpaperIndexAllowedForCurrentTheme(index)
	) {
		return;
	}

	const wallpaperWrapper = document.getElementById("wallpaper-wrapper");
	if (!wallpaperWrapper) {
		return;
	}

	const mobileIndex = getWallpaperMobileIndex(index);
	const ordinal = getWallpaperThemeOrdinal(index);
	wallpaperWrapper.setAttribute("data-selected-wallpaper", String(index));
	wallpaperWrapper.setAttribute("data-selected-wallpaper-ordinal", String(ordinal));
	wallpaperWrapper.removeAttribute("data-custom-wallpaper");

	const slides = Array.from(
		wallpaperWrapper.querySelectorAll<HTMLElement>(".slide-item"),
	);
	const desktopSlide = slides.find(
		(slide) =>
			slide.dataset.wallpaperDevice === "desktop" &&
			Number.parseInt(slide.dataset.index ?? "-1", 10) === index,
	);
	const mobileSlide = slides.find(
		(slide) =>
			slide.dataset.wallpaperDevice === "mobile" &&
			Number.parseInt(slide.dataset.index ?? "-1", 10) === mobileIndex,
	);
	slides.forEach((slide) => {
		slide.classList.toggle("active", slide === desktopSlide || slide === mobileSlide);
		slide.classList.remove("prev-waiting");
	});
	const activeSlide =
		typeof window !== "undefined" && window.innerWidth < 1024
			? mobileSlide
			: desktopSlide;
	loadWallpaperSlideImage(activeSlide ?? null);
	syncWallpaperFallbackToSlide(wallpaperWrapper, desktopSlide ?? null);
	syncWallpaperFallbackToSlide(wallpaperWrapper, mobileSlide ?? null);
	wallpaperWrapper.dataset.originalWallpaperActive = String(
		activeSlide?.dataset.originalWallpaper === "true",
	);
}

export function clearSelectedWallpaperFromDocument(
	preserveCurrentWallpaper = false,
): void {
	if (typeof document === "undefined") {
		return;
	}

	const wallpaperWrapper = document.getElementById("wallpaper-wrapper");
	if (!wallpaperWrapper) {
		return;
	}

	wallpaperWrapper.removeAttribute("data-selected-wallpaper");
	wallpaperWrapper.removeAttribute("data-selected-wallpaper-ordinal");
	const slides = Array.from(
		wallpaperWrapper.querySelectorAll<HTMLElement>(".slide-item"),
	);
	if (slides.length === 0) {
		wallpaperWrapper.dataset.originalWallpaperActive = "false";
		return;
	}
	const isNationalDay = getNationalDayThemeEnabled();
	const desktopSlides = slides.filter(
		(slide) =>
			slide.dataset.wallpaperDevice === "desktop" &&
			(slide.dataset.originalWallpaper === "true") === isNationalDay,
	);
	const mobileSlides = slides.filter(
		(slide) =>
			slide.dataset.wallpaperDevice === "mobile" &&
			(slide.dataset.originalWallpaper === "true") === isNationalDay,
	);
	const currentDesktopSlide = desktopSlides.find((slide) =>
		slide.classList.contains("active"),
	);
	const desktopOrdinal =
		preserveCurrentWallpaper && currentDesktopSlide
			? getWallpaperThemeOrdinal(
					Number.parseInt(currentDesktopSlide.dataset.index ?? "-1", 10),
				)
			: isNationalDay && desktopSlides.length > 1
				? Math.floor(Math.random() * desktopSlides.length)
				: 0;
	const desktopSlide =
		(preserveCurrentWallpaper ? currentDesktopSlide : null) ??
		desktopSlides[desktopOrdinal] ??
		desktopSlides[0] ??
		null;
	const mobileSlide =
		mobileSlides[Math.min(Math.max(desktopOrdinal, 0), mobileSlides.length - 1)] ??
		mobileSlides[0] ??
		null;
	slides.forEach((slide) => {
		slide.classList.toggle("active", slide === desktopSlide || slide === mobileSlide);
		slide.classList.remove("prev-waiting");
	});
	const activeSlide =
		typeof window !== "undefined" && window.innerWidth < 1024
			? mobileSlide
			: desktopSlide;
	loadWallpaperSlideImage(activeSlide ?? null);
	syncWallpaperFallbackToSlide(wallpaperWrapper, desktopSlide);
	syncWallpaperFallbackToSlide(wallpaperWrapper, mobileSlide);
	wallpaperWrapper.dataset.originalWallpaperActive = String(
		activeSlide?.dataset.originalWallpaper === "true",
	);
}

// Overlay settings functions
function clampNumber(value: number, min: number, max: number): number {
	return Math.min(max, Math.max(min, value));
}

export function getDefaultOverlayOpacity(): number {
	return backgroundWallpaper.overlay?.opacity ?? 0.8;
}

export function getDefaultOverlayBlur(): number {
	return backgroundWallpaper.overlay?.blur ?? 0;
}

export function getDefaultOverlayCardOpacity(): number {
	return backgroundWallpaper.overlay?.cardOpacity ?? 0.6;
}

export function getStoredOverlayOpacity(): number {
	if (
		typeof localStorage === "undefined" ||
		typeof localStorage.getItem !== "function"
	) {
		return getDefaultOverlayOpacity();
	}
	const stored = localStorage.getItem("overlayOpacity");
	if (stored === null) {
		return getDefaultOverlayOpacity();
	}
	const parsed = Number.parseFloat(stored);
	if (Number.isNaN(parsed)) {
		return getDefaultOverlayOpacity();
	}
	return clampNumber(parsed, 0, 1);
}

export function getStoredOverlayBlur(): number {
	if (
		typeof localStorage === "undefined" ||
		typeof localStorage.getItem !== "function"
	) {
		return getDefaultOverlayBlur();
	}
	const stored = localStorage.getItem("overlayBlur");
	if (stored === null) {
		return getDefaultOverlayBlur();
	}
	const parsed = Number.parseFloat(stored);
	if (Number.isNaN(parsed)) {
		return getDefaultOverlayBlur();
	}
	return clampNumber(parsed, 0, 20);
}

export function getStoredOverlayCardOpacity(): number {
	if (
		typeof localStorage === "undefined" ||
		typeof localStorage.getItem !== "function"
	) {
		return getDefaultOverlayCardOpacity();
	}
	const stored = localStorage.getItem("overlayCardOpacity");
	if (stored === null) {
		return getDefaultOverlayCardOpacity();
	}
	const parsed = Number.parseFloat(stored);
	if (Number.isNaN(parsed)) {
		return getDefaultOverlayCardOpacity();
	}
	return clampNumber(parsed, 0, 1);
}

export function applyOverlayOpacityToDocument(opacity: number): void {
	if (typeof document === "undefined") {
		return;
	}
	const safeOpacity = clampNumber(opacity, 0, 1);
	const wallpaperWrapper = document.getElementById("wallpaper-wrapper");
	if (wallpaperWrapper) {
		wallpaperWrapper.style.setProperty(
			"--overlay-opacity",
			String(safeOpacity),
		);
	}
}

export function applyOverlayBlurToDocument(blur: number): void {
	if (typeof document === "undefined") {
		return;
	}
	const safeBlur = clampNumber(blur, 0, 20);
	const wallpaperWrapper = document.getElementById("wallpaper-wrapper");
	if (wallpaperWrapper) {
		wallpaperWrapper.style.setProperty("--overlay-blur", `${safeBlur}px`);
	}
}

export function applyOverlayCardOpacityToDocument(cardOpacity: number): void {
	if (typeof document === "undefined") {
		return;
	}
	const safeCardOpacity = clampNumber(cardOpacity, 0, 1);
	document.documentElement.style.setProperty(
		"--card-transparent-opacity",
		String(safeCardOpacity),
	);
}

export function setOverlayOpacity(opacity: number): void {
	const safeOpacity = clampNumber(opacity, 0, 1);
	if (
		typeof localStorage !== "undefined" &&
		typeof localStorage.setItem === "function"
	) {
		localStorage.setItem("overlayOpacity", String(safeOpacity));
	}
	applyOverlayOpacityToDocument(safeOpacity);
}

export function setOverlayBlur(blur: number): void {
	const safeBlur = clampNumber(blur, 0, 20);
	if (
		typeof localStorage !== "undefined" &&
		typeof localStorage.setItem === "function"
	) {
		localStorage.setItem("overlayBlur", String(safeBlur));
	}
	applyOverlayBlurToDocument(safeBlur);
}

export function setOverlayCardOpacity(cardOpacity: number): void {
	const safeCardOpacity = clampNumber(cardOpacity, 0, 1);
	if (
		typeof localStorage !== "undefined" &&
		typeof localStorage.setItem === "function"
	) {
		localStorage.setItem("overlayCardOpacity", String(safeCardOpacity));
	}
	applyOverlayCardOpacityToDocument(safeCardOpacity);
}

export function applyStoredOverlaySettingsToDocument(): void {
	applyOverlayOpacityToDocument(getStoredOverlayOpacity());
	applyOverlayBlurToDocument(getStoredOverlayBlur());
	applyOverlayCardOpacityToDocument(getStoredOverlayCardOpacity());
}

// Waves animation functions
export function getDefaultWavesEnabled(): boolean {
	const wavesConfig = backgroundWallpaper.common?.waves?.enable;
	if (typeof wavesConfig === "object") {
		// 如果是分设备配置，检查当前设备
		const isMobile =
			typeof window !== "undefined" ? window.innerWidth < 768 : false;
		return isMobile
			? (wavesConfig.mobile ?? false)
			: (wavesConfig.desktop ?? false);
	}
	return wavesConfig ?? false;
}

export function getStoredWavesEnabled(): boolean {
	if (
		typeof localStorage === "undefined" ||
		typeof localStorage.getItem !== "function"
	) {
		return getDefaultWavesEnabled();
	}
	const stored = localStorage.getItem("wavesEnabled");
	if (stored === null) {
		return getDefaultWavesEnabled();
	}
	return stored === "true";
}

export function setWavesEnabled(enabled: boolean): void {
	if (
		typeof localStorage === "undefined" ||
		typeof localStorage.setItem !== "function"
	) {
		return;
	}
	localStorage.setItem("wavesEnabled", String(enabled));
	applyWavesEnabledToDocument(enabled);
}

export function applyWavesEnabledToDocument(enabled: boolean): void {
	if (typeof document === "undefined") {
		return;
	}
	// 更新 html 属性，CSS 会立即生效
	document.documentElement.setAttribute("data-waves-enabled", String(enabled));
	// 同时更新元素样式（兼容性）
	const wavesElement = document.getElementById("header-waves");
	if (wavesElement) {
		if (enabled) {
			wavesElement.style.display = "";
			wavesElement.classList.remove("waves-disabled");
		} else {
			wavesElement.style.display = "none";
			wavesElement.classList.add("waves-disabled");
		}
	}
}

// Gradient transition functions
export function getDefaultGradientEnabled(): boolean {
	const gradientConfig = backgroundWallpaper.common?.gradient?.enable;
	if (typeof gradientConfig === "object") {
		const isMobile =
			typeof window !== "undefined" ? window.innerWidth < 768 : false;
		return isMobile
			? (gradientConfig.mobile ?? true)
			: (gradientConfig.desktop ?? true);
	}
	return gradientConfig ?? true;
}

export function getStoredGradientEnabled(): boolean {
	if (
		typeof localStorage === "undefined" ||
		typeof localStorage.getItem !== "function"
	) {
		return getDefaultGradientEnabled();
	}
	const stored = localStorage.getItem("gradientEnabled");
	if (stored === null) {
		return getDefaultGradientEnabled();
	}
	return stored === "true";
}

export function setGradientEnabled(enabled: boolean): void {
	if (
		typeof localStorage === "undefined" ||
		typeof localStorage.setItem !== "function"
	) {
		return;
	}
	localStorage.setItem("gradientEnabled", String(enabled));
	applyGradientEnabledToDocument(enabled);
}

export function applyGradientEnabledToDocument(enabled: boolean): void {
	if (typeof document === "undefined") {
		return;
	}
	document.documentElement.setAttribute(
		"data-gradient-enabled",
		String(enabled),
	);
	const gradientElement = document.getElementById("wallpaper-gradient");
	if (gradientElement) {
		if (enabled) {
			gradientElement.style.display = "";
			gradientElement.classList.remove("gradient-disabled");
		} else {
			gradientElement.style.display = "none";
			gradientElement.classList.add("gradient-disabled");
		}
	}
}

// Sakura effect functions
export function getDefaultSakuraEnabled(): boolean {
	return sakuraConfig?.enable ?? false;
}

export function getStoredSakuraEnabled(): boolean {
	if (typeof localStorage === "undefined") {
		return getDefaultSakuraEnabled();
	}
	const stored = localStorage.getItem("sakuraEnabled");
	if (stored === null) {
		return getDefaultSakuraEnabled();
	}
	return stored === "true";
}

export function setSakuraEnabled(enabled: boolean): void {
	if (
		typeof localStorage === "undefined" ||
		typeof localStorage.setItem !== "function"
	) {
		return;
	}
	localStorage.setItem("sakuraEnabled", String(enabled));
	document.documentElement.setAttribute("data-sakura-enabled", String(enabled));
	// 实时切换樱花特效
	window.dispatchEvent(
		new CustomEvent("sakuraToggle", { detail: { enabled } }),
	);
}

// Banner title functions
export function getDefaultBannerTitleEnabled(): boolean {
	return backgroundWallpaper.common?.homeText?.enable ?? true;
}

export function getDefaultBannerCarouselEnabled(): boolean {
	if (getNationalDayThemeEnabled()) return false;
	return backgroundWallpaper.common?.carousel?.enable ?? false;
}

export function getStoredBannerTitleEnabled(): boolean {
	if (
		typeof localStorage === "undefined" ||
		typeof localStorage.getItem !== "function"
	) {
		return getDefaultBannerTitleEnabled();
	}
	const stored = localStorage.getItem("bannerTitleEnabled");
	if (stored === null) {
		return getDefaultBannerTitleEnabled();
	}
	return stored === "true";
}

export function getStoredBannerCarouselEnabled(): boolean {
	const isSwitchable =
		backgroundWallpaper.common?.carousel?.switchable ?? false;
	if (!isSwitchable) {
		return getDefaultBannerCarouselEnabled();
	}
	if (
		typeof localStorage === "undefined" ||
		typeof localStorage.getItem !== "function"
	) {
		return getDefaultBannerCarouselEnabled();
	}
	const isNationalDayEnabled = getNationalDayThemeEnabled();
	const modeKey = getBannerCarouselModeKey(isNationalDayEnabled);
	const normalModeKey = getBannerCarouselModeKey(false);
	const legacyStored = localStorage.getItem(BANNER_CAROUSEL_KEY);
	if (legacyStored !== null) {
		// The legacy setting predates the seasonal theme and belongs to normal mode.
		if (localStorage.getItem(normalModeKey) === null) {
			localStorage.setItem(normalModeKey, legacyStored);
		}
		localStorage.removeItem(BANNER_CAROUSEL_KEY);
	}
	const stored = localStorage.getItem(modeKey);
	if (stored === null) return getDefaultBannerCarouselEnabled();
	return stored === "true";
}

export function setBannerTitleEnabled(enabled: boolean): void {
	if (
		typeof localStorage === "undefined" ||
		typeof localStorage.setItem !== "function"
	) {
		return;
	}
	localStorage.setItem("bannerTitleEnabled", String(enabled));
	applyBannerTitleEnabledToDocument(enabled);
}

export function setBannerCarouselEnabled(enabled: boolean): void {
	const safeEnabled = !!enabled;
	const isSwitchable =
		backgroundWallpaper.common?.carousel?.switchable ?? false;
	if (
		isSwitchable &&
		typeof localStorage !== "undefined" &&
		typeof localStorage.setItem === "function"
	) {
		localStorage.setItem(
			getBannerCarouselModeKey(getNationalDayThemeEnabled()),
			String(safeEnabled),
		);
	}
	applyBannerCarouselEnabledToDocument(safeEnabled);
	if (typeof window !== "undefined") {
		window.dispatchEvent(
			new CustomEvent("bannerCarouselChange", {
				detail: { enabled: safeEnabled },
			}),
		);
	}
}

export function applyBannerTitleEnabledToDocument(enabled: boolean): void {
	if (typeof document === "undefined") {
		return;
	}
	// 更新 html 属性，CSS 会立即生效
	document.documentElement.setAttribute(
		"data-banner-title-enabled",
		String(enabled),
	);
	// 同时更新元素样式（兼容性）
	const bannerTextOverlay = document.querySelector(
		".banner-home-text-overlay",
	) as HTMLElement;
	if (bannerTextOverlay) {
		if (enabled) {
			bannerTextOverlay.classList.remove("user-hidden");
		} else {
			bannerTextOverlay.classList.add("user-hidden");
		}
	}
}

export function applyBannerCarouselEnabledToDocument(enabled: boolean): void {
	if (typeof document === "undefined") {
		return;
	}
	document.documentElement.setAttribute(
		"data-banner-carousel-enabled",
		String(enabled),
	);
}
