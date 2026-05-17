<script lang="ts">
	import type { Entry } from '$lib/types';
	import { formatCurrency } from '$lib/format';
	import * as m from '$lib/paraglide/messages';
	import { getLocale } from '$lib/paraglide/runtime';
	import { DropdownMenu, ContextMenu } from 'bits-ui';
	import { MONTHS_PER_YEAR, RECURRENCE } from '$lib/constants';

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
		onUpdateBaseAmount,
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
		onUpdateBaseAmount: (id: string, amount: number) => void;
		onSkipMonth: (entryId: string, month: number) => void;
		onUnskipMonth: (entryId: string, month: number) => void;
		onEdit: (entry: Entry) => void;
		tourAttr?: string;
	} = $props();

	let editingAmount = $state(false);
	let amountInput = $state('');
	let inputEl = $state<HTMLInputElement | null>(null);
	const locale = $derived(getLocale());
	const isAnnualDistributed = $derived(entry.recurrence === RECURRENCE.ANNUAL_DISTRIBUTED);
	const isLastActiveMonth = $derived(
		isAnnualDistributed &&
		!hasSkip &&
		(entry.monthlySkips ?? []).length === MONTHS_PER_YEAR - 1
	);

	function startAmountEdit() {
		amountInput = currentAmount.toFixed(2);
		editingAmount = true;
		setTimeout(() => inputEl?.select(), 0);
	}

	function commitAmount() {
		const val = parseFloat(amountInput);
		if (!isNaN(val) && val >= 0) {
			if (entry.recurrence === RECURRENCE.ANNUAL_DISTRIBUTED) {
				// no-op
			} else if (entry.recurrence === RECURRENCE.SINGLE) {
				onUpdateBaseAmount(entry.id, val);
			} else {
				if (Math.abs(val - entry.baseAmount) < 0.01) {
					onRemoveOverride(entry.id, month);
				} else {
					onSetOverride(entry.id, month, val);
				}
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

<ContextMenu.Root>
<ContextMenu.Trigger>
	{#snippet child({ props })}
	<div
		{...props}
		class="group grid items-center gap-2 px-3 py-1.5 text-sm transition-colors hover:bg-surface-hover"
		style="grid-template-columns: 1fr auto auto;"
		data-tour={tourAttr}
	>
	<!-- Name + meta -->
	<div class="flex min-w-0 items-center gap-1.5">
		<button
			type="button"
			class="min-w-0 truncate text-left text-text hover:underline"
			onclick={() => onEdit(entry)}
			title={entry.notes || entry.name}
		>
			{entry.name}
		</button>
		<span class="shrink-0 rounded-sm bg-border px-1 py-0.5 text-xs text-muted">
			{recurrenceBadge}
		</span>
		{#if hasOverride && !isAnnualDistributed}
			<button
				type="button"
				class="shrink-0 rounded-sm px-1 py-0.5 text-xs text-yellow bg-yellow-subtle"
				title={m.entry_row_override_tooltip()}
				onclick={() => onRemoveOverride(entry.id, month)}
			>
				{m.entry_row_override()}
			</button>
		{/if}
		{#if entry.notes}
			<span class="shrink-0 text-xs text-muted" title={entry.notes}>💬</span>
		{/if}
	</div>

	<!-- Amount (inline editable) -->
	<div class="text-right">
		{#if hasSkip}
			<button
				type="button"
				class="rounded-sm bg-border px-1.5 py-0.5 text-xs text-muted"
				title={m.entry_row_skipped_tooltip()}
				onclick={() => onUnskipMonth(entry.id, month)}
			>
				{m.entry_row_skipped()}
			</button>
		{:else if isAnnualDistributed}
			<span class="px-1.5 py-0.5 text-text">
				{formatCurrency(currentAmount, currency, locale)}
			</span>
		{:else if editingAmount}
			<input
				bind:this={inputEl}
				bind:value={amountInput}
				type="number"
				min="0"
				step="0.01"
				class="w-24 rounded-sm border border-accent bg-bg px-1.5 py-0.5 text-right text-sm text-text outline-none focus:ring-1 focus:ring-[--color-accent]/40"
				onblur={commitAmount}
				onkeydown={onAmountKeydown}
			/>
		{:else}
			<button
				type="button"
				class="rounded-sm px-1.5 py-0.5 transition-colors hover:underline"
				class:text-yellow={hasOverride}
				class:text-text={!hasOverride}
				onclick={startAmountEdit}
				title={m.entry_row_amount_tooltip()}
			>
				{formatCurrency(currentAmount, currency, locale)}
			</button>
		{/if}
	</div>

	<!-- More actions dropdown -->
	<DropdownMenu.Root>
		<DropdownMenu.Trigger
			class="rounded-sm p-1 text-xs text-text opacity-40 transition-opacity hover:opacity-100"
			title="More actions"
		>⋯</DropdownMenu.Trigger>
		<DropdownMenu.Portal>
			<DropdownMenu.Content
				sideOffset={4}
				align="end"
				class="z-50 min-w-[160px] overflow-hidden rounded-radius border border-border bg-surface py-1"
			>
				{#if entry.recurrence !== RECURRENCE.SINGLE}
					<DropdownMenu.Item
						disabled={isLastActiveMonth}
						class="flex w-full cursor-default items-center gap-2 px-3 py-1.5 text-sm outline-none data-highlighted:bg-surface-hover data-disabled:opacity-40 data-disabled:cursor-not-allowed {hasSkip ? 'text-accent' : 'text-text'}"
						title={isLastActiveMonth ? m.entry_row_skip_last_month_tooltip() : hasSkip ? m.entry_row_unskip_tooltip() : m.entry_row_skip_tooltip()}
						onclick={() => hasSkip ? onUnskipMonth(entry.id, month) : onSkipMonth(entry.id, month)}
					>
						<span>{hasSkip ? '↩' : '⊘'}</span>
						<span>{hasSkip ? m.entry_row_action_unskip() : m.entry_row_action_skip()}</span>
					</DropdownMenu.Item>
				{/if}
				<DropdownMenu.Item
					class="flex w-full cursor-default items-center gap-2 px-3 py-1.5 text-sm text-text outline-none data-highlighted:bg-surface-hover"
					onclick={() => onDuplicateEntry(entry)}
				>
					<span>⧉</span>
					<span>{m.entry_row_duplicate()}</span>
				</DropdownMenu.Item>
				<DropdownMenu.Item
					class="flex w-full cursor-default items-center gap-2 px-3 py-1.5 text-sm text-red outline-none data-highlighted:bg-danger-hover"
					onclick={() => onDeleteEntry(entry.id)}
				>
					<span>✕</span>
					<span>{m.entry_row_delete()}</span>
				</DropdownMenu.Item>
			</DropdownMenu.Content>
		</DropdownMenu.Portal>
	</DropdownMenu.Root>
</div>
	{/snippet}
</ContextMenu.Trigger>

<ContextMenu.Content
	class="z-50 min-w-[160px] overflow-hidden rounded-radius border border-border bg-surface py-1"
>
	{#if entry.recurrence !== RECURRENCE.SINGLE}
		<ContextMenu.Item
			disabled={isLastActiveMonth}
			class="flex w-full cursor-default items-center gap-2 px-3 py-1.5 text-sm outline-none data-highlighted:bg-surface-hover data-disabled:opacity-40 data-disabled:cursor-not-allowed {hasSkip ? 'text-accent' : 'text-text'}"
			title={isLastActiveMonth ? m.entry_row_skip_last_month_tooltip() : hasSkip ? m.entry_row_unskip_tooltip() : m.entry_row_skip_tooltip()}
			onclick={() => hasSkip ? onUnskipMonth(entry.id, month) : onSkipMonth(entry.id, month)}
		>
			<span>{hasSkip ? '↩' : '⊘'}</span>
			<span>{hasSkip ? m.entry_row_action_unskip() : m.entry_row_action_skip()}</span>
		</ContextMenu.Item>
	{/if}
	<ContextMenu.Item
		class="flex w-full cursor-default items-center gap-2 px-3 py-1.5 text-sm text-text outline-none data-highlighted:bg-surface-hover"
		onclick={() => onDuplicateEntry(entry)}
	>
		<span>⧉</span>
		<span>{m.entry_row_duplicate()}</span>
	</ContextMenu.Item>
	<ContextMenu.Item
		class="flex w-full cursor-default items-center gap-2 px-3 py-1.5 text-sm text-red outline-none data-highlighted:bg-danger-hover"
		onclick={() => onDeleteEntry(entry.id)}
	>
		<span>✕</span>
		<span>{m.entry_row_delete()}</span>
	</ContextMenu.Item>
</ContextMenu.Content>
</ContextMenu.Root>
