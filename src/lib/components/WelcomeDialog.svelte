<script lang="ts">
	import * as m from '$lib/paraglide/messages';

	interface Props {
		open: boolean;
		onStartBudgeting: () => void;
		onStartTour: () => void;
	}

	let { open, onStartBudgeting, onStartTour }: Props = $props();
</script>

{#if open}
	<div
		role="dialog"
		aria-modal="true"
		aria-labelledby="welcome-title"
		class="fixed inset-0 z-50 flex items-center justify-center p-4"
		style:background="var(--overlay-bg)"
	>
		<div
			class="flex w-full max-w-sm flex-col gap-5 border p-6"
			style:border-radius="var(--radius)"
			style:background-color="var(--color-surface)"
			style:border-color="var(--color-border)"
			style:box-shadow="var(--shadow-modal)"
		>
			<div class="flex flex-col gap-2">
				<h2 id="welcome-title" class="text-lg font-semibold" style:color="var(--color-text)">
					{m.welcome_title()}
				</h2>
				<p class="text-sm leading-relaxed whitespace-pre-line" style:color="var(--color-muted)">
					{m.welcome_body()}
				</p>
			</div>

			<div class="flex flex-col gap-2">
				<button
					type="button"
					class="w-full px-4 py-2 text-sm font-medium transition-opacity hover:opacity-90"
					style:border-radius="var(--radius-sm)"
					style:background-color="var(--color-accent)"
					style:color="white"
					onclick={onStartBudgeting}
				>
					{m.welcome_start()}
				</button>
				<button
					type="button"
					class="w-full px-4 py-2 text-sm transition-opacity hover:opacity-70"
					style:border-radius="var(--radius-sm)"
					style:color="var(--color-muted)"
					onclick={onStartTour}
				>
					{m.welcome_tour()}
				</button>
			</div>

			<p class="text-center text-xs" style:color="var(--color-muted)">
				{m.welcome_footer()}
			</p>
		</div>
	</div>
{/if}
