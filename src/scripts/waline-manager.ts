import { getIconSvg } from "@/constants/icons";
import {
	curatedLottieQqEmojiIds,
	featuredLottieEmojis,
	type LottieEmojiItem,
	qqLottieEmojiLabels,
} from "@/constants/lottieEmojis";
import { walineKaomoji } from "@/constants/walineKaomoji";

(() => {
	const runtimeWindow = window as typeof window & {
		__rainztWalineManagerStarted?: boolean;
	};
	if (runtimeWindow.__rainztWalineManagerStarted) return;
	runtimeWindow.__rainztWalineManagerStarted = true;

	const rootSelector = "[data-waline-root]";
	const localPreviewHosts = new Set([
		"localhost",
		"127.0.0.1",
		"::1",
		"0.0.0.0",
	]);
	const isLocalPreview =
		localPreviewHosts.has(window.location.hostname.toLowerCase()) ||
		window.location.protocol === "file:";

	const hideLocalPageviewCounters = () => {
		if (!isLocalPreview) return;
		document.documentElement.dataset.analyticsMode = "local";
		document
			.querySelectorAll<HTMLElement>(".waline-pageview-count")
			.forEach((element) => {
				element.parentElement?.setAttribute("hidden", "true");
			});
	};

	type WalineInit = typeof import("@waline/client").init;
	let walineModulePromise: Promise<WalineInit> | undefined;
	let activeInstance: ReturnType<WalineInit> | undefined;
	let activeRoot: HTMLElement | undefined;
	let pendingRoot: HTMLElement | undefined;
	let initGeneration = 0;
	let rootObserver: IntersectionObserver | undefined;
	let observedTarget: HTMLElement | undefined;
	let avatarPreviewCleanup: (() => void) | undefined;
	let pickerPositionCleanup: (() => void) | undefined;
	let emojiFallbackCleanup: (() => void) | undefined;
	let lottiePickerCleanup: (() => void) | undefined;
	let lottieCommentsCleanup: (() => void) | undefined;
	let commentPresentationCleanup: (() => void) | undefined;
	let ownedCommentFilterCleanup: (() => void) | undefined;
	let replyCollapseCleanup: (() => void) | undefined;
	let commentHintCleanup: (() => void) | undefined;
	let commentModeCleanup: (() => void) | undefined;
	let commentAnchorCleanup: (() => void) | undefined;
	let initQueued = false;

	const loadWaline = () => {
		walineModulePromise ??= import("@waline/client").then(({ init }) => init);
		return walineModulePromise;
	};

	type WalineRole = "ai" | "owner" | "admin" | "recommended";

	const roleLabels: Record<WalineRole, { label: string; title: string }> = {
		ai: { label: "AI", title: "由小爱客服自动回复" },
		owner: { label: "本站主理人", title: "本站主理人" },
		admin: { label: "管理员", title: "本站管理员" },
		recommended: {
			label: "推荐友链",
			title: "根据评论者填写的网站地址自动识别为本站推荐友链",
		},
	};

	const composerRoleLabels: Record<
		WalineRole,
		{ label: string; title: string }
	> = {
		ai: { label: "小爱客服 · AI 回复", title: "当前以小爱客服身份回复" },
		owner: {
			label: "本站主理人 · 正在评论",
			title: "当前以本站主理人身份评论",
		},
		admin: { label: "管理员 · 正在评论", title: "当前以本站管理员身份评论" },
		recommended: {
			label: "推荐友链 · 已识别",
			title: "已根据填写的网站地址识别为本站推荐友链",
		},
	};

	type WalineStoredUser = {
		display_name?: unknown;
		objectId?: unknown;
		token?: unknown;
		type?: unknown;
		url?: unknown;
	};

	type WalineUserSnapshot = {
		displayName: string;
		objectId: number;
		type: "administrator" | "guest";
		url: string;
	};

	const getStoredWalineUser = (
		loginNick: string,
	): WalineUserSnapshot | null => {
		const stores: Storage[] = [];
		try {
			stores.push(sessionStorage);
		} catch {
			// Storage can be unavailable in privacy-restricted browsing contexts.
		}
		try {
			stores.push(localStorage);
		} catch {
			// Keep the native editor usable when persistent storage is disabled.
		}

		const snapshots: WalineUserSnapshot[] = [];
		stores.forEach((store) => {
			try {
				const raw = store.getItem("WALINE_USER");
				if (!raw || raw === "null") return;

				const user = JSON.parse(raw) as WalineStoredUser;
				if (
					!user ||
					typeof user !== "object" ||
					typeof user.token !== "string" ||
					!user.token ||
					typeof user.display_name !== "string" ||
					typeof user.objectId !== "number" ||
					!Number.isInteger(user.objectId) ||
					(user.type !== "administrator" && user.type !== "guest")
				) {
					return;
				}

				snapshots.push({
					displayName: user.display_name.trim(),
					objectId: user.objectId,
					type: user.type,
					url: typeof user.url === "string" ? user.url : "",
				});
			} catch {
				// Ignore malformed or inaccessible Waline cache entries.
			}
		});

		return snapshots.find((user) => user.displayName === loginNick) || null;
	};

	type EmojiManifest = {
		prefix?: string;
		type?: string;
		items?: string[];
	};

	type LottieAnimation = {
		addEventListener: (eventName: string, callback: () => void) => void;
		destroy: () => void;
		goToAndStop?: (value: number, isFrame: boolean) => void;
		pause: () => void;
		play: () => void;
	};

	type LottieRuntime = {
		loadAnimation: (options: {
			autoplay: boolean;
			container: HTMLElement;
			loop: boolean;
			path: string;
			renderer: "canvas" | "svg";
			rendererSettings?: Record<string, unknown>;
		}) => LottieAnimation;
	};

	type LottieWindow = Window & {
		lottie?: LottieRuntime;
		__rainztLottieRuntimePromise?: Promise<LottieRuntime>;
	};

	const getQQAvatarUrl = (value: string) => {
		const match = value.trim().match(/^([1-9]\d{4,11})@qq\.com$/i);
		return match
			? `https://q1.qlogo.cn/headimg_dl?dst_uin=${match[1]}&spec=100`
			: "";
	};

	const setupAvatarPreview = (root: HTMLElement) => {
		let scheduled = false;
		let frameId: number | undefined;

		const updatePreview = () => {
			scheduled = false;

			const comment = root.querySelector<HTMLElement>(".wl-comment");
			const mailInput =
				root.querySelector<HTMLInputElement>('input[name="mail"]');
			if (!comment || !mailInput) return;

			let preview = comment.querySelector<HTMLElement>(
				"[data-waline-avatar-preview]",
			);
			if (!preview) {
				preview = document.createElement("div");
				preview.className = "wl-avatar waline-avatar-preview";
				preview.dataset.walineAvatarPreview = "true";
				preview.setAttribute("aria-hidden", "true");

				const image = document.createElement("img");
				image.alt = "";
				image.decoding = "async";
				image.referrerPolicy = "no-referrer";
				preview.append(image);
				comment.prepend(preview);
			}

			const image = preview.querySelector<HTMLImageElement>("img");
			if (!image) return;

			const avatarUrl = getQQAvatarUrl(mailInput.value);
			if (!avatarUrl) {
				preview.classList.remove("is-visible", "is-loading");
				delete preview.dataset.avatarSrc;
				image.removeAttribute("src");
				return;
			}

			if (preview.dataset.avatarSrc === avatarUrl) {
				if (image.complete && image.naturalWidth > 0) {
					preview.classList.remove("is-loading");
					preview.classList.add("is-visible");
				}
				return;
			}

			preview.dataset.avatarSrc = avatarUrl;
			preview.classList.remove("is-visible");
			preview.classList.add("is-loading");
			image.onload = () => {
				if (preview?.dataset.avatarSrc !== avatarUrl) return;
				preview.classList.remove("is-loading");
				preview.classList.add("is-visible");
			};
			image.onerror = () => {
				if (preview?.dataset.avatarSrc !== avatarUrl) return;
				preview.classList.remove("is-visible", "is-loading");
				delete preview.dataset.avatarSrc;
				image.removeAttribute("src");
			};
			image.src = avatarUrl;

			if (image.complete && image.naturalWidth > 0)
				image.onload?.(new Event("load"));
		};

		const schedulePreviewUpdate = () => {
			if (scheduled) return;
			scheduled = true;
			frameId = requestAnimationFrame(updatePreview);
		};

		const onMailChange = (event: Event) => {
			const target = event.target;
			if (target instanceof HTMLInputElement && target.name === "mail") {
				schedulePreviewUpdate();
			}
		};

		root.addEventListener("input", onMailChange);
		root.addEventListener("change", onMailChange);

		const observer = new MutationObserver(schedulePreviewUpdate);
		observer.observe(root, { childList: true, subtree: true });
		schedulePreviewUpdate();

		return () => {
			observer.disconnect();
			root.removeEventListener("input", onMailChange);
			root.removeEventListener("change", onMailChange);
			if (frameId !== undefined) cancelAnimationFrame(frameId);
		};
	};

	const setupCommentAnchorNavigation = (root: HTMLElement) => {
		let disposed = false;
		let frameId: number | undefined;
		let resolvedId = "";
		let lastItemCount = -1;
		let loadAttempts = 0;

		const getCommentId = () => {
			if (!window.location.hash) return "";
			try {
				const value = decodeURIComponent(window.location.hash.slice(1)).trim();
				return /^(?:\d+|[a-f\d]{16,64})$/iu.test(value) ? value : "";
			} catch {
				return "";
			}
		};

		const navigateToComment = () => {
			frameId = undefined;
			if (disposed) return;
			const commentId = getCommentId();
			if (!commentId || commentId === resolvedId) return;

			const target = document.getElementById(commentId);
			if (target instanceof HTMLElement) {
				if (
					!root.contains(target) ||
					!target.classList.contains("wl-card-item")
				)
					return;
				resolvedId = commentId;
				target.scrollIntoView({
					behavior: window.matchMedia("(prefers-reduced-motion: reduce)")
						.matches
						? "auto"
						: "smooth",
					block: "center",
				});
				return;
			}

			const itemCount = root.querySelectorAll(".wl-card-item").length;
			const loadMore = root.querySelector<HTMLButtonElement>(
				".wl-cards ~ .wl-operation > .wl-btn",
			);
			if (
				loadMore &&
				itemCount > 0 &&
				itemCount !== lastItemCount &&
				loadAttempts < 20
			) {
				lastItemCount = itemCount;
				loadAttempts += 1;
				loadMore.click();
			}
		};

		const schedule = () => {
			if (disposed || frameId !== undefined) return;
			frameId = requestAnimationFrame(navigateToComment);
		};
		const reset = () => {
			resolvedId = "";
			lastItemCount = -1;
			loadAttempts = 0;
			schedule();
		};

		const observer = new MutationObserver(schedule);
		observer.observe(root, { childList: true, subtree: true });
		window.addEventListener("hashchange", reset);
		schedule();

		return () => {
			disposed = true;
			observer.disconnect();
			window.removeEventListener("hashchange", reset);
			if (frameId !== undefined) cancelAnimationFrame(frameId);
		};
	};

	const setupPickerPositioning = (root: HTMLElement) => {
		const pickerSelector = ".wl-emoji-popup, .wl-gif-popup";
		const openUpwardClass = "waline-picker-open-upward";

		const clearLegacyDirection = () => {
			root.querySelectorAll<HTMLElement>(pickerSelector).forEach((picker) => {
				picker.classList.remove(openUpwardClass);
			});
		};

		// Pickers now stay in document flow, so viewport-based upward positioning is unnecessary.
		clearLegacyDirection();
		root.addEventListener("click", clearLegacyDirection);

		return () => {
			root.removeEventListener("click", clearLegacyDirection);
		};
	};

	/* Add the local Lottie library as a fourth tab inside Waline's native emoji
	 * picker. Players are created only for visible cells and stay on frame zero
	 * until their button is hovered or keyboard-focused. */
	const setupLottieEmojiPicker = (root: HTMLElement) => {
		const runtimePath = `${import.meta.env.BASE_URL}assets/lottie-web-5.12.2.min.js`;
		const animationBasePath = `${import.meta.env.BASE_URL}lottie/`;
		const indexPath = `${import.meta.env.BASE_URL}lottie/qq-index.json`;
		const runtimeWindow = window as LottieWindow;
		const animations = new Map<HTMLElement, LottieAnimation>();
		const loadingAnimations = new Set<HTMLElement>();
		let pickerItems: LottieEmojiItem[] = [...featuredLottieEmojis];
		let itemsLoaded = false;
		let itemsPromise: Promise<void> | undefined;
		let runtimePromise: Promise<LottieRuntime> | undefined;
		let scanFrame: number | undefined;
		let disposed = false;

		type PickerState = {
			count: HTMLElement;
			grid: HTMLElement;
			handleInput: () => void;
			handlePanelClick: (event: MouseEvent) => void;
			handlePanelFocusIn: (event: FocusEvent) => void;
			handlePanelFocusOut: (event: FocusEvent) => void;
			handlePanelMouseDown: (event: MouseEvent) => void;
			handlePanelMouseOut: (event: MouseEvent) => void;
			handlePanelMouseOver: (event: MouseEvent) => void;
			handlePopupClick: (event: MouseEvent) => void;
			handleKaomojiClick: (event: MouseEvent) => void;
			handleKaomojiMouseDown: (event: MouseEvent) => void;
			input: HTMLInputElement;
			kaomojiPanel: HTMLElement;
			kaomojiLive: HTMLElement;
			kaomojiTab?: HTMLButtonElement;
			live: HTMLElement;
			panel: HTMLElement;
			popup: HTMLElement;
			renderFrame?: number;
			tab?: HTMLButtonElement;
		};

		const states = new Map<HTMLElement, PickerState>();
		const prefersReducedMotion = () =>
			window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

		const loadRuntime = () => {
			if (runtimeWindow.lottie) return Promise.resolve(runtimeWindow.lottie);
			if (runtimePromise) return runtimePromise;
			if (runtimeWindow.__rainztLottieRuntimePromise) {
				runtimePromise = runtimeWindow.__rainztLottieRuntimePromise;
				return runtimePromise;
			}

			runtimePromise = new Promise<LottieRuntime>((resolve, reject) => {
				const existingScript = document.querySelector<HTMLScriptElement>(
					"script[data-rainzt-lottie-runtime]",
				);
				const script = existingScript || document.createElement("script");
				const handleLoad = () => {
					if (runtimeWindow.lottie) resolve(runtimeWindow.lottie);
					else reject(new Error("Lottie runtime loaded without a global API"));
				};
				const handleError = () =>
					reject(new Error("Failed to load the local Lottie runtime"));

				script.addEventListener("load", handleLoad, { once: true });
				script.addEventListener("error", handleError, { once: true });
				if (!existingScript) {
					script.src = runtimePath;
					script.async = true;
					script.dataset.rainztLottieRuntime = "true";
					document.head.appendChild(script);
				}
			});
			runtimeWindow.__rainztLottieRuntimePromise = runtimePromise;
			return runtimePromise;
		};

		const freezePreview = (preview: HTMLElement) => {
			delete preview.dataset.walineLottiePlaying;
			const animation = animations.get(preview);
			animation?.pause();
			animation?.goToAndStop?.(0, true);
		};

		const releasePreview = (preview: HTMLElement) => {
			const animation = animations.get(preview);
			animation?.destroy();
			animations.delete(preview);
			loadingAnimations.delete(preview);
			preview.replaceChildren();
			delete preview.dataset.walineLottieReady;
			delete preview.dataset.walineLottiePlaying;
		};

		const markPreviewFallback = (preview: HTMLElement) => {
			releasePreview(preview);
			preview.dataset.walineLottieError = "true";
			preview.textContent =
				preview.dataset.walineLottieTabIcon === "true" ? "" : "L";
		};

		const updatePreviewPlayback = (preview: HTMLElement) => {
			const animation = animations.get(preview);
			if (!animation) return;
			if (
				preview.dataset.walineLottiePlaying === "true" &&
				preview.dataset.walineLottieVisible === "true" &&
				!prefersReducedMotion()
			) {
				animation.play();
				return;
			}
			animation.pause();
			animation.goToAndStop?.(0, true);
		};

		const loadAnimation = async (preview: HTMLElement) => {
			if (
				disposed ||
				!preview.isConnected ||
				preview.dataset.walineLottieVisible !== "true" ||
				preview.dataset.walineLottieError === "true" ||
				animations.has(preview) ||
				loadingAnimations.has(preview)
			)
				return;

			const name = preview.dataset.walineLottieName || "";
			if (!/^[a-z0-9_-]+$/iu.test(name)) {
				markPreviewFallback(preview);
				return;
			}

			loadingAnimations.add(preview);
			try {
				const runtime = await loadRuntime();
				if (
					disposed ||
					!preview.isConnected ||
					preview.dataset.walineLottieVisible !== "true"
				)
					return;

				const animation = runtime.loadAnimation({
					container: preview,
					loop: true,
					autoplay: false,
					path: `${animationBasePath}${encodeURIComponent(name)}.json`,
					renderer: "svg",
					rendererSettings: { preserveAspectRatio: "xMidYMid meet" },
				});
				const syncPlayback = () => updatePreviewPlayback(preview);
				animation.addEventListener("data_ready", syncPlayback);
				animation.addEventListener("DOMLoaded", syncPlayback);
				animation.addEventListener("data_failed", () =>
					markPreviewFallback(preview),
				);
				animations.set(preview, animation);
				delete preview.dataset.walineLottieError;
				preview.dataset.walineLottieReady = "true";
				updatePreviewPlayback(preview);
			} catch {
				markPreviewFallback(preview);
			} finally {
				loadingAnimations.delete(preview);
			}
		};

		const previewObserver =
			"IntersectionObserver" in window
				? new IntersectionObserver(
						(entries) => {
							entries.forEach((entry) => {
								const preview = entry.target as HTMLElement;
								if (entry.isIntersecting) {
									preview.dataset.walineLottieVisible = "true";
									void loadAnimation(preview);
									return;
								}
								delete preview.dataset.walineLottieVisible;
								freezePreview(preview);
							});
						},
						{ rootMargin: "72px", threshold: 0.02 },
					)
				: undefined;

		const getButtonPreview = (event: Event) => {
			const target = event.target as Element | null;
			const button = target?.closest<HTMLButtonElement>(
				".waline-lottie-picker__item[data-waline-lottie-name]",
			);
			return button?.querySelector<HTMLElement>(
				".waline-lottie-picker__preview",
			);
		};

		const setPreviewPlaying = (
			preview: HTMLElement | null | undefined,
			playing: boolean,
		) => {
			if (!preview) return;
			if (playing && !prefersReducedMotion()) {
				preview.dataset.walineLottiePlaying = "true";
				const animation = animations.get(preview);
				if (animation) animation.play();
				else void loadAnimation(preview);
				return;
			}
			freezePreview(preview);
		};

		const releasePanelAnimations = (panel: HTMLElement) => {
			panel
				.querySelectorAll<HTMLElement>(".waline-lottie-picker__preview")
				.forEach((preview) => {
					previewObserver?.unobserve(preview);
					releasePreview(preview);
				});
		};

		const renderState = (state: PickerState) => {
			state.renderFrame = undefined;
			if (disposed || !state.panel.isConnected) return;
			releasePanelAnimations(state.panel);

			const query = state.input.value.trim().toLocaleLowerCase("zh-CN");
			const filteredItems = pickerItems.filter((item) => {
				if (!query) return true;
				return [item.name, item.label, item.emojiId, item.description]
					.filter(Boolean)
					.join(" ")
					.toLocaleLowerCase("zh-CN")
					.includes(query);
			});

			state.grid.replaceChildren();
			state.count.textContent = itemsLoaded
				? `${filteredItems.length}/${pickerItems.length}`
				: `${filteredItems.length}+`;

			if (!filteredItems.length) {
				const empty = document.createElement("p");
				empty.className = "waline-lottie-picker__empty";
				empty.textContent = "没有找到这个动态表情";
				state.grid.append(empty);
				return;
			}

			const fragment = document.createDocumentFragment();
			filteredItems.forEach((item) => {
				const button = document.createElement("button");
				button.type = "button";
				button.className = "waline-lottie-picker__item";
				button.dataset.walineLottieName = item.name;
				button.title = `${item.label} · :lottie_${item.name}:`;
				button.setAttribute("aria-label", `插入动态表情：${item.label}`);

				const preview = document.createElement("span");
				preview.className = "waline-lottie-picker__preview";
				preview.dataset.walineLottieName = item.name;
				preview.setAttribute("aria-hidden", "true");
				button.append(preview);
				fragment.append(button);
			});
			state.grid.append(fragment);

			state.grid
				.querySelectorAll<HTMLElement>(".waline-lottie-picker__preview")
				.forEach((preview) => {
					if (previewObserver) previewObserver.observe(preview);
					else {
						preview.dataset.walineLottieVisible = "true";
						void loadAnimation(preview);
					}
				});
		};

		const scheduleRender = (state: PickerState) => {
			if (state.renderFrame !== undefined || disposed) return;
			state.renderFrame = requestAnimationFrame(() => renderState(state));
		};

		const loadItems = () => {
			if (itemsPromise) return itemsPromise;
			itemsPromise = fetch(indexPath, { cache: "force-cache" })
				.then(async (response) => {
					if (!response.ok) throw new Error(`HTTP ${response.status}`);
					const data = (await response.json()) as {
						items?: Array<{
							describe?: string;
							emojiId?: string;
							name?: string;
						}>;
					};
					const qqItems = (data.items || [])
						.filter(
							(
								item,
							): item is {
								describe?: string;
								emojiId?: string;
								name: string;
							} =>
								typeof item.name === "string" &&
								/^[a-z0-9_-]+$/iu.test(item.name) &&
								typeof item.emojiId === "string" &&
								curatedLottieQqEmojiIds.has(item.emojiId),
						)
						.map((item) => ({
							name: item.name,
							label:
								item.describe?.replace(/^\//u, "").trim() ||
								qqLottieEmojiLabels[item.emojiId || ""] ||
								`QQ 表情 ${item.emojiId || item.name}`,
							group: "QQ" as const,
							emojiId: item.emojiId,
							description: item.describe,
						}));
					pickerItems = [...featuredLottieEmojis, ...qqItems];
				})
				.catch((error) => {
					console.error(
						"[Waline] Failed to load the Lottie emoji index.",
						error,
					);
				})
				.finally(() => {
					itemsLoaded = true;
					states.forEach((state) => {
						if (state.popup.classList.contains("waline-lottie-picker-active")) {
							scheduleRender(state);
						}
					});
				});
			return itemsPromise;
		};

		const insertShortcode = (state: PickerState, name: string) => {
			if (!/^[a-z0-9_-]+$/iu.test(name)) return;
			const editor =
				state.popup
					.closest(".wl-panel")
					?.querySelector<HTMLTextAreaElement>(".wl-editor") ||
				root.querySelector<HTMLTextAreaElement>(".wl-editor");
			if (!editor) return;

			const shortcode = `:lottie_${name}:`;
			const start = editor.selectionStart ?? editor.value.length;
			const end = editor.selectionEnd ?? start;
			editor.setRangeText(shortcode, start, end, "end");
			editor.dispatchEvent(
				new InputEvent("input", {
					bubbles: true,
					data: shortcode,
					inputType: "insertText",
				}),
			);
			editor.focus({ preventScroll: true });
			state.live.textContent = `已插入动态表情 ${name}`;
		};

		const setPickerActive = (
			state: PickerState,
			mode: "native" | "lottie" | "kaomoji",
		) => {
			const lottieActive = mode === "lottie";
			const kaomojiActive = mode === "kaomoji";
			state.popup.classList.toggle("waline-lottie-picker-active", lottieActive);
			state.popup.classList.toggle(
				"waline-kaomoji-picker-active",
				kaomojiActive,
			);
			state.panel.hidden = !lottieActive;
			state.kaomojiPanel.hidden = !kaomojiActive;
			state.popup
				.querySelectorAll<HTMLButtonElement>(":scope > .wl-tabs > .wl-tab")
				.forEach((tab) => {
					if (tab === state.tab || tab === state.kaomojiTab) {
						tab.classList.toggle(
							"active",
							lottieActive
								? tab === state.tab
								: kaomojiActive && tab === state.kaomojiTab,
						);
					} else if (mode !== "native") {
						tab.classList.remove("active");
					}
				});
			state.tab?.setAttribute("aria-selected", String(lottieActive));
			state.kaomojiTab?.setAttribute("aria-selected", String(kaomojiActive));
			if (lottieActive) {
				scheduleRender(state);
				void loadItems();
				return;
			}
			state.panel
				.querySelectorAll<HTMLElement>(".waline-lottie-picker__preview")
				.forEach(freezePreview);
		};

		const createState = (popup: HTMLElement) => {
			const panel = document.createElement("div");
			panel.className = "waline-lottie-picker";
			panel.hidden = true;
			panel.setAttribute("aria-label", "动态表情");
			const kaomojiPanel = document.createElement("div");
			kaomojiPanel.className = "waline-kaomoji-picker";
			kaomojiPanel.hidden = true;
			kaomojiPanel.setAttribute("aria-label", "颜文字");
			for (const face of walineKaomoji) {
				const button = document.createElement("button");
				button.type = "button";
				button.className = "waline-kaomoji-picker__item";
				button.textContent = face;
				button.title = face;
				button.dataset.walineKaomoji = face;
				button.setAttribute("aria-label", `插入颜文字 ${face}`);
				kaomojiPanel.append(button);
			}
			const kaomojiLive = document.createElement("span");
			kaomojiLive.className = "sr-only";
			kaomojiLive.setAttribute("aria-live", "polite");
			kaomojiPanel.append(kaomojiLive);

			const toolbar = document.createElement("div");
			toolbar.className = "waline-lottie-picker__toolbar";
			const searchWrap = document.createElement("label");
			searchWrap.className = "waline-lottie-picker__search";
			const searchText = document.createElement("span");
			searchText.className = "sr-only";
			searchText.textContent = "搜索动态表情";
			const input = document.createElement("input");
			input.type = "search";
			input.placeholder = "搜索动态表情…";
			input.autocomplete = "off";
			input.spellcheck = false;
			searchWrap.append(searchText, input);
			const count = document.createElement("span");
			count.className = "waline-lottie-picker__count";
			toolbar.append(searchWrap, count);

			const grid = document.createElement("div");
			grid.className = "waline-lottie-picker__grid";
			grid.setAttribute("role", "list");
			const live = document.createElement("span");
			live.className = "sr-only";
			live.setAttribute("aria-live", "polite");
			panel.append(toolbar, grid, live);

			const state = {} as PickerState;
			state.popup = popup;
			state.panel = panel;
			state.kaomojiPanel = kaomojiPanel;
			state.kaomojiLive = kaomojiLive;
			state.input = input;
			state.count = count;
			state.grid = grid;
			state.live = live;
			state.handleInput = () => scheduleRender(state);
			state.handlePanelMouseOver = (event) =>
				setPreviewPlaying(getButtonPreview(event), true);
			state.handlePanelMouseOut = (event) => {
				const preview = getButtonPreview(event);
				const button = preview?.closest(".waline-lottie-picker__item");
				if (button?.contains(event.relatedTarget as Node | null)) return;
				setPreviewPlaying(preview, false);
			};
			state.handlePanelFocusIn = (event) =>
				setPreviewPlaying(getButtonPreview(event), true);
			state.handlePanelFocusOut = (event) => {
				const preview = getButtonPreview(event);
				const button = preview?.closest(".waline-lottie-picker__item");
				if (button?.contains(event.relatedTarget as Node | null)) return;
				setPreviewPlaying(preview, false);
			};
			state.handlePanelMouseDown = (event) => {
				if (getButtonPreview(event)) event.preventDefault();
			};
			state.handlePanelClick = (event) => {
				const target = event.target as Element | null;
				const button = target?.closest<HTMLButtonElement>(
					".waline-lottie-picker__item[data-waline-lottie-name]",
				);
				if (!button) return;
				event.preventDefault();
				insertShortcode(state, button.dataset.walineLottieName || "");
			};
			state.handleKaomojiMouseDown = (event) => {
				if (
					(event.target as Element | null)?.closest(
						".waline-kaomoji-picker__item",
					)
				) {
					event.preventDefault();
				}
			};
			state.handleKaomojiClick = (event) => {
				const button = (
					event.target as Element | null
				)?.closest<HTMLButtonElement>(
					".waline-kaomoji-picker__item[data-waline-kaomoji]",
				);
				if (!button) return;
				event.preventDefault();
				const editor =
					state.popup
						.closest(".wl-panel")
						?.querySelector<HTMLTextAreaElement>(".wl-editor") ||
					root.querySelector<HTMLTextAreaElement>(".wl-editor");
				if (!editor) return;
				const face = button.dataset.walineKaomoji || "";
				const start = editor.selectionStart ?? editor.value.length;
				const end = editor.selectionEnd ?? start;
				editor.setRangeText(face, start, end, "end");
				editor.dispatchEvent(
					new InputEvent("input", {
						bubbles: true,
						data: face,
						inputType: "insertText",
					}),
				);
				editor.focus({ preventScroll: true });
				state.kaomojiLive.textContent = `已插入颜文字 ${face}`;
			};
			state.handlePopupClick = (event) => {
				const target = event.target as Element | null;
				const tab = target?.closest<HTMLButtonElement>(".wl-tabs > .wl-tab");
				if (!tab || tab.parentElement?.parentElement !== popup) return;
				if (tab.classList.contains("waline-lottie-tab")) {
					event.preventDefault();
					event.stopPropagation();
					setPickerActive(state, "lottie");
					return;
				}
				if (tab.classList.contains("waline-kaomoji-tab")) {
					event.preventDefault();
					event.stopPropagation();
					setPickerActive(state, "kaomoji");
					return;
				}
				setPickerActive(state, "native");
			};

			input.addEventListener("input", state.handleInput);
			panel.addEventListener("click", state.handlePanelClick);
			panel.addEventListener("focusin", state.handlePanelFocusIn);
			panel.addEventListener("focusout", state.handlePanelFocusOut);
			panel.addEventListener("mousedown", state.handlePanelMouseDown);
			panel.addEventListener("mouseout", state.handlePanelMouseOut);
			panel.addEventListener("mouseover", state.handlePanelMouseOver);
			kaomojiPanel.addEventListener("click", state.handleKaomojiClick);
			kaomojiPanel.addEventListener("mousedown", state.handleKaomojiMouseDown);
			popup.addEventListener("click", state.handlePopupClick, true);
			states.set(popup, state);
			return state;
		};

		const ensurePopup = (popup: HTMLElement) => {
			const tabs = popup.querySelector<HTMLElement>(":scope > .wl-tabs");
			if (!tabs) return;
			const state = states.get(popup) || createState(popup);
			if (state.panel.parentElement !== popup)
				popup.insertBefore(state.panel, tabs);
			if (state.kaomojiPanel.parentElement !== popup)
				popup.insertBefore(state.kaomojiPanel, tabs);

			let kaomojiTab = tabs.querySelector<HTMLButtonElement>(
				":scope > .waline-kaomoji-tab",
			);
			if (!kaomojiTab) {
				kaomojiTab = document.createElement("button");
				kaomojiTab.type = "button";
				kaomojiTab.className = "wl-tab waline-kaomoji-tab";
				kaomojiTab.textContent = "颜文字";
				kaomojiTab.title = "颜文字";
				kaomojiTab.setAttribute("aria-label", "颜文字");
				tabs.prepend(kaomojiTab);
			}
			state.kaomojiTab = kaomojiTab;

			let tab = tabs.querySelector<HTMLButtonElement>(
				":scope > .waline-lottie-tab",
			);
			if (!tab) {
				tab = document.createElement("button");
				tab.type = "button";
				tab.className = "wl-tab waline-lottie-tab";
				tab.title = "动态表情";
				tab.setAttribute("aria-label", "动态表情");
				const icon = document.createElement("span");
				icon.className = "waline-lottie-tab__icon";
				icon.setAttribute("aria-hidden", "true");
				icon.dataset.walineLottieName = "bixin";
				icon.dataset.walineLottieVisible = "true";
				icon.dataset.walineLottieTabIcon = "true";
				tab.append(icon);
				tabs.append(tab);
				void loadAnimation(icon);
			}
			state.tab = tab;
			const active = popup.classList.contains("waline-lottie-picker-active");
			state.panel.hidden = !active;
			const kaomojiActive = popup.classList.contains(
				"waline-kaomoji-picker-active",
			);
			state.kaomojiPanel.hidden = !kaomojiActive;
			tab.classList.toggle("active", active);
			tab.setAttribute("aria-selected", String(active));
			kaomojiTab.classList.toggle("active", kaomojiActive);
			kaomojiTab.setAttribute("aria-selected", String(kaomojiActive));
			if (!popup.classList.contains("display")) {
				state.panel
					.querySelectorAll<HTMLElement>(".waline-lottie-picker__preview")
					.forEach(freezePreview);
			}
		};

		const cleanupState = (state: PickerState) => {
			if (state.renderFrame !== undefined)
				cancelAnimationFrame(state.renderFrame);
			releasePanelAnimations(state.panel);
			const tabIcon = state.tab?.querySelector<HTMLElement>(
				".waline-lottie-tab__icon",
			);
			if (tabIcon) releasePreview(tabIcon);
			state.input.removeEventListener("input", state.handleInput);
			state.panel.removeEventListener("click", state.handlePanelClick);
			state.panel.removeEventListener("focusin", state.handlePanelFocusIn);
			state.panel.removeEventListener("focusout", state.handlePanelFocusOut);
			state.panel.removeEventListener("mousedown", state.handlePanelMouseDown);
			state.panel.removeEventListener("mouseout", state.handlePanelMouseOut);
			state.panel.removeEventListener("mouseover", state.handlePanelMouseOver);
			state.kaomojiPanel.removeEventListener("click", state.handleKaomojiClick);
			state.kaomojiPanel.removeEventListener(
				"mousedown",
				state.handleKaomojiMouseDown,
			);
			state.popup.removeEventListener("click", state.handlePopupClick, true);
			state.panel.remove();
			state.kaomojiPanel.remove();
			state.tab?.remove();
			state.kaomojiTab?.remove();
		};

		const syncPopups = () => {
			scanFrame = undefined;
			if (disposed) return;
			const popups = new Set(
				Array.from(root.querySelectorAll<HTMLElement>(".wl-emoji-popup")),
			);
			states.forEach((state, popup) => {
				if (popups.has(popup)) return;
				cleanupState(state);
				states.delete(popup);
			});
			popups.forEach(ensurePopup);
		};

		const scheduleSync = () => {
			if (scanFrame !== undefined || disposed) return;
			scanFrame = requestAnimationFrame(syncPopups);
		};

		const observer = new MutationObserver(scheduleSync);
		observer.observe(root, {
			attributes: true,
			attributeFilter: ["class"],
			childList: true,
			subtree: true,
		});
		scheduleSync();

		return () => {
			disposed = true;
			observer.disconnect();
			previewObserver?.disconnect();
			if (scanFrame !== undefined) cancelAnimationFrame(scanFrame);
			states.forEach(cleanupState);
			states.clear();
			for (const animation of animations.values()) animation.destroy();
			animations.clear();
			loadingAnimations.clear();
		};
	};

	/*
	 * Waline normally resolves shortcode emojis itself. New comments can occasionally arrive
	 * before the remote emoji map has finished loading, which leaves tokens such as
	 * :bb_sunglasses: visible in the rendered comment. Keep a small, DOM-safe fallback
	 * that only transforms unresolved configured shortcodes inside comment bodies.
	 */
	const setupEmojiFallback = (root: HTMLElement, emojiSources: unknown) => {
		const sources = Array.isArray(emojiSources)
			? emojiSources.filter(
					(source): source is string => typeof source === "string",
				)
			: [];
		const emojiMap = new Map<string, string>();
		let frameId: number | undefined;
		let disposed = false;

		const normalizeSource = (source: string) => source.replace(/\/+$/u, "");

		const appendEmojiImage = (
			fragment: DocumentFragment,
			shortcode: string,
			source: string,
		) => {
			const image = document.createElement("img");
			image.className = "wl-emoji";
			image.src = source;
			image.alt = shortcode;
			image.loading = "lazy";
			image.decoding = "async";
			image.referrerPolicy = "no-referrer";
			fragment.append(image);
		};

		const renderUnresolvedShortcodes = () => {
			frameId = undefined;
			if (!emojiMap.size) return;

			root.querySelectorAll<HTMLElement>(".wl-content").forEach((content) => {
				const textNodes: Text[] = [];
				const walker = document.createTreeWalker(
					content,
					NodeFilter.SHOW_TEXT,
					{
						acceptNode: (node) => {
							if (!node.textContent?.includes(":"))
								return NodeFilter.FILTER_REJECT;
							const parent = node.parentElement;
							return parent?.closest("pre, code, a, .wl-emoji")
								? NodeFilter.FILTER_REJECT
								: NodeFilter.FILTER_ACCEPT;
						},
					},
				);

				while (walker.nextNode()) textNodes.push(walker.currentNode as Text);

				textNodes.forEach((node) => {
					const text = node.textContent || "";
					const pattern = /:([a-z0-9_]+):/giu;
					let match: RegExpExecArray | null;
					let cursor = 0;
					let changed = false;
					const fragment = document.createDocumentFragment();

					// biome-ignore lint/suspicious/noAssignInExpressions: Advance the regex to the next emoji match.
					while ((match = pattern.exec(text))) {
						const imageSource = emojiMap.get(match[1]);
						if (!imageSource) continue;

						let prefix = text.slice(cursor, match.index);
						// Earlier auto-reply text accidentally placed a semicolon directly before
						// a shortcode. Omit only that unambiguous separator when we resolve it.
						if (/[;；]$/u.test(prefix)) prefix = prefix.slice(0, -1);
						if (prefix) fragment.append(document.createTextNode(prefix));
						appendEmojiImage(fragment, match[1], imageSource);
						cursor = match.index + match[0].length;
						changed = true;
					}

					if (!changed) return;
					const suffix = text.slice(cursor);
					if (suffix) fragment.append(document.createTextNode(suffix));
					node.replaceWith(fragment);
				});
			});
		};

		const scheduleRender = () => {
			if (frameId !== undefined || disposed) return;
			frameId = requestAnimationFrame(renderUnresolvedShortcodes);
		};

		const observer = new MutationObserver(scheduleRender);
		observer.observe(root, {
			childList: true,
			subtree: true,
			characterData: true,
		});

		void Promise.allSettled(
			sources.map(async (source) => {
				const folder = normalizeSource(source);
				const response = await fetch(`${folder}/info.json`, {
					cache: "force-cache",
				});
				if (!response.ok)
					throw new Error(`Failed to load Waline emoji manifest: ${folder}`);

				const manifest = (await response.json()) as EmojiManifest;
				const prefix = manifest.prefix || "";
				const extension = manifest.type || "png";
				manifest.items?.forEach((name) => {
					emojiMap.set(
						`${prefix}${name}`,
						`${folder}/${prefix}${name}.${extension}`,
					);
				});
			}),
		).then(scheduleRender);

		scheduleRender();
		return () => {
			disposed = true;
			observer.disconnect();
			if (frameId !== undefined) cancelAnimationFrame(frameId);
		};
	};

	/*
	 * Lottie animations are stored as local JSON files under /lottie. Waline's native
	 * emoji pipeline renders image URLs, so keep Lottie shortcodes separate from the
	 * regular emoji namespaces and turn them into small, lazy SVG players in comment
	 * bodies after Waline has rendered the Markdown.
	 */
	const setupLottieComments = (root: HTMLElement) => {
		const runtimePath = `${import.meta.env.BASE_URL}assets/lottie-web-5.12.2.min.js`;
		const animationBasePath = `${import.meta.env.BASE_URL}lottie/`;
		const runtimeWindow = window as LottieWindow;
		const animations = new Map<HTMLElement, LottieAnimation>();
		const loadingAnimations = new Set<HTMLElement>();
		const observedElements = new Set<HTMLElement>();
		const shortcodePattern =
			/:lottie_([a-z0-9_-]+):|\[lottie:([a-z0-9_-]+)\]/giu;
		let runtimePromise: Promise<LottieRuntime> | undefined;
		let mutationObserver: MutationObserver | undefined;
		let intersectionObserver: IntersectionObserver | undefined;
		let scanFrame: number | undefined;
		let disposed = false;

		const prefersReducedMotion = () =>
			window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

		const loadRuntime = () => {
			if (runtimeWindow.lottie) return Promise.resolve(runtimeWindow.lottie);
			if (runtimePromise) return runtimePromise;
			if (runtimeWindow.__rainztLottieRuntimePromise) {
				runtimePromise = runtimeWindow.__rainztLottieRuntimePromise;
				return runtimePromise;
			}

			runtimePromise = new Promise<LottieRuntime>((resolve, reject) => {
				const existingScript = document.querySelector<HTMLScriptElement>(
					"script[data-rainzt-lottie-runtime]",
				);
				const script = existingScript || document.createElement("script");
				const handleLoad = () => {
					if (runtimeWindow.lottie) resolve(runtimeWindow.lottie);
					else reject(new Error("Lottie runtime loaded without a global API"));
				};
				const handleError = () =>
					reject(new Error("Failed to load the local Lottie runtime"));

				script.addEventListener("load", handleLoad, { once: true });
				script.addEventListener("error", handleError, { once: true });
				if (!existingScript) {
					script.src = runtimePath;
					script.async = true;
					script.dataset.rainztLottieRuntime = "true";
					document.head.appendChild(script);
				}
			});
			runtimeWindow.__rainztLottieRuntimePromise = runtimePromise;
			return runtimePromise;
		};

		const getAnimationName = (element: HTMLElement) => {
			const name = element.dataset.walineLottieName?.trim() || "";
			return /^[a-z0-9_-]+$/iu.test(name) ? name : "";
		};

		const markFallback = (element: HTMLElement) => {
			const animation = animations.get(element);
			animation?.destroy();
			animations.delete(element);
			loadingAnimations.delete(element);
			delete element.dataset.walineLottieReady;
			element.dataset.walineLottieError = "true";
			element.textContent = element.dataset.walineLottieToken || "[Lottie]";
		};

		const loadAnimation = async (element: HTMLElement) => {
			if (
				disposed ||
				!element.isConnected ||
				element.dataset.walineLottieError === "true" ||
				animations.has(element) ||
				loadingAnimations.has(element)
			)
				return;

			const name = getAnimationName(element);
			if (!name) {
				markFallback(element);
				return;
			}

			loadingAnimations.add(element);
			try {
				const runtime = await loadRuntime();
				if (disposed || !element.isConnected) return;

				const reducedMotion = prefersReducedMotion();
				const animation = runtime.loadAnimation({
					container: element,
					loop: true,
					autoplay: !reducedMotion,
					path: `${animationBasePath}${encodeURIComponent(name)}.json`,
					renderer: "svg",
					rendererSettings: { preserveAspectRatio: "xMidYMid meet" },
				});

				const freezeFirstFrame = () => {
					if (!reducedMotion) return;
					animation.pause();
					animation.goToAndStop?.(0, true);
				};
				animation.addEventListener("data_ready", freezeFirstFrame);
				animation.addEventListener("DOMLoaded", freezeFirstFrame);
				animation.addEventListener("data_failed", () => markFallback(element));

				if (disposed || !element.isConnected) {
					animation.destroy();
					return;
				}
				animations.set(element, animation);
				delete element.dataset.walineLottieError;
				element.dataset.walineLottieReady = "true";
				freezeFirstFrame();
			} catch {
				markFallback(element);
			} finally {
				loadingAnimations.delete(element);
			}
		};

		const createAnimationElement = (name: string, token: string) => {
			const element = document.createElement("span");
			element.className = "waline-lottie-emoji";
			element.dataset.walineLottieName = name;
			element.dataset.walineLottieToken = token;
			element.setAttribute("role", "img");
			element.setAttribute("aria-label", `Lottie 表情：${name}`);
			element.title = `Lottie 表情：${name}`;
			return element;
		};

		const renderShortcodes = () => {
			root.querySelectorAll<HTMLElement>(".wl-content").forEach((content) => {
				const textNodes: Text[] = [];
				const walker = document.createTreeWalker(
					content,
					NodeFilter.SHOW_TEXT,
					{
						acceptNode: (node) => {
							if (!node.textContent?.match(shortcodePattern))
								return NodeFilter.FILTER_REJECT;
							const parent = node.parentElement;
							return parent?.closest(
								"pre, code, a, .wl-emoji, .waline-lottie-emoji",
							)
								? NodeFilter.FILTER_REJECT
								: NodeFilter.FILTER_ACCEPT;
						},
					},
				);

				while (walker.nextNode()) textNodes.push(walker.currentNode as Text);

				textNodes.forEach((node) => {
					const text = node.textContent || "";
					const pattern = /:lottie_([a-z0-9_-]+):|\[lottie:([a-z0-9_-]+)\]/giu;
					let match: RegExpExecArray | null;
					let cursor = 0;
					let changed = false;
					const fragment = document.createDocumentFragment();

					// biome-ignore lint/suspicious/noAssignInExpressions: Advance the regex to the next emoji match.
					while ((match = pattern.exec(text))) {
						const name = match[1] || match[2] || "";
						if (!name || !/^[a-z0-9_-]+$/iu.test(name)) continue;

						const prefix = text.slice(cursor, match.index);
						if (prefix) fragment.append(document.createTextNode(prefix));
						fragment.append(createAnimationElement(name, match[0]));
						cursor = match.index + match[0].length;
						changed = true;
					}

					if (!changed) return;
					const suffix = text.slice(cursor);
					if (suffix) fragment.append(document.createTextNode(suffix));
					node.replaceWith(fragment);
				});
			});
		};

		const observeAnimations = () => {
			if (!intersectionObserver && "IntersectionObserver" in window) {
				intersectionObserver = new IntersectionObserver(
					(entries) => {
						entries.forEach((entry) => {
							const element = entry.target as HTMLElement;
							const animation = animations.get(element);
							if (!animation) {
								if (entry.isIntersecting) void loadAnimation(element);
								return;
							}

							if (prefersReducedMotion()) {
								animation.pause();
								animation.goToAndStop?.(0, true);
							} else if (entry.isIntersecting) {
								animation.play();
							} else {
								animation.pause();
							}
						});
					},
					{ rootMargin: "180px", threshold: 0.05 },
				);
			}

			const elements = new Set(
				Array.from(
					root.querySelectorAll<HTMLElement>(
						".waline-lottie-emoji[data-waline-lottie-name]",
					),
				),
			);
			for (const [element, animation] of animations) {
				if (elements.has(element)) continue;
				animation.destroy();
				animations.delete(element);
			}

			for (const element of observedElements) {
				if (elements.has(element)) continue;
				intersectionObserver?.unobserve(element);
				observedElements.delete(element);
			}

			for (const element of elements) {
				if (observedElements.has(element)) continue;
				if (intersectionObserver) {
					intersectionObserver.observe(element);
					observedElements.add(element);
				} else {
					void loadAnimation(element);
				}
			}
		};

		const scan = () => {
			scanFrame = undefined;
			if (disposed) return;
			renderShortcodes();
			observeAnimations();
		};

		const scheduleScan = () => {
			if (scanFrame !== undefined || disposed) return;
			scanFrame = requestAnimationFrame(scan);
		};

		mutationObserver = new MutationObserver(scheduleScan);
		mutationObserver.observe(root, {
			childList: true,
			subtree: true,
			characterData: true,
		});
		scheduleScan();

		return () => {
			disposed = true;
			mutationObserver?.disconnect();
			intersectionObserver?.disconnect();
			if (scanFrame !== undefined) cancelAnimationFrame(scanFrame);
			for (const animation of animations.values()) animation.destroy();
			animations.clear();
			loadingAnimations.clear();
			observedElements.clear();
		};
	};

	const normalizeSiteUrl = (value: string) => {
		let input = value.trim();
		if (!input) return "";

		if (input.startsWith("//")) {
			input = `https:${input}`;
		} else if (!/^[a-z][a-z\d+.-]*:\/\//iu.test(input)) {
			input = `https://${input}`;
		}

		try {
			const parsed = new URL(input);
			if (parsed.protocol !== "http:" && parsed.protocol !== "https:")
				return "";

			const hostname = parsed.hostname
				.toLowerCase()
				.replace(/\.$/u, "")
				.replace(/^www\./u, "");
			if (!hostname) return "";

			const isDefaultPort =
				(parsed.protocol === "http:" && parsed.port === "80") ||
				(parsed.protocol === "https:" && parsed.port === "443");
			const port = parsed.port && !isDefaultPort ? `:${parsed.port}` : "";
			const pathname = parsed.pathname
				.replace(/\/{2,}/gu, "/")
				.replace(/\/+$/u, "")
				.toLowerCase();

			return `${hostname}${port}${pathname}`;
		} catch {
			return "";
		}
	};

	const getRecommendedSiteUrls = (root: HTMLElement) => {
		try {
			const values = JSON.parse(root.dataset.walineRecommendedLinks || "[]");
			return Array.isArray(values)
				? values.filter((value): value is string => typeof value === "string")
				: [];
		} catch (error) {
			console.error(
				"[Waline] Failed to parse recommended friend links.",
				error,
			);
			return [];
		}
	};

	const getConfiguredUserIds = (value: string | undefined) => {
		try {
			const ids = JSON.parse(value || "[]");
			return new Set(
				Array.isArray(ids)
					? ids.filter((id): id is number => Number.isInteger(id) && id > 0)
					: [],
			);
		} catch {
			return new Set<number>();
		}
	};

	const setupReplyCollapse = (root: HTMLElement) => {
		const eventController = new AbortController();
		let frameId: number | undefined;
		let disposed = false;

		const syncThreadStatus = (quote: HTMLElement) => {
			const thread = quote.closest<HTMLElement>(".wl-card-item");
			if (!thread?.parentElement?.classList.contains("wl-cards")) return;

			const card = thread.querySelector<HTMLElement>(":scope > .wl-card");
			const head = card?.querySelector<HTMLElement>(":scope > .wl-head");
			if (!card || !head) return;

			const replyItems = Array.from(
				quote.querySelectorAll<HTMLElement>(".wl-card-item"),
			);
			const hasAiReply = replyItems.some(
				(reply) => reply.dataset.walineRole === "ai",
			);
			const hasOwnerReply = replyItems.some(
				(reply) => reply.dataset.walineRole === "owner",
			);
			const statusKind =
				hasAiReply && hasOwnerReply
					? "both"
					: hasAiReply
						? "ai"
						: hasOwnerReply
							? "owner"
							: "";
			const statusLabel =
				statusKind === "both"
					? "AI · 站长已回复"
					: statusKind === "ai"
						? "AI 已回复"
						: statusKind === "owner"
							? "站长已回复"
							: "";
			const statusNodes = Array.from(
				thread.querySelectorAll<HTMLElement>("[data-waline-thread-status]"),
			);
			const currentStatus = statusNodes.find(
				(status) => status.parentElement === head,
			);
			statusNodes
				.filter((status) => status !== currentStatus)
				.forEach((status) => {
					status.remove();
				});

			if (!statusKind) {
				currentStatus?.remove();
				delete thread.dataset.walineThreadStatus;
				return;
			}

			const status = currentStatus || document.createElement("span");
			status.className = "wl-thread-status";
			status.dataset.walineThreadStatus = statusKind;
			status.textContent = statusLabel;
			status.setAttribute("aria-label", statusLabel);
			status.title = statusLabel;
			thread.dataset.walineThreadStatus = statusKind;
			if (!currentStatus) {
				const actions = head.querySelector<HTMLElement>(
					":scope > .wl-comment-actions",
				);
				if (actions) {
					actions.insertAdjacentElement("afterend", status);
				} else {
					head.append(status);
				}
			}
		};

		const sync = () => {
			frameId = undefined;
			if (disposed) return;

			root.querySelectorAll<HTMLElement>(".wl-quote").forEach((quote) => {
				const replies = Array.from(quote.children).filter(
					(child): child is HTMLElement =>
						child instanceof HTMLElement &&
						child.classList.contains("wl-card-item"),
				);
				const toggle = quote.querySelector<HTMLButtonElement>(
					":scope > [data-waline-reply-toggle]",
				);
				syncThreadStatus(quote);

				const expanded = quote.dataset.walineReplyExpanded === "true";
				const firstAiReply = replies.find(
					(reply) => reply.dataset.walineRole === "ai",
				);
				const hiddenReplySet = new Set(replies.slice(1));
				if (firstAiReply) hiddenReplySet.add(firstAiReply);
				const hiddenReplies = replies.filter((reply) =>
					hiddenReplySet.has(reply),
				);

				if (hiddenReplies.length === 0) {
					replies.forEach((reply) => {
						reply.classList.remove("waline-reply-hidden");
						reply.removeAttribute("aria-hidden");
					});
					toggle?.remove();
					delete quote.dataset.walineReplyCollapse;
					delete quote.dataset.walineAiReplyCollapse;
					delete quote.dataset.walineReplyExpanded;
					return;
				}

				replies.forEach((reply) => {
					const shouldHide = hiddenReplySet.has(reply) && !expanded;
					reply.classList.toggle("waline-reply-hidden", shouldHide);
					reply.toggleAttribute("aria-hidden", shouldHide);
				});
				quote.dataset.walineReplyCollapse = "true";
				if (firstAiReply) {
					quote.dataset.walineAiReplyCollapse = "true";
				} else {
					delete quote.dataset.walineAiReplyCollapse;
				}

				const button = toggle || document.createElement("button");
				button.type = "button";
				button.className = "waline-reply-toggle";
				button.dataset.walineReplyToggle = "true";
				button.dataset.walineReplyKind = firstAiReply ? "ai" : "thread";
				button.dataset.walineReplyExpanded = String(expanded);
				button.setAttribute("aria-expanded", String(expanded));
				const aiHiddenCount = firstAiReply ? 1 : 0;
				const accessibleLabel = expanded
					? firstAiReply
						? "收起 AI 回复"
						: "收起回复"
					: firstAiReply
						? hiddenReplies.length === aiHiddenCount
							? "展开 AI 回复"
							: `展开 AI 回复及其余 ${hiddenReplies.length - aiHiddenCount} 条回复`
						: `展开其余 ${hiddenReplies.length} 条回复`;
				const visualLabel = firstAiReply
					? expanded
						? "收起回复"
						: hiddenReplies.length === aiHiddenCount
							? "展开回复"
							: `展开回复及其余 ${hiddenReplies.length - aiHiddenCount} 条回复`
					: accessibleLabel;
				button.textContent = visualLabel;
				button.setAttribute("aria-label", accessibleLabel);
				button.title = accessibleLabel;

				const firstHiddenReply = hiddenReplies[0];
				if (
					firstHiddenReply &&
					firstHiddenReply.previousElementSibling !== button
				) {
					firstHiddenReply.insertAdjacentElement("beforebegin", button);
				}
			});

			root
				.querySelectorAll<HTMLElement>(
					".wl-card-item[data-waline-thread-status]",
				)
				.forEach((thread) => {
					const quote = thread.querySelector<HTMLElement>(
						":scope > .wl-card > .wl-quote",
					);
					if (quote) return;
					thread
						.querySelectorAll<HTMLElement>("[data-waline-thread-status]")
						.forEach((status) => {
							status.remove();
						});
					delete thread.dataset.walineThreadStatus;
				});
		};

		const schedule = () => {
			if (frameId !== undefined || disposed) return;
			frameId = requestAnimationFrame(sync);
		};

		const onToggle = (event: Event) => {
			const target = event.target;
			if (!(target instanceof Element)) return;
			const button = target.closest<HTMLButtonElement>(
				"[data-waline-reply-toggle]",
			);
			if (!button) return;

			event.preventDefault();
			const quote = button.parentElement;
			if (!quote) return;
			quote.dataset.walineReplyExpanded = String(
				quote.dataset.walineReplyExpanded !== "true",
			);
			schedule();
		};

		root.addEventListener("click", onToggle, {
			signal: eventController.signal,
		});
		const observer = new MutationObserver(schedule);
		observer.observe(root, {
			attributes: true,
			attributeFilter: ["data-waline-role"],
			childList: true,
			subtree: true,
		});
		schedule();

		return () => {
			disposed = true;
			eventController.abort();
			observer.disconnect();
			if (frameId !== undefined) cancelAnimationFrame(frameId);
			root
				.querySelectorAll<HTMLElement>("[data-waline-reply-toggle]")
				.forEach((button) => {
					button.remove();
				});
			root
				.querySelectorAll<HTMLElement>(".waline-reply-hidden")
				.forEach((reply) => {
					reply.classList.remove("waline-reply-hidden");
					reply.removeAttribute("aria-hidden");
				});
			root
				.querySelectorAll<HTMLElement>(
					".wl-card-item[data-waline-thread-status]",
				)
				.forEach((thread) => {
					thread
						.querySelectorAll<HTMLElement>("[data-waline-thread-status]")
						.forEach((status) => {
							status.remove();
						});
					delete thread.dataset.walineThreadStatus;
				});
		};
	};

	const ownedCommentMailStorageKey = "firefly-waline-owned-mail-hashes";
	const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/u;

	const normalizeCommentEmail = (value: string) => value.trim().toLowerCase();

	/* Waline exposes the MD5 fingerprint of a comment email, never the email itself. */
	const md5 = (value: string) => {
		const bytes = new TextEncoder().encode(value);
		const bitLength = bytes.length * 8;
		const wordCount = ((bytes.length + 9 + 63) >> 6) << 4;
		const words = new Uint32Array(wordCount);

		bytes.forEach((byte, index) => {
			words[index >> 2] |= byte << ((index & 3) * 8);
		});
		words[bytes.length >> 2] |= 0x80 << ((bytes.length & 3) * 8);
		words[wordCount - 2] = bitLength >>> 0;
		words[wordCount - 1] = Math.floor(bitLength / 0x100000000) >>> 0;

		const shiftAmounts = [
			7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 5, 9, 14, 20,
			5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 4, 11, 16, 23, 4, 11, 16, 23, 4,
			11, 16, 23, 4, 11, 16, 23, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6,
			10, 15, 21,
		];
		const constants = Array.from(
			{ length: 64 },
			(_, index) =>
				Math.floor(Math.abs(Math.sin(index + 1)) * 0x100000000) >>> 0,
		);
		const rotateLeft = (number: number, amount: number) =>
			(number << amount) | (number >>> (32 - amount));
		const toHex = (number: number) =>
			Array.from({ length: 4 }, (_, index) =>
				((number >>> (index * 8)) & 0xff).toString(16).padStart(2, "0"),
			).join("");

		let a = 0x67452301;
		let b = 0xefcdab89;
		let c = 0x98badcfe;
		let d = 0x10325476;

		for (let offset = 0; offset < words.length; offset += 16) {
			const blockA = a;
			const blockB = b;
			const blockC = c;
			const blockD = d;

			for (let index = 0; index < 64; index += 1) {
				let functionValue: number;
				let wordIndex: number;

				if (index < 16) {
					functionValue = (b & c) | (~b & d);
					wordIndex = index;
				} else if (index < 32) {
					functionValue = (d & b) | (~d & c);
					wordIndex = (5 * index + 1) % 16;
				} else if (index < 48) {
					functionValue = b ^ c ^ d;
					wordIndex = (3 * index + 5) % 16;
				} else {
					functionValue = c ^ (b | ~d);
					wordIndex = (7 * index) % 16;
				}

				const nextA = d;
				const sum =
					(a + functionValue + constants[index] + words[offset + wordIndex]) >>>
					0;
				d = c;
				c = b;
				b = (b + rotateLeft(sum, shiftAmounts[index])) >>> 0;
				a = nextA;
			}

			a = (a + blockA) >>> 0;
			b = (b + blockB) >>> 0;
			c = (c + blockC) >>> 0;
			d = (d + blockD) >>> 0;
		}

		return `${toHex(a)}${toHex(b)}${toHex(c)}${toHex(d)}`;
	};

	const isCommentEmail = (value: string) =>
		emailPattern.test(normalizeCommentEmail(value));

	const readOwnedCommentMailHashes = () => {
		const hashes = new Set<string>();
		try {
			const stored = JSON.parse(
				localStorage.getItem(ownedCommentMailStorageKey) || "[]",
			);
			if (Array.isArray(stored)) {
				stored
					.filter(
						(hash): hash is string =>
							typeof hash === "string" &&
							(/^[a-f\d]{32}$/iu.test(hash) || /^qq:\d+$/u.test(hash)),
					)
					.forEach((hash) => {
						hashes.add(hash.toLowerCase());
					});
			}
		} catch {
			// Private browsing and malformed local state should not disable comments.
		}
		return hashes;
	};

	const rememberCommentEmail = (value: string) => {
		const email = normalizeCommentEmail(value);
		if (!isCommentEmail(email)) return "";

		const hash = md5(email);
		const hashes = readOwnedCommentMailHashes();
		const candidates = new Set([hash]);
		const rawEmail = value.trim();
		if (rawEmail && rawEmail !== email) candidates.add(md5(rawEmail));
		const [localPart, domain] = email.split("@");
		if (
			localPart &&
			/^(?:qq|foxmail)\.com$/u.test(domain) &&
			/^\d+$/u.test(localPart)
		) {
			candidates.add(`qq:${localPart}`);
		}
		candidates.forEach((candidate) => {
			hashes.add(candidate);
		});
		try {
			localStorage.setItem(
				ownedCommentMailStorageKey,
				JSON.stringify([...hashes]),
			);
		} catch {
			// Keep the current session usable if persistent storage is blocked.
		}
		return hash;
	};

	const rememberStoredWalineEmails = () => {
		const values: string[] = [];
		try {
			const meta = JSON.parse(localStorage.getItem("WALINE_USER_META") || "{}");
			if (typeof meta?.mail === "string") values.push(meta.mail);
		} catch {
			// Ignore inaccessible or malformed Waline metadata.
		}
		try {
			const user = JSON.parse(localStorage.getItem("WALINE_USER") || "null");
			if (typeof user?.email === "string") values.push(user.email);
		} catch {
			// Ignore inaccessible or malformed Waline user state.
		}
		values.forEach(rememberCommentEmail);
	};

	const setupOwnedCommentFilter = (root: HTMLElement, rawConfig: unknown) => {
		const metaHead = root.querySelector<HTMLElement>(":scope .wl-meta-head");
		if (!metaHead || !(rawConfig && typeof rawConfig === "object"))
			return () => {};

		const config = rawConfig as {
			serverURL?: unknown;
			path?: unknown;
			lang?: unknown;
		};
		const serverURL =
			typeof config.serverURL === "string"
				? config.serverURL.replace(/\/$/u, "")
				: "";
		const path = typeof config.path === "string" ? config.path : "";
		if (!serverURL || !path) return () => {};

		rememberStoredWalineEmails();
		const controller = new AbortController();
		const wrapper = document.createElement("div");
		wrapper.className = "firefly-comment-filter";
		wrapper.dataset.walineCommentFilter = "true";

		const toggle = document.createElement("button");
		toggle.type = "button";
		toggle.className = "firefly-comment-filter-toggle";
		toggle.setAttribute("aria-pressed", "false");
		toggle.title = "使用你曾填写过的邮箱筛选评论";
		const icon = document.createElement("span");
		icon.className = "firefly-comment-filter-icon";
		icon.setAttribute("aria-hidden", "true");
		const label = document.createElement("span");
		label.className = "firefly-comment-filter-label";
		toggle.append(icon, label);

		const status = document.createElement("span");
		status.className = "firefly-comment-filter-status";
		status.setAttribute("role", "status");
		status.setAttribute("aria-live", "polite");

		const panel = document.createElement("div");
		panel.className = "firefly-comment-filter-panel";
		panel.hidden = true;
		const panelText = document.createElement("p");
		panelText.textContent =
			"输入你以前评论时用过的邮箱，便可找回属于你的评论。只记录邮箱指纹，不会显示在评论区。";
		const form = document.createElement("form");
		form.className = "firefly-comment-filter-form";
		const emailInput = document.createElement("input");
		emailInput.type = "email";
		emailInput.required = true;
		emailInput.autocomplete = "email";
		emailInput.placeholder = "曾使用过的邮箱";
		emailInput.className = "firefly-comment-filter-input";
		const confirmButton = document.createElement("button");
		confirmButton.type = "submit";
		confirmButton.className = "firefly-comment-filter-confirm";
		confirmButton.textContent = "确认";
		const cancelButton = document.createElement("button");
		cancelButton.type = "button";
		cancelButton.className = "firefly-comment-filter-cancel";
		cancelButton.textContent = "取消";
		form.append(emailInput, confirmButton, cancelButton);
		panel.append(panelText, form);
		wrapper.append(toggle, status, panel);

		const sortList = metaHead.querySelector<HTMLElement>(":scope > .wl-sort");
		if (sortList) metaHead.insertBefore(wrapper, sortList);
		else metaHead.append(wrapper);

		let active = false;
		let loading = false;
		let loaded = false;
		let commentMailHashes = new Map<string, Set<string>>();
		let frameId: number | undefined;

		const setPanelVisible = (visible: boolean) => {
			panel.hidden = !visible;
			if (visible) {
				const currentMail =
					root.querySelector<HTMLInputElement>('input[name="mail"]')?.value ||
					"";
				emailInput.value = currentMail;
				requestAnimationFrame(() => emailInput.focus());
			}
		};

		const getCommentItems = () =>
			Array.from(root.querySelectorAll<HTMLElement>(".wl-card-item"));

		const applyFilter = () => {
			frameId = undefined;
			const items = getCommentItems();
			if (!active || !loaded) {
				items.forEach((item) => {
					item.hidden = false;
					delete item.dataset.walineOwnedComment;
				});
				return;
			}

			const hashes = readOwnedCommentMailHashes();
			const visibleIds = new Set<string>();
			const matchingIds = new Set<string>();
			items.forEach((item) => {
				const id = item.id;
				const identities = commentMailHashes.get(id);
				const isMatch = Boolean(
					identities &&
						[...identities].some((identity) => hashes.has(identity)),
				);
				if (id && isMatch) {
					matchingIds.add(id);
					visibleIds.add(id);
					let parent =
						item.parentElement?.closest<HTMLElement>(".wl-card-item");
					while (parent) {
						visibleIds.add(parent.id);
						parent =
							parent.parentElement?.closest<HTMLElement>(".wl-card-item");
					}
				}
			});

			items.forEach((item) => {
				const isVisible = visibleIds.has(item.id);
				item.hidden = !isVisible;
				item.dataset.walineOwnedComment = matchingIds.has(item.id)
					? "true"
					: "context";
			});
			status.textContent = matchingIds.size
				? `已显示 ${matchingIds.size} 条自己的评论`
				: "当前页面没有找到匹配的评论";
			if (!matchingIds.size && panel.hidden) setPanelVisible(true);
		};

		const scheduleApply = () => {
			if (frameId !== undefined) return;
			frameId = requestAnimationFrame(applyFilter);
		};

		const fetchCommentMailHashes = async () => {
			if (loading) return;
			loading = true;
			loaded = false;
			status.textContent = "正在查找你的评论…";
			try {
				const hashes = new Map<string, Set<string>>();
				let page = 1;
				let totalPages = 1;
				while (page <= totalPages && page <= 20) {
					const query = new URLSearchParams({
						path,
						page: String(page),
						pageSize: "100",
						lang: typeof config.lang === "string" ? config.lang : "zh-CN",
						sortBy: "insertedAt_desc",
					});
					const response = await fetch(
						`${serverURL}/api/comment?${query.toString()}`,
						{
							headers: { Accept: "application/json" },
							signal: controller.signal,
						},
					);
					if (!response.ok)
						throw new Error(
							`Comment metadata request failed: ${response.status}`,
						);
					const payload = (await response.json()) as {
						data?: unknown;
						totalPages?: unknown;
					};
					const rawData = payload.data;
					const pageData = (
						rawData && typeof rawData === "object" && !Array.isArray(rawData)
							? rawData
							: payload
					) as { data?: unknown; totalPages?: unknown };
					const comments =
						rawData && Array.isArray(rawData)
							? rawData
							: pageData &&
									typeof pageData === "object" &&
									Array.isArray(pageData.data)
								? pageData.data
								: [];
					const collect = (comment: unknown) => {
						if (!comment || typeof comment !== "object") return;
						const record = comment as {
							objectId?: unknown;
							mail?: unknown;
							email?: unknown;
							avatar?: unknown;
							children?: unknown;
						};
						if (
							typeof record.objectId === "number" ||
							typeof record.objectId === "string"
						) {
							const identities = new Set<string>();
							const addEmail = (value: unknown) => {
								if (typeof value !== "string" || !isCommentEmail(value)) return;
								const email = normalizeCommentEmail(value);
								identities.add(md5(email));
								const [localPart, domain] = email.split("@");
								if (
									localPart &&
									/^(?:qq|foxmail)\.com$/u.test(domain) &&
									/^\d+$/u.test(localPart)
								) {
									identities.add(`qq:${localPart}`);
								}
							};
							addEmail(record.mail);
							addEmail(record.email);
							if (typeof record.avatar === "string") {
								for (const match of record.avatar.matchAll(/[a-f\d]{32}/giu)) {
									identities.add(match[0].toLowerCase());
								}
								try {
									const avatarUrl = new URL(record.avatar);
									["nk", "dst_uin", "uin"].forEach((key) => {
										const qqNumber =
											avatarUrl.searchParams.get(key)?.trim() || "";
										if (/^\d+$/u.test(qqNumber))
											identities.add(`qq:${qqNumber}`);
									});
								} catch {
									// Ignore malformed avatar URLs.
								}
							}
							if (identities.size)
								hashes.set(String(record.objectId), identities);
						}
						if (Array.isArray(record.children))
							record.children.forEach(collect);
					};
					comments.forEach(collect);
					totalPages =
						pageData &&
						typeof pageData === "object" &&
						Number.isFinite(Number(pageData.totalPages))
							? Number(pageData.totalPages)
							: page;
					page += 1;
				}
				commentMailHashes = hashes;
				loaded = true;
				scheduleApply();
			} catch (error) {
				if ((error as Error).name !== "AbortError") {
					status.textContent = "暂时无法读取评论归属，请稍后重试";
					console.error(
						"[Waline] Failed to load comment email fingerprints.",
						error,
					);
				}
			} finally {
				loading = false;
			}
		};

		const syncLabel = () => {
			label.textContent = active ? "显示全部评论" : "只看自己的评论";
			toggle.setAttribute("aria-pressed", String(active));
			toggle.dataset.active = String(active);
			if (!active) {
				status.textContent = readOwnedCommentMailHashes().size
					? "已记住你的评论邮箱"
					: "使用曾填写过的邮箱筛选";
			}
		};

		const handleMailInput = (event: Event) => {
			const target = event.target;
			if (target instanceof HTMLInputElement && target.name === "mail") {
				rememberCommentEmail(target.value);
				if (active) scheduleApply();
			}
		};

		const handleToggle = () => {
			rememberStoredWalineEmails();
			const currentMail =
				root.querySelector<HTMLInputElement>('input[name="mail"]')?.value || "";
			rememberCommentEmail(currentMail);
			if (!active && !readOwnedCommentMailHashes().size) {
				setPanelVisible(true);
				status.textContent = "先输入一个你以前使用过的邮箱";
				return;
			}
			active = !active;
			setPanelVisible(false);
			syncLabel();
			if (active) void fetchCommentMailHashes();
			else scheduleApply();
		};

		const handleSubmit = (event: Event) => {
			event.preventDefault();
			const hash = rememberCommentEmail(emailInput.value);
			if (!hash) {
				emailInput.setCustomValidity("请输入有效的邮箱地址");
				emailInput.reportValidity();
				return;
			}
			emailInput.setCustomValidity("");
			setPanelVisible(false);
			active = true;
			syncLabel();
			void fetchCommentMailHashes();
		};

		toggle.addEventListener("click", handleToggle, {
			signal: controller.signal,
		});
		form.addEventListener("submit", handleSubmit, {
			signal: controller.signal,
		});
		cancelButton.addEventListener("click", () => setPanelVisible(false), {
			signal: controller.signal,
		});
		root.addEventListener("input", handleMailInput, {
			signal: controller.signal,
		});
		root.addEventListener("change", handleMailInput, {
			signal: controller.signal,
		});
		window.addEventListener("storage", syncLabel, {
			signal: controller.signal,
		});
		const observer = new MutationObserver(scheduleApply);
		observer.observe(root, { childList: true, subtree: true });
		syncLabel();

		return () => {
			controller.abort();
			observer.disconnect();
			if (frameId !== undefined) cancelAnimationFrame(frameId);
			wrapper.remove();
		};
	};

	const setupCommentHint = (root: HTMLElement) => {
		const rawPath = root.dataset.walinePath || "";
		const path = rawPath.split(/[?#]/u)[0].replace(/\/+$/u, "") || "/";
		if (path !== "/friends") return () => {};

		let hint: HTMLElement | undefined;
		let frameId: number | undefined;
		let disposed = false;

		const createHint = () => {
			const element = document.createElement("aside");
			element.className = "waline-link-tip";
			element.dataset.walineCommentHint = "true";
			element.setAttribute("role", "note");
			element.setAttribute("aria-label", "友链信息提示");

			const icon = document.createElement("span");
			icon.className = "waline-link-tip-icon";
			icon.setAttribute("aria-hidden", "true");

			const body = document.createElement("div");
			body.className = "waline-link-tip-body";
			const title = document.createElement("strong");
			title.className = "waline-link-tip-title";
			title.textContent = "友链信息提示";

			const text = document.createElement("p");
			text.className = "waline-link-tip-text";
			text.append(
				document.createTextNode("需要更改友链信息时，请使用 "),
				(() => {
					const action = document.createElement("span");
					action.className = "waline-link-tip-action";
					action.textContent = "只看自己的评论";
					return action;
				})(),
				document.createTextNode(
					" 快速定位原申请，再在原评论下回复补充即可，无需重复提交。",
				),
			);

			body.append(title, text);
			element.append(icon, body);
			return element;
		};

		const mount = () => {
			frameId = undefined;
			if (disposed) return;

			const metaHead = root.querySelector<HTMLElement>(":scope .wl-meta-head");
			if (!metaHead) return;
			hint ??= createHint();
			if (hint.previousElementSibling !== metaHead) {
				metaHead.insertAdjacentElement("afterend", hint);
			}
		};

		const schedule = () => {
			if (frameId !== undefined || disposed) return;
			frameId = requestAnimationFrame(mount);
		};

		const observer = new MutationObserver(schedule);
		observer.observe(root, { childList: true, subtree: true });
		schedule();

		return () => {
			disposed = true;
			observer.disconnect();
			if (frameId !== undefined) cancelAnimationFrame(frameId);
			hint?.remove();
		};
	};

	const setupCommentMode = (root: HTMLElement) => {
		const controller = new AbortController();
		const parseJson = <T>(value: string | undefined, fallback: T): T => {
			try {
				return JSON.parse(value || "") as T;
			} catch {
				return fallback;
			}
		};
		const friendHosts = new Set(
			parseJson<string[]>(root.dataset.walineFriendHosts, [])
				.map((host) => {
					try {
						return new URL(
							host.includes(":") ? host : `https://${host}`,
						).hostname
							.toLowerCase()
							.replace(/^www\./u, "");
					} catch {
						return "";
					}
				})
				.filter(Boolean),
		);
		let frameId: number | undefined;
		let disposed = false;

		const normalizeHost = (value: string) => {
			try {
				const candidate = /^[a-z][a-z\d+.-]*:/iu.test(value)
					? value
					: `https://${value}`;
				return new URL(candidate).hostname.toLowerCase().replace(/^www\./u, "");
			} catch {
				return "";
			}
		};

		const getLoginNick = (panel: HTMLElement) =>
			Array.from(
				panel.querySelectorAll<HTMLElement>(".wl-login-info .wl-login-nick"),
			)
				.map((element) => element.textContent?.trim() || "")
				.find(Boolean) || "";

		const getCommentLink = (panel: HTMLElement) => {
			const loginNick = getLoginNick(panel);
			return (
				panel.querySelector<HTMLInputElement>('input[name="link"]')?.value ||
				(loginNick ? getStoredWalineUser(loginNick)?.url || "" : "")
			);
		};

		const getKind = (panel: HTMLElement) =>
			friendHosts.has(normalizeHost(getCommentLink(panel)))
				? "friend"
				: "visitor";

		const updateRateNote = (panel: HTMLElement) => {
			let note = panel.querySelector<HTMLElement>(
				":scope > [data-waline-comment-mode]",
			);
			if (!note) {
				note = document.createElement("p");
				note.className = "waline-comment-mode-note";
				note.dataset.walineCommentMode = "true";
				note.setAttribute("role", "note");
				const header = panel.querySelector<HTMLElement>(":scope > .wl-header");
				if (header) header.insertAdjacentElement("afterend", note);
				else panel.prepend(note);
			}

			note.hidden = !getCommentLink(panel).trim() && !getLoginNick(panel);
			const message =
				getKind(panel) === "friend" ? "当前模式：本站友链" : "当前模式：访客";
			if (note.textContent !== message) note.textContent = message;
		};

		const updatePanels = () => {
			frameId = undefined;
			if (disposed) return;
			root.querySelectorAll<HTMLElement>(".wl-panel").forEach(updateRateNote);
		};

		const scheduleUpdate = () => {
			if (frameId !== undefined || disposed) return;
			frameId = requestAnimationFrame(updatePanels);
		};

		root.addEventListener(
			"input",
			(event) => {
				if (!(event.target instanceof HTMLElement)) return;
				const panel = event.target.closest<HTMLElement>(".wl-panel");
				if (!panel) return;
				if (event.target.matches('input[name="link"]')) scheduleUpdate();
			},
			{ capture: true, signal: controller.signal },
		);

		const observer = new MutationObserver(scheduleUpdate);
		observer.observe(root, { childList: true, subtree: true });
		scheduleUpdate();

		return () => {
			disposed = true;
			controller.abort();
			observer.disconnect();
			if (frameId !== undefined) cancelAnimationFrame(frameId);
			root.querySelectorAll("[data-waline-comment-mode]").forEach((item) => {
				item.remove();
			});
		};
	};

	const setupCommentPresentation = (root: HTMLElement) => {
		const aiNick = "小爱客服";
		const disclaimerLead = "本信息由Ai自动理解后调用";
		const avatarSrc = "/favicon/chaoc-tingyu-avatar-512.png?v=20260907";
		const adminUrl = "https://rainzt.cn/ai-comment-admin/";
		const adminEntrySelector = '[data-waline-ai-admin-entry="true"]';
		const ownSiteUrl = normalizeSiteUrl(root.dataset.walineSiteUrl || "");
		const recommendedSiteUrls = new Set(
			getRecommendedSiteUrls(root).map(normalizeSiteUrl).filter(Boolean),
		);
		const ownerUserIds = getConfiguredUserIds(root.dataset.walineOwnerUserIds);
		const aiUserIds = getConfiguredUserIds(root.dataset.walineAiUserIds);
		const eventController = new AbortController();
		let frameId: number | undefined;
		let composerFrameId: number | undefined;
		let disposed = false;
		const mobileComposerQuery = window.matchMedia("(max-width: 580px)");
		const commentsSection = root.closest<HTMLElement>("#post-comments") ?? root;
		const mobileComposerBackdrop = document.createElement("button");
		const mobileCommentBar = document.createElement("div");
		let activeMobileComposer: HTMLElement | undefined;
		let mainComposerOpen = false;
		let openingEmoji = false;
		let composerResizeAnimation: Animation | undefined;
		let returnFocus: HTMLElement | null = null;
		let pendingMainSubmission:
			| { composer: HTMLElement; count: number }
			| undefined;

		mobileComposerBackdrop.type = "button";
		mobileComposerBackdrop.className = "waline-mobile-composer-backdrop";
		mobileComposerBackdrop.setAttribute("aria-label", "关闭评论编辑面板");
		mobileComposerBackdrop.tabIndex = -1;
		mobileComposerBackdrop.hidden = true;
		mobileCommentBar.className = "waline-mobile-comment-bar";
		mobileCommentBar.hidden = true;
		mobileCommentBar.innerHTML = `<button type="button" class="waline-mobile-comment-entry">欢迎评论</button><button type="button" class="waline-mobile-comment-emoji" aria-label="打开评论表情"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M8 9h.01M16 9h.01M8 14c2 3 6 3 8 0"/></svg></button>`;
		document.body.append(mobileComposerBackdrop, mobileCommentBar);

		const updateMobileViewport = () => {
			const viewport = window.visualViewport;
			const bottom = Math.max(
				0,
				window.innerHeight -
					(viewport?.height ?? window.innerHeight) -
					(viewport?.offsetTop ?? 0),
			);
			activeMobileComposer?.style.setProperty(
				"--waline-mobile-keyboard-bottom",
				`${bottom}px`,
			);
		};

		const getMissingMobileIdentity = (composer: HTMLElement) =>
			Array.from(
				composer.querySelectorAll<HTMLInputElement>(
					'.wl-header input[name="nick"], .wl-header input[name="mail"]',
				),
			).find((input) => !input.value.trim());

		const closeMobileComposer = () => {
			const composer = activeMobileComposer;
			mainComposerOpen = false;
			pendingMainSubmission = undefined;
			composerResizeAnimation?.cancel();
			if (composer) {
				const emoji = composer.querySelector<HTMLButtonElement>(
					'.wl-action[title="表情"]',
				);
				if (composer.querySelector(".wl-emoji-popup.display")) emoji?.click();
				composer
					.querySelector<HTMLButtonElement>(":scope > .wl-close")
					?.click();
				if (composer.matches(":popover-open")) composer.hidePopover();
			}
			updateMobileComposer();
			returnFocus?.focus({ preventScroll: true });
		};

		const updateMobileComposer = () => {
			composerFrameId = undefined;
			if (disposed) return;
			const isMobile = mobileComposerQuery.matches;
			root.toggleAttribute("data-waline-mobile", isMobile);
			const mainComposer = root.querySelector<HTMLElement>(
				"[data-waline] > .wl-comment",
			);
			if (
				pendingMainSubmission &&
				pendingMainSubmission.composer === mainComposer &&
				!mainComposer.querySelector<HTMLTextAreaElement>(".wl-editor")?.value &&
				root.querySelectorAll(".wl-card-item").length >
					pendingMainSubmission.count
			) {
				mainComposerOpen = false;
				pendingMainSubmission = undefined;
			}
			const replyComposer = root.querySelector<HTMLElement>(
				".wl-reply-wrapper > .wl-comment, .wl-edit-wrapper > .wl-comment",
			);
			const composer = isMobile
				? (replyComposer ?? (mainComposerOpen ? mainComposer : undefined))
				: undefined;
			const sectionRect = commentsSection.getBoundingClientRect();
			const commentsVisible =
				sectionRect.bottom > 0 && sectionRect.top < window.innerHeight;
			mobileCommentBar.hidden =
				!isMobile || !mainComposer || Boolean(composer) || !commentsVisible;
			document.body.toggleAttribute(
				"data-waline-mobile-bar",
				isMobile && Boolean(mainComposer) && commentsVisible,
			);
			document.body.toggleAttribute(
				"data-waline-mobile-sheet",
				Boolean(composer),
			);

			if (activeMobileComposer !== composer) {
				composerResizeAnimation?.cancel();
				if (activeMobileComposer) {
					if (activeMobileComposer.matches(":popover-open"))
						activeMobileComposer.hidePopover();
					activeMobileComposer.removeAttribute("popover");
					activeMobileComposer.removeAttribute(
						"data-waline-mobile-composer-active",
					);
					activeMobileComposer.removeAttribute(
						"data-waline-mobile-identity-open",
					);
					activeMobileComposer.removeAttribute("role");
					activeMobileComposer.removeAttribute("aria-modal");
					activeMobileComposer.removeAttribute("aria-label");
					activeMobileComposer.style.removeProperty(
						"--waline-mobile-keyboard-bottom",
					);
				}
				activeMobileComposer = composer ?? undefined;
				if (composer) {
					returnFocus =
						document.activeElement instanceof HTMLElement
							? document.activeElement
							: null;
					composer.setAttribute("data-waline-mobile-composer-active", "true");
					composer.setAttribute("popover", "manual");
					composer.setAttribute("role", "dialog");
					composer.setAttribute("aria-modal", "true");
					composer.setAttribute("aria-label", "评论编辑");
					const missingIdentity = getMissingMobileIdentity(composer);
					composer.toggleAttribute(
						"data-waline-mobile-identity-open",
						Boolean(missingIdentity),
					);
					composer.showPopover();
					const actions = composer.querySelector(".wl-actions");
					if (
						actions &&
						composer.querySelector(".wl-header input") &&
						!actions.querySelector(".waline-mobile-identity-toggle")
					) {
						const identity = document.createElement("button");
						identity.type = "button";
						identity.className = "wl-action waline-mobile-identity-toggle";
						identity.setAttribute("aria-label", "填写昵称和邮箱");
						identity.setAttribute(
							"aria-expanded",
							String(Boolean(missingIdentity)),
						);
						identity.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="8" r="4"/><path d="M4 22v-3a8 8 0 0 1 16 0v3"/></svg>`;
						identity.addEventListener(
							"click",
							() => {
								const open = composer.toggleAttribute(
									"data-waline-mobile-identity-open",
								);
								identity.setAttribute("aria-expanded", String(open));
								if (open)
									composer
										.querySelector<HTMLInputElement>('input[name="nick"]')
										?.focus({ preventScroll: true });
							},
							{ signal: eventController.signal },
						);
						actions.append(identity);
					}
					actions
						?.querySelector(".waline-mobile-identity-toggle")
						?.setAttribute("aria-expanded", String(Boolean(missingIdentity)));
					const info = composer.querySelector(".wl-info");
					if (info && !info.querySelector(".waline-mobile-cancel")) {
						const cancel = document.createElement("button");
						cancel.type = "button";
						cancel.className = "wl-btn waline-mobile-cancel";
						cancel.textContent = "取消";
						cancel.addEventListener("click", closeMobileComposer, {
							signal: eventController.signal,
						});
						info.insertBefore(cancel, info.querySelector(".primary"));
					}
					const nativeLogout =
						composer.querySelector<HTMLButtonElement>(".wl-logout-btn");
					if (
						info &&
						nativeLogout &&
						!info.querySelector(".waline-mobile-logout")
					) {
						const logout = document.createElement("button");
						logout.type = "button";
						logout.className = "wl-btn waline-mobile-logout";
						logout.textContent = "退出登录";
						logout.addEventListener(
							"click",
							(event) => {
								event.stopPropagation();
								nativeLogout.click();
							},
							{ signal: eventController.signal },
						);
						info.insertBefore(
							logout,
							info.querySelector(".waline-mobile-cancel, .primary"),
						);
					}
					const editor =
						composer.querySelector<HTMLTextAreaElement>(".wl-editor");
					if (editor?.placeholder.startsWith("@"))
						editor.placeholder = `回复 ${editor.placeholder}：`;
					if (!openingEmoji)
						(missingIdentity ?? editor)?.focus({ preventScroll: true });
				}
			}
			mobileComposerBackdrop.hidden = !composer;
			updateMobileViewport();
		};

		const scheduleMobileComposerUpdate = () => {
			if (composerFrameId !== undefined) return;
			composerFrameId = requestAnimationFrame(updateMobileComposer);
		};

		mobileCommentBar.addEventListener(
			"click",
			(event) => {
				// Waline's document listener would otherwise treat this launcher click
				// as an outside click and immediately close the newly opened picker.
				event.stopPropagation();
				openingEmoji = Boolean(
					(event.target as Element).closest(".waline-mobile-comment-emoji"),
				);
				mainComposerOpen = true;
				updateMobileComposer();
				if (openingEmoji) {
					activeMobileComposer
						?.querySelector<HTMLButtonElement>('.wl-action[title="表情"]')
						?.click();
					activeMobileComposer
						?.querySelector<HTMLTextAreaElement>(".wl-editor")
						?.blur();
				}
				openingEmoji = false;
			},
			{ signal: eventController.signal },
		);
		root.addEventListener(
			"click",
			(event) => {
				const target = event.target as Element;
				if (
					mobileComposerQuery.matches &&
					target.closest(".wl-reply, .wl-edit")
				)
					mainComposerOpen = false;
				if (
					activeMobileComposer &&
					target.closest(
						'.wl-action[title="表情"], .wl-tab-wrapper button, .waline-lottie-picker__item, .waline-kaomoji-picker__item',
					)
				) {
					const currentComposer = activeMobileComposer;
					const animateResize =
						!openingEmoji &&
						Boolean(target.closest('.wl-action[title="表情"]'));
					const previousHeight = currentComposer.getBoundingClientRect().height;
					requestAnimationFrame(() => {
						if (disposed || activeMobileComposer !== currentComposer) return;
						if (animateResize) composerResizeAnimation?.cancel();
						const nextHeight = currentComposer.getBoundingClientRect().height;
						if (
							animateResize &&
							Math.abs(nextHeight - previousHeight) > 1 &&
							!window.matchMedia("(prefers-reduced-motion: reduce)").matches
						) {
							composerResizeAnimation = currentComposer.animate(
								[
									{ height: `${previousHeight}px` },
									{ height: `${nextHeight}px` },
								],
								{ duration: 220, easing: "cubic-bezier(0.22, 0.61, 0.36, 1)" },
							);
						}
						const editor =
							activeMobileComposer?.querySelector<HTMLTextAreaElement>(
								".wl-editor",
							);
						if (activeMobileComposer?.querySelector(".wl-emoji-popup.display"))
							editor?.blur();
						else editor?.focus({ preventScroll: true });
					});
				}
				scheduleMobileComposerUpdate();
			},
			{ signal: eventController.signal },
		);
		// Reveal required guest details before Waline handles submission.
		root.addEventListener(
			"click",
			(event) => {
				if (
					!activeMobileComposer ||
					!(event.target as Element).closest('.wl-btn[type="submit"]')
				)
					return;
				const missing = getMissingMobileIdentity(activeMobileComposer);
				if (!missing) {
					if (
						activeMobileComposer.matches("[data-waline] > .wl-comment") &&
						activeMobileComposer
							.querySelector<HTMLTextAreaElement>(".wl-editor")
							?.value.trim()
					) {
						pendingMainSubmission = {
							composer: activeMobileComposer,
							count: root.querySelectorAll(".wl-card-item").length,
						};
					}
					return;
				}
				event.preventDefault();
				event.stopImmediatePropagation();
				activeMobileComposer.setAttribute(
					"data-waline-mobile-identity-open",
					"true",
				);
				activeMobileComposer
					.querySelector(".waline-mobile-identity-toggle")
					?.setAttribute("aria-expanded", "true");
				missing.focus({ preventScroll: true });
			},
			{ capture: true, signal: eventController.signal },
		);
		mobileComposerQuery.addEventListener(
			"change",
			scheduleMobileComposerUpdate,
			{ signal: eventController.signal },
		);
		window.addEventListener("scroll", scheduleMobileComposerUpdate, {
			passive: true,
			signal: eventController.signal,
		});
		window.addEventListener("resize", updateMobileViewport, {
			signal: eventController.signal,
		});
		window.visualViewport?.addEventListener("resize", updateMobileViewport, {
			signal: eventController.signal,
		});
		window.visualViewport?.addEventListener("scroll", updateMobileViewport, {
			signal: eventController.signal,
		});
		mobileComposerBackdrop.addEventListener("click", closeMobileComposer, {
			signal: eventController.signal,
		});
		document.addEventListener(
			"keydown",
			(event) => {
				if (!activeMobileComposer) return;
				if (event.key === "Escape") {
					event.preventDefault();
					closeMobileComposer();
				} else if (event.key === "Tab") {
					const controls = Array.from(
						activeMobileComposer.querySelectorAll<HTMLElement>(
							"button:not(:disabled), input:not(:disabled), textarea, a[href]",
						),
					).filter((element) => element.getClientRects().length > 0);
					const first = controls[0];
					const last = controls.at(-1);
					if (event.shiftKey && document.activeElement === first) {
						event.preventDefault();
						last?.focus();
					} else if (!event.shiftKey && document.activeElement === last) {
						event.preventDefault();
						first?.focus();
					}
				}
			},
			{ signal: eventController.signal },
		);
		const getNickUrl = (nick: HTMLElement | null) =>
			nick instanceof HTMLAnchorElement
				? normalizeSiteUrl(nick.getAttribute("href") || nick.href)
				: "";

		const hasOwnerLabel = (head: HTMLElement | null) =>
			Boolean(
				head &&
					Array.from(
						head.querySelectorAll<HTMLElement>(
							":scope > .wl-badge:not(.wl-role-badge)",
						),
					).some((badge) => badge.textContent?.trim() === "本站主理人"),
			);

		type WalineMetaIconKind = "browser" | "os";

		const metaIconNames = {
			android: "simple-icons:android",
			brave: "simple-icons:brave",
			chrome: "simple-icons:googlechrome",
			firefox: "simple-icons:firefox",
			ios: "material-symbols:phone-iphone",
			linux: "simple-icons:linux",
			macos: "simple-icons:apple",
			mobile: "material-symbols:smartphone",
			microsoftedge: "simple-icons:microsoftedge",
			opera: "simple-icons:opera",
			safari: "simple-icons:safari",
			windows: "simple-icons:windows",
		} as const;

		type WalineMetaIcon = keyof typeof metaIconNames;

		const normalizeMetaValue = (value: string) =>
			value.trim().toLowerCase().replace(/\s+/gu, " ");

		const getMetaIcon = (
			field: HTMLElement,
			kind: WalineMetaIconKind,
		): WalineMetaIcon | null => {
			const value = normalizeMetaValue(field.textContent || "");
			if (!value) return null;

			if (kind === "os") {
				if (value.includes("windows")) return "windows";
				if (value.includes("android")) return "android";
				if (/iphone|ipad|ipod|ios/iu.test(value)) return "ios";
				if (/macos|mac os|os x|macintosh/iu.test(value)) return "macos";
				if (/linux|ubuntu|debian|fedora|arch/iu.test(value)) return "linux";
				if (/mobile|tablet|phone/iu.test(value)) return "mobile";
				return null;
			}

			if (/brave/iu.test(value)) return "brave";
			if (/opera|opr\//iu.test(value)) return "opera";
			if (/edge|edg\//iu.test(value)) return "microsoftedge";
			if (/firefox|fxios/iu.test(value)) return "firefox";
			if (/chrome|crios/iu.test(value)) return "chrome";
			if (/safari/iu.test(value)) return "safari";
			return null;
		};

		const syncMetaFieldIcon = (
			field: HTMLElement,
			kind: WalineMetaIconKind,
		) => {
			const iconKind = getMetaIcon(field, kind);
			const currentIcon = field.querySelector<HTMLElement>(
				":scope > .waline-meta-icon",
			);
			if (!iconKind) {
				currentIcon?.remove();
				return;
			}

			const iconName = metaIconNames[iconKind];
			const icon = currentIcon || document.createElement("span");
			icon.className = "waline-meta-icon";
			icon.dataset.walineMetaIcon = iconKind;
			icon.dataset.walineMetaIconName = iconName;
			icon.setAttribute("aria-hidden", "true");
			if (icon.dataset.walineMetaIconRendered !== iconName) {
				icon.innerHTML = getIconSvg(iconName);
				icon.dataset.walineMetaIconRendered = iconName;
			}
			if (!currentIcon) field.prepend(icon);
		};

		const syncMetaIcons = (meta: HTMLElement) => {
			const os = meta.querySelector<HTMLElement>(":scope > .wl-os");
			const browser = meta.querySelector<HTMLElement>(":scope > .wl-browser");
			if (os) syncMetaFieldIcon(os, "os");
			if (browser) syncMetaFieldIcon(browser, "browser");
		};

		const getComposerRole = (comment: HTMLElement): WalineRole | null => {
			const loginInfo = comment.querySelector<HTMLElement>(
				":scope > .wl-login-info",
			);
			if (loginInfo) {
				const loginNick = Array.from(
					loginInfo.querySelectorAll<HTMLElement>(":scope > .wl-login-nick"),
				)
					.map((element) => element.textContent?.trim() || "")
					.find(Boolean);
				const user = loginNick ? getStoredWalineUser(loginNick) : null;
				if (!user) return null;

				const userUrl = normalizeSiteUrl(user.url);
				if (user.type === "administrator") {
					if (aiUserIds.has(user.objectId)) return "ai";
					if (ownerUserIds.has(user.objectId)) return "owner";
					return "admin";
				}

				return userUrl && recommendedSiteUrls.has(userUrl)
					? "recommended"
					: null;
			}

			const linkInput = comment.querySelector<HTMLInputElement>(
				':scope > .wl-panel input[name="link"]',
			);
			const linkUrl = normalizeSiteUrl(linkInput?.value || "");
			return linkUrl && recommendedSiteUrls.has(linkUrl) ? "recommended" : null;
		};

		const syncComposerIdentity = (
			comment: HTMLElement,
			role: WalineRole | null,
		) => {
			const panel = comment.querySelector<HTMLElement>(":scope > .wl-panel");
			if (!panel) return;

			if (role) {
				comment.dataset.walineComposerRole = role;
			} else {
				delete comment.dataset.walineComposerRole;
			}

			let identity = panel.querySelector<HTMLElement>(
				":scope > [data-waline-composer-identity]",
			);
			if (!role) {
				identity?.remove();
				return;
			}

			if (!identity) {
				identity = document.createElement("div");
				identity.className = "wl-composer-identity";
				identity.dataset.walineComposerIdentity = "true";
				identity.setAttribute("role", "status");
				identity.setAttribute("aria-live", "polite");
			}

			const action = comment.parentElement?.classList.contains(
				"wl-reply-wrapper",
			)
				? "回复"
				: comment.parentElement?.classList.contains("wl-edit-wrapper")
					? "编辑"
					: null;
			const labelText = action
				? `${roleLabels[role].label} · 正在${action}`
				: composerRoleLabels[role].label;

			if (identity.dataset.walineComposerRole !== role) {
				const icon = document.createElement("span");
				icon.className = "wl-composer-identity-icon";
				icon.setAttribute("aria-hidden", "true");

				const label = document.createElement("span");
				label.className = "wl-composer-identity-label";
				identity.replaceChildren(icon, label);
				identity.dataset.walineComposerRole = role;
			}
			const label = identity.querySelector<HTMLElement>(
				":scope > .wl-composer-identity-label",
			);
			if (label && label.textContent !== labelText)
				label.textContent = labelText;
			identity.title = action
				? `当前以${roleLabels[role].label}身份${action}`
				: composerRoleLabels[role].title;

			const header = panel.querySelector<HTMLElement>(":scope > .wl-header");
			if (header) {
				if (identity.previousElementSibling !== header) {
					header.insertAdjacentElement("afterend", identity);
				}
			} else if (panel.firstElementChild !== identity) {
				panel.prepend(identity);
			}
		};

		const syncRoleBadge = (
			head: HTMLElement | null,
			nick: HTMLElement | null,
			role: WalineRole | null,
		) => {
			if (!head) return;

			const customBadges = Array.from(
				head.querySelectorAll<HTMLElement>(
					":scope > [data-waline-role-badge], :scope > [data-waline-ai-badge]",
				),
			);
			if (!nick || !role) {
				customBadges.forEach((badge) => {
					badge.remove();
				});
				return;
			}

			const badge = customBadges.shift() || document.createElement("span");
			customBadges.forEach((extraBadge) => {
				extraBadge.remove();
			});

			const { label, title } = roleLabels[role];
			badge.className = `wl-badge wl-role-badge${role === "ai" ? " wl-ai-badge" : ""}`;
			badge.dataset.walineRoleBadge = role;
			if (role === "ai") {
				badge.dataset.walineAiBadge = "true";
			} else {
				delete badge.dataset.walineAiBadge;
			}
			if (badge.textContent !== label) badge.textContent = label;
			badge.title = title;

			if (!badge.isConnected || badge.parentElement !== head) {
				nick.insertAdjacentElement("afterend", badge);
			}
		};

		const syncNativeOwnerLabel = (
			head: HTMLElement | null,
			role: WalineRole | null,
		) => {
			head
				?.querySelectorAll<HTMLElement>(
					":scope > .wl-badge:not(.wl-role-badge)",
				)
				.forEach((badge) => {
					badge.toggleAttribute(
						"data-waline-native-owner-label",
						role === "owner" && badge.textContent?.trim() === "本站主理人",
					);
				});
		};

		const clearAiEntry = (
			nick: HTMLElement | null,
			content: HTMLElement | null,
		) => {
			if (nick?.dataset.walineAiAdminEntry === "true") {
				delete nick.dataset.walineAiAdminEntry;
				nick.removeAttribute("tabindex");
				nick.removeAttribute("title");
				nick.removeAttribute("aria-label");
				if (
					!(nick instanceof HTMLAnchorElement) &&
					nick.getAttribute("role") === "link"
				) {
					nick.removeAttribute("role");
				}
			}
			content
				?.querySelectorAll<HTMLElement>(".wl-ai-disclaimer")
				.forEach((element) => {
					element.classList.remove("wl-ai-disclaimer");
				});
		};

		const getAdminEntry = (target: EventTarget | null) =>
			target instanceof Element
				? target.closest<HTMLElement>(adminEntrySelector)
				: null;

		root.addEventListener(
			"click",
			(event) => {
				if (getAdminEntry(event.target)) event.preventDefault();
			},
			{ signal: eventController.signal },
		);
		root.addEventListener(
			"dblclick",
			(event) => {
				if (!getAdminEntry(event.target)) return;
				event.preventDefault();
				window.location.assign(adminUrl);
			},
			{ signal: eventController.signal },
		);
		root.addEventListener(
			"keydown",
			(event) => {
				if (event.key !== "Enter" || !getAdminEntry(event.target)) return;
				event.preventDefault();
				window.location.assign(adminUrl);
			},
			{ signal: eventController.signal },
		);

		const decorate = () => {
			frameId = undefined;
			if (disposed) return;

			root.querySelectorAll<HTMLElement>(".wl-card-item").forEach((item) => {
				const head = item.querySelector<HTMLElement>(
					":scope > .wl-card > .wl-head",
				);
				const nick =
					head?.querySelector<HTMLElement>(":scope > .wl-nick") || null;
				const meta = item.querySelector<HTMLElement>(
					":scope > .wl-card > .wl-meta",
				);
				const message = item.querySelector<HTMLElement>(
					":scope > .wl-card > .wl-content",
				);
				const content = item.querySelector<HTMLElement>(
					":scope > .wl-card > .wl-content > div",
				);
				const nickUrl = getNickUrl(nick);
				const isAi =
					nick?.textContent?.trim() === aiNick &&
					Boolean(content?.textContent?.includes(disclaimerLead));
				const isAdmin = Boolean(
					item.querySelector(":scope > .wl-user > .administrator-icon"),
				);

				let role: WalineRole | null = null;
				if (isAi) {
					role = "ai";
				} else if (
					isAdmin &&
					((ownSiteUrl && nickUrl === ownSiteUrl) || hasOwnerLabel(head))
				) {
					role = "owner";
				} else if (isAdmin) {
					role = "admin";
				} else if (nickUrl && recommendedSiteUrls.has(nickUrl)) {
					role = "recommended";
				}

				const isThreadStarter =
					item.parentElement?.classList.contains("wl-cards") === true;
				const messageSide =
					role === "ai" || (role === "owner" && !isThreadStarter)
						? "right"
						: "left";
				item.dataset.walineSide = messageSide;
				item.dataset.walineThreadStarter = String(isThreadStarter);

				if (
					message &&
					!message.querySelector(":scope > [data-waline-bubble-tail]")
				) {
					const tail = document.createElement("span");
					tail.className = "wl-bubble-tail";
					tail.dataset.walineBubbleTail = "true";
					tail.setAttribute("aria-hidden", "true");
					message.prepend(tail);
				}

				if (role) {
					item.dataset.walineRole = role;
				} else {
					delete item.dataset.walineRole;
				}
				item.classList.toggle("wl-ai-comment", role === "ai");
				syncRoleBadge(head, nick, role);
				syncNativeOwnerLabel(head, role);
				if (head && meta) {
					const time = head.querySelector<HTMLElement>(":scope > .wl-time");
					if (time && meta.previousElementSibling !== time) {
						time.insertAdjacentElement("afterend", meta);
					} else if (!time && meta.parentElement !== head) {
						head.append(meta);
					}
					syncMetaIcons(meta);
				}

				if (role !== "ai" || !nick || !content) {
					clearAiEntry(nick, content);
					return;
				}

				const replyTarget = item.querySelector<HTMLAnchorElement>(
					":scope > .wl-card > .wl-content > .wl-reply-to > a",
				);
				const legacyBodyMention = content.querySelector<HTMLAnchorElement>(
					":scope > p:first-child > a:first-child",
				);
				if (
					replyTarget &&
					legacyBodyMention &&
					replyTarget.getAttribute("href") ===
						legacyBodyMention.getAttribute("href") &&
					replyTarget.textContent?.trim() ===
						legacyBodyMention.textContent?.trim()
				) {
					const separator = legacyBodyMention.nextSibling;
					if (separator instanceof Text) {
						separator.textContent =
							separator.textContent?.replace(/^\s*[:：]\s*/u, "") ?? "";
					}
					legacyBodyMention.remove();
				}

				const user = item.querySelector<HTMLElement>(":scope > .wl-user");
				let avatar = user?.querySelector<HTMLImageElement>(".wl-user-avatar");
				if (user && !avatar) {
					avatar = document.createElement("img");
					avatar.className = "wl-user-avatar";
					avatar.alt = "小爱客服的 AI 头像";
					user.prepend(avatar);
				}
				if (avatar && avatar.dataset.xiaoaiAvatar !== "true") {
					avatar.src = avatarSrc;
					avatar.removeAttribute("srcset");
					avatar.loading = "lazy";
					avatar.decoding = "async";
					avatar.referrerPolicy = "no-referrer";
					avatar.dataset.xiaoaiAvatar = "true";
				}

				nick.dataset.walineAiAdminEntry = "true";
				nick.tabIndex = 0;
				nick.title = "双击进入小爱客服后台";
				nick.setAttribute(
					"aria-label",
					"小爱客服，双击或按 Enter 进入管理后台",
				);
				if (!(nick instanceof HTMLAnchorElement))
					nick.setAttribute("role", "link");

				const disclaimer = Array.from(
					content.querySelectorAll<HTMLElement>("p, small, div"),
				).find((element) =>
					element.textContent?.trim().startsWith(disclaimerLead),
				);
				if (disclaimer) disclaimer.classList.add("wl-ai-disclaimer");
			});

			root.querySelectorAll<HTMLElement>(".wl-comment").forEach((comment) => {
				syncComposerIdentity(comment, getComposerRole(comment));
			});
		};

		const schedule = () => {
			if (frameId !== undefined || disposed) return;
			frameId = requestAnimationFrame(decorate);
		};

		const scheduleComposerLinkSync = (event: Event) => {
			const target = event.target;
			if (target instanceof HTMLInputElement && target.name === "link")
				schedule();
		};
		root.addEventListener("input", scheduleComposerLinkSync, {
			signal: eventController.signal,
		});
		root.addEventListener("change", scheduleComposerLinkSync, {
			signal: eventController.signal,
		});
		window.addEventListener("storage", schedule, {
			signal: eventController.signal,
		});
		window.addEventListener(
			"message",
			(event) => {
				if (event.data?.type === "profile") schedule();
			},
			{ signal: eventController.signal },
		);

		const observer = new MutationObserver(() => {
			schedule();
			scheduleMobileComposerUpdate();
		});
		observer.observe(root, {
			childList: true,
			subtree: true,
			characterData: true,
		});
		schedule();
		scheduleMobileComposerUpdate();

		return () => {
			disposed = true;
			eventController.abort();
			observer.disconnect();
			if (frameId !== undefined) cancelAnimationFrame(frameId);
			if (composerFrameId !== undefined) cancelAnimationFrame(composerFrameId);
			composerResizeAnimation?.cancel();
			if (activeMobileComposer?.matches(":popover-open"))
				activeMobileComposer.hidePopover();
			activeMobileComposer?.removeAttribute("popover");
			activeMobileComposer?.removeAttribute(
				"data-waline-mobile-composer-active",
			);
			activeMobileComposer?.removeAttribute("data-waline-mobile-identity-open");
			activeMobileComposer?.removeAttribute("role");
			activeMobileComposer?.removeAttribute("aria-modal");
			activeMobileComposer?.removeAttribute("aria-label");
			activeMobileComposer?.style.removeProperty(
				"--waline-mobile-keyboard-bottom",
			);
			root.removeAttribute("data-waline-mobile");
			document.body.removeAttribute("data-waline-mobile-bar");
			document.body.removeAttribute("data-waline-mobile-sheet");
			mobileComposerBackdrop.remove();
			mobileCommentBar.remove();
			root
				.querySelectorAll(
					".waline-mobile-identity-toggle, .waline-mobile-cancel, .waline-mobile-logout",
				)
				.forEach((button) => {
					button.remove();
				});
			root.querySelectorAll<HTMLElement>(".wl-comment").forEach((comment) => {
				delete comment.dataset.walineComposerRole;
				comment
					.querySelectorAll<HTMLElement>("[data-waline-composer-identity]")
					.forEach((identity) => {
						identity.remove();
					});
			});
			root.querySelectorAll<HTMLElement>(".wl-card-item").forEach((item) => {
				delete item.dataset.walineSide;
				delete item.dataset.walineThreadStarter;
				item
					.querySelectorAll<HTMLElement>("[data-waline-bubble-tail]")
					.forEach((tail) => {
						tail.remove();
					});
				item
					.querySelectorAll<HTMLElement>(".waline-meta-icon")
					.forEach((icon) => {
						icon.remove();
					});
			});
		};
	};

	const getConfig = (root: HTMLElement) => {
		try {
			return JSON.parse(root.dataset.walineConfig || "{}");
		} catch (error) {
			console.error(
				"[Waline] Failed to parse the comment configuration.",
				error,
			);
			return null;
		}
	};

	const teardownWaline = () => {
		if (activeRoot) {
			delete activeRoot.dataset.walineReady;
			delete activeRoot.dataset.walineLoading;
		}
		try {
			activeInstance?.destroy?.();
		} catch (error) {
			console.error(
				"[Waline] Failed to destroy the previous comment client.",
				error,
			);
		}
		activeInstance = undefined;

		avatarPreviewCleanup?.();
		avatarPreviewCleanup = undefined;
		pickerPositionCleanup?.();
		pickerPositionCleanup = undefined;
		emojiFallbackCleanup?.();
		emojiFallbackCleanup = undefined;
		lottiePickerCleanup?.();
		lottiePickerCleanup = undefined;
		lottieCommentsCleanup?.();
		lottieCommentsCleanup = undefined;
		replyCollapseCleanup?.();
		replyCollapseCleanup = undefined;
		ownedCommentFilterCleanup?.();
		ownedCommentFilterCleanup = undefined;
		commentHintCleanup?.();
		commentHintCleanup = undefined;
		commentModeCleanup?.();
		commentModeCleanup = undefined;
		commentAnchorCleanup?.();
		commentAnchorCleanup = undefined;
		commentPresentationCleanup?.();
		commentPresentationCleanup = undefined;
		activeRoot = undefined;
	};

	const disconnectRootObserver = () => {
		rootObserver?.disconnect();
		rootObserver = undefined;
		observedTarget = undefined;
	};

	const cancelPendingInit = () => {
		initGeneration += 1;
		if (pendingRoot) delete pendingRoot.dataset.walineLoading;
		pendingRoot = undefined;
	};

	const initWaline = async (root: HTMLElement) => {
		hideLocalPageviewCounters();
		if (!root.isConnected || document.querySelector(rootSelector) !== root)
			return;
		if (root === activeRoot && root.dataset.walineReady === "true") return;
		if (root === pendingRoot) return;

		cancelPendingInit();
		teardownWaline();

		const config = getConfig(root);
		if (!config?.serverURL) return;

		const generation = ++initGeneration;
		pendingRoot = root;
		root.dataset.walineLoading = "true";
		try {
			const init = await loadWaline();
			if (
				generation !== initGeneration ||
				pendingRoot !== root ||
				!root.isConnected ||
				document.querySelector(rootSelector) !== root
			) {
				return;
			}

			// Disable Waline's built-in image button. Its default uploader embeds files as
			// Base64 in the comment body, which can exceed the configured word limit even
			// for very small screenshots.
			const mobile = window.matchMedia("(max-width: 580px)").matches;
			const emoji = Array.isArray(config.emoji)
				? config.emoji.map((source: unknown) =>
						typeof source === "string" && source.endsWith("/bilibili")
							? `${import.meta.env.BASE_URL}assets/waline-emojis/bilibili`
							: source,
					)
				: config.emoji;
			// Keep the reference sticker set local so opening it needs no CDN request.
			if (mobile && Array.isArray(emoji)) {
				const bilibili = emoji.findIndex(
					(source) =>
						typeof source === "string" && source.endsWith("/bilibili"),
				);
				if (bilibili > 0) emoji.unshift(...emoji.splice(bilibili, 1));
			}
			const runtimeConfig = {
				...config,
				emoji,
				...(isLocalPreview ? { pageview: false } : {}),
			};
			const instance = init({
				...runtimeConfig,
				imageUploader: false,
				el: root,
			});
			if (generation !== initGeneration || pendingRoot !== root) {
				instance?.destroy?.();
				return;
			}

			activeInstance = instance;
			activeRoot = root;
			root.dataset.walineReady = "true";
			avatarPreviewCleanup = setupAvatarPreview(root);
			pickerPositionCleanup = setupPickerPositioning(root);
			emojiFallbackCleanup = setupEmojiFallback(root, runtimeConfig.emoji);
			lottiePickerCleanup = setupLottieEmojiPicker(root);
			lottieCommentsCleanup = setupLottieComments(root);
			replyCollapseCleanup = setupReplyCollapse(root);
			commentPresentationCleanup = setupCommentPresentation(root);
			ownedCommentFilterCleanup = setupOwnedCommentFilter(root, config);
			commentHintCleanup = setupCommentHint(root);
			commentModeCleanup = setupCommentMode(root);
			commentAnchorCleanup = setupCommentAnchorNavigation(root);
		} catch (error) {
			delete root.dataset.walineReady;
			if (pendingRoot === root) teardownWaline();
			console.error("[Waline] Failed to load the comment client.", error);
		} finally {
			if (pendingRoot === root) {
				delete root.dataset.walineLoading;
				pendingRoot = undefined;
			}
		}
	};

	const observeWalineRoot = (root: HTMLElement) => {
		const config = getConfig(root);
		const shouldLoadPageviewEarly =
			!isLocalPreview && config?.pageview === true;
		const target = root.closest<HTMLElement>("#post-comments") || root;
		if (observedTarget === target) return;

		disconnectRootObserver();
		if (
			window.location.hash ||
			window.matchMedia("(max-width: 580px)").matches ||
			!("IntersectionObserver" in window) ||
			shouldLoadPageviewEarly
		) {
			void initWaline(root);
			return;
		}

		observedTarget = target;
		rootObserver = new IntersectionObserver(
			(entries) => {
				if (!entries.some((entry) => entry.isIntersecting)) return;
				disconnectRootObserver();
				void initWaline(root);
			},
			// The comments are intentionally below the friend list. Load them shortly
			// before they enter the viewport, instead of during first paint.
			{ rootMargin: "0px 0px 720px 0px", threshold: 0 },
		);
		rootObserver.observe(target);
	};

	const syncWalineRoot = () => {
		const root = document.querySelector<HTMLElement>(rootSelector);
		if (!root) {
			disconnectRootObserver();
			cancelPendingInit();
			teardownWaline();
			return;
		}

		if (root !== activeRoot && root !== pendingRoot) {
			cancelPendingInit();
			teardownWaline();
		}
		if (root === activeRoot && root.dataset.walineReady === "true") return;
		if (root === pendingRoot) return;
		observeWalineRoot(root);
	};

	const scheduleWalineInit = () => {
		if (initQueued) return;
		initQueued = true;
		requestAnimationFrame(() => {
			initQueued = false;
			syncWalineRoot();
		});
	};

	const friendApplicationTemplate = [
		"站点名称：",
		"站点描述：",
		"站点链接：",
		"头像链接：",
		"主页截图：",
		"RSS地址：",
	].join("\n");
	document.addEventListener("click", (event) => {
		if (!(event.target instanceof Element)) return;
		if (!event.target.closest("[data-friends-application]")) return;
		if (!document.querySelector("#post-comments [data-waline-root]")) return;

		let attempts = 0;
		const fillEditor = () => {
			const editor = document.querySelector<HTMLTextAreaElement>(
				"#post-comments [data-waline-root] .wl-editor",
			);
			if (editor) {
				if (!editor.value.trim()) {
					editor.value = friendApplicationTemplate;
					editor.dispatchEvent(
						new InputEvent("input", {
							bubbles: true,
							data: friendApplicationTemplate,
							inputType: "insertText",
						}),
					);
				}
				return;
			}

			if (attempts < 100) {
				attempts += 1;
				window.setTimeout(fillEditor, 100);
			}
		};

		window.setTimeout(fillEditor, 0);
	});

	scheduleWalineInit();
	document.addEventListener("astro:page-load", scheduleWalineInit);
	document.addEventListener("swup:contentReplaced", scheduleWalineInit);
	document.addEventListener("swup:page:view", scheduleWalineInit);
	document.addEventListener("hashchange", scheduleWalineInit);
})();
