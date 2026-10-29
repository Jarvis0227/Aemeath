<script lang="ts">
	import { onMount } from "svelte";

	onMount(() => {
		const article = document.querySelector<HTMLElement>(
			".monthly-post-layout.monthly-issue-2026-09",
		);
		if (!article || window.matchMedia("(prefers-reduced-motion: reduce)").matches)
			return;

		// As in August, intersection starts a one-time transition. Scroll never
		// controls animation progress; content is readable without this island.
		const headings = Array.from(
			article.querySelectorAll<HTMLHeadingElement>(":scope > section > h2"),
		);
		const friendCards = Array.from(
			article.querySelectorAll<HTMLElement>(
				'section:has(> h2[id="9-月推荐友链"]) > section:has(.monthly-friend-avatar)',
			),
		);
		const prose = Array.from(
			article.querySelectorAll<HTMLElement>("h3, p, li, blockquote"),
		).filter(
			(target) =>
				Boolean(target.textContent?.trim()) &&
				!target.closest(
					".monthly-wechat-thread, .monthly-data-strip, .monthly-date-replay, .monthly-stop-pair, .monthly-article-cover-pair, .card-github, .monthly-foundation-intro",
				) &&
				!friendCards.some((card) => card.contains(target)),
		);
		const dates = Array.from(article.querySelectorAll<HTMLElement>(".monthly-date-replay__entry"));
		const stops = Array.from(article.querySelectorAll<HTMLElement>(".monthly-stop-pair__item"));
		const chatThread = article.querySelector<HTMLElement>("[data-monthly-chat-thread]");
		const covers = Array.from(article.querySelectorAll<HTMLElement>(".monthly-article-cover"));
		const dashboard = article.querySelector<HTMLImageElement>(
			'img[src*="/monthly-2026-09/umami-dashboard.webp"]',
		);
		const analytics = article.querySelector<HTMLImageElement>(
			'img[src*="/monthly-2026-09/analytics-page.webp"]',
		);
		const groups = {
			chapter: headings, prose, date: dates, stop: stops,
			cover: covers, friend: friendCards,
			dashboard: dashboard ? [dashboard] : [],
			analytics: analytics ? [analytics] : [],
		};
		const kinds = new Map<HTMLElement, string>();
		for (const [kind, elements] of Object.entries(groups))
			for (const element of elements) kinds.set(element, kind);
		const triggerToTarget = new Map<Element, HTMLElement>();
		const initialBounds = new Map<HTMLElement, DOMRect>();
		for (const [target, kind] of kinds) {
			const trigger = kind === "dashboard" ? target.closest("figure") ?? target : target;
			initialBounds.set(target, trigger.getBoundingClientRect());
		}

		let lastY = window.scrollY;
		let lastTime = performance.now();
		const observer = new IntersectionObserver(
			(entries) => {
				const now = performance.now();
				const speed = Math.min(Math.abs(window.scrollY - lastY) / Math.max(now - lastTime, 1), 6);
				lastY = window.scrollY;
				lastTime = now;
				for (const entry of entries) {
					// A long jump can cross an element between sampled frames.
					if (!entry.isIntersecting && entry.boundingClientRect.bottom >= 0) continue;
					const target = triggerToTarget.get(entry.target);
					if (!target) continue;
					const duration = Math.round(Math.max(450, 790 / (1 + speed * 0.36)));
					target.style.setProperty("--sept-enter-duration", `${duration}ms`);
					target.classList.add("sept-enter--visible");
					observer.unobserve(entry.target);
				}
			},
			{ threshold: 0.08, rootMargin: "0px 0px -8% 0px" },
		);
		// This image starts just below the first viewport. Wait until its upper
		// third is actually on screen, then finish the reveal without more scrolling.
		const dashboardObserver = new IntersectionObserver(
			(entries) => {
				for (const entry of entries) {
					if (!entry.isIntersecting && entry.boundingClientRect.bottom >= 0) continue;
					const target = triggerToTarget.get(entry.target);
					if (!target) continue;
					target.classList.add("sept-enter--visible");
					dashboardObserver.unobserve(entry.target);
				}
			},
			{ threshold: 0, rootMargin: "0px 0px -35% 0px" },
		);

		for (const [target, kind] of kinds) {
			target.classList.add("sept-enter", `sept-enter--${kind}`);
			if (kind === "chapter") {
				const index = headings.indexOf(target as HTMLHeadingElement);
				target.dataset.septChapter = [
					"data", "articles", "updates", "stop", "automation",
					"network", "life", "friends", "rules", "closing",
				][index] ?? "default";
			}
			if (kind === "stop")
				target.dataset.septStopSide = target === stops[0] ? "left" : "right";
			// A fully clipped image has no intersection area, so watch its figure.
			const trigger = kind === "dashboard" ? target.closest("figure") ?? target : target;
			triggerToTarget.set(trigger, target);
			const rect = initialBounds.get(target);
			if (!rect) continue;
			if (rect.bottom < 0 || rect.top < window.innerHeight) {
				// Everything already in the initial viewport stays visible.
				target.classList.add("sept-enter--visible");
			} else {
				(kind === "dashboard" ? dashboardObserver : observer).observe(trigger);
			}
		}

		// August's conversation is delivered as a single sequence, rather than
		// making each bubble wait for a separate scroll gesture.
		const deliverChat = () => {
			if (!chatThread) return;
			chatThread.style.setProperty("--monthly-chat-message-duration", "490ms");
			chatThread.querySelectorAll<HTMLElement>("[data-monthly-chat-message]")
				.forEach((message, index) => {
					message.style.setProperty("--monthly-chat-delay", `${110 + index * 205}ms`);
				});
			chatThread.classList.add("monthly-wechat-thread--delivered");
		};
		const chatObserver = new IntersectionObserver(
			(entries) => {
				for (const entry of entries) {
					if (!entry.isIntersecting && entry.boundingClientRect.bottom >= 0) continue;
					deliverChat();
					chatObserver.unobserve(entry.target);
				}
			},
			{ threshold: 0.08, rootMargin: "0px 0px -14% 0px" },
		);
		if (chatThread) {
			const bounds = chatThread.getBoundingClientRect();
			if (bounds.bottom < 0) {
				chatThread.classList.add("monthly-wechat-thread--instant", "monthly-wechat-thread--delivered");
			} else if (bounds.top < window.innerHeight * 0.72) {
				deliverChat();
			} else {
				chatThread.dataset.chatEnhanced = "true";
				chatObserver.observe(chatThread);
			}
		}

		return () => {
			observer.disconnect();
			dashboardObserver.disconnect();
			chatObserver.disconnect();
			if (chatThread) {
				delete chatThread.dataset.chatEnhanced;
				chatThread.classList.remove("monthly-wechat-thread--delivered", "monthly-wechat-thread--instant");
				chatThread.style.removeProperty("--monthly-chat-message-duration");
				chatThread.querySelectorAll<HTMLElement>("[data-monthly-chat-message]")
					.forEach((message) => message.style.removeProperty("--monthly-chat-delay"));
			}
			for (const [target, kind] of kinds) {
				target.classList.remove("sept-enter", "sept-enter--visible", `sept-enter--${kind}`);
				target.style.removeProperty("--sept-enter-duration");
			}
		};
	});
</script>

<span hidden aria-hidden="true"></span>
