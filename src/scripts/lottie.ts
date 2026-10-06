type LottieAnimation = {
	addEventListener: (eventName: string, callback: () => void) => void;
	destroy: () => void;
	goToAndStop?: (value: number, isFrame: boolean) => void;
	pause: () => void;
	play: () => void;
	setSpeed?: (speed: number) => void;
};

type LottieRuntime = {
	loadAnimation: (options: {
		animationData?: unknown;
		autoplay: boolean;
		container: HTMLElement;
		loop: boolean;
		path: string;
		renderer: "canvas" | "svg";
		rendererSettings?: Record<string, unknown>;
	}) => LottieAnimation;
};

declare global {
	interface Window {
		lottie?: LottieRuntime;
		__rainztLottieRuntimePromise?: Promise<LottieRuntime>;
	}
}

const runtimePath = `${import.meta.env.BASE_URL}assets/lottie-web-5.12.2.min.js`;
const animationBasePath = `${import.meta.env.BASE_URL}lottie/`;
const activeAnimations = new Map<HTMLElement, LottieAnimation>();
const loadingAnimations = new Set<HTMLElement>();
const lazyElements = new Set<HTMLElement>();
let observer: IntersectionObserver | null = null;
let lazyObserver: IntersectionObserver | null = null;
let scheduledFrame = 0;

function loadRuntime(): Promise<LottieRuntime> {
	if (window.lottie) return Promise.resolve(window.lottie);
	if (window.__rainztLottieRuntimePromise)
		return window.__rainztLottieRuntimePromise;

	window.__rainztLottieRuntimePromise = new Promise((resolve, reject) => {
		const existingScript = document.querySelector<HTMLScriptElement>(
			"script[data-rainzt-lottie-runtime]",
		);
		const script = existingScript || document.createElement("script");

		const handleLoad = () => {
			if (window.lottie) resolve(window.lottie);
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

	return window.__rainztLottieRuntimePromise;
}

function getAnimationName(element: HTMLElement) {
	const name = element.dataset.lottieName?.trim().replace(/\.json$/i, "") || "";
	return /^[a-z0-9_-]+$/i.test(name) ? name : "";
}

function markFallback(element: HTMLElement, name: string) {
	element.dataset.lottieError = "true";
	element.textContent = name ? `[${name}]` : "[Lottie]";
}

function setAnimationSize(element: HTMLElement) {
	const scale = Number(element.dataset.lottieSize);
	if (!Number.isFinite(scale) || scale <= 0) return;

	const size = `${Math.max(0.75, Math.min(scale, 3)) * 1.9}em`;
	element.style.width = size;
	element.style.height = size;
}

function observeAnimations() {
	observer?.disconnect();
	if (!("IntersectionObserver" in window)) return;

	observer = new IntersectionObserver(
		(entries) => {
			for (const entry of entries) {
				const element = entry.target as HTMLElement;
				const animation = activeAnimations.get(element);
				if (!animation) continue;
				if (entry.isIntersecting) {
					if (
						element.dataset.lottieStatic === "true" &&
						element.dataset.lottiePlaying !== "true"
					) {
						animation.pause();
						animation.goToAndStop?.(0, true);
					} else {
						animation.play();
					}
				} else if (element.dataset.lottieLazy === "true") {
					// Preview cards are disposable: release SVG nodes when they leave the
					// nearby viewport so scrolling through the archive stays lightweight.
					animation.destroy();
					activeAnimations.delete(element);
					delete element.dataset.lottieReady;
					delete element.dataset.lottiePlaying;
				} else {
					animation.pause();
				}
			}
		},
		{ rootMargin: "160px", threshold: 0.05 },
	);

	for (const element of activeAnimations.keys()) observer.observe(element);
}

function isLazyElement(element: HTMLElement) {
	return element.dataset.lottieLazy === "true";
}

function removeStaleAnimations(elements: Set<HTMLElement>) {
	for (const [element, animation] of activeAnimations) {
		if (elements.has(element)) continue;
		animation.destroy();
		activeAnimations.delete(element);
	}

	for (const element of lazyElements) {
		if (!elements.has(element)) lazyElements.delete(element);
	}
}

async function loadAnimationForElement(
	element: HTMLElement,
	runtime: LottieRuntime,
) {
	if (
		activeAnimations.has(element) ||
		loadingAnimations.has(element) ||
		!element.isConnected
	)
		return;

	const name = getAnimationName(element);
	if (!name) {
		markFallback(element, element.dataset.lottieName || "");
		return;
	}

	loadingAnimations.add(element);
	setAnimationSize(element);
	try {
		const useCanvas = /micromessenger/i.test(navigator.userAgent);
		const isStatic = element.dataset.lottieStatic === "true";
		const animation = runtime.loadAnimation({
			container: element,
			loop: true,
			autoplay: !isStatic,
			path: `${animationBasePath}${encodeURIComponent(name)}.json`,
			renderer: useCanvas ? "canvas" : "svg",
			rendererSettings: { preserveAspectRatio: "xMidYMid meet" },
		});

		const speed = Number(element.dataset.lottieSpeed);
		if (Number.isFinite(speed) && speed > 0) animation.setSpeed?.(speed);
		if (isStatic) {
			const freezeFirstFrame = () => {
				animation.pause();
				animation.goToAndStop?.(0, true);
			};
			animation.addEventListener("data_ready", freezeFirstFrame);
			animation.addEventListener("DOMLoaded", freezeFirstFrame);
			freezeFirstFrame();
		}
		animation.addEventListener("data_failed", () => {
			animation.destroy();
			activeAnimations.delete(element);
			markFallback(element, name);
		});
		activeAnimations.set(element, animation);
		element.dataset.lottieReady = "true";
	} catch {
		markFallback(element, name);
	} finally {
		loadingAnimations.delete(element);
	}
}

function observeLazyElements() {
	lazyObserver?.disconnect();
	if (!("IntersectionObserver" in window)) return false;

	lazyObserver = new IntersectionObserver(
		(entries) => {
			for (const entry of entries) {
				if (!entry.isIntersecting) continue;
				void loadRuntime()
					.then((runtime) =>
						loadAnimationForElement(entry.target as HTMLElement, runtime),
					)
					.then(() => observeAnimations())
					.catch(() =>
						markFallback(
							entry.target as HTMLElement,
							(entry.target as HTMLElement).dataset.lottieName || "",
						),
					);
			}
		},
		{ rootMargin: "240px", threshold: 0.01 },
	);

	for (const element of lazyElements) {
		setAnimationSize(element);
		lazyObserver.observe(element);
	}
	return true;
}

async function initializeLottieEmojis() {
	const elements = new Set(
		Array.from(
			document.querySelectorAll<HTMLElement>(".lottie-emoji[data-lottie-name]"),
		),
	);
	removeStaleAnimations(elements);
	if (!elements.size) {
		observer?.disconnect();
		lazyObserver?.disconnect();
		return;
	}

	lazyElements.clear();
	const eagerElements: HTMLElement[] = [];
	for (const element of elements) {
		if (isLazyElement(element)) lazyElements.add(element);
		else eagerElements.push(element);
	}

	if (eagerElements.length) {
		try {
			const runtime = await loadRuntime();
			for (const element of eagerElements)
				await loadAnimationForElement(element, runtime);
		} catch {
			for (const element of eagerElements)
				markFallback(element, element.dataset.lottieName || "");
		}
	}

	if (lazyElements.size && !observeLazyElements()) {
		try {
			const runtime = await loadRuntime();
			for (const element of lazyElements)
				await loadAnimationForElement(element, runtime);
		} catch {
			for (const element of lazyElements)
				markFallback(element, element.dataset.lottieName || "");
		}
	}

	observeAnimations();
}

export function initLottieEmojis(): void {
	if (scheduledFrame) cancelAnimationFrame(scheduledFrame);
	scheduledFrame = requestAnimationFrame(() => {
		scheduledFrame = 0;
		void initializeLottieEmojis();
	});
}

export function setLottiePlayback(name: string, shouldPlay: boolean): void {
	if (typeof document === "undefined") return;

	const element = Array.from(
		document.querySelectorAll<HTMLElement>(".lottie-emoji[data-lottie-name]"),
	).find((candidate) => getAnimationName(candidate) === name);
	if (!element) return;

	const animation = activeAnimations.get(element);
	if (!animation) {
		initLottieEmojis();
		return;
	}

	if (shouldPlay) {
		element.dataset.lottiePlaying = "true";
		animation.play();
		return;
	}

	delete element.dataset.lottiePlaying;
	animation.pause();
	if (element.dataset.lottieStatic === "true") animation.goToAndStop?.(0, true);
}

if (typeof document !== "undefined") {
	for (const eventName of [
		"astro:page-load",
		"astro:after-swap",
		"swup:contentReplaced",
		"swup:content:replace",
		"swup:page:view",
	]) {
		document.addEventListener(eventName, initLottieEmojis);
	}
}
