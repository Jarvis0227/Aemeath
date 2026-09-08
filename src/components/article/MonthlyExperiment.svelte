<script lang="ts">
  import { onMount } from "svelte";

  export let coverSrc = "";

  export type MonthlyMomentItem = {
    friendTitle: string;
    avatar: string;
    title: string;
    link: string;
    description: string;
    publishedAt: string | null;
    role: "own" | "recommended" | null;
  };

  export let momentItems: MonthlyMomentItem[] = [];

  type Particle = {
    x: number;
    y: number;
    targetX: number;
    targetY: number;
    vx: number;
    vy: number;
    radius: number;
    color: string;
    phase: number;
  };

  const particleText = "这期，想让文字动起来";
  const proximityText = "鼠标靠近一点，字也会有反应";
  const proximityCharacters = Array.from(proximityText);

  let particleHost: HTMLDivElement;
  let particleCanvas: HTMLCanvasElement;
  let maskHeading: HTMLHeadingElement;
  let expandHost: HTMLDivElement;
  let expandMedia: HTMLDivElement;
  let expandImage: HTMLImageElement;
  let proximityHost: HTMLParagraphElement;
  let particleReady = false;
  let maskEnhanced = false;
  let maskActive = false;
  let expandProgress = 0;

  onMount(() => {
    if (!particleHost || !particleCanvas) return;

    const context = particleCanvas.getContext("2d");
    if (!context) return;

    const cleanups: Array<() => void> = [];
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    let reducedMotion = motionQuery.matches;
    let destroyed = false;
    let particles: Particle[] = [];
    let canvasWidth = 0;
    let canvasHeight = 0;
    let animationFrame = 0;
    let resizeFrame = 0;
    let scrollFrame = 0;
    let expandAnimationFrame = 0;
    let lastExpandTimestamp = 0;
    let targetExpandProgress = 0;
    let proximityFrame = 0;
    let particleVisible = true;
    let pageVisible = !document.hidden;
    let touchTimer = 0;
    let maskTimer = 0;
    let dateReplayFrame = 0;
    let lastPointerX = 0;
    let lastPointerY = 0;
    let revealScrollY = window.scrollY;
    let revealScrollTime = performance.now();
    let revealScrollSpeed = 0;

    const pointer = {
      active: false,
      x: 0,
      y: 0,
    };

    const clamp = (value: number, min: number, max: number) =>
      Math.min(Math.max(value, min), max);

    const requestParticleLoop = () => {
      if (
        animationFrame ||
        reducedMotion ||
        !particleVisible ||
        !pageVisible ||
        !particles.length
      ) {
        return;
      }
      animationFrame = window.requestAnimationFrame(drawParticles);
    };

    const drawParticles = (time: number) => {
      animationFrame = 0;
      if (reducedMotion || !particleVisible || !pageVisible || destroyed) return;

      context.clearRect(0, 0, canvasWidth, canvasHeight);

      for (const particle of particles) {
        const driftX = Math.sin(time * 0.0011 + particle.phase) * 0.18;
        const driftY = Math.cos(time * 0.0009 + particle.phase) * 0.14;
        particle.vx += (particle.targetX + driftX - particle.x) * 0.025;
        particle.vy += (particle.targetY + driftY - particle.y) * 0.025;

        if (pointer.active) {
          const dx = particle.x - pointer.x;
          const dy = particle.y - pointer.y;
          const distance = Math.hypot(dx, dy) || 1;
          const radius = canvasWidth < 520 ? 72 : 104;
          if (distance < radius) {
            const force = (1 - distance / radius) * 2.5;
            particle.vx += (dx / distance) * force;
            particle.vy += (dy / distance) * force;
          }
        }

        particle.vx *= 0.86;
        particle.vy *= 0.86;
        particle.x += particle.vx;
        particle.y += particle.vy;

        context.fillStyle = particle.color;
        context.beginPath();
        context.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
        context.fill();
      }

      animationFrame = window.requestAnimationFrame(drawParticles);
    };

    const buildParticles = async () => {
      const buildWidth = Math.max(280, particleHost.clientWidth);
      if (!buildWidth) return;

      try {
        await document.fonts?.ready;
      } catch {
        // The system font is still a valid fallback.
      }
      if (destroyed) return;

      const hostStyle = window.getComputedStyle(particleHost);
      const fontFamily = hostStyle.fontFamily || "sans-serif";
      let fontSize = clamp(buildWidth * 0.1, 31, 66);
      const scratch = document.createElement("canvas");
      const scratchContext = scratch.getContext("2d", { willReadFrequently: true });
      if (!scratchContext) return;

      scratchContext.font = `800 ${fontSize}px ${fontFamily}`;
      while (
        scratchContext.measureText(particleText).width > buildWidth * 0.94 &&
        fontSize > 25
      ) {
        fontSize -= 1;
        scratchContext.font = `800 ${fontSize}px ${fontFamily}`;
      }

      canvasWidth = buildWidth;
      canvasHeight = clamp(fontSize * 2.45, 118, 174);
      particleHost.style.setProperty("--particle-height", `${canvasHeight}px`);

      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      particleCanvas.width = Math.round(canvasWidth * dpr);
      particleCanvas.height = Math.round(canvasHeight * dpr);
      particleCanvas.style.width = `${canvasWidth}px`;
      particleCanvas.style.height = `${canvasHeight}px`;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);

      scratch.width = Math.ceil(canvasWidth);
      scratch.height = Math.ceil(canvasHeight);
      scratchContext.clearRect(0, 0, canvasWidth, canvasHeight);
      scratchContext.fillStyle = "#000";
      scratchContext.font = `800 ${fontSize}px ${fontFamily}`;
      scratchContext.textAlign = "center";
      scratchContext.textBaseline = "middle";
      scratchContext.fillText(particleText, canvasWidth / 2, canvasHeight / 2);

      const pixels = scratchContext.getImageData(
        0,
        0,
        Math.ceil(canvasWidth),
        Math.ceil(canvasHeight),
      ).data;
      let density = canvasWidth < 520 ? 5 : 4;
      const sampled: Array<{ x: number; y: number }> = [];

      const sample = () => {
        sampled.length = 0;
        for (let y = 0; y < canvasHeight; y += density) {
          for (let x = 0; x < canvasWidth; x += density) {
            const alpha = pixels[(Math.floor(y) * Math.ceil(canvasWidth) + Math.floor(x)) * 4 + 3];
            if (alpha > 150) sampled.push({ x, y });
          }
        }
      };

      sample();
      const limit = canvasWidth < 520 ? 900 : 1450;
      while (sampled.length > limit) {
        density += 1;
        sample();
      }

      const palette = ["#5aaee9", "#8974c8", "#e99ab3", "#5579bb"];
      particles = sampled.map((point, index) => {
        const angle = Math.random() * Math.PI * 2;
        const distance = reducedMotion ? 0 : 24 + Math.random() * 58;
        return {
          x: point.x + Math.cos(angle) * distance,
          y: point.y + Math.sin(angle) * distance,
          targetX: point.x,
          targetY: point.y,
          vx: 0,
          vy: 0,
          radius: canvasWidth < 520 ? 1.25 : 1.45,
          color: palette[index % palette.length],
          phase: Math.random() * Math.PI * 2,
        };
      });

      particleReady = !reducedMotion && particles.length > 0;
      requestParticleLoop();
    };

    const queueParticleBuild = () => {
      window.cancelAnimationFrame(resizeFrame);
      resizeFrame = window.requestAnimationFrame(() => void buildParticles());
    };

    const updatePointer = (event: PointerEvent) => {
      const rect = particleCanvas.getBoundingClientRect();
      pointer.x = event.clientX - rect.left;
      pointer.y = event.clientY - rect.top;
      pointer.active = true;
      requestParticleLoop();
    };

    const leavePointer = () => {
      pointer.active = false;
    };

    const pressPointer = (event: PointerEvent) => {
      updatePointer(event);
      if (event.pointerType === "touch") {
        window.clearTimeout(touchTimer);
        touchTimer = window.setTimeout(() => {
          pointer.active = false;
        }, 650);
      }
    };

    const animateExpand = (timestamp: number) => {
      expandAnimationFrame = 0;
      const elapsed = lastExpandTimestamp
        ? Math.min(timestamp - lastExpandTimestamp, 64)
        : 16;
      lastExpandTimestamp = timestamp;
      const follow = 1 - Math.exp(-elapsed / 120);
      const difference = targetExpandProgress - expandProgress;

      if (Math.abs(difference) < 0.001) {
        expandProgress = targetExpandProgress;
        lastExpandTimestamp = 0;
        return;
      }

      expandProgress += difference * follow;
      expandAnimationFrame = window.requestAnimationFrame(animateExpand);
    };

    const requestExpandAnimation = () => {
      if (!expandAnimationFrame && !reducedMotion) {
        expandAnimationFrame = window.requestAnimationFrame(animateExpand);
      }
    };

    const updateExpand = () => {
      scrollFrame = 0;
      if (!expandHost || !expandMedia) return;
      if (reducedMotion) {
        targetExpandProgress = 1;
        expandProgress = 1;
        return;
      }

      const mediaTop = expandMedia.getBoundingClientRect().top;
      const sourceRatio =
        expandImage?.naturalWidth && expandImage?.naturalHeight
          ? expandImage.naturalWidth / expandImage.naturalHeight
          : 2;
      const fullImageHeight =
        expandMedia.clientHeight || expandMedia.clientWidth / sourceRatio;
      const minScale = window.innerWidth <= 640 ? 0.7 : 0.42;
      const startTop =
        window.innerHeight - (fullImageHeight * (1 + minScale)) / 2 - 16;
      const centeredTop = window.innerHeight * 0.5 - fullImageHeight * 0.5;
      const travel = Math.max(startTop - centeredTop, 1);
      targetExpandProgress = clamp((startTop - mediaTop) / travel, 0, 1);
      requestExpandAnimation();
    };

    const queueExpand = () => {
      if (!scrollFrame) scrollFrame = window.requestAnimationFrame(updateExpand);
    };

    const resetProximity = () => {
      if (!proximityHost) return;
      proximityHost.querySelectorAll<HTMLElement>("[data-proximity-letter]").forEach((letter) => {
        letter.style.fontWeight = "560";
        letter.style.transform = "translateY(0) scale(1)";
        letter.style.color = "";
      });
    };

    const paintProximity = () => {
      proximityFrame = 0;
      if (reducedMotion || !proximityHost) return;
      const letters = proximityHost.querySelectorAll<HTMLElement>("[data-proximity-letter]");
      for (const letter of letters) {
        const rect = letter.getBoundingClientRect();
        const dx = rect.left + rect.width / 2 - lastPointerX;
        const dy = rect.top + rect.height / 2 - lastPointerY;
        const influence = 1 - clamp(Math.hypot(dx, dy) / 120, 0, 1);
        letter.style.fontWeight = String(Math.round(560 + influence * 240));
        letter.style.transform = `translateY(${-influence * 3}px) scale(${1 + influence * 0.045})`;
        letter.style.color = influence > 0.12 ? "var(--primary)" : "";
      }
    };

    const updateProximity = (event: PointerEvent) => {
      lastPointerX = event.clientX;
      lastPointerY = event.clientY;
      if (!proximityFrame) proximityFrame = window.requestAnimationFrame(paintProximity);
    };

    const handleVisibility = () => {
      pageVisible = !document.hidden;
      if (pageVisible) requestParticleLoop();
    };

    const handleMotionChange = (event: MediaQueryListEvent) => {
      reducedMotion = event.matches;
      particleReady = !reducedMotion && particles.length > 0;
      maskEnhanced = !reducedMotion;
      maskActive = true;
      if (reducedMotion) {
        window.cancelAnimationFrame(animationFrame);
        animationFrame = 0;
        window.cancelAnimationFrame(expandAnimationFrame);
        expandAnimationFrame = 0;
        targetExpandProgress = 1;
        expandProgress = 1;
        resetProximity();
      } else {
        queueParticleBuild();
        queueExpand();
        requestParticleLoop();
      }
    };

    if (coverSrc) {
      maskHeading.style.setProperty(
        "--mask-image",
        `url("${coverSrc.replace(/"/g, "%22")}")`,
      );
    }

    const monthlyLayout = document.querySelector<HTMLElement>(".monthly-post-layout");
    const titleEffects: Record<string, string> = {
      "先看一下这个月的数据": "data",
      "本月更新": "update",
      "自动上架这个月真正新增了什么": "automation",
      "这个月也做了几次停止": "stop",
      "这个月最有意思的事我一直在加也一直在删": "edit",
      "生活篇": "life",
      "8-月推荐友链": "friends",
      "评选规则": "rules",
      "写在第一期月刊最后": "closing",
    };

    const appendTitleCharacters = (
      container: HTMLElement,
      text: string,
      startIndex = 0,
      extraClass = "",
    ) => {
      const characters = Array.from(text);
      characters.forEach((character, index) => {
        const letter = document.createElement("span");
        letter.className = ["monthly-title-char", extraClass].filter(Boolean).join(" ");
        letter.setAttribute("aria-hidden", "true");
        letter.style.setProperty("--monthly-title-index", String(startIndex + index));
        letter.style.setProperty("--monthly-title-delay", `${(startIndex + index) * 42}ms`);
        letter.style.setProperty(
          "--monthly-title-reverse-index",
          String(characters.length - index - 1),
        );
        letter.style.setProperty(
          "--monthly-title-reverse-delay",
          `${(characters.length - index - 1) * 42}ms`,
        );
        letter.textContent = character === " " ? "\u00a0" : character;
        container.append(letter);
      });
      return startIndex + characters.length;
    };

    const titleBuilders: Record<string, (label: HTMLSpanElement, title: string) => void> = {
      "这个月也做了几次停止": (label, title) => {
        const splitAt = title.lastIndexOf("“");
        const kept = document.createElement("span");
        const returned = document.createElement("span");
        kept.className = "monthly-title-stop__kept";
        returned.className = "monthly-title-stop__returned";
        const keptText = splitAt > 0 ? title.slice(0, splitAt) : title;
        const returnedText = splitAt > 0 ? title.slice(splitAt) : "";
        const nextIndex = appendTitleCharacters(kept, keptText, 0, "monthly-title-char--stop");
        appendTitleCharacters(returned, returnedText, nextIndex, "monthly-title-char--stop-returned");
        label.append(kept, returned);
      },
      "这个月最有意思的事我一直在加也一直在删": (label, title) => {
        const addIndex = title.indexOf("加");
        const deleteIndex = title.lastIndexOf("删");
        if (addIndex < 0 || deleteIndex <= addIndex) {
          appendTitleCharacters(label, title);
          return;
        }

        const add = document.createElement("span");
        const remove = document.createElement("span");
        add.className = "monthly-title-pull monthly-title-pull--add";
        remove.className = "monthly-title-pull monthly-title-pull--remove";
        let nextIndex = appendTitleCharacters(label, title.slice(0, addIndex));
        nextIndex = appendTitleCharacters(add, "加", nextIndex, "monthly-title-char--add");
        label.append(add);
        nextIndex = appendTitleCharacters(
          label,
          title.slice(addIndex + 1, deleteIndex),
          nextIndex,
        );
        appendTitleCharacters(remove, "删", nextIndex, "monthly-title-char--remove");
        label.append(remove);
        appendTitleCharacters(label, title.slice(deleteIndex + 1), nextIndex + 1);
      },
    };

    const decorateChapterTitle = (heading: HTMLHeadingElement) => {
      if (heading.dataset.monthlyTitleDecorated === "true") return;

      const titleNodes = Array.from(heading.childNodes).filter(
        (node) => node.nodeType === Node.TEXT_NODE && node.textContent?.trim(),
      );
      const title = titleNodes.map((node) => node.textContent ?? "").join("").trim();
      if (!title) return;

      const label = document.createElement("span");
      label.className = "monthly-chapter-title__label";
      label.setAttribute("aria-label", title);
      heading.setAttribute("aria-label", title);
      const builder = heading.id ? titleBuilders[heading.id] : undefined;
      if (builder) {
        builder(label, title);
      } else {
        appendTitleCharacters(label, title);
      }

      for (const node of titleNodes) node.remove();
      const anchor = heading.querySelector(".anchor");
      heading.insertBefore(label, anchor ?? null);

      heading.dataset.monthlyTitleDecorated = "true";
      if (heading.id && titleEffects[heading.id]) {
        heading.dataset.monthlyTitleEffect = titleEffects[heading.id];
      }
    };

    monthlyLayout
      ?.querySelectorAll<HTMLHeadingElement>(":scope > section > h2[id]")
      .forEach(decorateChapterTitle);
    const driftWall = monthlyLayout?.querySelector<HTMLElement>("[data-monthly-drift-wall]");
    const driftPlane = driftWall?.querySelector<HTMLElement>("[data-drift-plane]");
    const driftSource = driftWall?.querySelector<HTMLTemplateElement>("[data-drift-source]");
    const driftSources = driftSource
      ? Array.from(driftSource.content.querySelectorAll<HTMLImageElement>("[data-drift-source-item]"))
          .map((image) => image.getAttribute("src"))
          .filter((src): src is string => Boolean(src))
      : [];
    const driftColumns = driftWall
      ? Array.from(driftWall.querySelectorAll<HTMLElement>("[data-drift-column]"))
      : [];

    if (driftWall && driftPlane && driftColumns.length > 0 && driftSources.length > 0) {
      driftColumns.forEach((column, index) => {
        const columnSources = driftSources.filter(
          (_, sourceIndex) => sourceIndex % driftColumns.length === index,
        );
        const tileFragment = document.createDocumentFragment();

        for (const source of [...columnSources, ...columnSources]) {
          const tile = document.createElement("span");
          const image = document.createElement("img");
          tile.className = "monthly-drift-wall__tile";
          tile.setAttribute("data-drift-tile", "");
          image.src = source;
          image.alt = "";
          image.loading = "lazy";
          image.decoding = "async";
          tile.append(image);
          tileFragment.append(tile);
        }

        column.replaceChildren(tileFragment);
        column.style.setProperty("--monthly-drift-duration", `${11 + index * 1.1}s`);
        column.style.setProperty("--monthly-drift-delay", `${index * -1.7}s`);
        column.style.setProperty("--monthly-drift-direction", index % 2 ? "reverse" : "normal");
      });
    }

    const friendHeading = monthlyLayout?.querySelector<HTMLElement>(
      'h2[id="8-月推荐友链"]',
    );
    const friendCards = friendHeading?.parentElement
      ? Array.from(friendHeading.parentElement.children).filter(
          (element): element is HTMLElement =>
            element instanceof HTMLElement &&
            element.tagName === "SECTION" &&
            element.querySelector(".monthly-friend-avatar") !== null,
        )
      : [];
    const groupedRevealTargets = monthlyLayout
      ? [
          ...friendCards,
          ...Array.from(
            monthlyLayout.querySelectorAll<HTMLElement>(
              ".monthly-opening, .monthly-data-strip, .monthly-idea-drawer, .monthly-fix-notes, .monthly-article-cover-pair, .monthly-about-gallery, .monthly-friend-page-demo, .monthly-moments-random, .monthly-portal-figure, .monthly-drift-wall, .monthly-wechat-thread, .monthly-date-replay, .monthly-discount-path, .monthly-stop-pair, center, figure",
            ),
          ),
        ]
      : [];
    const revealCandidates = monthlyLayout
      ? [
          ...Array.from(
            monthlyLayout.querySelectorAll<HTMLElement>(
              "h2, h3, p, blockquote, center, figure, details, .monthly-opening, .monthly-data-strip, .monthly-article-cover-pair, .monthly-about-gallery, .monthly-friend-page-demo, .monthly-moments-random, .monthly-portal-figure, .monthly-drift-wall, .monthly-date-replay, .monthly-discount-path, .monthly-stop-pair",
            ),
          ),
          ...friendCards,
        ]
      : [];
    const revealTargets = Array.from(new Set(revealCandidates)).filter(
      (target) =>
        !groupedRevealTargets.some(
          (group) => group !== target && group.contains(target),
        ),
    );
    const updateRevealScrollSpeed = () => {
      const now = performance.now();
      const elapsed = Math.max(now - revealScrollTime, 1);
      const distance = Math.abs(window.scrollY - revealScrollY);
      revealScrollSpeed = Math.min(distance / elapsed, 8);
      revealScrollY = window.scrollY;
      revealScrollTime = now;
    };
    const revealObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const target = entry.target as HTMLElement;
          const duration = Math.round(
            clamp(900 / (1 + revealScrollSpeed * 0.95), 180, 900),
          );
          target.style.setProperty("--monthly-reveal-duration", `${duration}ms`);
          target.style.setProperty("--monthly-reveal-delay", "0ms");
          target.classList.add("monthly-scroll-reveal--visible");
          revealObserver.unobserve(entry.target);
        }
      },
      {
        threshold: 0.12,
        rootMargin: "0px 0px -9% 0px",
      },
    );

    revealTargets.forEach((target) => {
      target.style.setProperty("--monthly-reveal-delay", "0ms");
      target.classList.add("monthly-scroll-reveal");
      const bounds = target.getBoundingClientRect();
      if (reducedMotion || bounds.bottom < 0) {
        target.classList.add("monthly-scroll-reveal--visible");
      } else {
        revealObserver.observe(target);
      }
    });

    const chatThreads = monthlyLayout
      ? Array.from(monthlyLayout.querySelectorAll<HTMLElement>("[data-monthly-chat-thread]"))
      : [];
    const deliverChatThread = (thread: HTMLElement) => {
      const duration = Math.round(
        clamp(580 / (1 + revealScrollSpeed * 0.82), 280, 580),
      );
      const step = Math.round(
        clamp(510 / (1 + revealScrollSpeed * 0.72), 240, 510),
      );
      thread.style.setProperty("--monthly-chat-message-duration", `${duration}ms`);
      thread.querySelectorAll<HTMLElement>("[data-monthly-chat-message]").forEach(
        (message, index) => {
          message.style.setProperty("--monthly-chat-delay", `${100 + index * step}ms`);
        },
      );
      thread.classList.add("monthly-wechat-thread--delivered");
    };
    const chatObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const thread = entry.target as HTMLElement;
          deliverChatThread(thread);
          chatObserver.unobserve(thread);
        }
      },
      {
        threshold: 0.26,
        rootMargin: "0px 0px -10% 0px",
      },
    );

    chatThreads.forEach((thread) => {
      const bounds = thread.getBoundingClientRect();
      if (reducedMotion || bounds.top < window.innerHeight * 0.78) {
        deliverChatThread(thread);
        return;
      }

      thread.dataset.chatEnhanced = "true";
      chatObserver.observe(thread);
    });

    const dateReplayEntries = monthlyLayout
      ? Array.from(monthlyLayout.querySelectorAll<HTMLElement>("[data-monthly-date-entry]"))
      : [];
    const syncDateReplay = () => {
      dateReplayFrame = 0;
      if (!dateReplayEntries.length) return;

      const referenceLine = Math.min(Math.max(window.innerHeight * 0.46, 220), 420);
      let activeEntry = dateReplayEntries[0];
      for (const entry of dateReplayEntries) {
        if (entry.getBoundingClientRect().top <= referenceLine) activeEntry = entry;
      }
      dateReplayEntries.forEach((entry) => {
        entry.classList.toggle("monthly-date-replay__entry--current", entry === activeEntry);
      });
    };
    const queueDateReplaySync = () => {
      if (!dateReplayFrame) dateReplayFrame = window.requestAnimationFrame(syncDateReplay);
    };
    if (dateReplayEntries.length) {
      syncDateReplay();
      window.addEventListener("scroll", queueDateReplaySync, { passive: true });
      window.addEventListener("resize", queueDateReplaySync, { passive: true });
    }

    const friendAvatarImages = Array.from(
      document.querySelectorAll<HTMLImageElement>(".monthly-friend-avatar > img"),
    );
    const hideBrokenAvatar = (image: HTMLImageElement) => {
      if (image.complete && image.naturalWidth === 0) image.hidden = true;
    };
    const avatarErrorHandlers = friendAvatarImages.map((image) => {
      const handleError = () => {
        image.hidden = true;
      };
      image.addEventListener("error", handleError);
      hideBrokenAvatar(image);
      return { image, handleError };
    });

    const particleObserver = new IntersectionObserver(
      ([entry]) => {
        particleVisible = entry.isIntersecting;
        if (particleVisible) requestParticleLoop();
      },
      { rootMargin: "160px 0px" },
    );
    particleObserver.observe(particleHost);

    maskEnhanced = !reducedMotion;
    if (!reducedMotion) {
      maskTimer = window.setTimeout(() => {
        maskActive = true;
      }, 180);
    }

    const resizeObserver = new ResizeObserver(queueParticleBuild);
    resizeObserver.observe(particleHost);

    particleCanvas.addEventListener("pointermove", updatePointer);
    particleCanvas.addEventListener("pointerleave", leavePointer);
    particleCanvas.addEventListener("pointerdown", pressPointer);
    proximityHost.addEventListener("pointermove", updateProximity);
    proximityHost.addEventListener("pointerleave", resetProximity);
    expandImage?.addEventListener("load", queueExpand);
    window.addEventListener("scroll", updateRevealScrollSpeed, { passive: true });
    window.addEventListener("scroll", queueExpand, { passive: true });
    window.addEventListener("resize", queueExpand, { passive: true });
    document.addEventListener("visibilitychange", handleVisibility);
    motionQuery.addEventListener("change", handleMotionChange);

    queueParticleBuild();
    queueExpand();
    if (reducedMotion) {
      maskActive = true;
      expandProgress = 1;
    }

    cleanups.push(
      () => {
        for (const { image, handleError } of avatarErrorHandlers) {
          image.removeEventListener("error", handleError);
        }
      },
      () => revealObserver.disconnect(),
      () => chatObserver.disconnect(),
      () => window.removeEventListener("scroll", queueDateReplaySync),
      () => window.removeEventListener("resize", queueDateReplaySync),
      () => particleObserver.disconnect(),
      () => resizeObserver.disconnect(),
      () => particleCanvas.removeEventListener("pointermove", updatePointer),
      () => particleCanvas.removeEventListener("pointerleave", leavePointer),
      () => particleCanvas.removeEventListener("pointerdown", pressPointer),
      () => proximityHost.removeEventListener("pointermove", updateProximity),
      () => proximityHost.removeEventListener("pointerleave", resetProximity),
      () => expandImage?.removeEventListener("load", queueExpand),
      () => window.removeEventListener("scroll", updateRevealScrollSpeed),
      () => window.removeEventListener("scroll", queueExpand),
      () => window.removeEventListener("resize", queueExpand),
      () => document.removeEventListener("visibilitychange", handleVisibility),
      () => motionQuery.removeEventListener("change", handleMotionChange),
    );

    return () => {
      destroyed = true;
      for (const cleanup of cleanups.reverse()) cleanup();
      window.cancelAnimationFrame(animationFrame);
      window.cancelAnimationFrame(resizeFrame);
      window.cancelAnimationFrame(scrollFrame);
      window.cancelAnimationFrame(expandAnimationFrame);
      window.cancelAnimationFrame(proximityFrame);
      window.cancelAnimationFrame(dateReplayFrame);
      window.clearTimeout(touchTimer);
      window.clearTimeout(maskTimer);
    };
  });

  onMount(() => {
    const card = document.querySelector<HTMLElement>("[data-monthly-moments-random]");
    if (!card) return;

    const articleLink = card.querySelector<HTMLAnchorElement>("[data-monthly-random-link]");
    const articleTitle = card.querySelector<HTMLElement>("[data-monthly-random-title]");
    const articleDescription = card.querySelector<HTMLElement>("[data-monthly-random-description]");
    const articleMeta = card.querySelector<HTMLElement>("[data-monthly-random-meta]");
    const articleBadge = card.querySelector<HTMLElement>("[data-monthly-random-badge]");
    const articleAvatar = card.querySelector<HTMLImageElement>("[data-monthly-random-avatar]");
    const avatarFallback = card.querySelector<HTMLElement>("[data-monthly-random-avatar-fallback]");
    const countdown = card.querySelector<HTMLElement>("[data-monthly-random-countdown]");
    const autoButton = card.querySelector<HTMLButtonElement>("[data-monthly-random-auto]");
    const refreshButton = card.querySelector<HTMLButtonElement>("[data-monthly-random-refresh]");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    const candidates = momentItems.filter(
      (item) => item && typeof item.title === "string" && typeof item.link === "string" && item.link.length > 0,
    );
    let lastArticleLink = "";
    let autoRandomEnabled = true;
    let secondsUntilRandom = 5;
    let swapTimer = 0;

    const updateCountdown = () => {
      if (!countdown) return;
      countdown.textContent = autoRandomEnabled ? String(secondsUntilRandom) : "";
      countdown.dataset.auto = String(autoRandomEnabled);
    };

    const showAvatarFallback = () => {
      if (articleAvatar) {
        articleAvatar.hidden = true;
        articleAvatar.removeAttribute("src");
      }
      if (avatarFallback) avatarFallback.hidden = false;
    };

    const playSwap = () => {
      if (reducedMotion) return;
      card.classList.remove("is-switching");
      void card.offsetWidth;
      card.classList.add("is-switching");
      window.clearTimeout(swapTimer);
      swapTimer = window.setTimeout(() => card.classList.remove("is-switching"), 620);
    };

    const setAutoRandomState = (enabled: boolean) => {
      autoRandomEnabled = enabled;
      secondsUntilRandom = 5;
      autoButton?.classList.toggle("is-active", enabled);
      autoButton?.setAttribute("aria-pressed", String(enabled));
      autoButton?.setAttribute("aria-label", enabled ? "关闭自动随机" : "开启自动随机");
      updateCountdown();
    };

    const renderRandomArticle = () => {
      if (!articleLink || !articleTitle) return;
      if (candidates.length === 0) {
        card.dataset.state = "empty";
        card.classList.remove(
          "monthly-moments-random--own",
          "monthly-moments-random--recommended",
          "moments-random-article--own",
          "moments-random-article--recommended",
        );
        articleLink.href = "/moments/";
        articleLink.setAttribute("aria-disabled", "true");
        articleTitle.textContent = "暂时没有可推荐的文章";
        if (articleDescription) articleDescription.textContent = "朋友圈暂时没有可读取的更新，晚一点再来看看。";
        if (articleMeta) articleMeta.textContent = "";
        if (articleBadge) articleBadge.hidden = true;
        showAvatarFallback();
        secondsUntilRandom = 0;
        updateCountdown();
        return;
      }

      const ownItems = candidates.filter((item) => item.role === "own");
      const otherItems = candidates.filter((item) => item.role !== "own");
      const preferredPool = Math.random() < 0.2 ? ownItems : otherItems;
      const categoryPool = preferredPool.length > 0 ? preferredPool : candidates;
      const pool = categoryPool.filter((item) => item.link !== lastArticleLink);
      const picked = (pool.length > 0 ? pool : categoryPool)[Math.floor(Math.random() * (pool.length > 0 ? pool.length : categoryPool.length))];
      lastArticleLink = picked.link;
      const role = picked.role === "own" || picked.role === "recommended" ? picked.role : null;

      card.dataset.state = "ready";
      card.classList.toggle("monthly-moments-random--own", role === "own");
      card.classList.toggle("monthly-moments-random--recommended", role === "recommended");
      card.classList.toggle("moments-random-article--own", role === "own");
      card.classList.toggle("moments-random-article--recommended", role === "recommended");
      articleLink.href = picked.link;
      articleLink.removeAttribute("aria-disabled");
      articleLink.setAttribute("aria-label", `阅读随机文章：${picked.title}`);
      articleTitle.textContent = picked.title || "随机文章";
      if (articleDescription) articleDescription.textContent = picked.description || "从朋友圈里随手翻到的一篇更新。";
      if (articleMeta) {
        const date = picked.publishedAt ? new Date(picked.publishedAt) : null;
        const published = date && !Number.isNaN(date.getTime())
          ? date.toLocaleDateString("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit" })
          : "最近更新";
        articleMeta.textContent = `${picked.friendTitle || "友链文章"} · ${published}`;
      }
      if (articleBadge) {
        articleBadge.hidden = role === null;
        articleBadge.textContent = role === "own" ? "本站主理人" : role === "recommended" ? "推荐友链" : "";
        articleBadge.classList.toggle("is-own", role === "own");
        articleBadge.classList.toggle("is-recommended", role === "recommended");
      }
      if (articleAvatar && picked.avatar) {
        articleAvatar.src = picked.avatar;
        articleAvatar.alt = `${picked.friendTitle || "友链站点"}头像`;
        articleAvatar.hidden = false;
        if (avatarFallback) avatarFallback.hidden = true;
      } else {
        showAvatarFallback();
      }
      if (autoRandomEnabled) {
        secondsUntilRandom = 5;
        updateCountdown();
      }
      playSwap();
    };

    const handleAvatarError = () => showAvatarFallback();
    const handleRefresh = () => renderRandomArticle();
    const handleAutoToggle = () => setAutoRandomState(!autoRandomEnabled);
    const handlePointerMove = (event: PointerEvent) => {
      if (!finePointer || reducedMotion || event.pointerType === "touch") return;
      const rect = card.getBoundingClientRect();
      const x = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
      const y = Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height));
      card.dataset.tiltActive = "true";
      card.style.setProperty("--pointer-x", `${(x * 100).toFixed(2)}%`);
      card.style.setProperty("--pointer-y", `${(y * 100).toFixed(2)}%`);
      card.style.setProperty("--tilt-x", `${((0.5 - y) * 3.2).toFixed(2)}deg`);
      card.style.setProperty("--tilt-y", `${((x - 0.5) * 3.2).toFixed(2)}deg`);
    };
    const resetTilt = () => {
      card.dataset.tiltActive = "false";
      card.style.setProperty("--pointer-x", "50%");
      card.style.setProperty("--pointer-y", "50%");
      card.style.setProperty("--tilt-x", "0deg");
      card.style.setProperty("--tilt-y", "0deg");
    };

    articleAvatar?.addEventListener("error", handleAvatarError);
    refreshButton?.addEventListener("click", handleRefresh);
    autoButton?.addEventListener("click", handleAutoToggle);
    card.addEventListener("pointermove", handlePointerMove);
    card.addEventListener("pointerleave", resetTilt);
    renderRandomArticle();
    const timer = window.setInterval(() => {
      if (!autoRandomEnabled || candidates.length < 2) return;
      if (secondsUntilRandom <= 1) {
        renderRandomArticle();
        return;
      }
      secondsUntilRandom -= 1;
      updateCountdown();
    }, 1000);

    return () => {
      window.clearTimeout(swapTimer);
      window.clearInterval(timer);
      articleAvatar?.removeEventListener("error", handleAvatarError);
      refreshButton?.removeEventListener("click", handleRefresh);
      autoButton?.removeEventListener("click", handleAutoToggle);
      card.removeEventListener("pointermove", handlePointerMove);
      card.removeEventListener("pointerleave", resetTilt);
    };
  });
</script>

<section class="monthly-experiment" aria-labelledby="monthly-experiment-title">
  <div
    class:particle-ready={particleReady}
    class="particle-text-stage"
    bind:this={particleHost}
  >
    <canvas bind:this={particleCanvas} aria-hidden="true"></canvas>
    <h2 id="monthly-experiment-title" class="particle-text-fallback">
      {particleText}
    </h2>
  </div>

  <p class="interaction-hint">把鼠标移到标题上试试，手机上也可以轻触一下。</p>

  <div class="experiment-copy">
    <p>
      这期不只是给 Markdown 单独换了一套排版，我还想看看，文章能不能多一点可以碰、可以玩的东西。
    </p>
    <p>
      上面的字会散开，下面这句会露出本期主图，再往下滚，图片会从收着的状态慢慢展开。以后不一定每篇都有，碰到适合的内容再加；哪天嫌 Markdown 折腾，也可能直接换富文本——先玩了再说。
    </p>
  </div>

  <div class="effect-section masked-section">
    <h3
      bind:this={maskHeading}
      class:mask-enhanced={maskEnhanced}
      class:mask-active={maskActive}
      class="masked-heading"
    >
      Markdown，也能有一点自己的脾气
    </h3>
    <p class="effect-caption">主图被藏进了这行字里，画面会从左上一路滑向右下，走完一张后由下一张无缝接上。</p>
  </div>

  <div class="effect-section proximity-section">
    <p
      bind:this={proximityHost}
      class="proximity-line"
      aria-label={proximityText}
    >
      {#each proximityCharacters as character}
        <span data-proximity-letter aria-hidden="true">
          {character === " " ? "\u00a0" : character}
        </span>
      {/each}
    </p>
    <p class="effect-caption">这一行不负责讲道理，只负责在鼠标靠近时稍微精神一点。</p>
  </div>

  <div class="effect-section expand-section" bind:this={expandHost}>
    <figure
      class="scroll-expand-figure"
      style={`--expand-progress: ${expandProgress}`}
    >
      {#if coverSrc}
        <div class="scroll-expand-media" bind:this={expandMedia}>
          <img
            bind:this={expandImage}
            src={coverSrc}
            alt="本期月刊主图滚动展开演示"
            loading="lazy"
            decoding="async"
          />
        </div>
      {/if}
      <figcaption>先让它完整露出来；滚到屏幕中央时，才展开到文章宽度。</figcaption>
    </figure>
  </div>
</section>

<style>
  .monthly-experiment {
    --experiment-ink: color-mix(in oklab, var(--text-color) 92%, var(--primary));
    --experiment-muted: color-mix(in oklab, var(--content-meta) 82%, var(--primary));
    --experiment-rule: color-mix(in oklab, var(--primary) 18%, var(--line-divider));
    width: 100%;
    margin: 1rem auto clamp(3rem, 6vw, 4.5rem);
    padding: clamp(2rem, 5vw, 3.5rem) 0;
    border-top: 1px solid var(--experiment-rule);
    border-bottom: 1px solid var(--experiment-rule);
    color: var(--experiment-ink);
  }

  .particle-text-stage {
    --particle-height: 150px;
    position: relative;
    display: grid;
    min-height: var(--particle-height);
    place-items: center;
    overflow: hidden;
    cursor: crosshair;
    touch-action: pan-y;
    max-width: 70ch;
    margin-inline: auto;
  }

  .particle-text-stage canvas {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
  }

  .particle-text-fallback {
    max-width: 100%;
    margin: 0;
    color: var(--experiment-ink);
    font-size: clamp(2rem, 7vw, 4.6rem);
    font-weight: 800;
    letter-spacing: -0.03em;
    line-height: 1.08;
    text-align: center;
    text-wrap: balance;
  }

  .particle-ready .particle-text-fallback {
    position: absolute;
    width: 1px;
    height: 1px;
    margin: -1px;
    padding: 0;
    overflow: hidden;
    clip: rect(0 0 0 0);
    clip-path: inset(50%);
    white-space: nowrap;
  }

  .interaction-hint,
  .effect-caption,
  .scroll-expand-figure figcaption {
    color: var(--experiment-muted);
    font-size: 0.78rem;
    line-height: 1.65;
  }

  .interaction-hint {
    max-width: 70ch;
    margin: 0.35rem 0 0;
    margin-inline: auto;
    text-align: center;
  }

  .experiment-copy {
    max-width: 62ch;
    margin: clamp(2.25rem, 5vw, 3.5rem) auto 0;
  }

  .experiment-copy p {
    margin: 0;
    font-size: 0.98rem;
    line-height: 1.9;
  }

  .experiment-copy p + p {
    margin-top: 0.85rem;
  }

  .effect-section {
    margin-top: clamp(3rem, 7vw, 5rem);
    padding-top: clamp(1.6rem, 4vw, 2.4rem);
    border-top: 1px solid var(--experiment-rule);
  }

  .masked-section,
  .proximity-section {
    max-width: 70ch;
    margin-inline: auto;
  }

  .masked-heading {
    --mask-tile-width: clamp(22rem, 72vw, 44rem);
    --mask-tile-height: clamp(11rem, 36vw, 22rem);
    margin: 0;
    color: var(--experiment-ink);
    font-size: clamp(2.1rem, 7vw, 4.8rem);
    font-weight: 800;
    letter-spacing: -0.03em;
    line-height: 1.08;
    text-align: center;
    text-wrap: balance;
    background-image: var(--mask-image);
    background-position: 0 0;
    background-size: var(--mask-tile-width) var(--mask-tile-height);
    background-repeat: repeat;
    background-clip: text;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    clip-path: inset(0);
    transition:
      clip-path 820ms cubic-bezier(0.16, 1, 0.3, 1);
  }

  .masked-heading.mask-enhanced {
    clip-path: inset(0 100% 0 0);
  }

  .masked-heading.mask-enhanced.mask-active {
    clip-path: inset(0);
    animation: masked-heading-drift 5.2s linear -1s infinite;
  }

  @keyframes masked-heading-drift {
    to {
      background-position:
        calc(-1 * var(--mask-tile-width))
        calc(-1 * var(--mask-tile-height));
    }
  }

  @supports not (background-clip: text) {
    .masked-heading {
      color: var(--experiment-ink);
      background: none;
      -webkit-text-fill-color: currentColor;
    }
  }

  .effect-caption {
    max-width: 46rem;
    margin: 0.85rem auto 0;
    text-align: center;
  }

  .proximity-line {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    margin: 0;
    color: var(--experiment-ink);
    font-size: clamp(1.8rem, 5vw, 3.25rem);
    font-weight: 560;
    letter-spacing: -0.02em;
    line-height: 1.25;
    cursor: default;
  }

  .proximity-line span {
    display: inline-block;
    transition:
      color 120ms ease-out,
      transform 120ms ease-out,
      font-weight 120ms ease-out;
    transform-origin: center bottom;
  }

  .expand-section {
    min-height: clamp(22rem, 58vw, 36rem);
  }

  .scroll-expand-figure {
    --expand-progress: 0;
    width: 100%;
    margin: 0 auto;
  }

  .scroll-expand-media {
    width: 100%;
  }

  .scroll-expand-figure img {
    display: block;
    width: 100%;
    height: auto;
    border-radius: calc(26px - var(--expand-progress) * 14px);
    box-shadow: 0 1.2rem 3rem -2.1rem color-mix(in oklab, var(--primary) 32%, transparent);
    transform: scale(calc(0.42 + var(--expand-progress) * 0.58));
    transform-origin: center;
    backface-visibility: hidden;
    will-change: transform;
    transition: border-radius 100ms linear;
  }

  .scroll-expand-figure figcaption {
    margin-top: 0.75rem;
    text-align: center;
  }

  @media (max-width: 640px) {
    .monthly-experiment {
      margin-top: 0.5rem;
      padding-block: 1.8rem 2.6rem;
    }

    .particle-text-stage {
      --particle-height: 124px;
    }

    .experiment-copy p {
      line-height: 1.82;
    }

    .effect-section {
      margin-top: 3.3rem;
    }

    .masked-heading {
      font-size: clamp(2rem, 11vw, 3.2rem);
    }

    .proximity-line {
      font-size: clamp(1.55rem, 8vw, 2.4rem);
    }

    .expand-section {
      min-height: 23rem;
    }

    .scroll-expand-figure img {
      transform: scale(calc(0.7 + var(--expand-progress) * 0.3));
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .masked-heading,
    .proximity-line span,
    .scroll-expand-figure img {
      transition-duration: 1ms;
    }

    .masked-heading {
      animation: none !important;
      background-position: 50% 50%;
    }
  }
</style>
