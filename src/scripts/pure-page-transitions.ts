import type {
	TransitionBeforePreparationEvent,
	TransitionBeforeSwapEvent,
} from "astro:transitions/client";
import { navigate } from "astro:transitions/client";

(() => {
	const root = document.documentElement;
	if (root.dataset.siteTheme !== "pure") return;
	root.dataset.pureMotion = "client";
	let navigationId = 0;
	let loadingTimer: number | undefined;

	const clearLoadingTimer = () => {
		if (loadingTimer !== undefined) window.clearTimeout(loadingTimer);
		loadingTimer = undefined;
	};

	const stopLoading = () => {
		clearLoadingTimer();
		delete root.dataset.pureLoading;
		const skeleton = document.getElementById("pure-loading");
		if (skeleton) skeleton.hidden = true;
		skeleton?.querySelector("[data-skeleton-content]")?.replaceChildren();
		document.querySelector(".pure-page")?.removeAttribute("aria-busy");
	};

	const startLoading = (destination: URL, id: number) => {
		stopLoading();
		document.querySelector(".pure-page")?.setAttribute("aria-busy", "true");
		loadingTimer = window.setTimeout(() => {
			loadingTimer = undefined;
			if (navigationId !== id) return;
			const skeleton = document.getElementById("pure-loading");
			if (!skeleton) return;
			const segments = destination.pathname.split("/").filter(Boolean);
			const route = segments[0] ?? "";
			const layouts: Record<string, string> = {
				posts: "post",
				analytics: "analytics",
				friends: "friends",
				archive: "archive",
				categories: "categories",
				tags: "tags",
				moments: "moments",
				tools: "tools",
				guestbook: "guestbook",
				about: "about",
				gallery: segments.length > 1 ? "album" : "gallery",
				anime: "media",
				bangumi: "media",
				bills: "bills",
				sponsor: "sponsor",
				lottie: "lottie",
				search: "search",
				changelog: "changelog",
				"blog-changelog": "changelog",
				rss: "rss",
				links: "portal",
				"404": "error",
				"404.html": "error",
			};
			const layout =
				layouts[route] ?? (!route || /^\d+$/.test(route) ? "list" : "page");
			const template = skeleton.querySelector<HTMLTemplateElement>(
				`template[data-skeleton-template="${layout}"]`,
			);
			const content = skeleton.querySelector("[data-skeleton-content]");
			if (!template || !content) return;
			content.replaceChildren(template.content.cloneNode(true));
			skeleton.dataset.layout = layout;
			skeleton.hidden = false;
			root.dataset.pureLoading = "true";
		}, 150);
	};

	const restoreHeader = () => {
		stopLoading();
		delete root.dataset.pureHeaderFrom;
		delete root.dataset.pureNavigation;
		document
			.querySelector(".pure-header")
			?.classList.toggle("is-scrolled", window.scrollY > 20);
	};

	const closeNavigation = () => {
		document
			.querySelectorAll<HTMLDetailsElement>(
				".pure-nav-group[open], .site-theme-switch[open]",
			)
			.forEach((group) => {
				group.open = false;
			});
		document.getElementById("pure-navigation")?.classList.remove("is-expanded");
		const menu = document.getElementById("pure-menu-switch");
		menu?.setAttribute("aria-expanded", "false");
		menu?.setAttribute("aria-label", "展开导航");
	};

	document.addEventListener("astro:before-preparation", (event) => {
		const preparation = event as TransitionBeforePreparationEvent;
		const id = ++navigationId;
		startLoading(preparation.to, id);
		const load = preparation.loader;
		preparation.loader = async () => {
			try {
				await load();
			} catch (error) {
				if (navigationId === id) restoreHeader();
				throw error;
			}
		};
		closeNavigation();
		root.dataset.pureHeaderFrom = document
			.querySelector(".pure-header")
			?.classList.contains("is-scrolled")
			? "floating"
			: "expanded";
		root.dataset.pureNavigation = "loading";
		document.dispatchEvent(new Event("swup:visit:start"));
		preparation.signal.addEventListener(
			"abort",
			() => {
				if (navigationId === id) restoreHeader();
			},
			{ once: true },
		);
	});

	document.addEventListener("astro:before-swap", (event) => {
		// A completed request must not start a late skeleton during the swap.
		clearLoadingTimer();
		const swap = event as TransitionBeforeSwapEvent;
		const next = swap.newDocument;
		const content = next.getElementById("swup-container");
		const mount = next.getElementById("pure-content");
		if (content && mount) {
			// Mount before the swap/snapshot, not in a script after first paint.
			mount.append(content);
			next.getElementById("aemeath-shell")?.setAttribute("inert", "");
		}
		const nextRoot = next.documentElement;
		for (const attribute of Array.from(root.attributes)) {
			if (
				attribute.name.startsWith("data-") &&
				!attribute.name.startsWith("data-astro-")
			)
				nextRoot.setAttribute(attribute.name, attribute.value);
		}
		nextRoot.style.cssText = root.style.cssText;
		nextRoot.classList.toggle("dark", root.classList.contains("dark"));
		nextRoot.classList.add("home-portfolio-intro-disabled");
		nextRoot.dataset.pureNavigation = "active";
		// The old snapshot can contain the skeleton; the incoming page is ready.
		delete nextRoot.dataset.pureLoading;
		nextRoot.dataset.pureShellReady = "true";
		// Keep the loaded theme styles in the head throughout the body swap.
		document
			.querySelectorAll('link[data-site-theme-stylesheet="pure"]')
			.forEach((stylesheet) => {
				next.head.append(stylesheet.cloneNode(true));
			});

		const header = document.querySelector(".pure-header");
		const nextHeader = next.querySelector(".pure-header");
		if (header && nextHeader) {
			// The header itself persists. Only update the current-route indicators.
			header.querySelectorAll("a[href]").forEach((link) => {
				const match = Array.from(nextHeader.querySelectorAll("a[href]")).find(
					(candidate) =>
						candidate.getAttribute("href") === link.getAttribute("href"),
				);
				const current = match?.getAttribute("aria-current");
				if (current) link.setAttribute("aria-current", current);
				else link.removeAttribute("aria-current");
			});
			header
				.querySelectorAll(".pure-nav-group > summary")
				.forEach((summary, index) => {
					summary.classList.toggle(
						"is-current",
						nextHeader
							.querySelectorAll(".pure-nav-group > summary")
							[index]?.classList.contains("is-current") ?? false,
					);
				});
		}
		const id = navigationId;
		const complete = () => {
			if (navigationId === id) restoreHeader();
		};
		swap.viewTransition.finished.then(complete, complete);
	});

	document.addEventListener("astro:after-swap", () => {
		document.dispatchEvent(new Event("swup:content:replace"));
	});
	document.addEventListener("astro:page-load", () => {
		root.dataset.purePageArrival = "client";
		document.dispatchEvent(new Event("swup:contentReplaced"));
		document.dispatchEvent(new Event("swup:page:view"));
	});

	const visit = (destination: URL) => {
		const request = navigate(destination.href);
		const id = navigationId;
		void request.catch((error) => {
			if (navigationId === id) restoreHeader();
			console.error("Pure navigation failed:", error);
		});
	};
	document.addEventListener("pure:navigate", (event) => {
		const detail = (event as CustomEvent<unknown>).detail;
		if (typeof detail !== "string") return;
		const destination = new URL(detail, location.href);
		if (
			destination.origin !== location.origin ||
			!/^https?:$/.test(destination.protocol)
		)
			return;
		event.preventDefault();
		visit(destination);
	});
	document.addEventListener("click", (event) => {
		if (
			event.defaultPrevented ||
			event.button !== 0 ||
			event.metaKey ||
			event.ctrlKey ||
			event.shiftKey ||
			event.altKey
		)
			return;
		const link =
			event.target instanceof Element
				? event.target.closest<HTMLAnchorElement>("a[href]")
				: null;
		if (
			!link ||
			link.hasAttribute("download") ||
			link.hasAttribute("data-astro-reload") ||
			(link.target && link.target !== "_self")
		)
			return;
		const destination = new URL(link.href, location.href);
		if (
			destination.origin !== location.origin ||
			!/^https?:$/.test(destination.protocol)
		)
			return;
		if (
			destination.pathname === location.pathname &&
			destination.search === location.search
		)
			return;
		if (
			/\.[a-z0-9]+$/i.test(destination.pathname) &&
			!/\.html?$/i.test(destination.pathname)
		)
			return;
		event.preventDefault();
		visit(destination);
	});
})();
