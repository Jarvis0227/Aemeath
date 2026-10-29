import "@/scripts/blog-changelog";
import { initLottieEmojis } from "@/scripts/lottie";
import { initIconLoader } from "@/utils/icon-loader";
import { initThemeListener } from "@/utils/setting-utils";

// Reading enhancements are shared; Aeme's wallpaper, grid, navbar and Swup
// animation handlers belong to its separately loaded layout runtime.
function enhanceContent() {
	initIconLoader();
	initLottieEmojis();
	document
		.querySelectorAll<HTMLElement>(
			".katex-display:not([data-scrollbar-initialized])",
		)
		.forEach((formula) => {
			const container = document.createElement("div");
			container.className = "katex-display-container";
			container.style.overflowX = "auto";
			formula.before(container);
			container.append(formula);
			formula.dataset.scrollbarInitialized = "true";
		});
	document
		.querySelectorAll<HTMLElement>(
			".custom-md table:not([data-horizontal-scroll-ready])",
		)
		.forEach((table) => {
			if (
				!table.parentElement?.classList.contains("horizontal-scroll-container")
			) {
				const container = document.createElement("div");
				container.className = "horizontal-scroll-container";
				table.before(container);
				container.append(table);
			}
			table.dataset.horizontalScrollReady = "true";
		});
	document
		.querySelectorAll<HTMLElement>(".lqip-placeholder")
		.forEach((placeholder) => {
			const image =
				placeholder.parentElement?.querySelector<HTMLImageElement>("img");
			if (!image || image.dataset.fadeBound) return;
			image.dataset.fadeBound = "true";
			const reveal = () => {
				image.style.opacity = "1";
				placeholder.classList.add("loaded");
			};
			if (image.complete && image.naturalWidth > 0) reveal();
			else {
				image.addEventListener("load", reveal, { once: true });
				image.addEventListener(
					"error",
					() => placeholder.classList.add("loaded"),
					{ once: true },
				);
			}
		});
}

let scrollFrame = 0;
let lastProgress = -1;
function updateReadingProgress() {
	scrollFrame = 0;
	const scroller = document.scrollingElement || document.documentElement;
	const top = Math.max(0, window.scrollY || scroller.scrollTop);
	const max = Math.max(0, scroller.scrollHeight - window.innerHeight);
	const progress = max ? Math.min(1, top / max) : 0;
	if (Math.abs(lastProgress - progress) >= 0.0005) {
		lastProgress = progress;
		const percent = Math.round(progress * 100);
		document
			.getElementById("scroll-progress-circle-value")
			?.style.setProperty(
				"stroke-dashoffset",
				`${(100 - progress * 100).toFixed(2)}`,
			);
		const label = document.getElementById("scroll-progress-circle-label");
		if (label) label.textContent = `${percent}%`;
		document
			.getElementById("scroll-progress-circle")
			?.setAttribute("aria-label", `页面滚动进度 ${percent}%`);
	}
	document
		.getElementById("back-to-top-btn")
		?.classList.toggle("hide", top <= window.innerHeight * 0.7);
}

function refreshPage() {
	lastProgress = -1;
	enhanceContent();
	updateReadingProgress();
}

initThemeListener();
refreshPage();
document.addEventListener("astro:page-load", refreshPage);
document.addEventListener("password:decrypted", () =>
	requestAnimationFrame(refreshPage),
);
window.addEventListener("resize", updateReadingProgress, { passive: true });
window.addEventListener(
	"scroll",
	() => {
		if (!scrollFrame)
			scrollFrame = requestAnimationFrame(updateReadingProgress);
	},
	{ passive: true },
);
