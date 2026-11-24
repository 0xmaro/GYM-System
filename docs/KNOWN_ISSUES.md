# Known issues (fix backlog)

> Started 2026-11-24. Tick an issue off when it's fixed, and add a test that proves it.
> For the permission problems, see [PERMISSIONS.md](PERMISSIONS.md).

## Failing tests right now (`php artisan test`: 17 ✓ / 2 ⨯)
- [ ] `SecurityTest::captain_cannot_modify_subscriptions`: a captain can create a subscription (201 instead of 403). See PERMISSIONS #3.
- [ ] `SubscriptionTest::freeze_extends_end_date_correctly`: `POST /clients/{id}/freeze` returns 422. Check the validation in `ClientController@freeze` against the payload (`freeze_days`, `reason`).

## WhatsApp
- [ ] **Messages don't reach the bot:** `WhatsAppService::send()` writes to `base_path('../whatsapp-bot/logs')`, which is **outside** the project. The bot reads `whatsapp-bot/logs/pending_connection.json` inside the project. Fix: put the path in config (`services.whatsapp_bot.queue_path`).
- [ ] Two services: `whatsapp-bot` (port 5004, wppconnect) is the active one. `whatsapp-service` (port 3001, whatsapp-web.js) is still used by `SendReceiptMessage`, `HealthController` and `gymos:monitor-whatsapp`. Pick one, move the other's callers over, then delete the unused one.
- [ ] `whatsapp-bot/package.json` is copied from another project (`sedrat-fatma`) and pulls in mongoose, paypal, twilio and puppeteer... most likely unused (757MB).
- [ ] The bot's CORS is `origin: '*'`.

## Realtime (Reverb)
- [ ] The `AttendanceCheckin` event is never dispatched anywhere.
- [ ] The `useReverb` hook is never used by any page, so the frontend doesn't listen to any channel.

## Docs that describe features which don't exist
- [ ] `EDGE_CASE_TESTS.md` EC-15 and `emergency-procedures.md` describe an offline mode (attendance stored in IndexedDB and synced later). The frontend has no code for it. Either build it or remove it from the docs so nobody relies on it.
- [ ] `FINAL_CHECKLIST.md` checks the WhatsApp service on port 3001, but the bot in use is on 5004.
- [ ] Import cycle in the bot: `server.js` ↔ `services/whatsappService.js`.

## Database / migrations
- [ ] Two migrations are named `xxxx_create_whatsapp_*`. **Don't rename them** without updating the `migrations` table in production first, or they'll run again.
- [x] The `add_session_to_attendance_type_enum` migration used to break SQLite, so no test could run. Fixed: it now skips anything that isn't MySQL.

## Cleanup done (2026-11-24)
- Moved the archives and dumps to `../gymos-archive/` (outside the project): `gymos-code-only.tar.gz`, `public.zip`, `gymos-full.sql` (has real data), `gymos_structure.sql`, and a stray token file.
- Deleted unused files: `views/app.blade.php`, `CheckGymAccess`, `CheckGenderAccess` (did nothing), `LogsActivity` (would have logged twice alongside the observers), `AttendanceResource`, `attendanceStore.js`, `notificationStore.js`, ExampleTests, the empty `database.sqlite`, empty JSON files at the root of whatsapp-bot, and the empty `app/Listeners` folder.
- Everything is in git, so any deleted file can be restored from the first commit (`git show 509a73e:<path>`).
