<script lang="ts">
	import { Dialog } from 'bits-ui';
	import * as m from '$lib/paraglide/messages';

	interface Props {
		open: boolean;
		onStartBudgeting: () => void;
		onStartTour: () => void;
	}

	let { open, onStartBudgeting, onStartTour }: Props = $props();
</script>

<Dialog.Root bind:open>
	<Dialog.Portal>
		<Dialog.Overlay class="fixed inset-0 z-50 bg-overlay" />
		<Dialog.Content
			interactOutsideBehavior="ignore"
			class="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
		>
			<div class="pointer-events-auto flex w-full max-w-sm flex-col gap-5 rounded-radius border border-border bg-surface p-6">
				<div class="flex flex-col gap-2">
					<Dialog.Title class="text-lg font-semibold text-text">
						{m.welcome_title()}
					</Dialog.Title>
					<p class="text-sm leading-relaxed whitespace-pre-line text-muted">
						{m.welcome_body()}
					</p>
				</div>

				<div class="flex flex-col gap-2">
					<button
						type="button"
						class="w-full rounded-sm bg-accent px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
						onclick={onStartBudgeting}
					>
						{m.welcome_start()}
					</button>
					<button
						type="button"
						class="w-full rounded-sm px-4 py-2 text-sm text-muted transition-opacity hover:opacity-70"
						onclick={onStartTour}
					>
						{m.welcome_tour()}
					</button>
				</div>

				<p class="text-center text-xs text-muted">
					{m.welcome_footer()}
				</p>
			</div>
		</Dialog.Content>
	</Dialog.Portal>
</Dialog.Root>
