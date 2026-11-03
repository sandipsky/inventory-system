# Payments, Invoice Settlement and Payment Adjustment — Backend

> Part of the Inventory System implementation guide. Read `docs/BRD.md` for the business picture and `docs/backend/backend-setup.md` for how the backend is organised.

## 1. What this is

A payment records money **paid to a vendor** or **received from a customer**: the date, the party, the account the money moved through (cash or a bank), the amount, and optionally which credit invoices it settles. Saving one updates each settled invoice's due amount and posts the accounting journal. Whatever part of the amount is not applied to an invoice stays as an **unadjusted amount** (an advance); the payment adjustment page applies it to invoices later. Both party types share one table, one service and one form.

## 2. Where the code lives

Package `features/accounting/payment/`.

| File | What is in it |
|---|---|
| `controllers/PaymentController.java` | `/payment` endpoints |
| `controllers/PaymentAdjustmentController.java` | `/payment-adjustment` endpoints |
| `services/PaymentService.java` | List (`findPage` with the `partyName` search), get, create, update, delete; settlement (`applyDetails`, `saveDetails`, `applyDueInvoice`, `reverseDueInvoice`); journal posting (`createJournalEntries`, `deleteJournalEntries`); notifications |
| `services/PaymentAdjustmentService.java` | Payments with leftover money, and applying the leftover to invoices |
| `services/PaymentExportService.java` | Excel/PDF of the two lists, one voucher or receipt, and the range print |
| `entities/MasterPayment.java`, `PaymentDetail.java`, `AmountDueInvoice.java` | The three tables |
| `repositories/MasterPaymentRepository.java`, `PaymentDetailRepository.java`, `AmountDueInvoiceRepository.java` | `findByMasterPaymentId`, `findByInvoiceNumber`, `findTopByOrderByIdDesc` for numbering |
| `dtos/MasterPaymentDTO.java`, `PaymentDetailDTO.java` | JSON shapes |
| `common/util/MoneyUtil.java` | `round2` and `exceeds`: paisa rounding and the half-paisa tolerance |
| `features/accounting/journal/` | `MasterJournalEntry` / `JournalEntry` the payment posts into |
| `features/notification/services/NotificationService.java`, `NotificationType.java` | `notifyActivity`, `NotificationType.payment(type)` |

## 3. Data

See `backend/database.sql`.

**`master_payment`**: one row per payment.

| Column | Meaning |
|---|---|
| `date` | `YYYY-MM-DD` text |
| `system_entry_no` | Unique, `\|P-000001`, from the `Payment` numbering (`\|P-`, 6 digits) |
| `type` | `Vendor` (money out) or `Customer` (money in) |
| `amount` | What was paid or received; must be more than 0 |
| `narration` | Free text; filled in when blank |
| `total_adjusted_paid_amount` | Sum of the `paid_amount`s applied to invoices |
| `unadjusted_amount` | `amount − total_adjusted_paid_amount`: the advance not yet applied |
| `total_payment_amount` | Always set to `amount` (kept for the API shape) |
| `vendor_id`, `customer_id` | Exactly one is set, by `type` |
| `transaction_type` | **The payment mode account** (`account_master.id`): Cash, Petty Cash, a bank. The column name is historical; the entity field is `paymentMode` and the JSON field is `payment_mode_id` |

**`payment_detail`**: one row per invoice a payment settles (a "settlement").

| Column | Meaning |
|---|---|
| `master_payment_id` | The payment |
| `invoice_number` | The document number of the purchase (`\|PE-…`) or sale (`\|SI-…`) |
| `invoice_date`, `total_invoice_amount` | Copied from the request for display |
| `paid_amount` | How much of this payment went to that invoice |
| `due_amount` | What the invoice still owed **after** this settlement (a snapshot) |

**`amount_due_invoice`**: one row per credit document that can be paid, keyed by its number.

| Column | Meaning |
|---|---|
| `invoice_number` | Unique. The purchase or sales `system_entry_no` |
| `total_invoice_amount` | The document's grand total |
| `paid_amount`, `due_amount` | Running totals; `due = total − paid` |

Who writes `amount_due_invoice`: the purchase and sales features. Their `maintainDueInvoice` creates or updates the row for a `Credit` document (total = grand total, due = total − paid) and removes it for a `Cash` one, refusing to drop or shrink it below what is already paid (`"Payments already recorded against this invoice"`, `"Invoice total cannot be less than the amount already paid"`). The payment feature only moves money between `paid_amount` and `due_amount`. The reports `GET /reports/accounting/payable` and `/receivable` join this table to the purchase or sales master by `invoice_number` where `due_amount > 0`; that is where the form gets the invoices to settle. The purchase and sales docs own the details.

## 4. API

Full shapes: `backend/endpoints.md` section 12 (and section 18 for files).

| Method | Path | What it does | Permission |
|---|---|---|---|
| `GET` | `/payment/generateNumber` | Next number as plain text | `CreatePayment` |
| `GET` | `/payment` | Paged list; `type=Vendor`, `partyName=ram`, `fromDate`/`toDate` | `ViewVendorPayment` **or** `ViewCustomerPayment` |
| `GET` | `/payment/{id}` | One payment with `paymentDetails` | either View |
| `POST` | `/payment` | Create | `CreatePayment` |
| `PUT` | `/payment/{id}` | Update (reverses, then re-applies settlements) | `EditPayment` |
| `DELETE` | `/payment/{id}` | Delete (settled invoices become due again) | `DeletePayment` |
| `GET` | `/payment/export/{format}` | The list's payments as `excel` or `pdf` | either View |
| `GET` | `/payment/{id}/export/{format}` | One voucher (vendor) or receipt (customer) | either View |
| `GET` | `/payment/print?fromDate=&toDate=[&type=]` | Every payment in the range, one PDF | either View |
| `GET` | `/payment-adjustment` | Paged list of payments with `unadjusted_amount > 0`; same filters | `ViewPaymentAdjustment` |
| `GET` | `/payment-adjustment/export/{format}` | That list as a file | `ViewPaymentAdjustment` |
| `POST` | `/payment-adjustment/{paymentId}` | Apply a list of invoices to the leftover | `CreatePaymentAdjustment` |

`@RequiresOperation` takes a list, and any one of them grants access: that is how the list, get and files accept either View operation. A role with only `ViewVendorPayment` still gets customer payments back from the API; the web app filters by `type` for it.

Request fields that matter:

- `type` (`Vendor` / `Customer`), then `vendor_id` or `customer_id`; `date`; `amount`; `payment_mode_id` (an account, from `GET /dropdown/paymentModes`); `narration` (optional).
- **`paymentDetails`** (camelCase, like every line list), may be empty: each `invoice_number`, `invoice_date`, `total_invoice_amount`, `due_amount`, `paid_amount`.
- `POST /payment-adjustment/{id}` sends a bare **list** of the same detail objects, not a wrapper.
- Responses add `system_entry_no`, `vendor_name` / `customer_name`, `payment_mode_name`, `total_adjusted_paid_amount`, `unadjusted_amount`, `total_payment_amount`.

## 5. How it works

### 5.1 Listing and the `partyName` search

**Idea.** A payment has a vendor *or* a customer, so the generic `vendor.name` filter would silently drop every customer payment. `findPage` pulls `partyName` out of the filter map before the generic `SpecificationBuilder` sees it, and adds one condition of its own: `lower(vendor.name) LIKE %x% OR lower(customer.name) LIKE %x%`. Both joins are `JoinType.LEFT`. An inner join would require the vendor row to exist, which turns the OR into "vendor payments only"; a left join keeps a row whose vendor is null and lets the customer side match. `findPage` also takes an optional extra `Specification`, which is how the adjustment list reuses it.

```
find_page(params, extra):
  pageable  = pageIndex / pageSize / sort
  filters   = params minus reserved and blank ones
  partyName = filters.remove("partyName")
  spec      = contains-filters on the rest (fromDate/toDate bound `date`)
  if partyName: spec AND (left join vendor name LIKE %p% OR left join customer name LIKE %p%)
  if extra:     spec AND extra
  return repository.findAll(spec, pageable) mapped to DTO (no details)
get_one(id): 404 "Payment with Given Id not found"; DTO with paymentDetails
```

### 5.2 Creating a payment

**Idea.** Validate the header, apply each settlement to its due invoice, make sure the settlements do not exceed the payment, store the totals, write the settlement rows, post the journal, notify. All inside one `@Transactional` method, so a settlement that fails half-way rolls back the invoices already touched. The narration is filled in from the party so vouchers and the ledger always say something.

```
save_payment(dto):                                          -- one transaction
  number = next "Payment" number                            -> "|P-000007"
  map header (mapDtoToEntity):
      type not Vendor/Customer      -> 400 "Payment type must be either Vendor or Customer"
      amount <= 0                   -> 400 "Payment amount must be greater than zero"
      payment mode account          -> 404 "Payment Mode Account not found"
      Vendor:   vendor               -> 404 "Vendor not found";   customer := null
                blank narration     := "Payment made to <vendor name>"
      Customer: customer             -> 404 "Customer not found"; vendor := null
                blank narration     := "Payment received from <customer name>"
  adjusted = apply_details(dto.paymentDetails)             -> see 5.3
  if adjusted exceeds amount        -> 400 "Adjusted amount cannot exceed the payment amount"
  total_adjusted_paid_amount := round2(adjusted)
  unadjusted_amount          := round2(amount - adjusted)
  total_payment_amount       := amount
  save master
  save_details(dto.paymentDetails, master id)               -> see 5.3
  create_journal(master)                                    -> see 5.6
  notify (after commit, actor skipped):
      Vendor   -> type vendor_payment,   INFO, "Payment sent",     "P-000007 to <vendor>, Rs. 5,000.00."
      Customer -> type customer_payment, INFO, "Payment received", "P-000007 from <customer>, Rs. 5,000.00."
```

**Rules checked**: the five **400**/**404** messages above, plus the settlement rules in 5.3. The API does not check that `payment_mode_id` is a `Cash & Cash Equivalents` account; any existing account is accepted.

### 5.3 Settling invoices (`applyDetails`, `applyDueInvoice`, `saveDetails`)

**Idea.** Each detail line says "`paid_amount` of this payment goes to invoice X". Applying it moves that much from the invoice's `due_amount` to its `paid_amount`. Two limits: a line cannot pay more than the invoice still owes, and all lines together cannot exceed the payment. Amounts are `double`s, so a sum like `1130.10 − 1000.05` comes out as `130.04999999999995`; `MoneyUtil.round2` stores results to the paisa and `MoneyUtil.exceeds(amount, limit)` is `amount − limit > 0.005`, so half a paisa of noise never trips a limit.

```
apply_details(details):                      returns the sum of paid_amount
  for each line:
      paid_amount <= 0                       -> 400 "Paid amount for an invoice must be greater than zero"
      apply_due_invoice(invoice_number, paid_amount)
      sum += paid_amount

apply_due_invoice(number, paid):
  row = amount_due_invoice by number         -> 404 "Due Invoice not found: <number>"
  if paid exceeds row.due_amount             -> 400 "Paid amount exceeds due amount for invoice <number>"
  row.paid_amount := round2(row.paid_amount + paid)
  row.due_amount  := round2(row.due_amount - paid)

save_details(details, payment id):
  for each line: new payment_detail (invoice number, date, total, paid_amount,
                 due_amount := the invoice's due_amount NOW, or the sent one if the invoice row is gone)

reverse_due_invoice(number, paid):           -- used by update and delete
  row = by number; if missing, do nothing (the document was made Cash or deleted since)
  row.paid_amount := round2(row.paid_amount - paid);  row.due_amount := round2(row.due_amount + paid)
```

The same invoice may appear on two lines; each is applied in turn against the remaining due.

### 5.4 Editing a payment

**Idea.** Rather than diffing old and new settlements, an update puts every invoice back the way it was and starts over: reverse and delete every existing `payment_detail` (including rows added later by payment adjustment), then run exactly the create path on the new body. The client therefore sends the complete list of invoices the payment should still settle, and an invoice's available amount is its due amount *plus* what this payment had on it. The journal is deleted and re-posted the same way. The number is kept. No notification is sent for an update.

```
update_payment(id, dto):                                     -- one transaction
  master = load                                              -> 404 "Payment with Given Id not found"
  for each existing detail: reverse_due_invoice(...); delete it
  map header (same checks as create; party may change, narration refilled only if blank)
  adjusted = apply_details(dto.paymentDetails)
  exceeds amount                                             -> 400 "Adjusted amount cannot exceed the payment amount"
  store the three totals; save; save_details; create_journal (deletes the old one first)
```

### 5.5 Deleting a payment

```
delete_payment(id):                                          -- one transaction
  master = load                                              -> 404
  for each detail: reverse_due_invoice(...); delete it        (invoices become due again)
  delete the payment's journal lines and master journal
  delete the payment
  notify WARN "Payment deleted", same message as create
```

### 5.6 Posting the journal

**Idea.** A vendor payment reduces what we owe the vendor (a liability, its `Payables` account) and reduces cash or bank (an asset): **debit the vendor account, credit the payment mode account**. A customer receipt is the mirror image: **debit the payment mode account, credit the customer's `Receivables` account**. The journal carries the payment's number as its `system_entry_no`, its narration as remarks and on both lines, and `master_payment_id` set, which is what keeps it out of the manual journal list (see the accounting doc).

```
create_journal(payment):
  delete_journal(payment id):   find master_journal_entry by master_payment_id;
                                delete its lines, delete it, FLUSH
  journal = new (date, remarks = narration, number = payment number, master_payment = payment)
  party account = account_master by vendor_id / customer_id        -> 404 "Account not found"
  Vendor:   party line  debit = amount, credit = 0
            mode  line  debit = 0,      credit = amount
  Customer: party line  debit = 0,      credit = amount
            mode  line  debit = amount, credit = 0
  both lines: narration = payment narration
```

The flush is needed because the new journal is inserted immediately (identity id) under the same unique number; the old row's delete must reach the database first.

### 5.7 Payment adjustment

**Idea.** A payment with money left over is an advance. The adjustment page lists such payments (`findPage` with the extra condition `unadjustedAmount > 0.005`; half a paisa so a rounding leftover does not show as "unadjusted") and lets the user apply the leftover to invoices. That only moves money inside the books already recorded, so there is no journal change and no notification; it adds `payment_detail` rows to the same payment and shrinks `unadjusted_amount`.

```
adjust_payment(payment id, details):                          -- one transaction
  payment = load                                              -> 404 "Payment with Given Id not found"
  no details                                                  -> 400 "No invoice adjustments were provided"
  for each: paid_amount <= 0                                  -> 400 "Paid amount for an invoice must be greater than zero"
  sum exceeds payment.unadjusted_amount                       -> 400 "Adjusted amount cannot exceed the unadjusted amount of the payment"
  for each line:
      row = due invoice                                       -> 404 "Due Invoice not found: <number>"
      paid exceeds row.due_amount                             -> 400 "Paid amount exceeds due amount for invoice <number>"
      move paid from due to paid (round2); save
      new payment_detail (due_amount := row.due_amount after)
  payment.total_adjusted_paid_amount := round2(+ sum)
  payment.unadjusted_amount          := round2(- sum)
```

Because an adjustment is just more `payment_detail` rows, editing the payment later reverses them too (5.4), and deleting it gives everything back (5.5).

### 5.8 Export and print

`PaymentExportService` builds the files; the common export code (letterhead, `calendar`, Excel vs PDF) is in section 18 of `endpoints.md`.

- `/payment/export/{format}`: the list query with paging off. Columns: Payment Number, Date, Party Type, Party Name, Payment Mode, Amount, Settled, Unadjusted (the three amounts totalled), Narration. `/payment-adjustment/export/{format}` is the same without Narration, over the unadjusted list.
- `/payment/{id}/export/{format}`: titled **Payment Voucher** for a vendor and **Payment Receipt** for a customer. Party block (name, address, contact, registration number), fields Payment No., Date, Payment Type (`Send` / `Receive`), Payment Mode; a "Settled Invoices" table (Invoice Date, Invoice Number, Invoice Amount, Paid, totalled); totals Settled, Unadjusted, Amount; the narration.
- `/payment/print`: every payment matching the filters (`fromDate`, `toDate`, optional `type`), sorted by date then id, one page each; an empty range is **404** `"No payments in this period"`.

## 6. Design decisions and gotchas

- **Settlements are keyed by document number, not id.** `amount_due_invoice.invoice_number` holds the `|PE-…` / `|SI-…` text, so one table serves purchases and sales and the reports join on it. Send numbers exactly as the API returned them, leading `|` included.
- **Reverse-then-reapply on update** keeps the code to one path and makes the "send the whole list" contract explicit. The cost: an update on a payment whose invoice was deleted meanwhile silently skips the reversal (`reverseDueInvoice` ignores a missing row) and then fails with `"Due Invoice not found"` if the line is sent again.
- **`exceeds` runs after the invoices are already updated** in `saveMasterPayment`; that is fine only because the method is transactional. Keep `@Transactional` on every change method.
- **`due_amount` on a `payment_detail` is a snapshot** taken right after the settlement, not a live figure. The live one is on `amount_due_invoice`.
- **`total_payment_amount` always equals `amount`.** It exists for the response shape; do not compute anything from it.
- **The journal reuses the payment number**, so the ledger shows `P-000007` on both the payment and its journal. Deleting the journal must flush before the re-insert.
- **The payment mode is any account.** The dropdown restricts the choice to `Cash & Cash Equivalents`; the API does not.
- **Permissions are asymmetric on purpose.** Viewing is per party type (`ViewVendorPayment`, `ViewCustomerPayment`); changing is one set (`CreatePayment`, `EditPayment`, `DeletePayment`). The adjustment page has its own pair, and `CreatePaymentAdjustment` also opens the payable and receivable reports.
- **Notifications** go only on create (`Payment sent` / `Payment received`, INFO) and delete (`Payment deleted`, WARN), after commit, to users whose role holds the matching View operation, skipping the actor. Updates and adjustments are silent.

## 7. Build it yourself: order of work

1. Create `amount_due_invoice` (unique `invoice_number`) and make the purchase and sales saves maintain it for `Credit` documents; without rows here there is nothing to settle.
2. Create `master_payment` (`transaction_type` → `account_master`) and `payment_detail`; add the `Payment` row to `document_numbering` (`|P-`, 6 digits) and `generatePaymentNumber`.
3. Write the three entities (`MasterPayment.paymentMode` on column `transaction_type`; a cascaded `@OneToMany` for details) and repositories (`findByInvoiceNumber`, `findByMasterPaymentId`, `findTopByOrderByIdDesc`).
4. Write `MasterPaymentDTO` and `PaymentDetailDTO` with `@JsonProperty` snake_case names and the camelCase `paymentDetails` list.
5. Add `MoneyUtil` (`round2`, `exceeds` with `0.005`).
6. Write `PaymentService`: `mapDtoToEntity` with the narration defaults, `applyDueInvoice` / `reverseDueInvoice`, `applyDetails` / `saveDetails`, then `saveMasterPayment`, `updateMasterPayment`, `deleteMasterPayment` under `@Transactional`.
7. Add `createJournalEntries` / `deleteJournalEntries` (with the flush) once the journal tables exist; check the ledger shows the vendor debit and cash credit.
8. Write `findPage` with the `partyName` left joins and `getMasterPaymentById`; then `PaymentController` with `@RequiresOperation({ "ViewVendorPayment", "ViewCustomerPayment" })` on reads and `CreatePayment` / `EditPayment` / `DeletePayment` on writes.
9. Try with curl: a credit sale, `GET /reports/accounting/receivable`, `POST /payment` settling part of it, `GET /payment/{id}` showing `unadjusted_amount`; then `PUT` with an empty `paymentDetails` and check the invoice is fully due again.
10. Write `PaymentAdjustmentService` and its controller (`ViewPaymentAdjustment`, `CreatePaymentAdjustment`); apply the leftover from step 9 and check `unadjusted_amount` reaches 0.
11. Add the `notifyActivity` calls on create and delete with `NotificationType.payment(type)`.
12. Add `PaymentExportService` and the four file endpoints once the common export code exists.
