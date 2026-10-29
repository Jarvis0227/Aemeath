import "astro";
import type { ThemeDirectiveOptions } from "@/directives/theme";
import type { SiteTheme } from "./siteThemeConfig";

declare module "astro" {
	interface AstroClientDirectives {
		"client:theme"?: SiteTheme | ThemeDirectiveOptions;
	}
}
