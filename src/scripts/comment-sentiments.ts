// Compatibility with existing caches; new labels use model-generated text.
const legacyLabels = {
	positive: "正向",
	grateful: "感谢",
	excited: "期待",
	friendly: "友好",
	curious: "好奇",
	confused: "困惑",
	complaint: "吐槽",
	disappointed: "失望",
	worried: "担忧",
	sad: "难过",
	friend_exchange: "想交换友链",
	friend_update: "更新友链",
	question: "提问求助",
	bug_report: "反馈问题",
	suggestion: "提出建议",
	discussion: "交流讨论",
	greeting: "来访问候",
	thanks: "表达感谢",
	resource_share: "分享资源",
	business: "商务合作",
} as const;
const emotions = new Set([
	"positive",
	"grateful",
	"excited",
	"friendly",
	"curious",
	"confused",
	"complaint",
	"disappointed",
	"worried",
	"sad",
]);
const warmEmotions = new Set(["positive", "grateful", "excited", "friendly"]);
const difficultEmotions = new Set([
	"confused",
	"complaint",
	"disappointed",
	"worried",
	"sad",
]);

type Label = {
	kind: "emotion" | "intent";
	text: string;
	tone: "positive" | "negative" | "neutral";
};

const parseLabel = (value: unknown): Label | null => {
	if (typeof value === "string" && Object.hasOwn(legacyLabels, value)) {
		return {
			kind: emotions.has(value) ? "emotion" : "intent",
			text: legacyLabels[value as keyof typeof legacyLabels],
			tone: warmEmotions.has(value)
				? "positive"
				: difficultEmotions.has(value)
					? "negative"
					: "neutral",
		};
	}
	if (!value || typeof value !== "object") return null;
	const label = value as Record<string, unknown>;
	if (label.kind !== "emotion" && label.kind !== "intent") return null;
	if (
		typeof label.text !== "string" ||
		!new RegExp(
			`^[\\u3400-\\u9fffA-Za-z0-9]{1,${label.kind === "emotion" ? 4 : 8}}$`,
		).test(label.text)
	)
		return null;
	const tone = label.tone ?? "neutral";
	if (tone !== "positive" && tone !== "negative" && tone !== "neutral")
		return null;
	return {
		kind: label.kind,
		text: label.text,
		tone: label.kind === "emotion" ? tone : "neutral",
	};
};

const parseLabels = (values: unknown[]): Label[] => {
	const result: Label[] = [];
	const seen = new Set<string>();
	const counts = { emotion: 0, intent: 0 };
	for (const value of values.slice(0, 30)) {
		const label = parseLabel(value);
		if (!label) continue;
		const key = `${label.kind}:${label.text}`;
		if (
			seen.has(key) ||
			counts[label.kind] >= (label.kind === "emotion" ? 3 : 2)
		)
			continue;
		seen.add(key);
		counts[label.kind]++;
		result.push(label);
	}
	return result
		.filter((label) => label.kind === "emotion")
		.concat(result.filter((label) => label.kind === "intent"));
};

export const setupCommentSentiments = (root: HTMLElement): (() => void) => {
	const endpoint = root.dataset.walineLabelsUrl;
	const path = root.dataset.walinePath;
	if (!endpoint || !path) return () => {};
	const controller = new AbortController();
	const results = new Map<string, Label[]>();
	const attempts = new Map<string, number>();
	const contents = new Map<string, string>();
	let disposed = false;
	let loading = false;
	let timer: ReturnType<typeof setTimeout> | undefined;
	let frame: number | undefined;

	const items = () =>
		Array.from(root.querySelectorAll<HTMLElement>(".wl-card-item")).filter(
			(item) => /^[1-9]\d{0,9}$/.test(item.id),
		);

	const render = () => {
		for (const item of items()) {
			const head = item.querySelector<HTMLElement>(
				":scope > .wl-card > .wl-head",
			);
			if (!head || !results.has(item.id)) continue;
			const values = results.get(item.id) || [];
			const existing = head.querySelector<HTMLElement>(
				":scope > [data-comment-sentiments]",
			);
			if (!values.length) {
				existing?.remove();
				continue;
			}
			const signature = values
				.map(({ kind, text, tone }) => `${kind}:${text}:${tone}`)
				.join("|");
			if (existing?.dataset.commentSentiments === signature) continue;
			const group = document.createElement("span");
			group.className = "wl-sentiment-labels";
			group.dataset.commentSentiments = signature;
			group.setAttribute("role", "group");
			group.setAttribute("aria-label", "AI 识别的情绪与意图，仅供参考");
			group.title = "AI 根据评论内容识别情绪和意图，可能有误，仅供参考";
			for (const value of values) {
				const badge = document.createElement("span");
				const tone =
					value.tone === "positive"
						? "positive"
						: value.tone === "negative"
							? "complaint"
							: "question";
				badge.className = `wl-sentiment-label wl-sentiment-label--${tone}`;
				badge.textContent = value.text;
				badge.title = `${value.kind === "emotion" ? "情绪" : "意图"}：${value.text}（AI 识别，仅供参考）`;
				group.append(badge);
			}
			if (existing) existing.replaceWith(group);
			else head.append(group);
		}
	};

	const refresh = async () => {
		frame = undefined;
		if (disposed) return;
		for (const item of items()) {
			const content =
				item.querySelector(":scope > .wl-card > .wl-content")?.textContent ||
				"";
			if (contents.has(item.id) && contents.get(item.id) !== content) {
				results.delete(item.id);
				attempts.delete(item.id);
				item
					.querySelector(
						":scope > .wl-card > .wl-head > [data-comment-sentiments]",
					)
					?.remove();
			}
			contents.set(item.id, content);
		}
		render();
		if (loading || document.hidden) return;
		const ids = [...new Set(items().map((item) => item.id))]
			.filter((id) => !results.has(id) && (attempts.get(id) || 0) < 10)
			.slice(0, 100);
		if (!ids.length) return;
		loading = true;
		for (const id of ids) attempts.set(id, (attempts.get(id) || 0) + 1);
		const url = new URL(endpoint, window.location.href);
		url.search = new URLSearchParams({ ids: ids.join(","), path }).toString();
		const request = new AbortController();
		const timeout = setTimeout(() => request.abort(), 8000);
		const abort = () => request.abort();
		controller.signal.addEventListener("abort", abort, { once: true });
		try {
			const response = await fetch(url, {
				headers: { Accept: "application/json" },
				credentials: "omit",
				signal: request.signal,
			});
			if (!response.ok || disposed) return;
			const payload = (await response.json()) as {
				labels?: Record<string, unknown>;
			};
			if (!payload.labels || typeof payload.labels !== "object") return;
			for (const id of ids) {
				const values = payload.labels[id];
				if (!Array.isArray(values)) continue;
				results.set(id, parseLabels(values));
			}
			render();
		} catch {
			// Classification is optional; keep comments usable during API outages.
		} finally {
			clearTimeout(timeout);
			controller.signal.removeEventListener("abort", abort);
			loading = false;
			if (!disposed) {
				if (timer) clearTimeout(timer);
				timer = setTimeout(() => void refresh(), 30_000);
			}
		}
	};

	const schedule = () => {
		if (disposed || frame !== undefined) return;
		frame = requestAnimationFrame(() => void refresh());
	};
	const observer = new MutationObserver((mutations) => {
		if (
			mutations.some(
				(mutation) =>
					mutation.target instanceof Element &&
					mutation.target.closest(".wl-content"),
			)
		)
			schedule();
		if (
			mutations.some((mutation) =>
				Array.from(mutation.addedNodes).some(
					(node) =>
						node instanceof Element &&
						(node.matches(".wl-card-item, .wl-head") ||
							node.querySelector(".wl-card-item, .wl-head")),
				),
			)
		)
			schedule();
	});
	observer.observe(root, { childList: true, subtree: true });
	document.addEventListener("visibilitychange", schedule);
	schedule();
	return () => {
		disposed = true;
		controller.abort();
		observer.disconnect();
		if (timer) clearTimeout(timer);
		if (frame !== undefined) cancelAnimationFrame(frame);
		document.removeEventListener("visibilitychange", schedule);
		root.querySelectorAll("[data-comment-sentiments]").forEach((element) => {
			element.remove();
		});
	};
};
