<script lang="ts">
	import '../app.css';
	import { onMount } from 'svelte';
	import { getTheme } from '$lib/theme';

	let { children } = $props();

	onMount(() => {
		// Apply persisted theme on hydration
		const t = getTheme();
		document.documentElement.setAttribute('data-theme', t);
	});
</script>

{@render children()}
