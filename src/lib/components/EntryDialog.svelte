<script lang="ts">
	import type { Category, Entry, EntryType, Recurrence } from '$lib/types';
	import type { NewEntryInput } from '$lib/budget';
	import { getMonthShort } from '$lib/format';
	import { Dialog, Combobox } from 'bits-ui';
	import * as m from '$lib/paraglide/messages';
	import { getLocale } from '$lib/paraglide/runtime';
	import { ENTRY_TYPE, ENTRY_TYPES, ENTRY_TYPE_LABELS, MONTHS_PER_YEAR, RECURRENCE, RECURRENCE_LABELS, RECURRENCES } from '$lib/constants';

	let {
		open,
		editEntry,
		defaultType = ENTRY_TYPE.EXPENSE,
		categories,
		onAddCategory,
		onClose,
		onSave
	}: {
		open: boolean;
		editEntry: Entry | null;
		defaultType?: EntryType;
		categories: Category[];
		onAddCategory: (name: string) => void;
		onClose: () => void;
		onSave: (input: NewEntryInput, id?: string) => void;
	} = $props();

	let name = $state('');
	let type = $state<EntryType>(ENTRY_TYPE.EXPENSE);
	let recurrence = $state<Recurrence>(RECURRENCE.MONTHLY);
	let categoryId = $state('');
	let categorySearch = $state('');
	let baseAmount = $state('0');
	let month = $state(0);
	let notes = $state('');
	let error = $state('');

	// Track a pending category name to auto-select after creation
	let pendingCategoryName = $state('');

	const locale = $derived(getLocale());

	$effect(() => {
		if (!open) {
			// Reset pending when dialog fully closes
			pendingCategoryName = '';
			return;
		}
		error = '';
		if (editEntry) {
			name = editEntry.name;
			type = editEntry.type;
			recurrence = editEntry.recurrence;
			categoryId = editEntry.category;
			categorySearch = categories.find((c) => c.id === editEntry.category)?.name ?? editEntry.category;
			baseAmount = editEntry.baseAmount.toString();
			month = editEntry.month ?? 0;
			notes = editEntry.notes ?? '';
		} else {
			name = '';
			type = defaultType;
			recurrence = RECURRENCE.MONTHLY;
			categoryId = '';
			categorySearch = '';
			baseAmount = '0';
			month = 0;
			notes = '';
		}
	});

	// Auto-select newly created category — watches categories for the pending name
	$effect(() => {
		if (!pendingCategoryName) return;
		// Access categories to establish reactivity
		const found = categories.find(
			(c) => c.name.toLowerCase() === pendingCategoryName.toLowerCase()
		);
		if (found) {
			categoryId = found.id;
			categorySearch = found.name;
			pendingCategoryName = '';
		}
	});

	const filteredCategories = $derived(
		categorySearch.trim()
			? categories.filter((c) => c.name.toLowerCase().includes(categorySearch.toLowerCase()))
			: categories
	);

	const showCreateOption = $derived(
		categorySearch.trim().length > 0 &&
			!categories.some((c) => c.name.toLowerCase() === categorySearch.trim().toLowerCase())
	);

	function createCategory() {
		const trimmed = categorySearch.trim();
		if (!trimmed) return;
		pendingCategoryName = trimmed;
		onAddCategory(trimmed);
	}

	function submit() {
		error = '';
		const amount = parseFloat(baseAmount);
		if (!name.trim()) { error = m.entry_dialog_error_name(); return; }
		if (isNaN(amount) || amount < 0) { error = m.entry_dialog_error_amount(); return; }
		if (!categoryId || categoryId === '__create__') { error = m.entry_dialog_error_category(); return; }

		const input: NewEntryInput = {
			name: name.trim(),
			type,
			recurrence,
			category: categoryId,
			baseAmount: amount,
			month: recurrence === RECURRENCE.SINGLE ? month : undefined,
			notes: notes.trim()
		};

		onSave(input, editEntry?.id);
	}

	const inputClass = 'border border-border bg-bg rounded-sm px-2.5 py-2 text-sm text-text outline-none focus:ring-1 focus:ring-[--color-accent]/40 transition-colors';
</script>

<Dialog.Root bind:open onOpenChange={(v) => { if (!v) onClose(); }}>
	<Dialog.Portal>
		<Dialog.Overlay class="fixed inset-0 z-50 bg-overlay" />
		<Dialog.Content
			class="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
		>
			<div class="pointer-events-auto flex w-full max-w-md flex-col gap-4 rounded-radius border border-border bg-surface p-5">
				<div class="flex items-center justify-between">
					<Dialog.Title class="font-semibold">
						{editEntry ? m.entry_dialog_edit_title() : m.entry_dialog_new_title()}
					</Dialog.Title>
					<Dialog.Close
						class="rounded-sm p-1 text-sm text-text opacity-40 transition-opacity hover:opacity-80"
						aria-label="Close"
					>✕</Dialog.Close>
				</div>

				<div class="flex flex-col gap-3">
					<!-- Name -->
					<label class="flex flex-col gap-1">
						<span class="text-xs font-medium text-muted">{m.entry_dialog_name()}</span>
						<input
							bind:value={name}
							type="text"
							placeholder={m.entry_dialog_name_placeholder()}
							class={inputClass}
						/>
					</label>

					<!-- Type + Recurrence -->
					<div class="grid grid-cols-2 gap-3">
						<label class="flex flex-col gap-1">
							<span class="text-xs font-medium text-muted">{m.entry_dialog_type()}</span>
							<select bind:value={type} class={inputClass}>
								{#each ENTRY_TYPES as t}
									<option value={t}>{ENTRY_TYPE_LABELS[t]()}</option>
								{/each}
							</select>
						</label>

						<label class="flex flex-col gap-1">
							<span class="text-xs font-medium text-muted">{m.entry_dialog_recurrence()}</span>
							<select bind:value={recurrence} class={inputClass}>
								{#each RECURRENCES as r}
									<option value={r}>{RECURRENCE_LABELS[r]()}</option>
								{/each}
							</select>
						</label>
					</div>

					<!-- Month picker (single only) -->
					{#if recurrence === RECURRENCE.SINGLE}
						<label class="flex flex-col gap-1">
							<span class="text-xs font-medium text-muted">{m.entry_dialog_month()}</span>
							<select bind:value={month} class={inputClass}>
								{#each Array.from({ length: MONTHS_PER_YEAR }, (_, i) => i) as i}
									<option value={i}>{getMonthShort(i, locale)}</option>
								{/each}
							</select>
						</label>
					{/if}

					<!-- Amount + Category -->
					<div class="grid grid-cols-2 gap-3">
						<label class="flex flex-col gap-1">
							<span class="text-xs font-medium text-muted">
								{recurrence === RECURRENCE.ANNUAL_DISTRIBUTED ? m.entry_dialog_annual_amount() : m.entry_dialog_amount()}
							</span>
							<input
								bind:value={baseAmount}
								type="number"
								min="0"
								step="0.01"
								class={inputClass}
							/>
						</label>

						<!-- Category combobox -->
						<div class="relative flex flex-col gap-1">
							<span class="text-xs font-medium text-muted">{m.entry_dialog_category()}</span>
							<Combobox.Root
								type="single"
								bind:value={categoryId}
								inputValue={categorySearch}
								onValueChange={(v) => {
									if (v === '__create__') {
										createCategory();
									} else {
										const cat = categories.find((c) => c.id === v);
										if (cat) categorySearch = cat.name;
									}
								}}
								onOpenChange={(v) => { if (!v && !categoryId) categorySearch = ''; }}
								loop
							>
								<Combobox.Input
									placeholder={categories.length === 0 ? m.entry_dialog_type_to_create() : m.entry_dialog_search_or_create()}
									class={inputClass}
									autocomplete="off"
									oninput={(e) => {
										categorySearch = (e.target as HTMLInputElement).value;
										if (categorySearch !== categories.find((c) => c.id === categoryId)?.name) categoryId = '';
									}}
									onkeydown={(e) => {
										if (e.key === 'Enter' && showCreateOption) {
											e.preventDefault();
											createCategory();
										}
									}}
								/>
								<Combobox.Content
									side="bottom"
									align="start"
									sideOffset={4}
									class="z-[70] w-full max-h-44 overflow-y-auto rounded-sm border border-border bg-surface"
								>
									{#each filteredCategories as cat (cat.id)}
										<Combobox.Item
											value={cat.id}
											label={cat.name}
											class="w-full px-3 py-1.5 text-left text-sm text-text transition-colors hover:opacity-80 cursor-pointer {cat.id === categoryId ? 'bg-accent-subtle' : ''}"
										>
											{cat.name}
										</Combobox.Item>
									{/each}
									{#if showCreateOption}
										<Combobox.Item
											value="__create__"
											label={categorySearch.trim()}
											class="w-full border-t border-border px-3 py-1.5 text-left text-sm text-accent transition-colors hover:opacity-80 cursor-pointer"
										>
											{m.entry_dialog_create_category({ name: categorySearch.trim() })}
										</Combobox.Item>
									{/if}
									{#if filteredCategories.length === 0 && !showCreateOption}
										<div class="px-3 py-1.5 text-sm text-muted">
											{m.entry_dialog_no_categories_found()}
										</div>
									{/if}
								</Combobox.Content>
							</Combobox.Root>
						</div>
					</div>

					<!-- Notes -->
					<label class="flex flex-col gap-1">
						<span class="text-xs font-medium text-muted">{m.entry_dialog_notes()} <span class="opacity-60">{m.entry_dialog_optional()}</span></span>
						<input
							bind:value={notes}
							type="text"
							placeholder={m.entry_dialog_notes_placeholder()}
							class={inputClass}
						/>
					</label>

					{#if error}
						<p class="rounded-sm px-3 py-2 text-xs text-red bg-red-faint">
							{error}
						</p>
					{/if}
				</div>

				<div class="flex justify-end gap-2">
					<button
						type="button"
						class="rounded-sm px-3 py-1.5 text-sm text-muted transition-opacity hover:opacity-80"
						onclick={onClose}
					>
						{m.cancel()}
					</button>
					<button
						type="button"
						class="rounded-sm bg-accent px-4 py-1.5 text-sm font-medium text-accent-fg transition-opacity hover:opacity-90"
						onclick={submit}
					>
						{editEntry ? m.entry_dialog_save_changes() : m.entry_dialog_add_entry()}
					</button>
				</div>
			</div>
		</Dialog.Content>
	</Dialog.Portal>
</Dialog.Root>
