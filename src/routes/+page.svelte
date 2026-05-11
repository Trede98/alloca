<script lang="ts">
	import { onMount } from 'svelte';
	import { loadBudget, saveBudget } from '$lib/db';
	import { createSeedBudget } from '$lib/seed';
	import BudgetDashboard from '$lib/components/BudgetDashboard.svelte';
	import type { Budget } from '$lib/types';

	let budget = $state<Budget | null>(null);
	let loading = $state(true);

	onMount(async () => {
		let existing = await loadBudget();
		if (!existing) {
			existing = createSeedBudget();
			await saveBudget(existing);
		}
		budget = existing;
		loading = false;
	});
</script>

{#if loading}
	<div class="flex h-screen items-center justify-center" style:color="var(--color-muted)">
		Loading…
	</div>
{:else if budget}
	<BudgetDashboard {budget} />
{/if}
