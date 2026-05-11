# 04 — Import / Export & Final Polish

## Summary

Completed the final feature set: JSON import/export with Zod validation and confirm dialog, dark/light theme toggle (persisted to localStorage), currency formatting threaded through all components, collapsible categories in EntryList, per-month notes in the budget model, responsive mobile layout improvements, polished empty states, and an animated loading screen.

## Key Decisions

- **Theme as module-level $state** — `src/lib/theme.ts` holds a reactive `theme` variable and writes `data-theme` attribute to `<html>`. Persists in `localStorage`. No store needed — CSR-only app.
- **Light theme via `[data-theme="light"]`** — both themes defined in `app.css` with CSS custom properties. Zero JS runtime cost to switch; just swap one attribute.
- **`monthlyNotes: Record<number, string>`** added to `Budget` — keyed by month index 0–11. Inline edit in month detail panel with Save/Cancel. `setMonthNote` mutation in `budget.ts`.
- **`currency: string` (ISO 4217)** added to `Budget`. All `formatCurrency` calls now pass `budget.currency`. Default `'EUR'`.
- **Collapsible categories** — `EntryList` groups entries by `category`, sorts alphabetically, tracks collapsed state with a local `Set<string>`. Chevron rotates on collapse.
- **Import confirmation dialog** — `ImportExportMenu` sets a `pending: Budget | null` state; only calls `replaceBudget` after user confirms. First Zod error message is shown with path.
- **Legacy migration** — `+page.svelte` patches missing `currency`/`monthlyNotes` on load so old IndexedDB budgets don't break.
- **Removed `CategoryTag.svelte`** — no longer rendered in `EntryRow`; deleted to avoid dead code.
- **`onBudgetChange` prop on BudgetDashboard** — used by note commits, so notes autosave without going through `onUpdateEntry`.

## Data Model Changes

```ts
interface Budget {
  // added:
  currency: string;                     // ISO 4217, default 'EUR'
  monthlyNotes: Record<number, string>; // 0-11 → text
}
```

Zod schemas updated to match with `.default()` fallbacks for backwards compatibility.

## File Map

| File | Change |
|---|---|
| `src/lib/types.ts` | Added `currency`, `monthlyNotes` to `Budget` |
| `src/lib/schemas.ts` | Added `currency` (default 'EUR'), `monthlyNotes` (default {}) |
| `src/lib/budget.ts` | Added `setMonthNote` mutation |
| `src/lib/format.ts` | `formatCurrency` accepts optional `currency` arg; added `MONTH_NAMES_FULL` |
| `src/lib/theme.ts` | New — module-level theme state + toggle |
| `src/lib/seed.ts` | Added `currency: 'EUR'`, `monthlyNotes: {}` |
| `src/app.css` | Added `[data-theme="light"]` vars, scrollbar styles, `--color-surface2`, `--shadow` |
| `src/routes/+layout.svelte` | Applies persisted theme on hydration |
| `src/routes/+page.svelte` | Added `onBudgetChange`, legacy migration, animated loading screen |
| `src/lib/components/BudgetDashboard.svelte` | Dark mode toggle button, monthly note panel, `onBudgetChange`, mobile back button, responsive sidebar width, max-width container |
| `src/lib/components/SummaryBar.svelte` | `currency` prop |
| `src/lib/components/MonthCard.svelte` | `currency` prop, ring on selected |
| `src/lib/components/BalanceBadge.svelte` | Optional `currency` prop (default EUR) |
| `src/lib/components/EntryList.svelte` | `currency` prop, collapsible categories, improved empty state |
| `src/lib/components/EntryRow.svelte` | `currency` prop, notes indicator, styled recurrence badge, `invisible` instead of `hidden` for action buttons |
| `src/lib/components/EntryDialog.svelte` | Rounded-xl corners, error pill, removed autofocus |
| `src/lib/components/ImportExportMenu.svelte` | Pending import confirmation dialog, detailed Zod error message |
| `src/lib/components/CategoryTag.svelte` | **Deleted** — unused |

## Constraints

- `theme.ts` uses `$state` at module level — safe because the app is CSR-only (`ssr = false`)
- `setMonthNote` is the only way to modify `monthlyNotes` — keeps mutations consistent
- `currency` field is read-only at runtime (no UI to change it yet) — it can be set manually in the exported JSON
- `onBudgetChange` must be wired in `+page.svelte` for note edits to autosave
- Legacy budgets without `currency`/`monthlyNotes` are patched on load in `+page.svelte`, not in the DB layer
