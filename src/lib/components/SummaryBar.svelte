<script lang="ts">
	import type { YearSummary } from '$lib/types';
	import { formatCurrency } from '$lib/format';
	import { isBalanced } from '$lib/budget';

	let { summary }: { summary: YearSummary } = $props();

	const balanced = $derived(isBalanced(summary.yearlyBalance));
</script>

<div class="flex items-center gap-5 text-sm">
	<div class="flex items-center gap-1.5">
		<span style:color="var(--color-muted)" class="text-xs">Income</span>
		<span class="tabular-nums font-medium" style:color="var(--color-green)">{formatCurrency(summary.incomeTotal)}</span>
	</div>
	<div class="flex items-center gap-1.5">
		<span style:color="var(--color-muted)" class="text-xs">Expenses</span>
		<span class="tabular-nums font-medium" style:color="var(--color-red)">{formatCurrency(summary.expenseTotal)}</span>
	</div>
	<div class="flex items-center gap-1.5">
		<span style:color="var(--color-muted)" class="text-xs">Savings</span>
		<span class="tabular-nums font-medium" style:color="var(--color-blue)">{formatCurrency(summary.savingsTotal)}</span>
	</div>
	<div class="flex items-center gap-1.5">
		<span style:color="var(--color-muted)" class="text-xs">Balance</span>
		<span
			class="tabular-nums font-semibold"
			style:color={balanced ? 'var(--color-green)' : 'var(--color-red)'}
		>
			{formatCurrency(summary.yearlyBalance)}
		</span>
	</div>
</div>
