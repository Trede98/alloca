<script lang="ts">
	import type { Budget, Entry, EntryType } from '$lib/types';
	import type { NewEntryInput } from '$lib/budget';
	import {
		computeYearSummary,
		getAllMonthSummaries,
		computeMonthSummary,
		computeYearRecap,
		isBalanced,
		setMonthNote,
		renameBudget
	} from '$lib/budget';
	import { formatCurrency, getMonthFull } from '$lib/format';
	import { getTheme, toggleTheme } from '$lib/theme.svelte';
	import { Switch, Popover } from 'bits-ui';
	import { Settings2, Tag, Upload, Download, Trash2, Sun, Moon, Globe, Coins, ChevronRight, ChevronLeft, HelpCircle } from 'lucide-svelte';
	import SummaryBar from './SummaryBar.svelte';
	import MonthCard from './MonthCard.svelte';
	import YearRecap from './YearRecap.svelte';
	import EntryList from './EntryList.svelte';
	import EntryDialog from './EntryDialog.svelte';
	import BalanceBadge from './BalanceBadge.svelte';
	import ImportExportMenu from './ImportExportMenu.svelte';
	import CategoryManager from './CategoryManager.svelte';
	import WelcomeDialog from './WelcomeDialog.svelte';
	import * as m from '$lib/paraglide/messages';
	import { getLocale, setLocale } from '$lib/paraglide/runtime';
	import { startTour } from '$lib/tour';
	import { CURRENCIES } from '$lib/constants';

	function getCurrencyLabel(code: string, loc: string): string {
		const label = new Intl.DisplayNames([loc], { type: 'currency' }).of(code) ?? code;
		return label.charAt(0).toUpperCase() + label.slice(1);
	}

	function getCurrencySymbol(code: string, loc: string): string {
		return (0)
			.toLocaleString(loc, { style: 'currency', currency: code, minimumFractionDigits: 0, maximumFractionDigits: 0 })
			.replace(/[\d\s,. ]/g, '')
			.trim();
	}

	const LANGUAGES = [
		{ code: 'en', flag: '🇬🇧', label: 'English' },
		{ code: 'it', flag: '🇮🇹', label: 'Italiano' },
		{ code: 'fr', flag: '🇫🇷', label: 'Français' },
		{ code: 'es', flag: '🇪🇸', label: 'Español' },
		{ code: 'de', flag: '🇩🇪', label: 'Deutsch' }
	] as const;

	let {
		budget,
		onAddEntry,
		onUpdateEntry,
		onDeleteEntry,
		onSetOverride,
		onRemoveOverride,
		onUpdateBaseAmount,
		onSkipMonth,
		onUnskipMonth,
		onImport,
		onBudgetChange,
		onAddCategory,
		onUpdateCategory,
		onDeleteCategory,
		categoryError,
		onClearCategoryError,
		startReset,
		welcomeOpen = false,
		onWelcomeStart,
		onTourStart,
		onTourEnd
	}: {
		budget: Budget;
		onAddEntry: (input: NewEntryInput) => void;
		onUpdateEntry: (id: string, patch: Partial<Omit<Entry, 'id' | 'monthlyOverrides'>>) => void;
		onDeleteEntry: (id: string) => void;
		onSetOverride: (entryId: string, month: number, amount: number) => void;
		onRemoveOverride: (entryId: string, month: number) => void;
		onUpdateBaseAmount: (id: string, amount: number) => void;
		onSkipMonth: (entryId: string, month: number) => void;
		onUnskipMonth: (entryId: string, month: number) => void;
		onImport: (b: Budget) => void;
		onBudgetChange: (b: Budget) => void;
		onAddCategory: (name: string) => void;
		onUpdateCategory: (id: string, name: string) => void;
		onDeleteCategory: (id: string) => void;
		categoryError: string;
		onClearCategoryError: () => void;
		startReset: () => void;
		welcomeOpen?: boolean;
		onWelcomeStart: () => void;
		onTourStart: () => void;
		onTourEnd: () => void;
	} = $props();

	const yearSummary = $derived(computeYearSummary(budget));
	const monthSummaries = $derived(getAllMonthSummaries(budget));

	let selectedMonth = $state<number | null>(null);
	const monthSummary = $derived(
		selectedMonth !== null ? computeMonthSummary(budget, selectedMonth) : null
	);

	// Dialog state
	let dialogOpen = $state(false);
	let dialogEditEntry = $state<Entry | null>(null);
	let dialogDefaultType = $state<EntryType>('expense');

	// Notes state
	let noteText = $state('');
	let noteEditing = $state(false);
	let noteEl = $state<HTMLTextAreaElement | null>(null);

	// Sync note text when month changes
	$effect(() => {
		if (selectedMonth !== null) {
			noteText = budget.monthlyNotes[selectedMonth] ?? '';
			noteEditing = false;
		}
	});

	// Mobile panel toggle
	let showDetail = $state(false);

	let showYearRecap = $state(false);
	const yearRecap = $derived(showYearRecap ? computeYearRecap(budget) : null);

	function selectYearOverview() {
		selectedMonth = null;
		showYearRecap = true;
		showDetail = true;
	}

	function selectMonth(monthNum: number) {
		showYearRecap = false;
		selectedMonth = selectedMonth === monthNum ? null : monthNum;
		if (selectedMonth !== null) showDetail = true;
	}

	function openAddDialog(type: EntryType) {
		dialogEditEntry = null;
		dialogDefaultType = type;
		dialogOpen = true;
	}

	function openEditDialog(entry: Entry) {
		dialogEditEntry = entry;
		dialogDefaultType = entry.type;
		dialogOpen = true;
	}

	function closeDialog() {
		dialogOpen = false;
		dialogEditEntry = null;
	}

	function handleSave(input: NewEntryInput, id?: string) {
		if (id) {
			onUpdateEntry(id, {
				name: input.name,
				type: input.type,
				recurrence: input.recurrence,
				category: input.category,
				baseAmount: input.baseAmount,
				month: input.month,
				notes: input.notes
			});
		} else {
			onAddEntry(input);
		}
		closeDialog();
	}

	function handleDuplicate(entry: Entry) {
		onAddEntry({
			name: entry.name + ' (copy)',
			type: entry.type,
			recurrence: entry.recurrence,
			category: entry.category,
			baseAmount: entry.baseAmount,
			month: entry.month,
			notes: entry.notes
		});
	}

	function commitNote() {
		if (selectedMonth === null) return;
		const updated = setMonthNote(budget, selectedMonth, noteText);
		onBudgetChange(updated);
		noteEditing = false;
	}

	function startNoteEdit() {
		noteEditing = true;
		setTimeout(() => noteEl?.focus(), 0);
	}

	function onNoteKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			noteText = budget.monthlyNotes[selectedMonth!] ?? '';
			noteEditing = false;
		}
		if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) commitNote();
	}

	function forceSelectMonth(monthNum: number) {
		showYearRecap = false;
		selectedMonth = monthNum;
		showDetail = true;
	}

	function resetForTour() {
		selectedMonth = null;
		showDetail = false;
		showYearRecap = false;
	}

	function triggerTour() {
		onWelcomeStart();
		resetForTour();
		onTourStart();
		setTimeout(() => startTour(() => forceSelectMonth(0), onTourEnd), 50);
	}

	function replayTour() {
		popoverOpen = false;
		menuView = 'main';
		setTimeout(() => {
			resetForTour();
			onTourStart();
			setTimeout(() => startTour(() => forceSelectMonth(0), onTourEnd), 50);
		}, 150);
	}

	const theme = $derived(getTheme());
	const locale = $derived(getLocale());
	const currentLang = $derived(LANGUAGES.find((l) => l.code === locale) ?? LANGUAGES[0]);

	// Mobile actions popover
	let popoverOpen = $state(false);
	let menuView = $state<'main' | 'language' | 'currency'>('main');
	let currencyFilter = $state('');
	const filteredCurrencies = $derived(
		currencyFilter.trim() === ''
			? CURRENCIES
			: CURRENCIES.filter(
					(code) =>
						code.toLowerCase().includes(currencyFilter.toLowerCase()) ||
						getCurrencyLabel(code, locale).toLowerCase().includes(currencyFilter.toLowerCase())
				)
	);

	// Categories modal (opened from mobile popover)
	let categoriesModalOpen = $state(false);

	// Refs into ImportExportMenu (headless mode)
	let importFileInput = $state<HTMLInputElement | null>(null);

	function popoverExport() {
		const data = {
			version: 1,
			exportedAt: new Date().toISOString(),
			budget
		};
		const json = JSON.stringify(data, null, 2);
		const blob = new Blob([json], { type: 'application/json' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `alloca-${budget.year}.json`;
		a.click();
		URL.revokeObjectURL(url);
	}

	// Name inline edit
	let nameEditing = $state(false);
	let nameInput = $state('');
	let nameEl = $state<HTMLInputElement | null>(null);

	function startNameEdit() {
		nameInput = budget.name;
		nameEditing = true;
		setTimeout(() => nameEl?.focus(), 0);
	}

	function commitName() {
		onBudgetChange(renameBudget(budget, nameInput));
		nameEditing = false;
	}

	function onNameKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') commitName();
		if (e.key === 'Escape') nameEditing = false;
	}
</script>

<div class="flex h-screen flex-col overflow-hidden bg-bg">
	<!-- Top bar -->
	<header class="flex shrink-0 items-center justify-between gap-3 border-b border-border bg-surface px-4 py-2">
		<!-- Left: budget name + year -->
		<span class="flex min-w-0 items-center gap-1">
			{#if nameEditing}
				<input
					bind:this={nameEl}
					bind:value={nameInput}
					class="min-w-0 max-w-40 flex-1 border-b border-border bg-transparent font-semibold tracking-tight text-text outline-none"
					onblur={commitName}
					onkeydown={onNameKeydown}
				/>
			{:else}
				<button
					type="button"
					class="min-w-0 truncate font-semibold tracking-tight transition-opacity hover:opacity-80"
					title={m.budget_click_to_rename()}
					onclick={startNameEdit}
				>
					{budget.name}
				</button>
			{/if}
			<span class="shrink-0 font-normal opacity-50">·</span>
			<span class="shrink-0 font-semibold tracking-tight">{budget.year}</span>
		</span>

		<!-- Centre: summary inline at lg+ (display:none below lg, no phantom space) -->
		<div class="hidden flex-1 justify-center lg:flex" data-tour="summary-bar-desktop">
			<SummaryBar summary={yearSummary} currency={budget.currency} />
		</div>

		<!-- Right: actions popover (all breakpoints) -->
		<div class="flex shrink-0 items-center">
			<Popover.Root
				bind:open={popoverOpen}
				onOpenChange={(v) => { if (!v) { menuView = 'main'; currencyFilter = ''; } }}
			>
				<Popover.Trigger
					class="flex items-center justify-center rounded-sm p-1.5 opacity-60 transition-opacity hover:opacity-90"
					title={m.settings()}
					data-tour="settings-btn"
				>
					<Settings2 size={16} />
				</Popover.Trigger>

					<Popover.Content
						side="bottom"
						align="end"
						sideOffset={4}
						class="z-50 min-w-[220px] rounded-radius border border-border bg-surface py-1"
					>
						{#if menuView === 'main'}
							<!-- Main menu -->

							<!-- Tour replay -->
							<button
								type="button"
								role="menuitem"
								class="flex w-full items-center gap-3 px-3 py-2.5 text-sm text-text transition-colors hover:bg-surface-hover"
								onclick={replayTour}
							>
								<HelpCircle size={14} style="opacity:0.6" />
								{m.tour_replay()}
							</button>

							<div class="my-1 border-t border-border"></div>

							<!-- Categories -->
							<button
								type="button"
								role="menuitem"
								class="flex w-full items-center gap-3 px-3 py-2.5 text-sm text-text transition-colors hover:bg-surface-hover"
								onclick={() => { categoriesModalOpen = true; popoverOpen = false; menuView = 'main'; }}
							>
								<Tag size={14} style="opacity:0.6" />
								{m.categories()}
							</button>

							<!-- Import -->
							<button
								type="button"
								role="menuitem"
								class="flex w-full items-center gap-3 px-3 py-2.5 text-sm text-text transition-colors hover:bg-surface-hover"
								onclick={() => { importFileInput?.click(); popoverOpen = false; menuView = 'main'; }}
							>
								<Upload size={14} style="opacity:0.6" />
								{m.import()}
							</button>

							<!-- Export -->
							<button
								type="button"
								role="menuitem"
								class="flex w-full items-center gap-3 px-3 py-2.5 text-sm text-text transition-colors hover:bg-surface-hover"
								onclick={() => { popoverExport(); popoverOpen = false; menuView = 'main'; }}
							>
								<Download size={14} style="opacity:0.6" />
								{m.export()}
							</button>

							<div class="my-1 border-t border-border"></div>

							<!-- Language submenu trigger -->
							<button
								type="button"
								role="menuitem"
								class="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-sm text-text transition-colors hover:bg-surface-hover"
								onclick={() => (menuView = 'language')}
							>
								<div class="flex items-center gap-3">
									<Globe size={14} style="opacity:0.6" />
									{m.language()}
								</div>
								<div class="flex items-center gap-1.5">
									<span class="text-base leading-none">{currentLang.flag}</span>
									<ChevronRight size={12} style="opacity:0.4" />
								</div>
							</button>

							<!-- Currency submenu trigger -->
							<button
								type="button"
								role="menuitem"
								class="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-sm text-text transition-colors hover:bg-surface-hover"
								onclick={() => { currencyFilter = ''; menuView = 'currency'; }}
							>
								<div class="flex items-center gap-3">
									<Coins size={14} style="opacity:0.6" />
									{m.currency()}
								</div>
								<div class="flex items-center gap-1.5">
									<span class="font-mono text-xs opacity-60">{getCurrencySymbol(budget.currency, locale)}</span>
									<ChevronRight size={12} style="opacity:0.4" />
								</div>
							</button>

							<div class="my-1 border-t border-border"></div>

							<!-- Theme toggle row (not a button — label + Switch) -->
							<div class="flex items-center justify-between gap-3 px-3 py-2.5">
								<div class="flex items-center gap-3 text-sm text-text">
									{#if theme === 'dark'}
										<Moon size={14} style="opacity:0.6" />
										{m.dark_mode()}
									{:else}
										<Sun size={14} style="opacity:0.6" />
										{m.light_mode()}
									{/if}
								</div>
								<Switch.Root
									checked={theme === 'dark'}
									onCheckedChange={() => toggleTheme()}
									class="relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 bg-theme-toggle-track"
								>
									<Switch.Thumb
										class="pointer-events-none flex h-4 w-4 items-center justify-center rounded-full transition-transform bg-theme-toggle-thumb"
										style="transform: {theme === 'dark' ? 'translateX(16px)' : 'translateX(0px)'}"
									>
										{#if theme === 'dark'}
											<svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" class="text-theme-toggle-icon">
												<path d="M12 3a9 9 0 1 0 9 9c0-.46-.04-.92-.1-1.36a5.389 5.389 0 0 1-4.4 2.26 5.403 5.403 0 0 1-3.14-9.8c-.44-.06-.9-.1-1.36-.1z"/>
											</svg>
										{:else}
											<Sun size={10} class="text-theme-toggle-icon" />
										{/if}
									</Switch.Thumb>
								</Switch.Root>
							</div>

							<div class="my-1 border-t border-border"></div>

							<!-- Clear budget -->
							<button
								type="button"
								role="menuitem"
								class="flex w-full items-center gap-3 px-3 py-2.5 text-sm text-red transition-colors hover:bg-danger-hover"
								onclick={() => { startReset(); popoverOpen = false; menuView = 'main'; }}
							>
								<Trash2 size={14} />
								{m.clear_budget()}
							</button>

						{:else if menuView === 'language'}
							<!-- Language submenu view -->

							<!-- Back button -->
							<button
								type="button"
								role="menuitem"
								class="flex w-full items-center gap-2 px-3 py-2.5 text-sm font-medium text-text transition-colors hover:bg-surface-hover"
								onclick={() => (menuView = 'main')}
							>
								<ChevronLeft size={14} style="opacity:0.6" />
								{m.language()}
							</button>

							<div class="my-1 border-t border-border"></div>

							<!-- Language options -->
							{#each LANGUAGES as lang}
								<button
									type="button"
									role="menuitem"
									class="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-sm text-text transition-colors hover:bg-surface-hover"
									onclick={() => { setLocale(lang.code); menuView = 'main'; }}
								>
									<div class="flex items-center gap-3">
										<span class="text-base leading-none">{lang.flag}</span>
										<span>{lang.label}</span>
									</div>
									{#if locale === lang.code}
										<span class="text-accent">✓</span>
									{/if}
								</button>
							{/each}

						{:else if menuView === 'currency'}
							<!-- Currency submenu view -->

							<!-- Back button -->
							<button
								type="button"
								role="menuitem"
								class="flex w-full items-center gap-2 px-3 py-2.5 text-sm font-medium text-text transition-colors hover:bg-surface-hover"
								onclick={() => (menuView = 'main')}
							>
								<ChevronLeft size={14} style="opacity:0.6" />
								{m.currency()}
							</button>

							<div class="my-1 border-t border-border"></div>

							<!-- Search input -->
							<div class="px-3 py-1.5">
								<input
									type="text"
									bind:value={currencyFilter}
									placeholder={m.currency_search_placeholder()}
									class="w-full rounded border border-border bg-bg px-2 py-1.5 text-sm text-text outline-none"
								/>
							</div>

							<div class="my-1 border-t border-border"></div>

							<!-- Currency options -->
							<div class="max-h-72 overflow-y-auto">
								{#each filteredCurrencies as code (code)}
									<button
										type="button"
										role="menuitem"
										class="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-sm text-text transition-colors hover:bg-surface-hover"
										onclick={() => { onBudgetChange({ ...budget, currency: code }); menuView = 'main'; popoverOpen = false; }}
									>
										<span class="text-left">{getCurrencyLabel(code, locale)}</span>
										<div class="flex items-center gap-2">
											<span class="font-mono text-xs opacity-50">{code}</span>
											{#if budget.currency === code}
												<span class="text-accent">✓</span>
											{/if}
										</div>
									</button>
								{/each}
							</div>
						{/if}
				</Popover.Content>
			</Popover.Root>
		</div>
	</header>

	<!-- Summary strip: shown below lg, hidden at lg+ -->
	<div
		class="flex shrink-0 items-center justify-center border-b border-border bg-surface px-4 py-1.5 lg:hidden"
		data-tour="summary-bar-mobile"
	>
		<SummaryBar summary={yearSummary} currency={budget.currency} />
	</div>

	<!-- Main content -->
	<div class="flex flex-1 overflow-hidden">
		<!-- Month grid sidebar -->
		<div
			class="shrink-0 flex-col gap-2 overflow-y-auto border-r border-border p-3 sm:flex w-full sm:w-[280px] sm:no-scrollbar"
			class:hidden={showDetail && (selectedMonth !== null || showYearRecap)}
			class:flex={!(showDetail && (selectedMonth !== null || showYearRecap))}
			data-tour="month-sidebar"
		>
			<!-- Year Overview button -->
			<button
				type="button"
				data-tour="year-overview-btn"
				class="flex w-full items-center justify-between rounded-radius border p-2.5 text-left transition-all duration-150"
				class:bg-accent-tint={showYearRecap}
				class:bg-surface={!showYearRecap}
				class:border-accent={showYearRecap}
				class:border-border={!showYearRecap}
				onclick={selectYearOverview}
			>
				<span class="text-sm font-medium text-text">{m.year_overview()}</span>
				<span class="text-xs text-muted">{budget.year}</span>
			</button>

			<div class="mt-1 text-xs font-medium text-muted">
				{m.months_section()}
			</div>
			{#each monthSummaries as summary, i}
				<MonthCard
					{summary}
					selected={selectedMonth === summary.month}
					currency={budget.currency}
					onclick={() => selectMonth(summary.month)}
					tourAttr={i === 0 ? 'first-month-card' : undefined}
				/>
			{/each}
		</div>

		<!-- Year recap panel -->
		{#if showYearRecap && yearRecap !== null}
			<div
				class="flex-1 flex-col overflow-hidden sm:flex"
				class:hidden={!showDetail}
				class:flex={showDetail}
			>
				<YearRecap
					recap={yearRecap}
					currency={budget.currency}
					year={budget.year}
					onClose={() => { showYearRecap = false; showDetail = false; }}
				/>
			</div>
		<!-- Month detail panel -->
		{:else if selectedMonth !== null && monthSummary !== null}
			<div
				class="flex-1 flex-col overflow-hidden sm:flex"
				class:hidden={!showDetail}
				class:flex={showDetail}
			>
				<!-- Month header -->
				<div
					class="flex shrink-0 items-center justify-between gap-3 border-b border-border bg-surface px-4 py-2"
					data-tour="month-detail-header"
				>
					<div class="flex items-center gap-2">
						<!-- Back button (mobile) -->
						<button
							type="button"
							class="rounded-sm p-1 text-sm text-muted opacity-60 transition-opacity hover:opacity-90 sm:hidden"
							onclick={() => { showDetail = false; selectedMonth = null; showYearRecap = false; }}
						>
							←
						</button>
						<span class="font-semibold">{getMonthFull(selectedMonth, locale)}</span>
						<BalanceBadge balance={monthSummary.balance} />
					</div>

					<div class="hidden items-center gap-3 text-sm sm:flex">
						<span class="text-green">{formatCurrency(monthSummary.incomeTotal, budget.currency, locale)}</span>
						<span class="opacity-40">−</span>
						<span class="text-red">{formatCurrency(monthSummary.expenseTotal, budget.currency, locale)}</span>
						<span class="opacity-40">−</span>
						<span class="text-blue">{formatCurrency(monthSummary.savingsTotal, budget.currency, locale)}</span>
						<span class="opacity-40">=</span>
						<span class="font-semibold" class:text-green={isBalanced(monthSummary.balance)} class:text-red={!isBalanced(monthSummary.balance)}>
							{formatCurrency(monthSummary.balance, budget.currency, locale)}
						</span>
					</div>

					<button
						type="button"
						class="hidden shrink-0 rounded-sm p-1 text-sm text-text opacity-40 transition-opacity hover:opacity-80 sm:block"
						onclick={() => (selectedMonth = null)}
					>
						✕
					</button>
				</div>

				<!-- Entry lists + notes -->
				<div class="flex-1 overflow-y-auto p-4" data-tour="entry-lists">
					<div class="mx-auto max-w-3xl flex flex-col gap-4">

						<!-- Balance status -->
						{#if !isBalanced(monthSummary.balance)}
							<div class="rounded-radius border px-4 py-3 text-sm text-red border-red-border bg-red-tint">
								<strong>{m.balance_unbalanced()}</strong> {formatCurrency(monthSummary.balance, budget.currency, locale)} {m.balance_unbalanced_hint()} {formatCurrency(0, budget.currency, locale)}.
							</div>
						{:else}
							<div class="rounded-radius border px-3 py-2 text-sm text-green border-green-border bg-green-tint">
								{m.balance_balanced()}
							</div>
						{/if}

						{#each ['income', 'expense', 'savings'] as t}
							<div class="rounded-radius border border-border bg-surface overflow-hidden">
								<EntryList
									entries={budget.entries}
									categories={budget.categories}
									month={selectedMonth}
									type={t as EntryType}
									currency={budget.currency}
									{onUpdateEntry}
									{onDeleteEntry}
									onDuplicateEntry={handleDuplicate}
									{onSetOverride}
									{onRemoveOverride}
									{onUpdateBaseAmount}
									{onSkipMonth}
									{onUnskipMonth}
									onEdit={openEditDialog}
									onAddNew={openAddDialog}
									tourAttrs={t === 'income' ? { addBtn: 'add-entry-btn', firstRow: 'first-entry-row' } : undefined}
								/>
							</div>
						{/each}

						<!-- Monthly note -->
						<div class="rounded-radius border border-border bg-surface overflow-hidden">
							<div class="flex items-center justify-between border-b border-border px-3 py-2">
								<span class="text-xs font-medium text-muted">{m.note_section()}</span>
								{#if noteEditing}
									<div class="flex gap-2">
										<button
											type="button"
											class="text-xs text-muted opacity-60 transition-opacity hover:opacity-80"
											onclick={() => { noteText = budget.monthlyNotes[selectedMonth!] ?? ''; noteEditing = false; }}
										>{m.cancel()}</button>
										<button
											type="button"
											class="text-xs font-medium text-accent transition-opacity hover:opacity-80"
											onclick={commitNote}
										>{m.save()}</button>
									</div>
								{:else}
									<button
										type="button"
										class="text-xs text-accent opacity-60 transition-opacity hover:opacity-80"
										onclick={startNoteEdit}
									>{m.edit()}</button>
								{/if}
							</div>

							{#if noteEditing}
								<textarea
									bind:this={noteEl}
									bind:value={noteText}
									rows="3"
									placeholder={m.note_placeholder()}
									class="w-full resize-none bg-surface px-3 py-2 text-sm text-text outline-none"
									onkeydown={onNoteKeydown}
								></textarea>
							{:else}
								<div
									class="px-3 py-2 text-sm"
									class:text-text={!!noteText}
									class:text-muted={!noteText}
									role="button"
									tabindex="0"
									onclick={startNoteEdit}
									onkeydown={(e) => e.key === 'Enter' && startNoteEdit()}
								>
									{noteText || m.note_empty()}
								</div>
							{/if}
						</div>
					</div>
				</div>
			</div>
		{:else}
			<!-- No month selected — empty state (desktop only) -->
			<div class="hidden lg:flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
				<div class="h-8 w-8 rounded border-2 border-muted opacity-15"></div>
				<p class="text-sm text-muted">{m.select_month_hint()}</p>
			</div>
		{/if}
	</div>
</div>

<!-- ImportExportMenu in headless mode: provides file input + confirmation modal, no visible buttons -->
<ImportExportMenu {budget} {onImport} headless={true} bind:fileInput={importFileInput} />

<!-- Categories modal (opened from mobile popover) -->
{#if categoriesModalOpen}
	<CategoryManager
		modal={true}
		bind:open={categoriesModalOpen}
		categories={budget.categories}
		{onAddCategory}
		{onUpdateCategory}
		{onDeleteCategory}
		{categoryError}
		{onClearCategoryError}
	/>
{/if}

<EntryDialog
	open={dialogOpen}
	editEntry={dialogEditEntry}
	defaultType={dialogDefaultType}
	categories={budget.categories}
	{onAddCategory}
	onClose={closeDialog}
	onSave={handleSave}
/>

<WelcomeDialog
	open={welcomeOpen}
	onStartBudgeting={onWelcomeStart}
	onStartTour={triggerTour}
/>
