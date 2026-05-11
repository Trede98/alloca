<script lang="ts">
	import { formatCurrency } from '$lib/format';

	let { balance, currency = 'EUR' }: { balance: number; currency?: string } = $props();

	const balanced = $derived(Math.abs(balance) < 0.01);
</script>

<span
	class="inline-flex items-center rounded-md px-1.5 py-0.5 text-xs font-medium"
	style:background-color={balanced
		? 'color-mix(in srgb, var(--color-green) 15%, transparent)'
		: 'color-mix(in srgb, var(--color-red) 15%, transparent)'}
	style:color={balanced ? 'var(--color-green)' : 'var(--color-red)'}
>
	{balanced ? '✓ Balanced' : formatCurrency(balance, currency)}
</span>
