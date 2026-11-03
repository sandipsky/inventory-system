# Masters (Units, Categories, Packings, Tax Types) — Backend

> Part of the Inventory System implementation guide. Read `docs/BRD.md` for the business picture and `docs/backend/backend-setup.md` for how the backend is organised.

## 1. What this is

The masters are the small lookup lists a product is described with: its **unit** (Pcs, Box), **category** (Beverages), **packing** (Box of 12) and **tax type** (VAT 13%). A user keeps each list up to date: adds a name, renames it, switches it off, deletes it. The system keeps names unique, hides inactive ones from the dropdowns that forms use, and refuses to delete a record a product still points at.

All four features are the same code copied four times. This document describes the pattern once (using units as the example) and then lists what differs.

## 2. Where the code lives

Each master is its own package under `features/masters/`, with the same five files:

| File (units; swap `unit`/`Unit` for the others) | What is in it |
|---|---|
| `features/masters/unit/controllers/UnitController.java` | The five endpoints under `/master/units`, each annotated with `@RequiresOperation` |
| `features/masters/unit/services/UnitService.java` | Validation, duplicate check, paging, mapping between DTO and entity |
| `features/masters/unit/entities/Unit.java` | JPA entity for the `unit` table |
| `features/masters/unit/dtos/UnitDTO.java` | Request and response shape (`id`, `name`, `is_active`) |
| `features/masters/unit/repositories/UnitRepository.java` | `JpaRepository` + `JpaSpecificationExecutor`, `existsByName`, `existsByNameAndIdNot`, the dropdown query |

The packages are `features/masters/unit`, `features/masters/category`, `features/masters/packing`, `features/masters/taxtype`.

Shared pieces used by all four (described in depth in the `common` doc):

| File | Role here |
|---|---|
| `common/util/QueryParamUtil.java` | Turns `pageIndex`, `pageSize`, `sort` into a `Pageable`; strips them (and `calendar`) from the filters |
| `common/util/SpecificationBuilder.java` | Turns the remaining query params into "contains" filters |
| `common/exception/GlobalExceptionHandler.java` | Maps the exceptions below to 400 / 404 / 409 JSON errors |
| `common/dropdown/controllers/DropdownController.java`, `services/DropdownService.java` | The `/dropdown/...` lists that forms fill select boxes from |

## 3. Data

Four tables in `backend/database.sql`, one per master, all with the same columns:

| Column | Meaning |
|---|---|
| `id` | `INTEGER PRIMARY KEY AUTOINCREMENT` |
| `name` | `TEXT NOT NULL`. Uniqueness is enforced by the service (see 5.2), not by the table |
| `is_active` | `INTEGER DEFAULT 1`; `1` = shown in `active` dropdowns |
| `created_at`, `updated_at` | Timestamps; a trigger (`unit_updated_at` etc.) refreshes `updated_at` on every update. The entities don't map them |

The tables are `unit`, `category`, `packing` and `tax_type`. `tax_type` has one extra column, `tax_rate REAL NOT NULL DEFAULT 0`, the percent (13 for 13%).

Who points at them: the `product` table has `category_id`, `unit_id`, `packing_id` and `tax_type_id`, each a `FOREIGN KEY` to the matching master. Nothing else references them. The database runs with `PRAGMA foreign_keys = ON` (set per connection in `application.properties`), which is what makes a delete of a used record fail.

The entity declares `@Column(nullable = false, unique = true)` on `name`, but `database.sql` creates the column without `UNIQUE`; treat the service's `existsByName` check as the one that matters.

## 4. API

| Master | Base path | Permissions (View / Create / Edit / Delete) |
|---|---|---|
| Units | `/master/units` | `ViewUnit`, `CreateUnit`, `EditUnit`, `DeleteUnit` |
| Categories | `/master/categorys` (spelled like this) | `ViewCategory`, `CreateCategory`, `EditCategory`, `DeleteCategory` |
| Packings | `/master/packings` | `ViewPacking`, `CreatePacking`, `EditPacking`, `DeletePacking` |
| Tax types | `/master/taxtypes` | `ViewTaxType`, `CreateTaxType`, `EditTaxType`, `DeleteTaxType` |

| Method | Path | What it does | Permission |
|---|---|---|---|
| `GET` | `/master/units` | Paged list, filtered and sorted by query params | `ViewUnit` |
| `GET` | `/master/units/{id}` | One record | `ViewUnit` |
| `POST` | `/master/units` | Create; answers `post_data_id` = new id, `"Unit Added successfully"` | `CreateUnit` |
| `PUT` | `/master/units/{id}` | Update; `"Unit Updated successfully"` | `EditUnit` |
| `DELETE` | `/master/units/{id}` | Delete; `"Unit Deleted successfully"` | `DeleteUnit` |
| `GET` | `/dropdown/units/{status}` | `{id, name}` list for select boxes | any logged-in user |

The controller method is annotated with `@RequiresOperation("ViewUnit")` and so on; the aspect behind it answers **403** `"Operation not allowed"` when the user's role lacks the operation. Full request and response shapes: `backend/endpoints.md` section 5 (masters) and section 4 (dropdowns).

Request body: `{ "name": "Pcs", "is_active": true }`; tax types add `"tax_rate": 13`. The `id` in the body is ignored (the path carries it).

**The `is_active` / `active` quirk.** The DTO's field is `boolean isActive` annotated `@JsonProperty("is_active")`, with Lombok generating `isActive()` / `setActive()`. Jackson sees two properties: `is_active` from the annotation and `active` from the getter. So every response carries both (`"is_active": true, "active": true`). Clients should **send `is_active`**. The same happens for every `boolean isX` field in the project.

Dropdown paths are not all plural: `/dropdown/units/{status}`, `/dropdown/packings/{status}`, `/dropdown/taxtypes/{status}` but `/dropdown/category/{status}`.

## 5. How it works

### 5.1 Listing and filtering

**Idea.** The list endpoint takes any query params. Three are reserved for paging and sorting; everything else is treated as a field filter. There is no hand-written filtering code per master: the list uses the shared `SpecificationBuilder` filters, so `?name=bev` and `?isActive=1` work without the service knowing about them.

**Steps.**

```
list(params):
  pageable = QueryParamUtil.toPageable(params)       -- pageIndex (default 0), pageSize (default 25),
                                                      -- sort "field:asc,other:desc" (case-insensitive order)
  filters  = QueryParamUtil.toFilterParams(params)   -- drop pageIndex, pageSize, sort, calendar and blank values
  spec     = specBuilder.buildSpecification(filters) -- each filter: lower(field) LIKE %value%
                                                      -- unknown field names are skipped, not errors
  page     = repository.findAll(spec, pageable)
  return page.map(toDTO)                             -- Spring's Page JSON: content, totalElements, totalPages, ...
```

Filter names are the **entity's** field names: `name`, `isActive` (send `1` or `0`, since the match is "contains" on the stored text), `id`. Sorting uses the same names (`sort=name:asc`).

### 5.2 Creating

**Idea.** Only two rules: a name is required, and it must not already exist. The name is trimmed before both the check and the save, so `" Pcs "` and `"Pcs"` are the same record.

**Steps.**

```
create(dto):
  if name is null or blank            -> 400 "Unit name cannot be null or blank"
  if existsByName(name.trim())        -> 409 "Unit with the same name already exists"
  entity.name   = name.trim()
  entity.active = dto.is_active
  (tax type only) entity.taxRate = dto.tax_rate
  save; respond with the new id
```

No `@Transactional` is needed: it is a single insert, and Spring Data's `save` runs in its own transaction.

**Rules checked.**

- Blank name → **400** `"Unit name cannot be null or blank"` (`BadRequestException`).
- Existing name → **409** `"Unit with the same name already exists"` (`DuplicateResourceException`).
- Category and packing say `Category` / `Packing`; tax types say `Tax Type` with a space: `"Tax Type name cannot be null or blank"`, `"Tax Type with the same name already exists"`.

### 5.3 Getting one

`findById`, else **404** `"Unit not found"` (`ResourceNotFoundException`); `"Category not found"`, `"Packing not found"`, `"Tax Type not found"`.

### 5.4 Updating

**Idea.** Same checks as create, but the duplicate check must ignore the record itself (`existsByNameAndIdNot`), otherwise saving a record without renaming it would be refused.

**Steps.**

```
update(id, dto):
  if name is null or blank                   -> 400 "Unit name cannot be null or blank"
  existing = findById(id)                    -> 404 "Unit not found"
  if existsByNameAndIdNot(name.trim(), id)   -> 409 "Unit with the same name already exists"
  copy name (trimmed), is_active (and tax_rate) onto existing
  save; respond with id
```

Every field is overwritten from the body; there is no partial update. Renaming a unit renames it on every product that uses it, since products store the id.

### 5.5 Deleting

**Idea.** The service doesn't check whether a product uses the record. It just deletes, and lets the database's foreign key refuse. `GlobalExceptionHandler` walks the exception's causes looking for SQLite's `FOREIGN KEY constraint failed` text and turns it into a 409 with a readable message. That keeps every delete in the project consistent without a per-feature "is it used?" query.

**Steps.**

```
delete(id):
  findById(id)            -> 404 "Unit not found"
  repository.deleteById(id)
  -- a product still pointing at it: SQLite rejects the delete
  -- GlobalExceptionHandler sees "FOREIGN KEY constraint failed" on a DELETE request
  --   -> 409 "This record is still used by other records, so it cannot be deleted"
```

The alternative when a record is in use is to set `is_active` to false: it disappears from the `active` dropdowns but stays on the products that already have it.

### 5.6 Dropdowns

**Idea.** Forms need `{id, name}` lists, not pages, and every user with a form needs them, so the dropdown endpoints are not gated by an operation (only by being logged in). The `status` path segment picks active-only or everything.

**Steps.**

```
GET /dropdown/units/{status}:
  isActive = (status equalsIgnoreCase "active") ? true : null     -- anything else, e.g. "all", means no filter
  SELECT new DropdownDTO(u.id, u.name) FROM Unit u
   WHERE (:isActive IS NULL OR u.isActive = :isActive)
```

The query has no `ORDER BY`, so rows come back in table order (by id). The frontend asks for `active` when adding and merges a saved record's own (possibly inactive) value back into the options when editing, so an inactive unit still shows its label.

## 6. Design decisions and gotchas

- **Four copies, not one generic master.** Each master has its own table, path, permission names and messages, so the straightforward way was four identical packages. The web app does the opposite: one `MasterList` / `MasterForm` driven by a config table. If you add a fifth master, copy a package and rename.
- **`/master/categorys`** is a misspelling that is now part of the API; the web app and `endpoints.md` use it. The dropdown is `/dropdown/category/{status}` (singular). Keep both as they are, or change every caller.
- **Duplicate check is exact, after trimming.** `existsByName` compares with SQL `=`; SQLite compares text case-sensitively by default, so `Pcs` and `pcs` are two different names, while list filters are case-insensitive. Decide which you want before rebuilding.
- **Delete relies on the database.** It only works because `PRAGMA foreign_keys = ON` is sent on every connection (`spring.datasource.hikari.connection-init-sql`). Without it SQLite ignores foreign keys and the delete would silently orphan products.
- **`is_active` is text-matched in filters.** Booleans are stored as `1` / `0`, and the filter is "contains" on the text form, so filter with `isActive=1`, never `isActive=true`.
- **Tax rate is only stored here.** The backend never computes tax from it. Product responses copy the rate (`tax_rate`) from the product's tax type, the browser computes the invoice totals, and the documents store the totals they are sent. Changing a tax type's rate changes nothing already saved.
- **No `@Transactional` and no audit.** Each operation is one statement. `created_at` / `updated_at` exist in the table and are kept by SQLite defaults and triggers, but are not exposed.

## 7. Build it yourself: order of work

1. **Tables**: add `unit`, `category`, `packing`, `tax_type` to `database.sql` with `id`, `name`, `is_active`, timestamps and the `updated_at` trigger; give `tax_type` a `tax_rate REAL NOT NULL DEFAULT 0`. Make sure foreign keys are switched on for every connection.
2. **Entity** per table: `@Entity @Table(name = "unit")`, identity id, `name`, `boolean isActive` (tax type: `double taxRate`).
3. **Repository**: `JpaRepository<Unit, Integer>` + `JpaSpecificationExecutor<Unit>`, with `existsByName(String)`, `existsByNameAndIdNot(String, int)` and the JPQL dropdown query returning `DropdownDTO(id, name)` filtered by an optional `isActive`.
4. **DTO**: `id`, `name`, `is_active` (field `isActive` with `@JsonProperty("is_active")`), snake-case naming; tax type adds `tax_rate`.
5. **Service**: `save`, `getPaginatedList(params)` using `QueryParamUtil` + `SpecificationBuilder`, `getById`, `update`, `delete`, with the messages from section 5 and private `mapToDTO` / `mapDtoToEntity` helpers that trim the name.
6. **Controller** at `/master/units` with the five mappings; return `ResponseUtil.success(id, "Unit Added successfully")` and friends from the write endpoints.
7. **Permissions**: annotate each method with `@RequiresOperation("ViewUnit")`, `"CreateUnit"`, `"EditUnit"`, `"DeleteUnit"`, and make sure those operation names exist in the `operation` seed data and are granted to the Admin role.
8. **Dropdown**: add `getUnitsDropdown(status)` to `DropdownService` and `GET /dropdown/units/{status}` to `DropdownController`.
9. **Try it**: log in, `POST /master/units` with `{"name":"Pcs","is_active":true}`, post it again and expect 409, `GET /master/units?name=pc&sort=name:asc`, `PUT`, create a product using the unit, then `DELETE` it and expect the 409 "still used" message.
10. Repeat 1–9 for category (path `/master/categorys`, dropdown `/dropdown/category`), packing and tax type.
