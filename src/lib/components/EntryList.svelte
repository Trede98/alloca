<script lang="ts">
	import type { Category, Entry, EntryType } from '$lib/types';
	import { getMonthAmount } from '$lib/budget';
	import { formatCurrency } from '$lib/format';
	import EntryRow from './EntryRow.svelte';
	import { ChevronDown } from 'lucide-svelte';
	import { Collapsible } from 'bits-ui';
	import * as m from '$lib/paraglide/messages';
	import { getLocale } from '$lib/paraglide/runtime';
	import { RECURRENCE, UNCATEGORIZED } from '$lib/constants';

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

	const typeColorClass: Record<EntryType, string> = {
		income: 'text-green',
		expense: 'text-red',
		savings: 'text-blue'
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
			if (e.recurrence === RECURRENCE.SINGLE) return e.month === month;
			return true;
		})
	);

	const total = $derived(filtered.reduce((sum, e) => sum + getMonthAmount(e, month), 0));

	const categoryMap = $derived(new Map(categories.map((c) => [c.id, c.name])));

	// Group by resolved category name
	const grouped = $derived(() => {
		const map = new Map<string, Entry[]>();
		for (const e of filtered) {
			const cat = categoryMap.get(e.category) ?? e.category ?? UNCATEGORIZED;
			if (!map.has(cat)) map.set(cat, []);
			map.get(cat)!.push(e);
		}
		return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
	});

	let openMap = $state(new Map<string, boolean>());

	function isOpen(cat: string) { return openMap.get(cat) ?? true; }
	function setOpen(cat: string, v: boolean) {
		const next = new Map(openMap); next.set(cat, v); openMap = next;
	}
</script>

<div class="flex flex-col">
	<!-- Section header -->
	<div class="flex items-center justify-between border-b border-border px-3 py-2">
		<span class="text-xs font-semibold uppercase tracking-wide {typeColorClass[type]}">
			{typeLabel}
		</span>
		<span class="text-sm font-semibold tabular-nums {typeColorClass[type]}">
			{formatCurrency(total, currency, locale)}
		</span>
	</div>

	{#if filtered.length === 0}
		<!-- Empty state -->
		<div class="flex flex-col items-center gap-2 px-4 py-6 text-center">
			<p class="text-xs text-muted">{m.entry_list_empty({ type: typeLabel.toLowerCase() })}</p>
		</div>
	{:else}
		<!-- Category groups -->
		{#each grouped() as [cat, catEntries], gi}
			{@const catTotal = catEntries.reduce((s, e) => s + getMonthAmount(e, month), 0)}

			<Collapsible.Root
				open={isOpen(cat)}
				onOpenChange={(v) => setOpen(cat, v)}
				class="border-b border-border last:border-b-0"
			>
				<Collapsible.Trigger
					class="flex w-full items-center justify-between px-3 py-2 text-left transition-colors hover:bg-surface-hover"
				>
					<div class="flex items-center gap-2 min-w-0">
						<span
							class="transition-transform duration-150"
							style:display="inline-flex"
							style:transform={isOpen(cat) ? 'rotate(0deg)' : 'rotate(-90deg)'}
						>
							<ChevronDown size={13} class="opacity-50 text-subtle" />
						</span>
						<span class="text-sm truncate text-text">{cat}</span>
						<span class="shrink-0 text-xs text-subtle">
							({catEntries.length})
						</span>
					</div>
					<span class="shrink-0 text-sm font-medium tabular-nums text-text">
						{formatCurrency(catTotal, currency, locale)}
					</span>
				</Collapsible.Trigger>

				<Collapsible.Content>
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
				</Collapsible.Content>
			</Collapsible.Root>
		{/each}
	{/if}

	<!-- Add button -->
	<button
		type="button"
		class="flex items-center gap-1.5 px-3 py-2 text-xs opacity-60 transition-opacity hover:opacity-100 {typeColorClass[type]}"
		data-tour={tourAttrs?.addBtn}
		onclick={() => onAddNew(type)}
	>
		<span class="text-base leading-none">+</span>
		{m.entry_list_add({ type: typeLabel.toLowerCase() }).slice(2)}
	</button>
</div>
