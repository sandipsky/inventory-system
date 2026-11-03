# Dashboard — Backend

> Part of the Inventory System implementation guide. Read `docs/BRD.md` for the business picture and `docs/backend/backend-setup.md` for how the backend is organised.

## 1. What this is

The dashboard is the first page after login: a few cards with the figures a manager checks every morning, each fed by one small endpoint under `/dashboard`. The server does all the summing (cash and dues from the journal, purchases against sales per period, totals for a date range, batches about to expire, products running low) so the page only draws. Every figure is a grand total rounded to paisa, "today" is the server's date, and cancelled sales and sales returns count for nothing. A card that covers two document kinds asks for both figures in one call and gets `null` for the one the user's role may not see.

## 2. Where the code lives

Package `features/dashboard/`.

| File | What is in it |
|---|---|
| `controllers/DashboardController.java` | Six `GET` endpoints, each with its `@RequiresOperation` |
| `services/DashboardService.java` | The period maths, the per-figure permission check (`can`), the stock-alert rules |
| `repositories/DashboardRepository.java` | Read-only JPQL aggregates. It extends Spring Data's plain `Repository`, not `JpaRepository`, so it exposes no save/delete |
| `dtos/BalanceSummaryDTO.java` | `cash_balance`, `payables`, `receivables`, `payables_week_ago`, `receivables_week_ago` |
| `dtos/AccountTypeBalanceDTO.java` | Internal: one account type's debit minus credit |
| `dtos/PurchaseVsSalesDTO.java`, `dtos/PurchaseSalesPointDTO.java` | `interval` and its `points` (`from_date`, `to_date`, `purchase`, `sales`) |
| `dtos/DateTotalDTO.java` | Internal: grand total of the documents dated on one day |
| `dtos/SalesSummaryDTO.java`, `dtos/PurchaseSummaryDTO.java` | `total_sales`, `total_sales_return`, `net_sales` / `total_purchase`, `total_purchase_return` |
| `dtos/NearExpiryBatchDTO.java` | One batch: `product_id`, `product_name`, `batch_id`, `batch_no`, `expiry_date`, `quantity` |
| `dtos/StockAlertsDTO.java`, `dtos/StockLevelDTO.java` | `minimum_stock` and `zero_quantity` lists of (`product_id`, `product_name`, `product_code`, `quantity`, `min_stock`) |

It also uses `UserRepository.existsByUsernameAndOperation` (the permission query), `ProductStockService.batchId` (default batch = id `0`) and `MoneyUtil.round2`.

## 3. Data

Nothing is written. The queries read these tables from `backend/database.sql`:

| Table | Columns used |
|---|---|
| `journal_entry` + `master_journal_entry` | `debit_amount`, `credit_amount`, `account_master_id`; the journal's `date` |
| `account_master` | `account_type`: the three types summed are `Cash & Cash Equivalents`, `Payables`, `Receivables` (constants `CASH`, `PAYABLES`, `RECEIVABLES` in the service) |
| `master_purchase_entry`, `master_purchase_return` | `date`, `grand_total` |
| `master_sales_entry`, `master_sales_return` | `date`, `grand_total`, `is_cancelled` |
| `product_stock` | `quantity`, `expiry_date`, `batch_no`, `product_id` |
| `product` | `name`, `code`, `min_stock`, `is_active`, `is_service_item` |
| `user` → `role` → `role_operation` → `operation` | Which operations the signed-in user's role holds |

## 4. API

Section 15 of `backend/endpoints.md` has the response examples.

| Method | Path | What it returns | Permission needed |
|---|---|---|---|
| GET | `/dashboard/balances` | Cash, payables, receivables now; payables and receivables 7 days ago | `ViewAccount` |
| GET | `/dashboard/purchase-vs-sales?interval=` | Purchases and sales per day / week / month | `ViewPurchaseEntry` or `ViewSalesEntries` |
| GET | `/dashboard/sales-summary?fromDate=&toDate=` | Sales, sales returns, net sales | `ViewSalesEntries` or `ViewSalesReturns` |
| GET | `/dashboard/purchase-summary?fromDate=&toDate=` | Purchases, purchase returns | `ViewPurchaseEntry` or `ViewPurchaseReturn` |
| GET | `/dashboard/near-expiry?months=` | Batches with stock expiring within `months` (default 6), expired included | `ViewStockEdit` |
| GET | `/dashboard/stock-alerts` | Products at or below minimum stock, and products with none | `ViewStockEdit` |

`interval` defaults to `monthly`; `months` defaults to `6`; `fromDate`/`toDate` are optional `YYYY-MM-DD` strings on the document `date`, like the reports'. All JSON fields are snake_case.

## 5. How it works

### 5.1 Two levels of permission

**Idea.** `@RequiresOperation({ "ViewPurchaseEntry", "ViewSalesEntries" })` on the controller lets a user in when they hold *any one* of the listed operations (that is how the aspect in `security/OperationAuthorizationAspect.java` reads a list). But a chart with two series must not leak the series the user may not see. So the service checks each figure again, one operation at a time, with its own `can(operation)`:

```
can(operation):
  username = SecurityContextHolder.getContext().getAuthentication().getName()
  return userRepository.existsByUsernameAndOperation(username, operation)
      -- JPQL: user JOIN role JOIN operations WHERE username = :username AND operation.name = :operationName
```

A figure whose check fails is not computed at all and comes back as `null`; the page hides that tile or line. This is the same query the aspect uses, so the two never disagree.

### 5.2 Balances

**Idea.** The trial balance already shows that "cash" is the net debit of the Cash & Cash Equivalents accounts, "what we owe" the net credit of the Payables accounts and "what we are owed" the net debit of the Receivables accounts. The dashboard reuses that: one `GROUP BY account_type` over every journal line dated up to a day, run twice (today and seven days ago) for the weekly change.

```
balances():
  today = LocalDate.now()
  now     = balancesByType(today)                 -- Map<account_type, SUM(debit) - SUM(credit)>
  weekAgo = balancesByType(today.minusDays(7))
  return {
    cash_balance         = round2( now[CASH]        or 0),
    payables             = round2(-now[PAYABLES]    or 0),     -- a liability: its balance is on the credit side, so flip the sign
    receivables          = round2( now[RECEIVABLES] or 0),
    payables_week_ago    = round2(-weekAgo[PAYABLES]    or 0),
    receivables_week_ago = round2( weekAgo[RECEIVABLES] or 0)
  }

balancesByType(date):
  SELECT a.accountType, COALESCE(SUM(je.debitAmount), 0) - COALESCE(SUM(je.creditAmount), 0)
  FROM JournalEntry je JOIN je.masterAccount a, MasterJournalEntry mje
  WHERE je.masterJournalEntryId = mje.id AND mje.date <= :toDate AND a.accountType IN (:accountTypes)
  GROUP BY a.accountType
```

An account type with no lines yet is simply missing from the map, hence the `or 0`. There is no `cash_week_ago`; the DTO only carries the two dues.

### 5.3 Purchase vs sales

**Idea.** The server owns the periods so every client draws the same chart: the last 30 days, the last 12 weeks (Sunday to Saturday) or the last 12 months, oldest first, the last one holding today. Instead of one query per period, the service fetches per-day totals once for the whole span and then buckets them in Java, which keeps the SQL trivial and the bucket rules in one testable static method.

```
purchase_vs_sales(interval):
  periods  = periods(interval, today)                          -> 400 "interval must be daily, weekly or monthly"
  fromDate = periods.first.from;  toDate = periods.last.to
  purchases = can("ViewPurchaseEntry") ? per-day totals of MasterPurchaseEntry in [fromDate, toDate] : null
  sales     = can("ViewSalesEntries")  ? per-day totals of MasterSalesEntry  (isCancelled = false)  : null
  points = for each period: { from_date, to_date,
                              purchase = totalIn(purchases, period),      -- null when the series is null
                              sales    = totalIn(sales, period) }
  return { interval, points }

periods(interval, today):
  "daily"   : for i = 29 down to 0: day = today - i days          -> Period(day, day)
  "weekly"  : sunday = today - (dayOfWeek.value % 7) days          -- Java's Sunday is 7, so 7 % 7 = 0 keeps a Sunday
              for i = 11 down to 0: first = sunday - i weeks       -> Period(first, first + 6 days)
  "monthly" : first = today.withDayOfMonth(1)
              for i = 11 down to 0: f = first - i months           -> Period(f, f + 1 month - 1 day)
  anything else (including blank) -> BadRequestException

totalIn(totals, period):
  if totals == null: return null
  sum the totals whose date string is >= period.from and <= period.to   (string compare works on YYYY-MM-DD)
  return round2(sum)
```

The per-day query is `SELECT new DateTotalDTO(m.date, SUM(m.grandTotal)) … WHERE m.date >= :fromDate AND m.date <= :toDate GROUP BY m.date`. A period with no documents gets `0.0`, not `null`; `null` means "not allowed", never "nothing".

**Rules checked**

- `interval` not `daily`, `weekly` or `monthly` → **400** `"interval must be daily, weekly or monthly"`

### 5.4 Sales summary and purchase summary

**Idea.** Two plain sums per endpoint over an optional date range, each behind its own `can`, so a role with only one View operation still gets its own figure. `net_sales` needs both figures; if either is `null` the net is `null` too, because a net over half the data would be a wrong number rather than a missing one.

```
sales_summary(fromDate, toDate):
  sales   = can("ViewSalesEntries") ? round2(SUM(grandTotal) of sales not cancelled in range)   : null
  returns = can("ViewSalesReturns") ? round2(SUM(grandTotal) of sales returns not cancelled)   : null
  net     = sales != null && returns != null ? round2(sales - returns) : null
  return { total_sales, total_sales_return, net_sales }

purchase_summary(fromDate, toDate):
  purchases = can("ViewPurchaseEntry")  ? round2(SUM(grandTotal) of purchases in range)        : null
  returns   = can("ViewPurchaseReturn") ? round2(SUM(grandTotal) of purchase returns in range) : null
  return { total_purchase, total_purchase_return }
```

Each sum is `COALESCE(SUM(m.grandTotal), 0.0)` with the `(:fromDate IS NULL OR m.date >= :fromDate) AND (:toDate IS NULL OR m.date <= :toDate)` filter, so an empty range is `0.0` and missing dates mean "all time". The web app sends the last N calendar months.

### 5.5 Near expiry

**Idea.** "Expiring soon" is a cut-off date, not a window: anything with stock whose expiry is on or before today plus `months` is listed, which naturally includes batches that have *already* expired (those are the most urgent). Batches without an expiry date have nothing to expire and are skipped.

```
near_expiry(months):
  if months < 1 -> 400 "months must be at least 1"
  until = today + months months  (YYYY-MM-DD)
  SELECT ps FROM ProductStock ps JOIN FETCH ps.product
  WHERE ps.quantity > 0 AND ps.expiryDate IS NOT NULL AND ps.expiryDate <> '' AND ps.expiryDate <= :until
  ORDER BY ps.expiryDate, ps.quantity DESC
  map each: product_id, product_name, batch_id = (batchNo == null ? 0 : id), batch_no, expiry_date, quantity
```

`JOIN FETCH` loads the product in the same query so mapping the name doesn't trigger one query per row.

**Rules checked**

- `months` below 1 → **400** `"months must be at least 1"`

### 5.6 Stock alerts

**Idea.** Stock lives per batch but a minimum is set per product, so the query adds every batch up first (`LEFT JOIN` so a product that was never stocked still appears with 0). Then two rules split the list. A product with no minimum can never be "at minimum", but it can be "out".

```
stock_alerts():
  levels = SELECT p.id, p.name, p.code, COALESCE(SUM(ps.quantity), 0.0), p.minStock
           FROM Product p LEFT JOIN ProductStock ps ON ps.product = p
           WHERE p.isActive = true AND p.isServiceItem = false
           GROUP BY p.id, p.name, p.code, p.minStock ORDER BY p.name
  minimum_stock = levels where quantity > 0 AND min_stock != null AND min_stock > 0 AND quantity <= min_stock,
                  sorted by quantity ascending (lowest first)
  zero_quantity = levels where quantity <= 0            (keeps the by-name order)
  return { minimum_stock, zero_quantity }
```

| List | Rule | Order |
|---|---|---|
| `minimum_stock` | in stock, has a `min_stock` above 0, and `quantity <= min_stock` | quantity, lowest first |
| `zero_quantity` | `quantity <= 0`, never-stocked products included | product name |

Inactive products and service items (which hold no stock) are left out at the query. The split is a `static` method (`stockAlerts(levels)`) so the rules can be unit-tested without a database.

## 6. Design decisions and gotchas

- **`null` means "not allowed", `0.0` means "nothing".** Clients must not treat them alike: a hidden tile versus an empty one.
- **Any-of at the door, each-of inside.** The controller lets a user with either View operation in; the service decides per figure. Reuse the same repository query for both so they can't drift.
- **Payables are negated.** Journal lines give debit minus credit; a liability's balance is credit minus debit, so the sign flips once, in the service, and the page shows a positive "you owe" number.
- **Balances use every journal, not only manual ones.** Documents post journals too, so the cash figure reflects sales and payments.
- **Weeks start on Sunday.** `today.getDayOfWeek().getValue() % 7` is the days since Sunday (Monday=1 … Saturday=6, Sunday=7→0).
- **Months are AD** (`LocalDate` arithmetic); the web app labels the points and shows other dates in the AD/BS calendar separately.
- **Totals are fetched per day, not per period.** The 12-month chart runs two queries, not twenty-four, and bucketing in Java keeps the period rules in one place.
- **Expired batches are "near expiry".** The cut-off is `<= until` with no lower bound, deliberately.
- **A missing `min_stock` never alerts** in `minimum_stock`; set a minimum on the product to watch it.
- **Rounding everywhere.** Amounts are doubles, so every figure passes through `MoneyUtil.round2` before leaving the service (`1130.10 − 1000.05` is otherwise `130.04999…`).
- **The repository has no CRUD.** Extending `Repository` instead of `JpaRepository` makes "read-only" a compile-time fact.

## 7. Build it yourself: order of work

1. Confirm the journal, document, product and stock tables and their entities exist (they belong to other features); nothing new is needed in `database.sql`.
2. Create the DTOs in `features/dashboard/dtos/` with snake_case `@JsonProperty` names and all-args constructors (JPQL `SELECT new …` needs them).
3. Write `DashboardRepository extends Repository<ProductStock, Integer>` with the eight queries: balances by account type, four range sums, two per-day totals, batches expiring by a date, active stock levels.
4. Write `DashboardService`: the three account-type constants, `periods()` and `stockAlerts()` as static methods (write unit tests for them first: 30 days, Sunday weeks, month ends, the minimum/zero split), `totalIn()`, `can()`, and the six public methods.
5. Write `DashboardController` with `@RequestMapping("/dashboard")`, the default values (`interval=monthly`, `months=6`) and the `@RequiresOperation` lists from section 4.
6. Try it as `admin`: `GET /dashboard/purchase-vs-sales?interval=weekly` should return 12 points ending on a Sunday–Saturday week that holds today; `GET /dashboard/purchase-vs-sales?interval=hourly` should be a 400. Then log in as a user whose role lacks `ViewSalesEntries` and check `sales` is `null` on every point while `purchase` is a number.
