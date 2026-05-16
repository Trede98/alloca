import { nanoid } from 'nanoid';
import type { Budget, Category } from './types';
import * as m from '$lib/paraglide/messages';
import { ENTRY_TYPE, MONTHS_PER_YEAR, RECURRENCE } from './constants';

export function createEmptyBudget(name: string = m.seed_budget_name()): Budget {
	const now = new Date().toISOString();
	return {
		id: nanoid(),
		name,
		year: new Date().getFullYear(),
		currency: 'EUR',
		categories: [],
		entries: [],
		monthlyNotes: {},
		createdAt: now,
		updatedAt: now
	};
}

export function createSeedBudget(name: string = m.seed_budget_name()): Budget {
	const now = new Date().toISOString();

	const cats = {
		housing: { id: nanoid(), name: m.seed_category_housing() },
		food: { id: nanoid(), name: m.seed_category_food() },
		transport: { id: nanoid(), name: m.seed_category_transport() },
		health: { id: nanoid(), name: m.seed_category_health() },
		savings: { id: nanoid(), name: m.seed_category_savings() },
		leisure: { id: nanoid(), name: m.seed_category_leisure() },
		work: { id: nanoid(), name: m.seed_category_work() }
	};
	const categories: Category[] = Object.values(cats);

	return {
		id: nanoid(),
		name,
		year: new Date().getFullYear(),
		currency: 'EUR',
		categories,
		monthlyNotes: {},
		createdAt: now,
		updatedAt: now,
		entries: [
			{
				id: nanoid(),
				name: m.seed_entry_salary(),
				type: ENTRY_TYPE.INCOME,
				recurrence: RECURRENCE.MONTHLY,
				category: cats.work.id,
				baseAmount: 3000,
				monthlyOverrides: {},
				monthlySkips: [],
				notes: ''
			},
			{
				id: nanoid(),
				name: m.seed_entry_rent(),
				type: ENTRY_TYPE.EXPENSE,
				recurrence: RECURRENCE.MONTHLY,
				category: cats.housing.id,
				baseAmount: 900,
				monthlyOverrides: {},
				monthlySkips: [],
				notes: ''
			},
			{
				id: nanoid(),
				name: m.seed_entry_groceries(),
				type: ENTRY_TYPE.EXPENSE,
				recurrence: RECURRENCE.MONTHLY,
				category: cats.food.id,
				baseAmount: 400,
				monthlyOverrides: {},
				monthlySkips: [],
				notes: ''
			},
			{
				id: nanoid(),
				name: m.seed_entry_transport(),
				type: ENTRY_TYPE.EXPENSE,
				recurrence: RECURRENCE.MONTHLY,
				category: cats.transport.id,
				baseAmount: 150,
				monthlyOverrides: {},
				monthlySkips: [],
				notes: ''
			},
			{
				id: nanoid(),
				name: m.seed_entry_emergency_fund(),
				type: ENTRY_TYPE.SAVINGS,
				recurrence: RECURRENCE.MONTHLY,
				category: cats.savings.id,
				baseAmount: 300,
				monthlyOverrides: {},
				monthlySkips: [],
				notes: ''
			},
			{
				id: nanoid(),
				name: m.seed_entry_leisure(),
				type: ENTRY_TYPE.EXPENSE,
				recurrence: RECURRENCE.MONTHLY,
				category: cats.leisure.id,
				baseAmount: 200,
				monthlyOverrides: {},
				monthlySkips: [],
				notes: ''
			},
			{
				id: nanoid(),
				name: m.seed_entry_utilities(),
				type: ENTRY_TYPE.EXPENSE,
				recurrence: RECURRENCE.MONTHLY,
				category: cats.housing.id,
				baseAmount: 100,
				monthlyOverrides: {},
				monthlySkips: [],
				notes: ''
			},
			{
				id: nanoid(),
				name: m.seed_entry_health(),
				type: ENTRY_TYPE.EXPENSE,
				recurrence: RECURRENCE.MONTHLY,
				category: cats.health.id,
				baseAmount: 50,
				monthlyOverrides: {},
				monthlySkips: [],
				notes: ''
			},
			{
				id: nanoid(),
				name: m.seed_entry_vacation(),
				type: ENTRY_TYPE.EXPENSE,
				recurrence: RECURRENCE.ANNUAL_DISTRIBUTED,
				category: cats.leisure.id,
				baseAmount: 1200,
				monthlyOverrides: {},
				monthlySkips: [],
				notes: ''
			},
			{
				id: nanoid(),
				name: m.seed_entry_christmas_gifts(),
				type: ENTRY_TYPE.EXPENSE,
				recurrence: RECURRENCE.SINGLE,
				category: cats.leisure.id,
				baseAmount: 300,
				month: MONTHS_PER_YEAR - 1,
				monthlyOverrides: {},
				monthlySkips: [],
				notes: ''
			}
		]
	};
}
