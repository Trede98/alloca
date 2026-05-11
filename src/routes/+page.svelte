<script lang="ts">
	import { onMount } from 'svelte';
	import { loadBudget, saveBudget } from '$lib/db';
	import { createSeedBudget } from '$lib/seed';
	import {
		addEntry,
		updateEntry,
		deleteEntry,
		setOverride,
		removeOverride
	} from '$lib/budget';
	import BudgetDashboard from '$lib/components/BudgetDashboard.svelte';
	import type { Budget, Entry } from '$lib/types';
	import type { NewEntryInput } from '$lib/budget';

	let budget = $state<Budget | null>(null);
	let loading = $state(true);

	onMount(async () => {
		let existing = await loadBudget();
		if (!existing) {
			existing = createSeedBudget();
			await saveBudget(existing);
		}
		// Migrate legacy budgets missing new fields
		if (!existing.currency) existing = { ...existing, currency: 'EUR' };
		if (!existing.monthlyNotes) existing = { ...existing, monthlyNotes: {} };
		budget = existing;
		loading = false;
	});

	$effect(() => {
		if (budget) saveBudget(budget);
	});

	function onAddEntry(input: NewEntryInput) {
		if (!budget) return;
		budget = addEntry(budget, input);
	}

	function onUpdateEntry(id: string, patch: Partial<Omit<Entry, 'id' | 'monthlyOverrides'>>) {
		if (!budget) return;
		budget = updateEntry(budget, id, patch);
	}

	function onDeleteEntry(id: string) {
		if (!budget) return;
		budget = deleteEntry(budget, id);
	}

	function onSetOverride(entryId: string, month: number, amount: number) {
		if (!budget) return;
		budget = setOverride(budget, entryId, month, amount);
	}

	function onRemoveOverride(entryId: string, month: number) {
		if (!budget) return;
		budget = removeOverride(budget, entryId, month);
	}

	function onImport(imported: Budget) {
		budget = imported;
	}

	function onBudgetChange(updated: Budget) {
		budget = updated;
	}
</script>

{#if loading}
	<div
		class="flex h-screen flex-col items-center justify-center gap-4"
		style:background-color="var(--color-bg)"
	>
		<div class="flex gap-1.5">
			{#each [0, 1, 2] as i}
				<div
					class="h-2 w-2 animate-bounce rounded-full"
					style:background-color="var(--color-muted)"
					style:animation-delay="{i * 120}ms"
				></div>
			{/each}
		</div>
		<span class="text-sm" style:color="var(--color-muted)">Loading budget…</span>
	</div>
{:else if budget}
	<BudgetDashboard
		{budget}
		{onAddEntry}
		{onUpdateEntry}
		{onDeleteEntry}
		{onSetOverride}
		{onRemoveOverride}
		{onImport}
		{onBudgetChange}
	/>
{/if}
