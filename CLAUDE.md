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
