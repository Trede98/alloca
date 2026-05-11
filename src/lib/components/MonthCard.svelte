<script lang="ts">
	import type { MonthSummary } from '$lib/types';
	import { formatCurrency, MONTH_NAMES } from '$lib/format';
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
	class="flex w-full flex-col gap-1.5 rounded-lg border p-2.5 text-left transition-all duration-150"
	style:background-color={selected ? 'color-mix(in srgb, var(--color-blue) 12%, var(--color-surface))' : 'var(--color-surface)'}
	style:border-color={selected
		? 'var(--color-blue)'
		: balanced
			? 'var(--color-border)'
			: 'color-mix(in srgb, var(--color-red) 40%, var(--color-border))'}
	style:box-shadow={selected ? '0 0 0 1px var(--color-blue)' : 'none'}
	onclick={onclick}
>
	<div class="flex items-center justify-between">
		<span class="text-sm font-medium">{MONTH_NAMES[summary.month]}</span>
		<BalanceBadge balance={summary.balance} />
	</div>
	<div class="grid grid-cols-3 gap-1 text-xs">
		<div>
			<div class="text-xs" style:color="var(--color-muted)">In</div>
			<div class="tabular-nums" style:color="var(--color-green)">{formatCurrency(summary.incomeTotal, currency)}</div>
		</div>
		<div>
			<div class="text-xs" style:color="var(--color-muted)">Out</div>
			<div class="tabular-nums" style:color="var(--color-red)">{formatCurrency(summary.expenseTotal, currency)}</div>
		</div>
		<div>
			<div class="text-xs" style:color="var(--color-muted)">Save</div>
			<div class="tabular-nums" style:color="var(--color-blue)">{formatCurrency(summary.savingsTotal, currency)}</div>
		</div>
	</div>
</button>
