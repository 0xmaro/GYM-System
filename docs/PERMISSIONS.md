# How permissions work in GymOS today (before the rework)

> Written 2026-11-24 from reading the code. This describes how the system works **today**, before the rework.

## The building blocks

| Field in `users` | Values | Where it is used |
|---|---|---|
| `role` | `admin` / `reception` / `captain` | Backend: `role:admin` middleware on a few routes. Frontend: deciding which pages and links appear |
| `permissions` (JSON) | page keys such as `clients`, `debts`, `finance`... | **Frontend only** (`ProtectedRoute` checks `permKey`). The backend never reads it |
| `gender_access` | `male` / `female` / `both` | `GenderScope` on the `Client` model: it filters which members a user sees |
| `is_active` | bool | An inactive user cannot log in |

Page keys come from the `PAGES` list in `resources/js/pages/Staff.jsx`: dashboard, attendance, classes, clients, subscriptions, notifications, debts, finance, qr_cards, reports, staff, audit_logs, whatsapp, settings.

## The 4 layers that check access (none of them talks to the others)

1. **API routes** (`routes/api.php`): some routes have `role:admin` (`CheckRole`). **Everything else is open to any logged-in user.**
2. **GenderScope**: a global scope on `Client` only. Not on `Attendance`, `ClientSubscription`, `Debt` or `Transaction`.
3. **Frontend routes** (`GymApp.jsx` → `ProtectedRoute`): `allowedRoles` + `permKey`. Admin skips the `permKey` check.
4. **Sidebar** (`components/Layout.jsx`): filters links by `roles` only. It ignores `permissions` completely.

There are also scattered checks inside controllers: `ShiftController:70` (a user can only close their own shift unless they are admin), `ClassController:19` (a captain sees only their own classes), and `AuditLogController:101`.

## Problems found

### Critical (security)
1. **Permissions are never saved.** Staff.jsx sends `permissions`, but `AuthController@store/update` doesn't validate or save them. Every user ends up with `permissions = NULL`.
2. **`gender_access` is always `both`.** `store()` hardcodes it, and there's no way to change it from the UI or the API. So gender separation is effectively off.
3. **The backend ignores `permissions` entirely.** The only server-side protection is `role:admin`, so any reception or captain user can call these directly through the API:
   - `DELETE /clients/{id}`, `PUT /subscriptions/{id}`, `POST /subscriptions`. The test `captain_cannot_modify_subscriptions` fails because of this.
   - Full CRUD on `subscription-types`, `session-types` and `classes` (prices and plans).
   - `POST /notifications/send-bulk` (bulk WhatsApp messages), `POST /debts/{id}/mark-paid`, all `qr-cards` actions including delete.
4. **Bypassing `GenderScope` through a query parameter.** `GET /clients?gender=female` calls `withoutGlobalScopes` for **any** user, so a male-side employee can list female members (`ClientController` ≈ line 52).
5. Attendance (`AttendanceController` qrScan/manual/session) uses `Client::withoutGlobalScopes()`. Any employee can check in a member of either gender. This might be intended for the scanner, but it isn't documented.

### Breaks the app for non-admin users
6. **`/login` doesn't return `permissions`** (only `/me` does). Right after login, `user.permissions` is `undefined`.
7. **Infinite redirect.** If a non-admin user doesn't have `attendance` in their permissions, `ProtectedRoute` sends them to `/attendance`, which has `permKey="attendance"`, so they get sent there again, forever. Because of problem 1, this hits **every** non-admin user.
8. That's why the live database (the dump) has only **2 users, both admin**, even the captain. In practice the permission system has never actually run.

### Design
9. Three sources of truth that disagree: `PAGES` in Staff.jsx, `links` in Layout.jsx, and the routes in GymApp.jsx. For example, `manual-subscription-notifications`, `session-types` and `client-sessions` are missing from `PAGES`.
10. Permissions cover **pages**, not **actions**. There is no "can view but not edit", and no "can give a discount up to X".
11. `role` and `permissions` overlap with no clear rule: is the role a template, or a limit?

## Suggested direction for the rework (a proposal)
- **One source of truth on the backend:** a list of action-level permissions (`clients.view`, `clients.create`, `subscriptions.freeze`, `finance.expense`, `whatsapp.bulk`...) in an enum or config, sent to the frontend through `/me`.
- **Roles as templates:** each role has a default set of permissions, plus per-user changes on top. Either use `spatie/laravel-permission` or a small in-house solution on top of Gates.
- **Enforcement on the server:** `Gate::before` for admin, middleware `can:` on every route (or Policies per model). The frontend only hides things for convenience.
- **Gender as a data scope, not a permission:** apply it to every model linked to a member (through `whereHas('client')`, or by adding a `gender` column), with a single, documented, admin-only bypass.
- **Tests:** a test for each (permission × endpoint) pair, so nothing gets opened by mistake.
