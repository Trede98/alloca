<script lang="ts">
	import type { MonthSummary } from '$lib/types';
	import { formatCurrency, formatCompact, MONTH_NAMES } from '$lib/format';
	import { isBalanced } from '$lib/budget';
	import BalanceBadge from './BalanceBadge.svelte';

	let {
		summary,
		selected = false,
		currency,
		onclick
	}: {
		summary: MonthSummary;
		selected?: boolean;
		currency: string;
		onclick?: () => void;
	} = $props();

	const balanced = $derived(isBalanced(summary.balance));
</script>

<button
	type="button"
	class="flex w-full flex-col gap-1.5 border p-2.5 text-left transition-all duration-150"
	style:border-radius="var(--radius)"
	style:background-color={selected
		? 'color-mix(in srgb, var(--color-accent) 12%, var(--color-surface))'
		: 'var(--color-surface)'}
	style:border-color={selected
		? 'var(--color-accent)'
		: balanced
			? 'var(--color-border)'
			: 'color-mix(in srgb, var(--color-red) 40%, var(--color-border))'}
	style:box-shadow="var(--shadow-card)"
	onclick={onclick}
>
	<div class="flex items-center justify-between">
		<span class="text-sm font-medium">{MONTH_NAMES[summary.month]}</span>
		<BalanceBadge balance={summary.balance} compact={true} />
	</div>
	<div class="grid grid-cols-3 gap-1 text-xs">
		<div class="min-w-0 overflow-hidden">
			<div class="text-[10px]" style:color="var(--color-subtle)">In</div>
			<div class="tabular-nums leading-tight text-xs" style:color="var(--color-green)">{formatCompact(summary.incomeTotal, currency)}</div>
		</div>
		<div class="min-w-0 overflow-hidden">
			<div class="text-[10px]" style:color="var(--color-subtle)">Out</div>
			<div class="tabular-nums leading-tight text-xs" style:color="var(--color-red)">{formatCompact(summary.expenseTotal, currency)}</div>
		</div>
		<div class="min-w-0 overflow-hidden">
			<div class="text-[10px]" style:color="var(--color-subtle)">Save</div>
			<div class="tabular-nums leading-tight text-xs" style:color="var(--color-blue)">{formatCompact(summary.savingsTotal, currency)}</div>
		</div>
	</div>
</button>
