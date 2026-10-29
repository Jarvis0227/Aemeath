import type { ClientDirective } from "astro";
import type { SiteTheme } from "@/types/siteThemeConfig";

export interface ThemeDirectiveOptions {
	theme: SiteTheme;
	trigger?: string;
}

const themeDirective: ClientDirective = (load, options, element) => {
	const settings: ThemeDirectiveOptions =
		typeof options.value === "string"
			? { theme: options.value as SiteTheme }
			: options.value;
	if (document.documentElement.dataset.siteTheme !== settings.theme) return;
	const controller = new AbortController();
	let started = false;
	const hydrate = async () => {
		if (started) return;
		started = true;
		try {
			const run = await load();
			await run();
			controller.abort();
		} catch (error) {
			started = false;
			console.error("Theme component failed to initialize:", error);
		}
	};
	if (settings.trigger) {
		const onIntent = (event: Event) => {
			if (
				event.target instanceof Element &&
				event.target.closest(settings.trigger!)
			)
				void hydrate();
		};
		for (const event of ["pointerover", "pointerdown", "focusin", "click"]) {
			document.addEventListener(event, onIntent, {
				capture: true,
				signal: controller.signal,
			});
		}
	} else {
		const observer = new IntersectionObserver((entries) => {
			if (!entries.some((entry) => entry.isIntersecting)) return;
			observer.disconnect();
			void hydrate();
		});
		for (const child of element.children) observer.observe(child);
		controller.signal.addEventListener("abort", () => observer.disconnect(), {
			once: true,
		});
	}
	document.addEventListener(
		"astro:after-swap",
		() => {
			// Pure persists its header across navigation, including unopened controls.
			if (!element.isConnected) controller.abort();
		},
		{ signal: controller.signal },
	);
};

export default themeDirective;
