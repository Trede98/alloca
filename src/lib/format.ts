export function getMonthShort(monthIndex: number, locale: string): string {
	return new Intl.DateTimeFormat(locale, { month: 'short' }).format(new Date(2000, monthIndex));
}

export function getMonthFull(monthIndex: number, locale: string): string {
	return new Intl.DateTimeFormat(locale, { month: 'long' }).format(new Date(2000, monthIndex));
}

export function formatCompact(amount: number, currency = 'EUR', locale = 'en'): string {
	const abs = Math.abs(amount);
	const sign = amount < 0 ? '-' : '';
	const symbol = new Intl.NumberFormat(locale, { style: 'currency', currency, minimumFractionDigits: 0 })
		.formatToParts(0)
		.find((p) => p.type === 'currency')?.value ?? currency;
	if (abs >= 10_000) return `${sign}${symbol}${Math.round(abs / 1000)}K`;
	if (abs >= 1_000) return `${sign}${symbol}${(abs / 1000).toFixed(1)}K`;
	return formatCurrency(amount, currency, locale);
}

export function formatCurrency(amount: number, currency = 'EUR', locale = 'en'): string {
	return new Intl.NumberFormat(locale, {
		style: 'currency',
		currency,
		minimumFractionDigits: 0,
		maximumFractionDigits: 2
	}).format(amount);
}

// Kept for seed data only (non-localized)
export const MONTH_NAMES = [
	'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
	'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

export const MONTH_NAMES_FULL = [
	'January', 'February', 'March', 'April', 'May', 'June',
	'July', 'August', 'September', 'October', 'November', 'December'
];
