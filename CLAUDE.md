# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

GymOS is a gym management system for an Egyptian gym with separate men's and women's sections. It covers members, subscriptions, QR-card check-in, staff shifts and cash, debts, classes, PT session packages, reports, an audit log, and WhatsApp notifications. The UI and most code comments are in Arabic (`APP_LOCALE=ar`), and the UI is RTL.

Stack: a Laravel 13 (PHP 8.3) JSON API, a React 19 SPA served by Vite from the same app, MySQL, Redis (cache, session and queue), Laravel Reverb (websockets), and a separate Node WhatsApp bot.

## Commands

```bash
composer setup        # first install: deps, .env, key, migrate, npm build
composer dev          # serve + queue:listen + pail logs + vite, all together
composer test         # config:clear, then php artisan test
php artisan test --filter=AttendanceTest              # one test class
php artisan test --filter=test_method_name            # one test method
vendor/bin/pint       # PHP code style
npm run build         # production frontend build into public/build

php artisan reverb:start     # websockets (needed for live attendance and admin notifications)
php artisan queue:work       # needed for WhatsApp, receipt PDF, and reminder jobs
php artisan schedule:work    # runs the scheduled jobs in routes/console.php locally
```

Tests run against in-memory SQLite (see `phpunit.xml`), while the real app uses MySQL. Raw SQL or MySQL-specific features (enum alterations, `CURDATE()`) can behave differently under test, so guard raw `ALTER ... MODIFY` in migrations with `DB::getDriverName()`. Baseline as of 2026-11-24: 17 tests pass and 2 fail. The 2 failures are real bugs tracked in `docs/KNOWN_ISSUES.md`.

Custom artisan commands (`app/Console/Commands`): `gymos:monitor-whatsapp`, `gymos:monitor-queues`, `gymos:cleanup`, `gymos:import-clients`, `gymos:reset-password`, `whatsapp:send-scheduled`. Backups use spatie/laravel-backup.

## Before fixing anything
- `docs/KNOWN_ISSUES.md` is the bug backlog, and `docs/PERMISSIONS.md` is the full analysis of the current access-control system, which is broken and slated for a rework. Read the relevant one first and tick items off as they're fixed.
- Project skills: `.claude/skills/gymos-bugfix` (test-first fix workflow and pitfalls) and `.claude/skills/gymos-dev` (running the stack).
- `graphify-out/` holds a knowledge graph of the codebase (`GRAPH_REPORT.md`, `graph.html`). Use `/graphify query "..."` for structural questions, and `/graphify . --update` after big changes.

## Architecture

### Backend (Laravel)
- **Everything is under `/api/v1`** (`routes/api.php`), with Sanctum bearer tokens. `routes/web.php` is a catch-all that returns `welcome.blade.php`, which mounts the React app. Any new web route must go before that catch-all.
- **API middleware stack** (`bootstrap/app.php`): `ForceJsonResponse` runs first. `SecurityHeaders`, `SanitizeInput` and `PreventImmutableModification` run last. The last one returns 405 for any PUT, PATCH or DELETE on `audit-logs/*` and `transactions/*`. Financial and audit records are append-only by design, so fix a mistake by adding a reversing record, not by editing.
- **Roles** are `admin`, `reception` and `captain` (the `users.role` column). The only server-side gate is `role:admin` on some routes. Everything else is open to any logged-in user. Users also carry a `permissions` JSON array of page keys, which only the frontend checks and which the backend never saves. See `docs/PERMISSIONS.md`.
- **Gender isolation:** `users.gender_access` is `male`, `female` or `both`. `GenderScope` is a global scope on `Client` only, so staff don't see clients of the other gender. Queries that must cross genders need `withoutGlobalScope(GenderScope::class)`. Requests with no authenticated user (queues, the scheduler) are not filtered. Known holes are listed in `docs/PERMISSIONS.md`.
- **Money is stored as integer piasters** (1 EGP = 100). Use `App\Helpers\Money::toPiasters()` and `Money::format()`. In JS, use `formatMoney()` from `resources/js/lib/api.js`. Never store floats.
- **Side effects run through Observers**, which are registered in `AppServiceProvider` for Client, ClientSubscription, Attendance, Transaction and StaffShift. These observers write audit logs and dispatch the WhatsApp jobs in `app/Jobs`. The `LogsActivity` trait also writes to `audit_logs`. Check the observers before adding duplicate side effects in a controller.
- **Business rules worth knowing:**
  - Attendance check-in uses `lockForUpdate()` to prevent double scans and negative session counts.
  - The duplicate check-in window, freeze limits, the QR prefix (`GYM-00001`) and the expiry warning days are in `config/gymos.php`.
  - Recording income requires an open staff shift, and a user can have only one open shift.
  - A discount above the `max_discount_without_approval` setting becomes a `DiscountRequest` that an admin must approve.
  - Runtime settings live in the `settings` table (`Setting` model), not in config.
- **Realtime:** the broadcast channels are `attendance.{date}` and `admin.notifications` (`routes/channels.php`), with events in `app/Events`. The frontend subscribes through `hooks/useReverb.js`.
- **PDFs and printing:** dompdf renders `resources/views/receipts/invoice.blade.php` and `print/qr-cards.blade.php`. Excel import goes through maatwebsite/excel (`app/Imports/ClientsImport.php`).

### Frontend (`resources/js`)
- The entry point is `app.jsx`, and `GymApp.jsx` holds every route. `ProtectedRoute` checks both `allowedRoles` and a `permKey` against the user's permissions. Add new pages there.
- Server state uses TanStack Query. Client state uses zustand stores in `store/` (auth, attendance, notifications).
- Every API call goes through `lib/api.js`, an axios client with base `/api/v1`. It sends the bearer token from `localStorage.token` and redirects to `/login` on a 401.
- Styling is Tailwind v4 (through `@tailwindcss/vite`), with lucide-react icons, recharts and react-hot-toast.

### WhatsApp
- **`whatsapp-bot/`** is the active bot: Express plus wppconnect on port 5004, run with pm2 through `ecosystem.config.js`. Laravel's `WhatsAppController` proxies admin actions to it (status, QR login, start and stop, logs, templates, campaigns) through `services.whatsapp_bot` (`WHATSAPP_SERVICE_URL` / `WHATSAPP_SERVICE_SECRET`). The bot calls back to the public endpoint `POST /api/v1/whatsapp/callback`.
- **Outgoing messages are not sent over HTTP.** `App\Services\WhatsAppService::send()` appends to a JSON file, `pending_connection.json`, and the bot picks messages up from that file. Every message is also recorded as a `WhatsappLog` row. Laravel writes the file under `base_path('../whatsapp-bot/logs')`, which is outside this repo, while the bot reads `whatsapp-bot/logs/` inside it. Check that these two paths line up on the machine you deploy to.
- **`whatsapp-service/`** is an older whatsapp-web.js and Bull microservice on port 3001. `gymos:monitor-whatsapp` still pings `localhost:3001/status`.

## Reference docs in the repo
- `EDGE_CASE_TESTS.md`: 15 edge-case scenarios covering data integrity, security, and the expected status codes and messages. These are the intended behaviors for attendance, freezes, shifts, discounts and gender access.
- `DEPLOYMENT.md`: local development with Laragon or Herd, and production on Ubuntu with Nginx and certbot. In production, the queue worker and Reverb must run as background services.
- `app/docs/guides/`: emergency procedures and a final launch checklist.
- The old DB dumps and code archives were moved to `../gymos-archive/`, outside the repo. `.gitignore` blocks `*.sql`, `*.zip`, `*.tar.gz`, `.env` files and the WhatsApp session folders. Never commit them.
- Migrations named `xxxx_create_whatsapp_*` are already applied in production under those names. Don't rename them.
