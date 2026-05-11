<script lang="ts">
	import type { Entry } from '$lib/types';
	import { formatCurrency } from '$lib/format';
	import CategoryTag from './CategoryTag.svelte';

	let {
		entry,
		month,
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
		// Focus after render
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
		single: '1x'
	};
</script>

<div
	class="group grid items-center gap-2 px-2 py-1 text-sm hover:bg-white/[0.03] rounded"
	style="grid-template-columns: 1fr auto auto auto;"
>
	<!-- Name + meta -->
	<div class="flex min-w-0 items-center gap-1.5">
		<button
			type="button"
			class="truncate text-left hover:underline"
			style:color="var(--color-text)"
			onclick={() => onEdit(entry)}
		>
			{entry.name}
		</button>
		<span class="shrink-0 text-xs" style:color="var(--color-muted)">{recurrenceLabel[entry.recurrence]}</span>
		<CategoryTag category={entry.category} />
		{#if hasOverride}
			<button
				type="button"
				class="shrink-0 text-xs"
				style:color="var(--color-yellow)"
				title="Override active — click to reset"
				onclick={() => onRemoveOverride(entry.id, month)}
			>
				↺
			</button>
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
				class="w-24 rounded border px-1 py-0.5 text-right text-sm outline-none"
				style:background-color="var(--color-bg)"
				style:border-color="var(--color-border)"
				style:color="var(--color-text)"
				onblur={commitAmount}
				onkeydown={onAmountKeydown}
			/>
		{:else}
			<button
				type="button"
				class="rounded px-1 py-0.5 tabular-nums hover:underline"
				style:color={hasOverride ? 'var(--color-yellow)' : 'var(--color-text)'}
				onclick={startAmountEdit}
				title="Click to edit amount"
			>
				{formatCurrency(currentAmount)}
			</button>
		{/if}
	</div>

	<!-- Duplicate -->
	<button
		type="button"
		class="hidden rounded p-1 text-xs opacity-60 hover:opacity-100 group-hover:block"
		style:color="var(--color-muted)"
		title="Duplicate"
		onclick={() => onDuplicateEntry(entry)}
	>
		⧉
	</button>

	<!-- Delete -->
	<button
		type="button"
		class="hidden rounded p-1 text-xs opacity-60 hover:opacity-100 group-hover:block"
		style:color="var(--color-red)"
		title="Delete"
		onclick={() => onDeleteEntry(entry.id)}
	>
		✕
	</button>
</div>
