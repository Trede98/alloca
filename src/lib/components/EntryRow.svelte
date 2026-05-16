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
		{#if hasOverride && !isAnnualDistributed}
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
		{:else if isAnnualDistributed}
			<span class="px-1.5 py-0.5" style:color="var(--color-text)">
				{formatCurrency(currentAmount, currency, locale)}
			</span>
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

	<!-- More actions dropdown -->
	<DropdownMenu.Root>
		<DropdownMenu.Trigger>
			{#snippet child({ props })}
				<button
					type="button"
					{...props}
					class="p-1 text-xs opacity-40 transition-opacity hover:opacity-100"
					style:border-radius="var(--radius-sm)"
					style:color="var(--color-text)"
					title="More actions"
				>
					⋯
				</button>
			{/snippet}
		</DropdownMenu.Trigger>
		<DropdownMenu.Portal>
			<DropdownMenu.Content
				sideOffset={4}
				align="end"
				class="z-50 min-w-[160px] overflow-hidden py-1"
				style="background-color: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius); box-shadow: var(--shadow-dropdown);"
			>
				{#if entry.recurrence !== RECURRENCE.SINGLE}
					<DropdownMenu.Item
						disabled={isLastActiveMonth}
						class="flex w-full cursor-default items-center gap-2 px-3 py-1.5 text-sm outline-none data-highlighted:bg-surface-hover data-disabled:opacity-40 data-disabled:cursor-not-allowed"
						style="color: {hasSkip ? 'var(--color-accent)' : 'var(--color-text)'}"
						title={isLastActiveMonth ? m.entry_row_skip_last_month_tooltip() : hasSkip ? m.entry_row_unskip_tooltip() : m.entry_row_skip_tooltip()}
						onclick={() => hasSkip ? onUnskipMonth(entry.id, month) : onSkipMonth(entry.id, month)}
					>
						<span>{hasSkip ? '↩' : '⊘'}</span>
						<span>{hasSkip ? m.entry_row_action_unskip() : m.entry_row_action_skip()}</span>
					</DropdownMenu.Item>
				{/if}
				<DropdownMenu.Item
					class="flex w-full cursor-default items-center gap-2 px-3 py-1.5 text-sm outline-none data-highlighted:bg-surface-hover"
					style="color: var(--color-text)"
					onclick={() => onDuplicateEntry(entry)}
				>
					<span>⧉</span>
					<span>{m.entry_row_duplicate()}</span>
				</DropdownMenu.Item>
				<DropdownMenu.Item
					class="flex w-full cursor-default items-center gap-2 px-3 py-1.5 text-sm outline-none data-highlighted:bg-danger-hover"
					style="color: var(--color-red)"
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
	class="z-50 min-w-[160px] overflow-hidden py-1"
	style="background-color: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius); box-shadow: var(--shadow-dropdown);"
>
	{#if entry.recurrence !== RECURRENCE.SINGLE}
		<ContextMenu.Item
			disabled={isLastActiveMonth}
			class="flex w-full cursor-default items-center gap-2 px-3 py-1.5 text-sm outline-none data-highlighted:bg-surface-hover data-disabled:opacity-40 data-disabled:cursor-not-allowed"
			style="color: {hasSkip ? 'var(--color-accent)' : 'var(--color-text)'}"
			title={isLastActiveMonth ? m.entry_row_skip_last_month_tooltip() : hasSkip ? m.entry_row_unskip_tooltip() : m.entry_row_skip_tooltip()}
			onclick={() => hasSkip ? onUnskipMonth(entry.id, month) : onSkipMonth(entry.id, month)}
		>
			<span>{hasSkip ? '↩' : '⊘'}</span>
			<span>{hasSkip ? m.entry_row_action_unskip() : m.entry_row_action_skip()}</span>
		</ContextMenu.Item>
	{/if}
	<ContextMenu.Item
		class="flex w-full cursor-default items-center gap-2 px-3 py-1.5 text-sm outline-none data-highlighted:bg-surface-hover"
		style="color: var(--color-text)"
		onclick={() => onDuplicateEntry(entry)}
	>
		<span>⧉</span>
		<span>{m.entry_row_duplicate()}</span>
	</ContextMenu.Item>
	<ContextMenu.Item
		class="flex w-full cursor-default items-center gap-2 px-3 py-1.5 text-sm outline-none data-highlighted:bg-danger-hover"
		style="color: var(--color-red)"
		onclick={() => onDeleteEntry(entry.id)}
	>
		<span>✕</span>
		<span>{m.entry_row_delete()}</span>
	</ContextMenu.Item>
</ContextMenu.Content>
</ContextMenu.Root>
