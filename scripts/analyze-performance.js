#!/usr/bin/env node

// Build inventory only. Browser requests are needed to measure initial loading.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";

const dist = fileURLToPath(new URL("../dist/", import.meta.url));
const assets = path.join(dist, "_astro");
if (!fs.existsSync(assets)) {
	console.error("dist 不存在，请先运行 pnpm build。");
	process.exit(1);
}

const format = (bytes) => `${(bytes / 1024).toFixed(1)} KiB`;
const files = fs.readdirSync(assets, { recursive: true }).filter((name) => /\.(js|css|woff2)$/.test(name)).map((name) => {
	const data = fs.readFileSync(path.join(assets, name));
	return { name, bytes: data.length, gzip: gzipSync(data).length };
});

console.log("构建产物清单（_astro 目录的产物总量，不代表单页下载量；不包含 public 或 Pagefind 文件）\n");
for (const extension of ["js", "css", "woff2"]) {
	const selected = files.filter((file) => file.name.endsWith(`.${extension}`));
	console.log(`${extension}: ${selected.length} 个文件，原始 ${format(selected.reduce((sum, file) => sum + file.bytes, 0))}，gzip ${format(selected.reduce((sum, file) => sum + file.gzip, 0))}`);
}

console.log("\n最大的 12 个 JavaScript 产物：");
for (const file of files.filter((file) => file.name.endsWith(".js")).sort((a, b) => b.bytes - a.bytes).slice(0, 12)) {
	console.log(`${file.name}: 原始 ${format(file.bytes)}，gzip ${format(file.gzip)}`);
}

console.log("\n代表页面的 HTML 及直接脚本入口：");
for (const route of ["", "posts/auto-listing-system", "friends", "moments", "tools", "about", "guestbook", "search"]) {
	const htmlPath = path.join(dist, route, "index.html");
	if (!fs.existsSync(htmlPath)) continue;
	const data = fs.readFileSync(htmlPath);
	const html = data.toString("utf8");
	const scripts = [...html.matchAll(/<script\b[^>]*\bsrc="([^"]+)"/g)].map((match) => match[1]);
	const islands = [...html.matchAll(/\bcomponent-url="([^"]+)"/g)].map((match) => match[1]);
	console.log(`/${route}${route ? "/" : ""}: HTML ${format(data.length)}，gzip ${format(gzipSync(data).length)}，直接脚本 ${new Set(scripts).size}，岛组件 ${new Set(islands).size}`);
}

console.log("\n模块会继续导入依赖；动态模块和资源的实际加载时机请通过浏览器 Network/Performance 验证。这里不推算 FCP、LCP 或 Lighthouse 分数。");
