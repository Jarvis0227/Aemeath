export {};

const boardSelector = ".blog-changelog__board";
const gridSelector = ".blog-changelog__grid";
const dialogSelector = ".blog-changelog__dialog";
let gridObserver: ResizeObserver | null = null;
let returnFocusTo: HTMLElement | null = null;
let activeCard: HTMLElement | null = null;
let pendingDialogClose: Promise<void> | null = null;
let finishPendingDialogClose: (() => void) | null = null;
const activeWireAnimations = new Set<() => void>();
const svgNamespace = "http://www.w3.org/2000/svg";

const clearHoverWires = (board?: HTMLElement | null) => {
	for (const cancel of activeWireAnimations) cancel();
	activeWireAnimations.clear();
	board?.querySelectorAll("[data-hover-wire]").forEach((element) => {
		element.remove();
	});
	board?.classList.remove("is-hovering");
	board?.querySelectorAll(".is-active, .is-linked").forEach((element) => {
		element.classList.remove("is-active", "is-linked");
	});
	activeCard = null;
};

const createWirePath = (
	pathData: string,
	className: string,
	withArrow = true,
) => {
	const path = document.createElementNS(svgNamespace, "path");
	path.setAttribute("d", pathData);
	path.setAttribute("class", className);
	if (withArrow) path.setAttribute("marker-end", "url(#blog-changelog-arrow)");
	return path;
};

const drawRelationshipWire = (
	board: HTMLElement,
	svg: SVGSVGElement,
	pathData: string,
	midpoint: { x: number; y: number },
	labelText: string,
	reducedMotion: boolean,
) => {
	const path = createWirePath(
		pathData,
		"blog-changelog__wire blog-changelog__wire--hover",
		false,
	);
	path.dataset.hoverWire = "";
	svg.appendChild(path);

	const label = document.createElement("span");
	label.className = "blog-changelog__wire-label";
	label.dataset.hoverWire = "";
	label.textContent = labelText;
	label.style.left = `${midpoint.x}px`;
	label.style.top = `${midpoint.y}px`;
	board.appendChild(label);

	if (reducedMotion) {
		path.classList.add("is-drawn");
		path.setAttribute("marker-end", "url(#blog-changelog-arrow)");
		label.classList.add("is-in");
		return;
	}

	const length = path.getTotalLength();
	const duration = Math.min(0.75, Math.max(0.35, length / 700));
	const dashLength = 6;
	const gapLength = 5;
	const revealDash = (drawn: number) => {
		const segments: number[] = [];
		let used = 0;
		let isDash = true;
		while (used < drawn) {
			const take = Math.min(isDash ? dashLength : gapLength, drawn - used);
			segments.push(take);
			used += take;
			isDash = !isDash;
		}
		if (segments.length === 0) segments.push(0);
		if (segments.length % 2 === 0) segments.push(0);
		segments.push(length + dashLength + gapLength);
		path.style.strokeDasharray = segments.join(" ");
	};

	const arrow = document.createElementNS(svgNamespace, "polygon");
	arrow.setAttribute("points", "-8.5,-4.5 0,0 -8.5,4.5");
	arrow.setAttribute("class", "blog-changelog__wire-arrow");
	arrow.dataset.hoverWire = "";
	svg.appendChild(arrow);
	const startTime = performance.now();
	let frame = 0;
	const cancel = () => {
		cancelAnimationFrame(frame);
		arrow.remove();
	};
	const tick = (now: number) => {
		const progress = Math.min(1, (now - startTime) / (duration * 1000));
		const drawn = length * (1 - (1 - progress) ** 3);
		revealDash(drawn);
		const tip = path.getPointAtLength(drawn);
		const back = path.getPointAtLength(Math.max(0, drawn - 1));
		const forward = path.getPointAtLength(Math.min(length, drawn + 1));
		const angle =
			(Math.atan2(forward.y - back.y, forward.x - back.x) * 180) / Math.PI;
		arrow.setAttribute(
			"transform",
			`translate(${tip.x} ${tip.y}) rotate(${angle})`,
		);

		if (progress < 1) {
			frame = requestAnimationFrame(tick);
			return;
		}

		activeWireAnimations.delete(cancel);
		path.style.strokeDasharray = "";
		path.classList.add("is-drawn");
		path.setAttribute("marker-end", "url(#blog-changelog-arrow)");
		arrow.remove();
		label.classList.add("is-in");
	};
	frame = requestAnimationFrame(tick);
	activeWireAnimations.add(cancel);
};

const drawRelationshipWires = (active: HTMLElement) => {
	const board = active.closest<HTMLElement>(boardSelector);
	const graph = active.closest<HTMLElement>(".blog-changelog__graph");
	const svg = graph?.querySelector<SVGSVGElement>(
		".blog-changelog__connectors",
	);
	if (!board || !graph || !svg) return;
	clearHoverWires(board);
	activeCard = active;
	board.classList.add("is-hovering");
	active.classList.add("is-active");
	const activeIndex = Number(active.dataset.index);
	const fromRect = active.getBoundingClientRect();
	const graphRect = graph.getBoundingClientRect();
	const from = {
		x: fromRect.left - graphRect.left + fromRect.width / 2,
		y: fromRect.top - graphRect.top + fromRect.height / 2,
	};
	const links = JSON.parse(active.dataset.links || "[]") as Array<{
		t: number;
		p: string[];
	}>;
	const reducedMotion = window.matchMedia(
		"(prefers-reduced-motion: reduce)",
	).matches;

	for (const link of links) {
		const target = board.querySelector<HTMLElement>(
			`[data-changelog-card][data-index="${link.t}"]`,
		);
		if (!target) continue;
		target.classList.add("is-linked");
		const targetRect = target.getBoundingClientRect();
		const to = {
			x: targetRect.left - graphRect.left + targetRect.width / 2,
			y: targetRect.top - graphRect.top + targetRect.height / 2,
		};
		const dx = to.x - from.x;
		const dy = to.y - from.y;
		const distance = Math.hypot(dx, dy) || 1;
		const curve = Math.min(56, distance * 0.12);
		const control = {
			x: (from.x + to.x) / 2 - (dy / distance) * curve,
			y: (from.y + to.y) / 2 + (dx / distance) * curve,
		};
		const midpoint = {
			x: from.x * 0.25 + control.x * 0.5 + to.x * 0.25,
			y: from.y * 0.25 + control.y * 0.5 + to.y * 0.25,
		};
		const pointsTowardNewer = link.t < activeIndex;
		const start = pointsTowardNewer ? from : to;
		const end = pointsTowardNewer ? to : from;
		const label = link.p.join("、");
		drawRelationshipWire(
			graph,
			svg,
			`M ${start.x} ${start.y} Q ${control.x} ${control.y} ${end.x} ${end.y}`,
			midpoint,
			label,
			reducedMotion,
		);
	}
};

const updateSnakeLayout = () => {
	const board = document.querySelector<HTMLElement>(boardSelector);
	const graph = board?.querySelector<HTMLElement>(".blog-changelog__graph");
	const grid = graph?.querySelector<HTMLOListElement>(gridSelector);
	const svg = graph?.querySelector<SVGSVGElement>(
		".blog-changelog__connectors",
	);
	if (!board || !graph || !grid || !svg) return;

	const items = Array.from(grid.children) as HTMLElement[];
	if (items.length === 0) return;
	items.forEach((item) => {
		item.style.removeProperty("order");
	});
	const columns = getComputedStyle(grid)
		.gridTemplateColumns.split(" ")
		.filter(Boolean).length;
	items.forEach((item, index) => {
		const row = Math.floor(index / columns);
		const position = index % columns;
		const visualColumn = row % 2 === 0 ? position : columns - position - 1;
		item.style.order = String(row * columns + visualColumn);
	});

	const width = graph.clientWidth;
	const height = graph.scrollHeight;
	svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
	svg.setAttribute("width", String(width));
	svg.setAttribute("height", String(height));
	clearHoverWires(board);
};

const initializeChangelog = () => {
	gridObserver?.disconnect();
	const board = document.querySelector<HTMLElement>(boardSelector);
	if (!board) return;
	if (board.dataset.view === "graph") requestAnimationFrame(updateSnakeLayout);
	gridObserver = new ResizeObserver(() =>
		requestAnimationFrame(updateSnakeLayout),
	);
	gridObserver.observe(board);
};

const setChangelogView = (view: string | undefined) => {
	if (view !== "timeline" && view !== "graph") return;
	const board = document.querySelector<HTMLElement>(boardSelector);
	if (!board) return;
	board.dataset.view = view;
	document
		.querySelectorAll<HTMLButtonElement>("[data-changelog-view]")
		.forEach((button) => {
			button.setAttribute(
				"aria-pressed",
				String(button.dataset.changelogView === view),
			);
		});
	if (view === "graph") requestAnimationFrame(updateSnakeLayout);
	else clearHoverWires(board);
};

const openEntry = (index: number) => {
	const dialog = document.querySelector<HTMLDialogElement>(dialogSelector);
	const body = dialog?.querySelector<HTMLElement>("[data-changelog-body]");
	const template = document.querySelector<HTMLTemplateElement>(
		`template[data-changelog-template="${index}"]`,
	);
	if (!dialog || !body || !template) return;
	body.replaceChildren(template.content.cloneNode(true));
	if (!dialog.open) {
		dialog.classList.remove("is-closing");
		dialog.showModal();
	}
	body
		.querySelector<HTMLElement>(".blog-changelog__entry-title")
		?.focus({ preventScroll: true });
};

const closeEntry = (immediate = false): Promise<void> => {
	const dialog = document.querySelector<HTMLDialogElement>(dialogSelector);
	if (!dialog?.open) return Promise.resolve();
	if (pendingDialogClose) {
		const closing = pendingDialogClose;
		if (immediate) finishPendingDialogClose?.();
		return closing;
	}
	if (
		immediate ||
		window.matchMedia("(prefers-reduced-motion: reduce)").matches
	) {
		dialog.close();
		return Promise.resolve();
	}

	pendingDialogClose = new Promise<void>((resolve) => {
		let finished = false;
		let fallbackTimer: number;
		const finish = () => {
			if (finished) return;
			finished = true;
			window.clearTimeout(fallbackTimer);
			dialog.removeEventListener("animationend", onAnimationEnd);
			dialog.classList.remove("is-closing");
			if (dialog.open) dialog.close();
			pendingDialogClose = null;
			finishPendingDialogClose = null;
			resolve();
		};
		const onAnimationEnd = (event: AnimationEvent) => {
			if (
				event.target === dialog &&
				event.animationName === "blog-changelog-dialog-out"
			)
				finish();
		};
		finishPendingDialogClose = finish;
		dialog.addEventListener("animationend", onAnimationEnd);
		dialog.classList.add("is-closing");
		fallbackTimer = window.setTimeout(finish, 280);
	});
	return pendingDialogClose;
};

if (document.documentElement.dataset.blogChangelogBound !== "true") {
	document.documentElement.dataset.blogChangelogBound = "true";
	for (const eventName of [
		"astro:page-load",
		"astro:after-swap",
		"swup:content:replaced",
		"swup:contentReplaced",
		"swup:content:replace",
		"swup:page:view",
	]) {
		document.addEventListener(eventName, initializeChangelog);
	}
	window.addEventListener("resize", initializeChangelog);
	document.addEventListener("astro:before-swap", () => {
		gridObserver?.disconnect();
		gridObserver = null;
		clearHoverWires(document.querySelector<HTMLElement>(boardSelector));
		returnFocusTo = null;
		void closeEntry(true);
	});
	document.addEventListener("pointerover", (event) => {
		const target = event.target;
		if (!(target instanceof Element)) return;
		const card = target.closest<HTMLElement>("[data-changelog-card]");
		if (card && card !== activeCard) drawRelationshipWires(card);
	});
	document.addEventListener("pointerout", (event) => {
		const target = event.target;
		if (!(target instanceof Element)) return;
		const board = target.closest<HTMLElement>(boardSelector);
		const next = event.relatedTarget;
		if (board && (!(next instanceof Node) || !board.contains(next)))
			clearHoverWires(board);
	});
	document.addEventListener("focusin", (event) => {
		const target = event.target;
		if (!(target instanceof Element)) return;
		const card = target.closest<HTMLElement>("[data-changelog-card]");
		if (card && card !== activeCard) drawRelationshipWires(card);
	});
	document.addEventListener("focusout", (event) => {
		const target = event.target;
		if (!(target instanceof Element)) return;
		const board = target.closest<HTMLElement>(boardSelector);
		const next = event.relatedTarget;
		if (board && (!(next instanceof Node) || !board.contains(next)))
			clearHoverWires(board);
	});
	document.addEventListener("click", (event) => {
		const target = event.target;
		if (!(target instanceof Element)) return;
		const viewButton = target.closest<HTMLButtonElement>(
			"[data-changelog-view]",
		);
		if (viewButton) {
			setChangelogView(viewButton.dataset.changelogView);
			return;
		}
		const relatedButton = target.closest<HTMLElement>(
			"[data-changelog-related]",
		);
		if (relatedButton) {
			const relatedIndex = Number(relatedButton.dataset.changelogRelated);
			const board = document.querySelector<HTMLElement>(boardSelector);
			const targetSelector =
				board?.dataset.view === "timeline"
					? "[data-changelog-timeline-entry]"
					: "[data-changelog-card]";
			const relatedCard = board?.querySelector<HTMLElement>(
				`${targetSelector}[data-index="${relatedIndex}"]`,
			);
			returnFocusTo = null;
			void closeEntry().then(() => {
				if (!relatedCard?.isConnected) return;
				relatedCard.scrollIntoView({ behavior: "smooth", block: "center" });
				relatedCard.classList.add("is-flash");
				window.setTimeout(() => relatedCard.classList.remove("is-flash"), 1300);
			});
			return;
		}
		const openButton = target.closest<HTMLElement>("[data-changelog-open]");
		if (openButton) {
			const dialog = document.querySelector<HTMLDialogElement>(dialogSelector);
			if (!dialog?.open) returnFocusTo = openButton;
			openEntry(Number(openButton.dataset.changelogOpen));
			return;
		}
		if (target.closest("[data-changelog-close]")) {
			void closeEntry();
		}
	});
	document.addEventListener(
		"cancel",
		(event) => {
			if (
				!(event.target instanceof HTMLDialogElement) ||
				!event.target.matches(dialogSelector)
			)
				return;
			event.preventDefault();
			void closeEntry();
		},
		true,
	);
	document.addEventListener(
		"close",
		(event) => {
			if (
				!(event.target instanceof HTMLDialogElement) ||
				!event.target.matches(dialogSelector)
			)
				return;
			if (returnFocusTo?.isConnected) returnFocusTo.focus();
			returnFocusTo = null;
		},
		true,
	);
	document.addEventListener("click", (event) => {
		if (
			event.target instanceof HTMLDialogElement &&
			event.target.matches(dialogSelector)
		)
			void closeEntry();
	});
}

initializeChangelog();
