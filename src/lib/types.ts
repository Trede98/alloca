export type EntryType = 'income' | 'expense' | 'savings';
export type Recurrence = 'monthly' | 'single' | 'annual_distributed';

export interface Category {
	id: string;
	name: string;
}

export interface Entry {
	id: string;
	name: string;
	type: EntryType;
	recurrence: Recurrence;
	category: string;
	baseAmount: number;
	month?: number; // 0-11, only for 'single'
	monthlyOverrides: Record<number, number>;
	notes?: string;
}

export interface Budget {
	id: string;
	name: string;
	year: number;
	currency: string; // ISO 4217, e.g. 'EUR', 'USD'
	entries: Entry[];
	categories: Category[];
	monthlyNotes: Record<number, string>; // 0-11 → note text
	createdAt: string;
	updatedAt: string;
}

export interface MonthSummary {
	month: number;
	incomeTotal: number;
	expenseTotal: number;
	savingsTotal: number;
	balance: number;
}

export interface YearSummary {
	incomeTotal: number;
	expenseTotal: number;
	savingsTotal: number;
	yearlyBalance: number;
}

export interface YearRecapEntry {
	id: string;
	name: string;
	recurrence: Recurrence;
	yearTotal: number;
}

export interface YearRecapCategory {
	categoryId: string;
	categoryName: string;
	yearTotal: number;
	entries: YearRecapEntry[];
}

export interface YearRecapSection {
	type: EntryType;
	total: number;
	categories: YearRecapCategory[];
}

export interface YearRecap {
	income: YearRecapSection;
	expenses: YearRecapSection;
	savings: YearRecapSection;
	yearlyBalance: number;
}

export interface ExportData {
	version: number;
	exportedAt: string;
	budget: Budget;
}
