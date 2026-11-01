# API Endpoints Guide

This guide shows how to call every endpoint of the Inventory System backend, with example requests and the responses you get back.

All examples were run against a fresh database. Your IDs will be different, so always use the IDs from your own responses.

- **Base URL:** `http://localhost:8080`
- **Interactive docs (Swagger UI):** http://localhost:8080/swagger-ui.html. You can try every endpoint from the browser there.

---

## Contents

1. [The basics](#1-the-basics): logging in, responses, errors, lists, naming rules
2. [Auth](#2-auth)
3. [Settings](#3-settings)
4. [Dropdowns](#4-dropdowns)
5. [Masters: units, categories, packings, tax types](#5-masters-units-categories-packings-tax-types)
6. [Products](#6-products)
7. [Vendors and customers](#7-vendors-and-customers)
8. [Chart of accounts](#8-chart-of-accounts-account-master)
9. [Inventory: opening stock, stock adjustment, stock edit](#9-inventory)
10. [Purchases and purchase returns](#10-purchases-and-purchase-returns)
11. [Sales and sales returns](#11-sales-and-sales-returns)
12. [Payments](#12-payments)
13. [Journals and opening balance](#13-journals-and-opening-balance)
14. [Reports](#14-reports)
15. [Users and roles](#15-users-and-roles)
16. [A typical first run](#16-a-typical-first-run)

---

## 1. The basics

### Logging in and using the token

Every endpoint except `POST /login` and `GET /configurations` needs a login token.

**Step 1: Log in and save the token** (this uses [`jq`](https://jqlang.org/) to pull out the token):

```bash
TOKEN=$(curl -s -X POST http://localhost:8080/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "Admin@123"}' | jq -r .token)
```

**Step 2: Send it on every request** in the `Authorization` header:

```bash
curl http://localhost:8080/products -H "Authorization: Bearer $TOKEN"
```

**Sending data (POST / PUT):** add a JSON body:

```bash
curl -X POST http://localhost:8080/master/units \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Pcs", "is_active": true}'
```

The rest of this guide shows only the method, path, body and response. Use the same `curl` pattern for each.

> A token is valid for **1 hour**. After that, log in again.

### What a save/delete returns

Every **create, update, delete** (and cancel, adjust) returns the same small object:

```json
{
  "success": true,
  "message": "Unit Added successfully",
  "errorCode": 0,
  "timestamp": 1793422489564,
  "post_data_id": 6
}
```

`post_data_id` is the **ID of the record** that was created, updated or deleted. Use it for follow-up calls.

### Errors

Errors use the same shape, with `success: false`:

```json
{
  "success": false,
  "message": "Category with the same name already exists",
  "errorCode": 409,
  "timestamp": 1793422490223,
  "post_data_id": 0
}
```

| HTTP status | When |
|---|---|
| `400` | The request breaks a rule, e.g. `"Not enough Quantity In Stock"`, `"Journal debits and credits must be equal"`, a blank name, invalid JSON, or text where a number ID is expected. **Read `message`.** It says what went wrong. |
| `401` | Not logged in or token missing (`"Please log in to access this resource."`), or wrong username/password |
| `403` | Logged in but your role lacks the permission (`"Operation not allowed"`), token expired, account locked, or account inactive |
| `404` | Record, page or file not found (e.g. `"Category not found"`) |
| `405` | Wrong HTTP method for that path (e.g. `PATCH` where only `PUT` exists) |
| `409` | Duplicate (same name, username or email already exists), or deleting a record that others still use (`"This record is still used by other records, so it cannot be deleted"`) |
| `500` | Something unexpected went wrong on the server. Check the backend logs. |

> After **5 wrong passwords** an account is locked for **1 hour**.

### Lists: paging, sorting and filtering

Most `GET` list endpoints are **paged**. They accept these query parameters:

| Parameter | Meaning | Default |
|---|---|---|
| `pageIndex` | Page number, **starting at 0** | `0` |
| `pageSize` | Records per page | `25` |
| `sort` | `field:asc` or `field:desc`; use commas for several, e.g. `sort=name:asc,id:desc` | none |
| `fromDate`, `toDate` | Inclusive `YYYY-MM-DD` range on the record's `date`. Only lists of dated documents (purchases, sales, returns, payments, journals, stock adjustments) | none |
| *any field name* | Filter: "contains", not case-sensitive (a few fields match the whole value; their sections say so) | none |

**Filters** use the record's **internal (camelCase) field names**, not the snake_case JSON names. Use a dot to filter on a linked record:

```
GET /products?name=coca                     → products whose name contains "coca"
GET /products?category.name=bev             → products in a category containing "bev"
GET /purchase?vendor.name=abc&sort=date:desc
GET /purchase?transactionType=credit        (NOT transaction_type)
GET /purchase?fromDate=2026-10-01&toDate=2026-10-31
GET /payment?type=Vendor
```

> ⚠️ An unknown filter name is **silently ignored**. You get *all* records back, not an error.

A paged response looks like this (the list is in `content`):

```json
{
  "content": [
    { "id": 6, "name": "Beverages", "is_active": true, "active": true }
  ],
  "totalElements": 1,
  "totalPages": 1,
  "number": 0,
  "size": 25,
  "numberOfElements": 1,
  "first": true,
  "last": true,
  "empty": false,
  "pageable": { "...": "..." },
  "sort": { "...": "..." }
}
```

### Naming rules worth knowing

- **JSON fields are snake_case** (`cost_price`, `vendor_id`, `is_active`).
- **Exception: line-item lists are camelCase:** `purchaseEntries`, `purchaseReturnEntries`, `salesEntries`, `salesReturnEntries`, `stockAdjustmentEntries`, `journalEntries`, `paymentDetails`.
- **Booleans:** responses often contain both `is_active` and `active` (same value). **Send `is_active`.**
- **Product flags have no `is_` prefix:** send `purchasable`, `sellable`, `service_item`.
- **Tax field name differs:** purchases use **`tax`**, sales use **`total_tax`**.
- **Dates** are plain strings in `YYYY-MM-DD` format (e.g. `"2026-10-31"`).
- **Batches:** stock is tracked per product batch. Purchases and sales returns **type** a `batch_no` (optional; new numbers create batches); sales, purchase returns and stock adjustments **pick** a `batch_id` from `GET /products/stockInfo/{id}` (`0` or omitted = the product's default batch). Each product batch may appear on only one line of a document.
- **Document numbers** look like `|PE-000001`. The leading `|` is part of the number. Use it exactly as returned.

### Permissions

Every endpoint checks the user's role for a specific operation (e.g. `CreateProduct`). Each section lists the ones it needs. If your role lacks it, you get **403** `"Operation not allowed"`.

The `admin` user has every permission. A few endpoints only need a valid login, with no operation:
- `/getUserRoleOperations`
- the [dropdowns](#4-dropdowns), because many forms use them

`GET /configurations` and `POST /login` need no login at all.

---

## 2. Auth

| Method | Path | What it does |
|---|---|---|
| `POST` | `/login` | Log in, get a token (no token needed) |
| `GET` | `/getUserRoleOperations` | Who am I, and what am I allowed to do |

### Log in

`POST /login`

```json
{ "username": "admin", "password": "Admin@123" }
```

Response:

```json
{ "token": "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJhZG1pbiIs..." }
```

### Get the current user and their permissions

`GET /getUserRoleOperations`

Useful for a frontend to decide which menus and buttons to show.

```json
{
  "id": 1,
  "username": "admin",
  "name": "Admin",
  "role_id": 1,
  "role_name": "Admin",
  "image_url": null,
  "master_modules": ["Masters", "Product", "Purchase", "Sales", "Accounting", "User and Roles", "Settings", "Inventory"],
  "modules": ["Category", "Unit", "Packing", "TaxType", "Product", "Vendor", "Customer", "..."],
  "operations": ["CreateCategory", "ViewCategory", "EditCategory", "DeleteCategory", "..."]
}
```

---

## 3. Settings

| Method | Path | What it does | Permission |
|---|---|---|---|
| `GET` | `/configurations` | Company settings | none (**no token needed**) |
| `PUT` | `/configurations/edit/{id}` | Update one setting | `EditConfiguration` |
| `PUT` | `/configurations/edit` | Update several settings at once | `EditConfiguration` |
| `GET` | `/documentNumbering` | Number formats for each document type | `ViewDocumentNumbering` |

### Read settings

`GET /configurations`

```json
[
  { "id": 1, "name": "company_name", "label": "Company Name", "value": "Test Pvt. Ltd.", "is_editable": true },
  { "id": 7, "name": "calendar_type", "label": "Calendar Type", "value": "BS", "is_editable": true },
  { "id": 8, "name": "default_rounding", "label": "Default Rounding", "value": "1", "is_editable": true }
]
```

### Update one setting

`PUT /configurations/edit/1`

```json
{ "name": "company_name", "label": "Company Name", "value": "Shakya Traders", "is_editable": true }
```

### Update several settings

`PUT /configurations/edit` sends a list. Each item must include its `id`.

```json
[
  { "id": 1, "name": "company_name", "label": "Company Name", "value": "Shakya Traders", "is_editable": true },
  { "id": 8, "name": "default_rounding", "label": "Default Rounding", "value": "0", "is_editable": true }
]
```

### Document numbering

`GET /documentNumbering`

```json
[
  { "id": 1, "name": "Purchase Entry", "prefix": "|PE-", "body_length": 6, "start_no": 1, "end_no": 999999, "numbering_style": null },
  { "id": 8, "name": "Sales Entry",    "prefix": "|SI-", "body_length": 6, "start_no": 1, "end_no": 999999, "numbering_style": null }
]
```

---

## 4. Dropdowns

Short `{ id, name }` lists for filling select boxes. They are **not paged**, and need only a valid login (no specific permission).

The last part of each path is the **status**. Use `active` for active records only, or `all` for everything.

| Path | Returns |
|---|---|
| `GET /dropdown/units/{status}` | Units |
| `GET /dropdown/category/{status}` | Categories |
| `GET /dropdown/packings/{status}` | Packings |
| `GET /dropdown/taxtypes/{status}` | Tax types |
| `GET /dropdown/vendor/{status}` | Vendors |
| `GET /dropdown/customer/{status}` | Customers |
| `GET /dropdown/users/{status}` | Users |
| `GET /dropdown/roles/{status}` | Roles |
| `GET /dropdown/products/{serviceType}/{type}/{status}` | Products. `serviceType` = `inventory` / `service` / `all`; `type` = `purchasable` / `sellable` / `all` |
| `GET /dropdown/accountMaster/{type}/{partyType}/{status}` | Accounts. `type` = `party` / `nonparty` / `all`; `partyType` = `vendor` / `customer` / `all` |
| `GET /dropdown/purchase/{vendorId}` | That vendor's purchases, newest first. `name` is the purchase number (`\|PE-000001`). For the reference purchase of a purchase return |
| `GET /dropdown/sales/{customerId}` | That customer's sales that are **not cancelled**, newest first. `name` is the invoice number (`\|SI-000001`). For the reference invoice of a sales return |

Examples:

```
GET /dropdown/units/active
GET /dropdown/products/inventory/sellable/active      → products you can sell
GET /dropdown/accountMaster/party/vendor/active       → vendor accounts
GET /dropdown/sales/6                                 → invoices customer 6 can return goods against
```

Response:

```json
[ { "id": 1, "name": "Piece" }, { "id": 2, "name": "Box" }, { "id": 6, "name": "Pcs" } ]
```

---

## 5. Masters: units, categories, packings, tax types

These four work exactly the same way. Only the path and the permission name change.

| Master | Path | Permissions |
|---|---|---|
| Units | `/master/units` | `ViewUnit`, `CreateUnit`, `EditUnit`, `DeleteUnit` |
| Categories | `/master/categorys` *(spelled this way)* | `ViewCategory`, `CreateCategory`, ... |
| Packings | `/master/packings` | `ViewPacking`, `CreatePacking`, ... |
| Tax types | `/master/taxtypes` | `ViewTaxType`, `CreateTaxType`, ... |

| Method | Path | What it does |
|---|---|---|
| `GET` | `/master/units` | Paged list |
| `GET` | `/master/units/{id}` | One record |
| `POST` | `/master/units` | Create |
| `PUT` | `/master/units/{id}` | Update |
| `DELETE` | `/master/units/{id}` | Delete |

### Create

`POST /master/categorys`

```json
{ "name": "Beverages", "is_active": true }
```

```json
{ "success": true, "message": "Category Added successfully", "errorCode": 0, "post_data_id": 6, "timestamp": 1793422489652 }
```

Tax types also have a rate. `POST /master/taxtypes`:

```json
{ "name": "VAT 13%", "tax_rate": 13, "is_active": true }
```

### List, with search and sort

`GET /master/units?pageIndex=0&pageSize=10&sort=name:asc`

`GET /master/categorys?name=bev`

### Get one

`GET /master/categorys/6`

```json
{ "id": 6, "name": "Beverages", "is_active": true, "active": true }
```

### Update

`PUT /master/categorys/6`

```json
{ "name": "Drinks", "is_active": true }
```

### Delete

`DELETE /master/categorys/7`

```json
{ "success": true, "message": "Category Deleted successfully", "errorCode": 0, "post_data_id": 7, "timestamp": 1793422490374 }
```

> Names must be unique. A duplicate returns **409** `"Category with the same name already exists"`.

---

## 6. Products

Permissions: `ViewProduct`, `CreateProduct`, `EditProduct`, `DeleteProduct`

| Method | Path | What it does |
|---|---|---|
| `GET` | `/products` | Paged list (filter e.g. `?name=coca`, `?category.name=bev`) |
| `GET` | `/products/{id}` | One product |
| `GET` | `/products/stockInfo/{id}` | Current stock and prices of a product, one row per batch |
| `POST` | `/products` | Create |
| `PUT` | `/products/{id}` | Update |
| `DELETE` | `/products/{id}` | Delete, with its batches and opening stock. Fails with **409** while document lines still use it |

### Create a product

`POST /products`

```json
{
  "name": "Coca-Cola 500ml",
  "code": "BEV-001",
  "barcode": "8901000000011",
  "remarks": "",
  "cost_price": 40,
  "selling_price": 50,
  "mrp": 55,
  "max_stock": 500,
  "min_stock": 20,
  "valuation_method": "FIFO",
  "category_id": 6,
  "unit_id": 6,
  "packing_id": 6,
  "tax_type_id": 1,
  "is_active": true,
  "purchasable": true,
  "sellable": true,
  "service_item": false,
  "is_batch_available": false,
  "has_expiry_date": true,
  "has_manufacturing_date": false,
  "bonus_infos": [
    { "min_quantity": 24, "bonus_quantity": 1 }
  ]
}
```

- `unit_id` is required. `category_id`, `packing_id` and `tax_type_id` are optional.
- `bonus_infos`: "buy at least `min_quantity`, get `bonus_quantity` free". Can be an empty list.

### Get a product

`GET /products/31`

```json
{
  "id": 31,
  "name": "Coca-Cola 500ml",
  "code": "BEV-001",
  "cost_price": 40.0,
  "selling_price": 50.0,
  "mrp": 55.0,
  "category_id": 6,  "category_name": "Beverages",
  "unit_id": 6,      "unit_name": "Pcs",
  "packing_id": 6,   "packing_name": "Box of 12",
  "tax_type_id": 1,  "tax_type_name": "VAT 13%",  "tax_rate": 13.0,
  "purchasable": true,
  "sellable": true,
  "service_item": false,
  "product_types": ["Purchasable", "Sellable"],
  "is_active": true,
  "bonus_infos": [ { "id": 61, "min_quantity": 24.0, "bonus_quantity": 1.0 } ]
}
```

### Check stock

Stock is kept **per batch**. A product gets a batch every time a purchase, sales return or opening stock names a new `batch_no`; quantities and prices are tracked for each batch separately. Lines that give no batch number go into the product's **default batch**, which has `batch_no: null` and is **always `batch_id: 0`** (everywhere: here, on document lines and in the stock-edit path). Batch numbers are unique per product.

`GET /products/stockInfo/31`

```json
[
  { "batch_id": 0, "batch_no": null,   "expiry_date": null,         "available_quantity": 7.0,  "cost_price": 42.0, "selling_price": 52.0, "mrp": 57.0 },
  { "batch_id": 1, "batch_no": "B1",   "expiry_date": "2027-01-31", "available_quantity": 15.0, "cost_price": 40.0, "selling_price": 50.0, "mrp": 55.0 },
  { "batch_id": 3, "batch_no": "B2",   "expiry_date": "2027-06-30", "available_quantity": 3.0,  "cost_price": 43.0, "selling_price": 53.0, "mrp": 58.0 }
]
```

Use this list to fill the **batch dropdown** on sales and purchase-return lines (send the chosen `batch_id`). A brand-new product that has never had stock (no opening stock or purchase yet) returns a single row with `available_quantity: 0`, the product's own prices and `batch_id: 0`.

---

## 7. Vendors and customers

Vendors (who you buy from) and customers (who you sell to) have the same fields.

| | Path | Permissions |
|---|---|---|
| Vendors | `/vendor` | `ViewVendor`, `CreateVendor`, `EditVendor`, `DeleteVendor` |
| Customers | `/customer` | `ViewCustomer`, `CreateCustomer`, `EditCustomer`, `DeleteCustomer` |

| Method | Path | What it does |
|---|---|---|
| `GET` | `/vendor` | Paged list (e.g. `?name=abc`) |
| `GET` | `/vendor/{id}` | One vendor |
| `POST` | `/vendor` | Create |
| `PUT` | `/vendor/{id}` | Update |
| `DELETE` | `/vendor/{id}` | Delete |

### Create

`POST /vendor` (or `POST /customer`)

```json
{
  "name": "ABC Suppliers",
  "registration_number": "601234567",
  "contact": "9800000001",
  "address": "Kathmandu",
  "email": "abc@suppliers.com",
  "remarks": "",
  "is_active": true
}
```

> Creating a vendor or customer **automatically creates their account** in the chart of accounts. That account is used for credit purchases/sales and in the ledger.
>
> Deleting a vendor or customer **deletes their account too**. While purchases or sales, payments or journal lines still use either of them, the delete fails with **409** `"This record is still used by other records, so it cannot be deleted"` and nothing is removed.

---

## 8. Chart of accounts (account master)

Permissions: `ViewAccountMaster`, `CreateAccountMaster`, `EditAccountMaster`, `DeleteAccountMaster`

| Method | Path | What it does |
|---|---|---|
| `GET` | `/accountMaster` | Paged list |
| `GET` | `/accountMaster/{id}` | One account |
| `GET` | `/accountMaster/getAccountTypes` | All account types, grouped |
| `GET` | `/accountMaster/getParentAccount/{accountType}` | Accounts of that type (to pick a parent) |
| `POST` | `/accountMaster` | Create |
| `PUT` | `/accountMaster/{id}` | Update |
| `DELETE` | `/accountMaster/{id}` | Delete (not system, vendor or customer accounts) |

### Account types

`GET /accountMaster/getAccountTypes`

```json
[
  { "heading": "Assets",    "types": ["Cash & Cash Equivalents", "Other Current Assets", "Receivables", "Other Receivables", "Non-Current Assets"] },
  { "heading": "Liability", "types": ["Other Payables", "Statutory Payables", "Secured Loan", "Unsecured Loan", "Payables"] },
  { "heading": "Equity",    "types": ["Capital Account", "Retained Earning"] },
  { "heading": "Income",    "types": ["Direct Income", "Indirect Income"] },
  { "heading": "Expenses",  "types": ["Administrative Expenses", "Sales & Marketing Expenses", "Other Indirect Expenses", "Cost of Goods Sold"] }
]
```

### Possible parent accounts

URL-encode the type name (`&` becomes `%26`, space becomes `%20`):

`GET /accountMaster/getParentAccount/Cash%20%26%20Cash%20Equivalents`

```json
[ { "id": 1, "name": "Cash In Hand" }, { "id": 3, "name": "Cash" }, { "id": 6, "name": "Petty Cash" } ]
```

### Create an account

`POST /accountMaster`

```json
{
  "account_code": "B-001",
  "account_name": "Nabil Bank",
  "account_type": "Cash & Cash Equivalents",
  "parent_id": 0,
  "is_active": true,
  "remarks": "Main business account"
}
```

Use `parent_id: 0` for no parent.

`GET /accountMaster/37`:

```json
{
  "id": 37,
  "account_code": "B-001",
  "account_name": "Nabil Bank",
  "account_type": "Cash & Cash Equivalents",
  "parent_id": 0,
  "parent_account_name": null,
  "is_active": true,
  "is_system_generated": false,
  "deletable": true,
  "remarks": "Main business account"
}
```

> Accounts with `deletable: false` (like `Cash`, `Sales`, `VAT Purchase`) are needed by the system. Deleting them fails with `"Selected Account cannot be deleted"`. A vendor's or customer's account goes when they are deleted; deleting it directly fails with `"Selected Account belongs to a vendor or customer; delete them instead"`. An account used by journal lines can't be deleted (**409**).

In the list, the `accountType` filter matches the **whole** type name (not case-sensitive): `GET /accountMaster?accountType=Payables` returns only `Payables`, not `Other Payables` or `Statutory Payables`. Other fields filter by "contains".

---

## 9. Inventory

### Opening stock

The stock you already have when you start using the system.

Permissions: `ViewOpeningStock`, `CreateOpeningStock`

| Method | Path | What it does |
|---|---|---|
| `GET` | `/opening-stock` | Paged list (e.g. `?product.name=coca`) |
| `POST` | `/opening-stock` | Set opening stock for a product batch |

`POST /opening-stock`

```json
{ "product_id": 31, "batch_no": "B1", "expiry_date": "2027-01-31", "quantity": 10, "cost_price": 40, "selling_price": 50, "mrp": 55 }
```

`batch_no` and `expiry_date` are optional. Leave `batch_no` out to set the product's default batch (`batch_id` 0). Each batch can get opening stock only once (**409** otherwise). The list shows one row per batch, with `batch_id`, `batch_no` and `expiry_date`.

### Stock adjustment

Use this to fix stock after a physical count, breakage, loss and so on. **`In`** adds stock and **`Out`** removes it.

Permissions: `ViewStockAdjustment`, `CreateStockAdjustment` (also needed for `generateNumber`), `EditStockAdjustment`, `DeleteStockAdjustment`

| Method | Path | What it does |
|---|---|---|
| `GET` | `/stock-adjustment/generateNumber` | Preview the next number (plain text, e.g. `\|SA-000001`) |
| `GET` | `/stock-adjustment` | Paged list |
| `GET` | `/stock-adjustment/{id}` | One adjustment with its lines |
| `POST` | `/stock-adjustment` | Create |
| `PUT` | `/stock-adjustment/{id}` | Update |
| `DELETE` | `/stock-adjustment/{id}` | Delete (stock is put back) |

`POST /stock-adjustment`

```json
{
  "date": "2026-10-31",
  "remarks": "Monthly stock count",
  "stockAdjustmentEntries": [
    { "product_id": 31, "batch_id": 1, "adjustment_type": "Out", "quantity": 3, "reason": "Broken bottles" },
    { "product_id": 31, "adjustment_type": "In",  "quantity": 1, "reason": "Found in back store" }
  ]
}
```

`batch_id` picks the batch to adjust (from the product's stock info); leave it out or send `0` for the default batch.

`GET /stock-adjustment/1`

```json
{
  "id": 1,
  "date": "2026-10-31",
  "system_entry_no": "|SA-000001",
  "remarks": "Monthly stock count",
  "stockAdjustmentEntries": [
    { "id": 1, "master_stock_adjustment_id": 1, "adjustment_type": "Out", "quantity": 3.0, "reason": "Broken bottles", "product_id": 31, "product_name": "Coca-Cola 500ml", "batch_id": 1, "batch_no": "B1" },
    { "id": 2, "master_stock_adjustment_id": 1, "adjustment_type": "In",  "quantity": 1.0, "reason": "Found in back store", "product_id": 31, "product_name": "Coca-Cola 500ml", "batch_id": 0, "batch_no": null }
  ]
}
```

> At least one line is required. `adjustment_type` must be exactly `In` or `Out`. `quantity` must be more than 0. You can't take out more than is in stock.
> A batch that does not exist yet can't be adjusted. Add opening stock or a purchase first.

### Stock edit

Directly overwrite one batch's current quantity, prices and expiry date.

Permissions: `ViewStockEdit`, `EditStockEdit`

| Method | Path | What it does |
|---|---|---|
| `GET` | `/stock-edit` | Paged list of product stock, one row per batch (e.g. `?product.name=coca`) |
| `GET` | `/stock-edit/{productId}/{batchId}` | One batch of a product |
| `PUT` | `/stock-edit/{productId}/{batchId}` | Overwrite its quantity, prices and expiry date |

`{batchId}` is the `batch_id` from the product's stock info; `0` is the product's default batch.

`PUT /stock-edit/31/1`

```json
{ "quantity": 100, "cost_price": 42, "selling_price": 52, "mrp": 56, "expiry_date": "2027-01-31" }
```

> Stock edit sets the numbers directly and leaves no history. For normal corrections, prefer a **stock adjustment**.

---

## 10. Purchases and purchase returns

### How saving works

When you save a purchase, the server:

1. **adds the quantities to stock**, batch by batch,
2. **posts the accounting journal** automatically, and
3. for **credit** purchases, records an amount due to the vendor that you can pay later (see [Payments](#12-payments)).

> **The server does not calculate totals.** Your app works out `sub_total`, `discount`, `taxable_amount`, `tax`, `rounding` and `grand_total` and sends them. The server stores them as given and uses them for the journal.

`transaction_type` is **`Cash`** (paid now) or **`Credit`** (pay later).

Every purchase, sale and return needs **at least one item**, and each item's **`quantity` must be more than 0**. Otherwise you get **400** (`"Add at least one product"` / `"Quantity must be greater than zero"`).

### Purchase entry

Permissions: `ViewPurchaseEntry`, `CreatePurchaseEntry` (also needed for `generateNumber`), `EditPurchaseEntry`, `DeletePurchaseEntry`

| Method | Path | What it does |
|---|---|---|
| `GET` | `/purchase/generateNumber` | Preview the next number (plain text, e.g. `\|PE-000001`) |
| `GET` | `/purchase` | Paged list (e.g. `?vendor.name=abc&sort=date:desc`) |
| `GET` | `/purchase/{id}` | One purchase with its items |
| `POST` | `/purchase` | Create |
| `PUT` | `/purchase/{id}` | Update |
| `DELETE` | `/purchase/{id}` | Delete (stock is taken back out) |

`POST /purchase`

```json
{
  "date": "2026-10-30",
  "bill_date": "2026-10-29",
  "bill_no": "INV-5501",
  "transaction_type": "Credit",
  "vendor_id": 6,
  "discount_type": "Flat",
  "discount": 0,
  "sub_total": 4800,
  "non_taxable_amount": 0,
  "taxable_amount": 4800,
  "tax": 624,
  "rounded": false,
  "rounding": 0,
  "grand_total": 5424,
  "remarks": "October stock",
  "purchaseEntries": [
    { "product_id": 31, "batch_no": "B1", "expiry_date": "2027-01-31", "quantity": 120, "cost_price": 40, "selling_price": 50, "mrp": 55 },
    { "product_id": 31, "quantity": 10, "cost_price": 42, "selling_price": 52, "mrp": 57 }
  ]
}
```

- `date` is the date you record it. `bill_date` and `bill_no` come from the vendor's bill.
- `bill_no` can't repeat for the same vendor.
- `batch_no` is **typed in** and optional: an unknown number **creates a new batch** for the product, a known one adds to that batch, and a blank one goes into the product's default batch. `expiry_date` is optional and is stored on the batch.
- A product batch may appear **once per document**. A second line for the same product and batch fails with `"Coca-Cola 500ml batch B1 is entered on more than one line"` (or `"… (default batch) is entered on more than one line"` for two no-batch lines).
- A batch has **one expiry date**. A date that differs from what the batch already has fails with `"Batch B1 of … already has expiry date …"`. Leave `expiry_date` blank to keep the batch's date; to correct a wrong date use **stock edit**.
- Prices on each line update the prices of that batch and of the product.

`GET /purchase/1`

```json
{
  "id": 1,
  "date": "2026-10-30",
  "bill_date": "2026-10-29",
  "system_entry_no": "|PE-000001",
  "bill_no": "INV-5501",
  "transaction_type": "Credit",
  "vendor_id": 6,
  "vendor_name": "ABC Suppliers",
  "sub_total": 4800.0,
  "discount": 0.0,
  "taxable_amount": 4800.0,
  "non_taxable_amount": 0.0,
  "tax": 624.0,
  "rounded": false,
  "rounding": 0.0,
  "grand_total": 5424.0,
  "discount_type": "Flat",
  "remarks": "October stock",
  "purchaseEntries": [
    { "id": 1, "master_purchase_entry_id": 1, "product_id": 31, "product_name": "Coca-Cola 500ml", "batch_id": 1, "batch_no": "B1", "expiry_date": "2027-01-31", "quantity": 120.0, "cost_price": 40.0, "selling_price": 50.0, "mrp": 55.0 },
    { "id": 2, "master_purchase_entry_id": 1, "product_id": 31, "product_name": "Coca-Cola 500ml", "batch_id": 0, "batch_no": null, "expiry_date": null, "quantity": 10.0, "cost_price": 42.0, "selling_price": 52.0, "mrp": 57.0 }
  ]
}
```

**Updating (`PUT`):** send the whole purchase again.
- To **keep or change** a line, include it with its `id`.
- To **add** a line, leave out `id`.
- Any line you leave out is **removed**.

> You can't remove purchased stock that has already been sold. That fails with `"Product Stock is Already Used"`. Changing a line's `batch_no` moves its quantity out of the old batch and into the new one, so the same rule applies to the old batch.

### Purchase return

Sending goods back to a vendor. **Stock goes down.** The body is the same as a purchase, except:
- there's no `bill_date`,
- the items go in **`purchaseReturnEntries`**,
- each line **picks a batch** with `batch_id` (from the product's stock info) instead of typing a `batch_no`. Leave it out or send `0` for the default batch, and
- `ref_purchase_id` optionally names the purchase the goods came in on (pick it from `GET /dropdown/purchase/{vendorId}`). It must be the **same vendor's** purchase, or you get `"Reference purchase belongs to another vendor"`. Leave it out (or `null`) for none.

Permissions: `ViewPurchaseReturn`, `CreatePurchaseReturn` (also needed for `generateNumber`), `EditPurchaseReturn`, `DeletePurchaseReturn`

| Method | Path |
|---|---|
| `GET` | `/purchase-return/generateNumber` |
| `GET` | `/purchase-return` |
| `GET` | `/purchase-return/{id}` |
| `POST` | `/purchase-return` |
| `PUT` | `/purchase-return/{id}` |
| `DELETE` | `/purchase-return/{id}` |

`POST /purchase-return`

```json
{
  "date": "2026-10-31",
  "bill_no": "INV-5501",
  "transaction_type": "Cash",
  "vendor_id": 6,
  "discount_type": "Flat",
  "discount": 0,
  "sub_total": 200,
  "non_taxable_amount": 0,
  "taxable_amount": 200,
  "tax": 26,
  "rounded": false,
  "rounding": 0,
  "grand_total": 226,
  "remarks": "Expired items",
  "ref_purchase_id": 1,
  "purchaseReturnEntries": [
    { "product_id": 31, "batch_id": 1, "quantity": 5, "cost_price": 40, "selling_price": 50, "mrp": 55 }
  ]
}
```

Returning more than the batch holds fails with `"Not enough Quantity In Stock"`; a `batch_id` of another product fails with `"Batch does not belong to …"`. On read each line also shows the batch's `batch_no`, and the return shows `ref_purchase_id` with the purchase's number in `ref_purchase_no` (both `null` when it has none).

A purchase that a purchase return names can't be deleted (409) until that return is deleted or points elsewhere.

---

## 11. Sales and sales returns

Sales work like purchases, but in reverse:
- **stock goes down**,
- the journal is posted automatically, and
- **credit** sales create an amount due from the customer.

> Same as purchases:
> - **your app calculates the totals**;
> - at least one item is required, each with a `quantity` above 0.
>
> Note the tax field is **`total_tax`** here, not `tax`.

### Sales entry

Permissions: `ViewSalesEntries`, `CreateSalesEntry` (also needed for `generateNumber`), `CancelSalesEntry`

A saved sale is **never edited or deleted**, only cancelled.

| Method | Path | What it does |
|---|---|---|
| `GET` | `/sales/generateNumber` | Preview the next invoice number (plain text, e.g. `\|SI-000001`) |
| `GET` | `/sales` | Paged list (e.g. `?customer.name=ram`) |
| `GET` | `/sales/{id}` | One sale with its items |
| `POST` | `/sales` | Create |
| `POST` | `/sales/{id}` | **Cancel** the sale (there is no update or delete) |

`POST /sales`

```json
{
  "date": "2026-10-31",
  "transaction_type": "Credit",
  "customer_id": 6,
  "discount_type": "Flat",
  "discount": 0,
  "sub_total": 1000,
  "non_taxable_amount": 0,
  "taxable_amount": 1000,
  "total_tax": 130,
  "rounded": false,
  "rounding": 0,
  "grand_total": 1130,
  "remarks": "Credit sale",
  "salesEntries": [
    { "product_id": 31, "batch_id": 1, "quantity": 20, "cost_price": 40, "selling_price": 50, "mrp": 55 }
  ]
}
```

Each line **picks the batch it sells from** with `batch_id`, taken from `GET /products/stockInfo/{id}` (that call also gives you the batch's prices to prefill the line). Leave `batch_id` out or send `0` to sell from the default batch. A product batch may appear once per document; a repeated one fails with `"… batch B1 is entered on more than one line"`.

`GET /sales/1`

```json
{
  "id": 1,
  "date": "2026-10-31",
  "system_entry_no": "|SI-000001",
  "transaction_type": "Credit",
  "customer_id": 6,
  "customer_name": "Ram Traders",
  "sub_total": 1000.0,
  "discount": 0.0,
  "taxable_amount": 1000.0,
  "non_taxable_amount": 0.0,
  "total_tax": 130.0,
  "rounded": false,
  "rounding": 0.0,
  "grand_total": 1130.0,
  "discount_type": "Flat",
  "remarks": "Credit sale",
  "cancelled": false,
  "cancel_remarks": null,
  "salesEntries": [
    { "id": 1, "master_sales_entry_id": 1, "product_id": 31, "product_name": "Coca-Cola 500ml", "batch_id": 1, "batch_no": "B1", "quantity": 20.0, "cost_price": 40.0, "selling_price": 50.0, "mrp": 55.0 }
  ]
}
```

If the chosen batch doesn't hold enough, you get `"Not enough Quantity In Stock"`. A `batch_id` that belongs to another product fails with `"Batch does not belong to …"`.

### Cancel a sale

Sales are never deleted, only cancelled. `POST /sales/2`

```json
{ "cancel_remarks": "Customer changed their mind" }
```

Cancelling:
- puts the stock back,
- removes the journal (and, for a credit sale, the amount due), and
- marks the sale `"cancelled": true` with the given `cancel_remarks`. Its lines **stay**, so `GET /sales/{id}` still shows what it sold.

A cancelled sale can't be cancelled again. A credit sale that already has payments against it can't be cancelled, and neither can a sale that a sales return names until that return is cancelled (`"Cancel the sales returns made against this invoice first"`).

### Sales return

A customer brings goods back. **Stock goes up.** Same body as a sale, but:
- the items go in **`salesReturnEntries`**, and like a purchase each line **types in** a `batch_no` (optional, with an optional `expiry_date`) instead of picking a `batch_id`: a known number puts the goods back into that batch, an unknown one **creates a new batch** priced from the line, and a blank one uses the default batch;
- `ref_sales_id` optionally names the invoice the goods were sold on (pick it from `GET /dropdown/sales/{customerId}`). It must be the **same customer's** invoice and **not cancelled** (`"Reference invoice belongs to another customer"` / `"Reference invoice is cancelled"`). Leave it out (or `null`) for none.

Like a sale, a saved sales return is **never edited or deleted**, only cancelled.

Permissions: `ViewSalesReturns`, `CreateSalesReturn` (also needed for `generateNumber`), `CancelSalesReturn`

| Method | Path |
|---|---|
| `GET` | `/sales-return/generateNumber` |
| `GET` | `/sales-return` |
| `GET` | `/sales-return/{id}` |
| `POST` | `/sales-return` |
| `POST` | `/sales-return/{id}` (cancel) |

`POST /sales-return`

```json
{
  "date": "2026-10-31",
  "transaction_type": "Cash",
  "customer_id": 6,
  "discount_type": "Flat",
  "discount": 0,
  "sub_total": 100,
  "non_taxable_amount": 0,
  "taxable_amount": 100,
  "total_tax": 13,
  "rounded": false,
  "rounding": 0,
  "grand_total": 113,
  "remarks": "2 damaged bottles",
  "ref_sales_id": 1,
  "salesReturnEntries": [
    { "product_id": 31, "batch_no": "B1", "quantity": 2, "cost_price": 40, "selling_price": 50, "mrp": 55 }
  ]
}
```

On read (`GET /sales-return/{id}`) a return also shows `ref_sales_id` with the invoice's number in `ref_sales_no` (both `null` when it has none), `"cancelled"` and `cancel_remarks`, and each line its `batch_id`, `batch_no` and the batch's `expiry_date`.

### Cancel a sales return

`POST /sales-return/2`

```json
{ "cancel_remarks": "Entered against the wrong customer" }
```

Cancelling takes the returned goods back out of stock (batch by batch), removes the journal and marks the return `"cancelled": true`. Its lines stay. It fails with `"Product Stock is Already Used"` when the returned goods have been sold since, and with `"Sales Return Already Cancelled"` the second time. Reports leave cancelled returns out of their totals.

---

## 12. Payments

Record money **received from a customer** or **paid to a vendor**, and settle credit invoices with it.

### Payment

Permissions:
- **Viewing:** `ViewVendorPayment` **or** `ViewCustomerPayment` (either one gives access to the list and details)
- **Changing:** `CreatePayment` (also needed for `generateNumber`), `EditPayment`, `DeletePayment`

| Method | Path | What it does |
|---|---|---|
| `GET` | `/payment/generateNumber` | Preview the next number (plain text, e.g. `\|P-000001`) |
| `GET` | `/payment` | Paged list (e.g. `?type=Customer`) |
| `GET` | `/payment/{id}` | One payment with the invoices it settled |
| `POST` | `/payment` | Create |
| `PUT` | `/payment/{id}` | Update |
| `DELETE` | `/payment/{id}` | Delete (settled invoices become due again) |

Key fields:
- **`type`** is `Customer` (money in) or `Vendor` (money out). Then send `customer_id` or `vendor_id`.
- **`payment_mode_id`** is the account the money goes into or comes out of, e.g. the `Cash` account or a bank account from the chart of accounts.
- **`paymentDetails`** lists which invoices this payment settles. It can be empty. You can settle them later with [payment adjustment](#payment-adjustment).

**Step 1: See what a customer owes.** `GET /reports/accounting/receivable`

```json
[
  { "party_type": "Customer", "party_id": 6, "party_name": "Ram Traders", "invoice_number": "|SI-000001", "invoice_date": "2026-10-31",
    "total_invoice_amount": 1130.0, "paid_amount": 0.0, "due_amount": 1130.0 }
]
```

**Step 2: Record the payment.** `POST /payment`

```json
{
  "date": "2026-10-31",
  "type": "Customer",
  "customer_id": 6,
  "payment_mode_id": 3,
  "amount": 1500,
  "narration": "",
  "paymentDetails": [
    {
      "invoice_number": "|SI-000001",
      "invoice_date": "2026-10-31",
      "total_invoice_amount": 1130,
      "due_amount": 1130,
      "paid_amount": 1000
    }
  ]
}
```

- If `narration` is empty, it's filled in automatically (`"Payment received from Ram Traders"`).
- The total of `paid_amount` can't be more than `amount`. Each `paid_amount` can't be more than that invoice's due amount.

`GET /payment/1`

```json
{
  "id": 1,
  "date": "2026-10-31",
  "system_entry_no": "|P-000001",
  "type": "Customer",
  "customer_id": 6,
  "customer_name": "Ram Traders",
  "vendor_id": 0,
  "vendor_name": null,
  "payment_mode_id": 3,
  "payment_mode_name": "Cash",
  "amount": 1500.0,
  "total_payment_amount": 1500.0,
  "total_adjusted_paid_amount": 1000.0,
  "unadjusted_amount": 500.0,
  "narration": "Payment received from Ram Traders",
  "paymentDetails": [
    { "id": 1, "master_payment_id": 1, "invoice_number": "|SI-000001", "invoice_date": "2026-10-31",
      "total_invoice_amount": 1130.0, "due_amount": 130.0, "paid_amount": 1000.0 }
  ]
}
```

`unadjusted_amount` is the part of the payment not yet applied to any invoice (an advance).

**Paying a vendor** works the same way. `GET /reports/accounting/payable` lists what you owe (same row shape, with `party_type: "Vendor"`); use the purchase number as the invoice number:

```json
{
  "date": "2026-10-31",
  "type": "Vendor",
  "vendor_id": 6,
  "payment_mode_id": 3,
  "amount": 2000,
  "narration": "Part payment for INV-5501",
  "paymentDetails": [
    { "invoice_number": "|PE-000001", "invoice_date": "2026-10-30", "total_invoice_amount": 5424, "due_amount": 5424, "paid_amount": 2000 }
  ]
}
```

### Payment adjustment

Apply the leftover (`unadjusted_amount`) of an earlier payment to invoices.

Permissions: `ViewPaymentAdjustment`, `CreatePaymentAdjustment`

| Method | Path | What it does |
|---|---|---|
| `GET` | `/payment-adjustment` | Payments that still have unadjusted money |
| `POST` | `/payment-adjustment/{paymentId}` | Apply it to invoices |

`POST /payment-adjustment/1` sends a **list** of invoices:

```json
[
  { "invoice_number": "|SI-000001", "invoice_date": "2026-10-31", "total_invoice_amount": 1130, "due_amount": 130, "paid_amount": 130 }
]
```

---

## 13. Journals and opening balance

### Journal entry (manual accounting entries)

For things that aren't purchases, sales or payments, like expenses or transfers. Each line debits **or** credits one account.

Permissions: `ViewJournalEntries`, `CreateJournalEntry`, `EditJournalEntry`, `DeleteJournalEntry`

| Method | Path | What it does |
|---|---|---|
| `GET` | `/journal` | **All** journal entries, including the automatic ones from purchases, sales and payments (not paged) |
| `POST` | `/journal` | Create |
| `PUT` | `/journal/{id}` | Update |
| `DELETE` | `/journal/{id}` | Delete |

Example: paid a 500 fuel bill in cash. `POST /journal`

```json
{
  "date": "2026-10-31",
  "remarks": "Paid fuel bill in cash",
  "journalEntries": [
    { "account_master_id": 9, "debit_amount": 500, "credit_amount": 0,   "narration": "Fuel for delivery van" },
    { "account_master_id": 3, "debit_amount": 0,   "credit_amount": 500, "narration": "Fuel for delivery van" }
  ]
}
```

(In the starting data, account `9` is *Fuel Expenses* and `3` is *Cash*.)

Rules, checked when you create or update (otherwise **400**):
- there must be at least one line,
- amounts can't be negative,
- the total can't be zero, and
- **total debits must equal total credits** (`"Journal debits and credits must be equal"`).

> Journals created automatically by a purchase, sale or payment are kept in sync when you edit that document. Change them by editing the purchase, sale or payment, not through `/journal`.

### Opening balance

The account balances you start with. There is only **one** opening balance. Saving again **replaces** it.

Permissions: `ViewOpeningBalance`, `CreateOpeningBalance`

| Method | Path | What it does |
|---|---|---|
| `GET` | `/opening-balance` | Current opening balance (empty if not set yet) |
| `POST` | `/opening-balance` | Save (replaces the old one) |

`POST /opening-balance`

```json
{
  "date": "2026-07-17",
  "remarks": "Opening balance FY 2083/84",
  "journalEntries": [
    { "account_master_id": 3,  "debit_amount": 50000, "credit_amount": 0 },
    { "account_master_id": 12, "debit_amount": 0,     "credit_amount": 50000 }
  ]
}
```

Here debits and credits **must** match, or you get `"Opening balance debits and credits must be equal"`.

---

## 14. Reports

All reports are simple `GET` requests that return a list (not paged).

Most accept these optional query parameters:

| Parameter | Meaning |
|---|---|
| `fromDate` | Start date, `YYYY-MM-DD` |
| `toDate` | End date, `YYYY-MM-DD` |
| `dateType` | `AD` (default). `BS` (Nepali calendar) is **not supported yet** and returns an error. |

Leave out the dates to get everything.

| Path | Report | Permission |
|---|---|---|
| `GET /reports/purchase` | Purchase register: one row per purchase | `ViewPurchaseEntry` |
| `GET /reports/purchase/vendor` | Purchases totalled per vendor | `ViewPurchaseEntry` |
| `GET /reports/purchase/product` | Purchases totalled per product | `ViewPurchaseEntry` |
| `GET /reports/purchase/batch` | Purchases totalled per product **batch** | `ViewPurchaseEntry` |
| `GET /reports/purchase-return` | Purchase return register: one row per return | `ViewPurchaseReturn` |
| `GET /reports/purchase-return/vendor` | Purchase returns totalled per vendor | `ViewPurchaseReturn` |
| `GET /reports/purchase-return/product` | Purchase returns totalled per product | `ViewPurchaseReturn` |
| `GET /reports/purchase-return/batch` | Purchase returns totalled per product batch | `ViewPurchaseReturn` |
| `GET /reports/sales` | Sales register: one row per sale, including cancelled ones (`is_cancelled`) | `ViewSalesEntries` |
| `GET /reports/sales/customer` | Sales totalled per customer (cancelled sales left out) | `ViewSalesEntries` |
| `GET /reports/sales/product` | Sales totalled per product (cancelled sales left out) | `ViewSalesEntries` |
| `GET /reports/sales/batch` | Sales totalled per product batch (cancelled sales left out) | `ViewSalesEntries` |
| `GET /reports/sales-return` | Sales return register: one row per return | `ViewSalesReturns` |
| `GET /reports/sales-return/customer` | Sales returns totalled per customer | `ViewSalesReturns` |
| `GET /reports/sales-return/product` | Sales returns totalled per product | `ViewSalesReturns` |
| `GET /reports/sales-return/batch` | Sales returns totalled per product batch | `ViewSalesReturns` |
| `GET /reports/inventory/stock` | Current stock and stock value of every product batch (no dates) | `ViewStockEdit` |
| `GET /reports/accounting/journal` | Every journal line | `ViewAccount` |
| `GET /reports/accounting/ledger/{accountId}` | One account's ledger with running balance | `ViewAccount` |
| `GET /reports/accounting/trial-balance` | Trial balance of all accounts | `ViewAccount` |
| `GET /reports/accounting/receivable` | Accounts receivable: unpaid customer invoices (no dates) | `ViewCustomerPayment` or `ViewAccount` |
| `GET /reports/accounting/payable` | Accounts payable: unpaid vendor invoices (no dates) | `ViewVendorPayment` or `ViewAccount` |

### Examples

`GET /reports/purchase/vendor?fromDate=2026-10-01&toDate=2026-10-31`

```json
[ { "vendor_id": 6, "vendor_name": "ABC Suppliers", "entry_count": 1, "sub_total": 4800.0, "total_tax": 624.0, "grand_total": 5424.0 } ]
```

`GET /reports/sales/product`

```json
[ { "product_id": 31, "product_name": "Coca-Cola 500ml", "quantity": 20.0, "amount": 1000.0 } ]
```

`GET /reports/purchase/batch` — the same totals split by batch. `amount` is quantity × line cost price on purchase-side reports and quantity × line selling price on sales-side reports. `batch_id` 0 is the product's default batch.

```json
[
  { "product_id": 31, "product_name": "Coca-Cola 500ml", "batch_id": 0, "batch_no": null, "expiry_date": null,         "quantity": 10.0,  "amount": 420.0 },
  { "product_id": 31, "product_name": "Coca-Cola 500ml", "batch_id": 1, "batch_no": "B1", "expiry_date": "2027-01-31", "quantity": 120.0, "amount": 4800.0 }
]
```

The return reports (`/reports/purchase-return/…`, `/reports/sales-return/…`) have exactly the same shapes as their purchase and sales counterparts. Like sales, the sales-return register lists cancelled returns too (`is_cancelled`), and the totals leave them out.

`GET /reports/inventory/stock`

```json
[
  { "id": 1, "product_id": 31, "product_name": "Coca-Cola 500ml", "batch_id": 1, "batch_no": "B1", "expiry_date": "2027-01-31", "quantity": 100.0, "cost_price": 42.0, "selling_price": 52.0, "mrp": 56.0, "stock_value": 4200.0 },
  { "id": 2, "product_id": 31, "product_name": "Coca-Cola 500ml", "batch_id": 0, "batch_no": null, "expiry_date": null,         "quantity": 10.0,  "cost_price": 42.0, "selling_price": 52.0, "mrp": 57.0, "stock_value": 420.0 }
]
```

`GET /reports/accounting/payable`

Receivable and payable rows have the same shape; `party_type` tells you which (`Customer` on receivables, `Vendor` on payables) and `party_id` / `party_name` identify them.

```json
[
  { "party_type": "Vendor", "party_id": 6, "party_name": "ABC Suppliers", "invoice_number": "|PE-000001", "invoice_date": "2026-10-30",
    "total_invoice_amount": 5424.0, "paid_amount": 2000.0, "due_amount": 3424.0 }
]
```

`GET /reports/accounting/ledger/3?fromDate=2026-10-01&toDate=2026-10-31` (the Cash account)

```json
{
  "account_id": 3,
  "account_name": "Cash",
  "opening_balance": 50000.0,
  "total_debit": 1726.0,
  "total_credit": 2713.0,
  "closing_balance": 49013.0,
  "rows": [
    { "date": "2026-10-31", "system_entry_no": "|P-000001",  "narration": "Payment received from Ram Traders", "debit_amount": 1500.0, "credit_amount": 0.0,    "balance": 51500.0 },
    { "date": "2026-10-31", "system_entry_no": "|P-000002",  "narration": "Part payment for INV-5501",        "debit_amount": 0.0,    "credit_amount": 2000.0, "balance": 49500.0 },
    { "date": "2026-10-31", "system_entry_no": "|SR-000001", "narration": "2 damaged bottles",                "debit_amount": 0.0,    "credit_amount": 113.0,  "balance": 49387.0 },
    { "date": "2026-10-31", "system_entry_no": "|PR-000001", "narration": "Expired items",                    "debit_amount": 226.0,  "credit_amount": 0.0,    "balance": 49613.0 },
    { "date": "2026-10-31", "system_entry_no": "|J-000001",  "narration": "Fuel for delivery van",            "debit_amount": 0.0,    "credit_amount": 600.0,  "balance": 49013.0 }
  ]
}
```

`GET /reports/accounting/trial-balance?toDate=2026-10-31`

```json
[
  { "account_id": 35, "account_code": null,    "account_name": "ABC Suppliers", "account_type": "Payables",                "total_debit": 2000.0,  "total_credit": 5424.0, "debit_balance": 0.0,     "credit_balance": 3424.0 },
  { "account_id": 3,  "account_code": "C-001", "account_name": "Cash",          "account_type": "Cash & Cash Equivalents", "total_debit": 51726.0, "total_credit": 2713.0, "debit_balance": 49013.0, "credit_balance": 0.0 }
]
```

---

## 15. Users and roles

### Roles

A role is a named set of permissions (operations). Each user has one role.

Permissions: `ViewRole`, `CreateRole`, `EditRole`, `DeleteRole`

| Method | Path | What it does |
|---|---|---|
| `GET` | `/roles` | Paged list (each role includes its operations) |
| `GET` | `/roles/{id}` | One role |
| `GET` | `/roles/operations/{id}` | **Every** operation, grouped by module, with `selected: true` for the ones this role has. Handy for a permissions checkbox screen. |
| `POST` | `/roles` | Create |
| `PUT` | `/roles/{id}` | Update |
| `DELETE` | `/roles/{id}` | Delete |

**Step 1: Find the operation IDs.** `GET /roles/operations/1` (role 1 is Admin, which has all of them):

```json
[
  {
    "master_module": "Masters",
    "modules": [
      {
        "module_name": "Category",
        "operations": [
          { "id": 1, "name": "CreateCategory", "selected": true },
          { "id": 2, "name": "ViewCategory",   "selected": true },
          { "id": 3, "name": "EditCategory",   "selected": true },
          { "id": 4, "name": "DeleteCategory", "selected": true }
        ]
      }
    ]
  }
]
```

**Step 2: Create the role with the operations you want.** `POST /roles`

```json
{
  "name": "Store Keeper",
  "description": "Can view products and categories",
  "is_active": true,
  "operation_ids": [2, 18]
}
```

### Users

Permissions: `ViewUser`, `CreateUser`, `EditUser`, `DeleteUser`

| Method | Path | What it does |
|---|---|---|
| `GET` | `/users` | Paged list |
| `GET` | `/users/{id}` | One user (password is never returned) |
| `POST` | `/users` | Create (**multipart form**, see below) |
| `PUT` | `/users/{id}` | Update (**multipart form**) |
| `DELETE` | `/users/{id}` | Delete |

Creating and updating a user is a **`multipart/form-data`** request, so a profile picture can be uploaded at the same time. It has two parts:

- **`user`**: the user details as JSON (required)
- **`image`**: the picture file (optional)

```bash
curl -X POST http://localhost:8080/users \
  -H "Authorization: Bearer $TOKEN" \
  -F 'user={"username":"sita","full_name":"Sita Sharma","email":"sita@example.com","password":"Sita@123","gender":"Female","contact":"9800000003","is_active":true,"role_id":2};type=application/json' \
  -F "image=@./photo.png;type=image/png"
```

- **On update:** leave `password` empty (`""`) to keep the current password. Leave out `image` to keep the current picture.
- Username and email must be unique, or you get **409**.
- **The image must be a `.jpg`, `.jpeg`, `.png`, `.gif` or `.webp` file**, or you get **400**.
- The image is saved under a new unique name in the `users/` folder inside the upload folder (`FILE_UPLOAD_DIR`). Uploading a new picture deletes the old one, and so does deleting the user.

`GET /users/2`

```json
{
  "id": 2,
  "username": "sita",
  "full_name": "Sita Sharma",
  "email": "sita@example.com",
  "password": "",
  "gender": "Female",
  "contact": "9800000003",
  "remarks": null,
  "is_active": true,
  "role_id": 2,
  "role_name": "Store Keeper",
  "image_url": "/uploads/users/2213e38f-5743-46b0-9afe-9f716200393b.png"
}
```

To show the picture, request `image_url` from the server, e.g. `GET http://localhost:8080/uploads/users/2213e38f-5743-46b0-9afe-9f716200393b.png`. This also needs the `Authorization` header.

---

## 16. A typical first run

The order to set things up on a fresh database:

1. **Log in:** `POST /login`
2. **Set company details:** `PUT /configurations/edit`
3. **Create masters:** units, categories, packings, tax types (`/master/...`)
4. **Create products:** `POST /products`
5. **Add vendors and customers:** `POST /vendor`, `POST /customer`
6. **Enter what you already have:**
   - opening stock: `POST /opening-stock`
   - opening account balances: `POST /opening-balance`
7. **Day-to-day work:**
   - buying: `POST /purchase`
   - selling: `POST /sales`
   - collecting or paying money: `POST /payment`
   - fixing stock: `POST /stock-adjustment`
   - other expenses: `POST /journal`
8. **Check the numbers** with the [reports](#14-reports).
