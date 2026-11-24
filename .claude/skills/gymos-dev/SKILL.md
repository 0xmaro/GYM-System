---
name: gymos-dev
description: Start, run and inspect the GymOS stack locally (Laravel, queue, Reverb, Vite, WhatsApp bot, MySQL/Redis). Use when asked to run the app, check that a change works in the browser, or debug the queue, websocket or WhatsApp services.
---

# Running GymOS locally

Services and ports:

| Service | Command | Port |
|---|---|---|
| Laravel API + SPA | `php artisan serve` | 8000 |
| Vite (HMR) | `npm run dev` | 5173 |
| Queue worker (WhatsApp, PDF and reminder jobs) | `php artisan queue:listen --tries=1` | uses Redis |
| Reverb websockets | `php artisan reverb:start` | 8080 |
| Scheduler | `php artisan schedule:work` | – |
| WhatsApp bot (active) | `cd whatsapp-bot && node server.js` (pm2: `ecosystem.config.js`) | 5004 |
| Legacy WhatsApp service | `cd whatsapp-service && node index.js` | 3001 |

- `./start.sh` starts everything (serve, vite, reverb, queue, scheduler, whatsapp-bot), checks MySQL and Redis, and can start Redis for you. Flags: `--no-whatsapp`, `--no-scheduler`. `composer dev` starts only serve, queue, pail and vite.
- MySQL and Redis must be running (`.env` sets `DB_CONNECTION=mysql`, `QUEUE_CONNECTION=redis`, `CACHE_STORE=redis`).
- Health checks: `curl localhost:8000/api/v1/health`, `php artisan gymos:monitor-queues`, `php artisan gymos:monitor-whatsapp`, and `curl localhost:5004/health`.
- Logs: `php artisan pail`, `storage/logs/laravel.log`, `whatsapp-bot/logs/*.json`.
- Logging in: `POST /api/v1/auth/login {phone, password}` returns a bearer token. `database/seeders/AdminSeeder.php` creates the admin account.
- Never commit `.env`, `whatsapp-bot/tokens/`, `whatsapp-service/.wwebjs_auth/`, or DB dumps. They're already in `.gitignore`.
