<script lang="ts">
	import type { EntryType, YearRecap } from '$lib/types';
	import { isBalanced } from '$lib/budget';
	import { formatCurrency } from '$lib/format';
	import { ChevronDown } from 'lucide-svelte';
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

	const typeColors: Record<EntryType, string> = {
		income: 'var(--color-green)',
		expense: 'var(--color-red)',
		savings: 'var(--color-blue)'
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

	let collapsed = $state(new Set<string>());

	function toggleCategory(key: string) {
		const next = new Set(collapsed);
		if (next.has(key)) next.delete(key);
		else next.add(key);
		collapsed = next;
	}

	const sections = $derived([recap.income, recap.expenses, recap.savings]);
</script>

<!-- Header -->
<div
	class="flex shrink-0 items-center justify-between gap-3 border-b px-4 py-2"
	style:border-color="var(--color-border)"
	style:background-color="var(--color-surface)"
>
	<div class="flex items-center gap-2">
		<!-- Back button (mobile) -->
		<button
			type="button"
			class="p-1 text-sm opacity-60 transition-opacity hover:opacity-90 sm:hidden"
			style:border-radius="var(--radius-sm)"
			style:color="var(--color-text)"
			onclick={onClose}
		>
			←
		</button>
		<span class="font-semibold">{m.year_overview()}</span>
		<span class="text-sm opacity-50">{year}</span>
	</div>

	<div class="hidden items-center gap-3 text-sm sm:flex">
		<span style:color="var(--color-green)">{formatCurrency(recap.income.total, currency, locale)}</span>
		<span class="opacity-40">−</span>
		<span style:color="var(--color-red)">{formatCurrency(recap.expenses.total, currency, locale)}</span>
		<span class="opacity-40">−</span>
		<span style:color="var(--color-blue)">{formatCurrency(recap.savings.total, currency, locale)}</span>
		<span class="opacity-40">=</span>
		<span
			class="font-semibold"
			style:color={isBalanced(recap.yearlyBalance) ? 'var(--color-green)' : 'var(--color-red)'}
		>
			{formatCurrency(isBalanced(recap.yearlyBalance) ? 0 : recap.yearlyBalance, currency, locale)}
		</span>
	</div>

	<button
		type="button"
		class="hidden shrink-0 p-1 text-sm opacity-40 transition-opacity hover:opacity-80 sm:block"
		style:border-radius="var(--radius-sm)"
		style:color="var(--color-text)"
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
				<div
					class="overflow-hidden border"
					style:border-radius="var(--radius)"
					style:border-color="var(--color-border)"
					style:background-color="var(--color-surface)"
					style:box-shadow="var(--shadow-card)"
				>
					<!-- Section header -->
					<div
						class="flex items-center justify-between border-b px-3 py-2"
						style:border-color="var(--color-border)"
					>
						<span
							class="text-xs font-semibold uppercase tracking-wide"
							style:color={typeColors[section.type]}
						>
							{typeLabels[section.type]}
						</span>
						<span class="text-sm font-semibold tabular-nums" style:color={typeColors[section.type]}>
							{formatCurrency(section.total, currency, locale)}
						</span>
					</div>

					<!-- Category rows -->
					{#each section.categories as cat (cat.categoryName)}
						{@const key = `${section.type}:${cat.categoryName}`}
						{@const isCollapsed = collapsed.has(key)}

						<div class="border-b last:border-b-0" style:border-color="var(--color-border)">
							<!-- Category header row -->
							<button
								type="button"
								class="flex w-full items-center justify-between px-3 py-2 text-left transition-colors"
								onmouseenter={(e) => (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--surface-hover)'}
								onmouseleave={(e) => (e.currentTarget as HTMLElement).style.backgroundColor = ''}
								onclick={() => toggleCategory(key)}
							>
								<div class="flex items-center gap-2">
									<span
										class="transition-transform duration-150"
										style:display="inline-flex"
										style:transform={isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)'}
									>
										<ChevronDown size={13} style="opacity:0.5; color:var(--color-subtle)" />
									</span>
									<span class="text-sm" style:color="var(--color-text)">{cat.categoryName}</span>
								</div>
								<span class="text-sm font-medium tabular-nums" style:color="var(--color-text)">
									{formatCurrency(cat.yearTotal, currency, locale)}
								</span>
							</button>

							<!-- Entry rows -->
							{#if !isCollapsed}
								<div class="border-t" style:border-color="var(--color-border)">
									{#each cat.entries as entry (entry.id)}
										<div
											class="grid items-center gap-2 px-3 py-1.5 text-sm transition-colors hover:bg-[--surface-hover]"
											style="grid-template-columns: 1fr auto;"
										>
											<div class="flex min-w-0 items-center gap-1.5">
												<span class="min-w-0 truncate" style:color="var(--color-text)">{entry.name}</span>
												<span
													class="shrink-0 px-1 py-0.5 text-xs"
													style:border-radius="var(--radius-sm)"
													style:color="var(--color-muted)"
													style:background-color="var(--color-border)"
												>
													{recurrenceBadges[entry.recurrence]}
												</span>
											</div>
											<span class="tabular-nums" style:color="var(--color-text)">
												{formatCurrency(entry.yearTotal, currency, locale)}
											</span>
										</div>
									{/each}
								</div>
							{/if}
						</div>
					{/each}
				</div>
			{/if}
		{/each}

	</div>
</div>
