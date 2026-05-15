import { nanoid } from 'nanoid';
import type { Budget, Category, Entry, EntryType, MonthSummary, Recurrence, YearRecap, YearRecapCategory, YearRecapEntry, YearSummary } from './types';

// ─── Calculations ─────────────────────────────────────────────────────────────

export function getMonthAmount(entry: Entry, month: number): number {
	if ((entry.monthlySkips ?? []).includes(month)) return 0;
	if (entry.recurrence !== 'annual_distributed' && month in entry.monthlyOverrides) {
		return entry.monthlyOverrides[month];
	}
	if (entry.recurrence === 'single') {
		return entry.month === month ? entry.baseAmount : 0;
	}
	if (entry.recurrence === 'annual_distributed') {
		const activeMonths = 12 - (entry.monthlySkips ?? []).length;
		return entry.baseAmount / activeMonths;
	}
	return entry.baseAmount;
}

export function computeMonthSummary(budget: Budget, month: number): MonthSummary {
	let incomeTotal = 0;
	let expenseTotal = 0;
	let savingsTotal = 0;

	for (const entry of budget.entries) {
		const amount = getMonthAmount(entry, month);
		if (entry.type === 'income') incomeTotal += amount;
		else if (entry.type === 'expense') expenseTotal += amount;
		else if (entry.type === 'savings') savingsTotal += amount;
	}

	return {
		month,
		incomeTotal,
		expenseTotal,
		savingsTotal,
		balance: incomeTotal - expenseTotal - savingsTotal
	};
}

export function computeYearSummary(budget: Budget): YearSummary {
	let incomeTotal = 0;
	let expenseTotal = 0;
	let savingsTotal = 0;

	for (let m = 0; m < 12; m++) {
		const s = computeMonthSummary(budget, m);
		incomeTotal += s.incomeTotal;
		expenseTotal += s.expenseTotal;
		savingsTotal += s.savingsTotal;
	}

	return {
		incomeTotal,
		expenseTotal,
		savingsTotal,
		yearlyBalance: incomeTotal - expenseTotal - savingsTotal
	};
}

export function getAllMonthSummaries(budget: Budget): MonthSummary[] {
	return Array.from({ length: 12 }, (_, m) => computeMonthSummary(budget, m));
}

export function computeYearRecap(budget: Budget): YearRecap {
	const categoryMap = new Map(budget.categories.map((c) => [c.id, c.name]));

	const buckets: Record<'income' | 'expense' | 'savings', Map<string, YearRecapCategory>> = {
		income: new Map(),
		expense: new Map(),
		savings: new Map()
	};

	for (const entry of budget.entries) {
		const section = buckets[entry.type];
		const catName = categoryMap.get(entry.category) ?? 'Uncategorized';
		if (!section.has(catName)) {
			section.set(catName, { categoryId: entry.category, categoryName: catName, yearTotal: 0, entries: [] });
		}
		const bucket = section.get(catName)!;
		const entryYearTotal = Array.from({ length: 12 }, (_, m) => getMonthAmount(entry, m)).reduce((s, a) => s + a, 0);
		bucket.entries.push({ id: entry.id, name: entry.name, recurrence: entry.recurrence, yearTotal: entryYearTotal });
		bucket.yearTotal += entryYearTotal;
	}

	for (const map of Object.values(buckets)) {
		for (const cat of map.values()) {
			cat.entries.sort((a, b) => a.name.localeCompare(b.name));
		}
	}

	function toSection(type: EntryType, map: Map<string, YearRecapCategory>) {
		const categories = [...map.values()].sort((a, b) => a.categoryName.localeCompare(b.categoryName));
		const total = categories.reduce((s, c) => s + c.yearTotal, 0);
		return { type, total, categories };
	}

	const income = toSection('income', buckets.income);
	const expenses = toSection('expense', buckets.expense);
	const savings = toSection('savings', buckets.savings);

	return { income, expenses, savings, yearlyBalance: income.total - expenses.total - savings.total };
}

export function isBalanced(balance: number): boolean {
	return Math.abs(balance) < 0.01;
}

// ─── Entry Defaults ───────────────────────────────────────────────────────────

export interface NewEntryInput {
	name: string;
	type: EntryType;
	recurrence: Recurrence;
	category: string;
	baseAmount: number;
	month?: number;
	notes?: string;
}

export function buildEntry(input: NewEntryInput): Entry {
	if (!input.name.trim()) throw new Error('Entry name is required');
	if (input.baseAmount < 0) throw new Error('Amount must be non-negative');
	if (input.recurrence === 'single' && input.month === undefined) {
		throw new Error('Single entries require a month');
	}
	if (input.recurrence !== 'single' && input.month !== undefined) {
		throw new Error('Only single entries use a month');
	}

	if (!input.category) throw new Error('Category is required');

	return {
		id: nanoid(),
		name: input.name.trim(),
		type: input.type,
		recurrence: input.recurrence,
		category: input.category,
		baseAmount: input.baseAmount,
		month: input.month,
		monthlyOverrides: {},
		monthlySkips: [],
		notes: input.notes?.trim() ?? ''
	};
}

// ─── Mutations (return new Budget — never mutate in place) ────────────────────

export function addEntry(budget: Budget, input: NewEntryInput): Budget {
	const entry = buildEntry(input);
	return touch({ ...budget, entries: [...budget.entries, entry] });
}

export function updateEntry(
	budget: Budget,
	id: string,
	patch: Partial<Omit<Entry, 'id' | 'monthlyOverrides'>>
): Budget {
	const entries = budget.entries.map((e) => {
		if (e.id !== id) return e;
		const updated: Entry = { ...e, ...patch };
		if (patch.name !== undefined && !patch.name.trim()) throw new Error('Entry name is required');
		if (patch.baseAmount !== undefined && patch.baseAmount < 0) {
			throw new Error('Amount must be non-negative');
		}
		if (patch.recurrence && patch.recurrence !== 'single') {
			updated.month = undefined;
		}
		return updated;
	});
	return touch({ ...budget, entries });
}

export function deleteEntry(budget: Budget, id: string): Budget {
	return touch({ ...budget, entries: budget.entries.filter((e) => e.id !== id) });
}

export function setOverride(budget: Budget, entryId: string, month: number, amount: number): Budget {
	if (amount < 0) throw new Error('Amount must be non-negative');
	const entries = budget.entries.map((e) => {
		if (e.id !== entryId) return e;
		return { ...e, monthlyOverrides: { ...e.monthlyOverrides, [month]: amount } };
	});
	return touch({ ...budget, entries });
}

export function removeOverride(budget: Budget, entryId: string, month: number): Budget {
	const entries = budget.entries.map((e) => {
		if (e.id !== entryId) return e;
		const overrides = { ...e.monthlyOverrides };
		delete overrides[month];
		return { ...e, monthlyOverrides: overrides };
	});
	return touch({ ...budget, entries });
}

export function skipMonth(budget: Budget, entryId: string, month: number): Budget {
	const entries = budget.entries.map((e) => {
		if (e.id !== entryId) return e;
		const skips = (e.monthlySkips ?? []).includes(month) ? e.monthlySkips : [...(e.monthlySkips ?? []), month];
		return { ...e, monthlySkips: skips };
	});
	return touch({ ...budget, entries });
}

export function unskipMonth(budget: Budget, entryId: string, month: number): Budget {
	const entries = budget.entries.map((e) => {
		if (e.id !== entryId) return e;
		return { ...e, monthlySkips: (e.monthlySkips ?? []).filter((m) => m !== month) };
	});
	return touch({ ...budget, entries });
}

export function renameBudget(budget: Budget, name: string): Budget {
	const trimmed = name.trim() || 'My Budget';
	return touch({ ...budget, name: trimmed });
}

export function addCategory(budget: Budget, name: string): Budget {
	const trimmed = name.trim() || 'New Category';
	const duplicate = budget.categories.some(
		(c) => c.name.trim().toLowerCase() === trimmed.toLowerCase()
	);
	if (duplicate) throw new Error('category_error_duplicate');
	const cat: Category = { id: nanoid(), name: trimmed };
	return touch({ ...budget, categories: [...budget.categories, cat] });
}

export function updateCategory(budget: Budget, id: string, name: string): Budget {
	const trimmed = name.trim();
	if (!trimmed) throw new Error('Category name is required');
	const duplicate = budget.categories.some(
		(c) => c.id !== id && c.name.trim().toLowerCase() === trimmed.toLowerCase()
	);
	if (duplicate) throw new Error('category_error_duplicate');
	const categories = budget.categories.map((c) => (c.id === id ? { ...c, name: trimmed } : c));
	return touch({ ...budget, categories });
}

export function deleteCategory(budget: Budget, id: string): Budget {
	if (budget.entries.some((e) => e.category === id)) {
		throw new Error('category_error_in_use');
	}
	const categories = budget.categories.filter((c) => c.id !== id);
	return touch({ ...budget, categories });
}

export function setMonthNote(budget: Budget, month: number, note: string): Budget {
	const monthlyNotes = { ...budget.monthlyNotes };
	if (note.trim()) {
		monthlyNotes[month] = note.trim();
	} else {
		delete monthlyNotes[month];
	}
	return touch({ ...budget, monthlyNotes });
}

// ─── Internal ─────────────────────────────────────────────────────────────────

function touch(budget: Budget): Budget {
	return { ...budget, updatedAt: new Date().toISOString() };
}
