import type { SiteThemeConfig } from "@/types/siteThemeConfig";

// 站点布局主题，与浅色 / 深色模式分别保存。访客选择优先于默认值。
export const siteThemeConfig: SiteThemeConfig = {
	enabled: true,
	defaultTheme: "aemeath",
};
