<script lang="ts">
	import type { Entry, EntryType, Recurrence } from '$lib/types';
	import type { NewEntryInput } from '$lib/budget';
	import { MONTH_NAMES } from '$lib/format';

	let {
		open,
		editEntry,
		defaultType = 'expense',
		onClose,
		onSave
	}: {
		open: boolean;
		editEntry: Entry | null;
		defaultType?: EntryType;
		onClose: () => void;
		onSave: (input: NewEntryInput, id?: string) => void;
	} = $props();

	let name = $state('');
	let type = $state<EntryType>('expense');
	let recurrence = $state<Recurrence>('monthly');
	let category = $state('');
	let baseAmount = $state('0');
	let month = $state(0);
	let notes = $state('');
	let error = $state('');

	$effect(() => {
		if (!open) return;
		error = '';
		if (editEntry) {
			name = editEntry.name;
			type = editEntry.type;
			recurrence = editEntry.recurrence;
			category = editEntry.category;
			baseAmount = editEntry.baseAmount.toString();
			month = editEntry.month ?? 0;
			notes = editEntry.notes ?? '';
		} else {
			name = '';
			type = defaultType;
			recurrence = 'monthly';
			category = '';
			baseAmount = '0';
			month = 0;
			notes = '';
		}
	});

	function submit() {
		error = '';
		const amount = parseFloat(baseAmount);
		if (!name.trim()) { error = 'Name is required'; return; }
		if (isNaN(amount) || amount < 0) { error = 'Amount must be a non-negative number'; return; }

		const input: NewEntryInput = {
			name: name.trim(),
			type,
			recurrence,
			category: category.trim() || 'Other',
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

	const inputClass = 'rounded-lg border px-2.5 py-1.5 text-sm outline-none focus:ring-1 focus:ring-blue-500/40 transition-colors';
	const inputStyle = `background-color: var(--color-bg); border-color: var(--color-border); color: var(--color-text);`;
</script>

{#if open}
	<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
	<div
		role="dialog"
		aria-modal="true"
		tabindex="-1"
		class="fixed inset-0 z-50 flex items-center justify-center p-4"
		style:background-color="rgba(0,0,0,0.55)"
		onclick={onBackdropClick}
		onkeydown={onKeydown}
	>
		<div
			class="flex w-full max-w-md flex-col gap-4 rounded-xl border p-5 shadow-xl"
			style:background-color="var(--color-surface)"
			style:border-color="var(--color-border)"
			style:box-shadow="var(--shadow)"
		>
			<div class="flex items-center justify-between">
				<h2 class="font-semibold">{editEntry ? 'Edit Entry' : 'New Entry'}</h2>
				<button
					type="button"
					class="rounded-lg p-1 text-sm opacity-50 transition-opacity hover:opacity-100"
					style:color="var(--color-muted)"
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

					<label class="flex flex-col gap-1">
						<span class="text-xs font-medium" style:color="var(--color-muted)">Category</span>
						<input
							bind:value={category}
							type="text"
							placeholder="Other"
							list="category-suggestions"
							class={inputClass}
							style={inputStyle}
						/>
						<datalist id="category-suggestions">
							<option value="Housing"></option>
							<option value="Food"></option>
							<option value="Transport"></option>
							<option value="Health"></option>
							<option value="Savings"></option>
							<option value="Leisure"></option>
							<option value="Work"></option>
							<option value="Other"></option>
						</datalist>
					</label>
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
					<p class="rounded-lg px-3 py-2 text-xs" style:color="var(--color-red)" style:background-color="color-mix(in srgb, var(--color-red) 10%, transparent)">
						{error}
					</p>
				{/if}
			</div>

			<div class="flex justify-end gap-2">
				<button
					type="button"
					class="rounded-lg px-3 py-1.5 text-sm transition-opacity hover:opacity-80"
					style:color="var(--color-muted)"
					onclick={onClose}
				>
					Cancel
				</button>
				<button
					type="button"
					class="rounded-lg px-4 py-1.5 text-sm font-medium transition-opacity hover:opacity-90"
					style:background-color="var(--color-blue)"
					style:color="white"
					onclick={submit}
				>
					{editEntry ? 'Save changes' : 'Add entry'}
				</button>
			</div>
		</div>
	</div>
{/if}
