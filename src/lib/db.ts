import Dexie, { type Table } from 'dexie';
import type { Budget } from './types';

class AllocaDB extends Dexie {
	budgets!: Table<Budget, string>;

	constructor() {
		super('alloca');
		this.version(1).stores({
			budgets: 'id, year'
		});
	}
}

export const db = new AllocaDB();

export async function loadBudget(): Promise<Budget | null> {
	const all = await db.budgets.toArray();
	return all[0] ?? null;
}

export async function saveBudget(budget: Budget): Promise<void> {
	await db.budgets.put(budget);
}

export async function replaceBudget(budget: Budget): Promise<void> {
	await db.budgets.clear();
	await db.budgets.put(budget);
}
