# Vendors and Customers (Parties) — Frontend

> Part of the Inventory System implementation guide. Read `docs/BRD.md` for the business picture and `docs/frontend/frontend-setup.md` for how the web app is organised.

## 1. What this is

Vendors are who the company buys from; customers are who it sells to. They have exactly the same fields and the same API shape, only the path (`/vendor` or `/customer`) and the permission names differ. So the web app has **one list and one form** in `features/party/`, and a small config object tells them which kind they are showing. The vendors page lives under Purchase (`/purchase/vendors`), the customers page under Sales (`/sales/customers`).

Saving a party also maintains its account in the chart of accounts on the server: creating one creates the account, saving renames it, deleting removes it. The pages only need to know this to explain it to the user.

## 2. Where the code lives

All paths are under `frontend/src/app/`.

| File | What is in it |
|---|---|
| `features/party/party.model.ts` | `PartyKind` (`'vendor' \| 'customer'`), `PartyConfig`, the `PARTIES` config, `Party` (read shape), `PartyPayload` (write shape), `PartyFormMode`, `PartyFormData` |
| `features/party/party.routes.ts` | `partyRoute(path, kind)`: builds the route a feature mounts |
| `features/party/party.service.ts` | `PartyService`: `list`, `get`, `create`, `update`, `delete`, each taking the `kind` |
| `features/party/party-list/` | `PartyList` (+ `party-list.scss`) |
| `features/party/party-form/` | `PartyForm` (+ `party-form.scss`) |
| `features/purchase/purchase.routes.ts` | mounts `partyRoute('vendors', 'vendor')` |
| `features/sales/sales.routes.ts` | mounts `partyRoute('customers', 'customer')` |
| `layout/sidebar/sidebar.data.ts` | the Vendors link (`/purchase/vendors`, `ViewVendor`) and Customers link (`/sales/customers`, `ViewCustomer`) |
| `shared/components/list-page-card/` | the list card used by every list page |
| `shared/utils/api-error.ts` | `apiErrorMessage` |

Who else uses it: the purchase return, sales and sales return forms call `PartyService.get('vendor' \| 'customer', id)` to fill their party details card. (The purchase entry form has its own `PurchaseService.vendor(id)` for the same `GET /vendor/{id}`.)

### 2.1 The config-driven design

```
PARTIES = {
  vendor:   { path: 'vendor',   singular: 'Vendor',   plural: 'Vendors',   operation: 'Vendor' },
  customer: { path: 'customer', singular: 'Customer', plural: 'Customers', operation: 'Customer' },
}
```

| Config field | Used for |
|---|---|
| `path` | the API base: `${environment.apiUrl}/vendor` or `/customer` |
| `singular`, `plural` | every label: button text, titles, toasts, empty text, breadcrumb |
| `operation` | permission names, built as `View`/`Create`/`Edit`/`Delete` + `operation` → `ViewVendor`, `CreateCustomer`, … |

`partyRoute(path, kind)` returns one route: `{ path, data: { breadcrumb: plural, operation: 'View' + operation, party: kind }, canActivate: [permissionGuard], loadComponent: PartyList }`. The purchase routes call it with `('vendors', 'vendor')`, the sales routes with `('customers', 'customer')`. There are no child routes: add, edit and view open a drawer.

`PartyList` reads `kind` from `ActivatedRoute.snapshot.data['party']` and sets `config = PARTIES[kind]`. `PartyForm` gets `kind` inside `DRAWER_DATA` (defaulting to `vendor` when rendered without a drawer, as in tests). Everything else in both components is written once against `config`.

**Why not two features?** The fields, the validation, the list columns and the drawer are identical. One component per screen means a fix lands in both places, and a third party kind would be a one-line config entry plus a route.

## 3. Screens

### 3.1 List page

Route `/purchase/vendors` (needs `ViewVendor`) or `/sales/customers` (needs `ViewCustomer`).

**Toolbar**: `l-filter` with its search box on `name` and extra filters Registration Number (`registrationNumber`), Contact (`contact`), Email (`email`), Address (`address`) and Status (`isActive`, a select sending `1` = Active, `0` = Inactive; booleans are stored as 1/0 and filters match by "contains"). On the right, with `Create<operation>`, **Add Vendor** / **Add Customer**. There is no date range and no Print/Export on this page.

| Column | Key | Sort field | Shows |
|---|---|---|---|
| S.N | `sn` | — | running number across pages |
| Name | `name` | `name` | ghost button; click opens view |
| Registration No. | `registration_number` | `registrationNumber` | or `-` |
| Contact | `contact` | `contact` | or `-` |
| Email | `email` | `email` | or `-` |
| Address | `address` | `address` | or `-` |
| Status | `is_active` | `isActive` | chip `ACTIVE` (`success`) / `INACTIVE` (`default`) |
| actions | `actions` | — | View; Edit with `Edit<operation>`; Delete with `Delete<operation>` |

`SORT_FIELDS` maps only the two keys whose entity name differs (`registration_number`, `is_active`); the others sort by their own key. Default sort `id:desc`, page size 10.

### 3.2 Form (bottom drawer)

Opened with `DrawerService.open(PartyForm, { data: { kind, mode, id }, position: 'bottom', size: 'calc(100vh - 48px)', panelClass: 'drawer-sheet', disableClose: true })`. Title and subtitle come from the mode and `config.singular`:

| Mode | Title | Subtitle | Icon |
|---|---|---|---|
| `add` | `Add Vendor` | `Provide the details of the new vendor` | `add` |
| `edit` | `Edit Vendor` | `Update the details of this vendor` | `edit` |
| `view` | `Vendor` | `Details of this vendor` | `eye` |

Two columns. Left, a **Basic Details** card with a grid, then Remarks; right, a **Vendor Settings** / **Customer Settings** card.

| Control | Input | Rule / note |
|---|---|---|
| `name` | `l-text-input` (wide) | required; placeholder `Enter vendor name` |
| `registration_number` | `l-text-input` | placeholder `PAN or VAT number` |
| `contact` | `l-text-input` | placeholder `Phone number` |
| `email` | `l-email-input` | Lumen's email input validates the format |
| `address` | `l-text-input` (wide) | |
| `remarks` | `l-textarea`, 2 rows | |
| `is_active` | `l-toggle` "Active" | default on |

Every input takes `[viewMode]="readonly()"`, so view mode is the same template rendered as text. Under the toggle two hints explain the rules the server applies: *Inactive vendors are left out of dropdowns.* and *Each vendor has its own account in the chart of accounts, named after it and renamed whenever it is saved.*

Footer: view → **Close** and, with `Edit<operation>`, **Edit** (switches to edit in place); add/edit → **Cancel** and **Add** / **Update** (`Saving…` while the request runs).

## 4. How it works

### 4.1 Loading the list

**Idea.** The same signal-driven request as every list page: `filters`, `sort`, `pageIndex`, `pageSize` and a `refresh` counter feed one `computed` request; `toObservable` + `switchMap` make the call and cancel a stale one; rows stay on screen while the next page loads.

```
request():
  params = { pageIndex, pageSize }
  params[filter.field] = filter.value          for each filter
  params.sort = sort ? `${SORT_FIELDS[key] ?? key}:${direction}` : 'id:desc'

on change:
  loading = true
  GET /{config.path}?{params}
  ok    -> rows = content, total = totalElements, loadError = ''
  error -> rows = [], total = 0, loadError = apiErrorMessage(error, 'Could not load vendors.')
  loading = false
```

`emptyText` = `loadError()` or `No vendors found for these filters.` A filter or sort change resets `pageIndex` to 0.

### 4.2 Opening the form (add / edit / view)

```
list.openForm(mode, id?):
  drawer.open(PartyForm, { data: { kind, mode, id }, bottom sheet, disableClose })
  afterClosed(saved) -> if saved: reload()

form constructor:
  if mode != 'add' and id:  load(id)
  else:                     mode = 'add'

load(id):
  loading = true
  GET /{path}/{id}
  ok    -> fill: patch every field (null text -> ''), is_active; markAsPristine
  error -> toast 'Could not load the vendor' + API message; close drawer (no result)
  finally loading = false

startEdit():  mode = 'edit'      -- view → edit without reopening
```

State: `mode` and `id` signals; `readonly` = `mode() === 'view'`; `canEdit` = `hasOperation('Edit' + operation)`; `title`, `subtitle`, `icon` computed from `mode` and `config`; `loading`, `saving`.

### 4.3 Saving

**Idea.** Validate what the browser can see (a name, a well-formed email), trim everything, send blanks as empty strings, and let the server's `message` speak on failure.

```
save():
  if saving or loading: return
  if form invalid: markAllAsTouched; warn 'Missing details' / 'Fill in the fields highlighted in red.'; return
  payload = { name, registration_number, contact, email, address, remarks: each trimmed, is_active }
  editing = mode == 'edit' and id given
  request = editing ? PUT /{path}/{id} : POST /{path}
  saving = true
  ok    -> toast 'Vendor updated' / 'Vendor added' + response.message; drawerRef.close(true)
  error -> toast 'Could not save' + apiErrorMessage(error)
  finally saving = false
```

**Why empty strings, not null?** The API trims every text field and fails with a 500 on `null`, so `PartyPayload` types every text field as `string` and the form converts a loaded `null` to `''` before it can be sent back.

**Rules shown:** `Missing details` for a blank name or an invalid email (the controls turn red). The server adds its own, shown through the toast.

### 4.4 Deleting

```
list.remove(row):
  ConfirmDialog, 420px:
      title   'Delete vendor?'
      message 'Vendor "{name}" will be deleted. This cannot be undone.'
      confirm 'Delete' (danger)
      onConfirm: DELETE /{path}/{id}; error -> toast 'Could not delete' + API message (dialog stays open)
  closed with true:
      toast 'Vendor deleted' — '"{name}" was deleted.'
      if it was the only row on a page after the first: pageIndex − 1, else reload()
```

The server refuses to delete a party that purchases, sales, payments or journal lines still use, with 409 `This record is still used by other records, so it cannot be deleted`; the toast shows that sentence. A delete that succeeds removes the party's account too.

## 5. Design decisions and gotchas

- **One component, one config.** `PARTIES` is the only place the two kinds differ in the UI; routes, labels, API paths and permission names are all derived from it.
- **Mounted under the module that uses it.** Vendors sit under Purchase and customers under Sales, so the breadcrumb and sidebar group match how users think of them, even though the code is shared.
- **Blanks are `''`, not `null`.** See 4.3; sending `null` is a server error, not a validation message.
- **Inactive parties disappear from dropdowns** (`/dropdown/vendor/active`), but documents that already name them still load: the document forms merge the saved party into their options with `withMissing`.
- **The account is the server's job.** The form never calls the accounting endpoints; it only tells the user, in a hint, that the account exists and follows the name.
- **Renaming is safe, deleting is guarded.** A rename flows through to the account; a delete fails with 409 while anything references the party or its account.
- **`disableClose`** on the drawer: a stray click outside never throws away edits; view mode can switch to edit in place.
- No Print/Export on this list: there is no `/vendor/export` endpoint in section 18 of `endpoints.md`.

## 6. Build it yourself: order of work

1. Write `party.model.ts`: `PartyKind`, `PartyConfig`, `PARTIES`, `Party`, `PartyPayload` (all text fields `string`), `PartyFormMode`, `PartyFormData`.
2. Write `PartyService` with a private `url(kind)` and the five calls, each taking `kind` first.
3. Write `partyRoute(path, kind)` and mount it from `PURCHASE_ROUTES` (`vendors`) and `SALES_ROUTES` (`customers`); add the two sidebar links with `ViewVendor` / `ViewCustomer`.
4. Build `PartyList` on `LIST_PAGE_CARD`: read `kind` from the route data, derive the three `can…` signals from `config.operation`, the filter columns, the table with its cell templates, the request pipeline, `openForm` and `remove`.
5. Build `PartyForm`: the `FormGroup` with defaults, `load`/`fill`, `startEdit`, `save` with trimmed strings, and the two-column template with `[viewMode]` everywhere and the hints.
6. Try it on both routes: add a vendor, view it, edit in place, then check the chart of accounts shows an account with its name; rename it and check the account followed; try deleting a vendor that has a purchase and read the 409 message in the toast.
7. Write specs: trimmed fields and blanks as empty text on add; a customer opened read-only switching to edit; missing fields turned into empty text on edit; closing when the party cannot be loaded; name required and email format; staying open when the server refuses; the list loading from each route's path and gating Add/Edit/Delete.
