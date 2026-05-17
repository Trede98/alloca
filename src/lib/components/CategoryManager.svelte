<script lang="ts">
	import type { Category } from '$lib/types';
	import * as m from '$lib/paraglide/messages';
	import { Trash2 } from 'lucide-svelte';
	import { Dialog } from 'bits-ui';

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
		'border border-border bg-bg rounded-sm px-2.5 py-2 text-sm text-text outline-none focus:ring-1 focus:ring-[--color-accent]/40 transition-colors';
</script>

{#snippet panelContent()}
	<!-- Category list -->
	<div class="overflow-y-auto max-h-[260px]">
	<div class="flex flex-col gap-1">
		{#if categories.length === 0}
			<p class="text-xs text-muted">{m.category_manager_empty()}</p>
		{/if}
		{#each categories as cat (cat.id)}
			<div class="flex items-center gap-1.5 border-b border-border py-1 last:border-b-0">
				{#if editingId === cat.id}
					<input
						bind:this={editInputEl}
						bind:value={editingName}
						class="{inputClass} flex-1 min-w-0"
						onblur={commitEdit}
						onkeydown={onEditKeydown}
					/>
				{:else}
					<button
						type="button"
						class="flex-1 min-w-0 truncate rounded-sm px-2 py-1 text-left text-sm text-text hover:bg-surface-hover transition-colors"
						onclick={() => startEdit(cat)}
						title={m.category_manager_click_to_rename()}
					>
						{cat.name}
					</button>
				{/if}
				<button
					type="button"
					class="shrink-0 rounded-sm p-1 text-red opacity-40 transition-opacity hover:opacity-100"
					onclick={() => onDeleteCategory(cat.id)}
					title={m.category_manager_delete()}
					aria-label={m.category_manager_delete_aria({ name: cat.name })}
				>
					<Trash2 size={14} />
				</button>
			</div>
		{/each}
	</div>
	</div>

	<!-- Error -->
	{#if categoryError}
		<div class="flex items-center justify-between gap-2 rounded-sm bg-red-faint px-2.5 py-1.5 text-xs text-red">
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
	<div class="border-t border-border"></div>

	<!-- Add new -->
	<div class="flex gap-1.5">
		<input
			bind:value={newCategoryName}
			type="text"
			placeholder={m.category_manager_placeholder()}
			class="{inputClass} flex-1 min-w-0"
			onkeydown={onNewKeydown}
		/>
		<button
			type="button"
			class="shrink-0 rounded-sm bg-accent px-2.5 py-1 text-xs font-medium text-accent-fg transition-opacity hover:opacity-90"
			onclick={addNew}
		>
			{m.add()}
		</button>
	</div>
{/snippet}

{#if modal}
	<!-- Modal mode: triggered externally via bind:open -->
	<Dialog.Root bind:open onOpenChange={(v) => { if (!v) close(); }}>
		<Dialog.Portal>
			<Dialog.Overlay class="fixed inset-0 z-50 bg-overlay" />
			<Dialog.Content
				class="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
			>
				<div class="pointer-events-auto w-full max-w-sm flex flex-col gap-4 rounded-radius border border-border bg-surface p-5">
					<div class="flex items-center justify-between">
						<Dialog.Title class="text-sm font-semibold">{m.categories()}</Dialog.Title>
						<Dialog.Close
							class="p-1 text-xs text-text opacity-40 hover:opacity-80 transition-opacity"
							aria-label="Close"
						>✕</Dialog.Close>
					</div>
					{@render panelContent()}
				</div>
			</Dialog.Content>
		</Dialog.Portal>
	</Dialog.Root>
{:else}
	<!-- Popover mode: self-contained trigger + anchored panel -->
	<div class="relative">
		<button
			type="button"
			class="rounded-sm px-2.5 py-1 text-xs font-medium text-text opacity-60 transition-opacity hover:opacity-90"
			class:bg-border={open}
			onclick={toggle}
			title="Manage categories"
		>
			{m.categories()}
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
			<div class="absolute right-0 top-full z-50 mt-1 flex w-60 flex-col gap-2 rounded-radius border border-border bg-surface p-3">
				{@render panelContent()}
			</div>
		{/if}
	</div>
{/if}
