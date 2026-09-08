<script lang="ts">
import {
	WALLPAPER_BANNER,
	WALLPAPER_FULLSCREEN,
	WALLPAPER_NONE,
	WALLPAPER_OVERLAY,
} from "@constants/constants";
import I18nKey from "@i18n/i18nKey";
import { i18n } from "@i18n/translation";
import { getBackgroundImages } from "@utils/layout-utils";
import {
	clearSelectedWallpaper,
	getDefaultBannerCarouselEnabled,
	getDefaultBannerTitleEnabled,
	getDefaultGradientEnabled,
	getDefaultHue,
	getDefaultOverlayBlur,
	getDefaultOverlayCardOpacity,
	getDefaultOverlayOpacity,
	getDefaultSakuraEnabled,
	getDefaultWavesEnabled,
	getHue,
	getStoredBannerCarouselEnabled,
	getStoredBannerTitleEnabled,
	getStoredGradientEnabled,
	getStoredOverlayBlur,
	getStoredOverlayCardOpacity,
	getStoredOverlayOpacity,
	getStoredSakuraEnabled,
	getStoredSelectedWallpaperIndex,
	getStoredWallpaperMode,
	getStoredWavesEnabled,
	setBannerCarouselEnabled,
	setBannerTitleEnabled,
	setGradientEnabled,
	setHue,
	setOverlayBlur,
	setOverlayCardOpacity,
	setOverlayOpacity,
	setSakuraEnabled,
	setSelectedWallpaperIndex,
	setWallpaperMode,
	setWavesEnabled,
} from "@utils/setting-utils";
import { onMount } from "svelte";
import Icon from "@/components/common/Icon.svelte";
import { backgroundWallpaper, sakuraConfig, siteConfig } from "@/config";
import { homePortfolioIntroSettings } from "@/config/homePortfolioIntro";
import type { WALLPAPER_MODE } from "@/types/config";

type OverlaySliderItem = {
	key: "opacity" | "blur" | "cardOpacity";
	enabled: boolean;
	label: string;
	displayValue: string;
	ariaLabel: string;
	min: number;
	max: number;
	step: number;
	value: number;
	onValueChange: (value: number) => void;
};

type WallpaperOption = {
	index: number;
	src: string;
	preview: string;
	label: string;
};

type MobileSettingsTab = "appearance" | "wallpaper" | "preferences";

const wallpaperPreviewModules = import.meta.glob<string>(
	"../../assets/images/{DesktopWallpaper,MobileWallpaper}/*.{avif,png,jpg,jpeg,webp}",
	{ eager: true, import: "default", query: "?url" },
);

function getWallpaperPreview(src: string): string {
	if (
		src.startsWith("/assets/images/wallpaper/wallpaper-") &&
		src.endsWith(".webp")
	) {
		return src.replace(
			"/assets/images/wallpaper/",
			"/assets/images/wallpaper/thumbs/",
		);
	}
	if (src.startsWith("/") || src.startsWith("http")) return src;
	return wallpaperPreviewModules[`../../${src}`] || src;
}

const configuredWallpapers = getBackgroundImages();
const builtInWallpapers: WallpaperOption[] = configuredWallpapers.desktop.map(
	(src, index) => ({
		index,
		src,
		preview: getWallpaperPreview(src),
		label: `${i18n(I18nKey.builtinWallpaper)} ${index + 1}`,
	}),
);

let hue = $state(getHue());
const defaultHue = getDefaultHue();
let wallpaperMode: WALLPAPER_MODE = $state(backgroundWallpaper.mode);
const defaultWallpaperMode = backgroundWallpaper.mode;
let currentLayout: "list" | "grid" = $state("list");
const defaultLayout = siteConfig.postListLayout.defaultMode;
const mobileDefaultLayout =
	siteConfig.postListLayout.mobileDefaultMode || defaultLayout;
let mounted = $state(false);
let isSmallScreen = $state(
	typeof window !== "undefined" ? window.innerWidth < 1200 : false,
);
let isMobileWidth = $state(
	typeof window !== "undefined" ? window.innerWidth < 780 : false,
);
let mobileSettingsTab = $state<MobileSettingsTab>("appearance");
let isSwitching = $state(false);
let wavesEnabled = $state(true);
const defaultWavesEnabled = getDefaultWavesEnabled();
let gradientEnabled = $state(true);
const defaultGradientEnabled = getDefaultGradientEnabled();
let bannerTitleEnabled = $state(true);
const defaultBannerTitleEnabled = getDefaultBannerTitleEnabled();
let bannerCarouselEnabled = $state(true);
const defaultBannerCarouselEnabled = getDefaultBannerCarouselEnabled();
let sakuraEnabled = $state(true);
const defaultSakuraEnabled = getDefaultSakuraEnabled();
let selectedWallpaperIndex: number | null = $state(null);
let overlayOpacity = $state(getDefaultOverlayOpacity());
const defaultOverlayOpacity = getDefaultOverlayOpacity();
let overlayBlur = $state(getDefaultOverlayBlur());
const defaultOverlayBlur = getDefaultOverlayBlur();
let overlayCardOpacity = $state(getDefaultOverlayCardOpacity());
const defaultOverlayCardOpacity = getDefaultOverlayCardOpacity();
let introEnabled = $state(homePortfolioIntroSettings.defaultEnabled);
let selectedIntroCharacterId = $state(homePortfolioIntroSettings.defaultCharacterId);
let selectedIntroTopBannerId = $state(homePortfolioIntroSettings.defaultTopBannerId);
let selectedIntroBottomBannerId = $state(homePortfolioIntroSettings.defaultBottomBannerId);
const defaultIntroEnabled = homePortfolioIntroSettings.defaultEnabled;
const defaultIntroCharacterId = homePortfolioIntroSettings.defaultCharacterId;
const defaultIntroTopBannerId = homePortfolioIntroSettings.defaultTopBannerId;
const defaultIntroBottomBannerId = homePortfolioIntroSettings.defaultBottomBannerId;

const isWallpaperSwitchable = backgroundWallpaper.switchable ?? true;
const allowLayoutSwitch = siteConfig.postListLayout.allowSwitch;
let effectiveDefaultLayout = $derived(
	isMobileWidth ? mobileDefaultLayout : defaultLayout,
);
const showThemeColor = !siteConfig.themeColor.fixed;
// 是否允许用户切换水波纹动画（只看 switchable 配置）
const isWavesSwitchable =
	backgroundWallpaper.common?.waves?.switchable ?? false;
// 是否允许用户切换渐变过渡（只看 switchable 配置）
const isGradientSwitchable =
	backgroundWallpaper.common?.gradient?.switchable ?? false;
// 检查是否启用横幅标题配置
const isBannerTitleEnabled =
	backgroundWallpaper.common?.homeText?.enable ?? false;
// 是否允许用户切换横幅标题
const isBannerTitleSwitchable =
	isBannerTitleEnabled &&
	(backgroundWallpaper.common?.homeText?.switchable ?? false);
// 是否允许用户切换横幅轮播
const isBannerCarouselSwitchable =
	backgroundWallpaper.common?.carousel?.switchable ?? false;
const isBuiltInWallpaperSwitchable = builtInWallpapers.length > 1;
// 是否允许用户切换樱花特效
const isSakuraSwitchable = sakuraConfig?.switchable ?? false;
// 是否有任何横幅设置可显示（后续添加新设置时在此处添加条件）
const hasBannerSettings =
	isBuiltInWallpaperSwitchable ||
	isWavesSwitchable ||
	isGradientSwitchable ||
	isBannerTitleSwitchable ||
	isBannerCarouselSwitchable;
const overlaySwitchableConfig =
	backgroundWallpaper.overlay?.switchable ?? false;
const isOverlaySettingsSwitchable =
	typeof overlaySwitchableConfig === "boolean" ? overlaySwitchableConfig : true;
const isOverlayOpacitySwitchable =
	typeof overlaySwitchableConfig === "boolean"
		? overlaySwitchableConfig
		: (overlaySwitchableConfig.opacity ?? false);
const isOverlayBlurSwitchable =
	typeof overlaySwitchableConfig === "boolean"
		? overlaySwitchableConfig
		: (overlaySwitchableConfig.blur ?? false);
const isOverlayCardOpacitySwitchable =
	typeof overlaySwitchableConfig === "boolean"
		? overlaySwitchableConfig
		: (overlaySwitchableConfig.cardOpacity ?? false);
const hasOverlaySettings =
	isOverlaySettingsSwitchable &&
	(isBuiltInWallpaperSwitchable ||
		isOverlayOpacitySwitchable ||
		isOverlayBlurSwitchable ||
		isOverlayCardOpacitySwitchable);
let overlaySettingsIsDefault = $derived(
	selectedWallpaperIndex === null &&
		(!isOverlayOpacitySwitchable || overlayOpacity === defaultOverlayOpacity) &&
		(!isOverlayBlurSwitchable || overlayBlur === defaultOverlayBlur) &&
		(!isOverlayCardOpacitySwitchable ||
			overlayCardOpacity === defaultOverlayCardOpacity),
);
// 横幅设置是否全部为默认值（用于控制恢复默认按钮的显隐）
let bannerSettingsIsDefault = $derived(
	(!isBannerTitleSwitchable ||
		bannerTitleEnabled === defaultBannerTitleEnabled) &&
		(!isWavesSwitchable || wavesEnabled === defaultWavesEnabled) &&
		(!isGradientSwitchable || gradientEnabled === defaultGradientEnabled) &&
		(!isBannerCarouselSwitchable ||
			bannerCarouselEnabled === defaultBannerCarouselEnabled) &&
		selectedWallpaperIndex === null,
);
const hasAnyContent =
	showThemeColor ||
	isWallpaperSwitchable ||
	allowLayoutSwitch ||
	hasBannerSettings ||
	hasOverlaySettings ||
	isSakuraSwitchable ||
	homePortfolioIntroSettings.characters.length > 0;

const introSettingsIsDefault = $derived(
	introEnabled === defaultIntroEnabled &&
	selectedIntroCharacterId === defaultIntroCharacterId &&
	selectedIntroTopBannerId === defaultIntroTopBannerId &&
	selectedIntroBottomBannerId === defaultIntroBottomBannerId,
);

let overlaySliderItems = $derived<OverlaySliderItem[]>([
	{
		key: "opacity",
		enabled: isOverlayOpacitySwitchable,
		label: i18n(I18nKey.overlayOpacity),
		displayValue: `${Math.round(overlayOpacity * 100)}%`,
		ariaLabel: i18n(I18nKey.overlayOpacity),
		min: 20,
		max: 100,
		step: 1,
		value: Math.round(overlayOpacity * 100),
		onValueChange: (value) => {
			overlayOpacity = value / 100;
		},
	},
	{
		key: "blur",
		enabled: isOverlayBlurSwitchable,
		label: i18n(I18nKey.overlayBlur),
		displayValue: `${overlayBlur.toFixed(1)}px`,
		ariaLabel: i18n(I18nKey.overlayBlur),
		min: 0,
		max: 20,
		step: 0.5,
		value: overlayBlur,
		onValueChange: (value) => {
			overlayBlur = value;
		},
	},
	{
		key: "cardOpacity",
		enabled: isOverlayCardOpacitySwitchable,
		label: i18n(I18nKey.overlayCardOpacity),
		displayValue: `${Math.round(overlayCardOpacity * 100)}%`,
		ariaLabel: i18n(I18nKey.overlayCardOpacity),
		min: 20,
		max: 100,
		step: 1,
		value: Math.round(overlayCardOpacity * 100),
		onValueChange: (value) => {
			overlayCardOpacity = value / 100;
		},
	},
]);

function resetHue() {
	hue = getDefaultHue();
	requestAnimationFrame(refreshAllRangeProgress);
}

function resetWallpaperMode() {
	wallpaperMode = defaultWallpaperMode;
	setWallpaperMode(defaultWallpaperMode);
}

function resetLayout() {
	currentLayout = effectiveDefaultLayout;
	localStorage.removeItem("postListLayout");

	// 触发自定义事件，通知页面布局已改变
	const event = new CustomEvent("layoutChange", {
		detail: { layout: effectiveDefaultLayout },
	});
	window.dispatchEvent(event);
}

function resetWavesEnabled() {
	wavesEnabled = defaultWavesEnabled;
	setWavesEnabled(defaultWavesEnabled);
}

function resetGradientEnabled() {
	gradientEnabled = defaultGradientEnabled;
	setGradientEnabled(defaultGradientEnabled);
}

function resetBannerSettings() {
	if (selectedWallpaperIndex !== null) {
		selectedWallpaperIndex = null;
		clearSelectedWallpaper();
	}
	if (
		isBannerTitleSwitchable &&
		bannerTitleEnabled !== defaultBannerTitleEnabled
	) {
		bannerTitleEnabled = defaultBannerTitleEnabled;
		setBannerTitleEnabled(defaultBannerTitleEnabled);
	}
	if (isWavesSwitchable && wavesEnabled !== defaultWavesEnabled) {
		wavesEnabled = defaultWavesEnabled;
		setWavesEnabled(defaultWavesEnabled);
	}
	if (isGradientSwitchable && gradientEnabled !== defaultGradientEnabled) {
		gradientEnabled = defaultGradientEnabled;
		setGradientEnabled(defaultGradientEnabled);
	}
	if (
		isBannerCarouselSwitchable &&
		bannerCarouselEnabled !== defaultBannerCarouselEnabled
	) {
		bannerCarouselEnabled = defaultBannerCarouselEnabled;
		setBannerCarouselEnabled(defaultBannerCarouselEnabled);
	}
}

function selectBuiltInWallpaper(index: number) {
	selectedWallpaperIndex = index;
	setSelectedWallpaperIndex(index);
	if (bannerCarouselEnabled) {
		bannerCarouselEnabled = false;
		setBannerCarouselEnabled(false);
	}
	if (wallpaperMode === WALLPAPER_NONE) {
		switchWallpaperMode(WALLPAPER_BANNER);
	}
}

function resetOverlaySettings() {
	if (selectedWallpaperIndex !== null) {
		selectedWallpaperIndex = null;
		clearSelectedWallpaper();
	}
	if (isOverlayOpacitySwitchable && overlayOpacity !== defaultOverlayOpacity) {
		overlayOpacity = defaultOverlayOpacity;
		setOverlayOpacity(defaultOverlayOpacity);
	}
	if (isOverlayBlurSwitchable && overlayBlur !== defaultOverlayBlur) {
		overlayBlur = defaultOverlayBlur;
		setOverlayBlur(defaultOverlayBlur);
	}
	if (
		isOverlayCardOpacitySwitchable &&
		overlayCardOpacity !== defaultOverlayCardOpacity
	) {
		overlayCardOpacity = defaultOverlayCardOpacity;
		setOverlayCardOpacity(defaultOverlayCardOpacity);
	}

	requestAnimationFrame(refreshAllRangeProgress);
}

function toggleWavesEnabled() {
	wavesEnabled = !wavesEnabled;
	setWavesEnabled(wavesEnabled);
}

function toggleGradientEnabled() {
	gradientEnabled = !gradientEnabled;
	setGradientEnabled(gradientEnabled);
}

function toggleBannerTitleEnabled() {
	bannerTitleEnabled = !bannerTitleEnabled;
	setBannerTitleEnabled(bannerTitleEnabled);
}

function toggleBannerCarouselEnabled() {
	const nextEnabled = !bannerCarouselEnabled;
	if (nextEnabled && selectedWallpaperIndex !== null) {
		selectedWallpaperIndex = null;
		clearSelectedWallpaper();
	}
	bannerCarouselEnabled = nextEnabled;
	setBannerCarouselEnabled(bannerCarouselEnabled);
}

function toggleSakuraEnabled() {
	sakuraEnabled = !sakuraEnabled;
	setSakuraEnabled(sakuraEnabled);
}

function getStoredIntroEnabled() {
	try {
		return localStorage.getItem(homePortfolioIntroSettings.enabledStorageKey) !== "0";
	} catch {
		return defaultIntroEnabled;
	}
}

function getStoredIntroCharacterId() {
	try {
		const storedId = localStorage.getItem(homePortfolioIntroSettings.characterStorageKey);
		return homePortfolioIntroSettings.characters.some((character) => character.id === storedId)
			? storedId!
			: defaultIntroCharacterId;
	} catch {
		return defaultIntroCharacterId;
	}
}

function getStoredIntroBannerId(
	position: "top" | "bottom",
	defaultId: string,
) {
	const storageKey = position === "top"
		? homePortfolioIntroSettings.topBannerStorageKey
		: homePortfolioIntroSettings.bottomBannerStorageKey;
	const options = homePortfolioIntroSettings.banners.desktop[position];
	try {
		const storedId = localStorage.getItem(storageKey);
		return options.some((banner) => banner.id === storedId)
			? storedId!
			: defaultId;
	} catch {
		return defaultId;
	}
}

function dispatchIntroSettingsChange(preview = false) {
	window.dispatchEvent(
		new CustomEvent("home-portfolio-intro-settings-change", {
			detail: {
				enabled: introEnabled,
				characterId: selectedIntroCharacterId,
				topBannerId: selectedIntroTopBannerId,
				bottomBannerId: selectedIntroBottomBannerId,
				preview,
			},
		}),
	);
}


function toggleIntroEnabled() {
	introEnabled = !introEnabled;
	try {
		localStorage.setItem(
			homePortfolioIntroSettings.enabledStorageKey,
			introEnabled ? "1" : "0",
		);
		if (introEnabled) sessionStorage.removeItem("rainzt.home-portfolio-intro-seen.v1");
	} catch {
		// 私有浏览模式下无法持久化时，仍让当前页面立即响应切换。
	}
	dispatchIntroSettingsChange();
}

function selectIntroCharacter(characterId: string) {
	if (!homePortfolioIntroSettings.characters.some((character) => character.id === characterId)) return;
	selectedIntroCharacterId = characterId;
	try {
		localStorage.setItem(homePortfolioIntroSettings.characterStorageKey, characterId);
	} catch {
		// 私有浏览模式下无法持久化时，仍让当前页面立即响应切换。
	}
	dispatchIntroSettingsChange(true);
}

function selectIntroBanner(position: "top" | "bottom", bannerId: string) {
	const options = homePortfolioIntroSettings.banners.desktop[position];
	if (!options.some((banner) => banner.id === bannerId)) return;
	const storageKey = position === "top"
		? homePortfolioIntroSettings.topBannerStorageKey
		: homePortfolioIntroSettings.bottomBannerStorageKey;
	if (position === "top") {
		selectedIntroTopBannerId = bannerId;
	} else {
		selectedIntroBottomBannerId = bannerId;
	}
	try {
		localStorage.setItem(storageKey, bannerId);
	} catch {
		// 私有浏览模式下无法持久化时，仍让当前页面立即响应切换。
	}
	dispatchIntroSettingsChange(true);
}

function resetIntroSettings() {
	introEnabled = defaultIntroEnabled;
	selectedIntroCharacterId = defaultIntroCharacterId;
	selectedIntroTopBannerId = defaultIntroTopBannerId;
	selectedIntroBottomBannerId = defaultIntroBottomBannerId;
	try {
		localStorage.removeItem(homePortfolioIntroSettings.enabledStorageKey);
		localStorage.removeItem(homePortfolioIntroSettings.characterStorageKey);
		localStorage.removeItem(homePortfolioIntroSettings.topBannerStorageKey);
		localStorage.removeItem(homePortfolioIntroSettings.bottomBannerStorageKey);
		sessionStorage.removeItem("rainzt.home-portfolio-intro-seen.v1");
	} catch {
		// 私有浏览模式下无法持久化时，仍恢复当前页面的默认值。
	}
	dispatchIntroSettingsChange();
}

function switchWallpaperMode(newMode: WALLPAPER_MODE) {
	wallpaperMode = newMode;
	setWallpaperMode(newMode);

	if (isMobileWidth) {
		mobileSettingsTab =
			newMode === WALLPAPER_NONE ? "appearance" : "wallpaper";
		requestAnimationFrame(() => {
			document
				.getElementById("display-setting")
				?.scrollTo({ top: 0, behavior: "smooth" });
			refreshAllRangeProgress();
		});
		return;
	}

	window.scrollTo({ top: 0 });
	if (newMode === WALLPAPER_OVERLAY) requestAnimationFrame(refreshAllRangeProgress);
}

function selectMobileSettingsTab(tab: MobileSettingsTab) {
	if (mobileSettingsTab === tab) return;
	mobileSettingsTab = tab;
	requestAnimationFrame(() => {
		document
			.getElementById("display-setting")
			?.scrollTo({ top: 0, behavior: "smooth" });
		refreshAllRangeProgress();
	});
}

function checkScreenSize() {
	isSmallScreen = window.innerWidth < 1200;
	isMobileWidth = window.innerWidth < 780;
	// 低于380px强制网格模式
	if (window.innerWidth < 380 && currentLayout === "list") {
		currentLayout = "grid";
		const event = new CustomEvent("layoutChange", {
			detail: { layout: "grid" },
		});
		window.dispatchEvent(event);
	}
}

function initWallpaperPreviewLoading() {
	const panel = document.getElementById("display-setting");
	if (!panel) return () => {};

	const images = new Set<HTMLImageElement>();
	const loadImage = (image: HTMLImageElement) => {
		const src = image.dataset.wallpaperSrc;
		if (!src || image.hasAttribute("src")) return;
		image.src = src;
		delete image.dataset.wallpaperSrc;
	};

	if (!("IntersectionObserver" in window)) {
		panel
			.querySelectorAll<HTMLImageElement>("img[data-wallpaper-src]")
			.forEach(loadImage);
		return () => {};
	}

	const observer = new IntersectionObserver(
		(entries) => {
			entries.forEach((entry) => {
				if (!entry.isIntersecting) return;
				const image = entry.target as HTMLImageElement;
				loadImage(image);
				observer.unobserve(image);
			});
		},
		{ root: null, rootMargin: "160px 0px", threshold: 0.01 },
	);

	const observeImages = () => {
		panel
			.querySelectorAll<HTMLImageElement>("img[data-wallpaper-src]")
			.forEach((image) => {
				if (images.has(image)) return;
				images.add(image);
				observer.observe(image);
			});
	};

	observeImages();
	const mutations = new MutationObserver(observeImages);
	mutations.observe(panel, { childList: true, subtree: true });

	return () => {
		mutations.disconnect();
		observer.disconnect();
	};
}

function updateRangeProgress(input: HTMLInputElement) {
	const min = Number(input.min || 0);
	const max = Number(input.max || 100);
	const value = Number(input.value || 0);
	const progress = ((value - min) * 100) / (max - min || 1);
	input.style.setProperty(
		"--range-progress",
		`${Math.min(100, Math.max(0, progress))}%`,
	);
}

function refreshAllRangeProgress() {
	const panel = document.getElementById("display-setting");
	if (!panel) return;

	const rangeInputs = Array.from(
		panel.querySelectorAll('input[type="range"]'),
	) as HTMLInputElement[];

	rangeInputs.forEach((input) => {
		updateRangeProgress(input);
	});
}

function switchLayout() {
	if (!mounted || isSwitching) return;

	isSwitching = true;
	currentLayout = currentLayout === "list" ? "grid" : "list";
	localStorage.setItem("postListLayout", currentLayout);

	// 触发自定义事件，通知页面布局已改变
	const event = new CustomEvent("layoutChange", {
		detail: { layout: currentLayout },
	});
	window.dispatchEvent(event);

	// 动画完成后重置状态
	setTimeout(() => {
		isSwitching = false;
	}, 500);
}

onMount(() => {
	mounted = true;
	checkScreenSize();

	// 从localStorage读取首页开屏动画偏好
	introEnabled = getStoredIntroEnabled();
	selectedIntroCharacterId = getStoredIntroCharacterId();
	selectedIntroTopBannerId = getStoredIntroBannerId("top", defaultIntroTopBannerId);
	selectedIntroBottomBannerId = getStoredIntroBannerId("bottom", defaultIntroBottomBannerId);

	// 从localStorage读取保存的壁纸模式
	wallpaperMode = getStoredWallpaperMode();

	// 从localStorage读取水波纹动画状态
	wavesEnabled = getStoredWavesEnabled();

	// 从localStorage读取渐变过渡状态
	gradientEnabled = getStoredGradientEnabled();

	// 从localStorage读取横幅标题状态
	bannerTitleEnabled = getStoredBannerTitleEnabled();

	// 从localStorage读取横幅轮播状态
	bannerCarouselEnabled = getStoredBannerCarouselEnabled();
	const cleanupWallpaperPreviewLoading = initWallpaperPreviewLoading();
	selectedWallpaperIndex = getStoredSelectedWallpaperIndex();
	if (bannerCarouselEnabled && selectedWallpaperIndex !== null) {
		selectedWallpaperIndex = null;
		clearSelectedWallpaper();
	}

	// 从localStorage读取樱花特效状态
	sakuraEnabled = getStoredSakuraEnabled();

	// 从localStorage读取全屏透明设置状态
	overlayOpacity = getStoredOverlayOpacity();
	overlayBlur = getStoredOverlayBlur();
	overlayCardOpacity = getStoredOverlayCardOpacity();

	// 从localStorage读取用户偏好布局
	const savedLayout = localStorage.getItem("postListLayout");
	if (savedLayout && (savedLayout === "list" || savedLayout === "grid")) {
		currentLayout = savedLayout;
	} else {
		currentLayout =
			window.innerWidth < 780 ? mobileDefaultLayout : defaultLayout;
	}

	// 监听窗口大小变化
	window.addEventListener("resize", checkScreenSize);

	return () => {
		window.removeEventListener("resize", checkScreenSize);
		cleanupWallpaperPreviewLoading();
	};
});

// 监听布局变化事件
onMount(() => {
	const handleCustomEvent = (event: Event) => {
		const customEvent = event as CustomEvent<{ layout: "list" | "grid" }>;
		currentLayout = customEvent.detail.layout;
	};

	window.addEventListener("layoutChange", handleCustomEvent);

	return () => {
		window.removeEventListener("layoutChange", handleCustomEvent);
	};
});

onMount(() => {
	const panel = document.getElementById("display-setting");
	if (!panel) return;

	const handleRangeInput = (event: Event) => {
		const target = event.target;
		if (target instanceof HTMLInputElement && target.type === "range") {
			updateRangeProgress(target);
		}
	};

	refreshAllRangeProgress();
	panel.addEventListener("input", handleRangeInput);

	return () => {
		panel.removeEventListener("input", handleRangeInput);
	};
});

onMount(() => {
	const panel = document.getElementById("display-setting");
	if (!panel) return;

	const syncMobileScrollLock = () => {
		const shouldLock =
			window.innerWidth < 780 &&
			!panel.classList.contains("float-panel-closed");
		document.documentElement.classList.toggle(
			"display-settings-open",
			shouldLock,
		);
		document.body.classList.toggle("display-settings-open", shouldLock);
	};

	const observer = new MutationObserver(syncMobileScrollLock);
	observer.observe(panel, { attributes: true, attributeFilter: ["class"] });
	window.addEventListener("resize", syncMobileScrollLock);
	syncMobileScrollLock();

	return () => {
		observer.disconnect();
		window.removeEventListener("resize", syncMobileScrollLock);
		document.documentElement.classList.remove("display-settings-open");
		document.body.classList.remove("display-settings-open");
	};
});

onMount(() => {
	const handleWallpaperModeChange = (event: Event) => {
		const customEvent = event as CustomEvent<{ mode: WALLPAPER_MODE }>;
		wallpaperMode = customEvent.detail.mode;
	};

	window.addEventListener("wallpaperModeChange", handleWallpaperModeChange);

	return () => {
		window.removeEventListener(
			"wallpaperModeChange",
			handleWallpaperModeChange,
		);
	};
});

$effect(() => {
	if (hue || hue === 0) {
		setHue(hue);
	}
});

$effect(() => {
	if (wallpaperMode === WALLPAPER_OVERLAY) {
		if (isOverlayOpacitySwitchable) {
			setOverlayOpacity(overlayOpacity);
		}
		if (isOverlayBlurSwitchable) {
			setOverlayBlur(overlayBlur);
		}
		if (isOverlayCardOpacitySwitchable) {
			setOverlayCardOpacity(overlayCardOpacity);
		}
	}
});
</script>

{#if hasAnyContent}
<div
    id="display-setting"
    class="float-panel float-panel-closed hide-scrollbar absolute transition-all w-80 max-h-[calc(100vh-6rem)] right-4 overflow-y-auto overscroll-contain px-4 py-2"
>
    <nav class="mobile-settings-nav" aria-label="显示设置分类">
            <button
                type="button"
                class="mobile-settings-tab"
                class:mobile-settings-tab-active={mobileSettingsTab === "appearance"}
                aria-pressed={mobileSettingsTab === "appearance"}
                onclick={() => selectMobileSettingsTab("appearance")}
            >
                <Icon icon="material-symbols:palette-outline" class="text-[1.05rem]" />
                <span>外观</span>
            </button>
            <button
                type="button"
                class="mobile-settings-tab"
                class:mobile-settings-tab-active={mobileSettingsTab === "wallpaper"}
                aria-pressed={mobileSettingsTab === "wallpaper"}
                onclick={() => selectMobileSettingsTab("wallpaper")}
            >
                <Icon icon="material-symbols:wallpaper" class="text-[1.05rem]" />
                <span>壁纸</span>
            </button>
            <button
                type="button"
                class="mobile-settings-tab"
                class:mobile-settings-tab-active={mobileSettingsTab === "preferences"}
                aria-pressed={mobileSettingsTab === "preferences"}
                onclick={() => selectMobileSettingsTab("preferences")}
            >
                <Icon icon="material-symbols:tune-rounded" class="text-[1.05rem]" />
                <span>偏好</span>
            </button>
    </nav>

    <!-- Theme Color Section -->
    {#if showThemeColor}
    <div
        class="mt-2 mb-2 mobile-settings-section"
        class:mobile-settings-section-hidden={mobileSettingsTab !== "appearance"}
    >
        <div class="flex flex-row gap-2 mb-2 items-center justify-between">
            <div class="flex gap-2 font-bold text-lg text-neutral-900 dark:text-neutral-100 transition relative ml-3
                before:w-1 before:h-4 before:rounded-md before:bg-(--primary)
                before:absolute before:-left-3 before:top-1/2 before:-translate-y-1/2"
            >
                {i18n(I18nKey.themeColor)}
                <button aria-label="Reset to Default" class="btn-regular w-7 h-7 rounded-md  active:scale-90"
                        class:opacity-0={hue === defaultHue} class:pointer-events-none={hue === defaultHue} onclick={resetHue}>
                    <div class="text-(--btn-content)">
                        <Icon icon="fa7-solid:arrow-rotate-left" class="text-[0.875rem]"></Icon>
                    </div>
                </button>
            </div>
            <div class="flex gap-1">
                <div id="hueValue" class="transition bg-(--btn-regular-bg) w-10 h-7 rounded-md flex justify-center
                font-bold text-sm items-center text-(--btn-content)">
                    {hue}
                </div>
            </div>
        </div>
        <div class="w-full h-6 px-1 bg-[oklch(0.80_0.10_0)] dark:bg-[oklch(0.70_0.10_0)] rounded select-none">
            <input aria-label={i18n(I18nKey.themeColor)} type="range" min="0" max="360" bind:value={hue}
                   class="slider" id="colorSlider" step="5" style="width: 100%">
        </div>
    </div>
    {/if}

    <!-- Wallpaper Mode Section -->
    {#if isWallpaperSwitchable}
        <div
            class="mt-2 mb-2 mobile-settings-section"
            class:mobile-settings-section-hidden={mobileSettingsTab !== "appearance"}
        >
            <div class="flex gap-2 font-bold text-lg text-neutral-900 dark:text-neutral-100 transition relative ml-3 mb-2
                before:w-1 before:h-4 before:rounded-md before:bg-(--primary)
                before:absolute before:-left-3 before:top-1/2 before:-translate-y-1/2"
            >
                {i18n(I18nKey.wallpaperMode)}
                <button aria-label="Reset to Default" class="btn-regular w-7 h-7 rounded-md  active:scale-90"
                        class:opacity-0={wallpaperMode === defaultWallpaperMode} class:pointer-events-none={wallpaperMode === defaultWallpaperMode} onclick={resetWallpaperMode}>
                    <div class="text-(--btn-content)">
                        <Icon icon="fa7-solid:arrow-rotate-left" class="text-[0.875rem]"></Icon>
                    </div>
                </button>
            </div>
            <div class="flex gap-2">
                <button
                    class="flex-1 btn-regular rounded-md py-2 px-3 flex items-center justify-center gap-2 active:scale-95 transition-all relative overflow-hidden"
                    class:opacity-60={wallpaperMode !== WALLPAPER_BANNER}
                    class:bg-(--btn-regular-bg-hover)={wallpaperMode === WALLPAPER_BANNER}
                    onclick={() => switchWallpaperMode(WALLPAPER_BANNER)}
                >
                    <Icon icon="material-symbols:image-outline" class="text-[1.25rem] shrink-0"></Icon>
                    <span class="text-xs font-medium">{i18n(I18nKey.wallpaperBannerMode)}</span>
                </button>
                <button
                    class="flex-1 btn-regular rounded-md py-2 px-3 flex items-center justify-center gap-2 active:scale-95 transition-all relative overflow-hidden"
                    class:opacity-60={wallpaperMode !== WALLPAPER_FULLSCREEN}
                    class:bg-(--btn-regular-bg-hover)={wallpaperMode === WALLPAPER_FULLSCREEN}
                    onclick={() => switchWallpaperMode(WALLPAPER_FULLSCREEN)}
                >
                    <Icon icon="material-symbols:wallpaper" class="text-[1.25rem] shrink-0"></Icon>
                    <span class="text-xs font-medium">{i18n(I18nKey.wallpaperFullscreenMode)}</span>
                </button>
            </div>
            <div class="flex gap-2 mt-2">
                <button
                    class="flex-1 btn-regular rounded-md py-2 px-3 flex items-center justify-center gap-2 active:scale-95 transition-all relative overflow-hidden"
                    class:opacity-60={wallpaperMode !== WALLPAPER_OVERLAY}
                    class:bg-(--btn-regular-bg-hover)={wallpaperMode === WALLPAPER_OVERLAY}
                    onclick={() => switchWallpaperMode(WALLPAPER_OVERLAY)}
                >
                    <Icon icon="material-symbols:full-coverage-outline-rounded" class="text-[1.25rem] shrink-0"></Icon>
                    <span class="text-xs font-medium">{i18n(I18nKey.wallpaperOverlayMode)}</span>
                </button>
                <button
                    class="flex-1 btn-regular rounded-md py-2 px-3 flex items-center justify-center gap-2 active:scale-95 transition-all relative overflow-hidden"
                    class:opacity-60={wallpaperMode !== WALLPAPER_NONE}
                    class:bg-(--btn-regular-bg-hover)={wallpaperMode === WALLPAPER_NONE}
                    onclick={() => switchWallpaperMode(WALLPAPER_NONE)}
                >
                    <Icon icon="material-symbols:hide-image-outline" class="text-[1.25rem] shrink-0"></Icon>
                    <span class="text-xs font-medium">{i18n(I18nKey.wallpaperNoneMode)}</span>
                </button>
            </div>
        </div>
    {/if}

    <!-- Overlay Settings Section -->
    {#if wallpaperMode === WALLPAPER_OVERLAY && hasOverlaySettings}
        <div
            class="mt-2 mb-2 mobile-settings-section"
            class:mobile-settings-section-hidden={mobileSettingsTab !== "wallpaper"}
        >
            <div class="flex gap-2 font-bold text-lg text-neutral-900 dark:text-neutral-100 transition relative ml-3 mb-2
                before:w-1 before:h-4 before:rounded-md before:bg-(--primary)
                before:absolute before:-left-3 before:top-1/2 before:-translate-y-1/2"
            >
                {i18n(I18nKey.overlaySettings)}
                <button aria-label="Reset to Default" class="btn-regular w-7 h-7 rounded-md active:scale-90"
                        class:opacity-0={overlaySettingsIsDefault} class:pointer-events-none={overlaySettingsIsDefault} onclick={resetOverlaySettings}>
                    <div class="text-(--btn-content)">
                        <Icon icon="fa7-solid:arrow-rotate-left" class="text-[0.875rem]"></Icon>
                    </div>
                </button>
            </div>
            <div class="space-y-2">
                {#if isBuiltInWallpaperSwitchable}
                    <div class="space-y-2">
                        <div class="flex items-center gap-2 px-1 text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                            <Icon icon="material-symbols:imagesmode-outline-rounded" class="text-[1rem] shrink-0"></Icon>
                            <span>{i18n(I18nKey.builtinWallpaper)}</span>
                        </div>
                        <div class="wallpaper-picker-scroll hide-scrollbar grid max-h-64 grid-cols-3 gap-1.5 overflow-y-auto overscroll-contain pr-0.5">
                            {#each builtInWallpapers as wallpaper}
                                <button
                                    type="button"
                                    title={wallpaper.label}
                                    aria-label={wallpaper.label}
                                    class="wallpaper-picker-item relative aspect-video overflow-hidden rounded-md border-2 transition-all active:scale-95"
                                    class:border-(--primary)={selectedWallpaperIndex === wallpaper.index}
                                    class:border-transparent={selectedWallpaperIndex !== wallpaper.index}
                                    class:ring-2={selectedWallpaperIndex === wallpaper.index}
                                    class:ring-(--primary)={selectedWallpaperIndex === wallpaper.index}
                                    class:ring-offset-1={selectedWallpaperIndex === wallpaper.index}
                                    class:ring-offset-transparent={selectedWallpaperIndex === wallpaper.index}
                                    onclick={() => selectBuiltInWallpaper(wallpaper.index)}
                                >
                                    <img
                                        data-wallpaper-src={wallpaper.preview}
                                        alt=""
                                        class="absolute inset-0 h-full w-full object-cover"
                                        loading="lazy"
                                        decoding="async"
                                    />
                                </button>
                            {/each}
                        </div>
                    </div>
                {/if}
                {#each overlaySliderItems as item (item.key)}
                    {#if item.enabled}
                        <div class="rounded-md bg-(--btn-regular-bg) p-2">
                            <div class="flex items-center justify-between mb-1">
                                <span class="text-sm font-medium text-(--btn-content) opacity-80">{item.label}</span>
                                <span class="text-xs text-(--btn-content)">{item.displayValue}</span>
                            </div>
                            <input
                                aria-label={item.ariaLabel}
                                type="range"
                                min={item.min}
                                max={item.max}
                                step={item.step}
                                value={item.value}
                                oninput={(e) => item.onValueChange(Number((e.currentTarget as HTMLInputElement).value))}
                                class="slider w-full overlay-slider"
                            />
                        </div>
                    {/if}
                {/each}
            </div>
        </div>
    {/if}

    <!-- Banner Settings Section -->
    {#if (wallpaperMode === WALLPAPER_BANNER || wallpaperMode === WALLPAPER_FULLSCREEN) && hasBannerSettings}
        <div
            class="mt-2 mb-2 mobile-settings-section"
            class:mobile-settings-section-hidden={mobileSettingsTab !== "wallpaper"}
        >
            <div class="flex gap-2 font-bold text-lg text-neutral-900 dark:text-neutral-100 transition relative ml-3 mb-2
                before:w-1 before:h-4 before:rounded-md before:bg-(--primary)
                before:absolute before:-left-3 before:top-1/2 before:-translate-y-1/2"
            >
                {i18n(I18nKey.wallpaperSettings)}
                <button aria-label="Reset to Default" class="btn-regular w-7 h-7 rounded-md  active:scale-90"
                        class:opacity-0={bannerSettingsIsDefault} class:pointer-events-none={bannerSettingsIsDefault} onclick={resetBannerSettings}>
                    <div class="text-(--btn-content)">
                        <Icon icon="fa7-solid:arrow-rotate-left" class="text-[0.875rem]"></Icon>
                    </div>
                </button>
            </div>
            <div class="space-y-1">
                {#if isBuiltInWallpaperSwitchable}
                <div class="space-y-2">
                    <div class="flex items-center gap-2 px-1 text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                        <Icon icon="material-symbols:imagesmode-outline-rounded" class="text-[1rem] shrink-0"></Icon>
                        <span>{i18n(I18nKey.builtinWallpaper)}</span>
                    </div>
                    <div class="wallpaper-picker-scroll hide-scrollbar grid max-h-64 grid-cols-3 gap-1.5 overflow-y-auto overscroll-contain pr-0.5">
                        {#each builtInWallpapers as wallpaper}
                            <button
                                type="button"
                                title={wallpaper.label}
                                aria-label={wallpaper.label}
                                class="wallpaper-picker-item relative aspect-video overflow-hidden rounded-md border-2 transition-all active:scale-95"
                                class:border-(--primary)={selectedWallpaperIndex === wallpaper.index}
                                class:border-transparent={selectedWallpaperIndex !== wallpaper.index}
                                class:ring-2={selectedWallpaperIndex === wallpaper.index}
                                class:ring-(--primary)={selectedWallpaperIndex === wallpaper.index}
                                class:ring-offset-1={selectedWallpaperIndex === wallpaper.index}
                                class:ring-offset-transparent={selectedWallpaperIndex === wallpaper.index}
                                onclick={() => selectBuiltInWallpaper(wallpaper.index)}
                            >
                                <img
                                    data-wallpaper-src={wallpaper.preview}
                                    alt=""
                                    class="absolute inset-0 h-full w-full object-cover"
                                    loading="lazy"
                                    decoding="async"
                                />
                            </button>
                        {/each}
                    </div>
                </div>
                {/if}
                <!-- Banner Title Switch -->
                {#if isBannerTitleSwitchable}
                <button
                    class="w-full btn-regular rounded-md py-2 px-3 flex items-center gap-3 text-left active:scale-95 transition-all relative overflow-hidden"
                    class:bg-(--btn-regular-bg-hover)={bannerTitleEnabled}
                    onclick={toggleBannerTitleEnabled}
                >
                    <Icon icon="material-symbols:titlecase-rounded" class="text-[1.25rem] shrink-0"></Icon>
                    <span class="text-sm flex-1">{i18n(I18nKey.wallpaperTitle)}</span>
                    <div class="w-10 h-5 rounded-full transition-all duration-200 relative"
                         class:bg-(--primary)={bannerTitleEnabled}
                         class:bg-(--btn-regular-bg-active)={!bannerTitleEnabled}>
                        <div class="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all duration-200"
                             class:left-0.5={!bannerTitleEnabled}
                             class:left-5={bannerTitleEnabled}></div>
                    </div>
                </button>
                {/if}
                <!-- Banner Carousel Switch -->
                {#if isBannerCarouselSwitchable}
                <button
                    class="w-full btn-regular rounded-md py-2 px-3 flex items-center gap-3 text-left active:scale-95 transition-all relative overflow-hidden"
                    class:bg-(--btn-regular-bg-hover)={bannerCarouselEnabled}
                    onclick={toggleBannerCarouselEnabled}
                >
                    <Icon icon="material-symbols:view-carousel-outline" class="text-[1.25rem] shrink-0"></Icon>
                    <span class="text-sm flex-1">{i18n(I18nKey.wallpaperCarousel)}</span>
                    <div class="w-10 h-5 rounded-full transition-all duration-200 relative"
                         class:bg-(--primary)={bannerCarouselEnabled}
                         class:bg-(--btn-regular-bg-active)={!bannerCarouselEnabled}>
                        <div class="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all duration-200"
                             class:left-0.5={!bannerCarouselEnabled}
                             class:left-5={bannerCarouselEnabled}></div>
                    </div>
                </button>
                {/if}
                <!-- Waves Animation Switch -->
                {#if isWavesSwitchable}
                <button
                    class="w-full btn-regular rounded-md py-2 px-3 flex items-center gap-3 text-left active:scale-95 transition-all relative overflow-hidden"
                    class:bg-(--btn-regular-bg-hover)={wavesEnabled}
                    onclick={toggleWavesEnabled}
                >
                    <Icon icon="material-symbols:airwave-rounded" class="text-[1.25rem] shrink-0"></Icon>
                    <span class="text-sm flex-1">{i18n(I18nKey.wavesAnimation)}</span>
                    <div class="w-10 h-5 rounded-full transition-all duration-200 relative"
                         class:bg-(--primary)={wavesEnabled}
                         class:bg-(--btn-regular-bg-active)={!wavesEnabled}>
                        <div class="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all duration-200"
                             class:left-0.5={!wavesEnabled}
                             class:left-5={wavesEnabled}></div>
                    </div>
                </button>
                {/if}
                <!-- Gradient Transition Switch -->
                {#if isGradientSwitchable}
                <button
                    class="w-full btn-regular rounded-md py-2 px-3 flex items-center gap-3 text-left active:scale-95 transition-all relative overflow-hidden"
                    class:bg-(--btn-regular-bg-hover)={gradientEnabled}
                    onclick={toggleGradientEnabled}
                >
                    <Icon icon="material-symbols:gradient" class="text-[1.25rem] shrink-0"></Icon>
                    <span class="text-sm flex-1">{i18n(I18nKey.gradientTransition)}</span>
                    <div class="w-10 h-5 rounded-full transition-all duration-200 relative"
                         class:bg-(--primary)={gradientEnabled}
                         class:bg-(--btn-regular-bg-active)={!gradientEnabled}>
                        <div class="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all duration-200"
                             class:left-0.5={!gradientEnabled}
                             class:left-5={gradientEnabled}></div>
                    </div>
                </button>
                {/if}
            </div>
        </div>
    {/if}

    <!-- Home Intro Settings Section -->
    <div
        class="mt-2 mb-2 mobile-settings-section"
        class:mobile-settings-section-hidden={mobileSettingsTab !== "preferences"}
    >
        <div class="flex items-center gap-2 font-bold text-lg text-neutral-900 dark:text-neutral-100 transition relative ml-3 mb-2
            before:w-1 before:h-4 before:rounded-md before:bg-(--primary)
            before:absolute before:-left-3 before:top-1/2 before:-translate-y-1/2"
        >
            开屏动画
            <span class="rounded-full bg-(--btn-regular-bg) px-2 py-0.5 text-[0.65rem] font-semibold leading-none text-(--primary)">
                主页切换可预览
            </span>
            <button
                type="button"
                aria-label="恢复开屏动画默认设置"
                class="btn-regular w-7 h-7 rounded-md active:scale-90"
                class:opacity-0={introSettingsIsDefault}
                class:pointer-events-none={introSettingsIsDefault}
                onclick={resetIntroSettings}
            >
                <div class="text-(--btn-content)">
                    <Icon icon="fa7-solid:arrow-rotate-left" class="text-[0.875rem]"></Icon>
                </div>
            </button>
        </div>
        <div class="space-y-2">
            <button
                type="button"
                aria-pressed={introEnabled}
                class="w-full btn-regular rounded-md py-2 px-3 flex items-center gap-3 text-left active:scale-95 touch-manipulation transition-all relative overflow-hidden"
                class:bg-(--btn-regular-bg-hover)={introEnabled}
                onclick={toggleIntroEnabled}
            >
                <Icon icon="material-symbols:play-arrow-rounded" class="text-[1.25rem] shrink-0"></Icon>
                <span class="text-sm flex-1">进入首页时播放</span>
                <div
                    class="w-10 h-5 rounded-full transition-all duration-200 relative"
                    class:bg-(--primary)={introEnabled}
                    class:bg-(--btn-regular-bg-active)={!introEnabled}
                >
                    <div
                        class="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all duration-200"
                        class:left-0.5={!introEnabled}
                        class:left-5={introEnabled}
                    ></div>
                </div>
            </button>
            <p class="-mt-1 mb-2 px-1 text-xs font-normal text-neutral-500 dark:text-neutral-400">
                在主页切换角色或横幅，会立即播放一次动画预览
            </p>
            <div class="flex items-center gap-2 px-1 text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                <Icon icon="material-symbols:person-outline-rounded" class="text-[1rem] shrink-0"></Icon>
                <span>选择开屏角色</span>
            </div>
            <div class="intro-character-picker grid grid-cols-3 gap-1.5" role="radiogroup" aria-label="选择开屏角色">
                {#each homePortfolioIntroSettings.characters as character}
                    <button
                        type="button"
                        title={character.label}
                        aria-label={character.label}
                        aria-pressed={selectedIntroCharacterId === character.id}
                        class="intro-character-picker-item relative flex aspect-[4/5] flex-col overflow-hidden rounded-lg border-2 transition-all active:scale-95"
                        class:border-(--primary)={selectedIntroCharacterId === character.id}
                        class:border-transparent={selectedIntroCharacterId !== character.id}
                        class:ring-2={selectedIntroCharacterId === character.id}
                        class:ring-(--primary)={selectedIntroCharacterId === character.id}
                        class:ring-offset-1={selectedIntroCharacterId === character.id}
                        class:ring-offset-transparent={selectedIntroCharacterId === character.id}
                        onclick={() => selectIntroCharacter(character.id)}
                    >
                        <img
                            src={character.thumbnail}
                            alt={character.label}
                            class="min-h-0 w-full flex-1 object-contain"
                            loading="lazy"
                            decoding="async"
                        />
                        <span class="relative shrink-0 bg-black/55 px-1 py-1 text-center text-[0.65rem] font-semibold text-white">
                            {character.label}
                        </span>
                    </button>
                {/each}
            </div>
            <div class="intro-banner-selection">
                <div class="mt-3 flex items-center gap-2 px-1 text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                    <Icon icon="material-symbols:image-outline" class="text-[1rem] shrink-0"></Icon>
                    <span>上半幅横幅</span>
                </div>
                <div class="intro-banner-picker grid grid-cols-2 gap-1.5" role="radiogroup" aria-label="选择上半幅横幅">
                    {#each homePortfolioIntroSettings.banners.desktop.top as banner}
                        <button
                            type="button"
                            title={banner.label}
                            aria-label={banner.label}
                            aria-pressed={selectedIntroTopBannerId === banner.id}
                            class="intro-banner-picker-item relative aspect-video cursor-pointer select-none touch-manipulation overflow-hidden rounded-lg border-2 transition-all active:scale-95"
                            class:border-(--primary)={selectedIntroTopBannerId === banner.id}
                            class:border-transparent={selectedIntroTopBannerId !== banner.id}
                            class:ring-2={selectedIntroTopBannerId === banner.id}
                            class:ring-(--primary)={selectedIntroTopBannerId === banner.id}
                            class:ring-offset-1={selectedIntroTopBannerId === banner.id}
                            class:ring-offset-transparent={selectedIntroTopBannerId === banner.id}
                            onclick={() => selectIntroBanner("top", banner.id)}
                        >
                            <img src={banner.src} alt={banner.label} class="pointer-events-none absolute inset-0 h-full w-full object-cover" loading="lazy" decoding="async" />
                            <span class="absolute inset-x-0 bottom-0 bg-black/55 px-1 py-1 text-center text-[0.6rem] font-semibold text-white">
                                {banner.label}
                            </span>
                        </button>
                    {/each}
                </div>
                <div class="mt-3 flex items-center gap-2 px-1 text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                    <Icon icon="material-symbols:image-outline" class="text-[1rem] shrink-0"></Icon>
                    <span>下半幅横幅</span>
                </div>
                <div class="intro-banner-picker grid grid-cols-2 gap-1.5" role="radiogroup" aria-label="选择下半幅横幅">
                    {#each homePortfolioIntroSettings.banners.desktop.bottom as banner}
                        <button
                            type="button"
                            title={banner.label}
                            aria-label={banner.label}
                            aria-pressed={selectedIntroBottomBannerId === banner.id}
                            class="intro-banner-picker-item relative aspect-video cursor-pointer select-none touch-manipulation overflow-hidden rounded-lg border-2 transition-all active:scale-95"
                            class:border-(--primary)={selectedIntroBottomBannerId === banner.id}
                            class:border-transparent={selectedIntroBottomBannerId !== banner.id}
                            class:ring-2={selectedIntroBottomBannerId === banner.id}
                            class:ring-(--primary)={selectedIntroBottomBannerId === banner.id}
                            class:ring-offset-1={selectedIntroBottomBannerId === banner.id}
                            class:ring-offset-transparent={selectedIntroBottomBannerId === banner.id}
                            onclick={() => selectIntroBanner("bottom", banner.id)}
                        >
                            <img src={banner.src} alt={banner.label} class="pointer-events-none absolute inset-0 h-full w-full object-cover" loading="lazy" decoding="async" />
                            <span class="absolute inset-x-0 bottom-0 bg-black/55 px-1 py-1 text-center text-[0.6rem] font-semibold text-white">
                                {banner.label}
                            </span>
                        </button>
                    {/each}
                </div>
            </div>
        </div>
    </div>

    <!-- Effects Settings Section -->
    {#if isSakuraSwitchable}
        <div
            class="mt-2 mb-2 mobile-settings-section"
            class:mobile-settings-section-hidden={mobileSettingsTab !== "preferences"}
        >
            <div class="flex gap-2 font-bold text-lg text-neutral-900 dark:text-neutral-100 transition relative ml-3 mb-2
                before:w-1 before:h-4 before:rounded-md before:bg-(--primary)
                before:absolute before:-left-3 before:top-1/2 before:-translate-y-1/2"
            >
                {i18n(I18nKey.effectsSettings)}
                <button aria-label="Reset to Default" class="btn-regular w-7 h-7 rounded-md  active:scale-90"
                        class:opacity-0={sakuraEnabled === defaultSakuraEnabled} class:pointer-events-none={sakuraEnabled === defaultSakuraEnabled} onclick={() => { sakuraEnabled = defaultSakuraEnabled; setSakuraEnabled(defaultSakuraEnabled); }}>
                    <div class="text-(--btn-content)">
                        <Icon icon="fa7-solid:arrow-rotate-left" class="text-[0.875rem]"></Icon>
                    </div>
                </button>
            </div>
            <div class="space-y-1">
                <button
                    type="button"
                    aria-pressed={sakuraEnabled}
                    class="w-full btn-regular rounded-md py-2 px-3 flex items-center gap-3 text-left active:scale-95 touch-manipulation transition-all relative overflow-hidden"
                    class:bg-(--btn-regular-bg-hover)={sakuraEnabled}
                    onclick={toggleSakuraEnabled}
                >
                    <Icon icon="mdi:flower-poppy" class="text-[1.25rem] shrink-0"></Icon>
                    <span class="text-sm flex-1">{i18n(I18nKey.sakuraEffect)}</span>
                    <div class="w-10 h-5 rounded-full transition-all duration-200 relative"
                         class:bg-(--primary)={sakuraEnabled}
                         class:bg-(--btn-regular-bg-active)={!sakuraEnabled}>
                        <div class="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all duration-200"
                             class:left-0.5={!sakuraEnabled}
                             class:left-5={sakuraEnabled}></div>
                    </div>
                </button>
            </div>
        </div>
    {/if}

    <!-- Layout Switch Section -->
    {#if allowLayoutSwitch}
        <div
            class="mt-2 mb-2 mobile-settings-section"
            class:mobile-settings-section-hidden={mobileSettingsTab !== "preferences"}
        >
            <div class="flex gap-2 font-bold text-lg text-neutral-900 dark:text-neutral-100 transition relative ml-3 mb-2
                before:w-1 before:h-4 before:rounded-md before:bg-(--primary)
                before:absolute before:-left-3 before:top-1/2 before:-translate-y-1/2"
            >
                {i18n(I18nKey.postListLayout)}
                <button aria-label="Reset to Default" class="btn-regular w-7 h-7 rounded-md  active:scale-90"
                        class:opacity-0={currentLayout === effectiveDefaultLayout} class:pointer-events-none={currentLayout === effectiveDefaultLayout} onclick={resetLayout}>
                    <div class="text-(--btn-content)">
                        <Icon icon="fa7-solid:arrow-rotate-left" class="text-[0.875rem]"></Icon>
                    </div>
                </button>
            </div>
            <div class="flex gap-2">
                <button
                    aria-label={i18n(I18nKey.postListLayoutList)}
                    class="flex-1 btn-regular rounded-md py-2 px-3 flex items-center justify-center gap-2 active:scale-95 transition-all relative overflow-hidden"
                    class:opacity-60={currentLayout !== 'list'}
                    class:bg-(--btn-regular-bg-hover)={currentLayout === 'list'}
                    disabled={isSwitching}
                    onclick={switchLayout}
                    title={i18n(I18nKey.postListLayoutList)}
                >
                    <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M4 6h16v2H4zm0 5h16v2H4zm0 5h16v2H4z"/>
                    </svg>
                    <span class="text-xs font-medium">{i18n(I18nKey.postListLayoutList)}</span>
                </button>
                <button
                    aria-label={i18n(I18nKey.postListLayoutGrid)}
                    class="flex-1 btn-regular rounded-md py-2 px-3 flex items-center justify-center gap-2 active:scale-95 transition-all relative overflow-hidden"
                    class:opacity-60={currentLayout !== 'grid'}
                    class:bg-(--btn-regular-bg-hover)={currentLayout === 'grid'}
                    disabled={isSwitching}
                    onclick={switchLayout}
                    title={i18n(I18nKey.postListLayoutGrid)}
                >
                    <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M3 3h7v7H3V3zm0 11h7v7H3v-7zm11-11h7v7h-7V3zm0 11h7v7h-7v-7z"/>
                    </svg>
                    <span class="text-xs font-medium">{i18n(I18nKey.postListLayoutGrid)}</span>
                </button>
            </div>
        </div>
    {/if}
</div>
{/if}


<style lang="stylus">
    :global(html.display-settings-open),
    :global(body.display-settings-open)
        overflow hidden
        overscroll-behavior none

    #display-setting
        .mobile-settings-nav
            position sticky
            top -0.5rem
            z-index 2
            display grid
            grid-template-columns repeat(3, minmax(0, 1fr))
            gap 0.35rem
            margin -0.1rem 0 0.65rem
            padding 0.55rem 0 0.5rem
            background var(--card-bg)
            box-shadow 0 7px 12px -12px rgba(15, 23, 42, 0.44)

        .mobile-settings-tab
            display flex
            min-height 2.5rem
            align-items center
            justify-content center
            gap 0.3rem
            border-radius 0.75rem
            background var(--btn-regular-bg)
            color var(--btn-content)
            font-size 0.78rem
            font-weight 700
            transition transform 160ms ease, background-color 160ms ease, color 160ms ease, box-shadow 160ms ease

            &:active
                transform scale(0.97)

            &.mobile-settings-tab-active
                background var(--primary)
                color white
                box-shadow unquote("0 7px 15px -9px hsla(var(--hue), 82%, 50%, 0.46)")

        .mobile-settings-section-hidden
            display none

        .wallpaper-picker-scroll
            contain layout paint style

        .wallpaper-picker-item
            contain layout paint
            content-visibility auto
            contain-intrinsic-size 48px

        .intro-character-picker-item
            contain layout paint
            background var(--btn-regular-bg)
            box-shadow 0 5px 12px -10px rgba(15, 23, 42, 0.8)

            img
                display block
                transition transform 220ms cubic-bezier(0.22, 1, 0.36, 1)

            &:hover img
                transform scale(1.045)

        .intro-banner-picker-item
            contain layout paint
            position relative
            z-index 3
            min-width 0
            min-height 4.25rem
            background var(--btn-regular-bg)
            box-shadow 0 5px 12px -10px rgba(15, 23, 42, 0.8)
            cursor pointer
            user-select none
            -webkit-user-select none
            -webkit-tap-highlight-color transparent
            touch-action manipulation
            pointer-events auto

            img
                display block
                transition transform 220ms cubic-bezier(0.22, 1, 0.36, 1)

            &:hover img
                transform scale(1.045)

        .intro-banner-picker
            position relative
            z-index 3
            touch-action pan-y
            user-select none
            -webkit-user-select none

        @media (max-width: 779px)
            position fixed !important
            top: unquote("calc(4.75rem + env(safe-area-inset-top, 0px))") !important
            right: unquote("max(0.75rem, env(safe-area-inset-right, 0px))") !important
            bottom auto !important
            left: unquote("max(0.75rem, env(safe-area-inset-left, 0px))") !important
            width auto !important
            max-width none !important
            height fit-content !important
            max-height: unquote("calc(100dvh - 5.5rem - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px))") !important
            overflow-x hidden !important
            overflow-y auto !important
            overscroll-behavior-y contain
            -webkit-overflow-scrolling touch
            touch-action pan-y
            z-index 60
            padding 0.65rem 0.75rem 0.85rem !important

            .mobile-settings-nav
                position sticky
                top -0.65rem
                z-index 2
                display grid
                grid-template-columns repeat(3, minmax(0, 1fr))
                gap 0.35rem
                margin -0.1rem 0 0.65rem
                padding 0.65rem 0 0.55rem
                background var(--card-bg)
                box-shadow 0 7px 12px -12px rgba(15, 23, 42, 0.44)

            .mobile-settings-tab
                display flex
                min-height 2.75rem
                align-items center
                justify-content center
                gap 0.3rem
                border-radius 0.75rem
                background var(--btn-regular-bg)
                color var(--btn-content)
                font-size 0.78rem
                font-weight 700
                transition transform 160ms ease, background-color 160ms ease, color 160ms ease, box-shadow 160ms ease

                &:active
                    transform scale(0.97)

                &.mobile-settings-tab-active
                    background var(--primary)
                    color white
                    box-shadow unquote("0 7px 15px -9px hsla(var(--hue), 82%, 50%, 0.46)")

            .mobile-settings-section-hidden
                display none

            /* 手机端固定使用默认上下横幅，不显示电脑端的横幅切换控件。 */
            .intro-banner-selection
                display none !important

            .wallpaper-picker-scroll
                max-height none !important
                overflow visible !important
                padding-right 0
                contain none

            .wallpaper-picker-item
                min-width 0
                aspect-ratio 16 / 9
                contain none
                content-visibility visible
                contain-intrinsic-size auto

                img
                    display block

        input[type="range"]
            -webkit-appearance none
            height 1.5rem
            border-radius 999px
            background-image unquote("linear-gradient(90deg, var(--primary) 0 var(--range-progress, 50%), hsla(var(--hue), 22%, 28%, 0.18) var(--range-progress, 50%) 100%)")
            transition background-image 0.15s ease-in-out

        input[type="range"].overlay-slider
            height 0.85rem

            /* Input Thumb */
            &::-webkit-slider-thumb
                -webkit-appearance none
                height 0
                width 0
                border 0
                border-radius 0
                background transparent
                box-shadow none

            &::-moz-range-thumb
                height 0
                width 0
                border 0
                border-radius 0
                background transparent
                box-shadow none

            &::-ms-thumb
                -webkit-appearance none
                height 0
                width 0
                border 0
                border-radius 0
                background transparent
                box-shadow none

        #colorSlider
            background-image var(--color-selection-bar)
            transition background-image 0.15s ease-in-out

            &::-webkit-slider-thumb
                -webkit-appearance none
                height 1rem
                width 0.5rem
                border-radius 0.125rem
                background rgba(255, 255, 255, 0.7)
                box-shadow none

                &:hover
                    background rgba(255, 255, 255, 0.8)

                &:active
                    background rgba(255, 255, 255, 0.6)

            &::-moz-range-thumb
                -webkit-appearance none
                height 1rem
                width 0.5rem
                border-radius 0.125rem
                border-width 0
                background rgba(255, 255, 255, 0.7)
                box-shadow none

                &:hover
                    background rgba(255, 255, 255, 0.8)

                &:active
                    background rgba(255, 255, 255, 0.6)

            &::-ms-thumb
                -webkit-appearance none
                height 1rem
                width 0.5rem
                border-radius 0.125rem
                background rgba(255, 255, 255, 0.7)
                box-shadow none

                &:hover
                    background rgba(255, 255, 255, 0.8)

                &:active
                    background rgba(255, 255, 255, 0.6)

</style>
