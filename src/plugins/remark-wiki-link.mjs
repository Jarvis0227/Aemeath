import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { SKIP, visit } from "unist-util-visit";

const POSTS_DIR = path.resolve(
	path.dirname(fileURLToPath(import.meta.url)),
	"../content/posts",
);

function walkPostFiles(directory) {
	if (!fs.existsSync(directory)) return [];

	return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
		const entryPath = path.join(directory, entry.name);
		if (entry.isDirectory()) return walkPostFiles(entryPath);
		return /\.(md|mdx)$/i.test(entry.name) ? [entryPath] : [];
	});
}

function getFrontmatter(source) {
	const match = source.match(/^---\s*\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
	return match?.[1] || "";
}

function getFrontmatterValue(frontmatter, key) {
	const match = frontmatter.match(new RegExp(`^${key}:\\s*(.+?)\\s*$`, "mi"));
	if (!match) return "";

	const value = match[1].trim();
	if (
		(value.startsWith('"') && value.endsWith('"')) ||
		(value.startsWith("'") && value.endsWith("'"))
	) {
		return value.slice(1, -1).trim();
	}

	return value.replace(/\s+#.*$/, "").trim();
}

function normalizeLookup(value) {
	return value
		.trim()
		.replace(/^\/?posts\//i, "")
		.replace(/^\/+|\/+$/g, "")
		.replace(/\.(md|mdx)$/i, "")
		.replace(/\/index$/i, "")
		.replace(/\s+/g, " ")
		.toLocaleLowerCase();
}

function createPostIndex(postsDirectory) {
	const index = new Map();

	for (const filePath of walkPostFiles(postsDirectory)) {
		const source = fs.readFileSync(filePath, "utf8");
		const frontmatter = getFrontmatter(source);
		if (/^draft:\s*true\s*$/im.test(frontmatter)) continue;

		const title = getFrontmatterValue(frontmatter, "title");
		const relativePath = path
			.relative(postsDirectory, filePath)
			.replace(/\\/g, "/")
			.replace(/\.(md|mdx)$/i, "");
		const slug = relativePath.replace(/\/index$/i, "");
		if (!slug) continue;

		const post = { slug, title: title || slug };
		for (const alias of [slug, relativePath, title]) {
			const normalized = normalizeLookup(alias || "");
			if (normalized && !index.has(normalized)) index.set(normalized, post);
		}
	}

	return index;
}

function createWikiLink(post, label, anchor) {
	return {
		type: "link",
		url: `/posts/${post.slug}/${anchor ? `#${anchor}` : ""}`,
		title: `前往：${post.title}`,
		children: [{ type: "text", value: label || post.title }],
		data: {
			hProperties: {
				className: ["wiki-link-card"],
				dataWikiLink: "true",
			},
		},
	};
}

function shouldSkipNode(parent) {
	return ["link", "linkReference", "definition", "image", "inlineCode", "html"].includes(
		parent?.type,
	);
}

/**
 * Convert [[post title]], [[slug]], and [[target|label]] into internal post links.
 * Unresolved references remain visible text instead of becoming broken links.
 */
export function remarkWikiLink(options = {}) {
	const postIndex = createPostIndex(options.postsDir || POSTS_DIR);

	return (tree) => {
		visit(tree, "text", (node, index, parent) => {
			if (
				index === undefined ||
				!parent?.children ||
				shouldSkipNode(parent) ||
				!node.value.includes("[[")
			) {
				return;
			}

			const parts = [];
			const matcher = /\[\[([^\[\]\n]+)\]\]/g;
			let cursor = 0;
			let match;

			while ((match = matcher.exec(node.value))) {
				if (match.index > cursor) {
					parts.push({ type: "text", value: node.value.slice(cursor, match.index) });
				}

				const rawReference = match[1].trim();
				const [rawTarget, rawLabel] = rawReference.split("|", 2);
				const [target, anchor] = rawTarget.trim().split("#", 2);
				const post = postIndex.get(normalizeLookup(target));

				if (post) {
					parts.push(createWikiLink(post, rawLabel?.trim(), anchor?.trim()));
				} else {
					parts.push({ type: "text", value: match[0] });
				}

				cursor = matcher.lastIndex;
			}

			if (cursor === 0) return;
			if (cursor < node.value.length) {
				parts.push({ type: "text", value: node.value.slice(cursor) });
			}

			parent.children.splice(index, 1, ...parts);
			return [SKIP, index + parts.length];
		});
	};
}
