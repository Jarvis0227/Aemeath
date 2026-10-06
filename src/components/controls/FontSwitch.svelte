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

onMount(() => {
	const savedMode = localStorage.getItem(STORAGE_KEY);
	applyFontMode(savedMode === "original" ? "original" : "wenkai");
});
</script>

<div class="font-switch-options" role="group" aria-label="字体样式">
	<button
		type="button"
		class="font-switch-option"
		class:font-switch-option-active={mode === "original"}
		aria-pressed={mode === "original"}
		onclick={() => applyFontMode("original")}
	>
		默认字体
	</button>
	<button
		type="button"
		class="font-switch-option"
		class:font-switch-option-active={mode === "wenkai"}
		aria-pressed={mode === "wenkai"}
		onclick={() => applyFontMode("wenkai")}
	>
		霞鹜文楷
	</button>
</div>

<style>
	.font-switch-options {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 0.5rem;
	}

	.font-switch-option {
		min-width: 0;
		min-height: 2.5rem;
		padding: 0.625rem 0.5rem;
		border: 1px solid var(--glass-control-border);
		border-radius: 0.625rem;
		background: transparent;
		color: var(--primary);
		opacity: 0.7;
		font-size: 0.875rem;
		font-weight: 600;
		text-align: center;
		transition:
			background-color 180ms ease,
			color 180ms ease,
			opacity 180ms ease,
			transform 180ms ease;
	}

	.font-switch-option:hover:not(.font-switch-option-active) {
		background: transparent;
		color: var(--primary);
		opacity: 1;
	}

	.font-switch-option-active {
		border-color: var(--primary);
		background: transparent;
		color: var(--primary);
		opacity: 1;
		font-weight: 700;
	}

	.font-switch-option-active:hover {
		background: transparent;
	}

	.font-switch-option:active {
		transform: scale(0.97);
	}

	.font-switch-option:focus-visible {
		outline: 2px solid var(--primary);
		outline-offset: 2px;
	}
</style>
