import * as m from '$lib/paraglide/messages';

export const ENTRY_TYPES = ['income', 'expense', 'savings'] as const;
export const RECURRENCES = ['monthly', 'single', 'annual_distributed'] as const;

export const ENTRY_TYPE = {
	INCOME: 'income',
	EXPENSE: 'expense',
	SAVINGS: 'savings'
} as const;

export const RECURRENCE = {
	MONTHLY: 'monthly',
	SINGLE: 'single',
	ANNUAL_DISTRIBUTED: 'annual_distributed'
} as const;

export const MONTHS_PER_YEAR = 12;

export const CURRENCIES = [
	'AED', 'ARS', 'AUD', 'BRL', 'CAD', 'CHF', 'CLP', 'CNY', 'COP', 'CZK',
	'DKK', 'EGP', 'EUR', 'GBP', 'HKD', 'HUF', 'IDR', 'ILS', 'INR', 'JPY',
	'KRW', 'MXN', 'MYR', 'NGN', 'NOK', 'NZD', 'PEN', 'PHP', 'PKR', 'PLN',
	'RON', 'RUB', 'SAR', 'SEK', 'SGD', 'THB', 'TRY', 'TWD', 'UAH', 'USD',
	'VND', 'ZAR'
] as const;
export const UNCATEGORIZED = 'Uncategorized';

export const ENTRY_TYPE_LABELS: Record<(typeof ENTRY_TYPES)[number], () => string> = {
	income: () => m.type_income(),
	expense: () => m.type_expense(),
	savings: () => m.type_savings()
};

export const RECURRENCE_LABELS: Record<(typeof RECURRENCES)[number], () => string> = {
	monthly: () => m.recurrence_monthly(),
	annual_distributed: () => m.recurrence_annual(),
	single: () => m.recurrence_single()
};
