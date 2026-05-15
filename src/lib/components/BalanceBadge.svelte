<script lang="ts">
	import { formatCurrency } from '$lib/format';

	let {
		balance,
		currency = 'EUR',
		compact = false
	}: { balance: number; currency?: string; compact?: boolean } = $props();

	const balanced = $derived(Math.abs(balance) < 0.01);
</script>

{#if balanced && compact}
	<span
		class="inline-flex items-center px-1.5 py-0.5 text-xs font-medium"
		style:border-radius="var(--radius-sm)"
		style:background-color="color-mix(in srgb, var(--color-green) 15%, transparent)"
		style:color="var(--color-green)"
	>
		balanced
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
		{balanced ? '✓ Balanced' : formatCurrency(balance, currency)}
	</span>
{/if}
