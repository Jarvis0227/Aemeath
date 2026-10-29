export {};

(() => {
	if (document.documentElement.dataset.nationalDayTheme === "true") {
		document.querySelectorAll("img[data-national-day-src]").forEach((image) => {
			const src = image.dataset.nationalDaySrc;
			if (src) image.setAttribute("src", src);
		});
	}

	const applyNationalDayStickerPositions = (decor) => {
		const useNationalDayPositions =
			document.documentElement.dataset.nationalDayTheme === "true";
		decor
			.querySelectorAll("[data-home-wallpaper-national-day-style]")
			.forEach((sticker) => {
				const style = sticker.getAttribute(
					useNationalDayPositions
						? "data-home-wallpaper-national-day-style"
						: "data-home-wallpaper-default-style",
				);
				if (!style) return;
				sticker.setAttribute("style", style);
				sticker.setAttribute("data-home-wallpaper-initial-style", style);
			});
	};

	const mobileStickerZones = [
		{ minX: 3, maxX: 24, minY: 18, maxY: 36 },
		{ minX: 76, maxX: 94, minY: 18, maxY: 36 },
		{ minX: 3, maxX: 23, minY: 51, maxY: 70 },
		{ minX: 77, maxX: 94, minY: 51, maxY: 70 },
		{ minX: 3, maxX: 22, minY: 38, maxY: 49 },
	];

	const shuffled = (items) => {
		const copy = [...items];
		for (let index = copy.length - 1; index > 0; index -= 1) {
			const swapIndex = Math.floor(Math.random() * (index + 1));
			[copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
		}
		return copy;
	};

	const randomizeMobileStickers = (decor) => {
		if (!window.matchMedia("(max-width: 767px)").matches) return;

		const wallpaper = decor.closest("#wallpaper-wrapper") || decor;
		const wallpaperRect = wallpaper.getBoundingClientRect();
		const stickers = [
			...decor.querySelectorAll(
				'[data-home-wallpaper-sticker][data-home-wallpaper-mobile="true"]',
			),
		].filter(
			(sticker) =>
				document.documentElement.dataset.nationalDayTheme !== "false" ||
				!sticker.classList.contains("home-wallpaper-sticker--anniversary-77"),
		);
		const availableZones =
			document.documentElement.dataset.nationalDayTheme === "false"
				? mobileStickerZones.slice(0, 4)
				: mobileStickerZones;
		if (
			!wallpaperRect.width ||
			!wallpaperRect.height ||
			stickers.length === 0
		) {
			return;
		}

		const fixedMobileStickers = stickers.filter(
			(sticker) => sticker.dataset.homeWallpaperMobileStyle,
		);
		fixedMobileStickers.forEach((sticker) => {
			const mobileStyle = sticker.dataset.homeWallpaperMobileStyle;
			if (mobileStyle) sticker.setAttribute("style", mobileStyle);
		});

		const mobileAnchoredStickers = stickers.filter(
			(sticker) =>
				sticker.dataset.homeWallpaperMobileAnchor === "home-wallpaper-card",
		);
		const card = decor.querySelector(".home-wallpaper-card");
		if (card) {
			const cardRect = card.getBoundingClientRect();
			mobileAnchoredStickers.forEach((sticker) => {
				const left =
					((cardRect.left - wallpaperRect.left + 8) / wallpaperRect.width) *
					100;
				const top =
					((cardRect.top - wallpaperRect.top + 8) / wallpaperRect.height) * 100;
				sticker.style.inset = "auto";
				sticker.style.left = `${left}%`;
				sticker.style.top = `${top}%`;
				sticker.style.right = "auto";
				sticker.style.bottom = "auto";
			});
		}

		const randomizedStickers = stickers.filter(
			(sticker) =>
				!sticker.dataset.homeWallpaperMobileStyle &&
				sticker.dataset.homeWallpaperMobileAnchor !== "home-wallpaper-card",
		);
		shuffled(randomizedStickers).forEach((sticker, index) => {
			const zone = availableZones[index % availableZones.length];
			const stickerRect = sticker.getBoundingClientRect();
			const stickerWidth = (stickerRect.width / wallpaperRect.width) * 100;
			const stickerHeight = (stickerRect.height / wallpaperRect.height) * 100;
			const maxLeft = Math.max(2, 96 - stickerWidth);
			const maxTop = Math.max(2, 96 - stickerHeight);
			const left = Math.min(
				maxLeft,
				zone.minX + Math.random() * (zone.maxX - zone.minX),
			);
			const top = Math.min(
				maxTop,
				zone.minY + Math.random() * (zone.maxY - zone.minY),
			);

			sticker.style.inset = "auto";
			sticker.style.left = `${left}%`;
			sticker.style.top = `${top}%`;
			sticker.style.right = "auto";
			sticker.style.bottom = "auto";
		});
	};

	const restoreDesktopStickerPositions = (decor) => {
		if (window.matchMedia("(max-width: 767px)").matches) return;
		decor
			.querySelectorAll("[data-home-wallpaper-initial-style]")
			.forEach((sticker) => {
				const initialStyle = sticker.getAttribute(
					"data-home-wallpaper-initial-style",
				);
				if (initialStyle) sticker.setAttribute("style", initialStyle);
			});
	};

	const bindMobileStickerLayout = (decor) => {
		const mediaQuery = window.matchMedia("(max-width: 767px)");
		const applyLayout = () => {
			if (mediaQuery.matches) {
				window.requestAnimationFrame(() => randomizeMobileStickers(decor));
			} else {
				restoreDesktopStickerPositions(decor);
			}
		};

		applyLayout();
		mediaQuery.addEventListener?.("change", applyLayout);
	};

	const themeLayoutEventKey = "__rainztNationalDayStickerLayoutBound";
	if (!window[themeLayoutEventKey]) {
		window[themeLayoutEventKey] = true;
		window.addEventListener("nationalDayThemeChange", () => {
			const decor = document.querySelector(".home-wallpaper-decor");
			if (!decor) return;
			applyNationalDayStickerPositions(decor);
			window.requestAnimationFrame(() => randomizeMobileStickers(decor));
		});
	}

	const waitForIntroCompletion = (callback) => {
		const intro = document.getElementById("home-portfolio-intro");
		if (!intro || intro.classList.contains("is-complete")) {
			callback();
			return;
		}

		let completed = false;
		const finish = () => {
			if (completed) return;
			completed = true;
			window.removeEventListener("home-portfolio-intro-complete", finish);
			callback();
		};

		window.addEventListener("home-portfolio-intro-complete", finish);
		window.requestAnimationFrame(() => {
			if (intro.classList.contains("is-complete")) finish();
		});
	};

	const revealHomeWallpaperDecor = (decor, replay = false) => {
		if (!(decor instanceof HTMLElement)) return;
		const wallpaper = decor.closest("#wallpaper-wrapper");

		if (replay) {
			decor.classList.remove("is-ready");
			wallpaper?.classList.remove("home-wallpaper-motion-ready");
			decor
				.querySelectorAll(".is-motion-settled")
				.forEach((element) => element.classList.remove("is-motion-settled"));
			void decor.offsetWidth;
		}

		if (!replay && decor.dataset.revealBound === "true") return;
		decor.dataset.revealBound = "true";
		if (decor.dataset.motionCleanupBound !== "true") {
			decor.dataset.motionCleanupBound = "true";
			decor.addEventListener("animationend", (event) => {
				if (
					event.target instanceof HTMLElement &&
					event.animationName.startsWith("home-wallpaper-")
				) {
					event.target.classList.add("is-motion-settled");
				}
			});
		}

		const images = [...decor.querySelectorAll("img")];
		const waitForImage = (image) => {
			if (image.complete) return Promise.resolve();

			return new Promise((resolve) => {
				let settled = false;
				const finish = () => {
					if (settled) return;
					settled = true;
					resolve();
				};

				image.addEventListener("load", finish, { once: true });
				image.addEventListener("error", finish, { once: true });
				window.setTimeout(finish, 1400);
			});
		};

		Promise.all(images.map(waitForImage)).then(() => {
			waitForIntroCompletion(() => {
				if (!decor.isConnected) return;
				window.requestAnimationFrame(() => {
					wallpaper?.classList.add("home-wallpaper-motion-ready");
					window.requestAnimationFrame(() => {
						decor.classList.add("is-ready");
					});
				});
			});
		});
	};

	const bindHomeWallpaperReveal = (decor) => {
		if (!(decor instanceof HTMLElement)) return;
		if (decor.dataset.modeRevealBound !== "true") {
			decor.dataset.modeRevealBound = "true";
			window.addEventListener("wallpaperModeChange", (event) => {
				const wallpaper = decor.closest("#wallpaper-wrapper");
				if (event.detail?.mode === "fullscreen") {
					revealHomeWallpaperDecor(decor, true);
				} else {
					decor.classList.remove("is-ready");
					wallpaper?.classList.remove("home-wallpaper-motion-ready");
				}
			});
		}

		revealHomeWallpaperDecor(decor);
	};

	const bindHomeWallpaperStickers = () => {
		const decor = document.querySelector(".home-wallpaper-decor");
		if (!decor || decor.getAttribute("data-stickers-bound") === "true") return;

		decor.setAttribute("data-stickers-bound", "true");
		applyNationalDayStickerPositions(decor);
		bindMobileStickerLayout(decor);
		bindHomeWallpaperReveal(decor);
		const wallpaper = decor.closest("#wallpaper-wrapper") || decor;
		const stickers = decor.querySelectorAll("[data-home-wallpaper-sticker]");

		stickers.forEach((sticker) => {
			let dragState = null;
			const isAvatarSticker = sticker.hasAttribute(
				"data-home-wallpaper-avatar-sticker",
			);

			sticker.addEventListener("pointerdown", (event) => {
				if (event.button !== 0 && event.pointerType !== "touch") return;

				const wallpaperRect = wallpaper.getBoundingClientRect();
				const stickerRect = sticker.getBoundingClientRect();
				const positioningParent = sticker.offsetParent;
				const positioningRect =
					positioningParent instanceof HTMLElement
						? positioningParent.getBoundingClientRect()
						: wallpaperRect;
				const baseTranslateX =
					Number.parseFloat(
						sticker.getAttribute("data-home-wallpaper-drag-x") || "0",
					) || 0;
				const baseTranslateY =
					Number.parseFloat(
						sticker.getAttribute("data-home-wallpaper-drag-y") || "0",
					) || 0;
				dragState = {
					startX: event.clientX,
					startY: event.clientY,
					isAvatarSticker,
					left: sticker.offsetLeft,
					top: sticker.offsetTop,
					positionWidth:
						positioningParent instanceof HTMLElement
							? positioningParent.clientWidth
							: wallpaper.clientWidth,
					positionHeight:
						positioningParent instanceof HTMLElement
							? positioningParent.clientHeight
							: wallpaper.clientHeight,
					minLeft: wallpaperRect.left - positioningRect.left,
					minTop: wallpaperRect.top - positioningRect.top,
					maxLeft:
						wallpaperRect.right - positioningRect.left - stickerRect.width,
					maxTop:
						wallpaperRect.bottom - positioningRect.top - stickerRect.height,
					translateX: baseTranslateX,
					translateY: baseTranslateY,
				};

				sticker.setPointerCapture?.(event.pointerId);
				sticker.classList.add("is-dragging");
				if (!isAvatarSticker) {
					sticker.style.left = `${dragState.left}px`;
					sticker.style.top = `${dragState.top}px`;
					sticker.style.right = "auto";
					sticker.style.bottom = "auto";
				}
				sticker.style.zIndex = "8";
			});

			sticker.addEventListener("pointermove", (event) => {
				if (!dragState) return;
				event.preventDefault();
				if (dragState.isAvatarSticker) {
					dragState.translateX =
						dragState.translateX + event.clientX - dragState.startX;
					dragState.translateY =
						dragState.translateY + event.clientY - dragState.startY;
					dragState.startX = event.clientX;
					dragState.startY = event.clientY;
					sticker.style.transform = `translate(${dragState.translateX}px, ${dragState.translateY}px)`;
					return;
				}
				const nextLeft = Math.min(
					dragState.maxLeft,
					Math.max(
						dragState.minLeft,
						dragState.left + event.clientX - dragState.startX,
					),
				);
				const nextTop = Math.min(
					dragState.maxTop,
					Math.max(
						dragState.minTop,
						dragState.top + event.clientY - dragState.startY,
					),
				);
				sticker.style.left = `${nextLeft}px`;
				sticker.style.top = `${nextTop}px`;
			});

			const stopDragging = (event) => {
				if (!dragState) return;
				if (sticker.hasPointerCapture?.(event.pointerId)) {
					sticker.releasePointerCapture?.(event.pointerId);
				}
				if (dragState.isAvatarSticker) {
					sticker.setAttribute(
						"data-home-wallpaper-drag-x",
						String(dragState.translateX),
					);
					sticker.setAttribute(
						"data-home-wallpaper-drag-y",
						String(dragState.translateY),
					);
				} else if (
					dragState.positionWidth > 0 &&
					dragState.positionHeight > 0
				) {
					const left =
						((Number.parseFloat(sticker.style.left) || 0) /
							dragState.positionWidth) *
						100;
					const top =
						((Number.parseFloat(sticker.style.top) || 0) /
							dragState.positionHeight) *
						100;
					const leftPercent = `${left.toFixed(4)}%`;
					const topPercent = `${top.toFixed(4)}%`;
					const positionStyle = `inset: ${topPercent} auto auto ${leftPercent};`;
					sticker.style.inset = "auto";
					sticker.style.left = leftPercent;
					sticker.style.top = topPercent;
					sticker.style.right = "auto";
					sticker.style.bottom = "auto";

					if (sticker.hasAttribute("data-home-wallpaper-initial-style")) {
						sticker.setAttribute(
							"data-home-wallpaper-initial-style",
							positionStyle,
						);
					}

					const modeStyleAttribute =
						document.documentElement.dataset.nationalDayTheme === "true"
							? "data-home-wallpaper-national-day-style"
							: "data-home-wallpaper-default-style";
					if (sticker.hasAttribute(modeStyleAttribute)) {
						sticker.setAttribute(modeStyleAttribute, positionStyle);
					}
				}
				dragState = null;
				sticker.classList.remove("is-dragging");
				sticker.style.zIndex = "";
			};

			sticker.addEventListener("pointerup", stopDragging);
			sticker.addEventListener("pointercancel", stopDragging);
		});
	};

	const bindHomeWallpaperCopyLinks = () => {
		const decor = document.querySelector(".home-wallpaper-decor");
		if (!(decor instanceof HTMLElement) || decor.dataset.copyBound === "true") {
			return;
		}

		const copyLinks = decor.querySelectorAll("[data-home-wallpaper-copy]");
		const toast = decor.querySelector("[data-home-wallpaper-copy-toast]");
		if (!(toast instanceof HTMLElement) || copyLinks.length === 0) return;

		decor.dataset.copyBound = "true";
		let toastTimer = 0;

		const showToast = (message, isError = false) => {
			toast.textContent = message;
			toast.classList.toggle("is-error", isError);
			toast.classList.add("is-visible");
			window.clearTimeout(toastTimer);
			toastTimer = window.setTimeout(() => {
				toast.classList.remove("is-visible");
			}, 1800);
		};

		copyLinks.forEach((copyLink) => {
			copyLink.addEventListener("click", async (event) => {
				event.preventDefault();
				const value = copyLink.getAttribute("data-home-wallpaper-copy")?.trim();
				if (!value) {
					showToast("复制失败，请手动复制", true);
					return;
				}

				let copied = false;
				try {
					await navigator.clipboard.writeText(value);
					copied = true;
				} catch {
					// Clipboard access can be denied or unavailable outside a secure context.
				}
				showToast(copied ? "已复制" : "复制失败，请手动复制", !copied);
			});
		});
	};

	bindHomeWallpaperStickers();
	bindHomeWallpaperCopyLinks();
	document.addEventListener("astro:page-load", bindHomeWallpaperStickers);
	document.addEventListener("astro:page-load", bindHomeWallpaperCopyLinks);
	document.addEventListener("swup:page:view", bindHomeWallpaperStickers);
	document.addEventListener("swup:page:view", bindHomeWallpaperCopyLinks);
})();
