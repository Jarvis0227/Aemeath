<script lang="ts">
import { onMount } from "svelte";

const STORAGE_KEY = "firefly-font-mode";
type FontMode = "wenkai" | "original";

let mode: FontMode = "wenkai";

const applyFontMode = (nextMode: FontMode) => {
	mode = nextMode;
	document.documentElement.dataset.fontMode = nextMode;
	localStorage.setItem(STORAGE_KEY, nextMode);
};

const toggleFontMode = () => {
	applyFontMode(mode === "wenkai" ? "original" : "wenkai");
};

onMount(() => {
	const savedMode = localStorage.getItem(STORAGE_KEY);
	applyFontMode(savedMode === "original" ? "original" : "wenkai");
});
</script>

<button
	type="button"
	id="font-switch"
	class="font-switch-btn btn-plain scale-animation rounded-lg h-11 w-11 active:scale-90"
	aria-label={mode === "wenkai" ? "切换到原字体" : "切换到霞鹜文楷"}
	title={mode === "wenkai" ? "切换到原字体" : "切换到霞鹜文楷"}
	aria-pressed={mode === "wenkai"}
	on:click={toggleFontMode}
	>
  <span
    class="inline-flex items-center justify-center text-[1.1rem] font-semibold leading-none"
    aria-hidden="true"
  >
    文
  </span>
</button>

<style>
	.font-switch-btn {
		position: relative;
	}

	.font-switch-btn::after {
		content: "";
		position: absolute;
		right: 0.55rem;
		bottom: 0.55rem;
		width: 0.38rem;
		height: 0.38rem;
		border-radius: 999px;
		background: var(--primary);
		box-shadow: 0 0 0 2px var(--card-bg);
		opacity: 0;
		transform: scale(0.6);
		transition:
			opacity 0.18s ease-out,
			transform 0.18s ease-out;
	}

	:global(:root[data-font-mode="wenkai"]) .font-switch-btn::after {
		opacity: 1;
		transform: scale(1);
	}
</style>
