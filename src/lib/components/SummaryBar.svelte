<script lang="ts">
	import type { YearSummary } from '$lib/types';
	import { formatCurrency } from '$lib/format';

	let { summary }: { summary: YearSummary } = $props();

	const isBalanced = $derived(Math.abs(summary.yearlyBalance) < 0.01);
</script>

<div
	class="flex flex-wrap items-center gap-6 rounded-lg border p-4"
	style:background-color="var(--color-surface)"
	style:border-color="var(--color-border)"
>
	<div class="flex flex-col">
		<span class="text-xs" style:color="var(--color-muted)">Income</span>
		<span class="font-semibold" style:color="var(--color-green)">{formatCurrency(summary.incomeTotal)}</span>
	</div>
	<div class="flex flex-col">
		<span class="text-xs" style:color="var(--color-muted)">Expenses</span>
		<span class="font-semibold" style:color="var(--color-red)">{formatCurrency(summary.expenseTotal)}</span>
	</div>
	<div class="flex flex-col">
		<span class="text-xs" style:color="var(--color-muted)">Savings</span>
		<span class="font-semibold" style:color="var(--color-blue)">{formatCurrency(summary.savingsTotal)}</span>
	</div>
	<div class="flex flex-col">
		<span class="text-xs" style:color="var(--color-muted)">Balance</span>
		<span
			class="font-semibold"
			style:color={isBalanced ? 'var(--color-green)' : 'var(--color-red)'}
		>
			{formatCurrency(summary.yearlyBalance)}
		</span>
	</div>
</div>
