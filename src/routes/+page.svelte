<script lang="ts">
	import { onMount } from 'svelte';
	import { loadBudget, saveBudget, replaceBudget } from '$lib/db';
	import { hasTourBeenSeen, markTourSeen } from '$lib/tour';
	import WelcomeDialog from '$lib/components/WelcomeDialog.svelte';
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
	import { Dialog } from 'bits-ui';
	import type { Budget, Entry } from '$lib/types';
	import type { NewEntryInput } from '$lib/budget';
	import * as m from '$lib/paraglide/messages';
	import { BudgetError, BUDGET_ERROR_LABELS } from '$lib/errors';

	let budget = $state<Budget | null>(null);
	let loading = $state(true);
	let welcomeOpen = $state(false);
	let isTourActive = $state(false);
	let stashedBudget = $state<Budget | null>(null);

	// Clear flow (single modal)
	let clearOpen = $state(false);
	let clearName = $state('');

	// Category error state
	let categoryError = $state('');

	onMount(async () => {
		let existing = await loadBudget();
		if (!existing) {
			existing = createEmptyBudget();
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
		welcomeOpen = !hasTourBeenSeen();
	});

	$effect(() => {
		if (!isTourActive && budget) saveBudget($state.snapshot(budget) as Budget);
	});

	function onTourStart() {
		stashedBudget = $state.snapshot(budget) as Budget;
		isTourActive = true;
		budget = createSeedBudget();
	}

	function onTourEnd() {
		if (stashedBudget) {
			budget = stashedBudget;
			stashedBudget = null;
		}
		isTourActive = false;
	}

	function onWelcomeStart() {
		markTourSeen();
		welcomeOpen = false;
	}

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

	function onUpdateBaseAmount(id: string, amount: number) {
		if (!budget) return;
		budget = updateEntry(budget, id, { baseAmount: amount });
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

	function resolveCategoryError(e: unknown): string {
		if (e instanceof BudgetError) return BUDGET_ERROR_LABELS[e.code]();
		return 'Unknown error';
	}

	function onAddCategory(name: string) {
		if (!budget) return;
		try {
			budget = addCategory(budget, name);
		} catch (e) {
			categoryError = resolveCategoryError(e);
		}
	}

	function onUpdateCategory(id: string, name: string) {
		if (!budget) return;
		try {
			budget = updateCategory(budget, id, name);
		} catch (e) {
			categoryError = resolveCategoryError(e);
		}
	}

	function onDeleteCategory(id: string) {
		if (!budget) return;
		try {
			budget = deleteCategory(budget, id);
		} catch (e) {
			categoryError = resolveCategoryError(e);
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
		{onUpdateBaseAmount}
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
		{welcomeOpen}
		{onWelcomeStart}
		{onTourStart}
		{onTourEnd}
	/>
{/if}

<!-- Clear budget — single unified modal -->
<Dialog.Root bind:open={clearOpen} onOpenChange={(v) => { if (!v) cancelClear(); }}>
	<Dialog.Portal>
		<Dialog.Overlay
			class="fixed inset-0 z-[60]"
			style="background-color: var(--overlay-bg);"
		/>
		<Dialog.Content
			class="fixed inset-0 z-[60] flex items-center justify-center p-4 pointer-events-none"
		>
			<div
				class="pointer-events-auto flex w-full max-w-sm flex-col gap-4 border p-5"
				style:border-radius="var(--radius)"
				style:background-color="var(--color-surface)"
				style:border-color="var(--color-border)"
				style:box-shadow="var(--shadow-modal)"
			>
				<div>
					<Dialog.Title class="font-semibold">{m.clear_budget_title()}</Dialog.Title>
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
					<Dialog.Close
						class="px-3 py-1.5 text-sm transition-opacity hover:opacity-80"
						style="border-radius: var(--radius-sm); color: var(--color-muted);"
					>{m.cancel()}</Dialog.Close>
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
		</Dialog.Content>
	</Dialog.Portal>
</Dialog.Root>
