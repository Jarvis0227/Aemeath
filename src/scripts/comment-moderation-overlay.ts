type ReviewState = "reviewing" | "rejected" | "publishing";

type ReviewCopy = {
	state: ReviewState;
	title: string;
	detail: string;
	category?: string;
};

const COMMENT_ENDPOINT = /\/api\/comment\/?$/u;
const SUCCESS_FADE_MS = 760;
const CLOSE_FADE_MS = 220;

const readRequestDetails = (input: RequestInfo | URL, init?: RequestInit) => {
	const request = input instanceof Request ? input : undefined;
	const method = (init?.method || request?.method || "GET").toUpperCase();
	const href =
		input instanceof Request
			? input.url
			: input instanceof URL
				? input.href
				: String(input);

	try {
		return { method, pathname: new URL(href, document.baseURI).pathname };
	} catch {
		return { method, pathname: "" };
	}
};

const getResponseError = (payload: unknown) => {
	if (!payload || typeof payload !== "object" || Array.isArray(payload))
		return undefined;
	const response = payload as Record<string, unknown>;
	const data =
		response.data &&
		typeof response.data === "object" &&
		!Array.isArray(response.data)
			? (response.data as Record<string, unknown>)
			: undefined;
	const message = [response.errmsg, data?.errmsg].find(
		(value): value is string =>
			typeof value === "string" && value.trim().length > 0,
	);
	if (message) return message.trim();
	const errno = Number(response.errno);
	return Number.isFinite(errno) && errno !== 0
		? "评论未能发布，请检查后重试。"
		: undefined;
};

const parseReviewCopy = (message: string): ReviewCopy => {
	const violation = message.match(
		/^评论区违规：(.+?)。原因：([\s\S]+?)(?:。请修改后再发布。)?$/u,
	);
	return {
		state: "rejected",
		title: violation ? "这条评论暂时不能发布" : "暂时无法发布",
		detail: violation?.[2] || message,
		...(violation?.[1] ? { category: violation[1] } : {}),
	};
};

export const setupCommentModerationOverlay = (
	root: HTMLElement,
): (() => void) => {
	const controller = new AbortController();
	const originalFetch = window.fetch;
	const originalAlert = window.alert;
	let activeComposer: HTMLElement | undefined;
	let suppressedAlert: string | undefined;
	let suppressionTimer: number | undefined;
	const closeTimers = new WeakMap<HTMLElement, number>();
	const publishTimers = new WeakMap<HTMLElement, number>();
	const sizeObservers = new Set<ResizeObserver>();
	const sizeFrames = new Map<HTMLElement, number>();
	const updateOverlaySizes = new WeakMap<HTMLElement, () => void>();

	const markAlertForSuppression = (message: string) => {
		suppressedAlert = message;
		if (suppressionTimer !== undefined) window.clearTimeout(suppressionTimer);
		suppressionTimer = window.setTimeout(() => {
			suppressedAlert = undefined;
			suppressionTimer = undefined;
		}, 1800);
	};

	const alertProxy: typeof window.alert = (message?: string) => {
		if (suppressedAlert && String(message ?? "") === suppressedAlert) {
			suppressedAlert = undefined;
			if (suppressionTimer !== undefined) window.clearTimeout(suppressionTimer);
			suppressionTimer = undefined;
			return;
		}
		originalAlert.call(window, message);
	};
	window.alert = alertProxy;

	const overlays = new WeakMap<HTMLElement, () => void>();
	const inertChildren = new WeakMap<HTMLElement, Map<HTMLElement, boolean>>();

	const showOverlay = (composer: HTMLElement, copy: ReviewCopy) => {
		const panel = composer.querySelector<HTMLElement>(":scope > .wl-panel");
		if (!panel) return undefined;

		let overlay = panel.querySelector<HTMLElement>(
			":scope > .waline-review-overlay",
		);
		if (!overlay) {
			overlay = document.createElement("div");
			overlay.className = "waline-review-overlay";
			overlay.hidden = true;
			overlay.setAttribute("role", "status");
			overlay.setAttribute("aria-live", "polite");
			overlay.setAttribute("aria-atomic", "true");

			const content = document.createElement("div");
			content.className = "waline-review-overlay__content";
			const mark = document.createElement("span");
			mark.className = "waline-review-overlay__mark";
			mark.setAttribute("aria-hidden", "true");
			const eyebrow = document.createElement("span");
			eyebrow.className = "waline-review-overlay__eyebrow";
			const title = document.createElement("strong");
			title.className = "waline-review-overlay__title";
			const category = document.createElement("span");
			category.className = "waline-review-overlay__category";
			const detail = document.createElement("span");
			detail.className = "waline-review-overlay__detail";
			const close = document.createElement("button");
			close.className = "waline-review-overlay__close";
			close.type = "button";
			close.textContent = "返回修改";
			close.hidden = true;
			content.append(mark, eyebrow, title, category, detail, close);
			overlay.append(content);
			panel.append(overlay);
			const createdOverlay = overlay;
			const updateSize = () => {
				if (createdOverlay.hidden) return;
				const style = getComputedStyle(createdOverlay);
				const panelStyle = getComputedStyle(panel);
				const verticalSpace =
					Number.parseFloat(style.paddingTop) +
					Number.parseFloat(style.paddingBottom) +
					Number.parseFloat(style.borderTopWidth) +
					Number.parseFloat(style.borderBottomWidth) +
					Number.parseFloat(panelStyle.borderTopWidth) +
					Number.parseFloat(panelStyle.borderBottomWidth);
				const height = `${Math.ceil(content.getBoundingClientRect().height + verticalSpace)}px`;
				if (
					panel.style.getPropertyValue("--waline-review-min-height") !== height
				)
					panel.style.setProperty("--waline-review-min-height", height);
			};
			const sizeObserver = new ResizeObserver(() => {
				if (sizeFrames.has(composer)) return;
				sizeFrames.set(
					composer,
					requestAnimationFrame(() => {
						sizeFrames.delete(composer);
						updateSize();
					}),
				);
			});
			sizeObserver.observe(content);
			sizeObservers.add(sizeObserver);
			updateOverlaySizes.set(composer, updateSize);

			const hide = () => {
				const timer = closeTimers.get(composer);
				if (timer !== undefined) window.clearTimeout(timer);
				closeTimers.delete(composer);
				createdOverlay.removeAttribute("data-open");
				panel.removeAttribute("aria-busy");
				const previousInert = inertChildren.get(panel);
				previousInert?.forEach((wasInert, child) => {
					if (child.isConnected) child.inert = wasInert;
				});
				inertChildren.delete(panel);
				panel.removeAttribute("data-waline-review-state");
				const closeTimer = window.setTimeout(() => {
					createdOverlay.hidden = true;
					panel.style.removeProperty("--waline-review-min-height");
					closeTimers.delete(composer);
				}, CLOSE_FADE_MS);
				closeTimers.set(composer, closeTimer);
			};

			close.addEventListener(
				"click",
				() => {
					hide();
					composer.querySelector<HTMLTextAreaElement>(".wl-editor")?.focus();
				},
				{ signal: controller.signal },
			);
			overlays.set(composer, hide);
		}
		const activeOverlay = overlay;
		if (!activeOverlay) return undefined;

		const closeTimer = closeTimers.get(composer);
		if (closeTimer !== undefined) {
			window.clearTimeout(closeTimer);
			closeTimers.delete(composer);
		}
		const publishTimer = publishTimers.get(composer);
		if (publishTimer !== undefined) {
			window.clearTimeout(publishTimer);
			publishTimers.delete(composer);
		}
		const eyebrow = activeOverlay.querySelector<HTMLElement>(
			".waline-review-overlay__eyebrow",
		);
		const title = activeOverlay.querySelector<HTMLElement>(
			".waline-review-overlay__title",
		);
		const category = activeOverlay.querySelector<HTMLElement>(
			".waline-review-overlay__category",
		);
		const detail = activeOverlay.querySelector<HTMLElement>(
			".waline-review-overlay__detail",
		);
		const close = activeOverlay.querySelector<HTMLButtonElement>(
			".waline-review-overlay__close",
		);
		const mark = activeOverlay.querySelector<HTMLElement>(
			".waline-review-overlay__mark",
		);
		if (!eyebrow || !title || !category || !detail || !close || !mark)
			return undefined;

		activeOverlay.hidden = false;
		activeOverlay.dataset.state = copy.state;
		panel.dataset.walineReviewState = copy.state;
		panel.setAttribute("aria-busy", "true");
		if (!inertChildren.has(panel)) {
			inertChildren.set(
				panel,
				new Map(
					Array.from(panel.children)
						.filter((child) => child !== overlay)
						.map((child) => [
							child as HTMLElement,
							(child as HTMLElement).inert,
						]),
				),
			);
		}
		Array.from(panel.children).forEach((child) => {
			if (child !== overlay) (child as HTMLElement).inert = true;
		});
		eyebrow.textContent =
			copy.state === "reviewing"
				? "小爱安全审核"
				: copy.state === "publishing"
					? "审核已通过"
					: "小爱安全审核";
		title.textContent = copy.title;
		category.textContent = copy.category ? `检测类别：${copy.category}` : "";
		category.hidden = !copy.category;
		detail.textContent = copy.detail;
		detail.hidden = !copy.detail;
		close.hidden = copy.state !== "rejected";
		mark.textContent = copy.state === "rejected" ? "!" : "";
		activeOverlay.setAttribute(
			"aria-live",
			copy.state === "rejected" ? "assertive" : "polite",
		);
		requestAnimationFrame(() => {
			updateOverlaySizes.get(composer)?.();
			activeOverlay.setAttribute("data-open", "true");
		});
		if (copy.state === "rejected")
			requestAnimationFrame(() => close.focus({ preventScroll: true }));

		if (copy.state === "publishing") {
			const publishTimer = window.setTimeout(() => {
				publishTimers.delete(composer);
				overlays.get(composer)?.();
			}, SUCCESS_FADE_MS);
			publishTimers.set(composer, publishTimer);
		}
		return overlays.get(composer);
	};

	const rememberComposer = (target: EventTarget | null) => {
		if (!(target instanceof Element)) return;
		const composer = target.closest<HTMLElement>(".wl-comment");
		if (composer && root.contains(composer)) activeComposer = composer;
	};

	root.addEventListener(
		"click",
		(event) => {
			if ((event.target as Element | null)?.closest('.wl-btn[type="submit"]'))
				rememberComposer(event.target);
		},
		{ capture: true, signal: controller.signal },
	);
	root.addEventListener(
		"keydown",
		(event) => {
			const keyEvent = event as KeyboardEvent;
			if ((keyEvent.ctrlKey || keyEvent.metaKey) && keyEvent.key === "Enter")
				rememberComposer(event.target);
		},
		{ capture: true, signal: controller.signal },
	);

	const fetchProxy: typeof window.fetch = async (input, init) => {
		const { method, pathname } = readRequestDetails(input, init);
		const composer = activeComposer;
		if (
			method !== "POST" ||
			!COMMENT_ENDPOINT.test(pathname) ||
			!composer ||
			!root.contains(composer)
		)
			return originalFetch.call(window, input, init);

		activeComposer = undefined;
		showOverlay(composer, {
			state: "reviewing",
			title: "AI 审核中",
			detail: "正在检查昵称与评论内容，请稍候。",
		});
		try {
			const response = await originalFetch.call(window, input, init);
			let payload: unknown;
			try {
				payload = await response.clone().json();
			} catch {
				payload = undefined;
			}
			const message = getResponseError(payload);
			if (message) {
				markAlertForSuppression(message);
				showOverlay(composer, parseReviewCopy(message));
			} else if (!response.ok) {
				const fallback = "评论暂时无法发布，请检查网络后重试。";
				markAlertForSuppression(fallback);
				showOverlay(composer, parseReviewCopy(fallback));
			} else {
				showOverlay(composer, {
					state: "publishing",
					title: "正在发布中",
					detail: "审核通过，马上就会出现在评论区。",
				});
				if (composer.hasAttribute("data-waline-mobile-composer-active")) {
					// Keep the publishing state visible before Waline closes its mobile sheet.
					await new Promise<void>((resolve) =>
						window.setTimeout(resolve, SUCCESS_FADE_MS),
					);
				}
			}
			return response;
		} catch (error) {
			const message = error instanceof Error ? error.message : "网络请求失败";
			markAlertForSuppression(message);
			showOverlay(composer, {
				state: "rejected",
				title: "审核服务暂时不可用",
				detail: "评论尚未发布，请检查网络后重试。",
			});
			throw error;
		}
	};
	window.fetch = fetchProxy;

	return () => {
		controller.abort();
		sizeObservers.forEach((observer) => {
			observer.disconnect();
		});
		sizeObservers.clear();
		sizeFrames.forEach((frame) => {
			cancelAnimationFrame(frame);
		});
		sizeFrames.clear();
		root.querySelectorAll<HTMLElement>(".wl-comment").forEach((composer) => {
			composer
				.querySelector<HTMLElement>(":scope > .wl-panel")
				?.style.removeProperty("--waline-review-min-height");
			overlays.get(composer)?.();
		});
		if (window.fetch === fetchProxy) window.fetch = originalFetch;
		if (window.alert === alertProxy) window.alert = originalAlert;
		if (suppressionTimer !== undefined) window.clearTimeout(suppressionTimer);
		root.querySelectorAll<HTMLElement>(".wl-comment").forEach((composer) => {
			const timer = closeTimers.get(composer);
			if (timer !== undefined) window.clearTimeout(timer);
			const publishTimer = publishTimers.get(composer);
			if (publishTimer !== undefined) window.clearTimeout(publishTimer);
		});
		activeComposer = undefined;
	};
};
