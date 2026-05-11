<script lang="ts">
	import type { Entry } from '$lib/types';
	import { formatCurrency } from '$lib/format';

	let {
		entry,
		month,
		currency,
		currentAmount,
		hasOverride,
		onUpdateEntry,
		onDeleteEntry,
		onDuplicateEntry,
		onSetOverride,
		onRemoveOverride,
		onEdit
	}: {
		entry: Entry;
		month: number;
		currency: string;
		currentAmount: number;
		hasOverride: boolean;
		onUpdateEntry: (id: string, patch: Partial<Omit<Entry, 'id' | 'monthlyOverrides'>>) => void;
		onDeleteEntry: (id: string) => void;
		onDuplicateEntry: (entry: Entry) => void;
		onSetOverride: (entryId: string, month: number, amount: number) => void;
		onRemoveOverride: (entryId: string, month: number) => void;
		onEdit: (entry: Entry) => void;
	} = $props();

	let editingAmount = $state(false);
	let amountInput = $state('');
	let inputEl = $state<HTMLInputElement | null>(null);

	function startAmountEdit() {
		amountInput = currentAmount.toFixed(2);
		editingAmount = true;
		setTimeout(() => inputEl?.select(), 0);
	}

	function commitAmount() {
		const val = parseFloat(amountInput);
		if (!isNaN(val) && val >= 0) {
			const base = entry.recurrence === 'annual_distributed' ? entry.baseAmount / 12 : entry.baseAmount;
			if (Math.abs(val - base) < 0.01) {
				onRemoveOverride(entry.id, month);
			} else {
				onSetOverride(entry.id, month, val);
			}
		}
		editingAmount = false;
	}

	function onAmountKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') commitAmount();
		if (e.key === 'Escape') editingAmount = false;
	}

	const recurrenceLabel: Record<string, string> = {
		monthly: 'mo',
		annual_distributed: 'yr÷',
		single: '1×'
	};
</script>

<div
	class="group grid items-center gap-2 px-3 py-1.5 text-sm transition-colors hover:bg-white/[0.03]"
	style="grid-template-columns: 1fr auto auto auto;"
>
	<!-- Name + meta -->
	<div class="flex min-w-0 items-center gap-1.5">
		<button
			type="button"
			class="min-w-0 truncate text-left hover:underline"
			style:color="var(--color-text)"
			onclick={() => onEdit(entry)}
			title={entry.notes || entry.name}
		>
			{entry.name}
		</button>
		<span class="shrink-0 rounded px-1 py-0.5 text-xs" style:color="var(--color-muted)" style:background-color="var(--color-border)">
			{recurrenceLabel[entry.recurrence]}
		</span>
		{#if hasOverride}
			<button
				type="button"
				class="shrink-0 rounded px-1 py-0.5 text-xs"
				style:color="var(--color-yellow)"
				style:background-color="color-mix(in srgb, var(--color-yellow) 15%, transparent)"
				title="Override active — click to reset to base"
				onclick={() => onRemoveOverride(entry.id, month)}
			>
				↺ override
			</button>
		{/if}
		{#if entry.notes}
			<span class="shrink-0 text-xs" style:color="var(--color-muted)" title={entry.notes}>💬</span>
		{/if}
	</div>

	<!-- Amount (inline editable) -->
	<div class="text-right tabular-nums">
		{#if editingAmount}
			<input
				bind:this={inputEl}
				bind:value={amountInput}
				type="number"
				min="0"
				step="0.01"
				class="w-24 rounded border px-1.5 py-0.5 text-right text-sm outline-none focus:ring-1"
				style:background-color="var(--color-bg)"
				style:border-color="var(--color-blue)"
				style:color="var(--color-text)"
				onblur={commitAmount}
				onkeydown={onAmountKeydown}
			/>
		{:else}
			<button
				type="button"
				class="rounded px-1.5 py-0.5 tabular-nums transition-colors hover:underline"
				style:color={hasOverride ? 'var(--color-yellow)' : 'var(--color-text)'}
				onclick={startAmountEdit}
				title="Click to edit this month's amount"
			>
				{formatCurrency(currentAmount, currency)}
			</button>
		{/if}
	</div>

	<!-- Duplicate -->
	<button
		type="button"
		class="invisible rounded p-1 text-xs opacity-60 transition-opacity hover:opacity-100 group-hover:visible"
		style:color="var(--color-muted)"
		title="Duplicate entry"
		onclick={() => onDuplicateEntry(entry)}
	>
		⧉
	</button>

	<!-- Delete -->
	<button
		type="button"
		class="invisible rounded p-1 text-xs opacity-60 transition-opacity hover:opacity-100 group-hover:visible"
		style:color="var(--color-red)"
		title="Delete entry"
		onclick={() => onDeleteEntry(entry.id)}
	>
		✕
	</button>
</div>
