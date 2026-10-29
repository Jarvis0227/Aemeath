import type { MarkdownHeading } from "astro";

export interface PureTocItem extends MarkdownHeading {
	children: PureTocItem[];
}

export function buildPureToc(headings: MarkdownHeading[]): PureTocItem[] {
	const roots: PureTocItem[] = [];
	const parents: PureTocItem[] = [];
	for (const heading of headings) {
		if (heading.depth < 2 || heading.depth > 6) continue;
		const item: PureTocItem = {
			...heading,
			text: heading.text.replace(/\s*#\s*$/, ""),
			children: [],
		};
		while (parents.length && parents[parents.length - 1].depth >= item.depth) {
			parents.pop();
		}
		(parents.length ? parents[parents.length - 1].children : roots).push(item);
		parents.push(item);
	}
	return roots;
}
