# Alloca

A local-first annual budgeting single-page application built with SvelteKit. No backend, no account, no sync — your data stays in the browser.

## What it does

Zero-based budgeting across 12 months. Every month must satisfy:

```
Income − Expenses − Savings = 0
```

Each entry is one of three types:

- **Monthly recurring** — appears in all 12 months, overridable per month
- **Single month** — one-time event in a specific month
- **Annual distributed** — yearly amount split evenly across 12 months, overridable per month

The dashboard shows a year summary and a month grid. Clicking a month opens a detail panel with inline-editable entries grouped by category.

Data is persisted automatically to IndexedDB via Dexie. Export and import as JSON.

## Stack

- SvelteKit + Svelte 5 (runes mode)
- TypeScript
- TailwindCSS v4
- Dexie (IndexedDB)
- Zod (import validation)
- `@sveltejs/adapter-static` — pure SPA, no SSR

## Requirements

- Node.js 18 or later
- npm

## Setup

```sh
git clone git@github.com:Trede98/alloca.git alloca
cd alloca
npm install
```

## Running locally

```sh
npm run dev
```

Opens at `http://localhost:5173`. The app seeds a demo budget on first load if IndexedDB is empty.

## Type checking

```sh
npm run check
```

## Building for production

```sh
npm run build
```

Output goes to `build/`. The result is a static site — serve it from any CDN or static host (Netlify, Vercel static, GitHub Pages, nginx, etc.).

## Previewing the production build

```sh
npm run preview
```

Serves the `build/` folder locally at `http://localhost:4173`.

## Import / Export

Use the Import/Export menu in the app header to:

- **Export** — downloads the current budget as a JSON file
- **Import** — replaces the current budget after Zod validation and a confirmation prompt

The JSON format:

```json
{
  "version": 1,
  "exportedAt": "2026-01-01T00:00:00.000Z",
  "budget": { ... }
}
```

## Project structure

```
src/
  lib/
    budget.ts         # Pure calculation and mutation functions
    db.ts             # Dexie DB + load/save/replace helpers
    types.ts          # TypeScript interfaces
    schemas.ts        # Zod schemas for import validation
    format.ts         # formatCurrency, MONTH_NAMES
    seed.ts           # Demo budget generated on first load
    theme.ts          # Dark/light theme toggle (persisted to localStorage)
    components/
      BudgetDashboard.svelte
      MonthCard.svelte
      EntryList.svelte
      EntryRow.svelte
      EntryDialog.svelte
      SummaryBar.svelte
      ImportExportMenu.svelte
      BalanceBadge.svelte
  routes/
    +layout.ts        # ssr: false
    +layout.svelte
    +page.svelte      # Single route — loads budget, wires autosave
```
