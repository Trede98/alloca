import { nanoid } from 'nanoid';
import type { Budget, Category } from './types';
import * as m from '$lib/paraglide/messages';

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
				type: 'income',
				recurrence: 'monthly',
				category: cats.work.id,
				baseAmount: 3000,
				monthlyOverrides: {},
				monthlySkips: [],
				notes: ''
			},
			{
				id: nanoid(),
				name: m.seed_entry_rent(),
				type: 'expense',
				recurrence: 'monthly',
				category: cats.housing.id,
				baseAmount: 900,
				monthlyOverrides: {},
				monthlySkips: [],
				notes: ''
			},
			{
				id: nanoid(),
				name: m.seed_entry_groceries(),
				type: 'expense',
				recurrence: 'monthly',
				category: cats.food.id,
				baseAmount: 400,
				monthlyOverrides: {},
				monthlySkips: [],
				notes: ''
			},
			{
				id: nanoid(),
				name: m.seed_entry_transport(),
				type: 'expense',
				recurrence: 'monthly',
				category: cats.transport.id,
				baseAmount: 150,
				monthlyOverrides: {},
				monthlySkips: [],
				notes: ''
			},
			{
				id: nanoid(),
				name: m.seed_entry_emergency_fund(),
				type: 'savings',
				recurrence: 'monthly',
				category: cats.savings.id,
				baseAmount: 300,
				monthlyOverrides: {},
				monthlySkips: [],
				notes: ''
			},
			{
				id: nanoid(),
				name: m.seed_entry_leisure(),
				type: 'expense',
				recurrence: 'monthly',
				category: cats.leisure.id,
				baseAmount: 200,
				monthlyOverrides: {},
				monthlySkips: [],
				notes: ''
			},
			{
				id: nanoid(),
				name: m.seed_entry_utilities(),
				type: 'expense',
				recurrence: 'monthly',
				category: cats.housing.id,
				baseAmount: 100,
				monthlyOverrides: {},
				monthlySkips: [],
				notes: ''
			},
			{
				id: nanoid(),
				name: m.seed_entry_health(),
				type: 'expense',
				recurrence: 'monthly',
				category: cats.health.id,
				baseAmount: 50,
				monthlyOverrides: {},
				monthlySkips: [],
				notes: ''
			},
			{
				id: nanoid(),
				name: m.seed_entry_vacation(),
				type: 'expense',
				recurrence: 'annual_distributed',
				category: cats.leisure.id,
				baseAmount: 1200,
				monthlyOverrides: {},
				monthlySkips: [],
				notes: ''
			},
			{
				id: nanoid(),
				name: m.seed_entry_christmas_gifts(),
				type: 'expense',
				recurrence: 'single',
				category: cats.leisure.id,
				baseAmount: 300,
				month: 11,
				monthlyOverrides: {},
				monthlySkips: [],
				notes: ''
			}
		]
	};
}
