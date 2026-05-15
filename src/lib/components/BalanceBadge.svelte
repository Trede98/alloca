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
		class="inline-flex items-center px-1.5 py-0.5 text-xs font-medium"
		style:border-radius="var(--radius-sm)"
		style:background-color="color-mix(in srgb, var(--color-green) 15%, transparent)"
		style:color="var(--color-green)"
	>
		{m.balance_badge_compact()}
	</span>
{:else}
	<span
		class="inline-flex items-center px-1.5 py-0.5 text-xs font-medium"
		style:border-radius="var(--radius-sm)"
		style:background-color={balanced
			? 'color-mix(in srgb, var(--color-green) 15%, transparent)'
			: 'color-mix(in srgb, var(--color-red) 15%, transparent)'}
		style:color={balanced ? 'var(--color-green)' : 'var(--color-red)'}
	>
		{balanced ? m.balance_badge_full() : formatCurrency(balance, currency, locale)}
	</span>
{/if}
