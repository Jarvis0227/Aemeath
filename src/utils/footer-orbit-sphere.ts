export interface PlanetTexture {
	data: Uint8ClampedArray;
	width: number;
	height: number;
}

export interface PlanetRaster {
	size: number;
	pixels: Uint8ClampedArray;
	draw: (rotation: number) => Uint8ClampedArray;
}

/** Orthographic sphere projection, with fixed sunlight and a rotating longitude. */
export function createPlanetRaster(
	texture: PlanetTexture,
	size: number,
	tilt = 0,
): PlanetRaster {
	const pixels = new Uint8ClampedArray(size * size * 4);
	const radius = size / 2;
	const cosTilt = Math.cos(tilt);
	const sinTilt = Math.sin(tilt);
	const samples: { index: number; u: number; v: number; light: number }[] = [];
	for (let y = 0; y < size; y++) {
		for (let x = 0; x < size; x++) {
			const nx = (x + 0.5 - radius) / radius;
			const ny = (radius - y - 0.5) / radius;
			const distance = Math.hypot(nx, ny);
			if (distance >= 1) continue;
			const nz = Math.sqrt(1 - distance * distance);
			const localX = nx * cosTilt + ny * sinTilt;
			const localY = -nx * sinTilt + ny * cosTilt;
			const sunlight = Math.max(0, -0.38 * nx + 0.46 * ny + 0.8 * nz);
			const index = (y * size + x) * 4;
			pixels[index + 3] = Math.min(1, (1 - distance) * radius) * 255;
			samples.push({
				index,
				u: Math.atan2(localX, nz) / (Math.PI * 2) + 0.5,
				v: (Math.acos(localY) / Math.PI) * (texture.height - 1),
				light: Math.sqrt(0.22 + 0.78 * sunlight),
			});
		}
	}
	return {
		size,
		pixels,
		draw(rotation) {
			for (const sample of samples) {
				const u = (((sample.u + rotation) % 1) + 1) % 1;
				const tx = u * texture.width;
				const x0 = Math.floor(tx);
				const y0 = Math.floor(sample.v);
				const fx = tx - x0;
				const fy = sample.v - y0;
				const x1 = (x0 + 1) % texture.width;
				const y1 = Math.min(y0 + 1, texture.height - 1);
				const a = (y0 * texture.width + x0) * 4;
				const b = (y0 * texture.width + x1) * 4;
				const c = (y1 * texture.width + x0) * 4;
				const d = (y1 * texture.width + x1) * 4;
				for (let channel = 0; channel < 3; channel++) {
					const top =
						texture.data[a + channel] * (1 - fx) +
						texture.data[b + channel] * fx;
					const bottom =
						texture.data[c + channel] * (1 - fx) +
						texture.data[d + channel] * fx;
					pixels[sample.index + channel] =
						(top * (1 - fy) + bottom * fy) * sample.light;
				}
			}
			return pixels;
		},
	};
}
