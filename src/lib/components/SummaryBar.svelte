<script lang="ts">
	import type { YearSummary } from '$lib/types';
	import { formatCurrency } from '$lib/format';
	import { isBalanced } from '$lib/budget';
	import * as m from '$lib/paraglide/messages';
	import { getLocale } from '$lib/paraglide/runtime';

	let { summary, currency }: { summary: YearSummary; currency: string } = $props();

	const balanced = $derived(isBalanced(summary.yearlyBalance));
	const locale = $derived(getLocale());

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
			<span class="text-xs opacity-70">{m.summary_income()}</span>
			<span class="font-medium">{formatCurrency(summary.incomeTotal, currency, locale)}</span>
		</span>
		<span class="opacity-20">·</span>
		<span class="flex items-center gap-1.5">
			<span class="text-xs opacity-70">{m.summary_expenses()}</span>
			<span class="font-medium">{formatCurrency(summary.expenseTotal, currency, locale)}</span>
		</span>
		<span class="opacity-20">·</span>
		<span class="flex items-center gap-1.5">
			<span class="text-xs opacity-70">{m.summary_savings()}</span>
			<span class="font-medium">{formatCurrency(summary.savingsTotal, currency, locale)}</span>
		</span>
		<span class="opacity-20">·</span>
		<span class="flex items-center gap-1.5">
			<span class="text-xs opacity-70">{m.summary_balance()}</span>
			<span class="font-semibold">{formatCurrency(summary.yearlyBalance, currency, locale)}</span>
		</span>
	</div>

	<!-- Visible display clipped independently so the flex-nowrap row doesn't spill -->
	<div class="overflow-hidden">
	{#if useGrid}
		<div class="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
			<div class="flex items-center gap-1.5">
				<span class="text-xs opacity-70 text-muted">{m.summary_income()}</span>
				<span class="font-medium text-green">{formatCurrency(summary.incomeTotal, currency, locale)}</span>
			</div>
			<div class="flex items-center gap-1.5">
				<span class="text-xs opacity-70 text-muted">{m.summary_expenses()}</span>
				<span class="font-medium text-red">{formatCurrency(summary.expenseTotal, currency, locale)}</span>
			</div>
			<div class="flex items-center gap-1.5">
				<span class="text-xs opacity-70 text-muted">{m.summary_savings()}</span>
				<span class="font-medium text-blue">{formatCurrency(summary.savingsTotal, currency, locale)}</span>
			</div>
			<div class="flex items-center gap-1.5">
				<span class="text-xs opacity-70 text-muted">{m.summary_balance()}</span>
				<span class="font-semibold" class:text-green={balanced} class:text-red={!balanced}>{formatCurrency(summary.yearlyBalance, currency, locale)}</span>
			</div>
		</div>
	{:else}
		<div class="flex flex-nowrap items-center gap-x-5 text-sm">
			<div class="flex items-center gap-1.5">
				<span class="text-xs opacity-70 text-muted">{m.summary_income()}</span>
				<span class="font-medium text-green">{formatCurrency(summary.incomeTotal, currency, locale)}</span>
			</div>
			<span class="opacity-20 select-none text-muted" aria-hidden="true">·</span>
			<div class="flex items-center gap-1.5">
				<span class="text-xs opacity-70 text-muted">{m.summary_expenses()}</span>
				<span class="font-medium text-red">{formatCurrency(summary.expenseTotal, currency, locale)}</span>
			</div>
			<span class="opacity-20 select-none text-muted" aria-hidden="true">·</span>
			<div class="flex items-center gap-1.5">
				<span class="text-xs opacity-70 text-muted">{m.summary_savings()}</span>
				<span class="font-medium text-blue">{formatCurrency(summary.savingsTotal, currency, locale)}</span>
			</div>
			<span class="opacity-20 select-none text-muted" aria-hidden="true">·</span>
			<div class="flex items-center gap-1.5">
				<span class="text-xs opacity-70 text-muted">{m.summary_balance()}</span>
				<span class="font-semibold" class:text-green={balanced} class:text-red={!balanced}>{formatCurrency(summary.yearlyBalance, currency, locale)}</span>
			</div>
		</div>
	{/if}
	</div>
</div>
