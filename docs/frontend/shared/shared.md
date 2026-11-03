# Shared toolkit — Frontend

> Part of the Inventory System implementation guide. Read `docs/BRD.md` for the business picture and `docs/frontend/frontend-setup.md` for how the web app is organised.

## 1. What this is

The pieces every feature page is built from: the page-height list card, the document summary cards, date display in AD or BS, the dropdown and product services, file downloads, the invoice arithmetic, date and batch helpers, and the three stylesheets all document lists and forms share. This doc also describes the **two page patterns** (list page, drawer form) once, so the feature docs can say "a list page" and "a drawer form" without repeating them. The purchase entry page is used as the example; the purchase doc covers purchase itself.

## 2. Where the code lives

All of it is under `frontend/src/app/shared/`.

| Folder / file | What is in it |
|---|---|
| `components/list-page-card/` | `ListPageCard` + `ListCardTitle` + `ListCardBody` + `ListCardFooter` (`LIST_PAGE_CARD` imports all four) |
| `components/invoice-summary-card/` | `InvoiceSummaryCard`: the totals block of purchase / sales documents with the discount controls |
| `components/summary-card/` | `SummaryCard`: the same look, read-only `SummaryItem[]` (payments) |
| `components/amount-totals/` | `AmountTotals`: a right-aligned row of totals under a table (journal debit / credit) |
| `components/party-details-card/` | `PartyDetailsCard`: registration, address, contact and the document number chip |
| `components/date-text/` | `DateText`: an API date shown in AD or BS |
| `components/calculator/` | `Calculator`: four-function calculator opened from the header |
| `components/user-avatar/` | `UserAvatar`: a user's picture fetched with the auth header, or initials |
| `components/cancel-dialog/` | `CancelDialog`: asks the reason, then cancels a sale or sales return |
| `services/dropdown.service.ts` | `DropdownService`: every `GET /dropdown/...` |
| `services/product.service.ts` | `ProductService`: `/products`, `stockInfo`, `exportList` |
| `services/product-lookup.ts` | `ProductLookup`: per-form cache of product details and batches |
| `services/breadcrumb.service.ts` | `BreadcrumbService` (described in the layout doc) |
| `services/file.service.ts` | `FileService.download(url, params)`: GET a Blob and save it |
| `services/file-downloads.ts` | `FileDownloads`: a page's Print / Export state |
| `pipes/amount.pipe.ts`, `pipes/doc-no.pipe.ts` | `amount`, `docNo` |
| `utils/invoice.ts` | `round2`, `lineAmount`, `calculateInvoice` |
| `utils/date.ts` | `startOfToday`, `toIsoDate`, `fromIsoDate` |
| `utils/batch.ts` | `batchName`, `isExpired`, `batchOptions`, `firstBatch` |
| `utils/options.ts` | `withMissing`, `docNoOptions` |
| `utils/file.ts` | `FileFormat`, `saveFile` |
| `utils/api-error.ts` | `apiErrorMessage` |
| `utils/password.ts` | `STRONG_PASSWORD` |
| `models/api.model.ts` | `Page<T>`, `ApiResponse`, `DropdownItem`, `ListParams` |
| `models/invoice.model.ts` | `DiscountType`, `TransactionType`, `TRANSACTION_TYPES`, `InvoiceSummary`, `InvoiceLineAmount` |
| `models/product.model.ts` | `Product`, `BatchStock`, `BonusInfo`, `ProductDetail`, `ProductPayload` |
| `styles/document-form.scss`, `document-list.scss`, `summary-card.scss` | The stylesheets the document pages share |

## 3. What it provides

### 3.1 The three UI conventions

- **Lumen UI for everything.** Inputs, selects, tables, drawers, modals, menus, notifications all come from `@lumen-ui/angular` (API in `node_modules/@lumen-ui/angular/types/lumen-ui-angular.d.ts`). Never write a native `<button>`: use `<l-button>` and restyle its inner element with `.myclass ::ng-deep .btn { … }` (see `.link ::ng-deep .btn` in `document-list.scss`).
- **Nested SCSS with short plain class names**, never BEM. A block (`.form-drawer`) nests its parts (`.head`, `.body`, `.foot`); modifiers are extra classes (`.item.active`, `.fields.view`).
- **`[viewMode]` for read-only forms.** Every Lumen input takes `[viewMode]="readonly()"`, which renders the value as text. Forms bind every field to it instead of keeping a separate view template, so view and edit are one component and one set of bindings.

Also: standalone components, `ChangeDetectionStrategy.OnPush`, signals, `inject()`, `@Service()` for services (`@Service({ autoProvided: false })` for the ones a page provides itself), `app-` selectors.

### 3.2 Components

| Component | Inputs / slots | Notes |
|---|---|---|
| `app-list-page-card` | content `app-list-card-title`, `app-list-card-body`, `app-list-card-footer` | A `padding="none"` Lumen card filling the page height. The title row puts plain content left and anything marked `card-actions` right; the body scrolls an `l-table` under a sticky header; the footer holds the `l-pagination` |
| `app-invoice-summary-card` | `summary: InvoiceSummary`, `discountType: FormControl<DiscountType>`, `discount: FormControl<number \| null>`, `readonly` | Gross, Discount Type select, Discount (`%` or amount; label and suffix follow the type), Non Taxable, Rounding, Taxable, Tax, Net. A hint shows the computed discount amount when the type is Percentage |
| `app-summary-card` | `title`, `items: SummaryItem[]` (`label`, `value`, `net?`, `error?`), `readonly` | Same grid, no inputs |
| `app-amount-totals` | `items: AmountTotal[]` (`label`, `value`, `error?`), `readonly` | A `<dl>` of totals; `error` turns a figure red |
| `app-party-details-card` | `title`, `party: PartyDetails \| null` (`registration_number`, `address`, `contact`), `documentLabel`, `documentNumber` | `-` for missing fields; the number shows through `docNo` in an info chip, hidden when empty |
| `app-date-text` | `date` (`YYYY-MM-DD` string or `Date`), `calendar` (`'bs'` default), `format` (`YYYY-MM-DD`), `fallback` (`-`) | Lumen's `l-date-input` in view mode, so AD → BS conversion is the picker's own. Strings are parsed with `fromIsoDate` (local), never `new Date(string)` |
| `app-user-avatar` | `path` (server-relative `image_url`), `preview` (an object URL not saved yet), `name`, `size` | Fetches the picture as a Blob through `HttpClient` (the interceptor adds the auth header), shows `l-avatar` with it or the initials; the object URL is revoked when the path changes or the component dies; a failed fetch falls back to initials |
| `app-cancel-dialog` | `MODAL_DATA`: `title`, `message`, `confirmText`, `onConfirm(remarks) → Observable` | A required Reason textarea; `confirm()` sets `disableClose`, calls `onConfirm`, closes with `true` on success and stays open on error |
| `app-calculator` | none | Signals `entry`, `previous`, `operator`, `history`; keyboard driven (`document:keydown`); `format()` uses `toPrecision(12)` to hide float noise |

### 3.3 Services

| Service | Scope | What it does |
|---|---|---|
| `DropdownService` | singleton | `vendors`, `customers`, `categories`, `units`, `packings`, `taxTypes`, `roles` (each `status = 'active' \| 'all'`), `products(serviceType, type, status)`, `accounts(scope, partyType, status)`, `paymentModes()`, `purchases(vendorId)`, `sales(customerId)`. Each is one `GET /dropdown/...` (section 4 of `endpoints.md`) returning `DropdownItem[]`; they need only a login |
| `ProductService` | singleton | `list(params)`, `get(id)`, `stockInfo(id)` (`BatchStock[]`), `create`, `update`, `delete`, `exportList(format, params)` |
| `ProductLookup` | per form (`providers`) | `products` and `batches` signals (`ReadonlyMap` by product id); `loadProducts(ids)` and `loadBatches(ids)` fetch only ids not loaded yet, in parallel with `forkJoin`, skipping failures (a product the user may not view) |
| `FileService` | singleton | `download(url, params)`: `GET` with `responseType: 'blob'` and `observe: 'response'`, then `saveFile(response)` |
| `FileDownloads` | per page (`providers`) | `running()` signal (`'pdf'`, `'excel'` or `null`); `run(format, file$)` ignores a second call while one runs, clears on finish, and shows `Print failed` / `Export failed` with `apiErrorMessage` on error |
| `BreadcrumbService` | singleton | The trail and title from route data (layout doc) |

### 3.4 Pipes and utils

| Name | Does |
|---|---|
| `amount` | A number as `1,23,456.00` (`Intl.NumberFormat('en-IN')`, two decimals); anything not a number is `0.00` |
| `docNo` | `\|PE-000005` → `PE-000005`, `2082-83\|PE-000005` → `2082-83 \| PE-000005`: split on `\|`, trim, drop empty parts, join with ` \| `. Send the raw value back to the API |
| `apiErrorMessage(error, fallback)` | The backend's `message` from an `HttpErrorResponse`; status 0 → `Cannot reach the server. Check that the backend is running.`; else the fallback (`Something went wrong. Please try again.`) |
| `saveFile(response, fallback)` | Reads the name from `Content-Disposition` (`filename="…"`), creates an object URL for the Blob, clicks a temporary `<a download>`, revokes the URL |
| `FileFormat` | `'excel' \| 'pdf'` |
| `withMissing(items, extra)` | `items` plus the `extra` rows whose id isn't already there |
| `docNoOptions(items)` | Dropdown rows with `name` run through `docNo` |
| `STRONG_PASSWORD` | `/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/`, the API's rule too |

### 3.5 Models

`Page<T>` (`content`, `totalElements`, `totalPages`, `number`, `size`) is Spring's page; `ApiResponse` (`success`, `message`, `errorCode`, `timestamp`, `post_data_id`) is every save / delete answer and every error body; `ListParams` is `Record<string, string | number>` for query strings. `Product` is the slice of `GET /products/{id}` a line needs (`code`, `unit_name`, `tax_rate`, prices, `has_expiry_date`); `BatchStock` is one row of `stockInfo` (`batch_id` 0 is the default batch with no `batch_no`; `available_quantity`, `expiry_date`, prices). `InvoiceSummary` and `InvoiceLineAmount` are the input and output of `calculateInvoice`.

### 3.6 Styles

| Stylesheet | Used by | Styles |
|---|---|---|
| `document-form.scss` | the purchase, purchase return, sales and sales return forms (`styleUrl`), and the journal, payment, payment adjustment and stock adjustment forms (`styleUrls`, with their own sheet after it) | `.form-drawer` column (`.head` with badge, title, subtitle, `.tools`; scrolling `.body`; `.foot` right-aligned); `.fields` pill header row with a leading icon per `.field` (`.party`, `.ref`, `.type`, `.date` widths; `.toggle`), and `.fields.view` for label-over-value; `.section-head`; `.lines` table cells and the `.amount` box; `.cancelled` banner; hides Lumen's per-field alerts in pills and cells |
| `document-list.scss` | the four document lists, the journal, payment, payment adjustment, inventory lists, and the report pages | the AD/BS `.calendar` segmented control restyled as a bordered pill, compact `.date` inputs, `.table` row height, `.stack` / `.muted` / `.discount` cell text, `.link` entry-number buttons, the `.more` row menu and `.menu-item.danger` |
| `summary-card.scss` | `InvoiceSummaryCard` and `SummaryCard` | the `.fields` grid (`auto-fit, minmax(140px, 1fr)`), `.field` label over a filled right-aligned `.value`, `.net` bold, `.error` red, and `.readonly` plain text |

## 4. How it works

### 4.1 The list page pattern

**Idea.** Query state lives in signals; one `computed` turns them into the request; `toObservable` + `switchMap` fetches it; rows stay on screen while the next page loads, so the table never flashes empty. A refresh counter is part of the request so a save or delete refetches the same page.

```
signals:   calendar ('bs'), fromDate, toDate (startOfToday), filters (FilterChange[] from l-filter),
           sort (TableSort | null, two-way bound to l-table), pageIndex (0), pageSize (10),
           rows, total, loading, loadError, refresh (a counter)
computed:  query()   = filters as { field: value } + fromDate/toDate as toIsoDate + sort as '<field>:<direction>' (default 'id:desc')
                       -- without paging, so Print / Export can reuse it
           request() = { params: { ...query(), pageIndex, pageSize }, refresh }
constructor:
  toObservable(request)
    tap: loading = true
    switchMap: service.list(params) → { page, error: '' }   catchError → { page: null, error: apiErrorMessage(e, 'Could not load …') }
    takeUntilDestroyed
    subscribe: loading = false; loadError = error; rows = page.content ?? []; total = page.totalElements ?? 0

onFilterChange(filters): filters = …; pageIndex = 0
date or sort change:     pageIndex = 0 (resetPage)
reload():                refresh++
```

Sorting: `<l-table [serverSort]="true" [(sort)]="sort" (sortChange)="resetPage()">` only cycles the header state and emits; the page maps the column key to the API's entity field through a `SORT_FIELDS` table (`vendor_name` → `vendor.name`, `tax` → `totalTax`, `system_entry_no` → `systemEntryNo`) and refetches. Filters use the backend's camelCase names as `formcontrolName` (`billNo`, `transactionType`); `l-filter`'s `searchBy` names the free-text field (`vendor.name`).

Paging: `<l-pagination [length]="total()" [(pageIndex)]="pageIndex" [(pageSize)]="pageSize" />` in the footer; `serial(index)` numbers rows across pages (`pageIndex * pageSize + index + 1`). After deleting the last row of a page beyond the first, the page steps back one instead of reloading an empty page.

Buttons: `Add` behind `canCreate()` (`hasOperation('Create…')`); row menu `View` always, `Edit` behind `canEdit()`, `Delete` behind `canDelete()`; `Print` / `Export` call `downloads.run(format, service.exportList(format, { ...query(), calendar }))` and read `downloads.running() === 'pdf'` for the `Printing…` label.

### 4.2 The drawer form pattern

**Idea.** Add, edit and view are one component opened in a drawer, with the mode and id passed as data. There are no form routes: the list stays mounted underneath, and the drawer's close result tells it whether to reload.

```
list.openForm(mode, id?):
  ref = DrawerService.open(FormComponent, {
          data: { mode, id, calendar },               -- read in the form through inject(DRAWER_DATA)
          position: 'bottom', size: 'calc(100vh - 48px)', panelClass: 'drawer-sheet',
          disableClose: true })                       -- only the form's buttons close it: a backdrop click never loses edits
  ref.afterClosed() → if saved: reload()

form:
  drawerRef = inject(DrawerRef, { optional: true }); data = inject(DRAWER_DATA, { optional: true })   -- optional, so it also renders inline in specs
  mode = signal(data.mode ?? 'add'); readonly = computed(mode == 'view')
  constructor: if mode != 'add' and id: load(id) else: addLine(); fetch the next document number
  view mode: footer shows Close and (behind canEdit) Edit, which is startEdit(): mode = 'edit' in place
  edit/add:  footer shows Cancel and Add / Update; close(false) or close(true) after a successful save
```

`drawer-sheet` is a global style in `styles.scss` (the drawer renders under `<body>`, outside any component) that caps the panel at `100vh`. Small forms (masters, chart of accounts, opening stock, stock edit) use a right drawer instead: `position: 'right', size: '350px'` for masters, `'400px'` for accounts and inventory, with the row itself in `data`, so nothing loads.

Inside a document form: the header fields and the line `FormArray` live in one `FormGroup`; a `lines` signal mirrors the array so `l-table` re-renders on add / remove (`rowKey` is the group itself); a `value` signal from `form.valueChanges` feeds a `summary` computed through `calculateInvoice`; `ProductLookup` and `FileDownloads` are in the form's `providers`; dropdowns come from `DropdownService`, merged with the saved document's own vendor and products through `withMissing` so an inactive one still shows its label. Every Lumen input gets `[viewMode]="readonly()"`.

### 4.3 `calculateInvoice`

**Idea.** The server stores the totals it is sent and posts the journal from them, so one function in the browser owns the arithmetic. The discount is spread over the lines in proportion to their amount, so taxable and non-taxable parts shrink alike, and tax is charged on the discounted taxable amount; the result balances the way the backend posts: `net = taxable + nonTaxable + tax + rounding`.

```
lineAmount(quantity, rate) = round2((quantity ?? 0) * (rate ?? 0))

calculateInvoice(lines: { amount, taxRate }[], discountType, discount, rounded):
  gross          = round2(sum of line.amount)                                  -- sub_total
  requested      = discountType == 'Percentage' ? gross * discount / 100 : discount
  discountAmount = round2(clamp(requested, 0, gross))                          -- never negative, never more than gross
  factor         = gross > 0 ? (gross - discountAmount) / gross : 0            -- the share of each line that remains
  taxable = nonTaxable = tax = 0
  for each line:
      amount = line.amount * factor
      if line.taxRate > 0: taxable += amount; tax += amount * line.taxRate / 100
      else:                nonTaxable += amount
  taxable, nonTaxable, tax = round2 of each
  total    = round2(taxable + nonTaxable + tax)
  rounding = rounded ? round2(Math.round(total) - total) : 0                   -- to the nearest whole; may be negative
  net      = round2(total + rounding)                                          -- grand_total
  return { gross, discountAmount, taxable, nonTaxable, tax, rounding, net }
```

What the form sends: `sub_total = gross`, `taxable_amount`, `non_taxable_amount`, `tax` (purchases) or `total_tax` (sales), `rounded`, `rounding`, `grand_total = net`, and `discount` **as typed** with `discount_type`. The list pages therefore derive the discount amount as `sub_total − taxable_amount − non_taxable_amount` (floored at 0). The form also refuses a discount over 100 % or over the gross before calling the API (`Discount too large`).

**`round2`.** `Math.round(Number((value * 100).toPrecision(15))) / 100`. Plain `Math.round(value * 100) / 100` fails on binary noise: `12.935 * 100` is `1293.4999…`, which rounds to `12.93` instead of `12.94`. `toPrecision(15)` drops the noise first, so half values round up as a cashier expects.

### 4.4 Dates

The API sends and expects `YYYY-MM-DD`; Lumen's date inputs emit local-midnight `Date`s. `toIsoDate(date)` formats from the local getters; `fromIsoDate(string)` parses with `new Date(year, month - 1, day)`; `startOfToday()` is today at local midnight. Never `new Date('2026-11-03')`: the spec says that form parses as **UTC**, so in Nepal (UTC+5:45) it becomes 05:45 on the 3rd, and in any zone west of Greenwich it becomes the evening of the **2nd**: the date shifts by a day. `DateText` and every form go through `fromIsoDate` for that reason.

### 4.5 Batches

`batchName(no)` is the number or `Default batch` (batch 0 has none). `isExpired(expiry, today)` compares `YYYY-MM-DD` strings (a batch with no date never expires). `batchOptions(batches)` labels a picker `B1 · 15 in stock` with `batch_id` as the value. `firstBatch(batches)` is the batch to take goods from first: among batches with `available_quantity > 0`, the earliest `expiry_date` (no date sorts last as `9999-12-31`); if none is in stock, the first row. Sales, purchase returns and stock adjustments prefill a new line with it.

### 4.6 Files

`FileService.download` is a normal authenticated `GET` (a plain `<a href>` could not send the Bearer header) that saves the Blob under the API's `Content-Disposition` name, so the file is called `purchases-2083-07-16.xlsx` or `PE-000001.pdf` as the server decided. `FileDownloads` sits in a page's `providers` so each page has its own "one at a time" state; a failed download's Blob body is turned back into JSON by the auth interceptor, which is why `apiErrorMessage` can show `"No sales in this period"`.

### 4.7 `ProductLookup`

A document form needs each line product's `tax_rate`, `code`, `unit_name` and, for picking a batch, its `stockInfo`. Instead of every line fetching on its own, the form's `ProductLookup` keeps two maps and fetches only what is missing: on load, `loadProducts(all line product ids)` runs **before** the lines are filled so tax and totals are right from the first render; on picking a product, `loadProducts([id])` then the line is patched with its prices. It is per form (`providers`) so a long session never holds stale prices from another document.

## 5. Design decisions and gotchas

- **Rows stay while loading.** The list subscribes once in the constructor; `switchMap` drops a stale response when the query changes again, and `rows` is only replaced when the new page arrives.
- **`query()` has no paging** on purpose: Print and Export send it plus `calendar`, so the file holds every matching row with dates in the calendar shown on screen.
- **Column keys are not API fields.** Sorting must map them (`SORT_FIELDS`), or the API silently ignores the unknown field.
- **Filters match "contains"** on the stored text: booleans filter as `isActive=1`, linked records by name (`category.name`), never by id.
- **`DRAWER_DATA` and `DrawerRef` are injected optional** so a form can be rendered in a spec or inline without a drawer.
- **`disableClose: true`** on document drawers: a backdrop click or Escape would otherwise throw away a half-typed invoice.
- **The discount is stored as typed**; old records without a `discount_type` are read as `Flat`.
- **`DateText` takes its calendar from the page** (the list's AD/BS switch, or the form's `data.calendar`); it defaults to `'bs'`. The API's files, by contrast, use the `calendar` param the page sends, else the `calendar_type` setting.
- **`amount` pipe formats, never rounds for storage**: the stored figures are already `round2`'d.
- **`UserAvatar` keeps the object URL alive in a never-completing Observable** and revokes it in the teardown, so switching pictures never leaks memory.
- **`CancelDialog` flips `ref.config.disableClose`** while the request runs, like Lumen's `ConfirmDialog`, so the dialog cannot be dismissed mid-request and an error keeps it open with the reason intact.
- **`withMissing` works by id**, so a renamed or deactivated vendor still appears once with its saved label.

## 6. Build it yourself: order of work

1. `models/api.model.ts` (`Page`, `ApiResponse`, `DropdownItem`, `ListParams`) and `utils/api-error.ts`.
2. `utils/date.ts` (`toIsoDate`, `fromIsoDate`, `startOfToday`), then `utils/invoice.ts` with `round2`, `lineAmount`, `calculateInvoice` and a spec that covers the `12.935` case, percent vs flat, clamping, rounding on and off.
3. `pipes/amount.pipe.ts` and `pipes/doc-no.pipe.ts`; `utils/options.ts`.
4. `services/dropdown.service.ts` with one method per `/dropdown` path; `models/product.model.ts`; `services/product.service.ts`; `utils/batch.ts`; `services/product-lookup.ts` (`autoProvided: false`).
5. `utils/file.ts` (`saveFile`), `services/file.service.ts`, `services/file-downloads.ts`.
6. `components/list-page-card/` (four components + `LIST_PAGE_CARD`), `styles/document-list.scss`; build one list page on the pattern of 4.1 and copy it for the rest.
7. `styles/summary-card.scss`, `InvoiceSummaryCard`, `SummaryCard`, `AmountTotals`, `PartyDetailsCard`, `DateText`; `styles/document-form.scss`; the `drawer-sheet` rule in `styles.scss`; build one drawer form on the pattern of 4.2.
8. `CancelDialog`, `UserAvatar`, `Calculator`, `BreadcrumbService`, `utils/password.ts`.
9. Try it: open a list, change page while watching the table (rows stay), sort by Vendor (the request sends `sort=vendor.name:asc`), open a document in view mode and press Edit (same drawer, inputs appear), type a 10 % discount on two lines with different tax rates and check the summary balances to the paisa.
