<script lang="ts">
	import type { Category, Entry, EntryType, Recurrence } from '$lib/types';
	import type { NewEntryInput } from '$lib/budget';
	import { MONTH_NAMES } from '$lib/format';

	let {
		open,
		editEntry,
		defaultType = 'expense',
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
	let type = $state<EntryType>('expense');
	let recurrence = $state<Recurrence>('monthly');
	let categoryId = $state('');
	let categorySearch = $state('');
	let comboOpen = $state(false);
	let baseAmount = $state('0');
	let month = $state(0);
	let notes = $state('');
	let error = $state('');

	// Track a pending category name to auto-select after creation
	let pendingCategoryName = $state('');

	$effect(() => {
		if (!open) {
			// Reset pending when dialog fully closes
			pendingCategoryName = '';
			return;
		}
		error = '';
		comboOpen = false;
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
			recurrence = 'monthly';
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
			comboOpen = false;
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

	function selectCategory(cat: Category) {
		categoryId = cat.id;
		categorySearch = cat.name;
		comboOpen = false;
	}

	function createCategory() {
		const trimmed = categorySearch.trim();
		if (!trimmed) return;
		pendingCategoryName = trimmed;
		onAddCategory(trimmed);
	}

	function onComboInput() {
		categoryId = '';
		comboOpen = true;
	}

	function onComboKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			comboOpen = false;
		}
		if (e.key === 'Enter') {
			e.preventDefault();
			if (showCreateOption) {
				createCategory();
			} else if (filteredCategories.length === 1) {
				selectCategory(filteredCategories[0]);
			}
		}
	}

	function closeComboBackdrop() {
		comboOpen = false;
		// If user typed but didn't select, restore previous name or clear
		if (!categoryId) categorySearch = '';
	}

	function submit() {
		error = '';
		const amount = parseFloat(baseAmount);
		if (!name.trim()) { error = 'Name is required'; return; }
		if (isNaN(amount) || amount < 0) { error = 'Amount must be a non-negative number'; return; }
		if (!categoryId) { error = 'Please select or create a category'; return; }

		const input: NewEntryInput = {
			name: name.trim(),
			type,
			recurrence,
			category: categoryId,
			baseAmount: amount,
			month: recurrence === 'single' ? month : undefined,
			notes: notes.trim()
		};

		onSave(input, editEntry?.id);
	}

	function onBackdropClick(e: MouseEvent) {
		if (e.target === e.currentTarget) onClose();
	}

	function onKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') onClose();
	}

	const inputClass = 'border px-2.5 py-2 text-sm outline-none focus:ring-1 focus:ring-[--color-accent]/40 transition-colors';
	const inputStyle = `background-color: var(--color-bg); border-color: var(--color-border); color: var(--color-text); border-radius: var(--radius-sm);`;
</script>

{#if open}
	<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
	<div
		role="dialog"
		aria-modal="true"
		tabindex="-1"
		class="fixed inset-0 z-50 flex items-center justify-center p-4"
		style:background-color="var(--overlay-bg)"
		onclick={onBackdropClick}
		onkeydown={onKeydown}
	>
		<div
			class="flex w-full max-w-md flex-col gap-4 border p-5"
			style:border-radius="var(--radius)"
			style:background-color="var(--color-surface)"
			style:border-color="var(--color-border)"
			style:box-shadow="var(--shadow-modal)"
		>
			<div class="flex items-center justify-between">
				<h2 class="font-semibold">{editEntry ? 'Edit Entry' : 'New Entry'}</h2>
				<button
					type="button"
					class="p-1 text-sm opacity-40 transition-opacity hover:opacity-80"
					style:border-radius="var(--radius-sm)"
					style:color="var(--color-text)"
					onclick={onClose}
					aria-label="Close"
				>
					✕
				</button>
			</div>

			<div class="flex flex-col gap-3">
				<!-- Name -->
				<label class="flex flex-col gap-1">
					<span class="text-xs font-medium" style:color="var(--color-muted)">Name</span>
					<input
						bind:value={name}
						type="text"
						placeholder="e.g. Salary"
						class={inputClass}
						style={inputStyle}
					/>
				</label>

				<!-- Type + Recurrence -->
				<div class="grid grid-cols-2 gap-3">
					<label class="flex flex-col gap-1">
						<span class="text-xs font-medium" style:color="var(--color-muted)">Type</span>
						<select bind:value={type} class={inputClass} style={inputStyle}>
							<option value="income">Income</option>
							<option value="expense">Expense</option>
							<option value="savings">Savings</option>
						</select>
					</label>

					<label class="flex flex-col gap-1">
						<span class="text-xs font-medium" style:color="var(--color-muted)">Recurrence</span>
						<select bind:value={recurrence} class={inputClass} style={inputStyle}>
							<option value="monthly">Monthly</option>
							<option value="annual_distributed">Annual ÷ 12</option>
							<option value="single">One-time</option>
						</select>
					</label>
				</div>

				<!-- Month picker (single only) -->
				{#if recurrence === 'single'}
					<label class="flex flex-col gap-1">
						<span class="text-xs font-medium" style:color="var(--color-muted)">Month</span>
						<select bind:value={month} class={inputClass} style={inputStyle}>
							{#each MONTH_NAMES as m, i}
								<option value={i}>{m}</option>
							{/each}
						</select>
					</label>
				{/if}

				<!-- Amount + Category -->
				<div class="grid grid-cols-2 gap-3">
					<label class="flex flex-col gap-1">
						<span class="text-xs font-medium" style:color="var(--color-muted)">
							{recurrence === 'annual_distributed' ? 'Annual amount' : 'Amount'}
						</span>
						<input
							bind:value={baseAmount}
							type="number"
							min="0"
							step="0.01"
							class={inputClass}
							style={inputStyle}
						/>
					</label>

					<!-- Category combobox -->
					<div class="relative flex flex-col gap-1">
						<span class="text-xs font-medium" style:color="var(--color-muted)">Category</span>
						<input
							bind:value={categorySearch}
							type="text"
							placeholder={categories.length === 0 ? 'Type to create…' : 'Search or create…'}
							class={inputClass}
							style={inputStyle}
							oninput={onComboInput}
							onfocus={() => (comboOpen = true)}
							onkeydown={onComboKeydown}
							autocomplete="off"
						/>
						{#if comboOpen}
							<!-- Backdrop to close combo -->
							<!-- svelte-ignore a11y_no_static_element_interactions -->
							<div
								class="fixed inset-0 z-10"
								onclick={closeComboBackdrop}
								onkeydown={(e) => e.key === 'Escape' && closeComboBackdrop()}
							></div>
							<div
								class="absolute left-0 top-full z-20 mt-1 w-full max-h-44 overflow-y-auto border"
								style:border-radius="var(--radius-sm)"
								style:background-color="var(--color-surface)"
								style:border-color="var(--color-border)"
								style:box-shadow="var(--shadow-dropdown)"
							>
								{#each filteredCategories as cat (cat.id)}
									<button
										type="button"
										class="w-full px-3 py-1.5 text-left text-sm transition-colors hover:opacity-80"
										style:color="var(--color-text)"
										style:background-color={cat.id === categoryId ? 'color-mix(in srgb, var(--color-accent) 15%, transparent)' : 'transparent'}
										onclick={() => selectCategory(cat)}
									>
										{cat.name}
									</button>
								{/each}
								{#if showCreateOption}
									<button
										type="button"
										class="w-full border-t px-3 py-1.5 text-left text-sm transition-colors hover:opacity-80"
										style:color="var(--color-accent)"
										style:border-color="var(--color-border)"
										onclick={createCategory}
									>
										Create «{categorySearch.trim()}»
									</button>
								{/if}
								{#if filteredCategories.length === 0 && !showCreateOption}
									<div class="px-3 py-1.5 text-sm" style:color="var(--color-muted)">
										No categories found
									</div>
								{/if}
							</div>
						{/if}
					</div>
				</div>

				<!-- Notes -->
				<label class="flex flex-col gap-1">
					<span class="text-xs font-medium" style:color="var(--color-muted)">Notes <span class="opacity-60">(optional)</span></span>
					<input
						bind:value={notes}
						type="text"
						placeholder="Any extra context…"
						class={inputClass}
						style={inputStyle}
					/>
				</label>

				{#if error}
					<p
						class="px-3 py-2 text-xs"
						style:border-radius="var(--radius-sm)"
						style:color="var(--color-red)"
						style:background-color="color-mix(in srgb, var(--color-red) 10%, transparent)"
					>
						{error}
					</p>
				{/if}
			</div>

			<div class="flex justify-end gap-2">
				<button
					type="button"
					class="px-3 py-1.5 text-sm transition-opacity hover:opacity-80"
					style:border-radius="var(--radius-sm)"
					style:color="var(--color-muted)"
					onclick={onClose}
				>
					Cancel
				</button>
				<button
					type="button"
					class="px-4 py-1.5 text-sm font-medium transition-opacity hover:opacity-90"
					style:border-radius="var(--radius-sm)"
					style:background-color="var(--color-accent)"
					style:color="var(--color-accent-fg)"
					onclick={submit}
				>
					{editEntry ? 'Save changes' : 'Add entry'}
				</button>
			</div>
		</div>
	</div>
{/if}
