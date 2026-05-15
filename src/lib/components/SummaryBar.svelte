<script lang="ts">
	import type { YearSummary } from '$lib/types';
	import { formatCurrency } from '$lib/format';
	import { isBalanced } from '$lib/budget';

	let { summary, currency }: { summary: YearSummary; currency: string } = $props();

	const balanced = $derived(isBalanced(summary.yearlyBalance));

	let containerEl = $state<HTMLDivElement | null>(null);
	let measureEl = $state<HTMLDivElement | null>(null);
	let useGrid = $state(false);

	$effect(() => {
		if (!containerEl || !measureEl) return;
		const observer = new ResizeObserver(() => {
			useGrid = measureEl!.scrollWidth > containerEl!.clientWidth + 1;
		});
		observer.observe(containerEl);
		return () => observer.disconnect();
	});
</script>

<div bind:this={containerEl} class="relative min-w-0 w-full flex items-center justify-center">
	<!-- Hidden measurement row: absolute so it never wraps, unrestricted so scrollWidth is always accurate -->
	<div
		bind:this={measureEl}
		class="pointer-events-none invisible absolute top-0 left-0 flex flex-nowrap items-center gap-x-5 whitespace-nowrap text-sm"
		aria-hidden="true"
	>
		<span class="flex items-center gap-1.5">
			<span class="text-xs opacity-70">Income</span>
			<span class="font-medium">{formatCurrency(summary.incomeTotal, currency)}</span>
		</span>
		<span class="opacity-20">·</span>
		<span class="flex items-center gap-1.5">
			<span class="text-xs opacity-70">Expenses</span>
			<span class="font-medium">{formatCurrency(summary.expenseTotal, currency)}</span>
		</span>
		<span class="opacity-20">·</span>
		<span class="flex items-center gap-1.5">
			<span class="text-xs opacity-70">Savings</span>
			<span class="font-medium">{formatCurrency(summary.savingsTotal, currency)}</span>
		</span>
		<span class="opacity-20">·</span>
		<span class="flex items-center gap-1.5">
			<span class="text-xs opacity-70">Balance</span>
			<span class="font-semibold">{formatCurrency(summary.yearlyBalance, currency)}</span>
		</span>
	</div>

	<!-- Visible display clipped independently so the flex-nowrap row doesn't spill -->
	<div class="overflow-hidden">
	{#if useGrid}
		<div class="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
			<div class="flex items-center gap-1.5">
				<span class="text-xs opacity-70" style:color="var(--color-muted)">Income</span>
				<span class="font-medium" style:color="var(--color-green)">{formatCurrency(summary.incomeTotal, currency)}</span>
			</div>
			<div class="flex items-center gap-1.5">
				<span class="text-xs opacity-70" style:color="var(--color-muted)">Expenses</span>
				<span class="font-medium" style:color="var(--color-red)">{formatCurrency(summary.expenseTotal, currency)}</span>
			</div>
			<div class="flex items-center gap-1.5">
				<span class="text-xs opacity-70" style:color="var(--color-muted)">Savings</span>
				<span class="font-medium" style:color="var(--color-blue)">{formatCurrency(summary.savingsTotal, currency)}</span>
			</div>
			<div class="flex items-center gap-1.5">
				<span class="text-xs opacity-70" style:color="var(--color-muted)">Balance</span>
				<span class="font-semibold" style:color={balanced ? 'var(--color-green)' : 'var(--color-red)'}>{formatCurrency(summary.yearlyBalance, currency)}</span>
			</div>
		</div>
	{:else}
		<div class="flex flex-nowrap items-center gap-x-5 text-sm">
			<div class="flex items-center gap-1.5">
				<span class="text-xs opacity-70" style:color="var(--color-muted)">Income</span>
				<span class="font-medium" style:color="var(--color-green)">{formatCurrency(summary.incomeTotal, currency)}</span>
			</div>
			<span class="opacity-20 select-none" aria-hidden="true" style:color="var(--color-muted)">·</span>
			<div class="flex items-center gap-1.5">
				<span class="text-xs opacity-70" style:color="var(--color-muted)">Expenses</span>
				<span class="font-medium" style:color="var(--color-red)">{formatCurrency(summary.expenseTotal, currency)}</span>
			</div>
			<span class="opacity-20 select-none" aria-hidden="true" style:color="var(--color-muted)">·</span>
			<div class="flex items-center gap-1.5">
				<span class="text-xs opacity-70" style:color="var(--color-muted)">Savings</span>
				<span class="font-medium" style:color="var(--color-blue)">{formatCurrency(summary.savingsTotal, currency)}</span>
			</div>
			<span class="opacity-20 select-none" aria-hidden="true" style:color="var(--color-muted)">·</span>
			<div class="flex items-center gap-1.5">
				<span class="text-xs opacity-70" style:color="var(--color-muted)">Balance</span>
				<span class="font-semibold" style:color={balanced ? 'var(--color-green)' : 'var(--color-red)'}>{formatCurrency(summary.yearlyBalance, currency)}</span>
			</div>
		</div>
	{/if}
	</div>
</div>
