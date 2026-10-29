import { mkdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { createPlanetRaster } from "../src/utils/footer-orbit-sphere";

const sources = [
	"https://www.solarsystemscope.com/textures/download/2k_earth_daymap.jpg",
	"https://www.solarsystemscope.com/textures/download/2k_earth_clouds.jpg",
	"https://svs.gsfc.nasa.gov/vis/a000000/a004700/a004720/lroc_color_2k.jpg",
];
const inputs = await Promise.all(
	sources.map(async (source, index) => {
		const localPath = process.argv[index + 2];
		if (localPath) return readFile(localPath);
		const response = await fetch(source);
		if (!response.ok) throw new Error(`${response.status}: ${source}`);
		return Buffer.from(await response.arrayBuffer());
	}),
);
const output = new URL("../public/images/footer-orbit/", import.meta.url);
await mkdir(output, { recursive: true });
const earth = await sharp(inputs[0])
	.resize(512, 256)
	.ensureAlpha()
	.raw()
	.toBuffer();
const clouds = await sharp(inputs[1])
	.resize(512, 256)
	.greyscale()
	.raw()
	.toBuffer();
for (let pixel = 0; pixel < clouds.length; pixel++) {
	const alpha = (clouds[pixel] / 255) * 0.72;
	for (let channel = 0; channel < 3; channel++) {
		earth[pixel * 4 + channel] = Math.round(
			earth[pixel * 4 + channel] * (1 - alpha) + 248 * alpha,
		);
	}
}
await sharp(earth, { raw: { width: 512, height: 256, channels: 4 } })
	.webp({ quality: 84 })
	.toFile(fileURLToPath(new URL("earth.webp", output)));
const moon = await sharp(inputs[2])
	.resize(256, 128)
	.ensureAlpha()
	.raw()
	.toBuffer();
await sharp(moon, { raw: { width: 256, height: 128, channels: 4 } })
	.webp({ quality: 84 })
	.toFile(fileURLToPath(new URL("moon.webp", output)));

const earthRaster = createPlanetRaster(
	{ data: new Uint8ClampedArray(earth), width: 512, height: 256 },
	88,
	(23.4 * Math.PI) / 180,
);
const moonRaster = createPlanetRaster(
	{ data: new Uint8ClampedArray(moon), width: 256, height: 128 },
	24,
);
const earthPng = await sharp(Buffer.from(earthRaster.draw(0.08)), {
	raw: { width: 88, height: 88, channels: 4 },
})
	.png()
	.toBuffer();
const moonPng = await sharp(Buffer.from(moonRaster.draw(0.8 / (Math.PI * 2))), {
	raw: { width: 24, height: 24, channels: 4 },
})
	.png()
	.toBuffer();
const orbitPoint = (angle: number) => {
	const tilt = (-24 * Math.PI) / 180;
	const scale = 200 / (200 - 27.4 * Math.sin(angle));
	const x = 29.5 * Math.cos(angle);
	const y = 10.9 * Math.sin(angle);
	return {
		x: 36 + (x * Math.cos(tilt) - y * Math.sin(tilt)) * scale,
		y: 36 + (x * Math.sin(tilt) + y * Math.cos(tilt)) * scale,
		scale,
	};
};
const orbitPath = (start: number) =>
	Array.from({ length: 65 }, (_, index) => {
		const point = orbitPoint(start + (index / 64) * Math.PI);
		return `${index ? "L" : "M"}${point.x},${point.y}`;
	}).join(" ");
const point = orbitPoint(0.8);
const radius = point.scale * 6;
const poster = `<svg xmlns="http://www.w3.org/2000/svg" width="144" height="144" viewBox="0 0 72 72">
<path d="${orbitPath(Math.PI)}" fill="none" stroke="#5499d8" stroke-opacity=".28" stroke-width=".7"/>
<image href="data:image/png;base64,${earthPng.toString("base64")}" x="14" y="14" width="44" height="44"/>
<circle cx="36" cy="36" r="22" fill="none" stroke="#68b7f2" stroke-opacity=".6" stroke-width=".5"/>
<path d="${orbitPath(0)}" fill="none" stroke="#5499d8" stroke-opacity=".65" stroke-width=".7"/>
<image href="data:image/png;base64,${moonPng.toString("base64")}" x="${point.x - radius}" y="${point.y - radius}" width="${radius * 2}" height="${radius * 2}"/>
</svg>`;
await writeFile(
	new URL("poster.webp", output),
	await sharp(Buffer.from(poster)).webp({ lossless: true }).toBuffer(),
);
console.log(
	"Generated Earth, Moon and static poster in public/images/footer-orbit/",
);
