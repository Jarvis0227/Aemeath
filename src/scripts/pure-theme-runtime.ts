import { applyThemeToDocument, setTheme } from "@/utils/setting-utils";

function initializePureRuntime() {
	if (document.documentElement.dataset.siteTheme !== "pure") return;

	const header = document.querySelector<HTMLElement>(".pure-header");
	let scrollFrame = 0;
	const syncReadingPosition = () => {
		scrollFrame = 0;
		const current = window.scrollY;
		const halo = document.querySelector<HTMLElement>(".pure-post-hero__halo");
		if (halo) {
			const progress = current / window.innerHeight;
			halo.style.opacity =
				progress < 1 / 9
					? "0.6"
					: progress < 2 / 9
						? "0.45"
						: progress < 1 / 3
							? "0.3"
							: "0.15";
		}
		if (
			!document.documentElement.dataset.pureHeaderFrom &&
			document.documentElement.dataset.pureNavigation !== "leaving"
		)
			header?.classList.toggle("is-scrolled", current > 20);
		header?.classList.remove("is-hidden");
	};
	window.addEventListener(
		"scroll",
		() => {
			if (!scrollFrame)
				scrollFrame = requestAnimationFrame(syncReadingPosition);
		},
		{ passive: true },
	);

	const menu = document.getElementById("pure-menu-switch");
	const navigation = document.getElementById("pure-navigation");
	syncReadingPosition();
	menu?.addEventListener("click", () => {
		const expanded = menu.getAttribute("aria-expanded") !== "true";
		menu.setAttribute("aria-expanded", String(expanded));
		menu.setAttribute("aria-label", expanded ? "收起导航" : "展开导航");
		navigation?.classList.toggle("is-expanded", expanded);
	});
	document
		.getElementById("pure-scheme-switch")
		?.addEventListener("click", () => {
			const mode = document.documentElement.classList.contains("dark")
				? "light"
				: "dark";
			try {
				setTheme(mode);
			} catch {
				applyThemeToDocument(mode);
			}
		});
	document.addEventListener("click", (event) => {
		if (!(event.target instanceof Element)) return;
		document
			.querySelectorAll<HTMLDetailsElement>(".pure-nav-group[open]")
			.forEach((group) => {
				if (!group.contains(event.target as Node)) group.open = false;
			});
	});
	document.addEventListener("keydown", (event) => {
		if (event.key !== "Escape") return;
		const expandedGroup = document.querySelector<HTMLDetailsElement>(
			".pure-nav-group[open]",
		);
		if (expandedGroup) {
			expandedGroup.open = false;
			expandedGroup.querySelector<HTMLElement>("summary")?.focus();
		} else if (menu?.getAttribute("aria-expanded") === "true") {
			menu.click();
			menu.focus();
		}
	});
}

export const initialized: Promise<void> = new Promise<void>((resolve) => {
	const initialize = () => {
		initializePureRuntime();
		resolve();
	};
	if (document.readyState === "loading") {
		document.addEventListener("DOMContentLoaded", initialize, { once: true });
	} else {
		initialize();
	}
});
