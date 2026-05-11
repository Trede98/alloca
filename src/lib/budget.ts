import type { Budget, Entry, MonthSummary, YearSummary } from './types';

export function getMonthAmount(entry: Entry, month: number): number {
	if (month in entry.monthlyOverrides) {
		return entry.monthlyOverrides[month];
	}
	if (entry.recurrence === 'single') {
		return entry.month === month ? entry.baseAmount : 0;
	}
	if (entry.recurrence === 'annual_distributed') {
		return entry.baseAmount / 12;
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
