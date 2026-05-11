<script lang="ts">
	import type { MonthSummary } from '$lib/types';
	import { formatCurrency, MONTH_NAMES } from '$lib/format';
	import { isBalanced } from '$lib/budget';
	import BalanceBadge from './BalanceBadge.svelte';

	let {
		summary,
		selected = false,
		onclick
	}: {
		summary: MonthSummary;
		selected?: boolean;
		onclick?: () => void;
	} = $props();

	const balanced = $derived(isBalanced(summary.balance));
</script>

<button
	type="button"
	class="flex w-full flex-col gap-1.5 rounded-lg border p-2.5 text-left transition-colors"
	style:background-color={selected ? 'color-mix(in srgb, var(--color-blue) 10%, var(--color-surface))' : 'var(--color-surface)'}
	style:border-color={selected ? 'var(--color-blue)' : balanced ? 'var(--color-border)' : 'color-mix(in srgb, var(--color-red) 40%, var(--color-border))'}
	onclick={onclick}
>
	<div class="flex items-center justify-between">
		<span class="text-sm font-medium">{MONTH_NAMES[summary.month]}</span>
		<BalanceBadge balance={summary.balance} />
	</div>
	<div class="grid grid-cols-3 gap-1 text-xs">
		<div>
			<div style:color="var(--color-muted)">In</div>
			<div class="tabular-nums" style:color="var(--color-green)">{formatCurrency(summary.incomeTotal)}</div>
		</div>
		<div>
			<div style:color="var(--color-muted)">Out</div>
			<div class="tabular-nums" style:color="var(--color-red)">{formatCurrency(summary.expenseTotal)}</div>
		</div>
		<div>
			<div style:color="var(--color-muted)">Save</div>
			<div class="tabular-nums" style:color="var(--color-blue)">{formatCurrency(summary.savingsTotal)}</div>
		</div>
	</div>
</button>
