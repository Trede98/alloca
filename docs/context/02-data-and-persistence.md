# 02 — Data & Persistence

## Summary

Core budgeting data model and persistence layer complete. Calculation logic was already in place from bootstrap; this phase added entry mutations, validation guards, and autosave wiring.

## Key Decisions

- **Immutable mutations** — every `addEntry`, `updateEntry`, `deleteEntry`, `setOverride`, `removeOverride` returns a new `Budget` object; nothing mutates in place. Keeps Svelte reactivity simple and avoids accidental state sharing.
- **`touch()` helper** — stamps `updatedAt` on every mutation automatically.
- **Autosave via `$effect`** — `+page.svelte` holds the single `budget` state; a `$effect` calls `saveBudget(budget)` on every change. No debounce needed for a small local dataset.
- **Validation in mutations** — `buildEntry` and `updateEntry` throw on invalid input (empty name, negative amount, missing month for single entries). Errors bubble to caller; UI layer handles display.
- **Mutation callbacks threaded through props** — `BudgetDashboard` receives all five handlers as typed props. Keeps single source of truth in `+page.svelte`, avoids global stores.

## Data Model Changes

No new types. Added exported interface `NewEntryInput` in `budget.ts` for `addEntry`/`buildEntry` input.

```ts
export interface NewEntryInput {
  name: string;
  type: EntryType;
  recurrence: Recurrence;
  category: string;
  baseAmount: number;
  month?: number;
  notes?: string;
}
```

## File Map

| File | Change |
|------|--------|
| `src/lib/budget.ts` | Added `buildEntry`, `addEntry`, `updateEntry`, `deleteEntry`, `setOverride`, `removeOverride`, `isBalanced`, `touch`. Added `NewEntryInput` export. |
| `src/routes/+page.svelte` | Added `$effect` autosave; added five mutation handler functions; passes them to `BudgetDashboard`. |
| `src/lib/components/BudgetDashboard.svelte` | Updated `$props()` to accept and type all five mutation callbacks. |
| `src/lib/index.ts` | Unchanged (re-exports everything from `budget.ts`). |

## Constraints

- `budget` state lives only in `+page.svelte` — do not lift to a global store
- All mutations return new `Budget` objects — never mutate entries array in place
- `saveBudget` is called by `$effect` automatically — UI code must never call it directly
- `balance = incomeTotal - expenseTotal - savingsTotal` — no other formula valid
- Validation errors throw `Error` — UI layer wraps calls in try/catch for user feedback
