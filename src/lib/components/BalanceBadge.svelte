<script lang="ts">
	import { formatCurrency } from '$lib/format';

	let { balance }: { balance: number } = $props();

	const isBalanced = $derived(Math.abs(balance) < 0.01);
</script>

<span
	class="inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium"
	style:background-color={isBalanced ? 'color-mix(in srgb, var(--color-green) 15%, transparent)' : 'color-mix(in srgb, var(--color-red) 15%, transparent)'}
	style:color={isBalanced ? 'var(--color-green)' : 'var(--color-red)'}
>
	{isBalanced ? '✓ Balanced' : formatCurrency(balance)}
</span>
