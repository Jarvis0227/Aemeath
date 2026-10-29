import { applyStoredSelectedWallpaper } from "@/utils/setting-utils";

(function initBannerCarousel() {
	if (document.documentElement.dataset.siteTheme !== "aemeath") return;
	var container = document.getElementById("banner-images-container");
	if (!container || container.dataset.carouselBound === "true") return;
	container.dataset.carouselBound = "true";

	var WALLPAPER_BANNER = "banner";
	var interval = Number.parseInt(
		container.dataset.carouselInterval || "5000",
		10,
	);
	var switchable = container.dataset.carouselSwitchable === "true";
	var defaultEnabled = container.dataset.carouselEnabled === "true";
	var effect = container.dataset.carouselEffect || "fade";
	var FADE_MS = 800;
	var transitioning = false;
	var wallpaperWrapper = document.getElementById("wallpaper-wrapper");

	function syncOriginalWallpaperState(slide) {
		if (!wallpaperWrapper) return;
		wallpaperWrapper.dataset.originalWallpaperActive = String(
			!!(slide && slide.dataset.originalWallpaper === "true"),
		);
	}

	// 创建过渡遮罩（用于 kenburns 效果的 LQIP 桥接）
	var overlay = null;
	if (effect === "kenburns") {
		overlay = document.createElement("div");
		overlay.style.cssText =
			"position:absolute;inset:0;z-index:20;opacity:0;pointer-events:none;transition:opacity " +
			FADE_MS / 2 +
			"ms ease-in-out;background-size:cover;background-position:center;";
		container.appendChild(overlay);
	}

	// 从 slide-item 中提取 LQIP 渐变样式
	function getSlideLqipStyle(slide) {
		var ph = slide.querySelector(".lqip-placeholder");
		if (ph) {
			var bg = ph.style.background || ph.style.backgroundImage;
			if (bg) return bg;
		}
		return "#000";
	}

	function isCarouselEnabled() {
		var isNationalDay =
			document.documentElement.dataset.nationalDayTheme === "true";
		if (!switchable) return isNationalDay ? false : defaultEnabled;
		var modeKey =
			"bannerCarouselEnabledByTheme." +
			(isNationalDay ? "national-day" : "normal");
		var stored = null;
		try {
			stored = localStorage.getItem(modeKey);
			if (stored === null && !isNationalDay) {
				stored = localStorage.getItem("bannerCarouselEnabled");
			}
		} catch {
			return isNationalDay ? false : defaultEnabled;
		}
		if (stored === null) return isNationalDay ? false : defaultEnabled;
		return stored === "true";
	}

	function isBannerWallpaperMode() {
		var mode = document.documentElement.getAttribute("data-wallpaper-mode");
		return (
			mode === WALLPAPER_BANNER || mode === "fullscreen" || mode === "overlay"
		);
	}

	function isWallpaperVisible() {
		var intro = document.getElementById("home-portfolio-intro");
		var introPending =
			intro &&
			intro.classList.contains("home-portfolio-intro--boot") &&
			!document.documentElement.classList.contains(
				"home-portfolio-intro-disabled",
			) &&
			!document.documentElement.classList.contains("home-portfolio-intro-seen");
		return (
			document.documentElement.dataset.siteTheme === "aemeath" &&
			!document.documentElement.classList.contains(
				"home-portfolio-intro-active",
			) &&
			!introPending &&
			!document.hidden &&
			!wallpaperWrapper?.classList.contains("non-home-wallpaper-hidden") &&
			isBannerWallpaperMode()
		);
	}

	function isFixedWallpaperSelected() {
		var wrapper = document.getElementById("wallpaper-wrapper");
		return !!(wrapper && wrapper.hasAttribute("data-selected-wallpaper"));
	}

	// 获取当前设备可见的 slide-item
	function getVisibleSlides() {
		var all = container.querySelectorAll(".slide-item");
		var isLg = window.innerWidth >= 1024;
		var visible = [];
		for (var i = 0; i < all.length; i++) {
			var el = all[i];
			var isNationalDayWallpaper = el.dataset.originalWallpaper === "true";
			var isNationalDayTheme =
				document.documentElement.dataset.nationalDayTheme === "true";
			if (isNationalDayWallpaper !== isNationalDayTheme) continue;
			if (isLg && el.classList.contains("lg:hidden")) continue;
			if (
				!isLg &&
				el.classList.contains("hidden") &&
				!el.classList.contains("lg:hidden")
			)
				continue;
			visible.push(el);
		}
		if (visible.length === 0) {
			for (var j = 0; j < all.length; j++) {
				var isNationalDayWallpaper =
					all[j].dataset.originalWallpaper === "true";
				var isNationalDayTheme =
					document.documentElement.dataset.nationalDayTheme === "true";
				if (isNationalDayWallpaper === isNationalDayTheme) visible.push(all[j]);
			}
		}
		return visible;
	}

	function getCurrentIndex(slides) {
		for (var i = 0; i < slides.length; i++) {
			if (slides[i].classList.contains("active")) return i;
		}
		return 0;
	}

	function hasStoredWallpaperSelection(slides) {
		if (document.documentElement.dataset.nationalDayTheme !== "true")
			return false;
		try {
			if (
				localStorage.getItem("bannerCarouselEnabledByTheme.national-day") ===
				"true"
			) {
				return false;
			}
			var storedSource = localStorage.getItem(
				"selectedWallpaperSourceByTheme.national-day",
			);
			if (!storedSource) return false;
			return Array.prototype.some.call(slides, (slide) => {
				var img = slide.querySelector("img, picture img");
				return (
					img &&
					(img.getAttribute("data-src") === storedSource ||
						img.getAttribute("src") === storedSource)
				);
			});
		} catch {
			return false;
		}
	}

	function syncWallpaperFallback(slide) {
		if (!wallpaperWrapper || !slide) return;
		var img = slide.querySelector("img, picture img");
		var src = img && (img.getAttribute("data-src") || img.getAttribute("src"));
		var device = slide.dataset.wallpaperDevice;
		if (!src || !device) return;
		var theme =
			slide.dataset.originalWallpaper === "true" ? "national" : "normal";
		wallpaperWrapper.style.setProperty(
			"--wallpaper-fallback-" + theme + "-" + device,
			'url("' + src + '")',
		);
	}

	function randomizeNationalDayDesktopWallpaper() {
		if (document.documentElement.dataset.nationalDayTheme !== "true")
			return false;
		var desktopSlides = Array.prototype.filter.call(
			container.querySelectorAll(".slide-item"),
			(slide) =>
				slide.dataset.wallpaperDevice === "desktop" &&
				slide.dataset.originalWallpaper === "true",
		);
		if (desktopSlides.length <= 1 || hasStoredWallpaperSelection(desktopSlides))
			return false;
		var randomIndex = Math.floor(Math.random() * desktopSlides.length);
		desktopSlides.forEach((slide, index) => {
			slide.classList.toggle("active", index === randomIndex);
			slide.classList.remove("prev-waiting");
		});
		var selectedSlide = desktopSlides[randomIndex];
		syncWallpaperFallback(selectedSlide);
		if (window.innerWidth >= 1024) loadSlideImage(selectedSlide);
		syncOriginalWallpaperState(selectedSlide);
		return true;
	}

	var root = document.documentElement;
	var hasInitialSelection =
		root.dataset.initialWallpaperNational === root.dataset.nationalDayTheme;
	if (hasInitialSelection) {
		["desktop", "mobile"].forEach((device) => {
			var source =
				root.dataset[
					device === "desktop"
						? "initialWallpaperDesktop"
						: "initialWallpaperMobile"
				];
			var slides = Array.from(
				container.querySelectorAll(
					'.slide-item[data-wallpaper-device="' + device + '"]',
				),
			);
			var selected = slides.find((slide) => {
				var img = getSlideImage(slide);
				return (
					img &&
					(img.getAttribute("data-src") || img.getAttribute("src")) === source
				);
			});
			if (!selected) return;
			slides.forEach((slide) => {
				slide.classList.toggle("active", slide === selected);
			});
			syncWallpaperFallback(selected);
		});
	} else {
		randomizeNationalDayDesktopWallpaper();
	}
	// Restore a fixed wallpaper before any default slide starts downloading.
	applyStoredSelectedWallpaper();
	var initialSlides = getVisibleSlides();
	if (
		initialSlides.length &&
		!initialSlides.some((slide) => slide.classList.contains("active"))
	) {
		applySlideChange(initialSlides, 0);
	}
	loadSlideImage(initialSlides[getCurrentIndex(initialSlides)]);
	syncOriginalWallpaperState(initialSlides[getCurrentIndex(initialSlides)]);

	var prepareTimer = 0;
	var prepareIdle = 0;
	var prepareGeneration = 0;
	function cancelNextSlidePreparation() {
		prepareGeneration += 1;
		window.clearTimeout(prepareTimer);
		if (prepareIdle && window.cancelIdleCallback)
			window.cancelIdleCallback(prepareIdle);
		prepareTimer = 0;
		prepareIdle = 0;
	}

	function prepareNextSlide() {
		cancelNextSlidePreparation();
		if (!isWallpaperVisible()) return;
		var generation = prepareGeneration;
		var slides = getVisibleSlides();
		var current = getSlideImage(slides[getCurrentIndex(slides)]);
		var ready =
			current && current.decode
				? current.decode().catch(() => {})
				: Promise.resolve();
		ready.then(() => {
			if (generation !== prepareGeneration || !isWallpaperVisible()) return;
			// Keep the next wallpaper off the initial image/font request burst.
			prepareTimer = window.setTimeout(() => {
				prepareTimer = 0;
				if (generation !== prepareGeneration || !isWallpaperVisible()) return;
				var prepare = () => {
					prepareIdle = 0;
					if (generation === prepareGeneration && isWallpaperVisible())
						loadNextSlide();
				};
				if (window.requestIdleCallback) {
					prepareIdle = window.requestIdleCallback(prepare, { timeout: 1000 });
				} else {
					prepare();
				}
			}, 1500);
		});
	}

	function getSlideImage(slide) {
		return slide ? slide.querySelector("img, picture img") : null;
	}

	function loadSlideImage(slide) {
		if (
			document.documentElement.dataset.siteTheme !== "aemeath" ||
			!isBannerWallpaperMode() ||
			wallpaperWrapper?.classList.contains("non-home-wallpaper-hidden")
		)
			return null;
		var img = getSlideImage(slide);
		if (!img) return null;
		var deferredSrc = img.getAttribute("data-src");
		if (deferredSrc && !img.getAttribute("src")) {
			img.setAttribute("src", deferredSrc);
			img.removeAttribute("data-src");
		}
		return img;
	}

	if (wallpaperWrapper) {
		new MutationObserver(() => {
			if (!isWallpaperVisible()) {
				stopAutoPlay();
				return;
			}
			var slides = getVisibleSlides();
			loadSlideImage(slides[getCurrentIndex(slides)]);
			if (!appState.isPlaying) startAutoPlay();
		}).observe(wallpaperWrapper, {
			attributes: true,
			attributeFilter: ["class"],
		});
	}

	function loadNextSlide() {
		if (!isWallpaperVisible()) return;
		var slides = getVisibleSlides();
		if (slides.length <= 1) return;
		var nextIndex = getCurrentIndex(slides) + 1;
		if (nextIndex >= slides.length) nextIndex = 0;
		loadSlideImage(slides[nextIndex]);
	}

	function whenSlideImageReady(slide, callback) {
		var img = loadSlideImage(slide);
		if (!img || (img.complete && img.naturalWidth > 0)) {
			callback();
			return;
		}
		img.setAttribute("loading", "eager");
		var done = false;
		var finish = () => {
			if (done) return;
			done = true;
			callback();
		};
		img.addEventListener("load", finish, { once: true });
		img.addEventListener("error", finish, { once: true });
	}

	function applySlideChange(slides, nextIndex) {
		// Slide 效果需要 prev-waiting 辅助类
		if (effect === "slide") {
			for (var i = 0; i < slides.length; i++) {
				slides[i].classList.remove("prev-waiting");
				if (i < nextIndex) slides[i].classList.add("prev-waiting");
			}
		}
		for (var j = 0; j < slides.length; j++) {
			if (j === nextIndex) slides[j].classList.add("active");
			else slides[j].classList.remove("active");
		}
		loadSlideImage(slides[nextIndex]);
		syncOriginalWallpaperState(slides[nextIndex]);
	}

	function changeToSlide(targetIndex, resetProgress) {
		if (!isWallpaperVisible()) return;
		if (isFixedWallpaperSelected()) return;
		var slides = getVisibleSlides();
		if (slides.length <= 1) return;
		if (transitioning) return;

		var nextIndex = targetIndex;
		if (nextIndex >= slides.length) nextIndex = 0;
		else if (nextIndex < 0) nextIndex = slides.length - 1;

		var currentIndex = getCurrentIndex(slides);
		if (nextIndex === currentIndex) return;

		whenSlideImageReady(slides[nextIndex], () => {
			if (effect === "kenburns" && overlay) {
				// Ken Burns: 用下一张图的 LQIP 做桥接过渡
				transitioning = true;
				overlay.style.background = getSlideLqipStyle(slides[nextIndex]);
				overlay.style.opacity = "1";
				setTimeout(() => {
					applySlideChange(slides, nextIndex);
					// 等新图 Ken Burns 动画开始后再移除遮罩
					setTimeout(() => {
						overlay.style.opacity = "0";
						transitioning = false;
					}, 150);
				}, FADE_MS / 2);
			} else {
				// 其他效果：直接切换（CSS transition 处理）
				applySlideChange(slides, nextIndex);
			}
			prepareNextSlide();
		});

		if (resetProgress !== false && appState.isPlaying) {
			startAutoPlay();
		}
	}

	var appState = {
		isPlaying: false,
		autoPlayTimer: null,
		touchStartX: 0,
		touchEndX: 0,
	};

	function startAutoPlay() {
		stopAutoPlay();
		if (isFixedWallpaperSelected()) return;
		if (!isCarouselEnabled()) return;
		if (!isWallpaperVisible()) return;
		if (getVisibleSlides().length <= 1) return;

		appState.isPlaying = true;
		prepareNextSlide();
		appState.autoPlayTimer = setTimeout(function advance() {
			if (!appState.isPlaying) return;
			var slides = getVisibleSlides();
			var currentIdx = getCurrentIndex(slides);
			changeToSlide(currentIdx + 1, false);
			appState.autoPlayTimer = setTimeout(advance, interval);
		}, interval);
	}

	function stopAutoPlay() {
		cancelNextSlidePreparation();
		appState.isPlaying = false;
		if (appState.autoPlayTimer) {
			clearTimeout(appState.autoPlayTimer);
			appState.autoPlayTimer = null;
		}
	}

	// 键盘控制
	document.addEventListener("keydown", (e) => {
		var target = e.target;
		if (
			target instanceof HTMLInputElement ||
			target instanceof HTMLTextAreaElement ||
			target instanceof HTMLSelectElement ||
			(target instanceof HTMLElement && target.isContentEditable)
		)
			return;
		if (isFixedWallpaperSelected()) return;
		if (!isWallpaperVisible() || !isCarouselEnabled()) return;
		if (e.key === "ArrowRight") {
			var slides = getVisibleSlides();
			changeToSlide(getCurrentIndex(slides) + 1);
		} else if (e.key === "ArrowLeft") {
			var slides2 = getVisibleSlides();
			changeToSlide(getCurrentIndex(slides2) - 1);
		} else if (e.key === " ") {
			e.preventDefault();
			appState.isPlaying ? stopAutoPlay() : startAutoPlay();
		}
	});

	// 触屏滑动
	document.addEventListener(
		"touchstart",
		(e) => {
			if (isFixedWallpaperSelected()) return;
			appState.touchStartX = e.changedTouches[0].screenX;
		},
		{ passive: true },
	);
	document.addEventListener(
		"touchend",
		(e) => {
			if (isFixedWallpaperSelected()) return;
			if (!isWallpaperVisible() || !isCarouselEnabled()) return;
			appState.touchEndX = e.changedTouches[0].screenX;
			var diff = appState.touchEndX - appState.touchStartX;
			if (Math.abs(diff) > 50) {
				var slides = getVisibleSlides();
				if (diff > 0) changeToSlide(getCurrentIndex(slides) - 1);
				else changeToSlide(getCurrentIndex(slides) + 1);
			}
		},
		{ passive: true },
	);

	// 事件监听
	document.addEventListener("visibilitychange", () => {
		if (isWallpaperVisible()) startAutoPlay();
		else stopAutoPlay();
	});
	window.addEventListener("bannerCarouselChange", (e) => {
		if (isFixedWallpaperSelected()) {
			stopAutoPlay();
			return;
		}
		e.detail && e.detail.enabled ? startAutoPlay() : stopAutoPlay();
	});
	window.addEventListener("wallpaperModeChange", (e) => {
		if (
			e.detail &&
			(e.detail.mode === "banner" ||
				e.detail.mode === "fullscreen" ||
				e.detail.mode === "overlay")
		) {
			if (isCarouselEnabled()) startAutoPlay();
		} else {
			stopAutoPlay();
		}
	});
	window.addEventListener("selectedWallpaperChange", (e) => {
		if (e.detail && e.detail.selected) {
			var selectedSlides = getVisibleSlides();
			var selectedDisplayIndex =
				typeof e.detail.displayIndex === "number"
					? e.detail.displayIndex
					: e.detail.index;
			var selectedSlide = selectedSlides.find(
				(slide) =>
					Number.parseInt(slide.dataset.index || "-1", 10) ===
					selectedDisplayIndex,
			);
			syncOriginalWallpaperState(selectedSlide);
			stopAutoPlay();
			return;
		}
		var slides = getVisibleSlides();
		syncOriginalWallpaperState(slides[getCurrentIndex(slides)]);
		if (isCarouselEnabled() && isBannerWallpaperMode()) {
			startAutoPlay();
		}
	});

	window.addEventListener("nationalDayThemeChange", () => {
		randomizeNationalDayDesktopWallpaper();
		var themeSlides = getVisibleSlides();
		if (
			themeSlides.length &&
			!themeSlides.some((slide) => slide.classList.contains("active"))
		) {
			applySlideChange(themeSlides, 0);
			syncWallpaperFallback(themeSlides[0]);
		}
		loadSlideImage(themeSlides[getCurrentIndex(themeSlides)]);
		syncOriginalWallpaperState(themeSlides[getCurrentIndex(themeSlides)]);
		if (
			!isFixedWallpaperSelected() &&
			isCarouselEnabled() &&
			isBannerWallpaperMode()
		) {
			startAutoPlay();
		} else {
			stopAutoPlay();
		}
	});

	window.addEventListener("resize", () => {
		var slides = getVisibleSlides();
		if (isFixedWallpaperSelected()) {
			var selectedOrdinal = Number.parseInt(
				wallpaperWrapper.getAttribute("data-selected-wallpaper-ordinal") || "0",
				10,
			);
			if (slides.length) {
				applySlideChange(
					slides,
					Math.min(Math.max(selectedOrdinal, 0), slides.length - 1),
				);
			}
		} else if (
			slides.length &&
			!slides.some((slide) => slide.classList.contains("active"))
		) {
			applySlideChange(slides, 0);
		}
		loadSlideImage(slides[getCurrentIndex(slides)]);
		syncOriginalWallpaperState(slides[getCurrentIndex(slides)]);
		if (
			!isFixedWallpaperSelected() &&
			isCarouselEnabled() &&
			isBannerWallpaperMode()
		) {
			startAutoPlay();
		} else {
			stopAutoPlay();
		}
	});

	// 国庆桌面默认壁纸已在首次初始化时随机选择，后续设置恢复会保留当前图片。

	window.addEventListener("home-portfolio-intro-complete", () => {
		if (isCarouselEnabled()) startAutoPlay();
	});

	// 启动
	if (
		!isFixedWallpaperSelected() &&
		isCarouselEnabled() &&
		isBannerWallpaperMode()
	) {
		startAutoPlay();
	}
})();
