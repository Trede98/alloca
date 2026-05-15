<script lang="ts">
	import type { Entry } from '$lib/types';
	import { formatCurrency } from '$lib/format';
	import * as m from '$lib/paraglide/messages';
	import { getLocale } from '$lib/paraglide/runtime';

	let {
		entry,
		month,
		currency,
		currentAmount,
		hasOverride,
		hasSkip,
		onUpdateEntry,
		onDeleteEntry,
		onDuplicateEntry,
		onSetOverride,
		onRemoveOverride,
		onSkipMonth,
		onUnskipMonth,
		onEdit,
		tourAttr
	}: {
		entry: Entry;
		month: number;
		currency: string;
		currentAmount: number;
		hasOverride: boolean;
		hasSkip: boolean;
		onUpdateEntry: (id: string, patch: Partial<Omit<Entry, 'id' | 'monthlyOverrides'>>) => void;
		onDeleteEntry: (id: string) => void;
		onDuplicateEntry: (entry: Entry) => void;
		onSetOverride: (entryId: string, month: number, amount: number) => void;
		onRemoveOverride: (entryId: string, month: number) => void;
		onSkipMonth: (entryId: string, month: number) => void;
		onUnskipMonth: (entryId: string, month: number) => void;
		onEdit: (entry: Entry) => void;
		tourAttr?: string;
	} = $props();

	let editingAmount = $state(false);
	let amountInput = $state('');
	let inputEl = $state<HTMLInputElement | null>(null);
	const locale = $derived(getLocale());
	const isLastActiveMonth = $derived(
		entry.recurrence === 'annual_distributed' &&
		!hasSkip &&
		(entry.monthlySkips ?? []).length === 11
	);

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

	const recurrenceBadge = $derived({
		monthly: m.recurrence_badge_monthly(),
		annual_distributed: m.recurrence_badge_annual(),
		single: m.recurrence_badge_single()
	}[entry.recurrence]);
</script>

<div
	class="entry-row group grid items-center gap-2 px-3 py-1.5 text-sm transition-colors hover:bg-[--surface-hover]"
	style="grid-template-columns: 1fr auto auto auto auto;"
	data-tour={tourAttr}
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
		<span
			class="shrink-0 px-1 py-0.5 text-xs"
			style:border-radius="var(--radius-sm)"
			style:color="var(--color-muted)"
			style:background-color="var(--color-border)"
		>
			{recurrenceBadge}
		</span>
		{#if hasOverride}
			<button
				type="button"
				class="shrink-0 px-1 py-0.5 text-xs"
				style:border-radius="var(--radius-sm)"
				style:color="var(--color-yellow)"
				style:background-color="color-mix(in srgb, var(--color-yellow) 15%, transparent)"
				title={m.entry_row_override_tooltip()}
				onclick={() => onRemoveOverride(entry.id, month)}
			>
				{m.entry_row_override()}
			</button>
		{/if}
		{#if entry.notes}
			<span class="shrink-0 text-xs" style:color="var(--color-muted)" title={entry.notes}>💬</span>
		{/if}
	</div>

	<!-- Amount (inline editable) -->
	<div class="text-right">
		{#if hasSkip}
			<button
				type="button"
				class="px-1.5 py-0.5 text-xs"
				style:border-radius="var(--radius-sm)"
				style:color="var(--color-muted)"
				style:background-color="var(--color-border)"
				title={m.entry_row_skipped_tooltip()}
				onclick={() => onUnskipMonth(entry.id, month)}
			>
				{m.entry_row_skipped()}
			</button>
		{:else if editingAmount}
			<input
				bind:this={inputEl}
				bind:value={amountInput}
				type="number"
				min="0"
				step="0.01"
				class="w-24 border px-1.5 py-0.5 text-right text-sm outline-none focus:ring-1 focus:ring-[--color-accent]/40"
				style:border-radius="var(--radius-sm)"
				style:background-color="var(--color-bg)"
				style:border-color="var(--color-accent)"
				style:color="var(--color-text)"
				onblur={commitAmount}
				onkeydown={onAmountKeydown}
			/>
		{:else}
			<button
				type="button"
				class="px-1.5 py-0.5 transition-colors hover:underline"
				style:border-radius="var(--radius-sm)"
				style:color={hasOverride ? 'var(--color-yellow)' : 'var(--color-text)'}
				onclick={startAmountEdit}
				title={m.entry_row_amount_tooltip()}
			>
				{formatCurrency(currentAmount, currency, locale)}
			</button>
		{/if}
	</div>

	<!-- Skip toggle (only for recurring entries) -->
	{#if entry.recurrence !== 'single'}
		<button
			type="button"
			class="invisible p-1 text-xs opacity-60 transition-opacity hover:opacity-100 group-hover:visible"
			class:cursor-not-allowed={isLastActiveMonth}
			style:border-radius="var(--radius-sm)"
			style:color={hasSkip ? 'var(--color-accent)' : 'var(--color-muted)'}
			title={isLastActiveMonth ? m.entry_row_skip_last_month_tooltip() : hasSkip ? m.entry_row_unskip_tooltip() : m.entry_row_skip_tooltip()}
			disabled={isLastActiveMonth}
			onclick={() => hasSkip ? onUnskipMonth(entry.id, month) : onSkipMonth(entry.id, month)}
		>
			{hasSkip ? '↩' : '⊘'}
		</button>
	{:else}
		<span class="p-1"></span>
	{/if}

	<!-- Duplicate -->
	<button
		type="button"
		class="invisible p-1 text-xs opacity-60 transition-opacity hover:opacity-100 group-hover:visible"
		style:border-radius="var(--radius-sm)"
		style:color="var(--color-text)"
		title={m.entry_row_duplicate()}
		onclick={() => onDuplicateEntry(entry)}
	>
		⧉
	</button>

	<!-- Delete -->
	<button
		type="button"
		class="invisible p-1 text-xs opacity-60 transition-opacity hover:opacity-100 group-hover:visible"
		style:border-radius="var(--radius-sm)"
		style:color="var(--color-red)"
		title={m.entry_row_delete()}
		onclick={() => onDeleteEntry(entry.id)}
	>
		✕
	</button>
</div>
