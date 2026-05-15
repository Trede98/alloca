<script lang="ts">
	import type { Category, Entry, EntryType } from '$lib/types';
	import { getMonthAmount } from '$lib/budget';
	import { formatCurrency } from '$lib/format';
	import EntryRow from './EntryRow.svelte';
	import { ChevronDown } from 'lucide-svelte';
	import * as m from '$lib/paraglide/messages';
	import { getLocale } from '$lib/paraglide/runtime';

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
		onUpdateBaseAmount,
		onSkipMonth,
		onUnskipMonth,
		onEdit,
		onAddNew,
		tourAttrs
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
		onUpdateBaseAmount: (id: string, amount: number) => void;
		onSkipMonth: (entryId: string, month: number) => void;
		onUnskipMonth: (entryId: string, month: number) => void;
		onEdit: (entry: Entry) => void;
		onAddNew: (type: EntryType) => void;
		tourAttrs?: { addBtn?: string; firstRow?: string };
	} = $props();

	const typeColors: Record<EntryType, string> = {
		income: 'var(--color-green)',
		expense: 'var(--color-red)',
		savings: 'var(--color-blue)'
	};

	const locale = $derived(getLocale());

	const typeLabel = $derived({
		income: m.type_income(),
		expense: m.type_expenses(),
		savings: m.type_savings()
	}[type]);

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
		<span class="text-xs font-semibold uppercase tracking-wide" style:color={typeColors[type]}>
			{typeLabel}
		</span>
		<span class="text-sm font-semibold tabular-nums" style:color={typeColors[type]}>
			{formatCurrency(total, currency, locale)}
		</span>
	</div>

	{#if filtered.length === 0}
		<!-- Empty state -->
		<div class="flex flex-col items-center gap-2 px-4 py-6 text-center">
			<p class="text-xs" style:color="var(--color-muted)">{m.entry_list_empty({ type: typeLabel.toLowerCase() })}</p>
		</div>
	{:else}
		<!-- Category groups -->
		{#each grouped() as [cat, catEntries], gi}
			{@const catTotal = catEntries.reduce((s, e) => s + getMonthAmount(e, month), 0)}
			{@const isCollapsed = collapsed.has(cat)}

			<div class="border-b last:border-b-0" style:border-color="var(--color-border)">
				<!-- Category header -->
				<button
					type="button"
					class="flex w-full items-center justify-between px-3 py-2 text-left transition-colors"
					onmouseenter={(e) => (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--surface-hover)'}
					onmouseleave={(e) => (e.currentTarget as HTMLElement).style.backgroundColor = ''}
					onclick={() => toggleCategory(cat)}
				>
					<div class="flex items-center gap-2 min-w-0">
						<span
							class="transition-transform duration-150"
							style:display="inline-flex"
							style:transform={isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)'}
						>
							<ChevronDown size={13} style="opacity:0.5; color:var(--color-subtle)" />
						</span>
						<span class="text-sm truncate" style:color="var(--color-text)">{cat}</span>
						<span class="shrink-0 text-xs" style:color="var(--color-subtle)">
							({catEntries.length})
						</span>
					</div>
					<span class="shrink-0 text-sm font-medium tabular-nums" style:color="var(--color-text)">
						{formatCurrency(catTotal, currency, locale)}
					</span>
				</button>

				{#if !isCollapsed}
					<div>
						{#each catEntries as entry, ei (entry.id)}
							<EntryRow
								{entry}
								{month}
								{currency}
								currentAmount={getMonthAmount(entry, month)}
								hasOverride={month in entry.monthlyOverrides}
								hasSkip={(entry.monthlySkips ?? []).includes(month)}
								{onUpdateEntry}
								{onDeleteEntry}
								{onDuplicateEntry}
								{onSetOverride}
								{onRemoveOverride}
								{onUpdateBaseAmount}
								{onSkipMonth}
								{onUnskipMonth}
								{onEdit}
								tourAttr={gi === 0 && ei === 0 ? tourAttrs?.firstRow : undefined}
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
		data-tour={tourAttrs?.addBtn}
		onclick={() => onAddNew(type)}
	>
		<span class="text-base leading-none">+</span>
		{m.entry_list_add({ type: typeLabel.toLowerCase() }).slice(2)}
	</button>
</div>
