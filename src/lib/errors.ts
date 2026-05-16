import * as m from '$lib/paraglide/messages';

export const BUDGET_ERROR = {
	CATEGORY_DUPLICATE: 'category_error_duplicate',
	CATEGORY_IN_USE: 'category_error_in_use'
} as const;

export type BudgetErrorCode = (typeof BUDGET_ERROR)[keyof typeof BUDGET_ERROR];

export class BudgetError extends Error {
	constructor(public readonly code: BudgetErrorCode) {
		super(code);
	}
}

export const BUDGET_ERROR_LABELS: Record<BudgetErrorCode, () => string> = {
	[BUDGET_ERROR.CATEGORY_DUPLICATE]: () => m.category_error_duplicate(),
	[BUDGET_ERROR.CATEGORY_IN_USE]: () => m.category_error_in_use()
};
