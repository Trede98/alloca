<script lang="ts">
	import type { MonthSummary } from '$lib/types';
	import { formatCurrency, formatCompact, getMonthShort } from '$lib/format';
	import { isBalanced } from '$lib/budget';
	import BalanceBadge from './BalanceBadge.svelte';
	import * as m from '$lib/paraglide/messages';
	import { getLocale } from '$lib/paraglide/runtime';

	let {
		summary,
		selected = false,
		currency,
		onclick,
		tourAttr
	}: {
		summary: MonthSummary;
		selected?: boolean;
		currency: string;
		onclick?: () => void;
		tourAttr?: string;
	} = $props();

	const balanced = $derived(isBalanced(summary.balance));
	const locale = $derived(getLocale());
</script>

<button
	type="button"
	class="flex w-full flex-col gap-1.5 rounded-radius border p-2.5 text-left transition-all duration-150"
	data-tour={tourAttr}
	class:bg-accent-tint={selected}
	class:bg-surface={!selected}
	class:border-accent={selected}
	class:border-red-strong-border={!selected && !balanced}
	class:border-border={!selected && balanced}
	onclick={onclick}
>
	<div class="flex items-center justify-between">
		<span class="text-sm font-medium">{getMonthShort(summary.month, locale)}</span>
		<BalanceBadge balance={summary.balance} compact={true} />
	</div>
	<div class="grid grid-cols-3 gap-1 text-xs">
		<div class="min-w-0 overflow-hidden">
			<div class="text-[10px] text-subtle">{m.month_card_in()}</div>
			<div class="tabular-nums leading-tight text-xs text-green">{formatCompact(summary.incomeTotal, currency, locale)}</div>
		</div>
		<div class="min-w-0 overflow-hidden">
			<div class="text-[10px] text-subtle">{m.month_card_out()}</div>
			<div class="tabular-nums leading-tight text-xs text-red">{formatCompact(summary.expenseTotal, currency, locale)}</div>
		</div>
		<div class="min-w-0 overflow-hidden">
			<div class="text-[10px] text-subtle">{m.month_card_save()}</div>
			<div class="tabular-nums leading-tight text-xs text-blue">{formatCompact(summary.savingsTotal, currency, locale)}</div>
		</div>
	</div>
</button>
