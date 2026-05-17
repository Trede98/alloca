<script lang="ts">
	import type { EntryType, YearRecap } from '$lib/types';
	import { isBalanced } from '$lib/budget';
	import { formatCurrency } from '$lib/format';
	import { ChevronDown } from 'lucide-svelte';
	import { Collapsible } from 'bits-ui';
	import * as m from '$lib/paraglide/messages';
	import { getLocale } from '$lib/paraglide/runtime';

	let {
		recap,
		currency,
		year,
		onClose
	}: {
		recap: YearRecap;
		currency: string;
		year: number;
		onClose: () => void;
	} = $props();

	const typeColorClass: Record<EntryType, string> = {
		income: 'text-green',
		expense: 'text-red',
		savings: 'text-blue'
	};

	const locale = $derived(getLocale());

	const typeLabels = $derived<Record<EntryType, string>>({
		income: m.type_income(),
		expense: m.type_expenses(),
		savings: m.type_savings()
	});

	const recurrenceBadges = $derived({
		monthly: m.recurrence_badge_monthly(),
		annual_distributed: m.recurrence_badge_annual(),
		single: m.recurrence_badge_single()
	});

	let openMap = $state(new Map<string, boolean>());

	function isOpen(key: string) { return openMap.get(key) ?? true; }
	function setOpen(key: string, v: boolean) {
		const next = new Map(openMap); next.set(key, v); openMap = next;
	}

	const sections = $derived([recap.income, recap.expenses, recap.savings]);
</script>

<!-- Header -->
<div class="flex shrink-0 items-center justify-between gap-3 border-b border-border bg-surface px-4 py-2">
	<div class="flex items-center gap-2">
		<!-- Back button (mobile) -->
		<button
			type="button"
			class="rounded-sm p-1 text-sm text-text opacity-60 transition-opacity hover:opacity-90 sm:hidden"
			onclick={onClose}
		>
			←
		</button>
		<span class="font-semibold">{m.year_overview()}</span>
		<span class="text-sm opacity-50">{year}</span>
	</div>

	<div class="hidden items-center gap-3 text-sm sm:flex">
		<span class="text-green">{formatCurrency(recap.income.total, currency, locale)}</span>
		<span class="opacity-40">−</span>
		<span class="text-red">{formatCurrency(recap.expenses.total, currency, locale)}</span>
		<span class="opacity-40">−</span>
		<span class="text-blue">{formatCurrency(recap.savings.total, currency, locale)}</span>
		<span class="opacity-40">=</span>
		<span
			class="font-semibold"
			class:text-green={isBalanced(recap.yearlyBalance)}
			class:text-red={!isBalanced(recap.yearlyBalance)}
		>
			{formatCurrency(isBalanced(recap.yearlyBalance) ? 0 : recap.yearlyBalance, currency, locale)}
		</span>
	</div>

	<button
		type="button"
		class="hidden shrink-0 rounded-sm p-1 text-sm text-text opacity-40 transition-opacity hover:opacity-80 sm:block"
		onclick={onClose}
	>
		✕
	</button>
</div>

<!-- Content -->
<div class="flex-1 overflow-y-auto p-4">
	<div class="mx-auto flex max-w-3xl flex-col gap-4">

		{#each sections as section}
			{#if section.categories.length > 0}
				<div class="overflow-hidden rounded-radius border border-border bg-surface">
					<!-- Section header -->
					<div class="flex items-center justify-between border-b border-border px-3 py-2">
						<span class="text-xs font-semibold uppercase tracking-wide {typeColorClass[section.type]}">
							{typeLabels[section.type]}
						</span>
						<span class="text-sm font-semibold tabular-nums {typeColorClass[section.type]}">
							{formatCurrency(section.total, currency, locale)}
						</span>
					</div>

					<!-- Category rows -->
					{#each section.categories as cat (cat.categoryName)}
						{@const key = `${section.type}:${cat.categoryName}`}

						<Collapsible.Root
							open={isOpen(key)}
							onOpenChange={(v) => setOpen(key, v)}
							class="border-b border-border last:border-b-0"
						>
							<Collapsible.Trigger
								class="flex w-full items-center justify-between px-3 py-2 text-left transition-colors hover:bg-surface-hover"
							>
								<div class="flex items-center gap-2">
									<span
										class="transition-transform duration-150"
										style:display="inline-flex"
										style:transform={isOpen(key) ? 'rotate(0deg)' : 'rotate(-90deg)'}
									>
										<ChevronDown size={13} class="opacity-50 text-subtle" />
									</span>
									<span class="text-sm text-text">{cat.categoryName}</span>
								</div>
								<span class="text-sm font-medium tabular-nums text-text">
									{formatCurrency(cat.yearTotal, currency, locale)}
								</span>
							</Collapsible.Trigger>

							<Collapsible.Content>
								<div class="border-t border-border">
									{#each cat.entries as entry (entry.id)}
										<div
											class="grid items-center gap-2 px-3 py-1.5 text-sm transition-colors hover:bg-surface-hover"
											style="grid-template-columns: 1fr auto;"
										>
											<div class="flex min-w-0 items-center gap-1.5">
												<span class="min-w-0 truncate text-text">{entry.name}</span>
												<span class="shrink-0 rounded-sm bg-border px-1 py-0.5 text-xs text-muted">
													{recurrenceBadges[entry.recurrence]}
												</span>
											</div>
											<span class="tabular-nums text-text">
												{formatCurrency(entry.yearTotal, currency, locale)}
											</span>
										</div>
									{/each}
								</div>
							</Collapsible.Content>
						</Collapsible.Root>
					{/each}
				</div>
			{/if}
		{/each}

	</div>
</div>
