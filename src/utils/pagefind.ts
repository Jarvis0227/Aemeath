import { url } from "./url-utils";

let pagefindPromise: Promise<Window["pagefind"] | undefined> | undefined;

/** Share one index import between the navbar and the dedicated search page. */
export function loadPagefind(): Promise<Window["pagefind"] | undefined> {
	if (import.meta.env.DEV) return Promise.resolve(undefined);
	if (window.pagefind) return Promise.resolve(window.pagefind);
	if (pagefindPromise) return pagefindPromise;

	const scriptUrl = url("/pagefind/pagefind.js");
	pagefindPromise = import(/* @vite-ignore */ scriptUrl)
		.then(async (pagefind) => {
			await pagefind.options({ excerptLength: 20 });
			window.pagefind = pagefind;
			return window.pagefind;
		})
		.catch((error) => {
			// Local metadata remains searchable if the index is unavailable. A later
			// search can retry instead of retaining a permanently empty stub.
			pagefindPromise = undefined;
			console.warn(
				"[Search] Pagefind unavailable; using local metadata.",
				error,
			);
			return undefined;
		});
	return pagefindPromise;
}
