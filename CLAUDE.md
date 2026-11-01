# CLAUDE.md

Inventory and accounting app: a Spring Boot API (`backend/`) and an Angular web app (`frontend/`). Saving a purchase or sale updates stock per batch and posts the accounting journal.

## Commands

**Backend** (`backend/`, runs on http://localhost:8080)

- `./mvnw spring-boot:run` starts it. There is no devtools, so restart after Java changes.
- `./reset.sh` recreates `inventory_system.db` from `database.sql`. **It deletes all data.**
- Login: `admin` / `Admin@123`. Five wrong passwords lock the account for an hour.
- `backend/endpoints.md` is the source of truth for every request and response shape. Read it before calling an endpoint.

**Frontend** (`frontend/`, runs on http://localhost:4200)

- `npm start` serves it; `npx ng build` builds it; `npx ng test --watch=false` runs the Vitest specs.
- `src/app/app.spec.ts` › "should render title" is a stale scaffold test that fails on `main`; ignore it.
- The initial bundle is over the 500 kB warning budget because Lumen ships as one module file: every Lumen component used anywhere lands in the initial chunk.

The user usually has both servers running in their own terminals. Don't kill them.

## Git

Always work on the `main` branch. Don't create feature branches; commits go on `main` and are pushed to `origin/main`.

## Frontend layout

```
src/environments/environment.ts   apiUrl
src/app/auth/                     AuthService, guards, interceptor, login page, auth.testing.ts (spec helpers)
src/app/layout/                   shell: sidebar (menu in sidebar.data.ts), header, profile/notification menus
src/app/features/<module>/        <module>.routes.ts, <module>.model.ts, <module>.service.ts, list + form components
src/app/features/masters/         one list + one form for units, categories, packings, tax types (MASTERS config)
src/app/features/party/           one list + one form for vendors and customers (PARTIES config), routed under /purchase and /sales
src/app/features/accounting/      accounting.routes.ts; account/ (chart of accounts), journal/ (journal-lines.ts + JournalLinesTable, shared with
                                  opening-balance/), payment/ (vendor and customer payments, settlement.ts + InvoiceSettlement), payment-adjustment/
src/app/features/user-roles/      user/ and role/ (role/permissions.ts lays operations out as the permission matrix), routed under /user-roles
src/app/features/settings/        configuration/ (company settings, SETTING_FIELDS picks each one's field) and document-numbering/ (view only)
src/app/shared/components/        list-page-card, invoice-summary-card, summary-card, party-details-card, amount-totals, date-text, calculator, user-avatar, cancel-dialog
src/app/shared/services/          dropdown, product (the /products service, also used by the product pages), product-lookup, breadcrumb
src/app/shared/pipes|utils/       amount, docNo; date, csv, api-error, invoice (totals), options (withMissing, docNoOptions), batch
src/app/shared/styles/            document-form, document-list: the one stylesheet of each kind that all four document forms and lists use;
                                  summary-card: InvoiceSummaryCard and SummaryCard (the same summary without discount fields)
```

## Frontend conventions

- **Lumen UI for everything** (`@lumen-ui/angular`, installed from `lumen-ui-angular-0.1.0.tgz`; read its API in `node_modules/@lumen-ui/angular/types/lumen-ui-angular.d.ts`). Never write a native `<button>`: use `<l-button>` and restyle its inner element with `.myclass ::ng-deep .btn { … }`.
- **Nested SCSS with short plain class names**, never BEM. Modifiers are extra classes (`.item.active`).
- Standalone components, `ChangeDetectionStrategy.OnPush`, signals, `inject()`, `@Service()` for services, `app-` selector prefix.
- Lumen inputs take `[viewMode]` for read-only display; forms bind every field to it instead of building a separate view template.

### Talking to the API

- One service per backend resource, building URLs from `environment.apiUrl`. The `authInterceptor` adds the bearer token; it ends the session on 401 or on any error whose message mentions the JWT.
- JSON fields are snake_case; line-item lists are camelCase (`purchaseEntries`). Purchases send `tax`, sales send `total_tax`.
- Dates are `YYYY-MM-DD` strings. Convert with `shared/utils/date.ts` (`toIsoDate`, `fromIsoDate`); `new Date('YYYY-MM-DD')` parses as UTC and shifts the day. Show dates with `<app-date-text>`, which follows the AD/BS calendar.
- List filters use the entity's camelCase field names (`vendor.name`, `transactionType`); unknown names are silently ignored. Filters match by "contains" on the stored text, so booleans filter as `isActive=1` / `0` (not `true`), and linked records filter by name (`category.name`), since `category.id=1` also matches 10, 11, …. `fromDate`/`toDate` filter the document `date`; the accounts list's `accountType` matches the whole name. Sorting uses entity fields too, so lists map table column keys to sort fields.
- Document numbers come back like `|PE-000001`: display them through the `docNo` pipe, send them back raw.
- The server stores the totals it is sent. Compute them with `calculateInvoice` (`shared/utils/invoice.ts`). `discount` holds what the user typed (a percent or an amount, per `discount_type`); the discount amount is `sub_total − taxable_amount − non_taxable_amount`.
- Show failures with `NotificationService` and `apiErrorMessage(error)`, which reads the backend's `message`.
- Dropdowns come from `DropdownService` (active records). When editing a saved document, merge its own vendor/products into the options so inactive ones still show a label.

### Permissions

- `GET /getUserRoleOperations` gives the user's operations (`ViewPurchaseEntry`, `CreatePurchaseEntry`, …); `AuthService.hasOperation()` checks them.
- Routes declare `data: { operation: 'View…' }` with `canActivate: [permissionGuard]`; sidebar links carry the same operation and are hidden when it isn't granted. Either can be a list, any one of which grants access (Payments: `ViewVendorPayment` or `ViewCustomerPayment`); `hasOperation` takes a list too.
- Gate buttons and row actions on the matching `Create…` / `Edit…` / `Delete…` operation.
- After saving the signed-in user's own role or account, call `AuthService.refreshUser()` so menus and the header follow. Their token names their username, so renaming yourself means logging in again.
- The API deletes a role its users still have (and clears its operations first), after which `GET /users` fails for everyone. Check `UserService.countWithRole` before deleting one.
- Profile pictures (`image_url`) need the auth header; show them with `<app-user-avatar>`, never an `<img src>`.

### List pages

Use the shared card (see `purchase-entry-list` for the full pattern):

```html
<app-list-page-card>
  <app-list-card-title>filters… <l-button card-actions>Add</l-button></app-list-card-title>
  <app-list-card-body><l-table [serverSort]="true" … /></app-list-card-body>
  <app-list-card-footer><l-pagination [(pageIndex)]="pageIndex" [(pageSize)]="pageSize" … /></app-list-card-footer>
</app-list-page-card>
```

Query state lives in signals; a `computed` request feeds `toObservable` + `switchMap`, so rows stay visible while the next page loads.

### Document forms

Add, edit and view open the same form in a near full-screen bottom drawer (`DrawerService`, `position: 'bottom'`, `panelClass: 'drawer-sheet'`, `disableClose: true`), with the mode and id in `DRAWER_DATA`; there are no form routes. Line items are a typed `FormArray` rendered by `l-table` cell templates. Batches: purchases and sales returns type a `batch_no`; sales and purchase returns pick a `batch_id` from `GET /products/stockInfo/{id}` (labelled with `batchOptions`, prefilled with `firstBatch`: earliest expiry in stock). Each form lists `ProductLookup` in its own `providers` to fetch every line product's details and batches once. Products, vendors and customers (`PartyForm`, `data.party` picks the `PARTIES` entry), users (`UserForm`, saved as multipart with an optional picture) and roles (`RoleForm`, with the permission matrix) use this drawer too: the list's name link and View open the read-only form, whose Edit button switches to edit in place.

Sales and sales returns are never edited or deleted, in the UI or the API: their forms only add and view, and a saved one is cancelled instead (`CancelDialog` asks for the reason; `POST /sales/{id}` or `/sales-return/{id}` with `cancel_remarks`, gated on `CancelSalesEntry` / `CancelSalesReturn`). A cancelled document keeps its lines and shows the reason in view mode. A sale can't be cancelled while a sales return names it. Purchase returns stay editable and deletable.

Returns name the document the goods came from: purchase returns a Ref. Purchase (`ref_purchase_id`, options from `GET /dropdown/purchase/{vendorId}`), sales returns a Ref. Invoice (`ref_sales_id`, from `GET /dropdown/sales/{customerId}`, cancelled sales left out). Picking one copies its terms and every line at full quantity, replacing the current lines; picking another party clears it.

### Accounting pages

- **Journal entries** list manual journals only (`GET /journal`); the journals documents post are changed through their documents. The form (bottom drawer) and the **opening balance** page (one record, edited in place like configuration) share `JournalLinesTable`: one debit *or* credit per line (typing one side clears the other), totals with the difference, and `journalLinesProblem` before saving. A blank line narration is sent as the remarks, since the ledger shows line narrations.
- **Payments** are one list and one form for both party types: a Party Type select (`Vendor` / `Customer`) picks the party list and whether invoices due come from `/reports/accounting/payable` or `/receivable`. The form's Payment Type radios (Send / Receive) are the same control under another label, since the API ties direction to party type. A role that can view only one type sees and records only that one. The form has no narration (the API writes one; an edited payment keeps its own while its party stays), no party details card, and the purchase-style SummaryCard. The form's settlement rows (`settlementRows`) show each invoice's due amount; when editing, the payment's own settlements count as available again, since the API reverses them before re-applying. "Settle Oldest First" spreads the amount (`autoSettle`); what isn't settled stays `unadjusted_amount`.
- **Payment adjustments** list payments with an unadjusted amount; Adjust opens a bottom drawer that settles the party's invoices with it (`POST /payment-adjustment/{id}`).

### Master data forms

Units, categories, packings and tax types share `MasterList` and `MasterForm`; the route's `data.master` picks the `MASTERS` entry (path, labels, operations, whether it has a `tax_rate`). Add and edit open in a 350px right drawer (`position: 'right'`, `size: '350px'`) with the row itself in `DRAWER_DATA`, so nothing loads; there is no view mode. The chart of accounts (`AccountList`/`AccountForm`) works the same way in a 400px drawer.

## Checking UI changes

Every page except `/login` needs a real login, so a bare `google-chrome-stable --headless --screenshot` only reaches the login page. To see an app page, drive headless Chrome over the DevTools protocol (Node 24 has a global `WebSocket`): log in through the form, then navigate and take a screenshot. Delete any test records you create in the dev database afterwards.
