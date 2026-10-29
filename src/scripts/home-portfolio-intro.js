export {};

(() => {
	const introWindow = window;
	if (introWindow.__homePortfolioIntroBound) return;
	introWindow.__homePortfolioIntroBound = true;

	let wasHome = false;
	let finishTimer = 0;
	let activeTimer = 0;
	let playbackToken = 0;
	let navbarRevealAnimation = null;
	const introSessionKey = "rainzt.home-portfolio-intro-seen.v1";
	const intro = document.getElementById("home-portfolio-intro");
	const introEnabledStorageKey =
		intro?.getAttribute("data-enabled-storage-key") ||
		"rainzt.home-portfolio-intro-enabled.v1";
	const introCharacterStorageKey =
		intro?.getAttribute("data-character-storage-key") ||
		"rainzt.home-portfolio-intro-character.v1";
	const introTopBannerStorageKey =
		intro?.getAttribute("data-top-banner-storage-key") ||
		"rainzt.home-portfolio-intro-top-banner.v1";
	const introBottomBannerStorageKey =
		intro?.getAttribute("data-bottom-banner-storage-key") ||
		"rainzt.home-portfolio-intro-bottom-banner.v1";
	const defaultCharacterId =
		intro?.getAttribute("data-default-character") || "character-03";
	const defaultTopBannerId =
		intro?.getAttribute("data-default-top-banner") || "wuthering";
	const defaultBottomBannerId =
		intro?.getAttribute("data-default-bottom-banner") || "wuthering";
	const defaultMobileTopBannerId =
		intro?.getAttribute("data-default-mobile-top-banner") || "wuthering";
	const defaultMobileBottomBannerId =
		intro?.getAttribute("data-default-mobile-bottom-banner") || "wuthering";
	const characterOptions = (() => {
		try {
			return JSON.parse(intro?.getAttribute("data-character-options") || "[]");
		} catch {
			return [];
		}
	})();
	const bannerOptions = (() => {
		try {
			return (
				JSON.parse(intro?.getAttribute("data-banner-options") || "{}") || {}
			);
		} catch {
			return {};
		}
	})();

	const readLocalStorage = (key) => {
		try {
			return window.localStorage.getItem(key);
		} catch {
			return null;
		}
	};

	const isIntroEnabled = () =>
		document.documentElement.dataset.siteTheme !== "pure" &&
		readLocalStorage(introEnabledStorageKey) !== "0";

	const getSelectedCharacter = () => {
		const selectedId =
			readLocalStorage(introCharacterStorageKey) || defaultCharacterId;
		return (
			characterOptions.find((character) => character.id === selectedId) ||
			characterOptions.find(
				(character) => character.id === defaultCharacterId,
			) ||
			characterOptions[0]
		);
	};

	const syncCharacter = (introElement) => {
		const character = getSelectedCharacter();
		const image = introElement?.querySelector(
			".home-portfolio-intro__character",
		);
		if (!character || !(image instanceof HTMLImageElement)) return;
		if (image.getAttribute("src") !== character.src)
			image.setAttribute("src", character.src);
		image.setAttribute("data-character-id", character.id);
	};

	const getSelectedBanner = (
		position,
		storageKey,
		defaultId,
		mobileDefaultId,
	) => {
		// 桌面和手机使用两套完全独立的资源。手机端只取 mobile 的默认项，
		// 不读取桌面端的 localStorage 选择，避免把宽幅横幅带到手机上。
		const isMobile = window.matchMedia?.("(max-width: 779px)").matches ?? false;
		const deviceOptions = bannerOptions?.[isMobile ? "mobile" : "desktop"];
		const options = Array.isArray(deviceOptions?.[position])
			? deviceOptions[position]
			: Array.isArray(bannerOptions?.[position])
				? bannerOptions[position]
				: [];
		const selectedDefaultId = isMobile ? mobileDefaultId : defaultId;
		const selectedId = isMobile
			? selectedDefaultId
			: readLocalStorage(storageKey) || selectedDefaultId;
		return (
			options.find((banner) => banner.id === selectedId) ||
			options.find((banner) => banner.id === selectedDefaultId) ||
			options[0]
		);
	};

	const syncBanner = (
		introElement,
		position,
		storageKey,
		defaultId,
		mobileDefaultId,
	) => {
		const banner = getSelectedBanner(
			position,
			storageKey,
			defaultId,
			mobileDefaultId,
		);
		const image = introElement?.querySelector(
			`.home-portfolio-intro__scene--${position}`,
		);
		if (!banner || !(image instanceof HTMLImageElement)) return;
		const source = image.closest("picture")?.querySelector("source");
		if (source && source.getAttribute("srcset") !== banner.src)
			source.setAttribute("srcset", banner.src);
		if (image.getAttribute("src") !== banner.src)
			image.setAttribute("src", banner.src);
		image.setAttribute("data-banner-id", banner.id);
	};

	const syncBanners = (introElement) => {
		syncBanner(
			introElement,
			"top",
			introTopBannerStorageKey,
			defaultTopBannerId,
			defaultMobileTopBannerId,
		);
		syncBanner(
			introElement,
			"bottom",
			introBottomBannerStorageKey,
			defaultBottomBannerId,
			defaultMobileBottomBannerId,
		);
	};

	const hasSeenIntro = () => {
		if (introWindow.__homePortfolioIntroSeen === true) return true;

		try {
			return window.sessionStorage.getItem(introSessionKey) === "1";
		} catch {
			return false;
		}
	};

	const markIntroSeen = () => {
		introWindow.__homePortfolioIntroSeen = true;
		try {
			window.sessionStorage.setItem(introSessionKey, "1");
		} catch {
			// If storage is unavailable, the in-memory flag still prevents a replay in this page session.
		}
	};

	const isHomePath = () => {
		const pathname = window.location.pathname.replace(/\/+$/, "") || "/";
		return pathname === "/";
	};

	const clearTimers = () => {
		if (activeTimer) window.clearTimeout(activeTimer);
		if (finishTimer) window.clearTimeout(finishTimer);
		activeTimer = 0;
		finishTimer = 0;
	};

	const cancelNavbarReveal = (navbar) => {
		if (navbarRevealAnimation) {
			const animation = navbarRevealAnimation;
			navbarRevealAnimation = null;
			animation.cancel();
		}
		navbar?.classList.remove("home-intro-navbar-revealing");
		navbar?.style.removeProperty("will-change");
	};

	const revealNavbar = (navbar) => {
		navbar.classList.add("home-intro-navbar-revealing");
		navbar.style.setProperty("will-change", "transform, opacity");

		// WAAPI gives this transition its own compositor timeline. It avoids the browser
		// collapsing the hidden and visible CSS states into one frame when the intro ends.
		const animation = navbar.animate(
			[
				{ opacity: 0, transform: "translate3d(0, -135%, 0)" },
				{ opacity: 0.76, transform: "translate3d(0, -23%, 0)", offset: 0.68 },
				{ opacity: 1, transform: "translate3d(0, 0, 0)" },
			],
			{
				duration: 1050,
				easing: "cubic-bezier(0.22, 1, 0.36, 1)",
				fill: "both",
			},
		);

		navbarRevealAnimation = animation;
		const cleanup = () => {
			if (navbarRevealAnimation !== animation) return;
			navbarRevealAnimation = null;
			navbar.classList.remove(
				"home-intro-navbar-reset",
				"home-intro-navbar-revealing",
			);
			navbar.style.removeProperty("will-change");
		};
		animation.onfinish = cleanup;
		animation.oncancel = cleanup;
	};

	const setDocumentLock = (locked) => {
		const navbar = document.getElementById("top-row");
		if (locked) {
			cancelNavbarReveal(navbar);
			navbar?.classList.remove("home-intro-navbar-reset");
			document.documentElement.classList.add("home-portfolio-intro-active");
			document.body.classList.add("home-portfolio-intro-active");
			return;
		}

		const wasLocked = document.documentElement.classList.contains(
			"home-portfolio-intro-active",
		);
		cancelNavbarReveal(navbar);
		navbar?.classList.add("home-intro-navbar-reset");
		document.documentElement.classList.remove("home-portfolio-intro-active");
		document.body.classList.remove("home-portfolio-intro-active");
		navbar?.classList.remove("home-intro-navbar-boot");
		if (!navbar) return;

		if (wasLocked) {
			revealNavbar(navbar);
			return;
		}

		void navbar.offsetWidth;
		window.requestAnimationFrame(() =>
			navbar.classList.remove("home-intro-navbar-reset"),
		);
	};

	const notifyIntroComplete = (intro) => {
		introWindow.dispatchEvent(
			new CustomEvent("home-portfolio-intro-complete", {
				detail: { intro },
			}),
		);
	};

	const waitForImage = (image) => {
		if (image.complete) {
			return typeof image.decode === "function"
				? image.decode().catch(() => undefined)
				: Promise.resolve();
		}

		return new Promise((resolve) => {
			const done = () => resolve();
			image.addEventListener("load", done, { once: true });
			image.addEventListener("error", done, { once: true });
		});
	};

	const waitForIntroAssets = (intro) => {
		const images = Array.from(intro.querySelectorAll("img"));
		const decoded = Promise.all(images.map(waitForImage));
		const fallback = new Promise((resolve) => window.setTimeout(resolve, 1800));
		return Promise.race([decoded, fallback]);
	};

	const resetIntro = (intro) => {
		playbackToken += 1;
		clearTimers();
		intro.classList.remove(
			"home-portfolio-intro--boot",
			"is-preparing",
			"is-playing",
			"is-finishing",
		);
		intro.classList.add("is-complete");
		intro.setAttribute("aria-hidden", "true");
		setDocumentLock(false);
	};

	const finishIntro = (intro, token) => {
		if (token !== playbackToken) return;
		intro.classList.add("is-finishing");
		finishTimer = window.setTimeout(() => {
			if (token !== playbackToken) return;
			intro.classList.remove(
				"home-portfolio-intro--boot",
				"is-preparing",
				"is-playing",
				"is-finishing",
			);
			intro.classList.add("is-complete");
			intro.setAttribute("aria-hidden", "true");
			setDocumentLock(false);
			notifyIntroComplete(intro);
		}, 1150);
	};

	const playIntro = async (intro, { force = false, markSeen = true } = {}) => {
		clearTimers();
		if (!isIntroEnabled() || (!force && hasSeenIntro())) {
			resetIntro(intro);
			notifyIntroComplete(intro);
			return;
		}

		syncCharacter(intro);
		syncBanners(intro);

		// Count a normal visit as soon as playback starts, so returning from another page never replays it.
		// Settings previews intentionally leave the visit marker untouched.
		if (markSeen) markIntroSeen();
		const token = ++playbackToken;
		intro.setAttribute("aria-hidden", "false");
		intro.classList.remove(
			"home-portfolio-intro--boot",
			"is-complete",
			"is-playing",
			"is-finishing",
		);
		intro.classList.add("is-preparing");
		setDocumentLock(true);
		await waitForIntroAssets(intro);

		if (token !== playbackToken || !isHomePath()) return;
		intro.classList.remove("is-preparing");
		void intro.offsetWidth;
		window.requestAnimationFrame(() => {
			if (token === playbackToken) intro.classList.add("is-playing");
		});
		// The two strips and their words arrive together, settle for a beat,
		// then the full-screen lift takes the whole composition away.
		activeTimer = window.setTimeout(() => finishIntro(intro, token), 4275);
	};

	const previewIntro = (intro) => {
		if (!isIntroEnabled() || !isHomePath()) return;
		wasHome = true;
		resetIntro(intro);
		void playIntro(intro, { force: true, markSeen: false });
	};

	const syncIntro = () => {
		const intro = document.getElementById("home-portfolio-intro");
		if (!intro) return;
		const onHome = isHomePath();
		if (
			onHome &&
			(intro.classList.contains("is-preparing") ||
				intro.classList.contains("is-playing"))
		) {
			syncCharacter(intro);
			syncBanners(intro);
		}
		if (!isIntroEnabled()) {
			resetIntro(intro);
			notifyIntroComplete(intro);
			wasHome = onHome;
			return;
		}
		if (onHome && !wasHome) {
			if (hasSeenIntro()) {
				resetIntro(intro);
				notifyIntroComplete(intro);
			} else {
				playIntro(intro);
			}
		} else if (!onHome && wasHome) {
			resetIntro(intro);
		}
		wasHome = onHome;
	};

	const scheduleSync = () => window.requestAnimationFrame(syncIntro);
	window.addEventListener("resize", scheduleSync, { passive: true });

	document.addEventListener("astro:page-load", scheduleSync);
	document.addEventListener("swup:contentReplaced", scheduleSync);
	document.addEventListener("swup:content:replace", scheduleSync);
	document.addEventListener("swup:page:view", scheduleSync);
	window.addEventListener("pageshow", scheduleSync);
	window.addEventListener("home-portfolio-intro-settings-change", (event) => {
		const intro = document.getElementById("home-portfolio-intro");
		if (!intro) return;
		if (
			isHomePath() &&
			(intro.classList.contains("is-preparing") ||
				intro.classList.contains("is-playing"))
		) {
			syncCharacter(intro);
			syncBanners(intro);
		}
		const detail = event instanceof CustomEvent ? event.detail : undefined;
		if (!isIntroEnabled()) {
			resetIntro(intro);
			notifyIntroComplete(intro);
			return;
		}
		if (detail?.preview && isHomePath()) {
			previewIntro(intro);
			return;
		}
		if (detail?.enabled === true && isHomePath()) {
			try {
				window.sessionStorage.removeItem(introSessionKey);
			} catch {
				// Storage can be unavailable in a privacy-restricted browser session.
			}
			introWindow.__homePortfolioIntroSeen = false;
			wasHome = false;
			syncIntro();
		}
	});

	const bindSwupHooks = () => {
		if (!window.swup?.hooks) return;
		window.swup.hooks.on("content:replace", scheduleSync);
		window.swup.hooks.on("page:view", scheduleSync);
	};

	bindSwupHooks();
	window.setTimeout(bindSwupHooks, 500);
	scheduleSync();
})();
