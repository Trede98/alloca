# Changelog

All notable changes to this project will be documented in this file.

The format is based on manual semantic versioning.

---

## v0.1.0 - 2026-05-17

### 🚀 Features

- Zero-based budgeting engine: income − expenses − savings = 0 per month
- 12-month grid with per-month balance state (green/red)
- Three entry recurrence types: monthly recurring, single-month, annual distributed
- Per-month overrides for recurring and annual entries without affecting other months
- Category grouping with collapsible sections in the entry list
- Category manager: create, rename, delete custom categories
- Year recap view with annual totals and balance
- JSON import / export with Zod validation and confirm dialog
- Dark / light theme toggle, persisted to localStorage
- Multi-currency support (ISO 4217, configurable via export/import)
- Per-month notes with inline editing
- Onboarding welcome dialog with optional guided tour
- Full i18n via Paraglide: English, Italian, French, Spanish, German
- Local-first persistence via Dexie (IndexedDB) — no backend, no auth
- Animated loading screen and empty-state guidance
- Responsive layout with mobile back navigation
