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
				error = 'Invalid file format';
				return;
			}
			await replaceBudget(result.data.budget);
			onImport(result.data.budget);
		} catch {
			error = 'Failed to read file';
		} finally {
			if (fileInput) fileInput.value = '';
		}
	}
</script>

<div class="flex items-center gap-2">
	{#if error}
		<span class="text-xs" style:color="var(--color-red)">{error}</span>
	{/if}

	<button
		type="button"
		class="rounded px-2 py-1 text-xs opacity-70 hover:opacity-100"
		style:color="var(--color-muted)"
		style:border="1px solid var(--color-border)"
		onclick={() => fileInput?.click()}
	>
		Import
	</button>

	<button
		type="button"
		class="rounded px-2 py-1 text-xs opacity-70 hover:opacity-100"
		style:color="var(--color-muted)"
		style:border="1px solid var(--color-border)"
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
