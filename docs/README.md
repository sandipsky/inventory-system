# Inventory System — Implementation Guide

These documents describe the Inventory System well enough to build it again from scratch: what it does for the business, how the data is laid out, and how each feature was thought through and implemented. They explain the logic and the flows in plain English and pseudocode; they do not repeat the code.

Every document exists twice: as Markdown (`.md`, readable on GitHub and in any editor) and as a Word file (`.docx`) next to it.

## How to read

1. **`BRD.md`** — the Business Requirements Document. What the system does and why, the key ideas (batches, documents, journals, amounts due), the business flows, every business rule, the permissions, the screens, and the database with ER diagrams and a table-by-table description. Start here.
2. **`backend/backend-setup.md`** — how the API server is set up, its folder structure, conventions, and the order to build it.
3. **`frontend/frontend-setup.md`** — the same for the web app.
4. The **feature documents**, one folder per feature, each with: what it is, where the code lives, the data and API it uses, how each operation works (idea, pseudocode, rules), design decisions and gotchas, and a build order.

## Backend documents (`backend/`)

| Folder | Document | Covers |
|---|---|---|
| | `backend-setup.md` | Setup, structure, conventions, build order |
| `common/` | `common.md` | Shared pieces: responses, errors, paging and filters, money, line checks, BS dates, dropdowns, startup |
| `auth-security/` | `auth-security.md` | Login, JWT, request filter, permission checks, account locking, change password |
| `users-roles/` | `users-roles.md` | Users with profile pictures, roles and operations |
| `masters/` | `masters.md` | Units, categories, packings, tax types |
| `products/` | `products.md` | Products, bonus rules, batches, stock info |
| `parties/` | `parties.md` | Vendors and customers and their accounts |
| `purchase/` | `purchase.md` | Purchase entry and purchase return |
| `sales/` | `sales.md` | Sales entry and sales return, cancelling |
| `inventory/` | `inventory.md` | Opening stock, stock adjustment, stock edit |
| `accounting/` | `accounting.md` | Chart of accounts, manual journals, opening balance |
| `payments/` | `payments.md` | Payments, invoice settlement, amounts due, payment adjustment |
| `reports/` | `reports.md` | Every report |
| `dashboard/` | `dashboard.md` | Every dashboard figure |
| `notifications/` | `notifications.md` | Notifications, the WebSocket, low-stock alerts |
| `export-print/` | `export-print.md` | Excel exports and PDF prints |
| `settings/` | `settings.md` | Configuration and document numbering |

## Frontend documents (`frontend/`)

| Folder | Document | Covers |
|---|---|---|
| | `frontend-setup.md` | Setup, structure, conventions, build order |
| `auth/` | `auth.md` | Token handling, guards, interceptor, login, change password |
| `layout/` | `layout.md` | Shell, sidebar, header, notification bell, range print, profile menu |
| `shared/` | `shared.md` | Shared components, services, utilities; the list page and drawer form patterns; totals arithmetic |
| `masters/` | `masters.md` | Units, categories, packings, tax types |
| `products/` | `products.md` | Product list and form |
| `parties/` | `parties.md` | Vendors and customers |
| `purchase/` | `purchase.md` | Purchase entry and purchase return pages |
| `sales/` | `sales.md` | Sales entry and sales return pages |
| `inventory/` | `inventory.md` | Opening stock, stock adjustment, stock edit |
| `accounting/` | `accounting.md` | Chart of accounts, journal entries, opening balance |
| `payments/` | `payments.md` | Payments and payment adjustments |
| `reports/` | `reports.md` | Reports page, report view, ledger |
| `dashboard/` | `dashboard.md` | Dashboard cards and the chart |
| `user-roles/` | `user-roles.md` | Users and roles |
| `settings/` | `settings.md` | Configuration and document numbering |

## Other references in the repository

- `backend/endpoints.md` — every API call with example requests and responses.
- `backend/database.sql` — the schema and the starting data.
- `CLAUDE.md` — the short conventions summary used while developing.

## Regenerating the Word files

The `.docx` files are generated from the `.md` files with the scripts in `docs/tools/` (Node.js 20 or newer; Mermaid diagrams are rendered with headless Google Chrome, which must be installed):

```
cd docs/tools
npm install
node build-docx.js                      # converts every .md under docs/ to .docx next to it
node build-docx.js ../BRD.md            # or just the files named
```

The diagram renderer loads the Mermaid library from a CDN, so it needs internet access, unless the environment variable `MERMAID_JS` points to a local copy of `mermaid.min.js`. Chrome is found as `google-chrome-stable`; set `CHROME_BIN` to use another binary.
