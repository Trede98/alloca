<script lang="ts">
	import type { Budget } from '$lib/types';
	import { ExportDataSchema } from '$lib/schemas';
	import { replaceBudget } from '$lib/db';

	let {
		budget,
		onImport
	}: {
		budget: Budget;
		onImport: (b: Budget) => void;
	} = $props();

	let fileInput = $state<HTMLInputElement | null>(null);
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
				error = first ? `Invalid file: ${first.path.join('.')} — ${first.message}` : 'Invalid file format';
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
			error = 'Could not read file — make sure it is valid JSON';
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

<div class="flex items-center gap-2">
	{#if error}
		<span class="max-w-48 truncate text-xs" style:color="var(--color-red)" title={error}>
			{error}
		</span>
	{/if}

	<button
		type="button"
		class="rounded border px-2.5 py-1 text-xs opacity-70 transition-opacity hover:opacity-100"
		style:color="var(--color-muted)"
		style:border-color="var(--color-border)"
		onclick={() => { error = ''; fileInput?.click(); }}
	>
		Import
	</button>

	<button
		type="button"
		class="rounded border px-2.5 py-1 text-xs opacity-70 transition-opacity hover:opacity-100"
		style:color="var(--color-muted)"
		style:border-color="var(--color-border)"
		onclick={exportBudget}
	>
		Export
	</button>

	<input
		bind:this={fileInput}
		type="file"
		accept=".json"
		class="hidden"
		onchange={handleFile}
	/>
</div>

<!-- Import confirmation modal -->
{#if pending}
	<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
	<div
		role="dialog"
		aria-modal="true"
		tabindex="-1"
		class="fixed inset-0 z-50 flex items-center justify-center p-4"
		style:background-color="rgba(0,0,0,0.6)"
		onkeydown={(e) => e.key === 'Escape' && cancelImport()}
	>
		<div
			class="flex w-full max-w-sm flex-col gap-4 rounded-xl border p-5 shadow-xl"
			style:background-color="var(--color-surface)"
			style:border-color="var(--color-border)"
		>
			<div>
				<h2 class="font-semibold">Replace budget?</h2>
				<p class="mt-1 text-sm" style:color="var(--color-muted)">
					This will replace your current budget with <strong style:color="var(--color-text)">{pending.name} ({pending.year})</strong>. This action cannot be undone.
				</p>
			</div>
			<div class="flex justify-end gap-2">
				<button
					type="button"
					class="rounded px-3 py-1.5 text-sm"
					style:color="var(--color-muted)"
					onclick={cancelImport}
				>
					Cancel
				</button>
				<button
					type="button"
					class="rounded px-3 py-1.5 text-sm font-medium"
					style:background-color="var(--color-red)"
					style:color="white"
					onclick={confirmImport}
				>
					Replace budget
				</button>
			</div>
		</div>
	</div>
{/if}
