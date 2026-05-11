<script lang="ts">
	import type { Budget, Entry, EntryType } from '$lib/types';
	import type { NewEntryInput } from '$lib/budget';
	import {
		computeYearSummary,
		getAllMonthSummaries,
		computeMonthSummary,
		isBalanced,
		setMonthNote
	} from '$lib/budget';
	import { formatCurrency, MONTH_NAMES, MONTH_NAMES_FULL } from '$lib/format';
	import { getTheme, toggleTheme } from '$lib/theme';
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
		onImport,
		onBudgetChange
	}: {
		budget: Budget;
		onAddEntry: (input: NewEntryInput) => void;
		onUpdateEntry: (id: string, patch: Partial<Omit<Entry, 'id' | 'monthlyOverrides'>>) => void;
		onDeleteEntry: (id: string) => void;
		onSetOverride: (entryId: string, month: number, amount: number) => void;
		onRemoveOverride: (entryId: string, month: number) => void;
		onImport: (b: Budget) => void;
		onBudgetChange: (b: Budget) => void;
	} = $props();

	const yearSummary = $derived(computeYearSummary(budget));
	const monthSummaries = $derived(getAllMonthSummaries(budget));

	let selectedMonth = $state<number | null>(null);
	const monthSummary = $derived(
		selectedMonth !== null ? computeMonthSummary(budget, selectedMonth) : null
	);

	// Dialog state
	let dialogOpen = $state(false);
	let dialogEditEntry = $state<Entry | null>(null);
	let dialogDefaultType = $state<EntryType>('expense');

	// Notes state
	let noteText = $state('');
	let noteEditing = $state(false);
	let noteEl = $state<HTMLTextAreaElement | null>(null);

	// Sync note text when month changes
	$effect(() => {
		if (selectedMonth !== null) {
			noteText = budget.monthlyNotes[selectedMonth] ?? '';
			noteEditing = false;
		}
	});

	// Mobile panel toggle
	let showDetail = $state(false);

	function selectMonth(m: number) {
		selectedMonth = selectedMonth === m ? null : m;
		if (selectedMonth !== null) showDetail = true;
	}

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
		onAddEntry({
			name: entry.name + ' (copy)',
			type: entry.type,
			recurrence: entry.recurrence,
			category: entry.category,
			baseAmount: entry.baseAmount,
			month: entry.month,
			notes: entry.notes
		});
	}

	function commitNote() {
		if (selectedMonth === null) return;
		const updated = setMonthNote(budget, selectedMonth, noteText);
		onBudgetChange(updated);
		noteEditing = false;
	}

	function startNoteEdit() {
		noteEditing = true;
		setTimeout(() => noteEl?.focus(), 0);
	}

	function onNoteKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			noteText = budget.monthlyNotes[selectedMonth!] ?? '';
			noteEditing = false;
		}
		if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) commitNote();
	}

	const theme = $derived(getTheme());
</script>

<div class="flex h-screen flex-col overflow-hidden" style:background-color="var(--color-bg)">
	<!-- Top bar -->
	<header
		class="flex shrink-0 items-center justify-between gap-3 border-b px-4 py-2"
		style:border-color="var(--color-border)"
		style:background-color="var(--color-surface)"
	>
		<span class="min-w-0 shrink-0 font-semibold tracking-tight">
			{budget.name}
			<span class="font-normal opacity-50">·</span>
			{budget.year}
		</span>

		<div class="hidden flex-1 justify-center sm:flex">
			<SummaryBar summary={yearSummary} currency={budget.currency} />
		</div>

		<div class="flex shrink-0 items-center gap-2">
			<ImportExportMenu {budget} {onImport} />
			<button
				type="button"
				class="rounded p-1.5 text-sm opacity-60 transition-opacity hover:opacity-100"
				style:color="var(--color-muted)"
				title="Toggle theme"
				onclick={toggleTheme}
			>
				{theme === 'dark' ? '☀' : '☾'}
			</button>
		</div>
	</header>

	<!-- Mobile summary bar -->
	<div
		class="flex shrink-0 items-center justify-center border-b px-4 py-1.5 sm:hidden"
		style:border-color="var(--color-border)"
		style:background-color="var(--color-surface)"
	>
		<SummaryBar summary={yearSummary} currency={budget.currency} />
	</div>

	<!-- Main content -->
	<div class="flex flex-1 overflow-hidden">
		<!-- Month grid sidebar -->
		<div
			class="flex shrink-0 flex-col gap-2 overflow-y-auto border-r p-3"
			class:w-64={true}
			class:hidden={showDetail && selectedMonth !== null}
			class:sm:flex={true}
			style:border-color="var(--color-border)"
			style:width="clamp(220px, 20vw, 288px)"
		>
			<div class="mb-1 text-xs font-semibold uppercase tracking-widest" style:color="var(--color-muted)">
				Months
			</div>
			{#each monthSummaries as summary}
				<MonthCard
					{summary}
					selected={selectedMonth === summary.month}
					currency={budget.currency}
					onclick={() => selectMonth(summary.month)}
				/>
			{/each}
		</div>

		<!-- Month detail panel -->
		{#if selectedMonth !== null && monthSummary !== null}
			<div class="flex flex-1 flex-col overflow-hidden">
				<!-- Month header -->
				<div
					class="flex shrink-0 items-center justify-between gap-3 border-b px-4 py-2"
					style:border-color="var(--color-border)"
					style:background-color="var(--color-surface)"
				>
					<div class="flex items-center gap-2">
						<!-- Back button (mobile) -->
						<button
							type="button"
							class="rounded p-1 text-sm opacity-60 hover:opacity-100 sm:hidden"
							style:color="var(--color-muted)"
							onclick={() => { showDetail = false; selectedMonth = null; }}
						>
							←
						</button>
						<span class="font-semibold">{MONTH_NAMES_FULL[selectedMonth]}</span>
						<BalanceBadge balance={monthSummary.balance} />
					</div>

					<div class="hidden items-center gap-3 text-sm tabular-nums sm:flex">
						<span style:color="var(--color-green)">{formatCurrency(monthSummary.incomeTotal, budget.currency)}</span>
						<span class="opacity-40">−</span>
						<span style:color="var(--color-red)">{formatCurrency(monthSummary.expenseTotal, budget.currency)}</span>
						<span class="opacity-40">−</span>
						<span style:color="var(--color-blue)">{formatCurrency(monthSummary.savingsTotal, budget.currency)}</span>
						<span class="opacity-40">=</span>
						<span
							class="font-semibold"
							style:color={isBalanced(monthSummary.balance) ? 'var(--color-green)' : 'var(--color-red)'}
						>
							{formatCurrency(monthSummary.balance, budget.currency)}
						</span>
					</div>

					<button
						type="button"
						class="hidden shrink-0 rounded p-1 text-sm opacity-50 hover:opacity-100 sm:block"
						style:color="var(--color-muted)"
						onclick={() => (selectedMonth = null)}
					>
						✕
					</button>
				</div>

				<!-- Entry lists + notes -->
				<div class="flex-1 overflow-y-auto p-4">
					<div class="mx-auto max-w-3xl flex flex-col gap-4">
						{#each ['income', 'expense', 'savings'] as t}
							<div
								class="rounded-xl border overflow-hidden"
								style:border-color="var(--color-border)"
								style:background-color="var(--color-surface)"
							>
								<EntryList
									entries={budget.entries}
									month={selectedMonth}
									type={t as EntryType}
									currency={budget.currency}
									{onUpdateEntry}
									{onDeleteEntry}
									onDuplicateEntry={handleDuplicate}
									{onSetOverride}
									{onRemoveOverride}
									onEdit={openEditDialog}
									onAddNew={openAddDialog}
								/>
							</div>
						{/each}

						<!-- Balance status -->
						{#if !isBalanced(monthSummary.balance)}
							<div
								class="rounded-xl border px-4 py-3 text-sm"
								style:border-color="color-mix(in srgb, var(--color-red) 30%, var(--color-border))"
								style:background-color="color-mix(in srgb, var(--color-red) 6%, var(--color-surface))"
								style:color="var(--color-red)"
							>
								<strong>Unbalanced:</strong> {formatCurrency(monthSummary.balance, budget.currency)} — adjust income, expenses, or savings to reach {formatCurrency(0, budget.currency)}.
							</div>
						{:else}
							<div
								class="rounded-xl border px-4 py-3 text-sm"
								style:border-color="color-mix(in srgb, var(--color-green) 30%, var(--color-border))"
								style:background-color="color-mix(in srgb, var(--color-green) 6%, var(--color-surface))"
								style:color="var(--color-green)"
							>
								Month balanced ✓
							</div>
						{/if}

						<!-- Monthly note -->
						<div
							class="rounded-xl border overflow-hidden"
							style:border-color="var(--color-border)"
							style:background-color="var(--color-surface)"
						>
							<div
								class="flex items-center justify-between border-b px-3 py-2"
								style:border-color="var(--color-border)"
							>
								<span class="text-xs font-semibold uppercase tracking-widest" style:color="var(--color-muted)">Note</span>
								{#if noteEditing}
									<div class="flex gap-2">
										<button
											type="button"
											class="text-xs opacity-60 hover:opacity-100"
											style:color="var(--color-muted)"
											onclick={() => { noteText = budget.monthlyNotes[selectedMonth!] ?? ''; noteEditing = false; }}
										>Cancel</button>
										<button
											type="button"
											class="text-xs font-medium"
											style:color="var(--color-blue)"
											onclick={commitNote}
										>Save</button>
									</div>
								{:else}
									<button
										type="button"
										class="text-xs opacity-60 hover:opacity-100"
										style:color="var(--color-blue)"
										onclick={startNoteEdit}
									>Edit</button>
								{/if}
							</div>

							{#if noteEditing}
								<textarea
									bind:this={noteEl}
									bind:value={noteText}
									rows="3"
									placeholder="Add a note for this month…"
									class="w-full resize-none px-3 py-2 text-sm outline-none"
									style:background-color="var(--color-surface)"
									style:color="var(--color-text)"
									onkeydown={onNoteKeydown}
								></textarea>
							{:else}
								<div
									class="px-3 py-2 text-sm"
									style:color={noteText ? 'var(--color-text)' : 'var(--color-muted)'}
									role="button"
									tabindex="0"
									onclick={startNoteEdit}
									onkeydown={(e) => e.key === 'Enter' && startNoteEdit()}
								>
									{noteText || 'No note — click Edit to add one.'}
								</div>
							{/if}
						</div>
					</div>
				</div>
			</div>
		{:else}
			<!-- No month selected — empty state -->
			<div class="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
				<div class="text-4xl opacity-20">📅</div>
				<p class="text-sm" style:color="var(--color-muted)">Select a month to view and edit entries</p>
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
