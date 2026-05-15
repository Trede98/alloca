export function formatCompact(amount: number, currency = 'EUR'): string {
	const abs = Math.abs(amount);
	const sign = amount < 0 ? '-' : '';
	const symbol = new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: 0 })
		.formatToParts(0)
		.find((p) => p.type === 'currency')?.value ?? currency;
	if (abs >= 10_000) return `${sign}${symbol}${Math.round(abs / 1000)}K`;
	if (abs >= 1_000) return `${sign}${symbol}${(abs / 1000).toFixed(1)}K`;
	return formatCurrency(amount, currency);
}

export function formatCurrency(amount: number, currency = 'EUR'): string {
	return new Intl.NumberFormat('en-US', {
		style: 'currency',
		currency,
		minimumFractionDigits: 0,
		maximumFractionDigits: 2
	}).format(amount);
}

export const MONTH_NAMES = [
	'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
	'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

export const MONTH_NAMES_FULL = [
	'January', 'February', 'March', 'April', 'May', 'June',
	'July', 'August', 'September', 'October', 'November', 'December'
];
