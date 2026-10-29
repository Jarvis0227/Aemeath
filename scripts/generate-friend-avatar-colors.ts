import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import {
	friendsProjects,
	getEnabledFriends,
} from "../src/config/friendsConfig";

type AvatarColor = { hue: number; saturation: number };
type ColorCache = { version: number; colors: Record<string, AvatarColor> };
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const output = path.join(root, "src/constants/friend-avatar-colors.json");
const refresh = process.argv.includes("--refresh");
const maxBytes = 5 * 1024 * 1024;

function rgbToHsl(r: number, g: number, b: number) {
	r /= 255;
	g /= 255;
	b /= 255;
	const max = Math.max(r, g, b),
		min = Math.min(r, g, b);
	const lightness = (max + min) / 2,
		delta = max - min;
	if (!delta) return { hue: 0, saturation: 0, lightness };
	let hue =
		max === r
			? (g - b) / delta + (g < b ? 6 : 0)
			: max === g
				? (b - r) / delta + 2
				: (r - g) / delta + 4;
	hue *= 60;
	return {
		hue,
		saturation: delta / (1 - Math.abs(2 * lightness - 1)),
		lightness,
	};
}

async function readAvatar(source: string) {
	if (!/^https?:\/\//i.test(source)) {
		const publicRoot = path.join(root, "public");
		const localPath = path.resolve(publicRoot, source.replace(/^\/+/, ""));
		if (!localPath.startsWith(`${publicRoot}${path.sep}`))
			throw new Error("Invalid local avatar path");
		const bytes = await readFile(localPath);
		if (bytes.length > maxBytes) throw new Error("Avatar exceeds 5 MB");
		return bytes;
	}
	const response = await fetch(source, { signal: AbortSignal.timeout(8000) });
	if (!response.ok || !response.body)
		throw new Error(`HTTP ${response.status}`);
	const reader = response.body.getReader();
	const chunks: Uint8Array[] = [];
	let length = 0;
	try {
		while (true) {
			const { value, done } = await reader.read();
			if (done) break;
			length += value.length;
			if (length > maxBytes) throw new Error("Avatar exceeds 5 MB");
			chunks.push(value);
		}
	} finally {
		await reader.cancel();
	}
	return Buffer.concat(chunks);
}

function unwrapIcon(bytes: Buffer) {
	if (
		bytes.length < 6 ||
		bytes.readUInt16LE(0) !== 0 ||
		bytes.readUInt16LE(2) !== 1
	)
		return bytes;
	const pngSignature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
	for (let index = bytes.readUInt16LE(4) - 1; index >= 0; index--) {
		const entry = 6 + index * 16;
		if (entry + 16 > bytes.length) continue;
		const length = bytes.readUInt32LE(entry + 8),
			offset = bytes.readUInt32LE(entry + 12);
		if (length < 8 || offset + length > bytes.length) continue;
		if (bytes.subarray(offset, offset + 8).equals(pngSignature))
			return bytes.subarray(offset, offset + length);
	}
	return bytes;
}

async function extractColor(source: string): Promise<AvatarColor> {
	const { data } = await sharp(unwrapIcon(await readAvatar(source)), {
		limitInputPixels: 20_000_000,
	})
		.rotate()
		.resize(48, 48, { fit: "cover" })
		.toColourspace("srgb")
		.ensureAlpha()
		.raw()
		.toBuffer({ resolveWithObject: true });
	const buckets = Array.from({ length: 12 }, () => ({
		weight: 0,
		r: 0,
		g: 0,
		b: 0,
	}));
	let opaqueWeight = 0,
		colorWeight = 0;
	for (let i = 0; i < data.length; i += 4) {
		const [r, g, b, alpha] = data.subarray(i, i + 4);
		const { hue, saturation, lightness } = rgbToHsl(r, g, b);
		opaqueWeight += alpha / 255;
		// Transparent, near-white and near-black areas should not erase the visible palette.
		if (saturation < 0.1 || lightness < 0.08 || lightness > 0.94) continue;
		const weight = (alpha / 255) * (0.5 + saturation / 2);
		const bucket = buckets[Math.floor(hue / 30) % 12];
		bucket.weight += weight;
		bucket.r += r * weight;
		bucket.g += g * weight;
		bucket.b += b * weight;
		colorWeight += weight;
	}
	if (!opaqueWeight || colorWeight < opaqueWeight * 0.03)
		return { hue: 0, saturation: 0 };
	// Choose the most common broad hue family, rather than a single corner pixel.
	const neighborhood = (index: number) => [
		buckets[(index + 11) % 12],
		buckets[index],
		buckets[(index + 1) % 12],
	];
	const totals = buckets.map((_, index) =>
		neighborhood(index).reduce((sum, b) => sum + b.weight, 0),
	);
	const group = neighborhood(totals.indexOf(Math.max(...totals)));
	const sum = group.reduce(
		(total, b) => ({
			weight: total.weight + b.weight,
			r: total.r + b.r,
			g: total.g + b.g,
			b: total.b + b.b,
		}),
		{ weight: 0, r: 0, g: 0, b: 0 },
	);
	const color = rgbToHsl(
		sum.r / sum.weight,
		sum.g / sum.weight,
		sum.b / sum.weight,
	);
	return {
		hue: Math.round(color.hue),
		saturation: Math.round(Math.min(55, color.saturation * 75)),
	};
}

let cache: ColorCache = { version: 1, colors: {} };
try {
	const saved = JSON.parse(await readFile(output, "utf8")) as ColorCache;
	if (saved.version === cache.version) cache = saved;
} catch {
	/* First generation uses neutral tags until a color is available. */
}
const sources = [
	...new Set(
		[...getEnabledFriends(), ...friendsProjects.filter((f) => f.enabled)].map(
			(f) => f.imgurl,
		),
	),
].sort();
const pending = sources.filter((source) => refresh || !cache.colors[source]);
let next = 0,
	updated = 0,
	failed = 0;
await Promise.all(
	Array.from({ length: Math.min(6, pending.length) }, async () => {
		while (next < pending.length) {
			const source = pending[next++];
			try {
				cache.colors[source] = await extractColor(source);
				updated++;
			} catch (error) {
				failed++;
				console.warn(
					`Avatar color skipped: ${source}: ${error instanceof Error ? error.message : "unknown error"}`,
				);
			}
		}
	}),
);
cache.colors = Object.fromEntries(
	sources
		.filter((source) => cache.colors[source])
		.map((source) => [source, cache.colors[source]]),
);
await writeFile(output, `${JSON.stringify(cache, null, 2)}\n`, "utf8");
console.info(
	`Avatar colors: ${Object.keys(cache.colors).length} cached, ${updated} updated, ${failed} unavailable.`,
);
