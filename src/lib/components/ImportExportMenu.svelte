<script lang="ts">
	import type { Budget } from '$lib/types';
	import { ExportDataSchema } from '$lib/schemas';
	import { replaceBudget } from '$lib/db';
	import { AlertDialog } from 'bits-ui';
	import * as m from '$lib/paraglide/messages';

	let {
		budget,
		onImport,
		headless = false,
		fileInput = $bindable<HTMLInputElement | null>(null)
	}: {
		budget: Budget;
		onImport: (b: Budget) => void;
		headless?: boolean;
		fileInput?: HTMLInputElement | null;
	} = $props();
	let error = $state('');
	let pending = $state<Budget | null>(null); // awaiting confirmation

	function exportBudget() {
		const data = {
			version: 1,
			exportedAt: new Date().toISOString(),
			budget
		};
		const json = JSON.stringify(data, null, 2);
		const blob = new Blob([json], { type: 'application/json' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `alloca-${budget.year}.json`;
		a.click();
		URL.revokeObjectURL(url);
	}

	async function handleFile(e: Event) {
		error = '';
		const file = (e.target as HTMLInputElement).files?.[0];
		if (!file) return;

		try {
			const text = await file.text();
			const raw = JSON.parse(text);
			const result = ExportDataSchema.safeParse(raw);
			if (!result.success) {
				const first = result.error.issues[0];
				error = first
					? m.import_export_error_invalid({ path: first.path.join('.'), message: first.message })
					: 'Invalid file format';
				return;
			}
			// Normalise fields that may be missing in older exports
			const raw_budget = result.data.budget;
			const imported: Budget = {
				...raw_budget,
				currency: raw_budget.currency ?? 'EUR',
				monthlyNotes: raw_budget.monthlyNotes ?? {},
				categories: raw_budget.categories ?? []
			};
			pending = imported;
		} catch {
			error = m.import_export_error_json();
		} finally {
			if (fileInput) fileInput.value = '';
		}
	}

	async function confirmImport() {
		if (!pending) return;
		const snapshot = $state.snapshot(pending) as Budget;
		await replaceBudget(snapshot);
		onImport(snapshot);
		pending = null;
	}

	function cancelImport() {
		pending = null;
	}
</script>

{#if !headless}
<div class="flex items-center gap-2">
	{#if error}
		<span class="max-w-48 truncate text-xs text-red" title={error}>
			{error}
		</span>
	{/if}

	<button
		type="button"
		class="rounded-sm border border-border px-2.5 py-1 text-xs text-muted opacity-60 transition-opacity hover:opacity-90"
		onclick={() => { error = ''; fileInput?.click(); }}
	>
		{m.import()}
	</button>

	<button
		type="button"
		class="rounded-sm border border-border px-2.5 py-1 text-xs text-muted opacity-60 transition-opacity hover:opacity-90"
		onclick={exportBudget}
	>
		{m.export()}
	</button>
</div>
{/if}

<input
	bind:this={fileInput}
	type="file"
	accept=".json"
	class="hidden"
	onchange={handleFile}
/>

<!-- Import confirmation modal -->
<AlertDialog.Root open={pending !== null} onOpenChange={(v) => { if (!v) cancelImport(); }}>
	<AlertDialog.Portal>
		<AlertDialog.Overlay class="fixed inset-0 z-50 bg-overlay" />
		<AlertDialog.Content
			class="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
		>
			<div class="pointer-events-auto flex w-full max-w-sm flex-col gap-4 rounded-radius border border-border bg-surface p-5">
				<div>
					<AlertDialog.Title class="font-semibold">
						{m.import_export_replace_title()}
					</AlertDialog.Title>
					<AlertDialog.Description class="mt-1 text-sm text-muted">
						{m.import_export_replace_body({ name: pending?.name ?? '', year: String(pending?.year ?? '') })}
					</AlertDialog.Description>
				</div>
				<div class="flex justify-end gap-2">
					<AlertDialog.Cancel
						class="rounded-sm px-3 py-1.5 text-sm text-muted opacity-70 transition-opacity hover:opacity-90"
						onclick={cancelImport}
					>{m.cancel()}</AlertDialog.Cancel>
					<AlertDialog.Action
						class="rounded-sm bg-red px-3 py-1.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
						onclick={confirmImport}
					>{m.import_export_replace_confirm()}</AlertDialog.Action>
				</div>
			</div>
		</AlertDialog.Content>
	</AlertDialog.Portal>
</AlertDialog.Root>
