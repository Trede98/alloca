<script lang="ts">
	import type { YearSummary } from '$lib/types';
	import { formatCurrency } from '$lib/format';
	import { isBalanced } from '$lib/budget';

	let { summary, currency }: { summary: YearSummary; currency: string } = $props();

	const balanced = $derived(isBalanced(summary.yearlyBalance));
</script>

<div class="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm">
	<div class="flex items-center gap-1.5">
		<span class="text-xs" style:color="var(--color-muted)">Income</span>
		<span class="tabular-nums font-medium" style:color="var(--color-green)">
			{formatCurrency(summary.incomeTotal, currency)}
		</span>
	</div>
	<div class="flex items-center gap-1.5">
		<span class="text-xs" style:color="var(--color-muted)">Expenses</span>
		<span class="tabular-nums font-medium" style:color="var(--color-red)">
			{formatCurrency(summary.expenseTotal, currency)}
		</span>
	</div>
	<div class="flex items-center gap-1.5">
		<span class="text-xs" style:color="var(--color-muted)">Savings</span>
		<span class="tabular-nums font-medium" style:color="var(--color-blue)">
			{formatCurrency(summary.savingsTotal, currency)}
		</span>
	</div>
	<div class="flex items-center gap-1.5">
		<span class="text-xs" style:color="var(--color-muted)">Balance</span>
		<span
			class="tabular-nums font-semibold"
			style:color={balanced ? 'var(--color-green)' : 'var(--color-red)'}
		>
			{formatCurrency(summary.yearlyBalance, currency)}
		</span>
	</div>
</div>
