# CLAUDE.md

## Project Overview

This is a local-first **Annual Budgeting SPA**.

Stack:

- SvelteKit
- Svelte 5
- TypeScript
- TailwindCSS v4
- Bits UI
- Dexie (IndexedDB)
- Zod
- No backend
- No authentication

Single-user, single-budget application.

---

## Project Configuration

- **Language**: TypeScript
- **Package Manager**: npm
- **Add-ons**: none

---

# CORE PRINCIPLE

This is a **zero-based budgeting system**.

Each month must satisfy:

Income - Expenses - Savings = 0

The system must always show:

- income total
- expense total
- savings total
- final balance

A month is:

- GREEN → balanced (0)
- RED → unbalanced

---

# BUDGET STRUCTURE (STRICT)

There is exactly ONE active budget containing 12 months.

Each month contains entries:

- income
- expense
- savings

---

# ENTRY TYPES (STRICT BEHAVIOR)

## 1. Monthly Recurring Entry

- exists in all 12 months
- has default value
- can be overridden per month independently
- overrides do NOT affect other months

---

## 2. Single Month Entry

- exists only in one month
- one-time event

---

## 3. Annual Distributed Entry

- user enters yearly amount
- system distributes evenly across 12 months
- user can override monthly values
- overrides do NOT auto-rebalance

---

# ENTRY MODEL

Each entry includes:

- id (stable unique)
- name
- type: income | expense | savings
- recurrence: monthly | single | annual_distributed
- category (string)
- baseAmount (number)
- month (optional)
- monthlyOverrides: Record<number, number>
- notes (optional)

---

# CALCULATION RULES (ABSOLUTE)

For each month:

1. start from base entries
2. apply recurrence rules
3. apply overrides
4. compute:

incomeTotal
expenseTotal
savingsTotal

Final formula:

balance = incomeTotal - expenseTotal - savingsTotal

No hidden logic allowed.

---

# CATEGORIES

Categories are ONLY for UI grouping.

They do NOT affect calculations.

Examples:

- Housing
- Food
- Transport
- Health
- Savings
- Leisure

---

# UI RULES

Single-page application only.

Must include:

## Year Summary

- total income
- total expenses
- total savings
- yearly balance

## 12-Month Grid

Each month shows:

- totals
- balance state

States:

- GREEN → balanced
- RED → unbalanced

Interaction rules:

- inline editing preferred
- minimal dialogs
- fast entry creation
- duplicate entry support

---

# PERSISTENCE (DEXIE)

Rules:

- autosave on every change
- restore full state on load
- single budget only
- no backend
- no sync

---

# IMPORT / EXPORT

Format:

{
version: number,
exportedAt: string,
budget: Budget
}

Rules:

- validate with Zod
- reject invalid data
- full replacement on import

---

# STATE RULES

- ONE source of truth: budget object
- everything else is derived
- avoid global stores unless necessary
- prefer local component state

---

# PERFORMANCE RULES

Assume small dataset.

Optimize for:

- simplicity
- readability
- correctness

Avoid premature optimization.

---

# CODING RULES

- TypeScript everywhere
- explicit types preferred
- small pure functions
- readable naming
- early returns
- avoid clever code

---

# I18N (PARAGLIDE)

This project uses Paraglide for internationalization.

Supported locales: `en`, `it`, `fr`, `es`, `de` (base: `en`).

## Message Files

- Source messages: `/messages/{locale}.json`
- Compiled output: `/src/lib/paraglide/messages/` (auto-generated, do not edit)

## Usage Pattern

Always import messages from the generated index:

```ts
import * as m from '$lib/paraglide/messages'
```

Call each message as a function:

```ts
m.loading()                                        // no params
m.entry_dialog_create_category({ name: 'Food' })  // with params
```

To read the current locale:

```ts
import { getLocale } from '$lib/paraglide/runtime'
```

## Rules

- NEVER hardcode user-visible strings in components — always use a message function
- NEW strings must be added to ALL locale files (`en.json`, `it.json`, `fr.json`, `es.json`, `de.json`)
- Key naming: `snake_case`, prefixed by feature area (e.g. `entry_dialog_name`, `month_card_balance`)
- Do NOT import files from `/messages/*.json` directly
- Do NOT edit files under `/src/lib/paraglide/` — they are auto-generated

---

# BITSUI COMPONENT LIBRARY

Use BitsUI headless components whenever a built-in HTML element is insufficient.

Reference documentation: `/docs/implementation-specs/bits-ui-llms.md`

## Component Inventory (currently used)

| Component    | Used in                                     |
|--------------|---------------------------------------------|
| Dialog       | EntryDialog, CategoryManager, WelcomeDialog |
| AlertDialog  | ImportExportMenu                            |
| Combobox     | EntryDialog (category picker)               |
| Collapsible  | EntryList, YearRecap                        |
| DropdownMenu | EntryRow                                    |
| ContextMenu  | EntryRow                                    |
| Popover      | BudgetDashboard (settings)                  |
| Switch       | BudgetDashboard                             |

## Usage Pattern

```svelte
<script>
  import { Dialog } from 'bits-ui'
</script>

<Dialog.Root>
  <Dialog.Trigger>Open</Dialog.Trigger>
  <Dialog.Portal>
    <Dialog.Overlay />
    <Dialog.Content>
      <Dialog.Title>Title</Dialog.Title>
      <Dialog.Close>Close</Dialog.Close>
    </Dialog.Content>
  </Dialog.Portal>
</Dialog.Root>
```

## Rules

- PREFER BitsUI over raw HTML for interactive elements (menus, dialogs, selects, toggles, etc.)
- Check `/docs/implementation-specs/bits-ui-llms.md` for the component API before implementing from scratch
- ALL styling via Tailwind classes and CSS variables — never use BitsUI built-in theme classes
- Use `data-*` attributes (`data-highlighted`, `data-disabled`, `data-state`) for interactive state styling
- Use `.Portal` for overlays to avoid z-index/stacking context issues
- Do NOT wrap BitsUI components in extra abstraction layers — use them directly

---

# CSS TOKENS & TAILWIND CLASSES RULE

## Rule: No `var(--)` in Inline Style Attributes

**Never** use `style="... var(--token) ..."` or `style:property="... var(--token) ..."` in Svelte components.

Everything must go through Tailwind utility classes.

## How Design Tokens Work

Tailwind v4 auto-generates utility classes from `@theme` tokens in `src/app.css`:
- `--color-X` → `bg-X`, `text-X`, `border-X`, `ring-X`
- `--radius-X` → `rounded-X`

## How to Add a New Design Token

When an existing utility doesn't cover a needed value:

1. Add the token to the `@theme {}` block in `src/app.css`
2. Add the same token to `[data-theme="dark"] {}`
3. Add the same token to `[data-theme="light"] {}`
4. Use the generated utility class in components

Tokens using `color-mix()` that reference other `--color-*` tokens resolve correctly per theme automatically, because the referenced base tokens are already overridden in each `[data-theme]` block.

## When to Add a Token vs Use an Existing One

**Reuse an existing token** if the value is already in `@theme`.

**Add a new token** when:
- You need a tinted variant of a semantic color (e.g., `--color-red-subtle`)
- The value must adapt between dark/light themes
- The value is used in more than one place

**Do not** add a token for a truly one-off static value — use a Tailwind arbitrary value (`bg-[#f00]`) only if non-semantic.

## Conditional Styling in Svelte

Use `class:` directives instead of `style:` ternaries:

```svelte
<!-- Good -->
class:bg-accent-tint={isSelected}
class:bg-surface={!isSelected}
class:border-accent={isSelected}
class:border-border={!isSelected}

<!-- Bad -->
style:background-color={isSelected ? 'var(--color-accent)' : undefined}
```

## The Only Allowed `style:` Exception

Dynamic geometric transforms with runtime-computed values are the sole exception:

```svelte
<!-- OK: value depends on runtime state, no static Tailwind class covers it -->
style:transform={isDark ? 'translateX(16px)' : 'translateX(0px)'}
```

Everything else — colors, backgrounds, borders, opacity — must be a Tailwind utility class.

---

# CONSTANTS & MAGIC STRINGS RULE

Never use raw string or number literals for domain values.

**Why:** Magic strings scatter the source of truth. A typo is a silent runtime bug. TypeScript cannot catch `'expnese'` in a comparison — but referencing `ENTRY_TYPE.EXPENSE` will fail at compile time if the constant is mistyped.

**Rule:**

- All domain-literal values MUST be defined in `src/lib/constants.ts`
- `EntryType` and `Recurrence` types MUST be derived from those constant arrays (`ENTRY_TYPES`, `RECURRENCES`)
- `z.enum(...)` in `schemas.ts` MUST reference the constant arrays, not inline literals
- Components compare values using imported constants, not raw strings
- Magic numbers (`12` months, `11` for December index) MUST use named constants (`MONTHS_PER_YEAR`)
- Select `<option>` elements for typed domain values MUST loop over the constant arrays with label maps (`ENTRY_TYPE_LABELS`, `RECURRENCE_LABELS`) — never hardcode individual `<option>` tags

**Typed errors — no exceptions:**

Domain error codes MUST be defined in `src/lib/errors.ts` as `BUDGET_ERROR` constants. Always throw `new BudgetError(BUDGET_ERROR.X)` — never `new Error('some_string_code')`. Catch sites check `e instanceof BudgetError` and resolve the label via `BUDGET_ERROR_LABELS[e.code]()`. Adding a new error type only requires touching `errors.ts`.

**No magic strings anywhere. Period.**

---

# COMPONENT RULES

Keep components minimal:

- BudgetDashboard
- MonthCard
- EntryList
- EntryRow
- EntryDialog
- SummaryBar
- ImportExportMenu
- BalanceBadge
- CategoryTag

NO:

- service layers
- repositories
- managers
- factories
- enterprise architecture patterns

---

# DEPENDENCIES (ALLOWED ONLY)

- svelte
- @sveltejs/kit
- tailwindcss
- bits-ui
- dexie
- zod
- date-fns
- nanoid
- lucide-svelte
- clsx
- tailwind-merge

Do NOT add extra dependencies without justification.

---

# CRITICAL: ANTI-OVERENGINEERING RULE

If Claude introduces:

- services
- repositories
- managers
- factories
- providers
- dependency injection
- layered architecture

STOP immediately.

Replace with:

- direct functions
- simple modules
- local state
- direct imports

This is a small SPA, not a platform.

---

# CONTEXT SNAPSHOT SYSTEM (IMPORTANT)

After each completed phase, Claude must generate a Context Snapshot.

Snapshots replace chat history.

Claude must rely ONLY on:

- code
- CLAUDE.md
- snapshot files

NOT chat memory.

---

## Snapshot Location

/docs/context/

---

## Snapshot Naming

NN-phase-name.md

Examples:

- 01-bootstrap.md
- 02-domain-model.md
- 03-persistence.md
- 04-ui.md
- 05-import-export.md

---

## Snapshot Content Format

Each snapshot includes:

### 1. Summary

What was built.

### 2. Key Decisions

Architectural decisions and tradeoffs.

### 3. Data Model Changes

Types/interfaces introduced.

### 4. File Map

Created/modified files.

### 5. Constraints

Rules future work must respect.

Keep concise.

---

# CONTEXT INDEX (MANDATORY)

## Context Index

- /docs/context/01-bootstrap.md ✓
- /docs/context/02-data-and-persistence.md ✓
- /docs/context/03-ui.md ✓
- /docs/context/04-import-export-polish.md ✓

Must be updated after each snapshot.

---

# CONTEXT RULE (STATELESS MODE)

Claude must assume:

- previous chats do NOT exist
- only repository files are valid memory
- snapshots are the only historical reasoning record

If it is not in code or snapshots → it is unknown.

---

# SNAPSHOT CONFIRMATION FLOW (IMPORTANT)

Claude MUST follow this process:

## STEP 1 — PREPARE SNAPSHOT

Prepare full snapshot content but DO NOT write file.

## STEP 2 — USER CONFIRMATION

Ask:

"I am about to create a Context Snapshot for this phase.
Do you want me to proceed or adjust anything first?"

## STEP 3 — USER FEEDBACK LOOP

If user requests changes:

- apply changes
- re-check implementation
- re-prepare snapshot

## STEP 4 — FINAL WRITE

Only write snapshot after explicit approval.

Also update Context Index.

---

# WORKFLOW RULE

After each implementation step:

1. implement feature
2. run typecheck
3. run build
4. fix errors immediately
5. if phase complete → trigger snapshot flow

Never leave broken state.

---

# COMMUNICATION RULE

Be concise.

Do not over-explain.

Prefer:

- implementation
- short summary
- move forward

---

# FINAL GOAL

A minimal, fast, maintainable budgeting SPA with:

- correct zero-based logic
- simple architecture
- predictable behavior
- no overengineering
