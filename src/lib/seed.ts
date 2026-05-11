import { nanoid } from 'nanoid';
import type { Budget } from './types';

export function createSeedBudget(): Budget {
	const now = new Date().toISOString();
	return {
		id: nanoid(),
		name: 'My Budget',
		year: new Date().getFullYear(),
		currency: 'EUR',
		monthlyNotes: {},
		createdAt: now,
		updatedAt: now,
		entries: [
			{
				id: nanoid(),
				name: 'Salary',
				type: 'income',
				recurrence: 'monthly',
				category: 'Work',
				baseAmount: 3000,
				monthlyOverrides: {},
				notes: ''
			},
			{
				id: nanoid(),
				name: 'Rent',
				type: 'expense',
				recurrence: 'monthly',
				category: 'Housing',
				baseAmount: 900,
				monthlyOverrides: {},
				notes: ''
			},
			{
				id: nanoid(),
				name: 'Groceries',
				type: 'expense',
				recurrence: 'monthly',
				category: 'Food',
				baseAmount: 400,
				monthlyOverrides: {},
				notes: ''
			},
			{
				id: nanoid(),
				name: 'Transport',
				type: 'expense',
				recurrence: 'monthly',
				category: 'Transport',
				baseAmount: 150,
				monthlyOverrides: {},
				notes: ''
			},
			{
				id: nanoid(),
				name: 'Emergency Fund',
				type: 'savings',
				recurrence: 'monthly',
				category: 'Savings',
				baseAmount: 300,
				monthlyOverrides: {},
				notes: ''
			},
			{
				id: nanoid(),
				name: 'Leisure',
				type: 'expense',
				recurrence: 'monthly',
				category: 'Leisure',
				baseAmount: 200,
				monthlyOverrides: {},
				notes: ''
			},
			{
				id: nanoid(),
				name: 'Utilities',
				type: 'expense',
				recurrence: 'monthly',
				category: 'Housing',
				baseAmount: 100,
				monthlyOverrides: {},
				notes: ''
			},
			{
				id: nanoid(),
				name: 'Health',
				type: 'expense',
				recurrence: 'monthly',
				category: 'Health',
				baseAmount: 50,
				monthlyOverrides: {},
				notes: ''
			},
			{
				id: nanoid(),
				name: 'Vacation',
				type: 'expense',
				recurrence: 'annual_distributed',
				category: 'Leisure',
				baseAmount: 1200,
				monthlyOverrides: {},
				notes: ''
			},
			{
				id: nanoid(),
				name: 'Christmas Gifts',
				type: 'expense',
				recurrence: 'single',
				category: 'Leisure',
				baseAmount: 300,
				month: 11,
				monthlyOverrides: {},
				notes: ''
			}
		]
	};
}
