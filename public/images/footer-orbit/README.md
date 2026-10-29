# Footer Earth and Moon imagery

Earth day map and cloud map: **Solar System Scope / INOVE**, based on NASA imagery.
Source: https://www.solarsystemscope.com/textures/
License: **Creative Commons Attribution 4.0 International** — https://creativecommons.org/licenses/by/4.0/
Changes: resized to 512 × 256, cloud layer composited over the day map, converted to WebP.

Moon color map: **NASA's Scientific Visualization Studio / Ernie Wright**, from Lunar Reconnaissance Orbiter imagery (LROC WAC mosaic).
Source: https://svs.gsfc.nasa.gov/4720/ (2025 color map, `lroc_color_2k.jpg`).
Changes: resized to 256 × 128 and converted to WebP.
NASA media usage: https://www.nasa.gov/nasa-brand-center/images-and-media/

`poster.webp` is a static spherical rendering of these maps, used before animation loads and for reduced motion.

Rendering reference: https://threejs.org/examples/webgpu_tsl_earth.html
The footer uses a small native Canvas sphere projection and depth-sorted lunar orbit, with no Three.js runtime download.
The orbital distance and periods are compressed for this decorative scene; it is not an ephemeris.

To regenerate: `pnpm exec tsx scripts/generate-footer-orbit-assets.ts`.
