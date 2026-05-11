<script lang="ts">
	import type { Entry, EntryType } from '$lib/types';
	import { getMonthAmount } from '$lib/budget';
	import { formatCurrency } from '$lib/format';
	import EntryRow from './EntryRow.svelte';

	let {
		entries,
		month,
		type,
		onUpdateEntry,
		onDeleteEntry,
		onDuplicateEntry,
		onSetOverride,
		onRemoveOverride,
		onEdit,
		onAddNew
	}: {
		entries: Entry[];
		month: number;
		type: EntryType;
		onUpdateEntry: (id: string, patch: Partial<Omit<Entry, 'id' | 'monthlyOverrides'>>) => void;
		onDeleteEntry: (id: string) => void;
		onDuplicateEntry: (entry: Entry) => void;
		onSetOverride: (entryId: string, month: number, amount: number) => void;
		onRemoveOverride: (entryId: string, month: number) => void;
		onEdit: (entry: Entry) => void;
		onAddNew: (type: EntryType) => void;
	} = $props();

	const typeColors: Record<EntryType, string> = {
		income: 'var(--color-green)',
		expense: 'var(--color-red)',
		savings: 'var(--color-blue)'
	};

	const typeLabels: Record<EntryType, string> = {
		income: 'Income',
		expense: 'Expenses',
		savings: 'Savings'
	};

	const filtered = $derived(
		entries.filter((e) => {
			if (e.type !== type) return false;
			if (e.recurrence === 'single') return e.month === month;
			return true;
		})
	);

	const total = $derived(filtered.reduce((sum, e) => sum + getMonthAmount(e, month), 0));
</script>

<div class="flex flex-col">
	<!-- Header row -->
	<div class="flex items-center justify-between px-2 py-1">
		<span class="text-xs font-semibold uppercase tracking-wide" style:color={typeColors[type]}>
			{typeLabels[type]}
		</span>
		<span class="text-xs tabular-nums" style:color={typeColors[type]}>
			{formatCurrency(total)}
		</span>
	</div>

	<!-- Entry rows -->
	{#if filtered.length === 0}
		<div class="px-2 py-1 text-xs" style:color="var(--color-muted)">No entries</div>
	{:else}
		{#each filtered as entry (entry.id)}
			<EntryRow
				{entry}
				{month}
				currentAmount={getMonthAmount(entry, month)}
				hasOverride={month in entry.monthlyOverrides}
				{onUpdateEntry}
				{onDeleteEntry}
				{onDuplicateEntry}
				{onSetOverride}
				{onRemoveOverride}
				{onEdit}
			/>
		{/each}
	{/if}

	<!-- Add button -->
	<button
		type="button"
		class="mt-0.5 flex items-center gap-1 rounded px-2 py-1 text-xs opacity-60 hover:opacity-100"
		style:color={typeColors[type]}
		onclick={() => onAddNew(type)}
	>
		+ Add {typeLabels[type].toLowerCase()}
	</button>
</div>
