# 01 — Bootstrap

## Summary

Full project foundation bootstrapped: SvelteKit + Svelte 5 runes + TypeScript + TailwindCSS v4 + static adapter (SPA mode). All allowed dependencies installed. Core types, Dexie persistence, budget calculation logic, Zod schemas, seed data, and initial component shell created.

## Key Decisions

- `@sveltejs/adapter-static` with `fallback: index.html` for SPA/client-side-only mode
- `ssr: false` in `+layout.ts` to disable all SSR
- TailwindCSS v4 via `@tailwindcss/vite` plugin (no config file needed)
- CSS custom properties for theming instead of Tailwind config tokens
- Seed budget auto-created on first load if IndexedDB is empty

## Data Model Changes

```ts
type EntryType = 'income' | 'expense' | 'savings'
type Recurrence = 'monthly' | 'single' | 'annual_distributed'

interface Entry {
  id: string
  name: string
  type: EntryType
  recurrence: Recurrence
  category: string
  baseAmount: number
  month?: number          // 0–11, only for 'single'
  monthlyOverrides: Record<number, number>
  notes?: string
}

interface Budget {
  id: string
  name: string
  year: number
  entries: Entry[]
  createdAt: string
  updatedAt: string
}

interface MonthSummary {
  month: number
  incomeTotal: number
  expenseTotal: number
  savingsTotal: number
  balance: number         // incomeTotal - expenseTotal - savingsTotal
}

interface YearSummary {
  incomeTotal: number
  expenseTotal: number
  savingsTotal: number
  yearlyBalance: number
}

interface ExportData {
  version: number
  exportedAt: string
  budget: Budget
}
```

## File Map

| File | Role |
|------|------|
| `src/app.css` | TailwindCSS v4 import + CSS custom property theme |
| `src/lib/types.ts` | All TypeScript interfaces |
| `src/lib/db.ts` | Dexie DB class + `loadBudget`, `saveBudget`, `replaceBudget` |
| `src/lib/budget.ts` | Pure calc: `getMonthAmount`, `computeMonthSummary`, `computeYearSummary`, `getAllMonthSummaries` |
| `src/lib/format.ts` | `formatCurrency`, `MONTH_NAMES` |
| `src/lib/schemas.ts` | Zod schemas for import validation (`ExportDataSchema`) |
| `src/lib/seed.ts` | `createSeedBudget()` — 10-entry demo budget |
| `src/lib/components/BudgetDashboard.svelte` | Top-level layout: year summary + 12-month grid |
| `src/lib/components/MonthCard.svelte` | Single month tile with totals and balance badge |
| `src/lib/components/SummaryBar.svelte` | Year-level income/expense/savings/balance bar |
| `src/lib/components/BalanceBadge.svelte` | Green/red badge based on balance value |
| `src/lib/components/CategoryTag.svelte` | Inline category label chip |
| `src/routes/+layout.ts` | `ssr: false`, `prerender: false` |
| `src/routes/+layout.svelte` | Imports `app.css`, renders `children` |
| `src/routes/+page.svelte` | Loads/seeds budget from Dexie, renders BudgetDashboard |
| `svelte.config.js` | Static adapter, runes mode enforced |
| `vite.config.ts` | `@tailwindcss/vite` + `sveltekit` plugins |

## Constraints

- No SSR anywhere — IndexedDB is browser-only
- Exactly one budget in DB at all times
- `balance = incomeTotal - expenseTotal - savingsTotal` is the only valid formula
- No service layers, repositories, managers, or factories
- All dependencies must come from the allowed list in `CLAUDE.md`
- Components listed in `CLAUDE.md` are the canonical set — do not add layers
