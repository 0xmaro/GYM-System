---
name: gymos-bugfix
description: Workflow for fixing a bug in GymOS (Laravel API + React SPA). Use whenever fixing a bug, a failing test, or an item from docs/KNOWN_ISSUES.md or docs/PERMISSIONS.md in this repo.
---

# Fixing a GymOS bug

1. **Find it in the backlog.** Check `docs/KNOWN_ISSUES.md` and `docs/PERMISSIONS.md`. If the bug isn't listed, add it.
2. **Reproduce it with a test first.** Add or extend a Feature test in `tests/Feature/` (tests use in-memory SQLite through `RefreshDatabase`, and `Client::factory()` / `User::factory()` exist). Run `php artisan test --filter=<name>` and confirm it fails for the right reason.
3. **Fix it at the right layer.**
   - Access control goes on the **server** (route middleware / Gate / Policy). Hiding a button in React is not a fix.
   - Money is integer piasters. Use `App\Helpers\Money`.
   - Before adding a side effect (audit log, WhatsApp job) in a controller, check `app/Observers/*`. Observers already write audit logs, so don't log twice.
   - Reads of `Client` are filtered by `GenderScope`. Any `withoutGlobalScopes()` you add must be deliberate and admin-only.
   - `transactions` and `audit_logs` are append-only (`PreventImmutableModification`). Correct them with a new record.
   - Migrations must run on both MySQL (production) and SQLite (tests). Guard raw `ALTER ... MODIFY` with `DB::getDriverName()`.
4. **Verify.** Run the whole suite with `php artisan test`, run `vendor/bin/pint --dirty`, and run `npm run build` if you touched `resources/js`.
5. **Record it.** Tick the item in `docs/KNOWN_ISSUES.md`, then commit with a message that says what was broken and why. Keep each commit to one bug.
