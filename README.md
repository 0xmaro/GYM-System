# GymOS

A management system for a gym with separate men's and women's sections. It handles members, subscriptions, QR-card check-in, shifts, cash and debts, classes and private sessions, reports, an audit log, and WhatsApp notifications.

**Stack:** Laravel 13 API · React 19 + Vite + Tailwind 4 · MySQL · Redis · Laravel Reverb · Node WhatsApp bot (`whatsapp-bot/`)

```bash
composer setup     # first install
composer dev       # local development
composer test      # tests
```

- Architecture and commands: [CLAUDE.md](CLAUDE.md)
- Permission system: [docs/PERMISSIONS.md](docs/PERMISSIONS.md)
- Bug backlog: [docs/KNOWN_ISSUES.md](docs/KNOWN_ISSUES.md)
- Deployment: [DEPLOYMENT.md](DEPLOYMENT.md) · Test scenarios: [EDGE_CASE_TESTS.md](EDGE_CASE_TESTS.md)
