import "./friend-visibility";

(() => {
	const avatarFallbackNamespace = "__rainztFriendAvatarFallback";
	if (window[avatarFallbackNamespace]) return;

	document.addEventListener(
		"error",
		(event) => {
			const image =
				event.target instanceof HTMLImageElement ? event.target : null;
			if (!image?.matches("[data-friend-avatar]")) return;
			if (image.dataset.friendAvatarFallback === "true") return;

			image.dataset.friendAvatarFallback = "true";
			image.removeAttribute("srcset");
			image.src = "/assets/ai-xiaoai-avatar.png?v=20261028";
			image.alt = "小爱头像";
		},
		true,
	);

	window[avatarFallbackNamespace] = true;
})();

if (!customElements.get("friend-filter")) {
	class FriendFilter extends HTMLElement {
		selectedTag = "all";
		tagsList = null;
		tagsViewport = null;
		tagsToggle = null;
		resizeObserver = null;
		setupFrame = 0;
		sweepObserver = null;
		sweepSurfaces = [];
		visibleSweepSurfaces = new Set();

		constructor() {
			super();
		}

		connectedCallback() {
			this.addEventListener("click", this.handleClick);

			if (document.readyState === "loading") {
				document.addEventListener(
					"DOMContentLoaded",
					this.setupInteractiveElements,
					{
						once: true,
					},
				);
			} else {
				this.setupFrame = requestAnimationFrame(() => {
					this.setupFrame = 0;
					this.setupInteractiveElements();
				});
			}
		}

		setupInteractiveElements = () => {
			const input = this.querySelector("[data-search]");
			if (input) {
				input.addEventListener("input", this.handleInput);
			}

			this.sweepSurfaces = [
				...(this.closest(".card-base")?.querySelectorAll(
					".friend-recommended-sweep",
				) || []),
			];
			if (
				this.sweepSurfaces.length &&
				typeof IntersectionObserver !== "undefined"
			) {
				this.sweepObserver = new IntersectionObserver((entries) => {
					entries.forEach(({ target, isIntersecting }) => {
						if (isIntersecting) this.visibleSweepSurfaces.add(target);
						else this.visibleSweepSurfaces.delete(target);
					});
					this.updateSweepPlayback();
				});
				this.sweepSurfaces.forEach((surface) =>
					this.sweepObserver.observe(surface),
				);
				document.addEventListener("visibilitychange", this.updateSweepPlayback);
			}

			this.tagsList = this.querySelector("[data-tags-list]");
			this.tagsViewport = this.querySelector("[data-tags-viewport]");
			this.tagsToggle = this.querySelector("[data-tags-toggle]");
			if (this.tagsList && this.tagsViewport && this.tagsToggle) {
				this.resizeObserver =
					typeof ResizeObserver !== "undefined"
						? new ResizeObserver(this.updateTagsToggle)
						: null;
				this.resizeObserver?.observe(this.tagsList);
				window.addEventListener("resize", this.updateTagsToggle, {
					passive: true,
				});
				requestAnimationFrame(this.updateTagsToggle);
			}
		};

		disconnectedCallback() {
			this.removeEventListener("click", this.handleClick);
			document.removeEventListener(
				"DOMContentLoaded",
				this.setupInteractiveElements,
			);
			cancelAnimationFrame(this.setupFrame);
			this.querySelector("[data-search]")?.removeEventListener(
				"input",
				this.handleInput,
			);
			this.resizeObserver?.disconnect();
			window.removeEventListener("resize", this.updateTagsToggle);
			this.sweepObserver?.disconnect();
			document.removeEventListener(
				"visibilitychange",
				this.updateSweepPlayback,
			);
			this.visibleSweepSurfaces.clear();
			this.sweepSurfaces.forEach((surface) => {
				surface.classList.remove("is-sweep-running");
				surface.closest(".friend-card")?.classList.remove("is-sweep-running");
			});
		}

		updateSweepPlayback = () => {
			this.sweepSurfaces.forEach((surface) => {
				const isRunning =
					!document.hidden && this.visibleSweepSurfaces.has(surface);
				surface.classList.toggle("is-sweep-running", isRunning);
				surface
					.closest(".friend-card")
					?.classList.toggle("is-sweep-running", isRunning);
			});
		};

		handleInput = () => this.applyFilters();

		updateTagsToggle = () => {
			if (!this.tagsList || !this.tagsToggle) return;

			const collapsedHeight =
				this.tagsList.firstElementChild?.getBoundingClientRect().height ?? 0;
			const hasOverflow = this.tagsList.scrollHeight > collapsedHeight + 1;
			const isExpanded = this.tagsViewport.classList.contains("is-expanded");

			if (!hasOverflow && isExpanded) {
				this.tagsViewport.classList.remove("is-expanded");
			}

			const expanded = this.tagsViewport.classList.contains("is-expanded");
			this.tagsToggle.classList.toggle("hidden", !hasOverflow && !expanded);
			this.tagsToggle.dataset.expanded = String(expanded);
			this.tagsToggle.setAttribute("aria-expanded", String(expanded));
			const label = this.tagsToggle.querySelector("[data-tags-toggle-label]");
			if (label) label.textContent = expanded ? "收起标签" : "展开标签";
		};

		toggleTags = () => {
			if (!this.tagsViewport || !this.tagsToggle) return;
			this.tagsViewport.classList.toggle("is-expanded");
			this.updateTagsToggle();
		};

		handleClick(e) {
			const target = e.target instanceof Element ? e.target : null;
			const button = target?.closest("button");
			if (!button) return;

			if (button.hasAttribute("data-tags-toggle")) {
				this.toggleTags();
				return;
			}

			if (!button.dataset.tag) return;

			this.selectedTag = button.dataset.tag;
			const filters = this.querySelectorAll("button[data-tag]");

			filters.forEach((f) => {
				const isSelected = f === button;
				f.classList.toggle("is-active", isSelected);
				f.setAttribute("aria-pressed", String(isSelected));
			});

			this.applyFilters();
		}

		applyFilters() {
			const container = this.closest(".card-base");
			if (!container) return;

			const input = this.querySelector("[data-search]");
			const query = (input?.value || "").toLowerCase().trim();
			const cards = container.querySelectorAll(".friend-list-card");

			let hasVisible = false;

			cards.forEach((card) => {
				const cardEl = card;
				const tags = (cardEl.dataset.tags || "").split(",");
				const name = (
					cardEl.querySelector(".font-bold")?.textContent || ""
				).toLowerCase();
				const desc = (
					cardEl.querySelector(".line-clamp-1")?.textContent || ""
				).toLowerCase();

				const tagMatch =
					this.selectedTag === "all" ||
					(this.selectedTag && tags.includes(this.selectedTag));
				const searchMatch =
					!query ||
					name.includes(query) ||
					desc.includes(query) ||
					tags.some((t) => t.toLowerCase().includes(query));

				if (tagMatch && searchMatch) {
					cardEl.style.display = "";
					cardEl.classList.add("animate-fade-in-up");
					hasVisible = true;
				} else {
					cardEl.style.display = "none";
					cardEl.classList.remove("animate-fade-in-up");
				}
			});

			const emptyEl = container.querySelector(".friends-empty");
			if (emptyEl) {
				emptyEl.classList.toggle("hidden", hasVisible);
				emptyEl.classList.toggle("flex", !hasVisible);
			}
		}
	}
	customElements.define("friend-filter", FriendFilter);
}

if (!customElements.get("recommended-star-flow")) {
	class RecommendedStarFlow extends HTMLElement {
		constructor() {
			super();
			this.canvas = null;
			this.context = null;
			this.card = null;
			this.particles = [];
			this.width = 0;
			this.height = 0;
			this.pixelRatio = 1;
			this.elapsed = 0;
			this.lastTimestamp = 0;
			this.animationFrame = 0;
			this.resizeFrame = 0;
			this.hoverAmount = 0;
			this.hoverTarget = 0;
			this.initialized = false;
			this.resizeObserver = null;
			this.initializeFrame = 0;

			this.handleFrame = this.handleFrame.bind(this);
			this.initialize = this.initialize.bind(this);
			this.handleResize = this.handleResize.bind(this);
			this.handleVisibilityChange = this.handleVisibilityChange.bind(this);
			this.handlePointerEnter = this.handlePointerEnter.bind(this);
			this.handlePointerLeave = this.handlePointerLeave.bind(this);
			this.handleFocusIn = this.handleFocusIn.bind(this);
			this.handleFocusOut = this.handleFocusOut.bind(this);
		}

		connectedCallback() {
			if (this.initialized) return;
			if (document.documentElement.dataset.siteTheme === "pure") return;
			if (document.readyState === "loading") {
				document.addEventListener("DOMContentLoaded", this.initialize, {
					once: true,
				});
				return;
			}
			// Swup 插入页面片段时，connectedCallback 可能早于 canvas 子节点完成。
			// 放到下一帧，确保子节点已经就位后再初始化。
			this.scheduleInitialize();
		}

		scheduleInitialize() {
			if (this.initialized || !this.isConnected || this.initializeFrame) return;
			this.initializeFrame = requestAnimationFrame(() => {
				this.initializeFrame = 0;
				this.initialize();
			});
		}

		initialize() {
			if (this.initialized || !this.isConnected) return;
			this.canvas = this.querySelector(".friend-recommended-canvas");
			this.context = this.canvas?.getContext("2d", { alpha: true }) || null;
			this.card = this.closest(".friend-card--recommended");

			if (!this.canvas || !this.context) {
				// 片段仍在解析时再次排队，避免偶发地留下未初始化的空 canvas。
				this.scheduleInitialize();
				return;
			}
			this.initialized = true;

			this.particles = this.createParticles();

			this.card?.addEventListener("pointerenter", this.handlePointerEnter);
			this.card?.addEventListener("pointerleave", this.handlePointerLeave);
			this.card?.addEventListener("focusin", this.handleFocusIn);
			this.card?.addEventListener("focusout", this.handleFocusOut);
			document.addEventListener(
				"visibilitychange",
				this.handleVisibilityChange,
			);

			if (typeof ResizeObserver !== "undefined") {
				this.resizeObserver = new ResizeObserver(this.handleResize);
				this.resizeObserver.observe(this);
			} else {
				window.addEventListener("resize", this.handleResize, { passive: true });
			}

			this.resizeFrame = requestAnimationFrame(this.handleResize);
			this.updatePlayback();
		}

		disconnectedCallback() {
			document.removeEventListener("DOMContentLoaded", this.initialize);
			if (this.initializeFrame) {
				cancelAnimationFrame(this.initializeFrame);
				this.initializeFrame = 0;
			}
			this.stopAnimation();
			cancelAnimationFrame(this.resizeFrame);
			this.resizeObserver?.disconnect();
			window.removeEventListener("resize", this.handleResize);
			document.removeEventListener(
				"visibilitychange",
				this.handleVisibilityChange,
			);
			this.card?.removeEventListener("pointerenter", this.handlePointerEnter);
			this.card?.removeEventListener("pointerleave", this.handlePointerLeave);
			this.card?.removeEventListener("focusin", this.handleFocusIn);
			this.card?.removeEventListener("focusout", this.handleFocusOut);
			this.initialized = false;
		}

		createParticles() {
			let seed = 0x51a7c0de;
			const random = () => {
				seed = (seed * 1664525 + 1013904223) >>> 0;
				return seed / 4294967296;
			};
			const layerPattern = [0, 1, 0, 2, 1, 0, 1, 2, 0, 1, 0, 2, 1, 0, 1, 2];
			const ySlots = [
				0.2, 0.7, 0.43, 0.77, 0.17, 0.57, 0.32, 0.64, 0.82, 0.5, 0.25, 0.73,
				0.16, 0.84, 0.39, 0.58,
			];
			const layers = [
				{
					radius: [3.1, 4.35],
					alpha: [0.56, 0.7],
					float: [1.9, 3.5],
					curve: [2.1, 3.9],
					glow: [4, 7],
				},
				{
					radius: [4.5, 6.25],
					alpha: [0.72, 0.88],
					float: [2.9, 5],
					curve: [3.5, 6],
					glow: [7, 11],
				},
				{
					radius: [6.3, 8.35],
					alpha: [0.88, 1],
					float: [4, 6.4],
					curve: [4.8, 7.8],
					glow: [11, 16],
				},
			];
			const between = (range) => range[0] + (range[1] - range[0]) * random();

			return Array.from({ length: 16 }, (_, index) => {
				const layer = layerPattern[index];
				const profile = layers[layer];
				return {
					index,
					layer,
					phase: index / 16,
					baseY: ySlots[index],
					radius: between(profile.radius),
					baseAlpha: between(profile.alpha),
					floatAmplitude: between(profile.float),
					curveAmplitude: between(profile.curve),
					glow: between(profile.glow),
					xDrift: 0.8 + random() * (1.3 + layer * 0.85),
					driftFrequency: 0.62 + random() * 0.72,
					curvePhase: random() * Math.PI * 2,
					twinklePhase: random() * Math.PI * 2,
					twinkleSpeed: 0.88 + random() * 1.05,
					rotation: random() * Math.PI * 2,
					rotationSpeed:
						(0.2 + random() * (0.18 + layer * 0.09)) *
						(random() > 0.5 ? 1 : -1),
					hasTrail: layer > 0 || index % 4 === 0,
					tailScale: 3.2 + random() * 1.7 + layer * 0.75,
				};
			}).sort((a, b) => a.layer - b.layer);
		}

		handleResize() {
			cancelAnimationFrame(this.resizeFrame);
			if (!this.isConnected || !this.canvas || !this.context) return;
			const bounds = this.getBoundingClientRect();
			const width = Math.max(1, Math.round(bounds.width));
			const height = Math.max(1, Math.round(bounds.height));
			const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

			if (
				width !== this.width ||
				height !== this.height ||
				pixelRatio !== this.pixelRatio
			) {
				this.width = width;
				this.height = height;
				this.pixelRatio = pixelRatio;
				this.canvas.width = Math.round(width * pixelRatio);
				this.canvas.height = Math.round(height * pixelRatio);
				this.context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
			}

			this.renderFrame();
		}

		handleFrame(timestamp) {
			if (!this.shouldAnimate()) {
				this.animationFrame = 0;
				return;
			}

			const delta = this.lastTimestamp
				? Math.min(42, timestamp - this.lastTimestamp)
				: 0;
			this.lastTimestamp = timestamp;
			this.hoverAmount +=
				(this.hoverTarget - this.hoverAmount) * Math.min(1, delta / 180);
			const speed = 1 + this.hoverAmount * 0.14;
			this.elapsed += delta * speed;
			this.renderFrame();
			this.animationFrame = requestAnimationFrame(this.handleFrame);
		}

		renderFrame() {
			if (!this.context || !this.width || !this.height) return;
			const context = this.context;
			context.setTransform(this.pixelRatio, 0, 0, this.pixelRatio, 0, 0);
			context.clearRect(0, 0, this.width, this.height);

			const time = this.elapsed / 1000;
			const cycleDuration = 4600;
			const beamDuration = 3800;
			const beamProgress = (this.elapsed % beamDuration) / beamDuration;
			const easedBeam = beamProgress * beamProgress * (3 - 2 * beamProgress);
			const beamX = (-0.16 + easedBeam * 1.32) * this.width;
			const beamSpread = Math.max(24, this.width * 0.13);

			for (const particle of this.particles) {
				const progress = (particle.phase + this.elapsed / cycleDuration) % 1;
				const radius = particle.radius;
				const enterDistance = Math.max(0, Math.min(1, progress / 0.14));
				const exitDistance = Math.max(0, Math.min(1, (1 - progress) / 0.2));
				const enterFade =
					enterDistance * enterDistance * (3 - 2 * enterDistance);
				const exitFade = exitDistance * exitDistance * (3 - 2 * exitDistance);
				const edgeFade = enterFade * exitFade;
				const drift = Math.sin(
					time * particle.driftFrequency + particle.twinklePhase,
				);
				const curveAngle = progress * Math.PI * 2 + particle.curvePhase;
				const rawX =
					radius +
					progress * Math.max(1, this.width - radius * 2) +
					drift * particle.xDrift;
				const x = Math.max(radius, Math.min(this.width - radius, rawX));
				const rawY =
					particle.baseY * this.height +
					Math.sin(curveAngle) * particle.curveAmplitude +
					Math.sin(progress * Math.PI * 2 - time * 0.72) *
						(1.6 + particle.layer * 1.15) +
					drift * particle.floatAmplitude;
				const safeY = radius + Math.min(5, particle.glow * 0.34) + 2;
				const y = Math.max(safeY, Math.min(this.height - safeY, rawY));
				const beamDistance = x - beamX;
				const beamBoost = Math.exp(
					-(beamDistance * beamDistance) / (2 * beamSpread * beamSpread),
				);
				const twinkle =
					0.9 +
					Math.sin(time * particle.twinkleSpeed + particle.twinklePhase) * 0.08;
				const scale =
					0.94 + twinkle * 0.06 + beamBoost * 0.24 + this.hoverAmount * 0.08;
				const alpha = Math.min(
					1,
					particle.baseAlpha *
						edgeFade *
						(twinkle + beamBoost * 0.38 + this.hoverAmount * 0.13),
				);
				const rotation =
					particle.rotation +
					time * particle.rotationSpeed +
					Math.sin(curveAngle) * 0.08;

				if (particle.hasTrail) {
					this.drawTrail(
						context,
						particle,
						x,
						y,
						radius * scale,
						curveAngle,
						alpha,
						beamBoost,
					);
				}

				this.drawStar(
					context,
					particle,
					x,
					y,
					radius * scale,
					rotation,
					alpha,
					beamBoost,
				);
			}
		}

		drawWaveField(context, time) {
			const width = this.width;
			const height = this.height;
			const hoverLift = 1 + this.hoverAmount * 0.12;
			const travelProgress = (this.elapsed % 5600) / 5600;
			const highlightCenter = (-0.22 + travelProgress * 1.44) * width;
			const layers = [
				{
					center: 0.75,
					amplitude: 0.155,
					wavelength: 0.78,
					thickness: 0.31,
					phase: 2.7,
					speed: 1.78,
					fill: "255, 224, 129",
					crest: "255, 241, 185",
					fillAlpha: 0.16,
					crestAlpha: 0.46,
					lineWidth: 1.55,
					glow: 10,
				},
				{
					center: 0.56,
					amplitude: 0.205,
					wavelength: 0.57,
					thickness: 0.265,
					phase: 1.15,
					speed: 2.2,
					fill: "255, 210, 81",
					crest: "255, 247, 201",
					fillAlpha: 0.24,
					crestAlpha: 0.82,
					lineWidth: 2.35,
					glow: 15,
				},
				{
					center: 0.38,
					amplitude: 0.145,
					wavelength: 0.66,
					thickness: 0.205,
					phase: 4.35,
					speed: 2.58,
					fill: "255, 226, 119",
					crest: "255, 253, 224",
					fillAlpha: 0.13,
					crestAlpha: 0.56,
					lineWidth: 1.35,
					glow: 11,
				},
			];

			context.save();
			context.globalCompositeOperation = "source-over";

			layers.forEach((layer, index) => {
				const points = this.createWavePoints(layer, time, hoverLift);
				const lowerPoints = points.map((point) => ({
					x: point.x,
					y:
						point.y +
						height * layer.thickness +
						Math.sin(point.theta + 0.92) * height * layer.amplitude * 0.28,
				}));

				const fillGradient = context.createLinearGradient(
					0,
					height * (layer.center - layer.amplitude),
					0,
					height * (layer.center + layer.thickness + layer.amplitude),
				);
				fillGradient.addColorStop(0, `rgba(${layer.crest}, 0)`);
				fillGradient.addColorStop(
					0.18,
					`rgba(${layer.crest}, ${layer.fillAlpha * (1 + this.hoverAmount * 0.18)})`,
				);
				fillGradient.addColorStop(
					0.55,
					`rgba(${layer.fill}, ${layer.fillAlpha * 0.72})`,
				);
				fillGradient.addColorStop(1, `rgba(${layer.fill}, 0)`);

				context.beginPath();
				context.moveTo(points[0].x, points[0].y);
				points.slice(1).forEach((point) => context.lineTo(point.x, point.y));
				for (let i = lowerPoints.length - 1; i >= 0; i -= 1) {
					context.lineTo(lowerPoints[i].x, lowerPoints[i].y);
				}
				context.closePath();
				context.fillStyle = fillGradient;
				context.fill();

				context.save();
				context.beginPath();
				context.moveTo(lowerPoints[0].x, lowerPoints[0].y);
				lowerPoints
					.slice(1)
					.forEach((point) => context.lineTo(point.x, point.y));
				context.strokeStyle = `rgba(${layer.fill}, ${layer.crestAlpha * 0.36})`;
				context.lineWidth = Math.max(0.9, layer.lineWidth * 0.72);
				context.lineCap = "round";
				context.shadowColor = `rgba(${layer.fill}, 0.22)`;
				context.shadowBlur = layer.glow * 0.65;
				context.stroke();
				context.restore();

				const crestGradient = this.createCrestGradient(
					context,
					layer,
					highlightCenter,
				);
				context.save();
				context.beginPath();
				context.moveTo(points[0].x, points[0].y);
				points.slice(1).forEach((point) => context.lineTo(point.x, point.y));
				context.strokeStyle = crestGradient;
				context.lineWidth = layer.lineWidth + this.hoverAmount * 0.2;
				context.lineCap = "round";
				context.lineJoin = "round";
				context.shadowColor = `rgba(${layer.crest}, ${0.24 + this.hoverAmount * 0.08})`;
				context.shadowBlur = layer.glow + this.hoverAmount * 3;
				context.stroke();
				context.restore();

				if (index === 1) {
					this.drawCrestFoam(context, points, layer, highlightCenter);
				}
			});

			context.restore();
		}

		createWavePoints(layer, time, hoverLift) {
			const points = [];
			const step = Math.max(3, Math.round(this.width / 92));
			const wavelength = Math.max(88, this.width * layer.wavelength);
			const breathing = 0.94 + Math.sin(time * 0.82 + layer.phase) * 0.06;
			const amplitude =
				Math.max(7, this.height * layer.amplitude) * hoverLift * breathing;
			const centerY = this.height * layer.center;

			for (let x = -step; x <= this.width + step; x += step) {
				const theta =
					(x / wavelength) * Math.PI * 2 - time * layer.speed + layer.phase;
				const wave =
					Math.sin(theta) +
					Math.sin(theta * 2 - 0.68) * 0.22 +
					Math.sin(theta * 3 + 0.42) * 0.07;
				points.push({ x, y: centerY + wave * amplitude, theta });
			}

			return points;
		}

		createCrestGradient(context, layer, highlightCenter) {
			const width = Math.max(1, this.width);
			const center = highlightCenter / width;
			const stops = [
				[0, 0],
				[0.06, layer.crestAlpha * 0.5],
				[0.2, layer.crestAlpha * 0.82],
				[0.82, layer.crestAlpha * 0.82],
				[0.95, layer.crestAlpha * 0.42],
				[1, 0],
			];
			const highlightStops = [
				[center - 0.2, layer.crestAlpha * 0.82],
				[center - 0.09, Math.min(0.94, layer.crestAlpha * 1.58)],
				[center, Math.min(1, layer.crestAlpha * 2.05)],
				[center + 0.1, Math.min(0.9, layer.crestAlpha * 1.46)],
				[center + 0.22, layer.crestAlpha * 0.78],
			];

			highlightStops.forEach(([position, alpha]) => {
				if (position > 0 && position < 1) stops.push([position, alpha]);
			});
			stops.sort((a, b) => a[0] - b[0]);

			const gradient = context.createLinearGradient(0, 0, width, 0);
			let lastPosition = -1;
			stops.forEach(([position, alpha]) => {
				const safePosition = Math.max(0, Math.min(1, position));
				if (safePosition <= lastPosition) return;
				gradient.addColorStop(
					safePosition,
					`rgba(${layer.crest}, ${alpha * (1 + this.hoverAmount * 0.12)})`,
				);
				lastPosition = safePosition;
			});
			return gradient;
		}

		drawCrestFoam(context, points, layer, highlightCenter) {
			const spread = Math.max(58, this.width * 0.24);
			context.save();
			context.lineCap = "round";
			context.lineJoin = "round";

			for (let i = 2; i < points.length - 2; i += 1) {
				const point = points[i];
				const previous = points[i - 1];
				const next = points[i + 1];
				const isCrest = point.y < previous.y && point.y <= next.y;
				if (!isCrest) continue;

				const distance = point.x - highlightCenter;
				const envelope = Math.exp(
					-(distance * distance) / (2 * spread * spread),
				);
				const alpha = (0.18 + envelope * 0.58) * (1 + this.hoverAmount * 0.12);
				const arcWidth = Math.max(16, this.width * 0.075);

				context.beginPath();
				context.moveTo(point.x - arcWidth, point.y + 2.2);
				context.quadraticCurveTo(
					point.x - arcWidth * 0.28,
					point.y - 2.8,
					point.x + arcWidth * 0.64,
					point.y + 1.2,
				);
				context.strokeStyle = `rgba(${layer.crest}, ${Math.min(0.9, alpha)})`;
				context.lineWidth = 1.1 + envelope * 0.45;
				context.shadowColor = `rgba(${layer.crest}, ${0.28 + envelope * 0.32})`;
				context.shadowBlur = 5 + envelope * 8;
				context.stroke();
			}

			context.restore();
		}

		sampleWaveLift(x, time, layer) {
			const wavelength = Math.max(88, this.width * (0.71 + layer * 0.065));
			const theta =
				(x / wavelength) * Math.PI * 2 -
				time * (1.26 + layer * 0.11) +
				1.15 +
				layer * 0.78;
			const wave =
				Math.sin(theta) +
				Math.sin(theta * 2 - 0.68) * 0.2 +
				Math.sin(theta * 3 + 0.42) * 0.06;
			return wave * (1.7 + layer * 1.05) * (1 + this.hoverAmount * 0.12);
		}

		drawTrail(context, particle, x, y, radius, curveAngle, alpha, beamBoost) {
			const tailLength = radius * particle.tailScale;
			const slope =
				(particle.curveAmplitude * Math.PI * 2 * Math.cos(curveAngle)) /
				Math.max(this.width, 1);
			const startX = x - tailLength;
			const startY = y - slope * tailLength;
			const gradient = context.createLinearGradient(startX, startY, x, y);
			gradient.addColorStop(0, "rgba(248, 197, 76, 0)");
			gradient.addColorStop(
				1,
				`rgba(248, 192, 59, ${Math.min(0.7, alpha * (0.45 + beamBoost * 0.22))})`,
			);

			context.save();
			context.globalCompositeOperation = "source-over";
			context.strokeStyle = gradient;
			context.lineWidth = Math.max(0.9, radius * 0.48);
			context.lineCap = "round";
			context.shadowColor = `rgba(244, 182, 47, ${0.38 + beamBoost * 0.3})`;
			context.shadowBlur = 5 + beamBoost * 7;
			context.beginPath();
			context.moveTo(startX, startY);
			context.quadraticCurveTo(
				x - tailLength * 0.45,
				y - slope * tailLength * 0.24,
				x - radius * 0.7,
				y,
			);
			context.stroke();
			context.restore();
		}

		drawStar(context, particle, x, y, radius, rotation, alpha, beamBoost) {
			const fillColors = ["255, 220, 125", "250, 200, 76", "246, 185, 50"];
			const fill = fillColors[particle.layer];

			context.save();
			context.translate(x, y);
			context.globalCompositeOperation = "source-over";
			context.shadowColor = `rgba(241, 171, 31, ${0.48 + beamBoost * 0.3})`;
			context.shadowBlur =
				particle.glow + beamBoost * 10 + this.hoverAmount * 3;
			this.traceRoundedStar(context, radius, rotation, 0.18);
			context.fillStyle = `rgba(${fill}, ${alpha})`;
			context.fill();
			context.strokeStyle = `rgba(255, 247, 193, ${Math.min(1, alpha + 0.16)})`;
			context.lineWidth = 0.72 + particle.layer * 0.18;
			context.stroke();
			context.restore();
		}

		traceRoundedStar(context, outerRadius, rotation, rounding) {
			const innerRadius = outerRadius * 0.48;
			const points = Array.from({ length: 10 }, (_, index) => {
				const radius = index % 2 === 0 ? outerRadius : innerRadius;
				const angle = rotation - Math.PI / 2 + (index * Math.PI) / 5;
				return {
					x: Math.cos(angle) * radius,
					y: Math.sin(angle) * radius,
				};
			});
			const first = points[0];
			const last = points[points.length - 1];

			context.beginPath();
			context.moveTo(
				first.x + (last.x - first.x) * rounding,
				first.y + (last.y - first.y) * rounding,
			);

			points.forEach((point, index) => {
				const previous = points[(index + points.length - 1) % points.length];
				const next = points[(index + 1) % points.length];
				const beforeX = point.x + (previous.x - point.x) * rounding;
				const beforeY = point.y + (previous.y - point.y) * rounding;
				const afterX = point.x + (next.x - point.x) * rounding;
				const afterY = point.y + (next.y - point.y) * rounding;
				if (index > 0) context.lineTo(beforeX, beforeY);
				context.quadraticCurveTo(point.x, point.y, afterX, afterY);
			});
			context.closePath();
		}

		shouldAnimate() {
			// 这组粒子是推荐友链的核心视觉提示，不因系统“减少动态效果”而消失；
			// 仅在页面进入后台时暂停，回到页面后由 visibilitychange 自动恢复。
			return !document.hidden;
		}

		updatePlayback() {
			if (this.shouldAnimate()) {
				if (!this.animationFrame) {
					this.lastTimestamp = 0;
					this.animationFrame = requestAnimationFrame(this.handleFrame);
				}
			} else {
				this.stopAnimation();
				this.renderFrame();
			}
		}

		stopAnimation() {
			cancelAnimationFrame(this.animationFrame);
			this.animationFrame = 0;
			this.lastTimestamp = 0;
		}

		handleVisibilityChange() {
			this.updatePlayback();
		}

		handlePointerEnter() {
			this.hoverTarget = 1;
		}

		handlePointerLeave() {
			this.hoverTarget = 0;
		}

		handleFocusIn() {
			this.handlePointerEnter();
		}

		handleFocusOut(event) {
			if (!this.card?.contains(event.relatedTarget)) {
				this.handlePointerLeave();
			}
		}
	}

	customElements.define("recommended-star-flow", RecommendedStarFlow);
}
