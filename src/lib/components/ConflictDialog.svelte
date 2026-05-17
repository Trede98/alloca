<script lang="ts">
	import { AlertDialog } from 'bits-ui';
	import type { Budget } from '$lib/types';
	import { getSyncState, resolveConflict } from '$lib/sync';
	import * as m from '$lib/paraglide/messages';

	let { onImport }: { onImport: (b: Budget) => void } = $props();

	const syncState = $derived(getSyncState());
	const conflict = $derived(syncState.pendingConflict);

	async function choose(choice: 'keep-local' | 'load-remote' | 'export-then-load') {
		await resolveConflict(choice, onImport);
	}
</script>

<AlertDialog.Root
	open={conflict !== null}
	onOpenChange={(v) => {
		if (!v && conflict !== null) choose('keep-local');
	}}
>
	<AlertDialog.Portal>
		<AlertDialog.Overlay class="fixed inset-0 z-50 bg-overlay" />
		<AlertDialog.Content
			class="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
		>
			<div
				class="pointer-events-auto flex w-full max-w-sm flex-col gap-4 rounded-radius border border-border bg-surface p-5"
			>
				<div>
					<AlertDialog.Title class="font-semibold">
						{m.sync_conflict_title()}
					</AlertDialog.Title>
					<AlertDialog.Description class="mt-1 text-sm text-muted">
						{m.sync_conflict_body()}
					</AlertDialog.Description>
					{#if conflict}
						<div class="mt-2 flex gap-4 text-xs text-muted">
							<span>Local: {new Date(conflict.localBudget.updatedAt).toLocaleString()}</span>
							<span>Cloud: {new Date(conflict.remoteBudget.updatedAt).toLocaleString()}</span>
						</div>
					{/if}
				</div>

				<div class="flex flex-col gap-2">
					<AlertDialog.Action
						class="rounded-sm bg-accent px-3 py-2 text-sm font-medium text-accent-fg transition-opacity hover:opacity-90"
						onclick={() => choose('keep-local')}
					>
						{m.sync_conflict_keep_local()}
					</AlertDialog.Action>
					<AlertDialog.Action
						class="rounded-sm border border-border px-3 py-2 text-sm text-text transition-colors hover:bg-surface-hover"
						onclick={() => choose('load-remote')}
					>
						{m.sync_conflict_load_remote()}
					</AlertDialog.Action>
					<AlertDialog.Action
						class="rounded-sm border border-border px-3 py-2 text-sm text-text transition-colors hover:bg-surface-hover"
						onclick={() => choose('export-then-load')}
					>
						{m.sync_conflict_export_then_load()}
					</AlertDialog.Action>
					<AlertDialog.Cancel
						class="mt-1 rounded-sm px-3 py-1.5 text-sm text-muted opacity-70 transition-opacity hover:opacity-90"
					>
						{m.cancel()}
					</AlertDialog.Cancel>
				</div>
			</div>
		</AlertDialog.Content>
	</AlertDialog.Portal>
</AlertDialog.Root>
