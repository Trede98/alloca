<script lang="ts">
	import type { MonthSummary } from '$lib/types';
	import { formatCurrency, MONTH_NAMES } from '$lib/format';
	import BalanceBadge from './BalanceBadge.svelte';

	let { summary, onclick }: { summary: MonthSummary; onclick?: () => void } = $props();
</script>

<button
	type="button"
	class="flex flex-col gap-2 rounded-lg border p-3 text-left transition-colors hover:brightness-110 w-full"
	style:background-color="var(--color-surface)"
	style:border-color="var(--color-border)"
	onclick={onclick}
>
	<div class="flex items-center justify-between">
		<span class="font-medium">{MONTH_NAMES[summary.month]}</span>
		<BalanceBadge balance={summary.balance} />
	</div>
	<div class="grid grid-cols-3 gap-1 text-xs">
		<div>
			<div style:color="var(--color-muted)">In</div>
			<div style:color="var(--color-green)">{formatCurrency(summary.incomeTotal)}</div>
		</div>
		<div>
			<div style:color="var(--color-muted)">Out</div>
			<div style:color="var(--color-red)">{formatCurrency(summary.expenseTotal)}</div>
		</div>
		<div>
			<div style:color="var(--color-muted)">Save</div>
			<div style:color="var(--color-blue)">{formatCurrency(summary.savingsTotal)}</div>
		</div>
	</div>
</button>
