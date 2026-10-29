import type { VisitorDefaultsSyncConfig } from "@/types/visitorDefaultsSyncConfig";
import { homePortfolioIntroSettings } from "./homePortfolioIntro";

/**
 * 本次访客外观默认值同步，只执行一次。
 * 只有站长明确要求再次同步时才更换 storageKey，不随主题版本或构建更新。
 * 清除旧偏好后，各设置继续读取现有的仓库默认配置。
 */
export const visitorDefaultsSyncConfig: VisitorDefaultsSyncConfig = {
	storageKey: "rainzt.visitor-defaults-sync.2026-10-06",
	preferenceKeys: [
		"theme",
		"hue",
		"themeColorPreset",
		"nationalDayThemeEnabled",
		"firefly-font-mode",
		"cardDecorationMode",
		"navbarBehaviorV2",
		"wallpaperMode",
		"selectedWallpaperIndex",
		"selectedWallpaperIndexSchemaVersion",
		"selectedWallpaperSourceByTheme.normal",
		"selectedWallpaperSourceByTheme.national-day",
		"customWallpaper",
		"overlayOpacity",
		"overlayBlur",
		"overlayCardOpacity",
		"wavesEnabled",
		"gradientEnabled",
		"bannerTitleEnabled",
		"bannerCarouselEnabled",
		"bannerCarouselEnabledByTheme.normal",
		"bannerCarouselEnabledByTheme.national-day",
		"sakuraEnabled",
		"postListLayout",
		homePortfolioIntroSettings.enabledStorageKey,
		homePortfolioIntroSettings.characterStorageKey,
		homePortfolioIntroSettings.topBannerStorageKey,
		homePortfolioIntroSettings.bottomBannerStorageKey,
	],
	sessionPreferenceKeys: ["rainzt.home-portfolio-intro-seen.v1"],
};
