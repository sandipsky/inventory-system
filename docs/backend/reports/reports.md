# Reports — Backend

> Part of the Inventory System implementation guide. Read `docs/BRD.md` for the business picture and `docs/backend/backend-setup.md` for how the backend is organised.

## 1. What this is

The reports answer "what happened" questions over the documents the rest of the system saved: which purchases were made in a month, how much was sold per customer, what each product batch is worth, what every account's balance is. A report is a plain `GET` that returns the whole result as a list (never paged). The page does its own search, sort and totals, and the same list can be downloaded as an Excel or PDF file with the page's search and sort applied. Nothing is written: every report is read-only and lives in `features/reports/`.

## 2. Where the code lives

All packages are under `features/reports/`. Each document kind has its own package with the same four parts.

| File or folder | What is in it |
|---|---|
| `purchase/`, `purchase_return/`, `sales/`, `sales_return/` | One `…ReportController`, `…ReportService`, `…ReportRepository` (the JPQL queries) and four DTOs each: a register row, and by-party, by-product, by-batch totals |
| `inventory/` | `ProductStockReportController`, `ProductStockReportService`, `ProductStockReportRowDTO`: the stock report |
| `accounting/controllers/AccountingReportController.java` | Journal, ledger, trial balance, receivable and payable, plus their exports |
| `accounting/services/AccountingReportService.java` | The ledger running balance and the trial balance sides |
| `accounting/services/LedgerExport.java` | Builds the ledger file (opening line, running balance, Dr/Cr) |
| `accounting/repositories/AccountingReportRepository.java` | JPQL over `JournalEntry`, `MasterJournalEntry`, `AmountDueInvoice` |
| `accounting/dtos/` | `JournalReportRowDTO`, `LedgerReportDTO` + `LedgerReportRowDTO`, `TrialBalanceRowDTO`, `OutstandingInvoiceReportRowDTO` |
| `export/ReportExportService.java` | Turns any report list into a file: server-side `search`, `sort`, totals, Status column |
| `export/ReportColumn.java`, `export/ReportColumns.java` | The columns of every report file, mirroring the web app's `REPORTS` config |
| `common/util/ReportDateUtil.java` | The `dateType` check (AD only) |
| `common/export/` | The generic Excel/PDF writers; see `docs/backend/export-print/export-print.md` |

## 3. Data

Reports read the tables other features write (see `backend/database.sql`); they have no table of their own.

| Table | Columns the reports use |
|---|---|
| `master_purchase_entry`, `master_purchase_return` | `date`, `system_entry_no`, `bill_no`, `transaction_type`, `sub_total`, `discount`, `non_taxable_amount`, `taxable_amount`, `total_tax`, `grand_total`, `vendor_id` |
| `master_sales_entry`, `master_sales_return` | The same without `bill_no`, plus `is_cancelled` and `customer_id` |
| `purchase_entry`, `purchase_return_entry`, `sales_entry`, `sales_return_entry` | `quantity`, `cost_price`, `selling_price`, `product_id`, `batch_id` → `product_stock.id`, and the master id |
| `product_stock` | One row per product batch: `batch_no` (null = the default batch), `expiry_date`, `quantity`, `cost_price`, `selling_price`, `mrp` |
| `master_journal_entry`, `journal_entry` | A journal (`date`, `system_entry_no`) and its lines (`account_master_id`, `narration`, `debit_amount`, `credit_amount`) |
| `account_master` | `account_code`, `account_name`, `account_type` |
| `amount_due_invoice` | `invoice_number` (= a sale's or purchase's `system_entry_no`), `total_invoice_amount`, `paid_amount`, `due_amount` |

Dates are `YYYY-MM-DD` text, so `>=` and `<=` on them order correctly without parsing.

## 4. API

Every report takes optional `fromDate`, `toDate` and `dateType` (default `AD`) unless marked "no dates". Each is guarded with `@RequiresOperation`; the receivable and payable need **any one** of their three operations.

| Method | Path | What it does | Permission needed |
|---|---|---|---|
| GET | `/reports/purchase` | Purchase register, one row per purchase | `ViewPurchaseEntry` |
| GET | `/reports/purchase/vendor` · `/product` · `/batch` | Purchases totalled per vendor / product / product batch | `ViewPurchaseEntry` |
| GET | `/reports/purchase-return`, `…/vendor` · `/product` · `/batch` | The same four for purchase returns | `ViewPurchaseReturn` |
| GET | `/reports/sales`, `…/customer` · `/product` · `/batch` | The same four for sales; the register keeps cancelled sales (`is_cancelled`), the totals leave them out | `ViewSalesEntries` |
| GET | `/reports/sales-return`, `…/customer` · `/product` · `/batch` | The same four for sales returns, cancelled ones handled like sales | `ViewSalesReturns` |
| GET | `/reports/inventory/stock` | Every product batch with its stock and stock value (no dates) | `ViewStockEdit` |
| GET | `/reports/accounting/journal` | Every journal line in the range | `ViewAccount` |
| GET | `/reports/accounting/ledger/{accountId}` | One account: opening balance, lines with running balance, totals | `ViewAccount` |
| GET | `/reports/accounting/trial-balance` | Every account's debit/credit totals and balance for the range | `ViewAccount` |
| GET | `/reports/accounting/receivable` | Unpaid customer invoices (no dates) | `ViewCustomerPayment`, `ViewAccount` or `CreatePaymentAdjustment` |
| GET | `/reports/accounting/payable` | Unpaid vendor invoices (no dates) | `ViewVendorPayment`, `ViewAccount` or `CreatePaymentAdjustment` |
| GET | `<any report path>/export/{format}` | The same rows as a file; adds `search` and `sort` | The report's permission |

Export paths: the document reports use `/reports/purchase/export/{format}` for the register and `/reports/purchase/{report}/export/{format}` with `report` = `vendor`, `product` or `batch` (same for the other three kinds; an unknown `report` is a 404 `"Report not found"`). The accounting ones are `/reports/accounting/journal/export/{format}`, `/ledger/{accountId}/export/{format}`, `/trial-balance/export/{format}`, `/receivable/export/{format}`, `/payable/export/{format}`; stock is `/reports/inventory/stock/export/{format}`. `{format}` is `excel` or `pdf`. Response shapes are in section 14 of `backend/endpoints.md`.

Field names are snake_case (`system_entry_no`, `grand_total`, `is_cancelled`). `batch_id` `0` means the product's default batch.

## 5. How it works

### 5.1 The shared shape: dates and `dateType`

**Idea.** Every report method starts with `ReportDateUtil.validateDateType(dateType)` and then runs one JPQL query whose date filter is optional on both ends. BS (the Nepali calendar) is "reserved for later": the code rejects it explicitly rather than silently returning AD data under a BS label.

```
report(fromDate, toDate, dateType):
  validate dateType                                  -- null, "" or "AD" pass
  run query with (:fromDate IS NULL OR m.date >= :fromDate)
             AND (:toDate   IS NULL OR m.date <= :toDate)
  map entities to row DTOs (registers) or let JPQL build the DTOs (totals)
```

**Rules checked**

- `dateType=BS` → **400** `"BS dates are not supported yet. Use dateType=AD"`
- any other value → **400** `"dateType must be either AD or BS"`

### 5.2 Registers: one row per document

**Idea.** A register is just the master table in date order. The query selects the entity (`SELECT m FROM MasterPurchaseEntry m … ORDER BY m.date, m.id`) and the service copies the fields into a row DTO, so the JSON stays flat (`vendor_name` instead of a nested vendor). `discount` is copied as stored: what the user typed, a percent or an amount depending on `discount_type`; the discount *amount* is derived only in the file export (5.10).

| Register | Row fields |
|---|---|
| Purchase, purchase return | `id`, `date`, `system_entry_no`, `bill_no`, `vendor_name`, `transaction_type`, `sub_total`, `discount`, `non_taxable_amount`, `taxable_amount`, `total_tax`, `grand_total` |
| Sales, sales return | As above without `bill_no`, with `customer_name` and `is_cancelled` |

### 5.3 Totals per party, product and batch

**Idea.** These are `GROUP BY` queries that build the DTO straight from JPQL (`SELECT new …DTO(...)`), so there is no Java loop. Three groupings, same pattern on all four document kinds:

```
by party   : FROM Master m JOIN m.vendor v   (or m.customer c)
             SELECT v.id, v.name, COUNT(m), SUM(m.subTotal), SUM(m.totalTax), SUM(m.grandTotal)
             GROUP BY v.id, v.name  ORDER BY v.name
by product : FROM Line pe JOIN pe.product p, Master m  WHERE pe.masterId = m.id
             SELECT p.id, p.name, SUM(pe.quantity), SUM(pe.quantity * <price>)
             GROUP BY p.id, p.name  ORDER BY p.name
by batch   : as by product, plus LEFT JOIN pe.batch b
             SELECT …, CASE WHEN b.batchNo IS NULL THEN 0 ELSE b.id END, b.batchNo, b.expiryDate, …
             GROUP BY p.id, p.name, b.id, b.batchNo, b.expiryDate  ORDER BY p.name, b.batchNo
```

- `<price>` is the line's **cost price** on the purchase side (`pe.costPrice`, purchases and purchase returns) and the line's **selling price** on the sales side (`se.sellingPrice`, sales and sales returns). So `amount` = quantity × what the goods were bought or sold at on that line, not the product's current price.
- The master is joined through the line's foreign-key field (`pe.masterPurchaseEntryId = m.id`) because the line entity stores the id, not a relation.
- The batch join is a `LEFT JOIN` and the id is `0` when `batchNo` is null, which is how the whole API addresses the product's default batch (`ProductStockService.batchId`). The response fields are `product_id`, `product_name`, `batch_id`, `batch_no`, `expiry_date`, `quantity`, `amount`.
- Party totals return `entry_count` (a `COUNT`, so a `Long`), `sub_total`, `total_tax`, `grand_total`.

### 5.4 Cancelled sales and sales returns

**Idea.** Sales and sales returns are never deleted, only cancelled (the document keeps its lines and a reason). A register must still show them, because they exist and have numbers, but they must count for nothing. So the register queries have no cancel filter and the row carries `is_cancelled`, while every totals query on the sales side adds `AND m.isCancelled = false`. Purchases and purchase returns have no such flag: they are deleted outright, so the question never arises.

### 5.5 The stock report

**Idea.** There is no stock ledger: `product_stock` *is* the current stock, one row per batch. The report lists `productStockRepository.findAll()` and adds a value per row.

```
for each ProductStock batch:
  batch_id   = batchNo == null ? 0 : batch.id
  stock_value = (quantity or 0) * (cost_price or 0)
```

Fields: `id`, `product_id`, `product_name`, `batch_id`, `batch_no`, `expiry_date`, `quantity`, `cost_price`, `selling_price`, `mrp`, `stock_value`. No dates, no ordering clause, permission `ViewStockEdit`.

### 5.6 Journal report

**Idea.** One row per journal *line*, joined to its account and its journal header, so the file reads like a day book. Order is `mje.date, mje.id, je.id`: by date, then by journal, then lines in the order they were saved.

Fields: `date`, `system_entry_no`, `account_name`, `narration`, `debit_amount`, `credit_amount`.

### 5.7 Ledger: opening balance and running balance

**Idea.** A ledger shows one account's lines with the balance *after each line*. Lines before `fromDate` are not listed, but their effect must carry in as the opening balance, otherwise the running balance would be wrong. The API keeps one sign convention everywhere: **positive is a debit balance, negative a credit balance**; the Dr/Cr label is the client's (or the file's) job.

```
ledger(accountId, fromDate, toDate):                          -- read only, no transaction needed
  account = find by id                                        -> 404 "Account not found"
  opening = 0
  if fromDate given:
      opening = SUM(debit) - SUM(credit) of the account's lines WHERE mje.date < fromDate   (COALESCE to 0)
  rows = the account's lines in range, ORDER BY mje.date, mje.id, je.id
  running = opening; totalDebit = 0; totalCredit = 0
  for each row:
      debit  = row.debit_amount  or 0
      credit = row.credit_amount or 0
      running     += debit - credit
      totalDebit  += debit;  totalCredit += credit
      row.balance  = running
  return { account_id, account_name, opening_balance, total_debit, total_credit,
           closing_balance = running, rows }
```

Without a `fromDate` the opening balance is 0 and the rows run from the first journal ever, so "closing" is the account's balance to `toDate`.

### 5.8 Trial balance

**Idea.** One `GROUP BY` over every account that has lines in the range, then a tiny Java pass to split the net into the two balance columns. The query **sums movements inside the range**, it does not carry an opening balance; that is why the web app sends only `toDate` (an "as of" report), so the sum runs from the beginning and the result is a true balance. Sending a `fromDate` turns it into a movements-in-period table.

```
trial_balance(fromDate, toDate):
  rows = SELECT a.id, a.accountCode, a.accountName, a.accountType,
                COALESCE(SUM(je.debitAmount), 0), COALESCE(SUM(je.creditAmount), 0)
         FROM JournalEntry je JOIN je.masterAccount a, MasterJournalEntry mje
         WHERE je.masterJournalEntryId = mje.id AND <date range>
         GROUP BY a.id, a.accountCode, a.accountName, a.accountType ORDER BY a.accountName
  for each row:
      net = total_debit - total_credit
      debit_balance  = net > 0 ?  net : 0
      credit_balance = net < 0 ? -net : 0
```

An account with no lines in the range does not appear at all (the join starts from the lines, not the accounts). Fields: `account_id`, `account_code`, `account_name`, `account_type`, `total_debit`, `total_credit`, `debit_balance`, `credit_balance`.

### 5.9 Receivable and payable

**Idea.** `amount_due_invoice` already tracks what is still owed on each credit document (the document services create it, payments reduce it). The report only needs to attach the party and date, which live on the document, so it joins by number: `adi.invoiceNumber = m.systemEntryNo`. Receivables join `MasterSalesEntry` + customer and label the row `'Customer'`; payables join `MasterPurchaseEntry` + vendor and label it `'Vendor'`. Both keep `adi.dueAmount > 0` and order by party name, then date. One DTO serves both: `party_type`, `party_id`, `party_name`, `invoice_number`, `invoice_date`, `total_invoice_amount`, `paid_amount`, `due_amount`.

**Why three permissions.** These two lists are not only reports: the payment form reads them to show which invoices a payment can settle, and the payment-adjustment drawer reads them to settle a payment's unadjusted amount later. A clerk whose role has only `ViewCustomerPayment` (to record receipts) or only `CreatePaymentAdjustment` (to adjust them) must be able to read the list without `ViewAccount`, so the annotation lists all three and any one grants access.

### 5.10 Exporting a report (`search`, `sort`, totals)

**Idea.** Reports come back whole and the page filters and sorts them in the browser, so the file must do the same filtering and sorting *on the server* from the same two parameters, or the file would not match the screen. `ReportExportService.file(...)` does that generically for any report: it converts each DTO to a `Map` with Jackson (so column keys are the JSON names), applies `search` and `sort`, and declares the table for the common writer.

```
file(format, title, range, columns, rows, params):
  rows   = each DTO -> Map<String,Object> (JSON field names)
  search = params.search trimmed; rows = rows whose TEXT, DOC_NO or BATCH cell contains it (ignore case)
  sort   = params.sort as "key:asc|desc"; key must be a column key, else leave the order as is
           blanks last; numbers by value; text "naturally" (digit runs compared as numbers: PE-2 < PE-10)
  table  = ExportTable.of(title)
           range PERIOD -> details From/To from params; AS_OF -> "As of" toDate; NONE -> "As of" today
           detail "Search: <search>" when given
           one column per ReportColumn (header, format, cell reader); .total() where the column is totalled
           if any row has an is_cancelled key: cancelledWhen(is_cancelled) + a "Status" column ("Cancelled" or "")
  return files.table(format, fileName(title lower-cased), table, params)     -- e.g. purchase-register-2026-11-03.xlsx
```

`ReportColumns` declares the layouts; a `ReportColumn` has a `kind` (`TEXT`, `DOC_NO` shown through the doc-number format, `BATCH` shown as "Default batch" when blank, `AMOUNT`, `NUMBER`, `DATE`), a `totalled()` flag and an optional `derived` reader. Only the register's **Discount** is derived: `DocumentParts.discountAmount(sub_total, taxable_amount, non_taxable_amount)` = `max(round2(sub_total − taxable_amount − non_taxable_amount), 0)`, because `discount` holds what was typed.

| Report | Columns (totalled ones marked *) |
|---|---|
| Register | Date, Entry No, Bill No (vendor side only), Vendor/Customer, Type, Gross Amt.*, Discount* (derived), Non-Taxable*, Taxable*, Tax*, Net Amt.* |
| By party | Vendor/Customer, Entries*, Gross Amt.*, Tax*, Net Amt.* |
| By product | Product, Quantity, Amount* |
| By batch | Product, Batch, Expiry Date, Quantity, Amount* |
| Stock | Product, Batch, Expiry Date, In Stock, Cost Price, Selling Price, MRP, Stock Value* |
| Journal | Date, Entry No, Account, Narration, Debit*, Credit* |
| Trial balance | Code, Account, Account Type, Total Debit*, Total Credit*, Debit Balance*, Credit Balance* |
| Receivable / payable | Customer/Vendor, Invoice Date, Invoice No, Invoice Amt.*, Paid*, Due* |

The ledger is the one report with its own builder, `LedgerExport.table(ledger, fromDate, toDate)`, because its first row is not a journal line:

```
lines = [opening line] + ledger.rows numbered 1..n           -- table is unnumbered(); S.N is its own column
columns: S.N, Date, Entry No, Narration ("Opening Balance" on the first line),
         Debit (total), Credit (total),
         Balance = |running balance|, totals row shows |closing|,
         Dr/Cr   = "Dr" if balance > 0.005, "Cr" if < -0.005, else "", totals row shows the closing side
file name: ledger-<account name>-<today>
```

**Rules checked**

- `{format}` not `excel` or `pdf` → **400** `"Export format must be excel or pdf"`
- unknown `{report}` segment on a document report → **404** `"Report not found"`

## 6. Design decisions and gotchas

- **Whole lists, no paging.** A report is a snapshot for reading or printing; paging would move search, sort and totals to the server for every page. The trade-off is memory for very large ranges, accepted for this size of business.
- **Totals in JPQL, balances in Java.** Grouping and summing belong in the database; the ledger's running balance and the trial balance's Dr/Cr split are one linear pass that JPQL cannot express cleanly.
- **Positive = debit** on every balance the API returns. The file and the page add the Dr/Cr label; keeping the sign on the server keeps arithmetic in one place.
- **Trial balance has no opening balance.** Send only `toDate` for a true balance. The web app's `asOf` range does exactly that.
- **Only accounts with lines appear** in the trial balance; an unused account is simply absent, not shown with zeros.
- **`batch_id` 0** is the default batch everywhere, including the by-batch reports, so the client can link to `GET /products/stockInfo/{id}` consistently.
- **`amount` on product and batch totals uses the line's price**, not the product master's, so an old purchase keeps its historical cost.
- **Cancelled rows stay in registers** and are dropped from totals both in JSON (query filter) and in files (`cancelledWhen`, Status column); the register's `is_cancelled` key is what switches the Status column on.
- **Search ignores figures and dates** on purpose, as the page does; a search for "2026" finds a narration, not a date.
- **Sort is one column only.** The page sorts one column at a time; the service parses only the first `key:dir` pair.
- **`dateType` is validated but unused**; it exists so the client already sends it and BS support can be added without an API change.

## 7. Build it yourself: order of work

1. Make sure the document, journal and `amount_due_invoice` tables and entities exist (they belong to the purchase, sales, accounting and payment features).
2. Add `common/util/ReportDateUtil.validateDateType` with the two messages above.
3. For purchases: write `PurchaseReportRepository` with the four JPQL queries (register, by vendor, by product, by batch) and the three constructor DTOs (`@AllArgsConstructor`, snake_case `@JsonProperty`). Note `COUNT` returns `Long`, `SUM` returns `Double`.
4. Write `PurchaseReportService` (validate, query, map the register entity to a flat row) and `PurchaseReportController` with `@RequiresOperation("ViewPurchaseEntry")` on every method.
5. Copy the pattern for purchase returns, sales and sales returns; on the sales side add `is_cancelled` to the row and `m.isCancelled = false` to the three totals queries.
6. Add the stock report over `ProductStockRepository.findAll()` with `stock_value`.
7. Add `AccountingReportRepository` (journal, ledger rows, opening balance, trial balance, receivables, payables) and `AccountingReportService` with the two loops from 5.7 and 5.8; guard receivable/payable with the three-operation annotation.
8. Add `ReportColumn`, `ReportColumns` and `ReportExportService` on top of `common/export`, then an `/export/{format}` method per controller and `LedgerExport` for the ledger.
9. Try it: `GET /reports/purchase/vendor?fromDate=2026-10-01&toDate=2026-10-31`, then `GET /reports/accounting/trial-balance?toDate=2026-10-31` and check that total debit equals total credit; then `GET /reports/sales/export/pdf?sort=grand_total:desc&search=ram` and open the file.
