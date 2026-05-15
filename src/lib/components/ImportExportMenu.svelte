<script lang="ts">
	import type { Budget } from '$lib/types';
	import { ExportDataSchema } from '$lib/schemas';
	import { replaceBudget } from '$lib/db';
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
		<span class="max-w-48 truncate text-xs" style:color="var(--color-red)" title={error}>
			{error}
		</span>
	{/if}

	<button
		type="button"
		class="border px-2.5 py-1 text-xs opacity-60 transition-opacity hover:opacity-90"
		style:border-radius="var(--radius-sm)"
		style:color="var(--color-muted)"
		style:border-color="var(--color-border)"
		onclick={() => { error = ''; fileInput?.click(); }}
	>
		{m.import()}
	</button>

	<button
		type="button"
		class="border px-2.5 py-1 text-xs opacity-60 transition-opacity hover:opacity-90"
		style:border-radius="var(--radius-sm)"
		style:color="var(--color-muted)"
		style:border-color="var(--color-border)"
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
{#if pending}
	<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
	<div
		role="dialog"
		aria-modal="true"
		tabindex="-1"
		class="fixed inset-0 z-50 flex items-center justify-center p-4"
		style:background-color="var(--overlay-bg)"
		onkeydown={(e) => e.key === 'Escape' && cancelImport()}
	>
		<div
			class="flex w-full max-w-sm flex-col gap-4 border p-5"
			style:border-radius="var(--radius)"
			style:background-color="var(--color-surface)"
			style:border-color="var(--color-border)"
			style:box-shadow="var(--shadow-modal)"
		>
			<div>
				<h2 class="font-semibold">{m.import_export_replace_title()}</h2>
				<p class="mt-1 text-sm" style:color="var(--color-muted)">
					{m.import_export_replace_body({ name: pending.name, year: String(pending.year) })}
				</p>
			</div>
			<div class="flex justify-end gap-2">
				<button
					type="button"
					class="px-3 py-1.5 text-sm opacity-70 transition-opacity hover:opacity-90"
					style:border-radius="var(--radius-sm)"
					style:color="var(--color-muted)"
					onclick={cancelImport}
				>
					{m.cancel()}
				</button>
				<button
					type="button"
					class="px-3 py-1.5 text-sm font-medium transition-opacity hover:opacity-90"
					style:border-radius="var(--radius-sm)"
					style:background-color="var(--color-red)"
					style:color="white"
					onclick={confirmImport}
				>
					{m.import_export_replace_confirm()}
				</button>
			</div>
		</div>
	</div>
{/if}
