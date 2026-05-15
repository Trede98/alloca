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
		skipMonth,
		unskipMonth,
		addCategory,
		updateCategory,
		deleteCategory
	} from '$lib/budget';
	import BudgetDashboard from '$lib/components/BudgetDashboard.svelte';
	import type { Budget, Entry } from '$lib/types';
	import type { NewEntryInput } from '$lib/budget';
	import * as m from '$lib/paraglide/messages';

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
		// Migrate entries missing monthlySkips (added after initial release)
		existing = {
			...existing,
			entries: existing.entries.map((e) => ({ ...e, monthlySkips: e.monthlySkips ?? [] }))
		};
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

	function onSkipMonth(entryId: string, month: number) {
		if (!budget) return;
		budget = skipMonth(budget, entryId, month);
	}

	function onUnskipMonth(entryId: string, month: number) {
		if (!budget) return;
		budget = unskipMonth(budget, entryId, month);
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
		const newBudget = createEmptyBudget(clearName.trim() || m.clear_budget_placeholder());
		await replaceBudget(newBudget);
		budget = newBudget;
		clearOpen = false;
	}

	const overlayStyle = `position:fixed;inset:0;z-index:60;display:flex;align-items:center;justify-content:center;padding:1rem;background:var(--overlay-bg)`;
	const panelClass = 'flex w-full max-w-sm flex-col gap-4 border p-5';
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
		<span class="text-sm" style:color="var(--color-muted)">{m.loading()}</span>
	</div>
{:else if budget}
	<BudgetDashboard
		{budget}
		{onAddEntry}
		{onUpdateEntry}
		{onDeleteEntry}
		{onSetOverride}
		{onRemoveOverride}
		{onSkipMonth}
		{onUnskipMonth}
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
			style:border-radius="var(--radius)"
			style:background-color="var(--color-surface)"
			style:border-color="var(--color-border)"
			style:box-shadow="var(--shadow-modal)"
		>
			<div>
				<h2 class="font-semibold">{m.clear_budget_title()}</h2>
				<p class="mt-1 text-sm" style:color="var(--color-muted)">
					{m.clear_budget_description()}
				</p>
			</div>
			<input
				bind:value={clearName}
				type="text"
				placeholder={m.clear_budget_placeholder()}
				class="border px-2.5 py-2 text-sm outline-none focus:ring-1 focus:ring-[--color-accent]/40 transition-colors"
				style:border-radius="var(--radius-sm)"
				style:background-color="var(--color-bg)"
				style:border-color="var(--color-border)"
				style:color="var(--color-text)"
				onkeydown={(e) => e.key === 'Enter' && executeClear()}
			/>
			<div class="flex justify-end gap-2">
				<button
					type="button"
					class="px-3 py-1.5 text-sm transition-opacity hover:opacity-80"
					style:border-radius="var(--radius-sm)"
					style:color="var(--color-muted)"
					onclick={cancelClear}
				>
					{m.cancel()}
				</button>
				<button
					type="button"
					class="px-4 py-1.5 text-sm font-medium transition-opacity hover:opacity-90"
					style:border-radius="var(--radius-sm)"
					style:background-color="var(--color-red)"
					style:color="white"
					onclick={executeClear}
				>
					{m.clear_budget_confirm()}
				</button>
			</div>
		</div>
	</div>
{/if}
