/**
 * Keep WenKai's appearance and full character coverage, but serve small subsets.
 * Runs after Astro so inline UI/config strings and rendered content are included.
 * One stable stylesheet keeps font definitions available during Swup visits.
 * Homepage/UI characters stay separate; other site text uses small shared chunks.
 * Original faces cover dynamic text outside the generated subsets.
 */
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { glob } from "glob";
import subsetFont from "subset-font";
import { siteConfig } from "../src/config";
import { getTranslation } from "../src/i18n/translation";

// An optional output path also supports isolated build verification.
const DIST = process.argv[2] || "dist";
const ASSETS = path.join(DIST, "_astro");
const OUTPUT = path.join(ASSETS, "fonts", "wenkai");
type Range = [number, number];
type Face = {
	block: string;
	src: string;
	file: string;
	ranges: Range[];
};

const hash = (data: string | Buffer) =>
	crypto.createHash("sha256").update(data).digest("hex").slice(0, 16);

function parseRanges(value: string): Range[] {
	return value.split(",").map((part) => {
		const match = part.trim().match(/^U\+([\da-f?]+)(?:-([\da-f]+))?$/i);
		if (!match) throw new Error(`Unsupported font unicode-range: ${part}`);
		return [
			Number.parseInt(match[1].replaceAll("?", "0"), 16),
			Number.parseInt(match[2] || match[1].replaceAll("?", "f"), 16),
		];
	});
}

function formatRanges(ranges: Range[]): string {
	return ranges
		.map(
			([start, end]) =>
				`U+${start.toString(16)}${start === end ? "" : `-${end.toString(16)}`}`,
		)
		.join(",");
}

function rangesForCodes(codes: number[]): Range[] {
	const ranges: Range[] = [];
	for (const code of codes) {
		const last = ranges.at(-1);
		if (last && code === last[1] + 1) last[1] = code;
		else ranges.push([code, code]);
	}
	return ranges;
}

function subtractCodes(ranges: Range[], codes: number[]): Range[] {
	const remaining: Range[] = [];
	for (const [start, end] of ranges) {
		let cursor = start;
		for (const code of codes) {
			if (code < cursor) continue;
			if (code > end) break;
			if (code > cursor) remaining.push([cursor, code - 1]);
			cursor = code + 1;
		}
		if (cursor <= end) remaining.push([cursor, end]);
	}
	return remaining;
}

function characterCodes(content: string): number[] {
	// Include inline scripts and attributes: music/UI strings are often injected
	// from JSON, while alt text and labels are absent from visible text extraction.
	const decoded = content
		.replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "")
		.replace(/\\u\{([\da-f]+)\}|\\u([\da-f]{4})/gi, (_match, wide, basic) =>
			String.fromCodePoint(Number.parseInt(wide || basic, 16)),
		)
		.replace(/&#(x[\da-f]+|\d+);/gi, (_match, value: string) => {
			const code =
				value[0].toLowerCase() === "x"
					? Number.parseInt(value.slice(1), 16)
					: Number.parseInt(value, 10);
			return code <= 0x10ffff ? String.fromCodePoint(code) : "";
		});
	return [
		...new Set([...decoded].map((char) => char.codePointAt(0) as number)),
	].sort((a, b) => a - b);
}

const inRanges = (code: number, ranges: Range[]) =>
	ranges.some(([start, end]) => code >= start && code <= end);

async function main() {
	const cssFiles = await glob(path.posix.join(DIST, "_astro", "*.css"));
	const sources: { file: string; css: string; faces: Face[] }[] = [];
	for (const file of cssFiles) {
		if (path.basename(file).startsWith("wenkai.")) continue;
		const css = await fs.readFile(file, "utf8");
		const faces: Face[] = [];
		for (const match of css.matchAll(/@font-face\s*\{([^}]+)\}/g)) {
			const block = match[0];
			if (!/font-family:\s*["']?LXGW WenKai Screen["']?\s*;/.test(block))
				continue;
			const src = block.match(/src:\s*url\(["']?([^)'"\s]+)/)?.[1];
			const rangeValue = block.match(/unicode-range:\s*([^;}]+)/)?.[1];
			// Tiny faces may already be inlined by Vite. Keep those untouched.
			if (!src || !rangeValue || src.startsWith("data:")) continue;
			const fontFile = path.basename(src.split(/[?#]/)[0]);
			faces.push({
				block,
				src,
				file: fontFile,
				ranges: parseRanges(rangeValue),
			});
		}
		if (faces.length) sources.push({ file, css, faces });
	}
	if (!sources.length) {
		console.log(
			"WenKai subsetting: no external WenKai faces found; original CSS retained.",
		);
		return;
	}

	const home = await fs.readFile(path.join(DIST, "index.html"), "utf8");
	const scriptText = new Map<string, string>();
	async function clientStrings(html: string): Promise<string> {
		const parts: string[] = [];
		for (const match of html.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)/gi)) {
			const src = match[1].split(/[?#]/)[0];
			if (!src.includes("/_astro/") || !src.endsWith(".js")) continue;
			const name = path.basename(src);
			let text = scriptText.get(name);
			if (text === undefined) {
				text = await fs.readFile(path.join(ASSETS, name), "utf8");
				scriptText.set(name, text);
			}
			parts.push(text);
		}
		return parts.join("");
	}
	const translation = Object.values(getTranslation(siteConfig.lang)).join("");
	const ascii = Array.from({ length: 95 }, (_, i) =>
		String.fromCodePoint(i + 32),
	).join("");
	// Entry scripts also contain runtime labels, such as festival names, which
	// have no text in the initial HTML. Other dynamic text keeps the full fallback.
	const commonCodes = characterCodes(
		home + (await clientStrings(home)) + translation + ascii,
	);
	const commonSet = new Set(commonCodes);
	const htmlFiles = await glob(`${DIST}/**/*.html`);
	const htmlPages = await Promise.all(
		htmlFiles.map(async (file) => ({
			file,
			html: await fs.readFile(file, "utf8"),
		})),
	);
	const siteCodes = new Set(commonCodes);
	for (const { html } of htmlPages) {
		if (!sources.some((source) => html.includes(path.basename(source.file))))
			continue;
		for (const code of characterCodes(html + (await clientStrings(html))))
			siteCodes.add(code);
	}
	const extraCodes = [...siteCodes]
		.filter((code) => !commonSet.has(code))
		.sort((a, b) => a - b);
	const buffers = new Map<string, Buffer>();
	const subsets = new Map<string, { src: string; ranges: string }>();
	let subsetBytes = 0;
	await fs.mkdir(OUTPUT, { recursive: true });
	await fs.copyFile(
		"node_modules/lxgw-wenkai-screen-webfont/OFL.txt",
		path.join(OUTPUT, "OFL.txt"),
	);

	async function subset(face: Face, codes: number[]) {
		const key = `${face.file}:${codes.join(",")}`;
		const cached = subsets.get(key);
		if (cached) return cached;
		let original = buffers.get(face.file);
		if (!original) {
			original = await fs.readFile(path.join(ASSETS, face.file));
			buffers.set(face.file, original);
		}
		const data = await subsetFont(
			original,
			codes.map((code) => String.fromCodePoint(code)).join(""),
			{
				targetFormat: "woff2",
				// Retain font identity, copyright and licensing metadata.
				preserveNameIds: [0, 1, 2, 3, 4, 5, 6, 13, 14],
			},
		);
		const src = `./fonts/wenkai/${hash(data)}.woff2`;
		await fs.writeFile(path.join(ASSETS, src), data);
		subsetBytes += data.length;
		const result = { src, ranges: formatRanges(rangesForCodes(codes)) };
		subsets.set(key, result);
		return result;
	}

	const replacements = new Map<string, string>();
	for (const source of sources) {
		const name = path.basename(source.file);
		if (!htmlPages.some(({ html }) => html.includes(name))) continue;
		let css = source.css;
		for (const face of source.faces) {
			const common = commonCodes.filter((code) => inRanges(code, face.ranges));
			const extra = extraCodes.filter((code) => inRanges(code, face.ranges));
			const covered = [...common, ...extra].sort((a, b) => a - b);
			const fallback = subtractCodes(face.ranges, covered);
			const parts: string[] = [];
			const chunks = [common];
			// Unicode ranges keep non-home chunks unloaded until their text is used.
			// Bounded chunks avoid turning a rare character into a large download.
			for (let offset = 0; offset < extra.length; offset += 128)
				chunks.push(extra.slice(offset, offset + 128));
			for (const codes of chunks) {
				if (!codes.length) continue;
				const generated = await subset(face, codes);
				parts.push(
					face.block
						.replace(face.src, generated.src)
						.replace(
							/unicode-range:\s*[^;}]+/,
							`unicode-range:${generated.ranges}`,
						),
				);
			}
			if (fallback.length) {
				parts.push(
					face.block.replace(
						/unicode-range:\s*[^;}]+/,
						`unicode-range:${formatRanges(fallback)}`,
					),
				);
			}
			css = css.replace(face.block, parts.join(""));
		}
		const newName = `wenkai.${hash(css)}.css`;
		await fs.writeFile(path.join(ASSETS, newName), css);
		replacements.set(name, newName);
	}
	let pages = 0;
	for (const { file, html: originalHtml } of htmlPages) {
		let html = originalHtml;
		// Preserve the configured base path in the original stylesheet URL.
		for (const [name, newName] of replacements)
			html = html.replaceAll(name, newName);
		const changed = html !== originalHtml;
		if (changed) {
			await fs.writeFile(file, html);
			pages += 1;
		}
	}
	console.log(
		`WenKai subsetting: ${pages} pages, ${replacements.size} stable stylesheets, ${commonCodes.length} homepage characters, ${subsets.size} reusable subsets (${(subsetBytes / 1024).toFixed(1)} KiB across the entire site). Original files retained for dynamic characters.`,
	);
}

main().catch((error) => {
	console.error("WenKai subsetting failed:", error);
	process.exitCode = 1;
});
