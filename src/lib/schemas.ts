import { z } from 'zod';
import { ENTRY_TYPES, RECURRENCES } from './constants';

const CategorySchema = z.object({
	id: z.string(),
	name: z.string().min(1)
});

const EntrySchema = z.object({
	id: z.string(),
	name: z.string().min(1),
	type: z.enum(ENTRY_TYPES),
	recurrence: z.enum(RECURRENCES),
	category: z.string(),
	baseAmount: z.number(),
	month: z.number().min(0).max(11).optional(),
	monthlyOverrides: z.record(z.string(), z.number()),
	monthlySkips: z.array(z.number()).default([]),
	notes: z.string().optional()
});

const BudgetSchema = z.object({
	id: z.string(),
	name: z.string().min(1),
	year: z.number().int(),
	currency: z.string().default('EUR'),
	entries: z.array(EntrySchema),
	categories: z.array(CategorySchema).default([]),
	monthlyNotes: z.record(z.string(), z.string()).default({}),
	createdAt: z.string(),
	updatedAt: z.string()
});

export const ExportDataSchema = z.object({
	version: z.number().int(),
	exportedAt: z.string(),
	budget: BudgetSchema
});
