<script lang="ts">
	import { onMount } from 'svelte';
	import { loadBudget, saveBudget, replaceBudget } from '$lib/db';
	import { createEmptyBudget, createSeedBudget } from '$lib/seed';
	import {
		addEntry,
		updateEntry,
		deleteEntry,
		setOverride,
		removeOverride,
		addCategory,
		updateCategory,
		deleteCategory
	} from '$lib/budget';
	import BudgetDashboard from '$lib/components/BudgetDashboard.svelte';
	import type { Budget, Entry } from '$lib/types';
	import type { NewEntryInput } from '$lib/budget';

	let budget = $state<Budget | null>(null);
	let loading = $state(true);

	// Clear flow (single modal)
	let clearOpen = $state(false);
	let clearName = $state('');

	// Category error state
	let categoryError = $state('');

	onMount(async () => {
		let existing = await loadBudget();
		if (!existing) {
			existing = createSeedBudget();
			await saveBudget(existing);
		}
		// Migrate legacy budgets missing fields
		if (!existing.currency) existing = { ...existing, currency: 'EUR' };
		if (!existing.monthlyNotes) existing = { ...existing, monthlyNotes: {} };
		if (!existing.categories) existing = { ...existing, categories: [] };
		budget = existing;
		loading = false;
	});

	$effect(() => {
		if (budget) saveBudget($state.snapshot(budget) as Budget);
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

	function onAddCategory(name: string) {
		if (!budget) return;
		budget = addCategory(budget, name);
	}

	function onUpdateCategory(id: string, name: string) {
		if (!budget) return;
		budget = updateCategory(budget, id, name);
	}

	function onDeleteCategory(id: string) {
		if (!budget) return;
		try {
			budget = deleteCategory(budget, id);
		} catch (e) {
			categoryError = e instanceof Error ? e.message : 'Cannot delete category';
		}
	}

	function onClearCategoryError() {
		categoryError = '';
	}

	function startReset() {
		clearName = '';
		clearOpen = true;
	}

	function cancelClear() {
		clearOpen = false;
	}

	async function executeClear() {
		const newBudget = createEmptyBudget(clearName.trim() || 'My Budget');
		await replaceBudget(newBudget);
		budget = newBudget;
		clearOpen = false;
	}

	const overlayStyle = `position:fixed;inset:0;z-index:60;display:flex;align-items:center;justify-content:center;padding:1rem;background:rgba(0,0,0,0.55)`;
	const panelClass = 'flex w-full max-w-sm flex-col gap-4 rounded-xl border p-5 shadow-xl';
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
		{onAddCategory}
		{onUpdateCategory}
		{onDeleteCategory}
		{categoryError}
		{onClearCategoryError}
		{startReset}
	/>
{/if}

<!-- Clear budget — single unified modal -->
{#if clearOpen}
	<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
	<div
		role="dialog"
		aria-modal="true"
		style={overlayStyle}
		onclick={(e) => e.target === e.currentTarget && cancelClear()}
		onkeydown={(e) => e.key === 'Escape' && cancelClear()}
		tabindex="-1"
	>
		<div
			class={panelClass}
			style:background-color="var(--color-surface)"
			style:border-color="var(--color-border)"
		>
			<div>
				<h2 class="font-semibold">Clear Budget</h2>
				<p class="mt-1 text-sm" style:color="var(--color-muted)">
					This will remove all entries and categories. Enter a name for your new budget to continue.
				</p>
			</div>
			<input
				bind:value={clearName}
				type="text"
				placeholder="My Budget"
				class="rounded-lg border px-2.5 py-1.5 text-sm outline-none focus:ring-1 focus:ring-blue-500/40"
				style:background-color="var(--color-bg)"
				style:border-color="var(--color-border)"
				style:color="var(--color-text)"
				onkeydown={(e) => e.key === 'Enter' && executeClear()}
			/>
			<div class="flex justify-end gap-2">
				<button
					type="button"
					class="rounded-lg px-3 py-1.5 text-sm transition-opacity hover:opacity-80"
					style:color="var(--color-muted)"
					onclick={cancelClear}
				>
					Cancel
				</button>
				<button
					type="button"
					class="rounded-lg px-4 py-1.5 text-sm font-medium transition-opacity hover:opacity-90"
					style:background-color="var(--color-red)"
					style:color="white"
					onclick={executeClear}
				>
					Clear &amp; Create
				</button>
			</div>
		</div>
	</div>
{/if}
