export type EntryType = 'income' | 'expense' | 'savings';
export type Recurrence = 'monthly' | 'single' | 'annual_distributed';

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
	entries: Entry[];
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

export interface ExportData {
	version: number;
	exportedAt: string;
	budget: Budget;
}
