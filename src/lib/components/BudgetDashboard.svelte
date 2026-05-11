<script lang="ts">
	import type { Budget } from '$lib/types';
	import { computeYearSummary, getAllMonthSummaries } from '$lib/budget';
	import SummaryBar from './SummaryBar.svelte';
	import MonthCard from './MonthCard.svelte';

	let { budget }: { budget: Budget } = $props();

	const yearSummary = $derived(computeYearSummary(budget));
	const monthSummaries = $derived(getAllMonthSummaries(budget));
</script>

<div class="flex flex-col gap-6 p-4">
	<div class="flex items-center justify-between">
		<h1 class="text-lg font-semibold">{budget.name} — {budget.year}</h1>
	</div>

	<SummaryBar summary={yearSummary} />

	<div class="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
		{#each monthSummaries as summary}
			<MonthCard {summary} />
		{/each}
	</div>
</div>
