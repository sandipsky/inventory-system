# Export and Print — Backend

> Part of the Inventory System implementation guide. Read `docs/BRD.md` for the business picture and `docs/backend/backend-setup.md` for how the backend is organised.

## 1. What this is

Every Export (Excel) and Print (PDF) button in the web app downloads a file the API builds. There are three shapes: a **list** (every row a list's filters match, with totals), **one document** (an invoice, voucher or receipt with its lines and totals), and a **range print** (every document of a period in one PDF, one per page). Every file carries the company letterhead from the settings, says who printed it and when, and writes its dates in the AD or BS calendar. The web app never builds a file or calls `window.print()`; a feature only *declares* what its table or document contains and the common layer renders either format.

## 2. Where the code lives

| File or folder | What is in it |
|---|---|
| `common/export/ExportService.java` | The three entry points (`table`, `document`, `documents`), the letterhead/calendar context, the download response |
| `common/export/ExportFormat.java` | `EXCEL` (`.xlsx`) and `PDF`; parses the `{format}` segment |
| `common/export/ExportTable.java` | A declared table: columns, rows, cancelled flags, totals; built with its `Builder` |
| `common/export/Field.java`, `CellFormat.java` | A labelled value (heading lines, document boxes); how a cell is written: `TEXT`, `NUMBER`, `AMOUNT`, `DATE` |
| `common/export/Formats.java` | Values as the web app shows them: amount grouping, number, doc number, batch name, safe file names |
| `common/export/PrintDocument.java`, `DocumentParts.java`, `InvoiceLine.java` | One printable document and the pieces invoice-like prints share |
| `common/export/ExcelFile.java` | Writes a table or document as `.xlsx` with Apache POI (`poi-ooxml` 5.4.1) |
| `common/export/PdfFile.java` | Writes a table or documents as A4 PDF with OpenPDF (`com.github.librepdf:openpdf` 2.0.5) |
| `common/export/ExportContext.java` | Letterhead, calendar (`bs` flag), `printedBy`, `printedAt`; converts dates via `common/util/BsDateUtil.java` |
| `common/util/QueryParamUtil.java` | `allRows(params)` (paging off) and `toFilterParams` (drops `pageIndex`, `pageSize`, `sort`, `calendar`) |
| `features/<feature>/…/services/<Feature>ExportService.java` | One per feature: declares its list table and its print document (worked example: `features/purchase/purchase_entry/services/PurchaseEntryExportService.java`) |
| `features/reports/export/` | `ReportExportService`, `ReportColumn`, `ReportColumns`: report files with the page's search and sort (see `docs/backend/reports/reports.md`) |

## 3. Data

No table of its own. `ExportService` reads `configuration` for the letterhead and calendar; feature export services read their own tables through their existing services and repositories.

| `configuration.name` | Used for |
|---|---|
| `company_name` | First letterhead line (default `Company` when blank) |
| `company_address` | Second line |
| `company_contact`, `company_email` | One line: `Phone: …   \|   Email: …` (either half left out when blank) |
| `company_reg_type`, `company_reg` | `<reg type>: <number>`, e.g. `PAN: 3872378734`; the label defaults to `Reg.` |
| `calendar_type` | `AD` or `BS`, when the request sends no `calendar` |

## 4. API

All are `GET`s that answer with a file (`Content-Disposition: attachment; filename="…"`) and need the same **View** operation as the list, record or report they read. Errors are the usual JSON error body. Section 18 of `backend/endpoints.md` lists every path.

| Method | Path | What it does | Permission needed |
|---|---|---|---|
| GET | `/<list>/export/{format}` | Every row the list's query matches (filters, `fromDate`/`toDate`, `sort`; paging ignored) | the list's View operation |
| GET | `/<document>/{id}/export/{format}` | One document: PDF prints it, Excel lists its details and lines; named by its number (`PE-000001.pdf`) | the document's View operation |
| GET | `/<document>/print?fromDate=&toDate=` | Every document in the range in one PDF, oldest first, one per page | the document's View operation (payments: `ViewVendorPayment` or `ViewCustomerPayment`) |
| GET | `/reports/<report>/export/{format}` | A report with the page's `search` and `sort` | the report's permission |

Lists: `/purchase`, `/purchase-return`, `/sales`, `/sales-return`, `/payment` (`type=Vendor` or `Customer`), `/payment-adjustment`, `/journal`, `/stock-adjustment`, `/opening-stock`, `/stock-edit`, `/products`. Documents: `/purchase`, `/purchase-return`, `/sales`, `/sales-return`, `/payment`, `/journal`, `/stock-adjustment`. Range print: `/purchase`, `/purchase-return`, `/sales`, `/sales-return`, `/payment`.

Query parameters that matter: `{format}` = `excel` or `pdf`; `calendar` = `AD` or `BS` (else the `calendar_type` setting); otherwise the list's own parameters. Content types: `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` for `.xlsx`, `application/pdf` for `.pdf`.

**Rules checked**

- `{format}` anything else → **400** `"Export format must be excel or pdf"`
- a range print with no documents → **404** with the feature's message: `"No purchases in this period"`, `"No purchase returns in this period"`, `"No sales in this period"`, `"No sales returns in this period"`, `"No payments in this period"`
- one document that doesn't exist → **404**, e.g. `"Purchase Entry with Given Id not found"`, `"Sales Entry with Given Id not found"`

## 5. How it works

### 5.1 The design: declare, don't render

**Idea.** Writing Excel and PDF is fiddly and identical for every feature. So the feature's export service only says *what* is in the table, column by column, as a header, a cell format and a function that reads the cell from a row object. The common layer turns that declaration into either file: typed Excel cells with a filter and a frozen header, or an A4 PDF that goes landscape when the table is wide. A new export is therefore a table declaration and two controller lines, nothing else.

```
ExportTable.<Row>of("Purchases")                   -- the title
    .period(fromDate, toDate)                      -- "From: … To: …" under the title, blanks left out
    .detail(Field.text("Search", search))          -- any other heading line
    .text("Vendor Name", Row::getVendorName)       -- a TEXT column
    .date("Posting Date", Row::getDate)            -- DATE: written in the file's calendar
    .number("Qty", Row::getQuantity)               -- NUMBER: no trailing zeros
    .amount("Net Amount", Row::getGrandTotal).total()   -- AMOUNT, two decimals; .total() sums it in the totals row
    .amount("Balance", …).totalAs(closing)         -- or show a given value in the totals row instead of a sum
    .cancelledWhen(Row::isCancelled)               -- rows kept, marked, left out of every total
    .unnumbered()                                  -- no running S.N column (default: numbered)
    .build(rows)
```

`build` applies every reader to every row once, storing plain cells (`List<List<Object>>`) plus a cancelled flag per row; writers never see the feature's types. `totals()` sums each `.total()` column over the **non-cancelled** rows (`MoneyUtil.round2`), shows a `totalAs` value where given, and writes `Total` in the first column that is neither. `hasTotals()` is false for an empty table, so no totals row appears under "No records.".

### 5.2 `ExportService`: context and response

**Idea.** One service owns the three entry points so every file gets the same letterhead, calendar, file naming and HTTP headers.

```
table(format, name, table, params):        -- a list or a report
  type    = ExportFormat.of(format)                                -> 400 "Export format must be excel or pdf"
  context = context(params)
  bytes   = EXCEL ? ExcelFile.table(table, context) : PdfFile.table(table, context)
  return download(type, name + "-" + context.today(), bytes)       -- purchases-2083-07-16.xlsx

document(format, printDocument, params):   -- one document
  bytes = EXCEL ? ExcelFile.document(doc, context) : PdfFile.documents([doc], context)
  return download(type, Formats.fileName(Formats.docNo(doc.number)), bytes)   -- PE-000001.pdf

documents(name, printDocuments, emptyMessage, params):   -- a range print, PDF only
  if empty: throw ResourceNotFoundException(emptyMessage)          -> 404 "No sales in this period"
  return download(PDF, name + "-" + context.today(), PdfFile.documents(docs, context))   -- sales-invoices-2083-07-16.pdf

context(params):
  settings = every configuration row with a non-blank value, trimmed
  calendar = params.calendar, else settings.calendar_type
  lines    = [company_address], ["Phone: x   |   Email: y"], ["<company_reg_type or Reg.>: <company_reg>"]  (blank ones dropped)
  return ExportContext(company_name or "Company", lines, bs = calendar equals "BS" (ignore case),
                       printedBy = the authenticated username, printedAt = now)

download(type, name, bytes):
  200, Content-Type = type.mediaType, Content-Disposition = attachment; filename="<name>.<xlsx|pdf>", body = bytes
```

`ExportContext.date(value)` returns the ISO date as is for AD, or `BsDateUtil.toBs(iso)` for BS (falling back to AD when the BS table doesn't cover the year). `BsDateUtil` converts by counting days from BS 2000-01-01 (= AD 1943-04-14) through a per-year month-length table covering BS 2000–2090, the same table the web app's date pickers use, so a printed date matches the screen. `printedLine()` is `"Printed by admin on 2083-07-16 10:30 (BS)"`.

### 5.3 The worked example: purchases

`PurchaseEntryExportService` has the three methods every document feature has: `list`, `document`, `documents`.

```
list(params):                                    -- GET /purchase/export/{format}
  rows = purchaseEntryService.getPaginatedMasterPurchaseEntrysList(QueryParamUtil.allRows(params)).getContent()
         -- allRows sets pageIndex=0 and pageSize=Integer.MAX_VALUE: same filters, dates and sort as the list, no paging
  return ExportTable.of("Purchases").period(fromDate, toDate)
     .text  ("Purchase Number", docNo(system_entry_no))
     .date  ("Posting Date", date)     .text("Vendor Name", vendor_name)
     .text  ("Bill Number", bill_no)   .date("Bill Date", bill_date)   .text("Transaction Type", transaction_type)
     .amount("Gross Amount", sub_total).total()
     .amount("Discount", DocumentParts.discountAmount(sub_total, taxable_amount, non_taxable_amount)).total()
     .amount("Tax Amount", total_tax).total()
     .amount("Net Amount", grand_total).total()
     .build(rows)

document(id):                                    -- GET /purchase/{id}/export/{format}, @Transactional(readOnly = true)
  purchase = repository.findById(id)             -> 404 "Purchase Entry with Given Id not found"
  return print(purchase)

documents(params):                               -- GET /purchase/print, read-only transaction
  spec = SpecificationBuilder.buildSpecification(QueryParamUtil.toFilterParams(params))
         -- fromDate/toDate become inclusive bounds on `date`; pageIndex, pageSize, sort, calendar are dropped
  return repository.findAll(spec, Sort.by("date", "id")).map(print)      -- oldest first

print(purchase):
  lines = each line -> InvoiceLine.of(product, batch, quantity, rate = cost_price, mrp, selling_price)
  return PrintDocument(
     title   = "Purchase Invoice",
     number  = system_entry_no,                  -- names the file
     stamp   = null,                             -- "CANCELLED" on a cancelled sale or sales return
     party   = DocumentParts.party("Vendor", name, address, contact, registration_number),
     details = present(Purchase No., Date, Bill No., Bill Date, Transaction Type),   -- blank ones left out
     lines   = InvoiceLine.table(lines, withSellingPrice = true),
     summary = DocumentParts.summary(sub_total, discount, discount_type, non_taxable, taxable, tax, rounding, grand_total),
     notes   = present(Remarks))
```

The controller is three one-liners, each `@RequiresOperation("ViewPurchaseEntry")`:

| Route | Call |
|---|---|
| `GET /purchase/export/{format}` | `files.table(format, "purchases", exportService.list(params), params)` |
| `GET /purchase/print` | `files.documents("purchase-invoices", exportService.documents(params), "No purchases in this period", params)` |
| `GET /purchase/{id}/export/{format}` | `files.document(format, exportService.document(id), params)` |

The read-only transaction on `document`/`documents` keeps the lazy relations (vendor, lines, products, batches) loadable while the print is built.

### 5.4 The shared document pieces

`PrintDocument(title, number, stamp, party, details, lines, summary, notes)` is what a print needs. `DocumentParts` and `InvoiceLine` keep the invoice-like documents identical:

| Helper | What it gives |
|---|---|
| `party(label, name, address, contact, registration)` | The party box: the label line, then `Address`, `Contact`, `PAN/VAT No.` when present |
| `discountAmount(subTotal, taxable, nonTaxable)` | `max(round2(subTotal − taxable − nonTaxable), 0)`, because `discount` holds what was typed (percent or amount) |
| `summary(subTotal, discount, discountType, nonTaxable, taxable, tax, rounding, grandTotal)` | `Sub Total`, `Discount` (with ` (10%)` when `discount_type` is `Percentage` and > 0), `Non-Taxable Amount`, `Taxable Amount`, `Tax`, `Rounding` (only when at least half a paisa), `Grand Total` (the last line is drawn bold) |
| `taxLabel(rate)` | `13%` or `-` |
| `present(fields…)` | Drops blank fields |
| `InvoiceLine.of(product, batch, quantity, rate, mrp, sellingPrice)` | A line with product name, code, unit, batch no, expiry, tax rate; `amount()` = `round2(quantity × rate)` |
| `InvoiceLine.table(lines, withSellingPrice)` | Columns `Product`, `Code`, `Unit`, `Batch No.`, `Expiry Date`, `Tax`, `Qty`, `Rate`, `MRP`, `SP` (purchases only, they set it), `Amount` |

`rate` is the cost price on the purchase side and the selling price on the sales side. Other titles: `Sales Invoice`, `Payment Voucher` (to a vendor) / `Payment Receipt` (from a customer), `Journal Voucher`, `Stock Adjustment` (line `Type` is `Stock In` / `Stock Out`). List titles: `Purchases`, `Sales`, `Payments`, `Unadjusted Payments`, `Journal Entries` (unnumbered, one row per line), `Stock Adjustments`.

### 5.5 Cancelled documents

**Idea.** A cancelled sale or sales return still exists and keeps its number, so it must appear in lists and range prints, but it must be unmistakable and count for nothing. `SalesEntryExportService` does three things: `cancelledWhen(isCancelled)` on the list table plus a `Status` column (`Cancelled` / `Active`), the stamp `"CANCELLED"` on the print (shown in red under the title), and a `Cancel Reason` note from `cancel_remarks`. The writers do the rest: the totals row skips flagged rows, and the PDF draws flagged rows in a grey strikethrough font (Excel only leaves them out of the totals). Range prints include cancelled documents, stamped.

### 5.6 `ExcelFile` (Apache POI)

```
table(table, context):     heading(title, no stamp); detail fields; blank row; table(filter = true)
document(doc, context):    heading(title, stamp); party fields; detail fields; blank; lines table (no filter);
                           summary (labels in the column before the last, amounts in the last; last line bold); notes

heading: company name (bold 14), each letterhead line (grey), blank, title (bold 12), stamp (bold red) if any, printed line (grey)
fields:  label (bold) in column A, value in column B (an AMOUNT field is a numeric cell)
table:   header row (bold, grey fill, right-aligned over figures), optional S.N column,
         one row per table row, each cell by its CellFormat:
           AMOUNT / NUMBER -> numeric cell, formats "#,##0.00" / "General"
           DATE            -> AD: a real date cell "yyyy-mm-dd" (when the value looks like YYYY-MM-DD); BS: text
           TEXT            -> text
         "No records." when empty; totals row bold with a top border;
         on a list/report: auto filter over the rows and a freeze pane under the header
widths:  the longest text seen per column, clamped to 6–60 characters
```

### 5.7 `PdfFile` (OpenPDF)

```
table(table, context):
  natural widths = each column's longest cell (and its header's longest word)
  page = A4, or A4 landscape when the natural widths exceed the usable portrait width
  letterhead (centered, then a rule); title in capitals; the details on one centered line ("From: … To: …")
  lineTable(table): header row repeated on every page; cancelled rows in grey strikethrough;
                    totals row shaded with a top rule; "No records." spanning the table when empty
  widths: if the natural widths fit, use them; else figures, dates and short columns keep theirs and the
          text columns share what is left in proportion, never narrower than their longest word (max 120 pt)

documents(docs, context):   each on a new page:
  letterhead; title + stamp; two boxes (party left, details right; without a party the details fill both);
  lines table; summary (42% wide, right-aligned, last line bold with a top rule);
  notes as "Label: value"; signature lines "Prepared By" and "Authorized Signature"

footer on every page: the printed line on the left, "Page n of N" on the right (N is filled in when the document closes)
```

Margins are 36 pt, 50 pt at the bottom for the footer; fonts are Helvetica, 7.5 pt (footer) to 14 pt (company name).

### 5.8 Reports

`ReportExportService.file(...)` builds the same `ExportTable` from a report's JSON rows after applying the page's `search` and `sort`, and `LedgerExport` builds the ledger with `totalAs` for the closing balance; the rules are in `docs/backend/reports/reports.md` section 5.10.

## 6. Design decisions and gotchas

- **The API builds the files**, not the browser: the letterhead, calendar and totals then come from one place and the same file can be mailed, printed or re-generated later.
- **Declaration over rendering.** Features never import POI or OpenPDF; `ExcelFile` and `PdfFile` are package-private. Adding a column is one builder line.
- **Readers run once, in `build`.** The writers work on plain cells, so the entity session can close before the bytes are written (the export services open a read-only transaction only around building the `PrintDocument`).
- **`calendar` is reserved.** `QueryParamUtil` drops it with the paging keys so it never reaches the filter builder; it is a rendering choice, not a filter.
- **Lists export every row** via `allRows`: the request keeps the list's filters, dates and sort, only paging is switched off.
- **Range prints filter with the list's `SpecificationBuilder`**, so `fromDate`/`toDate` (and `type=Vendor` on payments) behave exactly as on the list, and order is `date, id`.
- **BS dates are text in Excel**; AD dates are real date cells. A spreadsheet can't hold a BS date as a date type.
- **Document numbers are shown through `Formats.docNo`** (`|PE-000001` → `PE-000001`, `2082-83|PE-000005` → `2082-83 | PE-000005`) and file names through `Formats.fileName` (anything but letters, digits, `_` and `-` becomes `-`; empty becomes `export`).
- **Amounts use Indian grouping** (`1,23,456.50`) to match the web app's amount pipe; `Formats.amount` does it by hand because Java's formats can't.
- **A document's Excel is not an invoice**: it lists the same boxes, lines and summary as cells, for people who want the numbers, while the PDF is the printable form.
- **Empty range prints are a 404**, not an empty PDF, so the web app can show the message instead of saving a blank file.
- **The auth interceptor on the client reads a failed download's Blob as JSON**; the server just throws the usual exceptions and the global handler answers JSON.

## 7. Build it yourself: order of work

1. Add `poi-ooxml` and `openpdf` to `pom.xml`.
2. Write the value types: `CellFormat`, `Field`, `Formats` (amount grouping, number, docNo, batch, fileName), `ExportFormat` with its 400 message.
3. Write `ExportTable` and its `Builder` (`text`/`number`/`amount`/`date`, `total`, `totalAs`, `detail`, `period`, `cancelledWhen`, `unnumbered`, `build`, `totals`). Unit-test `totals()` with a cancelled row.
4. Write `BsDateUtil` (month table + day counting from BS 2000-01-01) and `ExportContext` (date, today, printedLine).
5. Write `ExcelFile.table` and `PdfFile.table`; open the results in a spreadsheet and a PDF viewer. Then `PrintDocument`, `DocumentParts`, `InvoiceLine`, and `ExcelFile.document` / `PdfFile.documents`.
6. Write `ExportService` (`context`, `table`, `document`, `documents`, `download`) and `QueryParamUtil.allRows`; add `calendar` to the reserved params.
7. For each feature: a `<Feature>ExportService` with `list`, `document`, `documents`, and three controller routes guarded by the feature's View operation; on sales and sales returns add `cancelledWhen`, the `Status` column, the `CANCELLED` stamp and the `Cancel Reason` note.
8. Try it: `curl -OJ "http://localhost:8080/purchase/export/excel?fromDate=2026-10-01&toDate=2026-10-31&calendar=BS" -H "Authorization: Bearer $TOKEN"` saves `purchases-2083-07-16.xlsx`; `GET /sales/print?fromDate=2030-01-01&toDate=2030-01-02` must answer 404 `"No sales in this period"`; `GET /purchase/1/export/docx` (for a purchase that exists) must answer 400 `"Export format must be excel or pdf"`.
