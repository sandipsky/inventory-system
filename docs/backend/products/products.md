# Products — Backend

> Part of the Inventory System implementation guide. Read `docs/BRD.md` for the business picture and `docs/backend/backend-setup.md` for how the backend is organised.

## 1. What this is

A product is anything the company buys, sells or stocks: a name, a code and barcode, list prices (cost, selling, MRP), its unit, category, packing and tax type, flags saying whether it can be bought or sold or is a service, and optional **bonus rules** ("buy at least 24, get 1 free"). Stock is not stored on the product. It is kept **per batch** in the `product_stock` table, one row per batch of the product, and every document that moves goods (purchase, sale, returns, opening stock, stock adjustment) adds to or takes from one of those rows. This feature owns the product CRUD, the batch helpers every document uses, the "what is in stock" endpoint, the product dropdown and the product list export.

## 2. Where the code lives

Package `features/product/`:

| File | What is in it |
|---|---|
| `features/product/controllers/ProductController.java` | `/products` endpoints: list, export, get one, stock info, create, update, delete |
| `features/product/services/ProductService.java` | Validation, mapping, the list's `productType` filter, stock info, delete with batches |
| `features/product/services/ProductStockService.java` | The batch helpers: `findOrCreateBatch`, `findBatch`, `lineBatch`, `batchId` |
| `features/product/services/ProductExportService.java` | The product list as an `ExportTable` for Excel / PDF |
| `features/product/entities/Product.java` | `product` table; `@ManyToOne` to Unit, Category, Packing, TaxType; `@OneToMany` bonus infos (cascade all, orphan removal) |
| `features/product/entities/BonusInfo.java` | `bonus_info` table (`minQuantity`, `bonusQuantity`) |
| `features/product/entities/ProductStock.java` | `product_stock` table, one batch; `@EntityListeners(StockChangeListener.class)` and a transient `savedQuantity` |
| `features/product/dtos/ProductDTO.java`, `BonusInfoDTO.java` | Request/response shapes; `product_types` is derived |
| `features/product/dtos/ProductStockDTO.java` | One row of `/products/stockInfo/{id}` (`batch_id`, `batch_no`, `expiry_date`, `available_quantity`, prices) |
| `features/product/repositories/ProductRepository.java` | `existsByName`, `existsByNameAndIdNot`, the dropdown query |
| `features/product/repositories/ProductStockRepository.java` | `findByProductId`, `findByProductIdAndBatchNo`, `findByProductIdAndBatchNoIsNull`, `sumQuantityByProductId` |
| `common/dropdown/services/DropdownService.java` | `getProductsDropdown(serviceType, type, status)` |
| `features/notification/services/StockChangeListener.java` | Watches every write to a batch quantity for low stock alerts (see the notifications doc) |

## 3. Data

From `backend/database.sql`:

**`product`**

| Column | Meaning |
|---|---|
| `id`, `name` (`NOT NULL UNIQUE`), `code`, `barcode`, `remarks` | Identity and description |
| `cost_price`, `selling_price`, `mrp` | The product's **list** prices. Each batch keeps its own copy (below) |
| `max_stock`, `min_stock` | Stored; `min_stock` is read by the dashboard's stock card only. Low stock alerts use the `low_stock_quantity` setting instead |
| `valuation_method` | Text (`FIFO`, ...). Required on create, not used by any calculation |
| `is_active`, `is_purchasable` (default 1), `is_sellable` (default 1), `is_service_item` (default 0) | Flags; the dropdown filters on them |
| `is_batch_available`, `has_expiry_date`, `has_manufacturing_date` | Stored for the UI; no backend logic reads them |
| `category_id`, `unit_id`, `packing_id`, `tax_type_id` | Foreign keys to the masters. Only the unit is required by the service |
| `created_at`, `updated_at` | Trigger-maintained, not mapped |

**`bonus_info`**: `id`, `min_quantity`, `bonus_quantity`, `product_id` → `product(id)`. Rows belong to the product (JPA cascade + orphan removal): they are replaced wholesale on every save.

**`product_stock`** (one row per batch):

| Column | Meaning |
|---|---|
| `id` | Row id; exposed as `batch_id`, **except** for the default batch (see below) |
| `batch_no` | Text, `NULL` for the product's **default batch** |
| `expiry_date` | `YYYY-MM-DD` text or null |
| `quantity` | Current stock of this batch |
| `cost_price`, `selling_price`, `mrp` | The batch's prices (set by opening stock / purchases / stock edit) |
| `product_id` | → `product(id)` |
| `UNIQUE (product_id, batch_no)` | One row per batch number per product. SQLite treats NULLs as distinct, so only the code keeps the default batch single |

Who points at products and batches: `purchase_entry`, `sales_entry`, `purchase_return_entry`, `sales_return_entry`, `stock_adjustment_entry` all have `product_id → product(id)` and `batch_id → product_stock(id)`. Those foreign keys are what block a delete.

**The default batch is `batch_id` 0.** A line that names no batch number goes into the product's default batch, the row with `batch_no NULL`. In the API that row is always addressed as `batch_id: 0`, never by its real row id. Every other batch is addressed by its row id. `ProductStockService.batchId()` is the one place that rule lives.

## 4. API

| Method | Path | What it does | Permission |
|---|---|---|---|
| `GET` | `/products` | Paged list; shared filters plus `productType` | `ViewProduct` |
| `GET` | `/products/export/{format}` | Every matching product as `excel` or `pdf` | `ViewProduct` |
| `GET` | `/products/{id}` | One product with its names, tax rate and bonus infos | `ViewProduct` |
| `GET` | `/products/stockInfo/{id}` | The product's batches with stock and prices | `ViewProduct` |
| `POST` | `/products` | Create; `"Product Added successfully"` | `CreateProduct` |
| `PUT` | `/products/{id}` | Update; `"Product Updated successfully"` | `EditProduct` |
| `DELETE` | `/products/{id}` | Delete with its batches; `"Product Deleted successfully"` | `DeleteProduct` |
| `GET` | `/dropdown/products/{serviceType}/{type}/{status}` | `{id, name}` list | any logged-in user |

The controller method is annotated with `@RequiresOperation("ViewProduct")` and so on. Full shapes: `backend/endpoints.md` section 6.

Request fields that matter: `name` (required, unique), `unit_id` (required), `valuation_method` (required on create), optional `category_id` / `packing_id` / `tax_type_id` (`0` or omitted clears the link), the prices, `is_active`, the three type flags, and `bonus_infos: [{ min_quantity, bonus_quantity }]`.

**Naming quirk: the type flags have no `is_` prefix.** The DTO uses snake-case naming, and its fields `isPurchasable`, `isSellable`, `isServiceItem` get Lombok getters `isPurchasable()` etc. Jackson derives the property name from the getter, dropping the `is`, so the JSON names are **`purchasable`, `sellable`, `service_item`** (and `has_expiry_date`, `has_manufacturing_date` from `isHasExpiryDate()`). Only `is_active` and `is_batch_available` are pinned with `@JsonProperty`, so they keep their prefix. Sending `is_purchasable` is silently ignored and the flag stays at its default.

Response-only fields: `category_name`, `unit_name`, `packing_name`, `tax_type_name`, `tax_rate` (copied from the tax type, `0` when none) and `product_types` (`["Purchasable", "Sellable"]`, derived from the flags).

## 5. How it works

### 5.1 Listing and filtering

**Idea.** The list uses the shared `SpecificationBuilder` filters (`name`, `code`, `barcode`, `category.name`, `unit.name`, `isActive=1`, ...). One filter can't be expressed as "contains": the list page's Type column. So the service pulls `productType` out of the filter map before building the specification and adds its own predicate.

**Steps.**

```
list(params):
  pageable = QueryParamUtil.toPageable(params)
  filters  = QueryParamUtil.toFilterParams(params)
  productType = remove "productType" from filters (case-insensitive key)
  spec = specBuilder.buildSpecification(filters)
  switch productType:  "purchasable" -> isPurchasable = true
                       "sellable"    -> isSellable = true
                       "both"        -> isPurchasable and isSellable
                       anything else -> no extra predicate
  return repository.findAll(spec AND typeSpec, pageable).map(toDTO)
```

### 5.2 Getting one, and the stock info

`GET /products/{id}`: `findById` else **404** `"Product not found"`, mapped with the linked names and bonus infos.

`GET /products/stockInfo/{id}` is what sales, purchase return and stock adjustment forms fill their batch dropdown from.

```
stockInfo(id):
  product = findById(id)                       -> 404 "Product not found"
  batches = productStockRepository.findByProductId(id)
  if batches is empty:                         -- never stocked: no opening stock, no purchase yet
      return [ one row: batch_id 0, batch_no null, available_quantity 0,
               cost_price / selling_price / mrp = the product's own prices ]
  else return batches mapped: batch_id = batchId(batch), batch_no, expiry_date,
                               available_quantity = quantity, the batch's prices
```

The empty case is deliberate: a form can always offer "the default batch" and the product's list prices, even before any stock exists, instead of handling "no rows".

### 5.3 Creating

**Idea.** Validate the few hard rules, resolve the master links by id, replace the bonus list, save. Creating a product creates **no** batch row; the first opening stock or purchase does.

**Steps.**

```
create(dto):
  if existsByName(dto.name)              -> 409 "Product with the same name already exists"
  if name is null or blank               -> 400 "Product name cannot be null or blank"
  if unit_id <= 0                        -> 400 "Unit is required"
  if valuation_method null or blank      -> 400 "Valuation method is required"
  map(dto, new Product):
      name, code, barcode trimmed; remarks, prices, min/max stock, valuation_method (trimmed), flags copied
      unit = unitRepository.findById(unit_id)                -> 404 "Unit not found"
      category = id > 0 ? find (404 "Category not found") : null
      packing  = id > 0 ? find (404 "Packing not found")  : null
      taxType  = id > 0 ? find (404 "Tax Type not found") : null
      bonusInfos.clear(); add one BonusInfo per bonus_infos item (min_quantity, bonus_quantity)
  save (cascade saves the bonus rows); respond with the new id
```

**Rules checked.** The four messages above; note the duplicate check runs first and compares the name **untrimmed** (see gotchas).

### 5.4 Updating

**Steps.**

```
update(id, dto):
  existing = findById(id)                          -> 404 "Product not found"
  if name null or blank                            -> 400 "Product name cannot be null or blank"
  if existsByNameAndIdNot(dto.name, id)            -> 409 "Product with the same name already exists"
  map(dto, existing)                               -- same mapping as create: every field overwritten,
                                                   -- bonus list cleared and rebuilt (old rows deleted by orphan removal)
  save; respond with id
```

Update does not repeat the `unit_id` / `valuation_method` checks: a `unit_id` of 0 surfaces as **404** `"Unit not found"` from the mapping, and a missing `valuation_method` fails with a 500 (null `trim()`). Changing the product's prices changes only the list prices; batch prices stay as they are (purchases update them line by line).

### 5.5 Deleting

**Idea.** Batches point at the product, so they must go first, inside the same transaction. There is no separate opening-stock table: the opening stock rows *are* `product_stock` rows, so they go too. If any document line still names the product or one of its batches, SQLite refuses, the transaction rolls back, and nothing is deleted.

**Steps.**

```
delete(id):                                  -- @Transactional
  product = findById(id)                     -> 404 "Product not found"
  deleteAll(productStockRepository.findByProductId(id))   -- its batches (opening stock included)
  repository.delete(product)                 -- bonus_info rows go by cascade
  -- any purchase/sales/return/adjustment line pointing at the product or a batch:
  --   FOREIGN KEY constraint failed -> rollback
  --   -> 409 "This record is still used by other records, so it cannot be deleted"
```

### 5.6 The batch helpers (`ProductStockService`)

Every document service uses these four methods, so their rules are worth knowing exactly. They are what make "stock per batch" one consistent idea across purchases, sales, returns, opening stock, stock adjustments and stock edit.

**`findOrCreateBatch(product, batchNo, expiryDate)`** — for documents that bring goods **in** by typing a batch number: purchases, sales returns, opening stock.

```
findOrCreateBatch(product, batchNo, expiryDate):
  number = blank-to-null(batchNo trimmed)
  batch  = number == null ? findByProductIdAndBatchNoIsNull(product)      -- the default batch
                          : findByProductIdAndBatchNo(product, number)
  if none: batch = new ProductStock(product, batchNo = number, quantity = 0)   -- NOT saved yet
  expiry = blank-to-null(expiryDate)
  if expiry != null:
      if batch.expiryDate != null and differs   -> 400 "Batch <no> of <product> already has expiry date <date>"
      batch.expiryDate = expiry
  return batch            -- the caller adds quantity, sets prices and saves
```

Why: batch numbers are unique per product, so two lines (or two purchases) naming the same number add up in one row. A batch keeps its first expiry date; a different date on a later line is treated as a typing mistake rather than silently overwritten (a wrong date is corrected deliberately through Stock Edit). A blank date leaves the batch's date alone. Opening stock uses the unsaved-ness: if the returned batch already has an id, the batch exists and it answers 409 `"Stock already exists for this product batch. Use Stock Adjustment or Stock Edit instead."`.

**`findBatch(product, batchId)`** — for documents that take goods **out** of an existing batch by picking it: sales, purchase returns, stock adjustments, stock edit.

```
findBatch(product, batchId):
  if batchId == 0: return findByProductIdAndBatchNoIsNull(product)   -- may be null: no default batch yet
  batch = findById(batchId)                     -> 404 "Batch not found"
  if batch.product != product                   -> 400 "Batch does not belong to <product name>"
  return batch
```

The ownership check matters: a client could send any row id; without it a sale could take stock from another product's batch.

**`lineBatch(batch, product)`** — the batch a **saved** line moved stock in. Used when a document is edited or deleted and its earlier stock change must be reversed.

```
lineBatch(batch, product):
  if batch != null: return batch
  fallback = findBatch(product, 0)              -- lines saved before batches existed have no batch_id:
  if fallback == null                           -- they moved the product's default batch
      -> 404 "Product Stock not found"
  return fallback
```

**`batchId(batch)`** — how a batch is named in every response: `batch.batchNo == null ? 0 : batch.id`.

Why the default batch is **0** rather than its row id: "no batch" then means the same thing everywhere, whether or not the row exists yet. A brand-new product (no rows) answers `batch_id: 0` from stock info; a client that omits `batch_id` on a line sends the JSON default `0`; and the stored default row also reports `0`. Clients never need to learn or store the default row's real id, and the row can be created lazily by the first purchase.

### 5.7 Export

**Idea.** The export is the list, unpaged, handed to the shared file writer. It reuses `getPaginatedProductsList` with `QueryParamUtil.allRows(params)` (page 0, size `Integer.MAX_VALUE`), so filters and sort behave exactly like the screen.

```
GET /products/export/{format}?<same params as the list>:
  table = ExportTable "Products" with columns
      Product Name, Code, Barcode, Category, Unit, Packing, Tax Type,
      Type ("Service" / "Purchasable" / "Sellable" joined by " / "),
      Cost Price, Selling Price, MRP (amounts), Min Stock, Max Stock (numbers),
      Status ("Active" / "Inactive")
  rows  = list(allRows(params)).content
  ExportService.table(format, "products", table, params)   -> products-<today>.xlsx or .pdf
```

`format` must be `excel` or `pdf`, else **400** `"Export format must be excel or pdf"`. The file carries the company letterhead from the settings; `calendar=AD|BS` picks the calendar of the date in the file name.

### 5.8 Dropdown

`GET /dropdown/products/{serviceType}/{type}/{status}` needs only a login.

```
serviceType: "service" -> isServiceItem = true; "inventory" -> false; anything else ("all") -> no filter
type:        "purchasable" -> isPurchasable = true; "sellable" -> isSellable = true; else no filter
status:      "active" -> isActive = true; else no filter
SELECT new DropdownDTO(p.id, p.name) FROM Product p WHERE (each filter is null OR matches)
```

Purchase forms ask for `inventory/purchasable/active`, sales forms for `inventory/sellable/active`. The query has no `ORDER BY`.

## 6. Design decisions and gotchas

- **Stock lives in batches, not on the product.** The product row has no quantity column at all. "Total stock" is `SUM(quantity)` over its batches (`sumQuantityByProductId`), used by the low stock check. This is why opening stock has no table of its own: it simply creates the first batch rows.
- **Create checks the duplicate before the blank name and untrimmed.** `existsByName(" Coke")` finds nothing, then the name is trimmed to `Coke` and saved; if `Coke` exists, the table's `UNIQUE` on `name` fails and you get a **500**, not the 409. When rebuilding, trim first, like the masters do.
- **`product_types` is read-only** and derived from the flags; sending it does nothing. Send `purchasable` / `sellable` / `service_item`.
- **Bonus infos are replaced, not merged.** Every save clears the list and inserts new rows, so their ids change on each edit. No backend logic applies bonus rules to documents; they are information for the user.
- **`min_stock` does not drive alerts.** Low stock notifications compare total stock with the `low_stock_quantity` setting (same number for all products). The dashboard's stock card is the only reader of `min_stock`.
- **`valuation_method`, `is_batch_available`, `has_expiry_date`, `has_manufacturing_date`, `max_stock`** are stored and returned but nothing on the server acts on them. The web app's default batch choice (earliest expiry in stock) does not look at the method text either.
- **`ProductStock` is watched.** `@EntityListeners(StockChangeListener.class)` plus the transient `savedQuantity` let the listener compute how much each save changed a batch's quantity, whichever service did it, and report it for low stock alerts after commit. Keep that annotation when you recreate the entity.
- **Delete is all-or-nothing** thanks to `@Transactional`: if the product's deletion fails on a foreign key, the batch deletions roll back too.
- **The default batch's uniqueness is only in code.** `UNIQUE (product_id, batch_no)` does not stop two `NULL` batch rows; `findOrCreateBatch` looks the default row up before creating one, and `findByProductIdAndBatchNoIsNull` expects at most one. Never insert default rows by hand.

## 7. Build it yourself: order of work

1. **Tables**: `product`, `bonus_info`, `product_stock` as in section 3, with the foreign keys and `UNIQUE (product_id, batch_no)`. Foreign keys must be on for every connection.
2. **Entities**: `Product` with `@ManyToOne` links to the four masters and `@OneToMany(cascade = ALL, orphanRemoval = true) @JoinColumn(name = "product_id")` for bonus infos; `BonusInfo`; `ProductStock` with `@ManyToOne product`, the unique constraint, and later the `StockChangeListener` + transient `savedQuantity` when you build notifications.
3. **Repositories**: `ProductRepository` (`existsByName`, `existsByNameAndIdNot`, the four-filter dropdown JPQL) and `ProductStockRepository` (`findByProductId`, `findByProductIdAndBatchNo`, `findByProductIdAndBatchNoIsNull`, `sumQuantityByProductId`).
4. **DTOs**: `ProductDTO` (snake-case naming, `@JsonProperty` only on `is_active` and `is_batch_available`, derived `getProductTypes()`), `BonusInfoDTO`, `ProductStockDTO` (`batch_id`, `batch_no`, `expiry_date`, `available_quantity`, prices).
5. **`ProductStockService`** with the four helpers of 5.6 and their exact messages. Build this before any document feature; they all depend on it.
6. **`ProductService`**: create / update / get / delete / stock info / list with the `productType` predicate.
7. **Controller** at `/products` with `@RequiresOperation("ViewProduct")`, `"CreateProduct"`, `"EditProduct"`, `"DeleteProduct"`; add the operations to the seed data and the Admin role.
8. **Dropdown**: `getProductsDropdown(serviceType, type, status)` in `DropdownService` and the route in `DropdownController`.
9. **Export**: `ProductExportService.list(params)` building the `ExportTable` of 5.7, and `GET /products/export/{format}` calling `ExportService.table`.
10. **Try it**: create a unit, `POST /products` (expect 400 without `unit_id`, 409 on a repeated name), `GET /products/stockInfo/{id}` and see the single `batch_id: 0` row, `GET /products?productType=sellable&category.name=bev`, `GET /products/export/excel`, then `DELETE` it; create a purchase for it later and confirm the delete answers 409.
