<script lang="ts">
	import type { Budget, Entry, EntryType } from '$lib/types';
	import type { NewEntryInput } from '$lib/budget';
	import {
		computeYearSummary,
		getAllMonthSummaries,
		computeMonthSummary,
		isBalanced
	} from '$lib/budget';
	import { formatCurrency, MONTH_NAMES } from '$lib/format';
	import SummaryBar from './SummaryBar.svelte';
	import MonthCard from './MonthCard.svelte';
	import EntryList from './EntryList.svelte';
	import EntryDialog from './EntryDialog.svelte';
	import BalanceBadge from './BalanceBadge.svelte';
	import ImportExportMenu from './ImportExportMenu.svelte';

	let {
		budget,
		onAddEntry,
		onUpdateEntry,
		onDeleteEntry,
		onSetOverride,
		onRemoveOverride,
		onImport
	}: {
		budget: Budget;
		onAddEntry: (input: NewEntryInput) => void;
		onUpdateEntry: (id: string, patch: Partial<Omit<Entry, 'id' | 'monthlyOverrides'>>) => void;
		onDeleteEntry: (id: string) => void;
		onSetOverride: (entryId: string, month: number, amount: number) => void;
		onRemoveOverride: (entryId: string, month: number) => void;
		onImport: (b: Budget) => void;
	} = $props();

	const yearSummary = $derived(computeYearSummary(budget));
	const monthSummaries = $derived(getAllMonthSummaries(budget));

	// Selected month panel
	let selectedMonth = $state<number | null>(null);
	const monthSummary = $derived(
		selectedMonth !== null ? computeMonthSummary(budget, selectedMonth) : null
	);

	// Dialog state
	let dialogOpen = $state(false);
	let dialogEditEntry = $state<Entry | null>(null);
	let dialogDefaultType = $state<EntryType>('expense');

	function openAddDialog(type: EntryType) {
		dialogEditEntry = null;
		dialogDefaultType = type;
		dialogOpen = true;
	}

	function openEditDialog(entry: Entry) {
		dialogEditEntry = entry;
		dialogDefaultType = entry.type;
		dialogOpen = true;
	}

	function closeDialog() {
		dialogOpen = false;
		dialogEditEntry = null;
	}

	function handleSave(input: NewEntryInput, id?: string) {
		if (id) {
			onUpdateEntry(id, {
				name: input.name,
				type: input.type,
				recurrence: input.recurrence,
				category: input.category,
				baseAmount: input.baseAmount,
				month: input.month,
				notes: input.notes
			});
		} else {
			onAddEntry(input);
		}
		closeDialog();
	}

	function handleDuplicate(entry: Entry) {
		const input: NewEntryInput = {
			name: entry.name + ' (copy)',
			type: entry.type,
			recurrence: entry.recurrence,
			category: entry.category,
			baseAmount: entry.baseAmount,
			month: entry.month,
			notes: entry.notes
		};
		onAddEntry(input);
	}
</script>

<div class="flex h-screen flex-col overflow-hidden">
	<!-- Top bar -->
	<div
		class="flex shrink-0 items-center justify-between border-b px-4 py-2"
		style:border-color="var(--color-border)"
		style:background-color="var(--color-surface)"
	>
		<span class="font-semibold">{budget.name} — {budget.year}</span>
		<SummaryBar summary={yearSummary} />
		<ImportExportMenu {budget} {onImport} />
	</div>

	<!-- Main content -->
	<div class="flex flex-1 overflow-hidden">
		<!-- Month grid (left sidebar) -->
		<div
			class="flex w-72 shrink-0 flex-col gap-2 overflow-y-auto border-r p-3"
			style:border-color="var(--color-border)"
		>
			<div class="mb-1 text-xs font-semibold uppercase tracking-wide" style:color="var(--color-muted)">
				Months
			</div>
			{#each monthSummaries as summary}
				<MonthCard
					{summary}
					selected={selectedMonth === summary.month}
					onclick={() => {
						selectedMonth = selectedMonth === summary.month ? null : summary.month;
					}}
				/>
			{/each}
		</div>

		<!-- Month detail panel -->
		{#if selectedMonth !== null && monthSummary !== null}
			<div class="flex flex-1 flex-col overflow-hidden">
				<!-- Month header -->
				<div
					class="flex shrink-0 items-center justify-between border-b px-4 py-2"
					style:border-color="var(--color-border)"
				>
					<div class="flex items-center gap-3">
						<span class="font-semibold">{MONTH_NAMES[selectedMonth]}</span>
						<BalanceBadge balance={monthSummary.balance} />
					</div>
					<div class="flex gap-4 text-sm tabular-nums">
						<span style:color="var(--color-green)">{formatCurrency(monthSummary.incomeTotal)}</span>
						<span style:color="var(--color-red)">−{formatCurrency(monthSummary.expenseTotal)}</span>
						<span style:color="var(--color-blue)">↓{formatCurrency(monthSummary.savingsTotal)}</span>
						<span
							class="font-medium"
							style:color={isBalanced(monthSummary.balance) ? 'var(--color-green)' : 'var(--color-red)'}
						>
							= {formatCurrency(monthSummary.balance)}
						</span>
					</div>
					<button
						type="button"
						class="text-sm opacity-60 hover:opacity-100"
						style:color="var(--color-muted)"
						onclick={() => (selectedMonth = null)}
					>
						✕
					</button>
				</div>

				<!-- Entry lists -->
				<div class="flex-1 overflow-y-auto p-4">
					<div class="flex flex-col gap-4">
						{#each ['income', 'expense', 'savings'] as t}
							<div
								class="rounded-lg border"
								style:border-color="var(--color-border)"
								style:background-color="var(--color-surface)"
							>
								<EntryList
									entries={budget.entries}
									month={selectedMonth}
									type={t as EntryType}
									onUpdateEntry={onUpdateEntry}
									onDeleteEntry={onDeleteEntry}
									onDuplicateEntry={handleDuplicate}
									onSetOverride={onSetOverride}
									onRemoveOverride={onRemoveOverride}
									onEdit={openEditDialog}
									onAddNew={openAddDialog}
								/>
							</div>
						{/each}
					</div>

					<!-- Balance formula -->
					{#if !isBalanced(monthSummary.balance)}
						<div
							class="mt-4 rounded-lg border px-3 py-2 text-sm"
							style:border-color="color-mix(in srgb, var(--color-red) 40%, var(--color-border))"
							style:background-color="color-mix(in srgb, var(--color-red) 8%, transparent)"
							style:color="var(--color-red)"
						>
							Unbalanced: {formatCurrency(monthSummary.balance)} — add income or reduce expenses/savings to reach €0.
						</div>
					{:else}
						<div
							class="mt-4 rounded-lg border px-3 py-2 text-sm"
							style:border-color="color-mix(in srgb, var(--color-green) 40%, var(--color-border))"
							style:background-color="color-mix(in srgb, var(--color-green) 8%, transparent)"
							style:color="var(--color-green)"
						>
							Month balanced ✓
						</div>
					{/if}
				</div>
			</div>
		{:else}
			<!-- No month selected -->
			<div class="flex flex-1 items-center justify-center text-sm" style:color="var(--color-muted)">
				Select a month to view and edit entries
			</div>
		{/if}
	</div>
</div>

<EntryDialog
	open={dialogOpen}
	editEntry={dialogEditEntry}
	defaultType={dialogDefaultType}
	onClose={closeDialog}
	onSave={handleSave}
/>
