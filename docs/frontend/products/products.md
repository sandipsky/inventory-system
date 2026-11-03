# Products — Frontend

> Part of the Inventory System implementation guide. Read `docs/BRD.md` for the business picture and `docs/frontend/frontend-setup.md` for how the web app is organised.

## 1. What this is

The product master: everything the company buys, stocks or sells. A product has a name and codes, links to a category, unit, packing and tax type, three prices (cost, selling, MRP), stock limits, a set of flags that decide where it may appear (purchasable, sellable, a service item, batch-wise, with expiry or manufacturing dates) and an optional bonus scheme ("buy 24, get 1 free"). The page at `/products` is a list; Add, Edit and View open one form in a bottom drawer. The product's `tax_rate` and prices are what every purchase and sales line reads, so this is the first master data to get right.

## 2. Where the code lives

All paths are under `frontend/src/app/`.

| File | What is in it |
|---|---|
| `features/product/product.routes.ts` | `PRODUCT_ROUTES`: one route `''` with `data.operation: 'ViewProduct'` and `permissionGuard`, loading `ProductList`; mounted at `/products` |
| `features/product/product.model.ts` | `ProductFormMode` (`add` / `edit` / `view`), `ProductFormData`, `VALUATION_METHODS` (`FIFO`, `LIFO`, `Weighted Average`) |
| `shared/models/product.model.ts` | `Product` (the fields document lines read), `BatchStock` (a row of `stockInfo`), `BonusInfo`, `ProductDetail` (every field), `ProductPayload` |
| `shared/services/product.service.ts` | `ProductService`: `list`, `get`, `stockInfo`, `create`, `update`, `delete`, `exportList` on `/products`. Lives in `shared/` because the document forms (through `ProductLookup`) and the inventory pages use it too |
| `features/product/product-list/` | `ProductList` (+ `product-list.scss`) |
| `features/product/product-form/` | `ProductForm` (+ `product-form.scss`) |
| `shared/services/dropdown.service.ts` | `categories()`, `units()`, `packings()`, `taxTypes()` for the form; `categories('all')`, `units('all')` for the list filters |
| `shared/utils/options.ts` | `withMissing`: keeps a saved but now-inactive choice selectable |
| `shared/services/file-downloads.ts` | Print / Export state on the list |
| `shared/components/list-page-card/` | the list card |

## 3. Screens

### 3.1 List page

Route `/products`, needs `ViewProduct`; the sidebar's Products link carries the same operation.

**Toolbar**: `l-filter` with its search box on `name` and these extra filters. `filterColumns` is a `computed`, because two of the selects are filled from dropdowns that arrive later.

| Filter | Field sent | Values |
|---|---|---|
| Code | `code` | text |
| Barcode | `barcode` | text |
| Category | `category.name` | select built from `GET /dropdown/category/all`, **the name as the value** |
| Unit | `unit.name` | select from `GET /dropdown/units/all`, the name as the value |
| Product Type | `productType` | `purchasable`, `sellable`, `both` (a backend-only filter, section 6 of `endpoints.md`) |
| Item Type | `isServiceItem` | `0` = Inventory, `1` = Service |
| Status | `isActive` | `1` = Active, `0` = Inactive |

Why names, not ids: filters match by "contains", so `category.id=1` would also match 10, 11, …; the name is unambiguous enough. Booleans are stored as 0/1, hence those values. A dropdown that fails (`quiet`) just leaves its filter without options.

On the right: Print, Export and, with `CreateProduct`, **Add Product**.

| Column | Key | Sort field | Shows |
|---|---|---|---|
| S.N | `sn` | — | running number |
| Product Name/Code | `name` | `name` | name as a link to view, the code (or `No code`) under it |
| Category | `category_name` | `category.name` | or `-` |
| Unit | `unit_name` | `unit.name` | or `-` |
| Tax Type | `tax_type_name` | `taxType.name` | or `-` |
| Type | `product_types` | — | chips from `typesOf(row)`: `Service` (`premium`) first for service items, then `Purchasable` (`info`) and/or `Sellable` (`success`) |
| Cost Price | `cost_price` | `costPrice` | `amount` pipe |
| Selling Price | `selling_price` | `sellingPrice` | |
| MRP | `mrp` | `mrp` | |
| Status | `is_active` | `isActive` | chip `ACTIVE` / `INACTIVE` |
| actions | `actions` | — | View; Edit with `EditProduct`; Delete with `DeleteProduct` |

Default sort `id:desc`, page size 10, pager in the footer. Empty text `No products found for these filters.`; load failure `Could not load products.`

### 3.2 Form (bottom drawer)

Opened with `DrawerService.open(ProductForm, { data: { mode, id }, position: 'bottom', size: 'calc(100vh - 48px)', panelClass: 'drawer-sheet', disableClose: true })`. Headings: `Add Product` ("Provide essential details to create a product"), `Edit Product`, `Product`. Two columns.

**Left column**

*Basic Details* card:

| Control | Input | Rule |
|---|---|---|
| `name` | `l-text-input` (wide) | required |
| `code` | `l-text-input`, placeholder `e.g. BEV-001` | |
| `barcode` | `l-text-input` | |
| `category_id` | `l-select`, searchable, clearable, `categoryOptions()` | optional |
| `unit_id` | `l-select`, searchable, `unitOptions()` | **required** |
| `packing_id` | `l-select`, searchable, clearable, `packingOptions()` | optional |
| `tax_type_id` | `l-select`, clearable, `taxTypeOptions()` | optional; its rate is what documents tax by |
| `valuation_method` | `l-select` of `valuationOptions()` | required, default `FIFO` |

*Pricing & Stock* card: `cost_price`, `selling_price`, `mrp` (2 decimals), `min_stock`, `max_stock` — all `l-number-input`, min 0. Then a Remarks textarea.

**Right column**

*Product Settings* card, seven `l-toggle`s: Active (`is_active`, default on), Purchasable (`purchasable`, on), Sellable (`sellable`, on), Service Item (`service_item`, off), Batch Wise Stock (`is_batch_available`, off), Has Expiry Date (`has_expiry_date`, off), Has Manufacturing Date (`has_manufacturing_date`, off).

*Bonus Scheme* card: the hint *Buy at least the minimum quantity, get the bonus quantity free.*, an **Add Bonus** button (hidden in view), and either `No bonus scheme.` or an `l-table` over `bonuses()` with S.N, Min. Quantity, Bonus Quantity (both `l-number-input`) and a remove button (column dropped in view mode).

Every input binds `[viewMode]="readonly()"`. Footer: view → **Close** and, with `EditProduct`, **Edit**; add/edit → **Cancel** and **Add** / **Update** (`Saving…`). The form has no Print/Export of its own.

## 4. How it works

### 4.1 Loading the list

The usual pipeline: `filters`, `sort`, `pageIndex`, `pageSize`, `refresh` → a `computed` request → `toObservable` + `switchMap` → `GET /products?…`. `query()` (filters and sort without paging) is shared with the export. Rows stay on screen while a page loads; filter, sort and date changes reset to page 0.

```
query():
  params[filter.field] = filter.value          -- e.g. category.name=Beverages, productType=sellable
  params.sort = sort ? `${SORT_FIELDS[key] ?? key}:${direction}` : 'id:desc'
```

### 4.2 Opening the form (add / edit / view)

```
constructor:
  if mode != 'add' and id:  load(id)
  else:                     mode = 'add'              -- defaults as above, no bonus rows

load(id):
  loading = true
  GET /products/{id}
  ok    -> fill(product)
  error -> toast 'Could not load the product' + API message; close drawer
  finally loading = false

fill(product):
  saved = { category/unit/packing/taxType: one-item option lists from the product's id + name,
            valuation: product.valuation_method }
  rebuild bonus_infos FormArray from product.bonus_infos (clear + push, emitEvent false); bonuses signal = the groups
  patch every field; unit_id = product.unit_id || null     -- 0 means "no unit", only possible for old data
  markAsPristine
```

The four dropdowns list **active** records (`GET /dropdown/category/active`, `/units/active`, `/packings/active`, `/taxtypes/active`). A saved product may point at an inactive one, so each option list is `withMissing(active list, saved choice)`: the saved choice is appended only when the list no longer has it, so view and edit still show its label and an edit does not silently drop it. `valuationOptions` does the same for `valuation_method`: `VALUATION_METHODS` plus an unknown saved label. A dropdown that fails shows `Could not load categories` (units, packings, tax types) and leaves an empty list.

State: `mode`, `id` signals; `readonly`, `canEdit` (`EditProduct`), `heading`, `bonusColumns` computed; `loading`, `saving`; `bonuses` signal beside the `bonus_infos` FormArray; `saved` signal feeding the five option lists.

### 4.3 The bonus scheme rows

**Idea.** A tiny line-item table, built the same way as document lines: a typed `FormArray<BonusForm>` for values and validation, plus a `bonuses` signal so the `OnPush` table re-renders on add or remove.

```
addBonus():     group = createBonus(); bonus_infos.push(group); bonuses = [...bonuses, group]
removeBonus():  removeAt(index of group); bonuses = bonuses without it
createBonus():  min_quantity and bonus_quantity, both required, min 0.001
```

The server replaces the whole list on every save, so rows carry no `id` and the payload sends only the two numbers per row.

### 4.4 Saving

```
save():
  if saving or loading: return
  if form invalid: markAllAsTouched; warn 'Missing details' / 'Fill in the fields highlighted in red.'; return
  if min_stock and max_stock both set and min_stock > max_stock:
      warn 'Check stock limits' / 'Minimum stock cannot be more than maximum stock.'; return
  payload (ProductPayload):
      name trimmed; code, barcode, remarks trimmed or null
      category_id, unit_id, packing_id, tax_type_id, valuation_method
      cost_price, selling_price, mrp, min_stock, max_stock      (null when blank)
      is_active, purchasable, sellable, service_item, is_batch_available, has_expiry_date, has_manufacturing_date
      bonus_infos: [{ min_quantity, bonus_quantity }]
  editing = mode == 'edit' and id given
  editing ? PUT /products/{id} : POST /products
  ok    -> toast 'Product updated' / 'Product added' + response.message; drawerRef.close(true)   -- list reloads
  error -> toast 'Could not save' + apiErrorMessage(error)
```

Naming to remember: the flags have **no `is_` prefix** (`purchasable`, `sellable`, `service_item`), but `is_active`, `is_batch_available` do; `ProductPayload` omits the read-only `unit_name`, `category_name`, `packing_name`, `tax_type_name`, `tax_rate` and `product_types`.

**Rules shown**: `Missing details` for a blank name, no unit, no valuation method, a negative number or an empty bonus row; `Check stock limits` as above. Server refusals come through the toast.

### 4.5 Deleting

```
list.remove(row):
  ConfirmDialog 'Delete product?' — '"{name}" will be deleted. This cannot be undone.'
  onConfirm: DELETE /products/{id}; error -> toast 'Could not delete' + API message, dialog stays open
  closed with true: toast 'Product deleted' — '"{name}" was deleted.'
                    step back a page if this was the last row on a page after the first, else reload()
```

The API deletes the product with its batches and opening stock, but answers 409 while any document line still uses it; the toast shows the message.

### 4.6 Print / Export

`download(format)` → `FileDownloads.run(format, ProductService.exportList(format, query()))` → `GET /products/export/{format}` with the screen's filters and sort, every matching row. Buttons read `Printing…` / `Exporting…` while running and failures become `Print failed` / `Export failed`. No `calendar` is sent: the product list has no dates.

### 4.7 How the rest of the app reads products

`ProductService` is shared on purpose:

- `get(id)` gives the document forms (through `ProductLookup`) the `tax_rate` that `calculateInvoice` taxes a line by, the `unit_name` and `code` shown on the line, and `cost_price` / `selling_price` / `mrp` to prefill it.
- `stockInfo(id)` gives sales, purchase returns and stock adjustments their batch picker (`BatchStock[]`; a product never stocked returns one default batch with `available_quantity` 0).
- The dropdown the line pickers use is filtered by the flags: `GET /dropdown/products/inventory/purchasable/active` for purchase lines, `…/inventory/sellable/active` for sales lines. So **Purchasable**, **Sellable** and **Service Item** decide where a product can be picked at all, and **Active** off removes it from every picker while saved documents still show it (`withMissing`).
- Purchases update the product's prices with each line, so the prices here are "last purchase" values.

## 5. Design decisions and gotchas

- **`unit_id` is the one required link.** Category, packing and tax type are optional and clearable; a product with no tax type has `tax_rate` 0 and its lines are non-taxable.
- **`valuation_method` is a label.** The API requires a value but only stores the text; `VALUATION_METHODS` is a fixed list, and an unknown saved label is kept selectable rather than rejected.
- **Filters by name, booleans as 0/1.** See 3.1: "contains" matching makes ids unsafe and `true` useless.
- **Blanks go as `null`** (code, barcode, remarks, prices, stock limits), unlike parties, where the API wants `''`. Follow each API's rule; the spec `posts a new product, sending blanks as null` pins it.
- **`unit_id` 0 from old data** is turned into `null` on load so the required validator catches it on edit.
- **Min/max stock is checked in the browser** only when both are set. `min_stock` is what the dashboard's low-stock card compares a product's stock against (backend `features/dashboard`); the low-stock *notification* uses the `low_stock_quantity` setting instead (backend `features/notification/services/LowStockService.java`), so the two can disagree. `max_stock` is stored and exported only.
- **The flags do not reshape the form.** Batch Wise Stock, Has Expiry Date and Has Manufacturing Date are stored and shown, but the document forms always offer a batch and an expiry date regardless.
- **Why a `bonuses` signal next to the FormArray**: the component is `OnPush`; pushing a group into a FormArray changes no input, so the signal is what makes the table re-render.
- **`disableClose`** on the drawer: only the form's own buttons close it; view can switch to edit in place.

## 6. Build it yourself: order of work

1. Write `shared/models/product.model.ts` from section 6 of `endpoints.md`: `Product` (line-level fields), `BatchStock`, `BonusInfo`, `ProductDetail`, `ProductPayload` as an `Omit`.
2. Write `shared/services/product.service.ts` with `list`, `get`, `stockInfo`, `create`, `update`, `delete`, `exportList` (through `FileService`).
3. Write `product.model.ts` (form mode, drawer data, `VALUATION_METHODS`) and `PRODUCT_ROUTES`; mount at `/products` and add the sidebar link with `ViewProduct`.
4. Build `ProductList` on `LIST_PAGE_CARD`: the computed `filterColumns` with `byName` and `quiet`, `SORT_FIELDS`, the cell templates (`typesOf` for the chips), the request pipeline, `openForm`, `remove`, `download`.
5. Build `ProductForm`: the `FormGroup` with the defaults above, the four dropdowns with `withMissing` and `valuationOptions`, the bonus `FormArray` + `bonuses` signal, `load`/`fill`, `save` with the stock-limit check, the two-column template with `[viewMode]` everywhere.
6. Try it: add a product with a tax type and a bonus row, view it, edit in place, make its unit inactive and confirm the edit still shows and keeps it, then open a purchase and check the line shows the tax rate and prices.
7. Write specs: defaults on add; blanks posted as null; refusing a missing name or unit and an empty bonus row; min above max; view keeping an inactive unit selectable then switching to edit; `PUT` on update; the list filtering category and unit by name and listing `Service` first.
