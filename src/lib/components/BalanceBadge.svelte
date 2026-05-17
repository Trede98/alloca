<script lang="ts">
	import { formatCurrency } from '$lib/format';
	import * as m from '$lib/paraglide/messages';
	import { getLocale } from '$lib/paraglide/runtime';

	let {
		balance,
		currency = 'EUR',
		compact = false
	}: { balance: number; currency?: string; compact?: boolean } = $props();

	const balanced = $derived(Math.abs(balance) < 0.01);
	const locale = $derived(getLocale());
</script>

{#if balanced && compact}
	<span
		class="inline-flex items-center rounded-sm px-1.5 py-0.5 text-xs font-medium text-green bg-green-subtle"
	>
		{m.balance_badge_compact()}
	</span>
{:else}
	<span
		class="inline-flex items-center rounded-sm px-1.5 py-0.5 text-xs font-medium"
		class:text-green={balanced}
		class:text-red={!balanced}
		class:bg-green-subtle={balanced}
		class:bg-red-subtle={!balanced}
	>
		{balanced ? m.balance_badge_full() : formatCurrency(balance, currency, locale)}
	</span>
{/if}
