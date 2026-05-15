<script lang="ts">
	import type { Category, Entry, EntryType } from '$lib/types';
	import { getMonthAmount } from '$lib/budget';
	import { formatCurrency } from '$lib/format';
	import EntryRow from './EntryRow.svelte';

	let {
		entries,
		categories,
		month,
		type,
		currency,
		onUpdateEntry,
		onDeleteEntry,
		onDuplicateEntry,
		onSetOverride,
		onRemoveOverride,
		onEdit,
		onAddNew
	}: {
		entries: Entry[];
		categories: Category[];
		month: number;
		type: EntryType;
		currency: string;
		onUpdateEntry: (id: string, patch: Partial<Omit<Entry, 'id' | 'monthlyOverrides'>>) => void;
		onDeleteEntry: (id: string) => void;
		onDuplicateEntry: (entry: Entry) => void;
		onSetOverride: (entryId: string, month: number, amount: number) => void;
		onRemoveOverride: (entryId: string, month: number) => void;
		onEdit: (entry: Entry) => void;
		onAddNew: (type: EntryType) => void;
	} = $props();

	const typeColors: Record<EntryType, string> = {
		income: 'var(--color-green)',
		expense: 'var(--color-red)',
		savings: 'var(--color-blue)'
	};

	const typeLabels: Record<EntryType, string> = {
		income: 'Income',
		expense: 'Expenses',
		savings: 'Savings'
	};

	const filtered = $derived(
		entries.filter((e) => {
			if (e.type !== type) return false;
			if (e.recurrence === 'single') return e.month === month;
			return true;
		})
	);

	const total = $derived(filtered.reduce((sum, e) => sum + getMonthAmount(e, month), 0));

	const categoryMap = $derived(new Map(categories.map((c) => [c.id, c.name])));

	// Group by resolved category name
	const grouped = $derived(() => {
		const map = new Map<string, Entry[]>();
		for (const e of filtered) {
			const cat = categoryMap.get(e.category) ?? e.category ?? 'Uncategorized';
			if (!map.has(cat)) map.set(cat, []);
			map.get(cat)!.push(e);
		}
		return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
	});

	// Track which categories are collapsed
	let collapsed = $state<Set<string>>(new Set());

	function toggleCategory(cat: string) {
		const next = new Set(collapsed);
		if (next.has(cat)) next.delete(cat);
		else next.add(cat);
		collapsed = next;
	}
</script>

<div class="flex flex-col">
	<!-- Section header -->
	<div
		class="flex items-center justify-between border-b px-3 py-2"
		style:border-color="var(--color-border)"
	>
		<span class="text-xs font-semibold" style:color={typeColors[type]}>
			{typeLabels[type]}
		</span>
		<span class="text-xs font-medium" style:color={typeColors[type]}>
			{formatCurrency(total, currency)}
		</span>
	</div>

	{#if filtered.length === 0}
		<!-- Empty state -->
		<div class="flex flex-col items-center gap-2 px-4 py-6 text-center">
			<p class="text-xs" style:color="var(--color-muted)">No {typeLabels[type].toLowerCase()} entries for this month.</p>
		</div>
	{:else}
		<!-- Category groups -->
		{#each grouped() as [cat, catEntries]}
			{@const catTotal = catEntries.reduce((s, e) => s + getMonthAmount(e, month), 0)}
			{@const isCollapsed = collapsed.has(cat)}

			<div class="border-b last:border-b-0" style:border-color="var(--color-border)">
				<!-- Category header -->
				<button
					type="button"
					class="flex w-full items-center justify-between gap-2 px-3 py-1.5 pr-4 hover:bg-[--surface-hover] transition-colors"
					onclick={() => toggleCategory(cat)}
				>
					<div class="flex items-center gap-2 min-w-0">
						<span
							class="text-xs transition-transform duration-150"
							style:color="var(--color-muted)"
							style:transform={isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)'}
						>▾</span>
						<span class="text-xs font-medium truncate" style:color="var(--color-muted)">{cat}</span>
						<span class="shrink-0 text-xs" style:color="var(--color-muted)">
							({catEntries.length})
						</span>
					</div>
					<span class="shrink-0 text-xs" style:color="var(--color-muted)">
						{formatCurrency(catTotal, currency)}
					</span>
				</button>

				{#if !isCollapsed}
					<div>
						{#each catEntries as entry (entry.id)}
							<EntryRow
								{entry}
								{month}
								{currency}
								currentAmount={getMonthAmount(entry, month)}
								hasOverride={month in entry.monthlyOverrides}
								{onUpdateEntry}
								{onDeleteEntry}
								{onDuplicateEntry}
								{onSetOverride}
								{onRemoveOverride}
								{onEdit}
							/>
						{/each}
					</div>
				{/if}
			</div>
		{/each}
	{/if}

	<!-- Add button -->
	<button
		type="button"
		class="flex items-center gap-1.5 px-3 py-2 text-xs opacity-60 transition-opacity hover:opacity-100"
		style:color={typeColors[type]}
		onclick={() => onAddNew(type)}
	>
		<span class="text-base leading-none">+</span>
		Add {typeLabels[type].toLowerCase()}
	</button>
</div>
