<script lang="ts">
	import type { Category } from '$lib/types';

	let {
		categories,
		onAddCategory,
		onUpdateCategory,
		onDeleteCategory,
		categoryError,
		onClearCategoryError
	}: {
		categories: Category[];
		onAddCategory: (name: string) => void;
		onUpdateCategory: (id: string, name: string) => void;
		onDeleteCategory: (id: string) => void;
		categoryError: string;
		onClearCategoryError: () => void;
	} = $props();

	let open = $state(false);
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

	function closeBackdrop() {
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
		'rounded-lg border px-2 py-1 text-sm outline-none focus:ring-1 focus:ring-blue-500/40 transition-colors';
	const inputStyle = `background-color: var(--color-bg); border-color: var(--color-border); color: var(--color-text);`;
</script>

<div class="relative">
	<button
		type="button"
		class="rounded px-2.5 py-1.5 text-xs font-medium opacity-70 transition-opacity hover:opacity-100"
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
			onclick={closeBackdrop}
			onkeydown={(e) => e.key === 'Escape' && closeBackdrop()}
		></div>

		<!-- Panel -->
		<div
			class="absolute right-0 top-full z-50 mt-1 flex w-60 flex-col gap-2 rounded-xl border p-3 shadow-xl"
			style:background-color="var(--color-surface)"
			style:border-color="var(--color-border)"
		>
			<div class="text-xs font-semibold uppercase tracking-widest" style:color="var(--color-muted)">
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
								class="flex-1 min-w-0 truncate rounded px-2 py-1 text-left text-sm hover:opacity-70 transition-opacity"
								style:color="var(--color-text)"
								onclick={() => startEdit(cat)}
								title="Click to rename"
							>
								{cat.name}
							</button>
						{/if}
						<button
							type="button"
							class="shrink-0 rounded p-1 text-xs opacity-40 transition-opacity hover:opacity-100"
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
					class="flex items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-xs"
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
					class="shrink-0 rounded-lg px-2.5 py-1 text-xs font-medium transition-opacity hover:opacity-90"
					style:background-color="var(--color-blue)"
					style:color="white"
					onclick={addNew}
				>
					Add
				</button>
			</div>
		</div>
	{/if}
</div>
