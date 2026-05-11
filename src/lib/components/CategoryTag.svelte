<script lang="ts">
	let { category }: { category: string } = $props();
</script>

<span
	class="inline-flex items-center rounded px-1.5 py-0.5 text-xs"
	style:background-color="color-mix(in srgb, var(--color-blue) 12%, transparent)"
	style:color="var(--color-muted)"
>
	{category}
</span>
