<script lang="ts">
	import type { Category } from '$lib/types';

	let {
		categories,
		onAddCategory,
		onUpdateCategory,
		onDeleteCategory,
		categoryError,
		onClearCategoryError,
		modal = false,
		open = $bindable(false)
	}: {
		categories: Category[];
		onAddCategory: (name: string) => void;
		onUpdateCategory: (id: string, name: string) => void;
		onDeleteCategory: (id: string) => void;
		categoryError: string;
		onClearCategoryError: () => void;
		modal?: boolean;
		open?: boolean;
	} = $props();

	let newCategoryName = $state('');
	let editingId = $state<string | null>(null);
	let editingName = $state('');

	function toggle() {
		open = !open;
		if (!open) {
			editingId = null;
			onClearCategoryError();
		}
	}

	function close() {
		open = false;
		editingId = null;
		onClearCategoryError();
	}

	function addNew() {
		const name = newCategoryName.trim();
		if (!name) return;
		onAddCategory(name);
		newCategoryName = '';
	}

	let editInputEl = $state<HTMLInputElement | null>(null);

	function startEdit(cat: Category) {
		editingId = cat.id;
		editingName = cat.name;
		setTimeout(() => editInputEl?.focus(), 0);
	}

	function commitEdit() {
		if (editingId && editingName.trim()) {
			onUpdateCategory(editingId, editingName);
		}
		editingId = null;
	}

	function cancelEdit() {
		editingId = null;
	}

	function onEditKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') commitEdit();
		if (e.key === 'Escape') cancelEdit();
	}

	function onNewKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') addNew();
	}

	const inputClass =
		'border px-2 py-1 text-sm outline-none focus:ring-1 focus:ring-[--color-accent]/40 transition-colors';
	const inputStyle = `background-color: var(--color-bg); border-color: var(--color-border); color: var(--color-text); border-radius: var(--radius-sm);`;
</script>

{#snippet panelContent()}
	<div class="text-xs font-medium" style:color="var(--color-muted)">
		Categories
	</div>

	<!-- Category list -->
	<div class="flex flex-col gap-1">
		{#if categories.length === 0}
			<p class="text-xs" style:color="var(--color-muted)">No categories yet.</p>
		{/if}
		{#each categories as cat (cat.id)}
			<div class="flex items-center gap-1">
				{#if editingId === cat.id}
					<input
						bind:this={editInputEl}
						bind:value={editingName}
						class="{inputClass} flex-1 min-w-0"
						style={inputStyle}
						onblur={commitEdit}
						onkeydown={onEditKeydown}
					/>
				{:else}
					<button
						type="button"
						class="flex-1 min-w-0 truncate px-2 py-1 text-left text-sm hover:opacity-70 transition-opacity"
						style:border-radius="var(--radius-sm)"
						style:color="var(--color-text)"
						onclick={() => startEdit(cat)}
						title="Click to rename"
					>
						{cat.name}
					</button>
				{/if}
				<button
					type="button"
					class="shrink-0 p-1 text-xs opacity-40 transition-opacity hover:opacity-100"
					style:border-radius="var(--radius-sm)"
					style:color="var(--color-red)"
					onclick={() => onDeleteCategory(cat.id)}
					title="Delete category"
					aria-label="Delete {cat.name}"
				>
					✕
				</button>
			</div>
		{/each}
	</div>

	<!-- Error -->
	{#if categoryError}
		<div
			class="flex items-center justify-between gap-2 px-2.5 py-1.5 text-xs"
			style:border-radius="var(--radius-sm)"
			style:color="var(--color-red)"
			style:background-color="color-mix(in srgb, var(--color-red) 10%, transparent)"
		>
			<span>{categoryError}</span>
			<button
				type="button"
				class="shrink-0 opacity-60 hover:opacity-100"
				onclick={onClearCategoryError}
				aria-label="Dismiss error"
			>✕</button>
		</div>
	{/if}

	<!-- Divider -->
	<div class="border-t" style:border-color="var(--color-border)"></div>

	<!-- Add new -->
	<div class="flex gap-1.5">
		<input
			bind:value={newCategoryName}
			type="text"
			placeholder="New category…"
			class="{inputClass} flex-1 min-w-0"
			style={inputStyle}
			onkeydown={onNewKeydown}
		/>
		<button
			type="button"
			class="shrink-0 px-2.5 py-1 text-xs font-medium transition-opacity hover:opacity-90"
			style:border-radius="var(--radius-sm)"
			style:background-color="var(--color-accent)"
			style:color="var(--color-accent-fg)"
			onclick={addNew}
		>
			Add
		</button>
	</div>
{/snippet}

{#if modal}
	<!-- Modal mode: triggered externally via bind:open -->
	{#if open}
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div
			class="fixed inset-0 z-50 flex items-center justify-center p-4"
			style:background-color="var(--overlay-bg)"
			onclick={(e) => { if (e.target === e.currentTarget) close(); }}
			onkeydown={(e) => e.key === 'Escape' && close()}
		>
			<div
				class="w-full max-w-sm flex flex-col gap-2 border p-3"
				style:border-radius="var(--radius)"
				style:background-color="var(--color-surface)"
				style:border-color="var(--color-border)"
				style:box-shadow="var(--shadow-modal)"
			>
				<div class="flex items-center justify-between">
					<span class="text-sm font-semibold">Categories</span>
					<button
						type="button"
						class="p-1 text-xs opacity-40 hover:opacity-80 transition-opacity"
						style:color="var(--color-text)"
						onclick={close}
						aria-label="Close"
					>✕</button>
				</div>
				{@render panelContent()}
			</div>
		</div>
	{/if}
{:else}
	<!-- Popover mode: self-contained trigger + anchored panel -->
	<div class="relative">
		<button
			type="button"
			class="px-2.5 py-1 text-xs font-medium opacity-60 transition-opacity hover:opacity-90"
			style:border-radius="var(--radius-sm)"
			style:color="var(--color-text)"
			style:background-color={open ? 'var(--color-border)' : 'transparent'}
			onclick={toggle}
			title="Manage categories"
		>
			Categories
		</button>

		{#if open}
			<!-- Backdrop -->
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<div
				class="fixed inset-0 z-40"
				onclick={close}
				onkeydown={(e) => e.key === 'Escape' && close()}
			></div>

			<!-- Panel -->
			<div
				class="absolute right-0 top-full z-50 mt-1 flex w-60 flex-col gap-2 border p-3"
				style:border-radius="var(--radius)"
				style:background-color="var(--color-surface)"
				style:border-color="var(--color-border)"
				style:box-shadow="var(--shadow-dropdown)"
			>
				{@render panelContent()}
			</div>
		{/if}
	</div>
{/if}
