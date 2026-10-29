<script lang="ts">
import { onMount } from "svelte";

// Supply your own scene text and media when using this optional article layout.
export let copy: Record<string, string> = {};
const sceneText = (key: string): string => copy[key] || "请添加自己的文章内容";

export let balconyWaiting = "";
export let balconyApproaching = "";
export let balconyTogether = "";
export let balconySunset = "";
export let balconyEmpty = "";
export let grandmaMemory = "";
export let grandmaHair = "";
export let deskDay = "";
export let deskDusk = "";
export let deskNight = "";

let filmRoot: HTMLElement;
let plainTextMode = false;
let isSmallDevice = false;
let mobileNoticeVisible = false;
let mobileNoticeTimer: ReturnType<typeof setTimeout> | undefined;
let tocRefreshTimer: ReturnType<typeof setTimeout> | undefined;

const refreshArticleToc = () => {
	if (typeof window === "undefined") return;
	if (tocRefreshTimer) clearTimeout(tocRefreshTimer);
	tocRefreshTimer = setTimeout(() => {
		window.dispatchEvent(new CustomEvent("article-toc-refresh"));
		tocRefreshTimer = undefined;
	}, 0);
};

const showMobileNotice = () => {
	mobileNoticeVisible = true;
	if (mobileNoticeTimer) clearTimeout(mobileNoticeTimer);
	mobileNoticeTimer = setTimeout(() => {
		mobileNoticeVisible = false;
		mobileNoticeTimer = undefined;
	}, 2600);
};

const toggleTextMode = () => {
	if (isSmallDevice && plainTextMode) {
		showMobileNotice();
		return;
	}

	plainTextMode = !plainTextMode;
	mobileNoticeVisible = false;
	refreshArticleToc();
};

onMount(() => {
	if (!filmRoot) return;

	const smallDeviceQuery = window.matchMedia("(max-width: 767px)");
	const syncViewportMode = () => {
		isSmallDevice = smallDeviceQuery.matches;
		if (isSmallDevice) {
			plainTextMode = true;
			mobileNoticeVisible = false;
		}
		refreshArticleToc();
	};

	syncViewportMode();

	const reducedMotion = window.matchMedia(
		"(prefers-reduced-motion: reduce)",
	).matches;
	const revealTargets = Array.from(
		filmRoot.querySelectorAll<HTMLElement>("[data-film-reveal]"),
	);
	const scenes = Array.from(
		filmRoot.querySelectorAll<HTMLElement>("[data-film-scene]"),
	);
	const balconyScene = filmRoot.querySelector<HTMLElement>(
		".grandma-film__scene--balcony",
	);
	const deskScene = filmRoot.querySelector<HTMLElement>(
		".grandma-film__scene--desk",
	);
	const endingScene = filmRoot.querySelector<HTMLElement>(
		".grandma-film__scene--ending",
	);
	const endingCopyTargets = Array.from(
		filmRoot.querySelectorAll<HTMLElement>("[data-ending-copy]"),
	);
	const dialogueLines = Array.from(
		filmRoot.querySelectorAll<HTMLElement>("[data-film-dialogue-line]"),
	);

	filmRoot.dataset.filmReady = "true";

	const cleanups: Array<() => void> = [];
	smallDeviceQuery.addEventListener("change", syncViewportMode);
	cleanups.push(() =>
		smallDeviceQuery.removeEventListener("change", syncViewportMode),
	);
	cleanups.push(() => {
		if (mobileNoticeTimer) clearTimeout(mobileNoticeTimer);
		if (tocRefreshTimer) clearTimeout(tocRefreshTimer);
	});
	let scrollFrame = 0;

	const clamp = (value: number, min = 0, max = 1) =>
		Math.min(Math.max(value, min), max);

	const easeInOut = (value: number) => {
		const t = clamp(value);
		return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
	};

	const updateEndingCopy = (progress: number) => {
		if (reducedMotion) {
			endingCopyTargets.forEach((target) => {
				target.style.setProperty("--ending-copy-opacity", "1");
				target.style.setProperty("--ending-copy-y", "0rem");
				target.style.setProperty("--ending-copy-blur", "0rem");
				target.style.setProperty("--ending-copy-scale", "1");
			});
			return;
		}

		const fadeWindow = 0.07;

		endingCopyTargets.forEach((target) => {
			const start = Number(target.dataset.endingStart ?? 0);
			const fadeIn = easeInOut((progress - start) / fadeWindow);
			const opacity = fadeIn;

			target.style.setProperty("--ending-copy-opacity", opacity.toFixed(3));
			target.style.setProperty(
				"--ending-copy-y",
				`${((1 - opacity) * 0.85).toFixed(3)}rem`,
			);
			target.style.setProperty(
				"--ending-copy-blur",
				`${((1 - opacity) * 0.32).toFixed(3)}rem`,
			);
			target.style.setProperty(
				"--ending-copy-scale",
				(0.985 + opacity * 0.015).toFixed(3),
			);
		});
	};

	const setVisible = (target: HTMLElement) => {
		target.classList.add("is-visible");
	};

	if (reducedMotion) {
		revealTargets.forEach(setVisible);
		dialogueLines.forEach((line) => {
			line.style.setProperty("--dialogue-opacity", "1");
			line.style.setProperty("--dialogue-y", "0rem");
		});
		balconyScene?.style.setProperty("--dialogue-ellipsis", "1");
		balconyScene?.style.setProperty("--sunset-frame-opacity", "0");
		balconyScene?.style.setProperty("--memory-pair-opacity", "1");
		balconyScene?.style.setProperty("--memory-mid-opacity", "1");
		balconyScene?.style.setProperty("--memory-final-opacity", "1");
		balconyScene?.style.setProperty("--balcony-copy-opacity", "0");
		balconyScene?.style.setProperty("--balcony-copy-y", "1.1rem");
		balconyScene?.style.setProperty("--hair-copy-opacity", "1");
		balconyScene?.style.setProperty("--hair-copy-y", "0rem");
		balconyScene?.style.setProperty("--hair-glow-opacity", "1");
		deskScene?.style.setProperty("--desk-dusk-opacity", "0");
		deskScene?.style.setProperty("--desk-night-opacity", "1");
		deskScene?.style.setProperty("--desk-copy-opacity", "1");
		deskScene?.style.setProperty("--desk-copy-y", "0rem");
		endingScene?.style.setProperty("--ending-empty-opacity", "1");
		updateEndingCopy(1);
	} else {
		const revealObserver = new IntersectionObserver(
			(entries) => {
				entries.forEach((entry) => {
					if (!entry.isIntersecting) return;
					setVisible(entry.target as HTMLElement);
					revealObserver.unobserve(entry.target);
				});
			},
			{ threshold: 0.14, rootMargin: "0px 0px -10% 0px" },
		);

		revealTargets.forEach((target) => {
			if (target.getBoundingClientRect().bottom < 0) setVisible(target);
			else revealObserver.observe(target);
		});
		cleanups.push(() => revealObserver.disconnect());
	}

	const updateDialogue = (progress: number) => {
		if (!balconyScene || !dialogueLines.length || reducedMotion) return;

		const dialogueStart = 0.15;
		const dialogueEnd = 0.58;
		const dialogueProgress = clamp(
			(progress - dialogueStart) / (dialogueEnd - dialogueStart),
		);
		const pairCount = Math.ceil(dialogueLines.length / 2);
		const pairSegment = dialogueProgress * pairCount;
		const currentPair = Math.min(pairCount - 1, Math.floor(pairSegment));
		const localPairProgress = Math.min(pairSegment - currentPair, 1);
		const incomingWindow = 0.18;
		const replyStart = 0.45;
		const replyWindow = 0.18;

		dialogueLines.forEach((line, index) => {
			let opacity = 0;
			let offset = index % 2 === 0 ? 1.2 : -1.2;
			const pairIndex = Math.floor(index / 2);
			const isIncoming = index % 2 === 0;

			if (dialogueProgress >= 1) {
				opacity = 0;
			} else if (pairIndex === currentPair) {
				if (isIncoming) {
					opacity = clamp(localPairProgress / incomingWindow);
				} else {
					opacity = clamp((localPairProgress - replyStart) / replyWindow);
				}
				offset = (isIncoming ? 1 : -1) * (1 - opacity) * 1.2;
			} else if (
				pairIndex === currentPair - 1 &&
				localPairProgress < incomingWindow
			) {
				opacity = 1 - clamp(localPairProgress / incomingWindow);
				offset = (isIncoming ? -1 : 1) * (1 - opacity) * 0.8;
			}

			line.style.setProperty("--dialogue-opacity", opacity.toFixed(3));
			line.style.setProperty("--dialogue-y", `${offset.toFixed(3)}rem`);
		});

		balconyScene.style.setProperty("--dialogue-ellipsis", "0");
	};

	const updateBalconyComposition = (progress: number) => {
		if (!balconyScene || reducedMotion) return;

		// Finish the sunset first, then crossfade into the memory scene. The
		// eased values keep the image and copy from snapping at the boundary.
		const sunsetIn = easeInOut((progress - 0.44) / 0.16);
		const sunsetExit = easeInOut((progress - 0.64) / 0.14);
		const sunsetFrameOpacity = sunsetIn * (1 - sunsetExit);
		const hairCopyIn = easeInOut((progress - 0.78) / 0.14);
		const midHairIn = easeInOut((progress - 0.77) / 0.13);
		const finalHairIn = easeInOut((progress - 0.9) / 0.1);
		const balconyCopyOpacity = 1 - easeInOut((progress - 0.48) / 0.16);

		balconyScene.style.setProperty(
			"--sunset-frame-opacity",
			sunsetFrameOpacity.toFixed(3),
		);
		balconyScene.style.setProperty(
			"--memory-pair-opacity",
			sunsetExit.toFixed(3),
		);
		balconyScene.style.setProperty(
			"--memory-mid-opacity",
			midHairIn.toFixed(3),
		);
		balconyScene.style.setProperty(
			"--memory-final-opacity",
			finalHairIn.toFixed(3),
		);
		balconyScene.style.setProperty(
			"--balcony-copy-opacity",
			balconyCopyOpacity.toFixed(3),
		);
		balconyScene.style.setProperty(
			"--balcony-copy-y",
			`${((1 - balconyCopyOpacity) * 1.1).toFixed(3)}rem`,
		);
		balconyScene.style.setProperty(
			"--hair-copy-opacity",
			hairCopyIn.toFixed(3),
		);
		balconyScene.style.setProperty(
			"--hair-copy-y",
			`${((1 - hairCopyIn) * 1.1).toFixed(3)}rem`,
		);
		balconyScene.style.setProperty(
			"--hair-glow-opacity",
			(sunsetExit * (0.16 + finalHairIn * 0.84)).toFixed(3),
		);
	};

	const updateDeskComposition = (progress: number) => {
		if (!deskScene || reducedMotion) return;

		const duskIn = easeInOut((progress - 0.14) / 0.28);
		const duskOut = easeInOut((progress - 0.48) / 0.26);
		const duskOpacity = duskIn * (1 - duskOut);
		const nightIn = easeInOut((progress - 0.46) / 0.48);
		const copyIn = easeInOut((progress - 0.08) / 0.24);
		const copyOut = easeInOut((progress - 0.86) / 0.14);
		const copyOpacity = copyIn * (1 - copyOut);

		deskScene.style.setProperty("--desk-dusk-opacity", duskOpacity.toFixed(3));
		deskScene.style.setProperty("--desk-night-opacity", nightIn.toFixed(3));
		deskScene.style.setProperty("--desk-copy-opacity", copyOpacity.toFixed(3));
		deskScene.style.setProperty(
			"--desk-copy-y",
			`${((1 - copyIn) * 1.1 + copyOut * 0.75).toFixed(3)}rem`,
		);
	};

	const updateEndingComposition = (progress: number) => {
		if (!endingScene || reducedMotion) return;

		const emptyIn = easeInOut((progress - 0.2) / 0.74);

		endingScene.style.setProperty("--ending-empty-opacity", emptyIn.toFixed(3));
		updateEndingCopy(progress);
	};

	const updateSceneProgress = () => {
		scrollFrame = 0;
		scenes.forEach((scene) => {
			const rect = scene.getBoundingClientRect();
			const travel = Math.max(
				scene.offsetHeight - window.innerHeight * 0.64,
				1,
			);
			const progress = reducedMotion
				? 1
				: clamp((window.innerHeight * 0.2 - rect.top) / travel);
			scene.style.setProperty("--film-progress", progress.toFixed(4));
			if (scene === balconyScene) {
				updateDialogue(progress);
				updateBalconyComposition(progress);
			} else if (scene === deskScene) {
				updateDeskComposition(progress);
			} else if (scene === endingScene) {
				updateEndingComposition(progress);
			}
		});
	};

	const queueSceneProgress = () => {
		if (!scrollFrame)
			scrollFrame = window.requestAnimationFrame(updateSceneProgress);
	};

	updateSceneProgress();
	window.addEventListener("scroll", queueSceneProgress, { passive: true });
	window.addEventListener("resize", queueSceneProgress);
	cleanups.push(
		() => window.removeEventListener("scroll", queueSceneProgress),
		() => window.removeEventListener("resize", queueSceneProgress),
		() => window.cancelAnimationFrame(scrollFrame),
	);

	return () => {
		for (const cleanup of cleanups) cleanup();
	};
});
</script>

<article
  bind:this={filmRoot}
  id="grandma-film"
  class="grandma-film markdown-content"
  class:grandma-film--plain={plainTextMode}
  aria-label="文章动态阅读模板"
>
  <aside class="grandma-film__desktop-note" role="note" aria-label="阅读提示">
    <span class="grandma-film__desktop-note-label">阅读提示</span>
    <p>动态版适配 PC 端，手机端默认使用原始 Markdown 版。</p>
  </aside>

  <div class="grandma-film__mode-switcher" role="group" aria-label="文章阅读模式">
    <button
      type="button"
      class="grandma-film__mode-button"
      aria-controls="grandma-film-interactive grandma-film-plain"
      aria-pressed={plainTextMode}
      onclick={toggleTextMode}
    >
      {plainTextMode ? "切换动态版本" : "切换纯文本版本"}
    </button>
    <p>手机端默认显示原始 Markdown 版，电脑端可在两种版本间切换。</p>
    {#if mobileNoticeVisible}
      <p class="grandma-film__mode-feedback" role="status" aria-live="polite">
        您的小设备没做适配哦~
      </p>
    {/if}
  </div>

  <div id="grandma-film-interactive" class="grandma-film__interactive" hidden={plainTextMode}>
  <section class="grandma-film__prose grandma-film__prose--opening" data-film-reveal>
    <p>{sceneText("copy-01")}</p>
    <p>{sceneText("copy-02")}</p>
  </section>

  <section class="grandma-film__chapter grandma-film__chapter--arrival">
    <h2 id="film-heading-95" data-film-reveal>{sceneText("copy-03")}</h2>
    <div class="grandma-film__date-track" aria-label="文章场景">
      <div class="grandma-film__date-item" data-film-reveal>
        <time datetime="">{sceneText("copy-04")}</time>
        <span>{sceneText("copy-05")}</span>
      </div>
      <div class="grandma-film__date-item grandma-film__date-item--home" data-film-reveal>
        <time datetime="">{sceneText("copy-06")}</time>
        <span>{sceneText("copy-07")}</span>
      </div>
      <div class="grandma-film__date-item" data-film-reveal>
        <time datetime="">{sceneText("copy-08")}</time>
        <span>{sceneText("copy-09")}</span>
      </div>
    </div>
    <div class="grandma-film__prose grandma-film__prose--narrow" data-film-reveal>
      <p>{sceneText("copy-10")}</p>
      <p>{sceneText("copy-11")}</p>
    </div>
  </section>

  <section class="grandma-film__scene grandma-film__scene--balcony" data-film-scene aria-label="文章场景">
    <h2 id="film-heading-96" class="grandma-film__toc-heading grandma-film__toc-heading--scene-anchor">{sceneText("copy-12")}</h2>
    <div class="grandma-film__sticky">
      <div class="grandma-film__image-pair" aria-hidden="true">
        <img class="grandma-film__image grandma-film__image--base" src={balconyWaiting || undefined} alt="" />
        <img class="grandma-film__image grandma-film__image--approaching" src={balconyApproaching || undefined} alt="" />
        <img class="grandma-film__image grandma-film__image--together" src={balconyTogether || undefined} alt="" />
        <img class="grandma-film__image grandma-film__image--sunset" src={balconySunset || undefined} alt="" />
        <span class="grandma-film__light-sweep"></span>
      </div>
      <div class="grandma-film__image-pair grandma-film__image-pair--memory" aria-hidden="true">
        <img class="grandma-film__image grandma-film__image--memory-base" src={grandmaMemory || undefined} alt="" />
        <img class="grandma-film__image grandma-film__image--memory-mid" src={grandmaHair || undefined} alt="" />
        <img class="grandma-film__image grandma-film__image--memory-final" src={grandmaHair || undefined} alt="" />
        <span class="grandma-film__hair-glow"></span>
      </div>
      <p class="grandma-film__scroll-hint" role="note"><span class="grandma-film__scroll-icon" aria-hidden="true"></span>缓慢滚动鼠标，播放动画</p>
      <div class="grandma-film__scene-copy grandma-film__scene-copy--balcony" data-film-reveal>
        <p class="grandma-film__small-label">{sceneText("copy-13")}</p>
        <p>{sceneText("copy-14")}</p>
        <p>{sceneText("copy-15")}</p>
      </div>
      <div class="grandma-film__scene-copy grandma-film__scene-copy--hair-transition">
        <p class="grandma-film__small-label">{sceneText("copy-16")}</p>
        <p>{sceneText("copy-17")}</p>
        <p class="grandma-film__line-emphasis">{sceneText("copy-18")}</p>
      </div>
      <div class="grandma-film__dialogue" aria-label="文章场景">
        <span class="grandma-film__dialogue-notice">{sceneText("copy-19")}</span>
        <article class="grandma-film__dialogue-line grandma-film__dialogue-line--incoming" data-film-dialogue-line>
          <span class="grandma-film__dialogue-name">{sceneText("copy-20")}</span>
          <p>{sceneText("copy-21")}</p>
        </article>
        <article class="grandma-film__dialogue-line grandma-film__dialogue-line--outgoing" data-film-dialogue-line>
          <span class="grandma-film__dialogue-name">{sceneText("copy-22")}</span>
          <p>{sceneText("copy-23")}</p>
        </article>
        <article class="grandma-film__dialogue-line grandma-film__dialogue-line--incoming" data-film-dialogue-line>
          <span class="grandma-film__dialogue-name">{sceneText("copy-24")}</span>
          <p>{sceneText("copy-25")}</p>
        </article>
        <article class="grandma-film__dialogue-line grandma-film__dialogue-line--outgoing" data-film-dialogue-line>
          <span class="grandma-film__dialogue-name">{sceneText("copy-26")}</span>
          <p>{sceneText("copy-27")}</p>
        </article>
        <article class="grandma-film__dialogue-line grandma-film__dialogue-line--incoming" data-film-dialogue-line>
          <span class="grandma-film__dialogue-name">{sceneText("copy-28")}</span>
          <p>{sceneText("copy-29")}</p>
        </article>
        <article class="grandma-film__dialogue-line grandma-film__dialogue-line--outgoing" data-film-dialogue-line>
          <span class="grandma-film__dialogue-name">{sceneText("copy-30")}</span>
          <p>{sceneText("copy-31")}</p>
        </article>
        <article class="grandma-film__dialogue-line grandma-film__dialogue-line--incoming" data-film-dialogue-line>
          <span class="grandma-film__dialogue-name">{sceneText("copy-32")}</span>
          <p>{sceneText("copy-33")}</p>
        </article>
        <article class="grandma-film__dialogue-line grandma-film__dialogue-line--outgoing" data-film-dialogue-line>
          <span class="grandma-film__dialogue-name">{sceneText("copy-34")}</span>
          <p>{sceneText("copy-35")}</p>
        </article>
        <article class="grandma-film__dialogue-line grandma-film__dialogue-line--incoming" data-film-dialogue-line>
          <span class="grandma-film__dialogue-name">{sceneText("copy-36")}</span>
          <p>{sceneText("copy-37")}</p>
        </article>
        <article class="grandma-film__dialogue-line grandma-film__dialogue-line--outgoing" data-film-dialogue-line>
          <span class="grandma-film__dialogue-name">{sceneText("copy-38")}</span>
          <p>{sceneText("copy-39")}</p>
        </article>
      </div>
    </div>
  </section>

  <section class="grandma-film__prose grandma-film__prose--narrow" data-film-reveal>
    <p>{sceneText("copy-40")}</p>
    <p>{sceneText("copy-41")}</p>
    <p>{sceneText("copy-42")}</p>
  </section>

  <section class="grandma-film__quote" data-film-reveal>
    <p>{sceneText("copy-43")}</p>
    <span>{sceneText("copy-44")}</span>
  </section>

  <section class="grandma-film__chapter grandma-film__chapter--time">
    <h2 id="film-heading-97" data-film-reveal>{sceneText("copy-45")}</h2>
    <div class="grandma-film__prose grandma-film__prose--narrow">
      <p data-film-reveal>{sceneText("copy-46")}</p>
      <p class="grandma-film__paragraph-break" data-film-reveal>{sceneText("copy-47")}</p>
      <p data-film-reveal>{sceneText("copy-48")}</p>
      <p data-film-reveal>{sceneText("copy-49")}</p>
      <p data-film-reveal>{sceneText("copy-50")}</p>
      <p data-film-reveal>{sceneText("copy-51")}</p>
      <p data-film-reveal>{sceneText("copy-52")}</p>
      <p data-film-reveal>{sceneText("copy-53")}</p>
      <p data-film-reveal>{sceneText("copy-54")}</p>
      <blockquote data-film-reveal>{sceneText("copy-55")}</blockquote>
      <p data-film-reveal>{sceneText("copy-56")}</p>
      <p data-film-reveal>{sceneText("copy-57")}</p>
      <p data-film-reveal>{sceneText("copy-58")}</p>
    </div>
  </section>

  <section class="grandma-film__scene grandma-film__scene--desk" data-film-scene aria-label="文章场景">
      <h2 id="film-heading-98" class="grandma-film__toc-heading">{sceneText("copy-59")}</h2>
    <div class="grandma-film__sticky">
      <div class="grandma-film__image-pair" aria-hidden="true">
        <img class="grandma-film__image grandma-film__image--base" src={deskDay || undefined} alt="" />
        <img class="grandma-film__image grandma-film__image--dusk" src={deskDusk || undefined} alt="" />
        <img class="grandma-film__image grandma-film__image--top" src={deskNight || undefined} alt="" />
        <span class="grandma-film__desk-glow"></span>
      </div>
      <p class="grandma-film__scroll-hint" role="note"><span class="grandma-film__scroll-icon" aria-hidden="true"></span>缓慢滚动鼠标，播放动画</p>
      <div class="grandma-film__scene-copy grandma-film__scene-copy--desk" data-film-reveal>
        <p class="grandma-film__small-label">{sceneText("copy-60")}</p>
        <p class="grandma-film__line-emphasis">{sceneText("copy-61")}</p>
      </div>
    </div>
  </section>

  <section class="grandma-film__chapter grandma-film__chapter--startup">
    <h2 id="film-heading-99" data-film-reveal>{sceneText("copy-62")}</h2>
    <div class="grandma-film__prose grandma-film__prose--narrow">
      <p data-film-reveal>{sceneText("copy-63")}</p>
      <p data-film-reveal>{sceneText("copy-64")}</p>
      <p data-film-reveal>{sceneText("copy-65")}</p>
      <p data-film-reveal>{sceneText("copy-66")}</p>
      <p class="grandma-film__paragraph-break" data-film-reveal>{sceneText("copy-67")}</p>
      <p class="grandma-film__fear" data-film-reveal>{sceneText("copy-68")}</p>
      <p data-film-reveal>{sceneText("copy-69")}</p>
      <p data-film-reveal>{sceneText("copy-70")}</p>
      <p data-film-reveal>{sceneText("copy-71")}</p>
      <p data-film-reveal>{sceneText("copy-72")}</p>
    </div>
  </section>

  <section class="grandma-film__chapter grandma-film__chapter--truth">
    <h2 id="film-heading-100" data-film-reveal>{sceneText("copy-73")}</h2>
    <div class="grandma-film__prose grandma-film__prose--narrow">
      <p data-film-reveal>{sceneText("copy-74")}</p>
      <p data-film-reveal>{sceneText("copy-75")}</p>
      <p data-film-reveal>{sceneText("copy-76")}</p>
      <p data-film-reveal>{sceneText("copy-77")}</p>
      <p data-film-reveal>{sceneText("copy-78")}</p>
      <p data-film-reveal>{sceneText("copy-79")}</p>
      <p data-film-reveal>{sceneText("copy-80")}</p>
      <p class="grandma-film__line-emphasis" data-film-reveal>{sceneText("copy-81")}</p>
      <p data-film-reveal>{sceneText("copy-82")}</p>
      <p data-film-reveal>{sceneText("copy-83")}</p>
      <p data-film-reveal>{sceneText("copy-84")}</p>
      <p data-film-reveal>{sceneText("copy-85")}</p>
    </div>
  </section>

  <section class="grandma-film__scene grandma-film__scene--ending" data-film-scene aria-label="文章场景">
    <h2 id="film-heading-101" class="grandma-film__toc-heading">{sceneText("copy-86")}</h2>
    <div class="grandma-film__sticky">
      <div class="grandma-film__image-pair" aria-hidden="true">
        <img class="grandma-film__image grandma-film__image--base" src={balconySunset || undefined} alt="" />
        <img class="grandma-film__image grandma-film__image--top" src={balconyEmpty || undefined} alt="" />
        <span class="grandma-film__vignette"></span>
      </div>
      <p class="grandma-film__scroll-hint" role="note"><span class="grandma-film__scroll-icon" aria-hidden="true"></span>缓慢滚动鼠标，播放动画</p>
      <div class="grandma-film__ending-copy" aria-label="文章场景">
        <p data-ending-copy data-ending-start="0.06" data-ending-end="0.22">{sceneText("copy-87")}</p>
        <p data-ending-copy data-ending-start="0.19" data-ending-end="0.35">{sceneText("copy-88")}</p>
        <h2 data-ending-copy data-ending-start="0.32" data-ending-end="0.53">{sceneText("copy-89")}<br />{sceneText("copy-90")}</h2>
        <p data-ending-copy data-ending-start="0.5" data-ending-end="0.67">{sceneText("copy-91")}</p>
        <p data-ending-copy data-ending-start="0.63" data-ending-end="0.8">{sceneText("copy-92")}</p>
        <p data-ending-copy data-ending-start="0.76" data-ending-end="0.93">{sceneText("copy-93")}</p>
        <p class="grandma-film__last-line" data-ending-copy data-ending-start="0.89" data-ending-end="1">{sceneText("copy-94")}</p>
      </div>
    </div>
  </section>

  </div>

  <div id="grandma-film-plain" class="grandma-film__plain-content" hidden={!plainTextMode}>
    <slot name="plain" />
  </div>
</article>

<style>
  .grandma-film {
    --film-ink: color-mix(in oklab, var(--text-color) 95%, #513b2d);
    --film-muted: color-mix(in oklab, var(--text-color) 58%, #9a6c4a);
    --film-line: color-mix(in oklab, var(--line-divider) 78%, #c99967);
    --film-warm: #b46b36;
    --film-blue: #42617e;
    --film-paper: color-mix(in oklab, var(--card-bg) 92%, #fff7e9);
    --film-dialogue-bg: #fff;
    --film-dialogue-ink: #243128;
    --film-dialogue-name: rgba(39, 56, 43, 0.58);
    --film-dialogue-notice-bg: rgba(247, 250, 247, 0.82);
    --film-dialogue-notice-ink: rgba(44, 62, 49, 0.72);
    --film-dialogue-outgoing-bg: #95ec69;
    --film-dialogue-outgoing-ink: #243128;
    width: 100%;
    margin: 0 auto 4.5rem;
    color: var(--film-ink);
    overflow: visible;
  }

  :global(:root.dark) .grandma-film {
    --film-ink: color-mix(in oklab, var(--text-color) 96%, #f0c39a);
    --film-muted: color-mix(in oklab, var(--text-color) 62%, #d9a77e);
    --film-line: color-mix(in oklab, var(--line-divider) 68%, #c28e69);
    --film-warm: #e4a064;
    --film-blue: #8fc7ec;
    --film-paper: color-mix(in oklab, var(--card-bg) 90%, #503a2e);
    --film-dialogue-bg: color-mix(in oklab, var(--card-bg) 90%, #5b4839);
    --film-dialogue-ink: #f4e7d5;
    --film-dialogue-name: color-mix(in oklab, var(--film-ink) 66%, transparent);
    --film-dialogue-notice-bg: color-mix(in oklab, var(--card-bg) 88%, #31513c);
    --film-dialogue-notice-ink: #dcebdc;
    --film-dialogue-outgoing-bg: #3d8243;
    --film-dialogue-outgoing-ink: #eff9e9;
  }

  :global(#post-container:has(.grandma-film)),
  :global(.col-span-1:has(.grandma-film)),
  :global(.flex.w-full:has(.grandma-film)) {
    overflow: visible !important;
  }

  .grandma-film__scene {
    --film-progress: 0;
    position: relative;
    min-height: 155vh;
    margin-inline: 0;
    width: 100%;
  }

  .grandma-film__toc-heading {
    position: absolute;
    width: 1px;
    height: 1px;
    margin: -1px;
    padding: 0;
    overflow: hidden;
    border: 0;
    clip: rect(0 0 0 0);
    white-space: nowrap;
  }

  .grandma-film__toc-heading--flow-anchor {
    position: relative;
    width: 1px;
    height: 1px;
    margin: 0;
    overflow: hidden;
  }

  .grandma-film__toc-heading--scene-anchor {
    top: 0;
    left: 0;
  }

  .grandma-film__scene--balcony {
    min-height: 1150vh;
    --dialogue-ellipsis: 0;
  }

  .grandma-film__scene--desk {
    min-height: 300vh;
    background: transparent;
    color: #f6e3c6;
  }

  .grandma-film__scene--ending {
    min-height: 235vh;
    color: #fff8e9;
  }

  .grandma-film__sticky {
    position: sticky;
    top: max(5.5rem, calc(5rem + (100vh - 5rem - min(76vh, 48rem)) / 2));
    height: min(76vh, 48rem);
    min-height: 30rem;
    isolation: isolate;
  }

  .grandma-film__scroll-hint {
    position: absolute;
    z-index: 5;
    right: 0;
    bottom: clamp(0.75rem, 2.5vh, 1.4rem);
    left: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.85rem;
    margin: 0;
    color: rgba(255, 248, 233, 0.92);
    font-size: clamp(0.95rem, 1.35vw, 1.18rem);
    font-weight: 800;
    letter-spacing: 0.1em;
    line-height: 1.4;
    text-shadow: 0 0.12rem 0.75rem rgba(0, 0, 0, 0.58);
    opacity: clamp(0, calc((1 - var(--film-progress)) * 4), 1);
    transform: translate3d(0, calc(var(--film-progress) * 0.5rem), 0);
    transition: opacity 320ms ease, transform 520ms cubic-bezier(0.16, 1, 0.3, 1);
    white-space: nowrap;
    pointer-events: none;
  }

  .grandma-film__scroll-hint::before,
  .grandma-film__scroll-hint::after {
    width: clamp(1.6rem, 5vw, 3.2rem);
    height: 2px;
    background: currentColor;
    content: "";
    opacity: 0.58;
  }

  .grandma-film__scroll-icon {
    position: relative;
    display: inline-block;
    width: 1.12rem;
    height: 1.62rem;
    border: 2px solid currentColor;
    border-radius: 0.72rem;
    box-shadow: 0 0 0.8rem rgba(255, 248, 233, 0.2);
    flex: 0 0 auto;
  }

  .grandma-film__scroll-icon::before {
    position: absolute;
    top: 0.28rem;
    left: 50%;
    width: 0.18rem;
    height: 0.42rem;
    border-radius: 999px;
    background: currentColor;
    content: "";
    transform: translateX(-50%);
    animation: grandma-film-scroll-wheel 1.45s ease-in-out infinite;
  }

  @keyframes grandma-film-scroll-wheel {
    0%,
    100% {
      opacity: 0.45;
      transform: translate(-50%, 0);
    }

    50% {
      opacity: 1;
      transform: translate(-50%, 0.26rem);
    }
  }

  .grandma-film__image-pair {
    position: absolute;
    inset: 0;
    overflow: hidden;
    background: #3d302b;
    border-radius: 1rem;
  }

  .grandma-film__image-pair--memory {
    z-index: 1;
    opacity: var(--memory-pair-opacity, clamp(0, calc((var(--film-progress) - 0.6) * 7.15), 1));
    transition: opacity 260ms cubic-bezier(0.16, 1, 0.3, 1);
  }

  .grandma-film__image {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: center;
    transform: scale(calc(1.04 - var(--film-progress) * 0.035));
    filter: saturate(calc(0.94 + var(--film-progress) * 0.1)) contrast(calc(0.96 + var(--film-progress) * 0.08));
    transition: opacity 420ms ease;
  }

  .grandma-film__image--base {
    opacity: 1;
  }

  .grandma-film__image--approaching {
    opacity: clamp(0, min(calc((var(--film-progress) - 0.11) * 11), calc((0.32 - var(--film-progress)) * 11)), 1);
  }

  .grandma-film__image--together {
    opacity: clamp(0, calc((var(--film-progress) - 0.27) * 10), 1);
  }

  .grandma-film__image--sunset {
    opacity: var(--sunset-frame-opacity, clamp(0, calc((var(--film-progress) - 0.78) * 4.55), 1));
  }

  .grandma-film__scene--desk .grandma-film__image--dusk {
    opacity: var(--desk-dusk-opacity, 0);
  }

  .grandma-film__scene--desk .grandma-film__image--dusk,
  .grandma-film__scene--desk .grandma-film__image--top {
    transition: opacity 560ms cubic-bezier(0.16, 1, 0.3, 1);
  }

  .grandma-film__scene--desk .grandma-film__image--top {
    opacity: var(--desk-night-opacity, 0);
  }

  .grandma-film__scene--ending .grandma-film__image--base {
    opacity: calc(1 - var(--ending-empty-opacity, 0));
    transform: scale(calc(1.04 - var(--film-progress) * 0.014));
    filter: saturate(calc(1.06 - var(--film-progress) * 0.56)) brightness(calc(1.03 - var(--film-progress) * 0.22));
    transition: opacity 700ms cubic-bezier(0.16, 1, 0.3, 1), filter 900ms ease, transform 1200ms cubic-bezier(0.16, 1, 0.3, 1);
  }

  .grandma-film__scene--ending .grandma-film__image--top {
    opacity: var(--ending-empty-opacity, 0);
    transform: scale(calc(1.025 - var(--film-progress) * 0.01));
    filter: saturate(calc(0.68 + var(--film-progress) * 0.12)) brightness(calc(0.86 + var(--film-progress) * 0.1));
    transition: opacity 700ms cubic-bezier(0.16, 1, 0.3, 1), filter 900ms ease, transform 1200ms cubic-bezier(0.16, 1, 0.3, 1);
  }

  .grandma-film__image--memory-base {
    opacity: 1;
  }

  .grandma-film__image--memory-mid {
    opacity: calc(var(--memory-mid-opacity, clamp(0, calc((var(--film-progress) - 0.73) * 7.7), 1)) * 0.82);
    filter: saturate(1.02) contrast(1.02);
  }

  .grandma-film__image--memory-final {
    opacity: var(--memory-final-opacity, clamp(0, calc((var(--film-progress) - 0.86) * 7.15), 1));
    filter: saturate(1.02) contrast(1.02);
  }

  .grandma-film__sun-haze,
  .grandma-film__light-sweep,
  .grandma-film__hair-glow,
  .grandma-film__desk-glow,
  .grandma-film__vignette {
    position: absolute;
    inset: 0;
    pointer-events: none;
  }

  .grandma-film__sun-haze {
    background: radial-gradient(circle at 74% 26%, rgba(255, 244, 194, 0.36), transparent 27%);
    opacity: calc(0.24 + var(--film-progress) * 0.42);
    mix-blend-mode: screen;
  }

  .grandma-film__light-sweep {
    inset: -20% -30%;
    background: linear-gradient(112deg, transparent 32%, rgba(255, 232, 170, 0.2) 47%, transparent 60%);
    transform: translateX(calc((var(--film-progress) - 0.5) * 32%));
    opacity: 0.8;
  }

  .grandma-film__hair-glow {
    background: radial-gradient(ellipse at 35% 38%, rgba(255, 224, 165, 0.24), transparent 33%);
    opacity: var(--hair-glow-opacity, 0);
    mix-blend-mode: screen;
  }

  .grandma-film__desk-glow {
    background: radial-gradient(ellipse at 50% 58%, rgba(80, 156, 255, 0.22), transparent 38%);
    opacity: calc(var(--film-progress) * 0.82);
    mix-blend-mode: screen;
  }

  .grandma-film__vignette {
    background: linear-gradient(180deg, rgba(19, 18, 18, 0.06), rgba(19, 18, 18, 0.48));
  }

  .grandma-film__scene--ending .grandma-film__vignette {
    opacity: calc(0.12 + var(--film-progress) * 0.42);
    transition: opacity 700ms ease;
  }

  .grandma-film__scene-copy,
  .grandma-film__ending-copy {
    position: absolute;
    z-index: 2;
    max-width: 42rem;
    padding: clamp(1.5rem, 4vw, 4rem);
    color: #fff8e9;
    text-shadow: 0 0.18rem 1.2rem rgba(0, 0, 0, 0.42);
  }

  .grandma-film__scene-copy {
    left: clamp(1.2rem, 7vw, 9rem);
    bottom: clamp(1.2rem, 8vh, 6rem);
    max-width: min(36rem, 72vw);
  }

  .grandma-film__scene-copy--balcony {
    z-index: 3;
    max-width: min(34rem, 68vw);
    opacity: var(--balcony-copy-opacity, 1);
    transform: translate3d(0, var(--balcony-copy-y, 0rem), 0);
    transition: opacity 260ms ease, transform 420ms cubic-bezier(0.16, 1, 0.3, 1);
  }

  .grandma-film__scene-copy--hair-transition {
    z-index: 3;
    max-width: min(35rem, 78vw);
    opacity: var(--hair-copy-opacity, clamp(0, calc((var(--film-progress) - 0.7) * 3.34), 1));
    transform: translate3d(0, var(--hair-copy-y, 1.1rem), 0);
    pointer-events: none;
    transition: opacity 320ms ease, transform 520ms cubic-bezier(0.16, 1, 0.3, 1);
  }

  .grandma-film__scene-copy--desk {
    opacity: var(--desk-copy-opacity, 1);
    transform: translate3d(0, var(--desk-copy-y, 0rem), 0);
    transition: opacity 320ms ease, transform 520ms cubic-bezier(0.16, 1, 0.3, 1);
  }

  .grandma-film__ending-copy {
    inset: 0;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    max-width: none;
    overflow: hidden;
    text-align: center;
    gap: clamp(0.05rem, 0.45vh, 0.3rem);
  }

  .grandma-film__ending-copy > [data-ending-copy] {
    position: static;
    width: auto;
    margin: 0;
    opacity: var(--ending-copy-opacity, 1);
    transform: translate3d(0, var(--ending-copy-y, 0rem), 0) scale(var(--ending-copy-scale, 1));
    filter: blur(var(--ending-copy-blur, 0rem));
    transition: opacity 380ms linear, transform 520ms cubic-bezier(0.16, 1, 0.3, 1), filter 520ms ease;
  }

  .grandma-film__ending-copy h2 {
    margin: 0.1rem 0 0.35rem;
    color: inherit;
    font-size: clamp(1.75rem, 4.2vh, 4rem);
    font-weight: 800;
    letter-spacing: -0.055em;
    line-height: 1;
  }

  .grandma-film__ending-copy > p {
    max-width: min(34rem, 100%);
    margin: 0;
    font-size: clamp(0.78rem, 1.55vh, 1.12rem);
    line-height: 1.56;
  }

  .grandma-film__small-label,
  .grandma-film__scroll-note {
    color: currentColor;
    font-size: 0.72rem;
    font-weight: 700;
    letter-spacing: 0.15em;
    text-transform: uppercase;
  }

  .grandma-film__scroll-note {
    display: inline-block;
    margin-top: 2rem;
    padding-top: 0.85rem;
    border-top: 1px solid rgba(255, 247, 224, 0.5);
    letter-spacing: 0.08em;
  }

  .grandma-film__prose,
  .grandma-film__chapter,
  .grandma-film__quote {
    width: min(100%, 74ch);
    margin-inline: auto;
  }

  .grandma-film__desktop-note {
    display: flex;
    align-items: center;
    gap: 0.85rem;
    width: min(calc(100% - 2rem), 58rem);
    margin: 0 auto;
    padding: 0.9rem 1.15rem;
    border: 1px solid color-mix(in oklab, var(--film-blue) 24%, var(--film-line));
    border-radius: 0.9rem;
    background: linear-gradient(120deg, color-mix(in oklab, var(--film-paper) 90%, #dcefff), var(--film-paper));
    box-shadow: 0 0.7rem 1.8rem rgba(66, 97, 126, 0.08);
    color: var(--film-ink);
  }

  :global(:root.dark) .grandma-film__desktop-note {
    background: linear-gradient(
      120deg,
      color-mix(in oklab, var(--film-paper) 88%, #2a4355),
      var(--film-paper)
    );
    box-shadow: 0 0.7rem 1.8rem rgba(0, 0, 0, 0.22);
  }

  .grandma-film__desktop-note::before {
    flex: 0 0 auto;
    width: 0.55rem;
    height: 0.55rem;
    border-radius: 50%;
    background: var(--film-blue);
    box-shadow: 0 0 0 0.3rem color-mix(in srgb, var(--film-blue) 13%, transparent);
    content: "";
  }

  .grandma-film__desktop-note-label {
    flex: 0 0 auto;
    color: var(--film-blue);
    font-size: 0.78rem;
    font-weight: 800;
    letter-spacing: 0.08em;
    white-space: nowrap;
  }

  .grandma-film__desktop-note p {
    margin: 0;
    color: var(--film-muted);
    font-size: clamp(0.9rem, 1.4vw, 1rem);
    line-height: 1.7;
  }

  .grandma-film__mode-switcher {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.45rem;
    margin: 1rem auto 0;
    text-align: center;
  }

  .grandma-film__mode-button {
    min-height: 2.75rem;
    padding: 0.62rem 1.25rem;
    border: 1px solid color-mix(in oklab, var(--film-blue) 30%, var(--film-line));
    border-radius: 0.85rem;
    background: var(--film-paper);
    box-shadow: 0 0.55rem 1.4rem rgba(66, 97, 126, 0.1);
    color: var(--film-blue);
    cursor: pointer;
    font: inherit;
    font-size: 0.95rem;
    font-weight: 800;
    line-height: 1.35;
    transition: background-color 180ms ease, border-color 180ms ease, box-shadow 180ms ease, transform 180ms ease;
  }

  .grandma-film__mode-button:hover {
    border-color: color-mix(in oklab, var(--film-blue) 52%, var(--film-line));
    background: color-mix(in oklab, var(--film-paper) 82%, #dcefff);
    box-shadow: 0 0.75rem 1.7rem rgba(66, 97, 126, 0.14);
    transform: translateY(-1px);
  }

  :global(:root.dark) .grandma-film__mode-button:hover {
    background: color-mix(in oklab, var(--film-paper) 82%, #2a4355);
    box-shadow: 0 0.75rem 1.7rem rgba(0, 0, 0, 0.28);
  }

  .grandma-film__mode-button:focus-visible {
    outline: 3px solid color-mix(in srgb, var(--film-blue) 32%, transparent);
    outline-offset: 3px;
  }

  .grandma-film__mode-button:active {
    transform: translateY(1px);
  }

  .grandma-film__mode-switcher p {
    margin: 0;
    color: var(--film-muted);
    font-size: 0.78rem;
    line-height: 1.55;
  }

  .grandma-film__prose--opening {
    padding: clamp(4rem, 10vw, 9rem) 0 clamp(3rem, 8vw, 7rem);
    font-size: clamp(1.05rem, 1.7vw, 1.28rem);
    line-height: 1.95;
  }

  .grandma-film__prose--narrow {
    max-width: 65ch;
    padding-block: 1rem;
  }

  .grandma-film__prose p {
    margin: 1.2rem 0;
  }

  .grandma-film__chapter {
    padding-block: clamp(4rem, 9vw, 9rem);
    scroll-margin-top: 6rem;
  }

  .grandma-film__chapter h2 {
    margin: 0 0 1.5rem;
    color: inherit;
    font-size: clamp(1.8rem, 4vw, 3.8rem);
    font-weight: 800;
    letter-spacing: -0.045em;
    line-height: 1.12;
  }

  .grandma-film__chapter h2[id],
  .grandma-film__toc-heading[id] {
    scroll-margin-top: 7.5rem;
  }

  .grandma-film__chapter--arrival,
  .grandma-film__chapter--time,
  .grandma-film__chapter--startup,
  .grandma-film__chapter--truth {
    border-top: 1px solid var(--film-line);
  }

  .grandma-film__date-track {
    position: relative;
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1rem;
    margin: 3rem 0 1rem;
    padding-top: 1.25rem;
    border-top: 1px solid var(--film-line);
  }

  .grandma-film__date-track::before {
    position: absolute;
    top: -0.22rem;
    left: 0;
    width: 0.42rem;
    height: 0.42rem;
    border-radius: 50%;
    background: var(--film-warm);
    box-shadow: 0 0 0 0.34rem color-mix(in srgb, var(--film-warm) 15%, transparent);
    content: "";
  }

  .grandma-film__date-item {
    display: grid;
    gap: 0.5rem;
    min-height: 4rem;
  }

  .grandma-film__date-item time {
    color: var(--film-warm);
    font-size: 1.1rem;
    font-weight: 800;
    letter-spacing: 0.04em;
  }

  .grandma-film__date-item span {
    color: var(--film-muted);
    font-size: 0.94rem;
  }

  .grandma-film__dialogue {
    position: absolute;
    z-index: 4;
    top: clamp(0.75rem, 2vh, 1.5rem);
    right: clamp(1rem, 5vw, 6rem);
    left: clamp(1rem, 5vw, 6rem);
    width: auto;
    min-height: 11rem;
    color: var(--film-ink);
    text-shadow: none;
  }

  .grandma-film__dialogue-notice {
    position: absolute;
    top: 0.2rem;
    left: 0;
    display: block;
    margin: 0;
    width: fit-content;
    padding: 0.32rem 0.65rem;
    border-radius: 999px;
    background: var(--film-dialogue-notice-bg);
    box-shadow: 0 0.35rem 1.1rem rgba(30, 50, 35, 0.14);
    color: var(--film-dialogue-notice-ink);
    font-size: 0.72rem;
    font-weight: 700;
    letter-spacing: 0.13em;
  }

  .grandma-film__dialogue-line {
    position: absolute;
    inset: 2.2rem 0 auto;
    width: fit-content;
    max-width: 88%;
    min-height: 0;
    padding: 0.72rem 0.92rem 0.78rem;
    border: 0;
    border-radius: 0.35rem;
    background: var(--film-dialogue-bg);
    box-shadow: 0 0.45rem 1.25rem rgba(21, 40, 28, 0.18);
    color: var(--film-dialogue-ink);
    backdrop-filter: blur(0.25rem);
    opacity: var(--dialogue-opacity, 0);
    transform: translate3d(0, var(--dialogue-y, 1.2rem), 0);
    transition: opacity 180ms linear, transform 180ms cubic-bezier(0.16, 1, 0.3, 1);
  }

  .grandma-film__dialogue-line--outgoing {
    left: auto;
    right: 0;
    border-color: transparent;
    background: var(--film-dialogue-outgoing-bg);
    color: var(--film-dialogue-outgoing-ink);
    text-align: left;
  }

  .grandma-film__dialogue-name {
    display: block;
    margin-bottom: 0.26rem;
    color: var(--film-dialogue-name);
    font-size: 0.68rem;
    font-weight: 700;
    letter-spacing: 0.1em;
  }

  .grandma-film__dialogue-line p {
    margin: 0;
    font-size: clamp(0.94rem, 1.35vw, 1.08rem);
    line-height: 1.65;
  }

  .grandma-film__dialogue-ellipsis {
    position: absolute;
    inset: 3.05rem 0 auto;
    margin: 0;
    color: #f7fff5;
    font-size: clamp(2rem, 4vw, 3.5rem);
    font-weight: 800;
    letter-spacing: 0.16em;
    opacity: var(--dialogue-ellipsis, 0);
    text-align: center;
    text-shadow: 0 0.18rem 0.8rem rgba(27, 55, 34, 0.34);
    transform: translateY(calc((1 - var(--dialogue-ellipsis, 0)) * 0.8rem));
    transition: opacity 220ms ease, transform 220ms ease;
  }

  .grandma-film__quote {
    padding-block: clamp(5rem, 14vw, 13rem);
    text-align: center;
  }

  .grandma-film__quote p {
    margin: 0;
    color: var(--film-warm);
    font-size: clamp(2rem, 5vw, 4.8rem);
    font-weight: 800;
    letter-spacing: -0.05em;
    line-height: 1.1;
  }

  .grandma-film__quote span {
    display: block;
    margin-top: 1.25rem;
    color: var(--film-muted);
    font-size: clamp(0.95rem, 1.7vw, 1.2rem);
  }

  .grandma-film__paragraph-break {
    margin-block: 3.5rem !important;
    color: var(--film-warm);
    font-size: clamp(1.3rem, 2.5vw, 2rem);
    font-weight: 750;
  }

  .grandma-film__prose blockquote {
    margin: 3rem 0;
    padding: 1.25rem 0 1.25rem 1.5rem;
    border-left: 1px solid var(--film-warm);
    color: var(--film-warm);
    font-size: clamp(1.25rem, 2.4vw, 1.8rem);
    line-height: 1.65;
  }

  .grandma-film__line-emphasis {
    margin-block: 2rem !important;
    color: inherit;
    font-size: clamp(1.35rem, 2.8vw, 2.2rem);
    font-weight: 750;
    letter-spacing: -0.025em;
    line-height: 1.45;
  }

  .grandma-film__fear {
    margin-block: 4.5rem !important;
    color: var(--film-warm);
    font-size: clamp(3.3rem, 12vw, 9rem);
    font-weight: 850;
    letter-spacing: -0.08em;
    line-height: 0.92;
  }

  .grandma-film__last-line {
    margin-top: clamp(0.8rem, 1.4vh, 1.4rem) !important;
    color: #f7dca9;
    font-size: clamp(1rem, 2.35vh, 1.6rem) !important;
    font-weight: 750;
    line-height: 1.4 !important;
  }

  [data-film-reveal] {
    opacity: 1;
    transform: none;
    transition: opacity 800ms cubic-bezier(0.16, 1, 0.3, 1), transform 800ms cubic-bezier(0.16, 1, 0.3, 1), filter 800ms cubic-bezier(0.16, 1, 0.3, 1);
  }

  :global(.grandma-film[data-film-ready]) .grandma-film__scene-copy--balcony {
    opacity: var(--balcony-copy-opacity, 1);
    transform: translate3d(0, var(--balcony-copy-y, 0rem), 0);
  }

  :global(.grandma-film[data-film-ready] [data-film-reveal]:not(.is-visible)) {
    opacity: 0;
    filter: blur(0.35rem);
    transform: translate3d(0, 1.1rem, 0);
  }

  @media (max-width: 767px) {
    .grandma-film__interactive {
      display: none !important;
    }

    .grandma-film__plain-content {
      display: block !important;
    }

    .grandma-film__desktop-note {
      align-items: flex-start;
      gap: 0.7rem;
      width: calc(100% - 1rem);
      padding: 0.85rem 0.95rem;
    }

    .grandma-film__desktop-note-label {
      padding-top: 0.12rem;
    }

    .grandma-film__scene {
      min-height: 135vh;
      margin-inline: 0;
    }

    .grandma-film__scene--balcony {
      min-height: 920vh;
    }

    .grandma-film__scene--desk {
      min-height: 260vh;
    }

    .grandma-film__scene--ending {
      min-height: 215vh;
    }

    .grandma-film__sticky {
      top: max(4.2rem, calc(4.2rem + (100vh - 4.2rem - max(69vh, 31rem)) / 2));
      height: 69vh;
      min-height: 31rem;
    }

    .grandma-film__scroll-hint {
      display: none;
    }

    .grandma-film__image {
      object-position: 58% center;
    }

    .grandma-film__scene-copy,
    .grandma-film__ending-copy {
      padding: 1.2rem;
    }

    .grandma-film__scene-copy {
      right: 0;
      bottom: 1.2rem;
      max-width: none;
    }

    .grandma-film__ending-copy h2 {
      font-size: clamp(1.8rem, 7.5vw, 2.8rem);
    }

    .grandma-film__prose,
    .grandma-film__chapter,
    .grandma-film__quote {
      width: 100%;
    }

    .grandma-film__prose--opening,
    .grandma-film__chapter,
    .grandma-film__quote {
      padding-inline: 0;
    }

    .grandma-film__date-track {
      grid-template-columns: 1fr;
      gap: 1.2rem;
      padding-left: 1.1rem;
      border-top: 0;
      border-left: 1px solid var(--film-line);
    }

    .grandma-film__date-track::before {
      top: 0;
      left: -0.22rem;
    }

    .grandma-film__dialogue {
      top: clamp(0.65rem, 2.5vh, 1.25rem);
      left: 0.9rem;
      right: 0.9rem;
      width: auto;
      min-height: 10.2rem;
    }

    .grandma-film__dialogue-line {
      min-height: 4.2rem;
      padding: 0.75rem 0.8rem 0.85rem;
    }

    .grandma-film__quote p {
      font-size: clamp(2rem, 10vw, 3.4rem);
    }

    .grandma-film__chapter h2[id],
    .grandma-film__toc-heading[id] {
      scroll-margin-top: 5.75rem;
    }
  }

  .grandma-film__mode-feedback {
    margin: 0.1rem 0 0;
    color: var(--film-warm);
    font-size: 0.82rem;
    line-height: 1.55;
  }

  @media (prefers-reduced-motion: reduce) {
    .grandma-film__scroll-hint {
      display: none;
    }

    [data-film-reveal],
    :global(.grandma-film[data-film-ready] [data-film-reveal]:not(.is-visible)) {
      opacity: 1 !important;
      filter: none !important;
      transform: none !important;
      transition: none !important;
    }

    .grandma-film__dialogue {
      position: absolute;
    }

    .grandma-film__dialogue-line {
      position: static;
      min-height: 0;
      margin-top: 0.6rem;
      opacity: 1 !important;
      transform: none !important;
      transition: none !important;
    }

    .grandma-film__dialogue-ellipsis {
      position: static;
      opacity: 1 !important;
      transform: none !important;
    }

    .grandma-film__ending-copy > [data-ending-copy] {
      position: static;
      width: auto;
      margin: 0.6rem 0;
      opacity: 1 !important;
      filter: none !important;
      transform: none !important;
      transition: none !important;
    }
  }

  .grandma-film--plain .grandma-film__image-pair,
  .grandma-film--plain .grandma-film__scroll-hint,
  .grandma-film--plain .grandma-film__sun-haze,
  .grandma-film--plain .grandma-film__light-sweep,
  .grandma-film--plain .grandma-film__hair-glow,
  .grandma-film--plain .grandma-film__desk-glow,
  .grandma-film--plain .grandma-film__vignette {
    display: none;
  }

  .grandma-film--plain [data-film-reveal] {
    opacity: 1 !important;
    filter: none !important;
    transform: none !important;
    transition: none !important;
  }

  .grandma-film--plain .grandma-film__scene {
    min-height: 0;
    margin-block: 0;
  }

  .grandma-film--plain .grandma-film__prose--opening {
    padding-top: 2rem;
    padding-bottom: 3rem;
  }

  .grandma-film--plain .grandma-film__scene--desk,
  .grandma-film--plain .grandma-film__scene--ending {
    color: var(--film-ink);
  }

  .grandma-film--plain .grandma-film__sticky {
    position: static;
    height: auto;
    min-height: 0;
  }

  .grandma-film--plain .grandma-film__scene-copy,
  .grandma-film--plain .grandma-film__ending-copy {
    position: static;
    display: block;
    width: min(100%, 65ch);
    max-width: 65ch;
    margin: 0 auto;
    padding: 1rem 0;
    overflow: visible;
    color: var(--film-ink);
    text-shadow: none;
    opacity: 1 !important;
    transform: none !important;
    filter: none !important;
    transition: none !important;
  }

  .grandma-film--plain .grandma-film__scene-copy p,
  .grandma-film--plain .grandma-film__ending-copy p {
    margin: 1.2rem 0;
    font-size: 1rem;
    line-height: 1.95;
  }

  .grandma-film--plain .grandma-film__scene-copy--hair-transition {
    pointer-events: auto;
  }

  .grandma-film--plain .grandma-film__dialogue {
    position: static;
    width: min(100%, 65ch);
    min-height: 0;
    margin: 1rem auto 2rem;
    color: var(--film-ink);
    text-shadow: none;
  }

  .grandma-film--plain .grandma-film__dialogue-notice {
    position: static;
    display: block;
    margin: 0 0 1rem;
    padding: 0;
    background: transparent;
    box-shadow: none;
    color: var(--film-muted);
    font-size: 0.78rem;
  }

  .grandma-film--plain .grandma-film__dialogue-line {
    position: static;
    display: grid;
    grid-template-columns: 3rem minmax(0, 1fr);
    gap: 0.8rem;
    width: auto;
    max-width: none;
    min-height: 0;
    margin: 0;
    padding: 0.8rem 0;
    border: 0;
    border-bottom: 1px solid var(--film-line);
    border-radius: 0;
    background: transparent;
    box-shadow: none;
    color: var(--film-ink);
    opacity: 1 !important;
    transform: none !important;
    filter: none !important;
    transition: none !important;
  }

  .grandma-film--plain .grandma-film__dialogue-line--outgoing {
    background: transparent;
    text-align: left;
  }

  .grandma-film--plain .grandma-film__dialogue-name {
    margin: 0;
    padding-top: 0.1rem;
    color: var(--film-blue);
    font-size: 0.78rem;
  }

  .grandma-film--plain .grandma-film__dialogue-line p {
    margin: 0;
    font-size: 1rem;
    line-height: 1.75;
  }

  .grandma-film--plain .grandma-film__toc-heading {
    position: static;
    width: min(100%, 65ch);
    height: auto;
    margin: clamp(2.5rem, 6vw, 4.5rem) auto 1.5rem;
    padding: 0;
    overflow: visible;
    border: 0;
    clip: auto;
    color: var(--film-ink);
    font-size: clamp(1.8rem, 4vw, 3.8rem);
    font-weight: 800;
    letter-spacing: -0.045em;
    line-height: 1.12;
    white-space: normal;
  }

  .grandma-film--plain .grandma-film__ending-copy > [data-ending-copy] {
    position: static;
    width: auto;
    margin: 1.2rem 0;
    opacity: 1 !important;
    filter: none !important;
    transform: none !important;
    transition: none !important;
  }

  .grandma-film--plain .grandma-film__ending-copy h2 {
    color: var(--film-warm);
  }

  .grandma-film--plain .grandma-film__last-line {
    color: var(--film-warm);
  }
</style>
