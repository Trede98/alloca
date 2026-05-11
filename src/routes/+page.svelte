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
		budget = existing;
		loading = false;
	});

	// Autosave: persist whenever budget changes (skips initial null state)
	$effect(() => {
		if (budget) {
			saveBudget(budget);
		}
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
</script>

{#if loading}
	<div class="flex h-screen items-center justify-center" style:color="var(--color-muted)">
		Loading…
	</div>
{:else if budget}
	<BudgetDashboard
		{budget}
		{onAddEntry}
		{onUpdateEntry}
		{onDeleteEntry}
		{onSetOverride}
		{onRemoveOverride}
	/>
{/if}
