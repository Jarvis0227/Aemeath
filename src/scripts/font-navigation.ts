/** Keep the current font while preparing a Swup destination's new characters. */
type FontVisit = { to: { document?: Document } };

const WENKAI = '400 16px "LXGW WenKai Screen"';
let boundSwup: unknown;

function destinationText(page: Document): string {
	const walker = page.createTreeWalker(page.body, NodeFilter.SHOW_TEXT);
	const parts: string[] = [];
	while (walker.nextNode()) {
		const node = walker.currentNode;
		if (
			node.parentElement?.closest(
				"script, style, noscript, template, svg, [hidden]",
			)
		)
			continue;
		parts.push(node.textContent || "");
	}
	return [...new Set(parts.join(""))].join("");
}

async function prepareDestination(visit: FontVisit): Promise<void> {
	if (
		document.documentElement.dataset.fontMode === "original" ||
		!document.fonts ||
		!visit.to.document?.body
	)
		return;
	const text = destinationText(visit.to.document);
	if (!text || document.fonts.check(WENKAI, text)) return;
	let timeout: ReturnType<typeof setTimeout> | undefined;
	try {
		// A failed or very slow font request must not trap the visitor on a page.
		await Promise.race([
			document.fonts.load(WENKAI, text),
			new Promise<void>((resolve) => {
				timeout = setTimeout(resolve, 2000);
			}),
		]);
	} catch {
		// Keep normal browser fallback if a font cannot be fetched.
	} finally {
		clearTimeout(timeout);
	}
}

function bindSwup(): void {
	const swup = window.swup;
	if (!swup?.hooks || boundSwup === swup) return;
	boundSwup = swup;
	// The head plugin has already loaded destination styles at this point.
	// The stable font stylesheet remains identical, keeping its definitions active.
	swup.hooks.before("content:replace", prepareDestination);
}

export function setupFontNavigation(): void {
	bindSwup();
	document.addEventListener("swup:enable", () => queueMicrotask(bindSwup));
	if (document.fonts) {
		void document.fonts.ready.then(() => {
			document.dispatchEvent(new CustomEvent("fontsLoaded"));
		});
	}
}
