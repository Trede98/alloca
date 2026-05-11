import { z } from 'zod';

const EntrySchema = z.object({
	id: z.string(),
	name: z.string().min(1),
	type: z.enum(['income', 'expense', 'savings']),
	recurrence: z.enum(['monthly', 'single', 'annual_distributed']),
	category: z.string(),
	baseAmount: z.number(),
	month: z.number().min(0).max(11).optional(),
	monthlyOverrides: z.record(z.string(), z.number()),
	notes: z.string().optional()
});

const BudgetSchema = z.object({
	id: z.string(),
	name: z.string().min(1),
	year: z.number().int(),
	currency: z.string().default('EUR'),
	entries: z.array(EntrySchema),
	monthlyNotes: z.record(z.string(), z.string()).default({}),
	createdAt: z.string(),
	updatedAt: z.string()
});

export const ExportDataSchema = z.object({
	version: z.number().int(),
	exportedAt: z.string(),
	budget: BudgetSchema
});
