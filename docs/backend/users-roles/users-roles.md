# Users and roles — Backend

> Part of the Inventory System implementation guide. Read `docs/BRD.md` for the business picture and `docs/backend/backend-setup.md` for how the backend is organised.

## 1. What this is

An administrator creates users, gives each one a role, and decides what a role may do by ticking operations in a permission matrix. Operations are fixed names (`ViewProduct`, `CreatePurchaseEntry`, ...) seeded by `database.sql`, one per guarded controller method; a role is a named set of them; a user has one role. A user can carry a profile picture, uploaded together with the user in one multipart request. This document covers the users API, the roles API, the matrix endpoint, the two dropdowns and the first admin.

## 2. Where the code lives

| File | What is in it |
|---|---|
| `features/user/controllers/UserController.java` | `/users`: list, get, create and update (multipart), delete |
| `features/user/dtos/UserDTO.java` | The user as the API sends and receives it (snake_case) |
| `features/user/dtos/UserRoleOperationsDTO.java` | The `/getUserRoleOperations` answer (auth doc) |
| `features/user/entities/User.java` | The `user` table; also Spring's `UserDetails` |
| `features/user/repositories/UserRepository.java` | Uniqueness checks, `findByUsername`, the dropdown query, `existsByUsernameAndOperation`, `findActiveByOperation` |
| `features/user/services/UserService.java` | Rules, picture files, mapping |
| `features/role_operations/controllers/RoleController.java` | `/roles`: list, get, operations matrix, create, update, delete |
| `features/role_operations/dtos/` | `RoleDTO`, `OperationDTO`, `RoleOperationGroupDTO` (the matrix) |
| `features/role_operations/entities/` | `Role` (its `operations` list goes through `role_operation`), `Operation` |
| `features/role_operations/repositories/` | `RoleRepository` (name checks, `findByName`, dropdown), `OperationRepository` |
| `features/role_operations/services/RoleService.java` | Rules and the matrix grouping |
| `common/dropdown/` | `GET /dropdown/users/{status}`, `GET /dropdown/roles/{status}` |
| `common/config/DataInitializer.java` | The first `admin` user |
| `common/config/WebConfig.java` | Serves pictures at `/uploads/**` |
| `features/notification/repositories/NotificationRepository.java` | `deleteByUserId`, used when a user is deleted |

## 3. Data

From `database.sql`:

| Table | Columns that matter | Links |
|---|---|---|
| `user` | `id`, `full_name`, `username` (unique), `email` (unique), `password` (BCrypt), `gender`, `contact`, `image_url`, `is_active`, `account_non_locked`, `failed_attempt`, `lock_time`, `remarks`, `role_id`, `created_at`, `updated_at` | `role_id` → `role.id`, no cascade |
| `role` | `id`, `name` (unique), `description`, `is_active`, `created_at`, `updated_at` | |
| `operation` | `id`, `name` (unique), `module`, `master_module` | seeded; the API never writes it |
| `role_operation` | `role_id`, `operation_id` (together the primary key) | both `ON DELETE CASCADE`; the `@ManyToMany` join table behind `Role.operations` |

The lock columns belong to the auth doc. `updated_at` is kept by triggers in the SQL file, not by the entities.

The seed inserts every operation and one role, `Admin` (id 1), holding all of them (`INSERT INTO role_operation SELECT 1, id FROM operation`). The operations by `master_module` and `module`:

| master_module | module | operations |
|---|---|---|
| Masters | Category, Unit, Packing, TaxType | Create / View / Edit / Delete + module name (`CreateCategory`, ...) |
| Product | Product | `CreateProduct`, `ViewProduct`, `EditProduct`, `DeleteProduct` |
| Purchase | Vendor, PurchaseEntry, PurchaseReturn | Create / View / Edit / Delete each |
| Sales | Customer | Create / View / Edit / Delete |
| Sales | SalesEntry | `CreateSalesEntry`, `ViewSalesEntries`, `CancelSalesEntry` |
| Sales | SalesReturn | `CreateSalesReturn`, `ViewSalesReturns`, `CancelSalesReturn` |
| Accounting | AccountMaster | `CreateAccountMaster`, `ViewAccountMaster`, `EditAccountMaster`, `DeleteAccountMaster`, `ViewAccount` |
| Accounting | JournalEntry | `CreateJournalEntry`, `ViewJournalEntries`, `EditJournalEntry`, `DeleteJournalEntry` |
| Accounting | Payment | `CreatePayment`, `ViewVendorPayment`, `ViewCustomerPayment`, `EditPayment`, `DeletePayment` |
| Accounting | PaymentAdjustment | `ViewPaymentAdjustment`, `CreatePaymentAdjustment` |
| Accounting | OpeningBalance | `ViewOpeningBalance`, `CreateOpeningBalance` |
| User and Roles | User, Role | Create / View / Edit / Delete each |
| Settings | Configuration, DocumentNumbering | Create / View / Edit / Delete each |
| Inventory | StockAdjustment | Create / View / Edit / Delete |
| Inventory | StockEdit | `ViewStockEdit`, `EditStockEdit` |
| Inventory | OpeningStock | `ViewOpeningStock`, `CreateOpeningStock` |

Mind the irregular plurals (`ViewSalesEntries`, `ViewJournalEntries`): the names must match the `@RequiresOperation` annotations exactly.

## 4. API

Section 17 of `endpoints.md` has the full bodies.

| Method | Path | What it does | Permission |
|---|---|---|---|
| `GET` | `/roles` | Paged list; each role includes `operations` and `operation_ids` | `ViewRole` |
| `GET` | `/roles/{id}` | One role | `ViewRole` |
| `GET` | `/roles/operations/{id}` | Every operation grouped by `master_module` → `module_name`, each with `selected`; `0` for a new role | `ViewRole` |
| `POST` | `/roles` | Create → `Role Added successfully` | `CreateRole` |
| `PUT` | `/roles/{id}` | Update → `Role Updated successfully` | `EditRole` |
| `DELETE` | `/roles/{id}` | Delete → `Role Deleted successfully` | `DeleteRole` |
| `GET` | `/users` | Paged list | `ViewUser` |
| `GET` | `/users/{id}` | One user, `password` always `""` | `ViewUser` |
| `POST` | `/users` | Create, `multipart/form-data` → `User created successfully` | `CreateUser` |
| `PUT` | `/users/{id}` | Update, `multipart/form-data` → `User updated successfully` | `EditUser` |
| `DELETE` | `/users/{id}` | Delete → `User deleted successfully` | `DeleteUser` |
| `GET` | `/dropdown/users/{status}`, `/dropdown/roles/{status}` | `{id, name}` lists; a user's `name` is the username | a login |

**Role body** (`RoleDTO`): `name`, `description`, `is_active`, `operation_ids` (a list of operation ids). Responses add `operations`, each `{id, name, module, master_module}`.

**User body**: the request has two parts, `user` (JSON, required) and `image` (a file, optional). The JSON (`UserDTO`, snake_case) carries `username`, `full_name`, `email`, `password`, `gender`, `contact`, `remarks`, `is_active`, `role_id`. Responses add `role_name` and `image_url` and send `password` as `""`. Both `is_active` and `active` appear (common doc).

## 5. How it works

### 5.1 Listing and getting one

Both lists use the shared paging and filtering (`QueryParamUtil` and `SpecificationBuilder`, common doc), for example `GET /users?username=sit&role.name=store&isActive=1&sort=username:asc`. The role list maps every role with its operations, so each row carries the whole list. `GET /users/{id}` and `GET /roles/{id}` answer 404 `User not found` / `Role not found` for an unknown id.

### 5.2 Creating a user

**Idea.** Username and email uniqueness are checked by the service before saving, so the caller gets a clear 409 rather than a database error. The picture is written to disk under a generated name, and only its URL path is stored on the row.

```
save_user(dto, image):                                      -- one transaction
  username exists                                           -> 409 "Username already exists"
  email exists                                              -> 409 "Email already exists"
  user = new User; copy the fields:
     username and email trimmed
     password given and not blank? store BCrypt(password)    (blank: nothing is set)
     role_id > 0? role = findById(role_id)                  -> 404 "Role not found"
         otherwise role = none
  image part present and not empty?
     extension (lower-cased, after the last ".") not one of jpg, jpeg, png, gif, webp
                                                            -> 400 "Image must be a JPG, PNG, GIF or WEBP file"
     create <upload-dir>/users/ if missing
     copy the bytes to users/<random UUID>.<extension>
     image_url = "/uploads/users/<that file>"
  save -> post_data_id = the new id
```

Why a generated file name: uploads never overwrite each other, and the client's file name can never point outside the upload folder. A write failure throws `RuntimeException("Failed to save image file")`, a 500.

### 5.3 Updating a user

```
update_user(id, dto, image):                                -- not one transaction: each repository call is its own
  user = findById(id)                                       -> 404 "User not found"
  another user has this username                            -> 409 "Username already exists"
  another user has this email                               -> 409 "Email already exists"
  copy the fields as in 5.2: a blank password keeps the current hash; the role is re-resolved the same way
  image part present and not empty?
     save the new file first (same checks as 5.2)           -> 400 on a bad type, and the old picture is untouched
     delete the old file if image_url starts with /uploads/ and resolves inside the upload folder
     image_url = the new path
  save -> post_data_id = id
```

The new picture is saved before the old one is deleted on purpose: a rejected upload leaves the old picture in place. Leaving the `image` part out keeps the current picture; there is no way to remove a picture without replacing it.

### 5.4 Deleting a user

```
delete_user(id):                                            -- one transaction
  user = findById(id)                                       -> 404 "User not found"
  delete the picture file, if any
  notificationRepository.deleteByUserId(id)                 -- the user's notification rows
  delete the row
```

The notifications are removed by the code itself, so the delete does not depend on the database's `ON DELETE CASCADE` on `notification.user_id`. Nothing else points at a user, so no 409 arises here.

### 5.5 The permission matrix (`GET /roles/operations/{id}`)

**Idea.** The screen needs every operation, laid out by module, with the role's own ones ticked. The server answers in that shape so the web app only draws checkboxes.

```
get_all_role_operations(id):
  selected = empty set
  id != 0:  role = findById(id)                              -> 404 "Role not found"
            selected = the ids of role.operations
  for each operation in operationRepository.findAll()        -- table order, so modules appear as seeded
     grouped[master_module][module] += {id, name, selected: id in selected}   (LinkedHashMap: first-seen order kept)
  answer [ {master_module, modules: [ {module_name, operations: [...]}, ... ]}, ... ]
```

`0` is the "new role" case: every operation comes back unselected and no role is looked up.

### 5.6 Creating and updating a role

```
save_role(dto):                                             -- one transaction
  name null or blank after trimming                         -> 400 "Role name cannot be null or blank"
  a role with this trimmed name exists                      -> 409 "Role with the same name already exists"
  role = new Role(trimmed name, description, is_active)
  role.operations = resolve(operation_ids):
       null or empty  -> no operations
       for each id: findById(id)                            -> 404 "Operation not found: <id>"
  save -> post_data_id

update_role(id, dto):                                       -- one transaction
  name null or blank                                        -> 400 "Role name cannot be null or blank"
  role = findById(id)                                       -> 404 "Role not found"
  another role has this trimmed name                        -> 409 "Role with the same name already exists"
  set name, description, is_active
  role.operations.clear(); add resolve(operation_ids)       -- the join rows are rewritten to match the list exactly
  save
```

The whole list is sent every time (`operation_ids`), never a diff: the server clears and refills the join table, which is simple and cannot drift.

### 5.7 Deleting a role

```
delete_role(id):                                            -- NOT one transaction
  role = findById(id)                                       -> 404 "Role not found"
  role.operations.clear(); save(role)                       -- commits: the role_operation rows are gone
  deleteById(id)                                            -- refused while a user still has the role:
                                                               409 "This record is still used by other records, so it cannot be deleted"
```

The 409 comes from SQLite: `user.role_id` references `role.id`, foreign keys are on (`PRAGMA foreign_keys = ON`, common doc), and `GlobalExceptionHandler` turns the constraint error on a `DELETE` into that message. Two things to know:

- **Before foreign keys were enforced** (the user and role pages are older than the PRAGMA), the delete went through and left users whose `role_id` pointed at nothing; `GET /users` then failed for everyone, because mapping each user reads its role. The web app still checks `UserService.countWithRole` before offering the delete, which also gives a friendlier message than the 409. Both guards are worth keeping.
- **The operations are cleared first, and that clearing is committed on its own** because the method is not `@Transactional`. If the delete is then refused, the role still exists but has no operations: every user holding it has just lost all permissions. Re-tick them in the matrix, or put the whole method in one transaction when rebuilding this.

### 5.8 Dropdowns and the first admin

`GET /dropdown/users/active` and `GET /dropdown/roles/active` run the usual nullable-flag query (common doc); a user's `name` is the username, not the full name. `DataInitializer` creates `admin` / `Admin@123` with email `admin@admin.com` and the `Admin` role on the first start of an empty database, through `UserService.saveUser`, so the password is hashed like any other user's.

## 6. Design decisions and gotchas

- **The password never leaves the server.** `mapToDTO` sets `password` to `""`; the hash is only ever compared. On update a blank password means "keep", which is why the response sends `""` too: the web app can send the record back unchanged.
- **No password rule here.** `/users` accepts any password; only `/change-password` enforces `STRONG_PASSWORD` (auth doc). A missing password on create is not checked either: the `nullable = false` column refuses it and the caller gets a 500 with Hibernate's message, so the web app must require it.
- **Nothing is protected.** The `Admin` role and the `admin` user can be edited, deactivated or (once no user holds the role) deleted like any other. Keep a second administrator before experimenting.
- **Operations are data, not an API.** There is no endpoint to add one: a new permission is a row in `database.sql` plus a `@RequiresOperation` on the method, and existing roles get it only when someone ticks it (`Admin` gets everything only at seed time).
- **Editing yourself.** A changed role applies on your next request, since the aspect queries the database each time; a changed username invalidates your token, since it names you (auth doc). Deactivating yourself does not end your current session.
- **Pictures need the auth header.** `image_url` is a path under `/uploads/**`, served by `WebConfig` behind the security filter; the web app fetches it with the token and never uses a bare `<img src>`.
- Deleting a picture first checks that the resolved path stays inside the upload folder, and a failure is logged, not thrown.
- `updateUser` is not transactional while `saveUser` and `deleteUser` are; `deleteRole` is not while `saveRole` and `updateRole` are (5.7).
- A `role_id` of `0` or `null` means no role: such a user can log in but passes no `@RequiresOperation` check.

## 7. Build it yourself: order of work

1. Tables `operation`, `role`, `role_operation` and `user` with the unique constraints and foreign keys; seed the operations and the `Admin` role.
2. Entities `Operation`, `Role` (`@ManyToMany` through `role_operation`) and `User` (`@ManyToOne` role); repositories with `existsByName`, `existsByNameAndIdNot`, `existsByUsername`, `existsByEmail`, their `...AndIdNot` variants, `findByName` and `findByUsername`.
3. `RoleDTO`, `OperationDTO`, `RoleOperationGroupDTO`; `RoleService` list / get / save / update / delete, then the matrix grouping; `RoleController` with `@RequiresOperation`.
4. `UserDTO`; `UserService` with the uniqueness checks, BCrypt and role resolution; then the picture handling (`file.upload-dir`, the `users/` subfolder, UUID names, the extension check, delete-old-after-save) and `WebConfig`.
5. `UserController` with `@RequestPart("user")`, `@RequestPart(value = "image", required = false)` and `consumes = multipart/form-data`.
6. The two dropdown queries; `DataInitializer` for the first admin.
7. Try it with curl: create a role from `GET /roles/operations/0`, create a user with `-F 'user=...;type=application/json' -F image=@photo.png`, fetch the picture with the token, then delete the role while the user holds it and expect 409.
