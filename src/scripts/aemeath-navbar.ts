export {};

function loadButtonScript() {
	function setMobileMenuOpen(open: boolean) {
		const menuPanel = document.getElementById("nav-menu-panel");
		const menuButton = document.getElementById("nav-menu-switch");
		if (!menuPanel) return;

		if (!open) {
			menuPanel
				.querySelectorAll<HTMLElement>(".mobile-nav-group")
				.forEach((group) => {
					const expanded = group.classList.contains("mobile-nav-group-active");
					group.dataset.open = String(expanded);
					group
						.querySelector<HTMLButtonElement>(".mobile-group-title")
						?.setAttribute("aria-expanded", String(expanded));
					const panel = group.querySelector<HTMLElement>(".mobile-group-panel");
					panel?.toggleAttribute("inert", !expanded);
					if (expanded) panel?.removeAttribute("aria-hidden");
					else panel?.setAttribute("aria-hidden", "true");
				});
		}

		menuPanel.classList.toggle("float-panel-closed", !open);
		menuPanel.classList.toggle("active", open);
		menuPanel.setAttribute("aria-hidden", String(!open));
		document
			.getElementById("top-row")
			?.classList.toggle("mobile-nav-open", open);
		menuButton?.classList.toggle("active", open);
		menuButton?.setAttribute("aria-expanded", String(open));
		document.body.style.overflow = open ? "hidden" : "";
	}

	(
		window as Window & { __fireflySetMobileMenuOpen?: (open: boolean) => void }
	).__fireflySetMobileMenuOpen = setMobileMenuOpen;

	const settingBtn = document.getElementById("display-settings-switch");
	if (settingBtn) {
		settingBtn.onclick = () => {
			const settingPanel = document.getElementById("display-setting");
			if (settingPanel) {
				settingPanel.classList.toggle("float-panel-closed");
			}
		};
	}

	const menuBtn = document.getElementById("nav-menu-switch");
	if (menuBtn) {
		menuBtn.onclick = () => {
			const menuPanel = document.getElementById("nav-menu-panel");
			if (menuPanel) {
				setMobileMenuOpen(!menuPanel.classList.contains("active"));
			}
		};
	}

	const musicBtn = document.getElementById("music-player-switch");
	if (musicBtn) {
		musicBtn.onclick = () => {
			const musicPanel = document.getElementById("music-nav-panel");
			if (musicPanel) {
				musicPanel.classList.toggle("float-panel-closed");
			}
		};
	}

	// 背景视频播放器控制按钮
	const bgPlayerBtn = document.getElementById("bg-player-toggle");
	if (bgPlayerBtn) {
		bgPlayerBtn.onclick = () => {
			window.dispatchEvent(new CustomEvent("bg-player-toggle"));
		};
		window.addEventListener("bg-player-state-change", (e) => {
			var ce = e as CustomEvent;
			var playing = ce.detail && ce.detail.playing;
			var i18nPlay = bgPlayerBtn!.getAttribute("data-i18n-play") ?? "";
			var i18nPause = bgPlayerBtn!.getAttribute("data-i18n-pause") ?? "";
			var label = playing ? i18nPause : i18nPlay;
			bgPlayerBtn!.innerHTML = playing
				? '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="M16 19q-.825 0-1.412-.587T14 17V7q0-.825.588-1.412T16 5t1.413.588T18 7v10q0 .825-.587 1.413T16 19m-8 0q-.825 0-1.412-.587T6 17V7q0-.825.588-1.412T8 5t1.413.588T10 7v10q0 .825-.587 1.413T8 19"/></svg>'
				: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="M8 17.175V6.825q0-.425.3-.713t.7-.287q.125 0 .263.037t.262.113l8.15 5.175q.225.15.338.375t.112.475t-.112.475t-.338.375l-8.15 5.175q-.125.075-.262.113T9 18.175q-.4 0-.7-.288t-.3-.712"/></svg>';
			bgPlayerBtn!.setAttribute("title", label);
			bgPlayerBtn!.setAttribute("aria-label", label);
		});
		// 切换壁纸模式时隐藏/显示播放按钮
		window.addEventListener("wallpaperModeChange", (e) => {
			var ce = e as CustomEvent;
			var mode = ce.detail && ce.detail.mode;
			bgPlayerBtn!.style.display = mode === "none" ? "none" : "";
		});
		// Swup 导航时同步播放按钮状态（BackgroundPlayer 可能被重建，也可能持久存在）
		function syncBgPlayerBtn() {
			var playing = document.documentElement.hasAttribute(
				"data-bg-video-playing",
			);
			var i18nPlay = bgPlayerBtn!.getAttribute("data-i18n-play") ?? "";
			var i18nPause = bgPlayerBtn!.getAttribute("data-i18n-pause") ?? "";
			var label = playing ? i18nPause : i18nPlay;
			bgPlayerBtn!.innerHTML = playing
				? '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="M16 19q-.825 0-1.412-.587T14 17V7q0-.825.588-1.412T16 5t1.413.588T18 7v10q0 .825-.587 1.413T16 19m-8 0q-.825 0-1.412-.587T6 17V7q0-.825.588-1.412T8 5t1.413.588T10 7v10q0 .825-.587 1.413T8 19"/></svg>'
				: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="M8 17.175V6.825q0-.425.3-.713t.7-.287q.125 0 .263.037t.262.113l8.15 5.175q.225.15.338.375t.112.475t-.112.475t-.338.375l-8.15 5.175q-.125.075-.262.113T9 18.175q-.4 0-.7-.288t-.3-.712"/></svg>';
			bgPlayerBtn!.setAttribute("title", label);
			bgPlayerBtn!.setAttribute("aria-label", label);
		}
		if (window.swup && window.swup.hooks) {
			window.swup.hooks.on("content:replace", syncBgPlayerBtn);
		} else {
			document.addEventListener("swup:enable", () => {
				window.swup.hooks.on("content:replace", syncBgPlayerBtn);
			});
		}
	}

	const themeSwitchBtn = document.getElementById("scheme-switch");
	if (themeSwitchBtn) {
		themeSwitchBtn.onclick = () => {
			const themePanel = document.getElementById("theme-mode-panel");
			if (themePanel) {
				themePanel.classList.toggle("float-panel-closed");
			}
		};
	}

	document.addEventListener("click", (event) => {
		const panels = [
			"display-setting",
			"nav-menu-panel",
			"music-nav-panel",
			"theme-mode-panel",
		];
		const buttons = [
			"display-settings-switch",
			"nav-menu-switch",
			"music-player-switch",
			"scheme-switch",
		];

		panels.forEach((id, index) => {
			const panel = document.getElementById(id);
			const button = document.getElementById(buttons[index]);
			if (panel && button && !panel.classList.contains("float-panel-closed")) {
				if (
					event.target instanceof Node &&
					!panel.contains(event.target) &&
					!button.contains(event.target)
				) {
					if (id === "nav-menu-panel") {
						setMobileMenuOpen(false);
					} else {
						panel.classList.add("float-panel-closed");
					}
				}
			}
		});
	});
}

loadButtonScript();

const compactNavbarTransitionDuration = 320;
const compactNavbarFoldPoint = 0.54;
let compactNavbarModuleAnimations: Animation[] = [];
let compactNavbarAnimatedMenu: HTMLElement | null = null;

function cancelCompactNavbarModuleMotion() {
	compactNavbarModuleAnimations.forEach((animation) => animation.cancel());
	compactNavbarModuleAnimations = [];
	compactNavbarAnimatedMenu?.classList.remove("is-module-folding");
	compactNavbarAnimatedMenu = null;
}

function transitionCompactNavbarModules(
	navLinks: HTMLElement,
	expand: boolean,
	changeState: () => void,
) {
	const items = Array.from(
		navLinks.querySelectorAll<HTMLElement>(":scope > .dropdown-container"),
	);
	const active = navLinks.querySelector<HTMLElement>(
		":scope > .nav-compact-active",
	);
	const activeIndex = active ? items.indexOf(active) : -1;
	if (
		!navLinks.classList.contains("is-layout-ready") ||
		!active ||
		activeIndex < 0 ||
		window.innerWidth <= 1440 ||
		window.matchMedia("(prefers-reduced-motion: reduce)").matches
	) {
		cancelCompactNavbarModuleMotion();
		changeState();
		return;
	}

	const menuRect = navLinks.getBoundingClientRect();
	const menuCenter = menuRect.left + menuRect.width / 2;
	const currentOffsets = items.map((item) => {
		const rect = item.getBoundingClientRect();
		return rect.left + rect.width / 2 - menuCenter;
	});
	const currentOpacities = items.map((item) =>
		Number.parseFloat(getComputedStyle(item).opacity),
	);
	const expandedOffsets = items.map(
		(item) =>
			Number.parseFloat(
				item.style.getPropertyValue("--nav-item-expanded-offset"),
			) || 0,
	);
	const activeOffset = currentOffsets[activeIndex];
	const activeExpandedOffset = expandedOffsets[activeIndex];

	cancelCompactNavbarModuleMotion();
	changeState();
	const targetOffset = expand ? activeExpandedOffset : 0;
	if (
		Math.abs(activeOffset - targetOffset) < 2 &&
		items.every(
			(_, index) =>
				Math.abs(
					currentOffsets[index] - (expand ? expandedOffsets[index] : 0),
				) < 2,
		)
	)
		return;

	navLinks.classList.add("is-module-folding");
	compactNavbarAnimatedMenu = navLinks;
	const at = (offset: number) => `calc(50% + ${offset}px)`;
	const activeTransform = (offset: number) =>
		`translate(-50%, -50%) translateX(${offset}px)`;
	const slideEase = "cubic-bezier(0.4, 0, 0.2, 1)";
	const motion: KeyframeAnimationOptions = {
		duration: compactNavbarTransitionDuration,
		easing: "linear",
		fill: "forwards",
	};
	const activeFrames = expand
		? [
				{
					left: at(activeExpandedOffset),
					transform: activeTransform(activeOffset - activeExpandedOffset),
					offset: 0,
					easing: slideEase,
				},
				{
					left: at(activeExpandedOffset),
					transform: activeTransform(0),
					offset: 1 - compactNavbarFoldPoint,
					easing: slideEase,
				},
				{
					left: at(activeExpandedOffset),
					transform: activeTransform(0),
					offset: 1,
				},
			]
		: [
				{
					left: at(0),
					transform: activeTransform(activeOffset),
					offset: 0,
					easing: slideEase,
				},
				{
					left: at(0),
					transform: activeTransform(activeOffset),
					offset: compactNavbarFoldPoint,
					easing: slideEase,
				},
				{ left: at(0), transform: activeTransform(0), offset: 1 },
			];
	const activeAnimation = active.animate(activeFrames, motion);
	compactNavbarModuleAnimations = [
		activeAnimation,
		...items.flatMap((item, index) => {
			if (index === activeIndex) return [];
			const distance = Math.abs(index - activeIndex);
			const joinPoint = Math.min(0.51, 0.29 + distance * 0.03);
			const frames = expand
				? [
						{
							left: at(currentOffsets[index]),
							opacity: currentOpacities[index],
							offset: 0,
							easing: slideEase,
						},
						{
							left: at(activeExpandedOffset),
							opacity: 0,
							offset: 1 - compactNavbarFoldPoint,
						},
						{
							left: at(activeExpandedOffset),
							opacity: 0.12,
							offset: 1 - joinPoint,
							easing: slideEase,
						},
						{ left: at(expandedOffsets[index]), opacity: 1, offset: 1 },
					]
				: [
						{
							left: at(currentOffsets[index]),
							opacity: currentOpacities[index],
							offset: 0,
							easing: slideEase,
						},
						{ left: at(activeOffset), opacity: 0.12, offset: joinPoint },
						{
							left: at(activeOffset),
							opacity: 0,
							offset: compactNavbarFoldPoint,
							easing: slideEase,
						},
						{ left: at(0), opacity: 0, offset: 1 },
					];
			return [item.animate(frames, motion)];
		}),
	];
	activeAnimation.onfinish = () => {
		if (compactNavbarModuleAnimations[0] === activeAnimation)
			cancelCompactNavbarModuleMotion();
	};
}

function prepareCompactNavbarReveal(navLinks: HTMLElement) {
	const inactiveItem = navLinks.querySelector<HTMLElement>(
		":scope > .dropdown-container:not(.nav-compact-active)",
	);
	if (!inactiveItem) return;

	// If a collapse is interrupted, keep the visible items moving without
	// freezing their opacity while the menu reverses direction.
	if (Number.parseFloat(getComputedStyle(inactiveItem).opacity) > 0.08) {
		navLinks.style.setProperty("--nav-item-reveal-delay", "0ms");
		return;
	}

	const style = getComputedStyle(navLinks);
	const compactWidth = Number.parseFloat(
		style.getPropertyValue("--nav-links-compact-width"),
	);
	const expandedWidth = Number.parseFloat(
		style.getPropertyValue("--nav-links-expanded-width"),
	);
	const widthRange = expandedWidth - compactWidth;
	const progress =
		widthRange > 0
			? Math.min(
					1,
					Math.max(
						0,
						(navLinks.getBoundingClientRect().width - compactWidth) /
							widthRange,
					),
				)
			: 0;
	const revealDelay = Math.round(200 * (1 - Math.min(1, progress / 0.85)));
	navLinks.style.setProperty("--nav-item-reveal-delay", `${revealDelay}ms`);
}

function normalizeNavPath(path: string) {
	var pathname = (path || "/").split(/[?#]/)[0] || "/";
	try {
		if (/^https?:\/\//.test(pathname)) {
			pathname = new URL(pathname).pathname;
		}
	} catch (_) {}
	if (!pathname.startsWith("/")) pathname = "/" + pathname;
	var basePath = (import.meta.env.BASE_URL || "/").replace(/\/$/, "");
	if (basePath && basePath !== "/" && pathname.startsWith(basePath)) {
		pathname = pathname.slice(basePath.length) || "/";
	}
	return pathname.length > 1 ? pathname.replace(/\/+$/g, "") : "/";
}

function navPathMatches(currentPath: string, candidatePath: string) {
	if (!candidatePath) return false;
	if (candidatePath === "/") return currentPath === "/";
	return (
		currentPath === candidatePath || currentPath.startsWith(candidatePath + "/")
	);
}

function setCompactNavbarExpanded(
	navbar: HTMLElement,
	expand: boolean,
	revealSubmenu = false,
) {
	if (!navbar.classList.contains("scrolled")) return;
	const navLinks = navbar.querySelector<HTMLElement>(".nav-links");
	if (!navLinks || !navLinks.querySelector(".nav-compact-active .nav-link"))
		return;

	if (expand) {
		if (!navLinks.classList.contains("is-hover-expanded")) {
			compactNavbarMotionUntil =
				performance.now() + compactNavbarTransitionDuration;
			prepareCompactNavbarReveal(navLinks);
			transitionCompactNavbarModules(navLinks, true, () =>
				navLinks.classList.add("is-hover-expanded"),
			);
		}
		if (revealSubmenu) {
			const submenuDelay = Math.max(
				0,
				compactNavbarMotionUntil - performance.now(),
			);
			navLinks.style.setProperty(
				"--nav-submenu-reveal-delay",
				`${submenuDelay}ms`,
			);
			navLinks.classList.remove("is-scroll-revealed");
			navLinks.classList.add("is-active-submenu-open");
		} else {
			navLinks.classList.add("is-scroll-revealed");
			navLinks.classList.remove("is-active-submenu-open");
		}
	} else {
		compactNavbarMotionUntil = 0;
		navLinks.style.removeProperty("--nav-submenu-reveal-delay");
		setCompactNavbarSubmenu(navLinks, null);
		transitionCompactNavbarModules(navLinks, false, () => {
			navLinks.classList.remove(
				"is-hover-expanded",
				"is-active-submenu-open",
				"is-scroll-revealed",
			);
		});
	}
}

function updateNavbarMenuSizing() {
	const navbar = document.getElementById("navbar");
	const navLinks = navbar?.querySelector<HTMLElement>(".nav-links");
	if (!navbar || !navLinks) return;

	cancelCompactNavbarModuleMotion();

	const wasScrolled = navbar.classList.contains("scrolled");
	const hadStickyShadow = navbar.classList.contains("navbar-sticky-shadow");
	const previousStyle = navLinks.getAttribute("style");
	const navItems = Array.from(
		navLinks.querySelectorAll<HTMLElement>(".dropdown-container"),
	);
	const previousItemStyles = navItems.map((item) => item.getAttribute("style"));

	// Measure the complete menu offscreen so it also works at breakpoints where
	// the full desktop menu is hidden in favor of the existing mobile drawer.
	navbar.classList.remove("scrolled", "navbar-sticky-shadow");
	navLinks.style.setProperty("position", "fixed", "important");
	navLinks.style.setProperty("top", "0", "important");
	navLinks.style.setProperty("left", "-10000px", "important");
	navLinks.style.setProperty("display", "flex", "important");
	navLinks.style.setProperty("width", "max-content", "important");
	navLinks.style.setProperty("max-width", "none", "important");
	navLinks.style.setProperty("transform", "none", "important");
	navLinks.style.setProperty("visibility", "hidden", "important");
	navLinks.style.setProperty("pointer-events", "none", "important");
	navLinks.style.setProperty("transition", "none", "important");

	navItems.forEach((item) => {
		item.style.setProperty("position", "relative", "important");
		item.style.setProperty("top", "auto", "important");
		item.style.setProperty("left", "auto", "important");
		item.style.setProperty("display", "flex", "important");
		item.style.setProperty("opacity", "1", "important");
		item.style.setProperty("visibility", "visible", "important");
		item.style.setProperty("pointer-events", "auto", "important");
		item.style.setProperty("transform", "none", "important");
		item.style.setProperty("transition", "none", "important");
	});

	const expandedRect = navLinks.getBoundingClientRect();
	const expandedWidth = Math.ceil(expandedRect.width);
	const itemOffsets = navItems.map((item) => {
		const itemRect = item.getBoundingClientRect();
		return (
			itemRect.left +
			itemRect.width / 2 -
			(expandedRect.left + expandedRect.width / 2)
		);
	});
	const activeLink =
		navLinks.querySelector<HTMLElement>(".nav-link-active, .active") ||
		navLinks.querySelector<HTMLElement>(".nav-link");
	const rootFontSize =
		Number.parseFloat(getComputedStyle(document.documentElement).fontSize) ||
		16;
	const compactWidth = Math.ceil(
		(activeLink?.getBoundingClientRect().width || rootFontSize * 4) +
			rootFontSize * 0.48 +
			2,
	);

	if (previousStyle === null) navLinks.removeAttribute("style");
	else navLinks.setAttribute("style", previousStyle);
	navItems.forEach((item, index) => {
		const previousItemStyle = previousItemStyles[index];
		if (previousItemStyle === null) item.removeAttribute("style");
		else if (previousItemStyle !== undefined)
			item.setAttribute("style", previousItemStyle);
	});
	if (wasScrolled) navbar.classList.add("scrolled");
	if (hadStickyShadow) navbar.classList.add("navbar-sticky-shadow");

	navLinks.style.setProperty(
		"--nav-links-expanded-width",
		`${expandedWidth}px`,
	);
	navLinks.style.setProperty("--nav-links-compact-width", `${compactWidth}px`);

	navLinks
		.querySelectorAll(".nav-compact-active")
		.forEach((item) => item.classList.remove("nav-compact-active"));
	const compactLink =
		navLinks.querySelector<HTMLElement>(".nav-link-active, .active") ||
		navLinks.querySelector<HTMLElement>(".nav-link");
	compactLink
		?.closest(".dropdown-container")
		?.classList.add("nav-compact-active");
	navLinks
		.querySelectorAll<HTMLElement>(".dropdown-container")
		.forEach((item, index) => {
			item.style.setProperty(
				"--nav-item-expanded-offset",
				`${itemOffsets[index] || 0}px`,
			);
		});
	navLinks.classList.add("is-layout-ready");
}

function syncNavbarActiveState(pathname = window.location.pathname) {
	var currentPath = normalizeNavPath(pathname);

	document.querySelectorAll("[data-nav-item]").forEach((item) => {
		var paths = (item.getAttribute("data-active-paths") || "")
			.split("|")
			.filter(Boolean);
		var active = paths.some((path) => navPathMatches(currentPath, path));
		var link = item.querySelector(".navbar-link");
		if (!link) return;
		link.classList.toggle("nav-link-active", active);
		link.classList.toggle("active", active);
		if (active) {
			link.setAttribute("aria-current", "page");
		} else {
			link.removeAttribute("aria-current");
		}

		item
			.querySelectorAll<HTMLElement>(".dropdown-item[data-nav-active-paths]")
			.forEach((child) => {
				var childPaths = (child.getAttribute("data-nav-active-paths") || "")
					.split("|")
					.filter(Boolean);
				var childActive = childPaths.some((path) =>
					navPathMatches(currentPath, path),
				);
				child.classList.toggle("current-theme-btn", childActive);
				child.classList.toggle("dropdown-item-active", childActive);
				if (childActive) {
					child.setAttribute("aria-current", "page");
				} else {
					child.removeAttribute("aria-current");
				}
			});
	});

	document
		.querySelectorAll<HTMLElement>("[data-mobile-nav-item]")
		.forEach((item) => {
			var paths = (item.getAttribute("data-active-paths") || "")
				.split("|")
				.filter(Boolean);
			var active = paths.some((path) => navPathMatches(currentPath, path));
			if (item.classList.contains("mobile-link")) {
				item.classList.toggle("mobile-nav-active", active);
				if (active) {
					item.setAttribute("aria-current", "page");
				} else {
					item.removeAttribute("aria-current");
				}
			}
			if (item.classList.contains("mobile-nav-group")) {
				item.classList.toggle("mobile-nav-group-active", active);
				item.dataset.open = String(active);
				item
					.querySelector<HTMLButtonElement>(".mobile-group-title")
					?.setAttribute("aria-expanded", String(active));
				const panel = item.querySelector<HTMLElement>(".mobile-group-panel");
				panel?.toggleAttribute("inert", !active);
				if (active) panel?.removeAttribute("aria-hidden");
				else panel?.setAttribute("aria-hidden", "true");
			}
		});

	updateNavbarMenuSizing();
}

syncNavbarActiveState();
const syncNavbarActiveStateFromLocation = () => syncNavbarActiveState();
document.addEventListener("astro:page-load", syncNavbarActiveStateFromLocation);
document.addEventListener(
	"swup:contentReplaced",
	syncNavbarActiveStateFromLocation,
);

let navbarSwupHooksBound = false;
function bindNavbarSwupHooks() {
	if (navbarSwupHooksBound || !window.swup?.hooks) return;
	navbarSwupHooksBound = true;
	window.swup.hooks.on("visit:start", (visit: { to: { url: string } }) => {
		syncNavbarActiveState(new URL(visit.to.url, window.location.href).pathname);
	});
	window.swup.hooks.on("content:replace", syncNavbarActiveStateFromLocation);
	window.swup.hooks.on("page:view", syncNavbarActiveStateFromLocation);
}
bindNavbarSwupHooks();
document.addEventListener("swup:enable", bindNavbarSwupHooks);

const navbarForHover = document.getElementById("navbar");
const navLinksForHover =
	navbarForHover?.querySelector<HTMLElement>(".nav-links");
let compactNavbarHoldTimer: number | undefined;
let compactNavbarPointerActive = false;
let compactNavbarMotionUntil = 0;
function setCompactNavbarSubmenu(
	navLinks: HTMLElement,
	item: HTMLElement | null,
) {
	const dropdown =
		item?.matches(".dropdown-container") &&
		navLinks.contains(item) &&
		item.querySelector(".dropdown-menu")
			? item
			: null;
	const openDropdown = navLinks.querySelector<HTMLElement>(
		":scope > .dropdown-container.nav-submenu-open",
	);
	if (openDropdown === dropdown) return;

	openDropdown?.classList.remove("nav-submenu-open");
	if (!dropdown) return;

	const delay = Math.max(0, compactNavbarMotionUntil - performance.now());
	navLinks.style.setProperty("--nav-submenu-reveal-delay", `${delay}ms`);
	dropdown.classList.add("nav-submenu-open");
}
function clearCompactNavbarHold() {
	if (compactNavbarHoldTimer !== undefined) {
		window.clearTimeout(compactNavbarHoldTimer);
		compactNavbarHoldTimer = undefined;
	}
}

function keepCompactNavbarExpanded(navbar: HTMLElement, revealSubmenu = false) {
	if (!navbar.classList.contains("scrolled")) return;

	setCompactNavbarExpanded(
		navbar,
		true,
		revealSubmenu || compactNavbarPointerActive,
	);
	clearCompactNavbarHold();
	compactNavbarHoldTimer = window.setTimeout(() => {
		compactNavbarHoldTimer = undefined;
		const navLinks = navbar.querySelector<HTMLElement>(".nav-links");
		if (navLinks?.matches(":hover, :focus-within")) return;
		setCompactNavbarExpanded(navbar, false);
	}, 5000);
}

function collapseCompactNavbarWhenPointerLeaves(navbar: HTMLElement) {
	const navLinks = navbar.querySelector<HTMLElement>(".nav-links");
	if (
		!navbar.classList.contains("scrolled") ||
		!navLinks?.classList.contains("is-hover-expanded")
	)
		return;
	if (navLinks.matches(":hover, :focus-within")) return;

	compactNavbarPointerActive = false;
	setCompactNavbarSubmenu(navLinks, null);
	navLinks.classList.add("is-scroll-revealed");
	navLinks.classList.remove("is-active-submenu-open");
	clearCompactNavbarHold();
	compactNavbarHoldTimer = window.setTimeout(() => {
		compactNavbarHoldTimer = undefined;
		if (!navLinks.matches(":hover, :focus-within")) {
			setCompactNavbarExpanded(navbar, false);
		}
	}, 5000);
}

if (navbarForHover && navLinksForHover) {
	navLinksForHover.addEventListener("pointerenter", () => {
		keepCompactNavbarExpanded(navbarForHover, false);
	});
	navLinksForHover.addEventListener("pointerleave", () => {
		setCompactNavbarSubmenu(navLinksForHover, null);
		collapseCompactNavbarWhenPointerLeaves(navbarForHover);
	});
	navLinksForHover.addEventListener("pointermove", (event) => {
		const target = event.target;
		if (!(target instanceof Element)) return;

		if (!compactNavbarPointerActive) {
			compactNavbarPointerActive = true;
			keepCompactNavbarExpanded(navbarForHover, true);
		}
		if (!navbarForHover.classList.contains("scrolled")) return;
		setCompactNavbarSubmenu(
			navLinksForHover,
			target.closest<HTMLElement>(".dropdown-container"),
		);
	});
	navLinksForHover.addEventListener("focusin", (event) => {
		keepCompactNavbarExpanded(navbarForHover, true);
		const target = event.target;
		if (target instanceof Element) {
			setCompactNavbarSubmenu(
				navLinksForHover,
				target.closest<HTMLElement>(".dropdown-container"),
			);
		}
	});
	navLinksForHover.addEventListener("focusout", () => {
		requestAnimationFrame(() => {
			if (!compactNavbarPointerActive) {
				const focused = document.activeElement;
				setCompactNavbarSubmenu(
					navLinksForHover,
					focused instanceof Element
						? focused.closest<HTMLElement>(".dropdown-container")
						: null,
				);
			}
			collapseCompactNavbarWhenPointerLeaves(navbarForHover);
		});
	});
}

document.addEventListener("click", (event) => {
	var target = event.target;
	if (!(target instanceof Element)) return;
	var link = target.closest("a[href]");
	if (!link) return;
	var href = link.getAttribute("href") || "";
	if (!href || href.startsWith("#") || /^https?:\/\//.test(href)) return;
	window.setTimeout(syncNavbarActiveState, 80);
	window.setTimeout(syncNavbarActiveState, 240);
});
window.addEventListener("popstate", syncNavbarActiveStateFromLocation);
window.addEventListener("hashchange", syncNavbarActiveStateFromLocation);

let navbarMenuResizeFrame = 0;
window.addEventListener(
	"resize",
	() => {
		if (navbarMenuResizeFrame) cancelAnimationFrame(navbarMenuResizeFrame);
		navbarMenuResizeFrame = requestAnimationFrame(() => {
			navbarMenuResizeFrame = 0;
			updateNavbarMenuSizing();
		});
	},
	{ passive: true },
);

// 为semifull模式添加滚动检测逻辑
function initSemifullScrollDetection() {
	const navbar = document.getElementById("navbar");
	if (!navbar) return;

	const transparentMode = navbar.getAttribute("data-transparent-mode");
	const isStatic =
		document.documentElement.getAttribute("data-navbar-behavior") === "static";
	if (transparentMode !== "semifull" && !isStatic) return;

	cancelCompactNavbarModuleMotion();

	// 无论首页/非首页，semifull 都由滚动位置决定是否进入 scrolled 状态
	// 先移除之前的滚动监听器，避免重复绑定
	if (window.semifullScrollHandler) {
		window.removeEventListener(
			"scroll",
			window.semifullScrollHandler as () => void,
		);
		window.semifullScrollHandler = undefined;
	}

	clearCompactNavbarHold();
	const navLinks = navbar.querySelector<HTMLElement>(".nav-links");
	if (navLinks) setCompactNavbarSubmenu(navLinks, null);
	navLinks?.classList.remove(
		"is-hover-expanded",
		"is-active-submenu-open",
		"is-scroll-revealed",
	);
	navLinks?.style.removeProperty("--nav-submenu-reveal-delay");
	compactNavbarPointerActive = false;
	compactNavbarMotionUntil = 0;

	// 顶部与滚动态共用相同定位，切换时只改变横向偏移和可见性。
	navbar.classList.remove("scrolled");
	if (isStatic) return;

	let ticking = false;
	let lastScrollTop = window.pageYOffset || document.documentElement.scrollTop;

	function updateNavbarState() {
		if (
			document.documentElement.getAttribute("data-navbar-behavior") === "static"
		) {
			navbar!.classList.remove("scrolled");
			lastScrollTop = window.pageYOffset || document.documentElement.scrollTop;
			ticking = false;
			return;
		}
		if (document.documentElement.classList.contains("is-page-transitioning")) {
			cancelCompactNavbarModuleMotion();
			navbar!.classList.remove("scrolled");
			const navLinks = navbar!.querySelector<HTMLElement>(".nav-links");
			if (navLinks) setCompactNavbarSubmenu(navLinks, null);
			navLinks?.classList.remove(
				"is-hover-expanded",
				"is-active-submenu-open",
				"is-scroll-revealed",
			);
			navLinks?.style.removeProperty("--nav-submenu-reveal-delay");
			clearCompactNavbarHold();
			compactNavbarPointerActive = false;
			compactNavbarMotionUntil = 0;
			lastScrollTop = window.pageYOffset || document.documentElement.scrollTop;
			ticking = false;
			return;
		}

		const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
		const scrollDelta = scrollTop - lastScrollTop;
		const threshold = 50;
		const shouldCollapse = scrollTop > threshold;
		const isCollapsed = navbar!.classList.contains("scrolled");

		if (shouldCollapse !== isCollapsed) {
			if (!shouldCollapse && navLinks) prepareCompactNavbarReveal(navLinks);
			clearCompactNavbarHold();
			compactNavbarPointerActive = false;
			compactNavbarMotionUntil = 0;
			if (navLinks) setCompactNavbarSubmenu(navLinks, null);
			const changeState = () => {
				navLinks?.classList.remove(
					"is-hover-expanded",
					"is-active-submenu-open",
				);
				navLinks?.classList.toggle("is-scroll-revealed", shouldCollapse);
				navLinks?.style.removeProperty("--nav-submenu-reveal-delay");
				navbar!.classList.toggle("scrolled", shouldCollapse);
			};
			if (navLinks)
				transitionCompactNavbarModules(navLinks, !shouldCollapse, changeState);
			else changeState();
		}

		if (navbar!.classList.contains("scrolled") && scrollDelta < -2) {
			keepCompactNavbarExpanded(navbar!, false);
		}
		lastScrollTop = scrollTop;

		ticking = false;
	}

	function requestTick() {
		if (!ticking) {
			requestAnimationFrame(updateNavbarState);
			ticking = true;
		}
	}

	// 移除之前的滚动事件监听器（如果存在）
	if (window.semifullScrollHandler) {
		window.removeEventListener(
			"scroll",
			window.semifullScrollHandler as () => void,
		);
	}

	// 保存新的事件处理器引用
	window.semifullScrollHandler = requestTick as unknown as () => void;

	// 监听滚动事件
	window.addEventListener("scroll", requestTick, { passive: true });

	// 初始化状态
	updateNavbarState();
}

// 将函数暴露到全局对象，供页面切换时调用
window.initSemifullScrollDetection = initSemifullScrollDetection;
window.addEventListener("navbarBehaviorChange", initSemifullScrollDetection);

// 页面加载完成后初始化滚动检测
if (document.readyState === "loading") {
	document.addEventListener("DOMContentLoaded", initSemifullScrollDetection);
} else {
	initSemifullScrollDetection();
}
