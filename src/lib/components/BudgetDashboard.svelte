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
	import { Switch } from 'bits-ui';
	import { Settings2, Tag, Upload, Download, Trash2, Sun, Moon, Globe, ChevronRight, ChevronLeft } from 'lucide-svelte';
	import SummaryBar from './SummaryBar.svelte';
	import MonthCard from './MonthCard.svelte';
	import YearRecap from './YearRecap.svelte';
	import EntryList from './EntryList.svelte';
	import EntryDialog from './EntryDialog.svelte';
	import BalanceBadge from './BalanceBadge.svelte';
	import ImportExportMenu from './ImportExportMenu.svelte';
	import CategoryManager from './CategoryManager.svelte';
	import * as m from '$lib/paraglide/messages';
	import { getLocale, setLocale } from '$lib/paraglide/runtime';

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
		onSkipMonth,
		onUnskipMonth,
		onImport,
		onBudgetChange,
		onAddCategory,
		onUpdateCategory,
		onDeleteCategory,
		categoryError,
		onClearCategoryError,
		startReset
	}: {
		budget: Budget;
		onAddEntry: (input: NewEntryInput) => void;
		onUpdateEntry: (id: string, patch: Partial<Omit<Entry, 'id' | 'monthlyOverrides'>>) => void;
		onDeleteEntry: (id: string) => void;
		onSetOverride: (entryId: string, month: number, amount: number) => void;
		onRemoveOverride: (entryId: string, month: number) => void;
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

	const theme = $derived(getTheme());
	const locale = $derived(getLocale());
	const currentLang = $derived(LANGUAGES.find((l) => l.code === locale) ?? LANGUAGES[0]);

	// Mobile actions popover
	let mobileMenuOpen = $state(false);
	let menuView = $state<'main' | 'language'>('main');

	function openPopover() {
		menuView = 'main';
		mobileMenuOpen = true;
	}

	function closePopover() {
		mobileMenuOpen = false;
		menuView = 'main';
	}

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

<div class="flex h-screen flex-col overflow-hidden" style:background-color="var(--color-bg)">
	<!-- Top bar -->
	<header
		class="flex shrink-0 items-center justify-between gap-3 border-b px-4 py-2"
		style:border-color="var(--color-border)"
		style:background-color="var(--color-surface)"
	>
		<!-- Left: budget name + year -->
		<span class="flex min-w-0 items-center gap-1">
			{#if nameEditing}
				<input
					bind:this={nameEl}
					bind:value={nameInput}
					class="min-w-0 max-w-40 flex-1 bg-transparent font-semibold tracking-tight outline-none border-b"
					style:border-color="var(--color-border)"
					style:color="var(--color-text)"
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
		<div class="hidden flex-1 justify-center lg:flex">
			<SummaryBar summary={yearSummary} currency={budget.currency} />
		</div>

		<!-- Right: actions popover (all breakpoints) -->
		<div class="flex shrink-0 items-center">
			<div class="relative">
				<button
					type="button"
					class="flex items-center justify-center p-1.5 opacity-60 transition-opacity hover:opacity-90"
					style:border-radius="var(--radius-sm)"
					title={m.settings()}
					onclick={openPopover}
				>
					<Settings2 size={16} />
				</button>

				{#if mobileMenuOpen}
					<!-- Popover panel -->
					<div
						role="menu"
						tabindex="-1"
						class="absolute right-0 top-full z-50 mt-1 min-w-[220px] border py-1"
						style:border-radius="var(--radius)"
						style:background-color="var(--color-surface)"
						style:border-color="var(--color-border)"
						style:box-shadow="var(--shadow-dropdown)"
						onkeydown={(e) => e.key === 'Escape' && closePopover()}
					>
						{#if menuView === 'main'}
							<!-- Main menu -->

							<!-- Categories -->
							<button
								type="button"
								role="menuitem"
								class="flex w-full items-center gap-3 px-3 py-2.5 text-sm transition-colors"
								style:color="var(--color-text)"
								onmouseenter={(e) => (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--surface-hover)'}
								onmouseleave={(e) => (e.currentTarget as HTMLElement).style.backgroundColor = ''}
								onclick={() => { categoriesModalOpen = true; closePopover(); }}
							>
								<Tag size={14} style="opacity:0.6" />
								{m.categories()}
							</button>

							<!-- Import -->
							<button
								type="button"
								role="menuitem"
								class="flex w-full items-center gap-3 px-3 py-2.5 text-sm transition-colors"
								style:color="var(--color-text)"
								onmouseenter={(e) => (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--surface-hover)'}
								onmouseleave={(e) => (e.currentTarget as HTMLElement).style.backgroundColor = ''}
								onclick={() => { importFileInput?.click(); closePopover(); }}
							>
								<Upload size={14} style="opacity:0.6" />
								{m.import()}
							</button>

							<!-- Export -->
							<button
								type="button"
								role="menuitem"
								class="flex w-full items-center gap-3 px-3 py-2.5 text-sm transition-colors"
								style:color="var(--color-text)"
								onmouseenter={(e) => (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--surface-hover)'}
								onmouseleave={(e) => (e.currentTarget as HTMLElement).style.backgroundColor = ''}
								onclick={() => { popoverExport(); closePopover(); }}
							>
								<Download size={14} style="opacity:0.6" />
								{m.export()}
							</button>

							<div class="my-1 border-t" style:border-color="var(--color-border)"></div>

							<!-- Language submenu trigger -->
							<button
								type="button"
								role="menuitem"
								class="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-sm transition-colors"
								style:color="var(--color-text)"
								onmouseenter={(e) => (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--surface-hover)'}
								onmouseleave={(e) => (e.currentTarget as HTMLElement).style.backgroundColor = ''}
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

							<div class="my-1 border-t" style:border-color="var(--color-border)"></div>

							<!-- Theme toggle row (not a button — label + Switch) -->
							<div class="flex items-center justify-between gap-3 px-3 py-2.5">
								<div class="flex items-center gap-3 text-sm" style:color="var(--color-text)">
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
									class="relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2"
									style="background-color: {theme === 'dark' ? 'var(--color-accent)' : 'var(--color-border)'}"
								>
									<Switch.Thumb
										class="pointer-events-none block h-4 w-4 rounded-full shadow-sm transition-transform"
										style="background-color: var(--color-text); transform: {theme === 'dark' ? 'translateX(16px)' : 'translateX(0px)'}"
									/>
								</Switch.Root>
							</div>

							<div class="my-1 border-t" style:border-color="var(--color-border)"></div>

							<!-- Clear budget -->
							<button
								type="button"
								role="menuitem"
								class="flex w-full items-center gap-3 px-3 py-2.5 text-sm transition-colors"
								style:color="var(--color-red)"
								onmouseenter={(e) => (e.currentTarget as HTMLElement).style.backgroundColor = 'color-mix(in srgb, var(--color-red) 6%, transparent)'}
								onmouseleave={(e) => (e.currentTarget as HTMLElement).style.backgroundColor = ''}
								onclick={() => { startReset(); closePopover(); }}
							>
								<Trash2 size={14} />
								{m.clear_budget()}
							</button>

						{:else}
							<!-- Language submenu view -->

							<!-- Back button -->
							<button
								type="button"
								role="menuitem"
								class="flex w-full items-center gap-2 px-3 py-2.5 text-sm font-medium transition-colors"
								style:color="var(--color-text)"
								onmouseenter={(e) => (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--surface-hover)'}
								onmouseleave={(e) => (e.currentTarget as HTMLElement).style.backgroundColor = ''}
								onclick={() => (menuView = 'main')}
							>
								<ChevronLeft size={14} style="opacity:0.6" />
								{m.language()}
							</button>

							<div class="my-1 border-t" style:border-color="var(--color-border)"></div>

							<!-- Language options -->
							{#each LANGUAGES as lang}
								<button
									type="button"
									role="menuitem"
									class="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-sm transition-colors"
									style:color="var(--color-text)"
									onmouseenter={(e) => (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--surface-hover)'}
									onmouseleave={(e) => (e.currentTarget as HTMLElement).style.backgroundColor = ''}
									onclick={() => { setLocale(lang.code); menuView = 'main'; }}
								>
									<div class="flex items-center gap-3">
										<span class="text-base leading-none">{lang.flag}</span>
										<span>{lang.label}</span>
									</div>
									{#if locale === lang.code}
										<span style:color="var(--color-accent)">✓</span>
									{/if}
								</button>
							{/each}
						{/if}
					</div>

					<!-- Click-outside overlay -->
					<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
					<div
						role="presentation"
						class="fixed inset-0 z-40"
						onclick={closePopover}
						onkeydown={() => {}}
					></div>
				{/if}
			</div>
		</div>
	</header>

	<!-- Summary strip: shown below lg, hidden at lg+ -->
	<div
		class="flex shrink-0 items-center justify-center border-b px-4 py-1.5 lg:hidden"
		style:border-color="var(--color-border)"
		style:background-color="var(--color-surface)"
	>
		<SummaryBar summary={yearSummary} currency={budget.currency} />
	</div>

	<!-- Main content -->
	<div class="flex flex-1 overflow-hidden">
		<!-- Month grid sidebar -->
		<div
			class="shrink-0 flex-col gap-2 overflow-y-auto border-r p-3 sm:flex w-full sm:w-[280px]"
			class:hidden={showDetail && (selectedMonth !== null || showYearRecap)}
			class:flex={!(showDetail && (selectedMonth !== null || showYearRecap))}
			style:border-color="var(--color-border)"
		>
			<!-- Year Overview button -->
			<button
				type="button"
				class="flex w-full items-center justify-between border p-2.5 text-left transition-all duration-150"
				style:border-radius="var(--radius)"
				style:background-color={showYearRecap
					? 'color-mix(in srgb, var(--color-accent) 12%, var(--color-surface))'
					: 'var(--color-surface)'}
				style:border-color={showYearRecap ? 'var(--color-accent)' : 'var(--color-border)'}
				style:box-shadow="var(--shadow-card)"
				onclick={selectYearOverview}
			>
				<span class="text-sm font-medium" style:color="var(--color-text)">{m.year_overview()}</span>
				<span class="text-xs" style:color="var(--color-muted)">{budget.year}</span>
			</button>

			<div class="mt-1 text-xs font-medium" style:color="var(--color-muted)">
				{m.months_section()}
			</div>
			{#each monthSummaries as summary}
				<MonthCard
					{summary}
					selected={selectedMonth === summary.month}
					currency={budget.currency}
					onclick={() => selectMonth(summary.month)}
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
							style:color="var(--color-muted)"
							onclick={() => { showDetail = false; selectedMonth = null; showYearRecap = false; }}
						>
							←
						</button>
						<span class="font-semibold">{getMonthFull(selectedMonth, locale)}</span>
						<BalanceBadge balance={monthSummary.balance} />
					</div>

					<div class="hidden items-center gap-3 text-sm sm:flex">
						<span style:color="var(--color-green)">{formatCurrency(monthSummary.incomeTotal, budget.currency, locale)}</span>
						<span class="opacity-40">−</span>
						<span style:color="var(--color-red)">{formatCurrency(monthSummary.expenseTotal, budget.currency, locale)}</span>
						<span class="opacity-40">−</span>
						<span style:color="var(--color-blue)">{formatCurrency(monthSummary.savingsTotal, budget.currency, locale)}</span>
						<span class="opacity-40">=</span>
						<span
							class="font-semibold"
							style:color={isBalanced(monthSummary.balance) ? 'var(--color-green)' : 'var(--color-red)'}
						>
							{formatCurrency(monthSummary.balance, budget.currency, locale)}
						</span>
					</div>

					<button
						type="button"
						class="hidden shrink-0 p-1 text-sm opacity-40 transition-opacity hover:opacity-80 sm:block"
						style:border-radius="var(--radius-sm)"
						style:color="var(--color-muted)"
						onclick={() => (selectedMonth = null)}
					>
						✕
					</button>
				</div>

				<!-- Entry lists + notes -->
				<div class="flex-1 overflow-y-auto p-4">
					<div class="mx-auto max-w-3xl flex flex-col gap-4">

						<!-- Balance status -->
						{#if !isBalanced(monthSummary.balance)}
							<div
								class="border px-4 py-3 text-sm"
								style:border-radius="var(--radius)"
								style:border-color="color-mix(in srgb, var(--color-red) 30%, var(--color-border))"
								style:background-color="color-mix(in srgb, var(--color-red) 6%, var(--color-surface))"
								style:color="var(--color-red)"
							>
								<strong>{m.balance_unbalanced()}</strong> {formatCurrency(monthSummary.balance, budget.currency, locale)} {m.balance_unbalanced_hint()} {formatCurrency(0, budget.currency, locale)}.
							</div>
						{:else}
							<div
								class="border px-3 py-2 text-sm"
								style:border-radius="var(--radius)"
								style:border-color="color-mix(in srgb, var(--color-green) 30%, var(--color-border))"
								style:background-color="color-mix(in srgb, var(--color-green) 5%, var(--color-surface))"
								style:color="var(--color-green)"
							>
								{m.balance_balanced()}
							</div>
						{/if}

						{#each ['income', 'expense', 'savings'] as t}
							<div
								class="border overflow-hidden"
								style:border-radius="var(--radius)"
								style:border-color="var(--color-border)"
								style:background-color="var(--color-surface)"
								style:box-shadow="var(--shadow-card)"
							>
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
									{onSkipMonth}
									{onUnskipMonth}
									onEdit={openEditDialog}
									onAddNew={openAddDialog}
								/>
							</div>
						{/each}

						<!-- Monthly note -->
						<div
							class="border overflow-hidden"
							style:border-radius="var(--radius)"
							style:border-color="var(--color-border)"
							style:background-color="var(--color-surface)"
							style:box-shadow="var(--shadow-card)"
						>
							<div
								class="flex items-center justify-between border-b px-3 py-2"
								style:border-color="var(--color-border)"
							>
								<span class="text-xs font-medium" style:color="var(--color-muted)">{m.note_section()}</span>
								{#if noteEditing}
									<div class="flex gap-2">
										<button
											type="button"
											class="text-xs opacity-60 transition-opacity hover:opacity-80"
											style:color="var(--color-muted)"
											onclick={() => { noteText = budget.monthlyNotes[selectedMonth!] ?? ''; noteEditing = false; }}
										>{m.cancel()}</button>
										<button
											type="button"
											class="text-xs font-medium transition-opacity hover:opacity-80"
											style:color="var(--color-accent)"
											onclick={commitNote}
										>{m.save()}</button>
									</div>
								{:else}
									<button
										type="button"
										class="text-xs opacity-60 transition-opacity hover:opacity-80"
										style:color="var(--color-accent)"
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
									class="w-full resize-none px-3 py-2 text-sm outline-none"
									style:background-color="var(--color-surface)"
									style:color="var(--color-text)"
									onkeydown={onNoteKeydown}
								></textarea>
							{:else}
								<div
									class="px-3 py-2 text-sm"
									style:color={noteText ? 'var(--color-text)' : 'var(--color-muted)'}
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
				<div
					class="h-8 w-8 rounded border-2 opacity-15"
					style:border-color="var(--color-muted)"
				></div>
				<p class="text-sm" style:color="var(--color-muted)">{m.select_month_hint()}</p>
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
