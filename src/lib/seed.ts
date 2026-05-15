import { nanoid } from 'nanoid';
import type { Budget, Category } from './types';

export function createEmptyBudget(name: string = 'My Budget'): Budget {
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

export function createSeedBudget(name: string = 'My Budget'): Budget {
	const now = new Date().toISOString();

	const seedCategoryNames = ['Housing', 'Food', 'Transport', 'Health', 'Savings', 'Leisure', 'Work'];
	const categories: Category[] = seedCategoryNames.map((n) => ({ id: nanoid(), name: n }));
	const cat = new Map(categories.map((c) => [c.name, c.id]));

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
				name: 'Salary',
				type: 'income',
				recurrence: 'monthly',
				category: cat.get('Work')!,
				baseAmount: 3000,
				monthlyOverrides: {},
				monthlySkips: [],
				notes: ''
			},
			{
				id: nanoid(),
				name: 'Rent',
				type: 'expense',
				recurrence: 'monthly',
				category: cat.get('Housing')!,
				baseAmount: 900,
				monthlyOverrides: {},
				monthlySkips: [],
				notes: ''
			},
			{
				id: nanoid(),
				name: 'Groceries',
				type: 'expense',
				recurrence: 'monthly',
				category: cat.get('Food')!,
				baseAmount: 400,
				monthlyOverrides: {},
				monthlySkips: [],
				notes: ''
			},
			{
				id: nanoid(),
				name: 'Transport',
				type: 'expense',
				recurrence: 'monthly',
				category: cat.get('Transport')!,
				baseAmount: 150,
				monthlyOverrides: {},
				monthlySkips: [],
				notes: ''
			},
			{
				id: nanoid(),
				name: 'Emergency Fund',
				type: 'savings',
				recurrence: 'monthly',
				category: cat.get('Savings')!,
				baseAmount: 300,
				monthlyOverrides: {},
				monthlySkips: [],
				notes: ''
			},
			{
				id: nanoid(),
				name: 'Leisure',
				type: 'expense',
				recurrence: 'monthly',
				category: cat.get('Leisure')!,
				baseAmount: 200,
				monthlyOverrides: {},
				monthlySkips: [],
				notes: ''
			},
			{
				id: nanoid(),
				name: 'Utilities',
				type: 'expense',
				recurrence: 'monthly',
				category: cat.get('Housing')!,
				baseAmount: 100,
				monthlyOverrides: {},
				monthlySkips: [],
				notes: ''
			},
			{
				id: nanoid(),
				name: 'Health',
				type: 'expense',
				recurrence: 'monthly',
				category: cat.get('Health')!,
				baseAmount: 50,
				monthlyOverrides: {},
				monthlySkips: [],
				notes: ''
			},
			{
				id: nanoid(),
				name: 'Vacation',
				type: 'expense',
				recurrence: 'annual_distributed',
				category: cat.get('Leisure')!,
				baseAmount: 1200,
				monthlyOverrides: {},
				monthlySkips: [],
				notes: ''
			},
			{
				id: nanoid(),
				name: 'Christmas Gifts',
				type: 'expense',
				recurrence: 'single',
				category: cat.get('Leisure')!,
				baseAmount: 300,
				month: 11,
				monthlyOverrides: {},
				monthlySkips: [],
				notes: ''
			}
		]
	};
}
