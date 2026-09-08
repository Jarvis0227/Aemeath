import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { existsSync } from "node:fs";

const root = process.cwd();
const postsRoot = path.join(root, "src", "content", "posts");
const port = Number(process.env.POST_STUDIO_PORT || 4323);

const html = String.raw`<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Firefly Post Studio</title>
  <style>
    :root {
      color-scheme: light;
      --ink: #202124;
      --muted: #6b6258;
      --line: #ded7cd;
      --paper: #fbf7f0;
      --panel: #fffdf8;
      --accent: #166c72;
      --accent-2: #b45d31;
      --soft: #efe8dd;
      --danger: #a33b33;
      --shadow: 0 24px 70px rgba(70, 54, 37, .16);
      font-family: "Noto Serif SC", "LXGW WenKai", "Songti SC", Georgia, serif;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      color: var(--ink);
      background:
        linear-gradient(90deg, rgba(22, 108, 114, .08) 1px, transparent 1px),
        linear-gradient(rgba(180, 93, 49, .06) 1px, transparent 1px),
        radial-gradient(circle at 12% 8%, rgba(22, 108, 114, .16), transparent 30rem),
        var(--paper);
      background-size: 28px 28px, 28px 28px, auto, auto;
    }
    header {
      max-width: 1180px;
      margin: 0 auto;
      padding: 42px 22px 24px;
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 20px;
      align-items: end;
    }
    h1 {
      margin: 0;
      font-size: clamp(2rem, 4vw, 4.6rem);
      line-height: .95;
      font-weight: 800;
      letter-spacing: 0;
    }
    .subtitle {
      margin-top: 12px;
      color: var(--muted);
      max-width: 680px;
      font-size: 1rem;
    }
    .shell {
      max-width: 1180px;
      margin: 0 auto 48px;
      padding: 0 22px;
      display: grid;
      grid-template-columns: minmax(0, 1fr) 360px;
      gap: 18px;
    }
    .panel {
      background: color-mix(in srgb, var(--panel) 94%, transparent);
      border: 1px solid var(--line);
      box-shadow: var(--shadow);
      border-radius: 8px;
    }
    form.panel { padding: 22px; }
    aside.panel { padding: 18px; align-self: start; position: sticky; top: 14px; }
    .grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 14px;
    }
    label { display: grid; gap: 6px; font-weight: 700; font-size: .92rem; }
    label span { color: var(--muted); font-weight: 500; font-size: .78rem; }
    input, textarea, select {
      width: 100%;
      border: 1px solid var(--line);
      border-radius: 6px;
      background: #fffaf2;
      color: var(--ink);
      padding: 10px 11px;
      font: 500 .95rem/1.5 ui-monospace, "Cascadia Code", Consolas, monospace;
      outline: none;
      transition: border-color .18s, box-shadow .18s, background .18s;
    }
    input:focus, textarea:focus, select:focus {
      border-color: var(--accent);
      box-shadow: 0 0 0 3px rgba(22, 108, 114, .12);
      background: white;
    }
    textarea { min-height: 420px; resize: vertical; }
    .wide { grid-column: 1 / -1; }
    .switches {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 10px;
      margin: 14px 0;
    }
    .toggle {
      border: 1px solid var(--line);
      border-radius: 6px;
      padding: 10px;
      display: flex;
      align-items: center;
      gap: 8px;
      background: var(--soft);
      cursor: pointer;
      user-select: none;
    }
    .toggle input { width: 18px; height: 18px; accent-color: var(--accent); }
    .actions {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      align-items: center;
      margin-top: 16px;
    }
    button {
      border: 0;
      border-radius: 6px;
      padding: 11px 15px;
      font-weight: 800;
      color: white;
      background: var(--accent);
      cursor: pointer;
      transition: transform .14s, filter .14s;
    }
    button:hover { transform: translateY(-1px); filter: brightness(1.04); }
    button.secondary { background: var(--ink); }
    button.ghost { background: transparent; color: var(--accent); border: 1px solid var(--accent); }
    .note {
      color: var(--muted);
      font-size: .88rem;
      line-height: 1.7;
      margin: 0;
    }
    .status {
      min-height: 24px;
      font-weight: 700;
      color: var(--accent);
    }
    .status.error { color: var(--danger); }
    .post-list {
      margin-top: 14px;
      display: grid;
      gap: 8px;
      max-height: 440px;
      overflow: auto;
      padding-right: 4px;
    }
    .post-item {
      width: 100%;
      text-align: left;
      background: #fffaf2;
      color: var(--ink);
      border: 1px solid var(--line);
      display: grid;
      gap: 3px;
    }
    .post-item small { color: var(--muted); font-weight: 600; }
    .preview {
      white-space: pre-wrap;
      max-height: 360px;
      overflow: auto;
      background: #191816;
      color: #f8efe1;
      border-radius: 6px;
      padding: 14px;
      font: .82rem/1.55 ui-monospace, "Cascadia Code", Consolas, monospace;
    }
    @media (max-width: 920px) {
      header, .shell { grid-template-columns: 1fr; }
      aside.panel { position: static; }
      .grid, .switches { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>
  <header>
    <div>
      <h1>Post Studio</h1>
      <div class="subtitle">给 Firefly 写文章的小工作台。填写元信息，保存后会在 <code>src/content/posts</code> 下生成 Markdown 或 MDX。</div>
    </div>
    <button class="secondary" id="newBtn" type="button">新文章</button>
  </header>

  <main class="shell">
    <form class="panel" id="form">
      <div class="grid">
        <label>标题
          <input name="title" required placeholder="我的第一篇文章" />
        </label>
        <label>文件路径
          <input name="fileName" required placeholder="my-first-post.md 或 notes/index.md" />
          <span>决定 URL。示例：my-first-post.md => /posts/my-first-post/</span>
        </label>
        <label>发布日期
          <input name="published" type="date" required />
        </label>
        <label>更新日期
          <input name="updated" type="date" />
        </label>
        <label class="wide">摘要
          <input name="description" placeholder="显示在文章卡片和 RSS 中" />
        </label>
        <label>封面图
          <input name="image" placeholder="./cover.png、/images/a.jpg、https://..." />
        </label>
        <label>分类
          <input name="category" placeholder="生活 / 技术 / 随笔" />
        </label>
        <label>标签
          <input name="tags" placeholder="Markdown, Firefly, 日常" />
          <span>用逗号分隔</span>
        </label>
        <label>语言
          <input name="lang" placeholder="zh-CN，可留空" />
        </label>
        <label>作者
          <input name="author" placeholder="可留空" />
        </label>
        <label>来源链接
          <input name="sourceLink" placeholder="转载或参考链接，可留空" />
        </label>
        <label>许可证名称
          <input name="licenseName" placeholder="CC BY-NC-SA 4.0，可留空" />
        </label>
        <label>许可证链接
          <input name="licenseUrl" placeholder="可留空" />
        </label>
        <label>文章密码
          <input name="password" type="password" placeholder="设置后文章会加密，可留空" />
        </label>
        <label>密码提示
          <input name="passwordHint" placeholder="可留空" />
        </label>
      </div>

      <div class="switches">
        <label class="toggle"><input name="draft" type="checkbox" />草稿</label>
        <label class="toggle"><input name="pinned" type="checkbox" />置顶</label>
        <label class="toggle"><input name="comment" type="checkbox" checked />评论</label>
        <label class="toggle"><input name="mdx" type="checkbox" />MDX</label>
      </div>

      <label class="wide">正文
        <textarea name="body" placeholder="从这里开始写 Markdown..."></textarea>
      </label>

      <div class="actions">
        <button type="submit">保存文章</button>
        <button class="ghost" type="button" id="previewBtn">刷新预览</button>
        <span class="status" id="status"></span>
      </div>
    </form>

    <aside class="panel">
      <p class="note">左侧保存会直接写文件。加载已有文章后再次保存会覆盖该文件；新建文章遇到同名文件时会提示。</p>
      <div class="actions">
        <button class="ghost" type="button" id="reloadBtn">刷新列表</button>
      </div>
      <div class="post-list" id="postList"></div>
      <h3>生成预览</h3>
      <pre class="preview" id="preview"></pre>
    </aside>
  </main>

  <script>
    const form = document.querySelector("#form");
    const statusEl = document.querySelector("#status");
    const previewEl = document.querySelector("#preview");
    const listEl = document.querySelector("#postList");
    let currentFile = "";

    function today() {
      const d = new Date();
      return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, "0"), String(d.getDate()).padStart(2, "0")].join("-");
    }
    function slugify(value) {
      return value.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9\u4e00-\u9fa5_-]/g, "").replace(/-+/g, "-");
    }
    function fields() {
      return Object.fromEntries(new FormData(form).entries());
    }
    function payload() {
      const data = fields();
      data.draft = form.draft.checked;
      data.pinned = form.pinned.checked;
      data.comment = form.comment.checked;
      data.mdx = form.mdx.checked;
      data.currentFile = currentFile;
      return data;
    }
    function setStatus(text, error = false) {
      statusEl.textContent = text;
      statusEl.classList.toggle("error", error);
    }
    async function api(url, options) {
      const res = await fetch(url, options);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "请求失败");
      return data;
    }
    async function loadPosts() {
      listEl.innerHTML = "";
      const posts = await api("/api/posts");
      posts.forEach((post) => {
        const btn = document.createElement("button");
        btn.className = "post-item";
        btn.type = "button";
        btn.innerHTML = "<strong></strong><small></small>";
        btn.querySelector("strong").textContent = post.title || post.file;
        btn.querySelector("small").textContent = post.file;
        btn.addEventListener("click", () => loadPost(post.file));
        listEl.appendChild(btn);
      });
    }
    async function loadPost(file) {
      const post = await api("/api/post?file=" + encodeURIComponent(file));
      currentFile = post.file;
      form.title.value = post.title || "";
      form.fileName.value = post.file;
      form.published.value = post.published || today();
      form.updated.value = post.updated || "";
      form.description.value = post.description || "";
      form.image.value = post.image || "";
      form.category.value = post.category || "";
      form.tags.value = (post.tags || []).join(", ");
      form.lang.value = post.lang || "";
      form.author.value = post.author || "";
      form.sourceLink.value = post.sourceLink || "";
      form.licenseName.value = post.licenseName || "";
      form.licenseUrl.value = post.licenseUrl || "";
      form.password.value = post.password || "";
      form.passwordHint.value = post.passwordHint || "";
      form.draft.checked = Boolean(post.draft);
      form.pinned.checked = Boolean(post.pinned);
      form.comment.checked = post.comment !== false;
      form.mdx.checked = post.file.toLowerCase().endsWith(".mdx");
      form.body.value = post.body || "";
      refreshPreview();
      setStatus("已加载 " + post.file);
    }
    async function refreshPreview() {
      const data = await api("/api/preview", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload()),
      });
      previewEl.textContent = data.content;
    }
    function resetForm() {
      currentFile = "";
      form.reset();
      form.published.value = today();
      form.comment.checked = true;
      previewEl.textContent = "";
      setStatus("");
    }
    form.title.addEventListener("blur", () => {
      if (!form.fileName.value.trim() && form.title.value.trim()) {
        form.fileName.value = slugify(form.title.value) + (form.mdx.checked ? ".mdx" : ".md");
      }
    });
    form.mdx.addEventListener("change", () => {
      if (!form.fileName.value.trim()) return;
      form.fileName.value = form.fileName.value.replace(/\.(md|mdx)$/i, form.mdx.checked ? ".mdx" : ".md");
    });
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      setStatus("保存中...");
      try {
        const data = await api("/api/save", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload()),
        });
        currentFile = data.file;
        form.fileName.value = data.file;
        setStatus("已保存 " + data.file);
        await loadPosts();
        await refreshPreview();
      } catch (error) {
        setStatus(error.message, true);
      }
    });
    document.querySelector("#previewBtn").addEventListener("click", refreshPreview);
    document.querySelector("#reloadBtn").addEventListener("click", loadPosts);
    document.querySelector("#newBtn").addEventListener("click", resetForm);
    resetForm();
    loadPosts().catch((error) => setStatus(error.message, true));
  </script>
</body>
</html>`;

function sendJson(res, status, data) {
	res.writeHead(status, { "content-type": "application/json; charset=utf-8" });
	res.end(JSON.stringify(data));
}

async function readBody(req) {
	const chunks = [];
	for await (const chunk of req) chunks.push(chunk);
	return Buffer.concat(chunks).toString("utf8");
}

function normalizePostPath(fileName, mdx = false) {
	let normalized = String(fileName || "").trim().replaceAll("\\", "/");
	normalized = normalized.replace(/^\/+/, "");
	if (!normalized) throw new Error("请填写文件路径");
	if (!/\.(md|mdx)$/i.test(normalized)) normalized += mdx ? ".mdx" : ".md";
	const target = path.resolve(postsRoot, normalized);
	const relative = path.relative(postsRoot, target);
	if (relative.startsWith("..") || path.isAbsolute(relative)) {
		throw new Error("文件路径必须位于 src/content/posts 内");
	}
	return relative.replaceAll("\\", "/");
}

function yamlString(value) {
	const text = String(value ?? "");
	if (!text) return "''";
	return JSON.stringify(text);
}

function yamlBoolean(value) {
	return value ? "true" : "false";
}

function splitTags(value) {
	if (Array.isArray(value)) return value.map(String).filter(Boolean);
	return String(value || "")
		.split(/[,，]/)
		.map((tag) => tag.trim())
		.filter(Boolean);
}

function buildPost(data) {
	const lines = ["---"];
	lines.push(`title: ${yamlString(data.title)}`);
	lines.push(`published: ${data.published || new Date().toISOString().slice(0, 10)}`);
	if (data.updated) lines.push(`updated: ${data.updated}`);
	lines.push(`description: ${yamlString(data.description)}`);
	lines.push(`image: ${yamlString(data.image)}`);
	lines.push(`tags: [${splitTags(data.tags).map(yamlString).join(", ")}]`);
	lines.push(`category: ${yamlString(data.category)}`);
	lines.push(`draft: ${yamlBoolean(data.draft)}`);
	lines.push(`pinned: ${yamlBoolean(data.pinned)}`);
	if (data.lang) lines.push(`lang: ${yamlString(data.lang)}`);
	if (data.author) lines.push(`author: ${yamlString(data.author)}`);
	if (data.sourceLink) lines.push(`sourceLink: ${yamlString(data.sourceLink)}`);
	if (data.licenseName) lines.push(`licenseName: ${yamlString(data.licenseName)}`);
	if (data.licenseUrl) lines.push(`licenseUrl: ${yamlString(data.licenseUrl)}`);
	if (data.comment === false) lines.push("comment: false");
	if (data.password) lines.push(`password: ${yamlString(data.password)}`);
	if (data.passwordHint) lines.push(`passwordHint: ${yamlString(data.passwordHint)}`);
	lines.push("---", "", String(data.body || "").replace(/\r\n/g, "\n"));
	return lines.join("\n");
}

function parseScalar(value) {
	const raw = value.trim();
	if (raw === "true") return true;
	if (raw === "false") return false;
	if (raw.startsWith("[") && raw.endsWith("]")) {
		return raw
			.slice(1, -1)
			.split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/)
			.map((item) => item.trim().replace(/^["']|["']$/g, ""))
			.filter(Boolean);
	}
	return raw.replace(/^["']|["']$/g, "");
}

function parsePost(file, content) {
	const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
	const frontmatter = {};
	let body = content;
	if (match) {
		body = content.slice(match[0].length);
		for (const line of match[1].split(/\r?\n/)) {
			const pair = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
			if (pair) frontmatter[pair[1]] = parseScalar(pair[2]);
		}
	}
	return { file, body, ...frontmatter };
}

async function listMarkdownFiles(dir = postsRoot, prefix = "") {
	const entries = await fs.readdir(dir, { withFileTypes: true });
	const result = [];
	for (const entry of entries) {
		const full = path.join(dir, entry.name);
		const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
		if (entry.isDirectory()) {
			result.push(...await listMarkdownFiles(full, rel));
		} else if (/\.(md|mdx)$/i.test(entry.name)) {
			result.push(rel);
		}
	}
	return result.sort((a, b) => a.localeCompare(b));
}

async function handleApi(req, res, url) {
	if (url.pathname === "/api/posts" && req.method === "GET") {
		const files = await listMarkdownFiles();
		const posts = [];
		for (const file of files) {
			const content = await fs.readFile(path.join(postsRoot, file), "utf8");
			const parsed = parsePost(file, content);
			posts.push({ file, title: parsed.title, published: parsed.published });
		}
		return sendJson(res, 200, posts);
	}
	if (url.pathname === "/api/post" && req.method === "GET") {
		const file = normalizePostPath(url.searchParams.get("file"));
		const content = await fs.readFile(path.join(postsRoot, file), "utf8");
		return sendJson(res, 200, parsePost(file, content));
	}
	if (url.pathname === "/api/preview" && req.method === "POST") {
		const data = JSON.parse(await readBody(req));
		return sendJson(res, 200, { content: buildPost(data) });
	}
	if (url.pathname === "/api/save" && req.method === "POST") {
		const data = JSON.parse(await readBody(req));
		if (!data.title) throw new Error("请填写标题");
		const file = normalizePostPath(data.fileName, data.mdx);
		const target = path.join(postsRoot, file);
		const currentFile = data.currentFile ? normalizePostPath(data.currentFile, data.mdx) : "";
		if (existsSync(target) && currentFile !== file) {
			throw new Error(`文件已存在：${file}`);
		}
		await fs.mkdir(path.dirname(target), { recursive: true });
		await fs.writeFile(target, buildPost(data), "utf8");
		return sendJson(res, 200, { ok: true, file });
	}
	sendJson(res, 404, { error: "Not found" });
}

const server = http.createServer(async (req, res) => {
	try {
		const url = new URL(req.url || "/", `http://localhost:${port}`);
		if (url.pathname.startsWith("/api/")) return await handleApi(req, res, url);
		res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
		res.end(html);
	} catch (error) {
		sendJson(res, 400, { error: error.message || String(error) });
	}
});

server.listen(port, () => {
	console.log(`Firefly Post Studio: http://localhost:${port}`);
});
