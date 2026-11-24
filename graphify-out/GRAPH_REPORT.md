# Graph Report - gymos  (2026-11-24)

## Corpus Check
- 216 files · ~89,945 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 12 file(s) not represented in the graph (top: (none) 7, .example 2, .xml 1)

## Summary
- 1433 nodes · 2953 edges · 137 communities (66 shown, 71 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 115 edges (avg confidence: 0.85)
- Token cost: 122,910 input · 0 output

## Community Hubs (Navigation)
- WhatsApp Bot Service
- Frontend Build & Realtime
- Shifts & Broadcast Events
- Classes Sessions Reports API
- Clients API & Validation
- Clients & Debts Pages
- Artisan Commands & Factories
- Auth Staff Debts Discounts
- SPA Routing & Layout
- Permissions & Known Issues
- Bot Routes & Auth
- Database Migrations
- Client Model Usage
- API Routes Health Settings
- QR Card Lifecycle
- WhatsApp Message Pipeline
- API Middleware Stack
- WhatsApp Notification Jobs
- Subscription Observer & Jobs
- Feature Tests
- Bot Dependencies
- WhatsApp Admin Page
- Audit Logging Calls
- Client Observer & Profile
- WhatsApp Controller Proxy
- Observers Registration
- Dashboard Stats
- Core Models
- Debts & Reminders
- Database Seeders
- Profile
- Attendance
- messageQueue / status
- ClientSeeder / ClientsImport
- Client / User
- CLAUDE / EDGE_CASE_TESTS
- ClientSession / ClientSessionController
- 2026_04_03_210004_create_qr_cards_table 
- AttendanceController
- Client / GenderScope
- AttendanceController / AttendanceObserve
- CLAUDE / FINAL_CHECKLIST
- CLAUDE / EDGE_CASE_TESTS
- ManualSubscriptionNotificationController
- authMiddleware / index
- Index / TodayClasses
- Form
- AuditLogController
- composer
- 2026_04_24_044637_add_manual_notificatio
- KNOWN_ISSUES
- SubscriptionContract
- GenerateReceiptPdf / SendReceiptMessage
- composer
- composer
- package / server
- client / package
- Dashboard
- SubscriptionTypes
- AttendanceTest
- AuditLogs
- SubscriptionEdit
- QrCards
- SessionTypes
- CLAUDE / EDGE_CASE_TESTS
- WhatsAppController / WhatsappCampaign
- ProductionSeeder / SubscriptionType
- app / index
- composer
- composer
- SubscriptionTest
- Index
- Form
- CLAUDE / DEPLOYMENT
- CLAUDE / emergency-procedures
- CLAUDE / EDGE_CASE_TESTS
- composer
- 0001_01_01_000001_create_cache_table
- 2026_04_22_203322_expand_phone_number_in
- 2026_04_22_215614_add_capacity_and_durat
- 2026_04_24_054319_alter_qr_cards_add_lif
- 2026_04_24_072410_alter_subscription_typ
- 2026_04_24_082939_make_subscription_id_n
- Money
- 2026_04_03_210001_create_users_table
- 2026_04_03_210002_create_subscription_ty
- 2026_04_03_210003_create_clients_table
- 2026_04_03_210005_create_staff_shifts_ta
- 2026_04_03_210006_create_client_subscrip
- 2026_04_03_210007_create_attendance_tabl
- 2026_04_03_210008_create_audit_logs_tabl
- 2026_04_03_210009_create_transactions_ta
- 2026_04_03_210010_create_debts_table
- 2026_04_03_210011_create_classes_table
- 2026_04_03_210012_create_whatsapp_logs_t
- 2026_04_03_210648_create_personal_access
- 2026_04_07_034201_create_settings_table
- 2026_04_24_072445_create_session_types_t
- 2026_04_24_072527_create_client_sessions
- xxxx_create_whatsapp_templates_table
- CLAUDE / EDGE_CASE_TESTS
- composer
- composer
- KNOWN_ISSUES
- package
- KNOWN_ISSUES / PERMISSIONS
- KNOWN_ISSUES
- KNOWN_ISSUES
- KNOWN_ISSUES
- PERMISSIONS
- PERMISSIONS
- EDGE_CASE_TESTS
- EDGE_CASE_TESTS
- EDGE_CASE_TESTS

## God Nodes (most connected - your core abstractions)
1. `ClientSubscription` - 52 edges
2. `Controller` - 45 edges
3. `Client` - 37 edges
4. `react` - 33 edges
5. `WhatsAppController` - 31 edges
6. `GymApp()` - 30 edges
7. `lucide-react` - 29 edges
8. `api` - 27 edges
9. `react-hot-toast` - 25 edges
10. `WhatsappLog` - 24 edges

## Surprising Connections (you probably didn't know these)
- `Launch Security Checks (brute force, gender scope, 405, admin password)` --semantically_similar_to--> `EC-08 Brute Force Protection (429 after 6 attempts, auth.blocked)`  [INFERRED] [semantically similar]
  app/docs/guides/FINAL_CHECKLIST.md → EDGE_CASE_TESTS.md
- `WhatsApp Down: Messages Held in Queue` --semantically_similar_to--> `EC-14 Queue Failure Recovery`  [INFERRED] [semantically similar]
  app/docs/guides/emergency-procedures.md → EDGE_CASE_TESTS.md
- `Internet Outage: Offline Mode Local Attendance Storage` --semantically_similar_to--> `EC-15 Offline to Online Sync (IndexedDB)`  [INFERRED] [semantically similar]
  app/docs/guides/emergency-procedures.md → EDGE_CASE_TESTS.md
- `QR Attendance Checks (5-min duplicate, expired red, offline upload)` --semantically_similar_to--> `EC-15 Offline to Online Sync (IndexedDB)`  [INFERRED] [semantically similar]
  app/docs/guides/FINAL_CHECKLIST.md → EDGE_CASE_TESTS.md
- `Launch Security Checks (brute force, gender scope, 405, admin password)` --references--> `PreventImmutableModification Middleware`  [INFERRED]
  app/docs/guides/FINAL_CHECKLIST.md → CLAUDE.md

## Import Cycles
- 2-file cycle: `whatsapp-bot/server.js -> whatsapp-bot/services/whatsappService.js -> whatsapp-bot/server.js`

## Hyperedges (group relationships)
- **Append-Only Financial/Audit Records Enforcement** — claude_append_only_financial_audit, claude_preventimmutablemodification, edge_case_tests_ec_07_audit_immutability, app_docs_guides_final_checklist_no_updated_deleted_columns, app_docs_guides_final_checklist_security_checks [INFERRED 0.85]
- **Concurrent Check-in Protection** — claude_attendance_lockforupdate, edge_case_tests_ec_01_double_submit, edge_case_tests_ec_03_negative_sessions, edge_case_tests_ec_13_concurrent_qr [INFERRED 0.85]
- **WhatsApp Message Delivery Pipeline** — claude_observers, claude_queue_worker, claude_whatsappservice_file_queue, claude_whatsapp_bot, app_docs_guides_emergency_procedures_whatsapp_down, edge_case_tests_ec_14_queue_failure [INFERRED 0.75]
- **Four uncoordinated access-check layers** — docs_permissions_checkrole_middleware, docs_permissions_genderscope, docs_permissions_protectedroute, docs_permissions_sidebar_layout [EXTRACTED 1.00]
- **Permissions rework proposal** — docs_permissions_action_level_permissions, docs_permissions_roles_as_templates, docs_permissions_server_side_enforcement, docs_permissions_gender_as_data_scope, docs_permissions_permission_endpoint_tests [EXTRACTED 1.00]
- **Legacy whatsapp-service callers to migrate** — docs_known_issues_whatsapp_service, docs_known_issues_sendreceiptmessage, docs_known_issues_healthcontroller, docs_known_issues_gymos_monitor_whatsapp [EXTRACTED 1.00]

## Communities (137 total, 71 thin omitted)

### Community 0 - "WhatsApp Bot Service"
Cohesion: 0.07
Nodes (55): addToFailedMessages(), addToMessageLog(), addToPendingConnectionMessages(), axios, checkAndSendPendingMessages(), classifyError(), cleanupOldMessages(), clearMessageHistory() (+47 more)

### Community 1 - "Frontend Build & Realtime"
Cohesion: 0.06
Nodes (49): dependencies, clsx@^2.1.1, date-fns@^4.1.0, laravel-echo@^2.3.4, lucide-react@^1.8.0, pusher-js@^8.5.0, react@^19.2.4, react-dom@^19.2.4 (+41 more)

### Community 2 - "Shifts & Broadcast Events"
Cohesion: 0.07
Nodes (7): AttendanceCheckin, DiscountRequestCreated, ShiftCashMismatch, ShiftController, DiscountRequest, StaffShift, StaffShiftObserver

### Community 3 - "Classes Sessions Reports API"
Cohesion: 0.07
Nodes (7): ClientSessionController, ReportController, SessionTypeController, SubscriptionController, SubscriptionTypeController, TransactionController, Controller

### Community 4 - "Clients API & Validation"
Cohesion: 0.07
Nodes (8): {closure#4}(), {closure#5}(), QrScanRequest, StoreClientRequest, StoreSubscriptionRequest, UpdateClientRequest, ClientResource, SubscriptionResource

### Community 5 - "Clients & Debts Pages"
Cohesion: 0.13
Nodes (23): lucide-react, react, react-hot-toast, rootElement, api, formatMoney(), AddDebtModal(), Debts() (+15 more)

### Community 6 - "Artisan Commands & Factories"
Cohesion: 0.08
Nodes (8): CleanupExpiredSessions, ImportClientsFromExcel, MonitorQueues, MonitorWhatsAppService, ResetPassword, SendScheduledWhatsApp, ClientFactory, UserFactory

### Community 7 - "Auth Staff Debts Discounts"
Cohesion: 0.13
Nodes (3): AuthController, DebtController, DiscountRequestController

### Community 8 - "SPA Routing & Layout"
Cohesion: 0.17
Nodes (20): recharts@^3.8.1, react-router-dom, recharts, Layout(), GymApp(), ProtectedRoute(), useAuth(), ClientEdit() (+12 more)

### Community 9 - "Permissions & Known Issues"
Cohesion: 0.09
Nodes (21): SecurityTest::captain_cannot_modify_subscriptions (failing), Problem 5: AttendanceController uses withoutGlobalScopes, AuthController@store/update, Problem 3: backend ignores permissions (open API endpoints), CheckRole (role:admin middleware), Problem 2: gender_access hardcoded to both, GenderScope (global scope on Client), Problem 4: GenderScope bypass via ?gender= (ClientController) (+13 more)

### Community 10 - "Bot Routes & Auth"
Cohesion: 0.11
Nodes (15): validateToken(), addToFailedMessages(), addToPendingConnectionMessages(), checkWhatsAppConnection(), ensureLogDirectory(), FAILED_MESSAGES_FILE, MESSAGE_LOG_FILE, path (+7 more)

### Community 11 - "Database Migrations"
Cohesion: 0.12
Nodes (11): {closure#1}(), {closure#2}(), {closure#3}(), {closure#1}(), {closure#2}(), {closure#3}(), {closure#4}(), {closure#1}() (+3 more)

### Community 14 - "QR Card Lifecycle"
Cohesion: 0.12
Nodes (3): {closure#4}(), QrCardController, QrCard

### Community 15 - "WhatsApp Message Pipeline"
Cohesion: 0.16
Nodes (3): SendWhatsAppMessage, WhatsappLog, WhatsAppService

### Community 16 - "API Middleware Stack"
Cohesion: 0.14
Nodes (6): CheckRole, ForceJsonResponse, PreventImmutableModification, SanitizeInput, SecurityHeaders, StrongPassword

### Community 17 - "WhatsApp Notification Jobs"
Cohesion: 0.38
Nodes (7): GenerateReceiptPdf, SendDebtReminder, SendExpiryReminder, SendFreezeNotification, SendReceiptMessage, SendSessionsAlert, SendWelcomeMessage

### Community 18 - "Subscription Observer & Jobs"
Cohesion: 0.12
Nodes (3): SendRenewalMessage, ClientSubscription, ClientSubscriptionObserver

### Community 19 - "Feature Tests"
Cohesion: 0.13
Nodes (3): SecurityTest, ShiftTest, TestCase

### Community 20 - "Bot Dependencies"
Cohesion: 0.14
Nodes (19): bull, dotenv, ioredis, pm2, qrcode, qrcode-terminal, dependencies, axios@^1.6.0 (+11 more)

### Community 21 - "WhatsApp Admin Page"
Cohesion: 0.24
Nodes (19): BotQueueCard(), CampaignForm(), CampaignsTab(), DashboardTab(), EmptyState(), fmtDate(), getBadge(), IncomingTab() (+11 more)

### Community 22 - "Audit Logging Calls"
Cohesion: 0.15
Nodes (5): ClassController, ClientController, {closure#1}(), {closure#2}(), {closure#3}()

### Community 23 - "Client Observer & Profile"
Cohesion: 0.14
Nodes (3): ClientProfileController, Client, ClientObserver

### Community 25 - "Observers Registration"
Cohesion: 0.13
Nodes (6): Attendance, AttendanceObserver, AppServiceProvider, {closure#1}(), {closure#2}(), {closure#3}()

### Community 28 - "Debts & Reminders"
Cohesion: 0.15
Nodes (3): Debt, Setting, WhatsappTemplate

### Community 29 - "Database Seeders"
Cohesion: 0.17
Nodes (5): AdminSeeder, DatabaseSeeder, QrCardInventorySeeder, SettingsSeeder, SubscriptionTypeSeeder

### Community 30 - "Profile"
Cohesion: 0.23
Nodes (15): ClientProfile(), EmptyState(), formatDate(), formatDateTime(), formatStatus(), FreezeModal(), money(), num() (+7 more)

### Community 31 - "Attendance"
Cohesion: 0.32
Nodes (14): Attendance(), EmptyState(), ErrorCard(), formatMoney(), formatTime(), formatValue(), MetricCard(), Panel() (+6 more)

### Community 32 - "messageQueue / status"
Cohesion: 0.16
Nodes (7): axios, messageQueue, Queue, express, router, getDelayUntilMorning(), isAllowedTime()

### Community 33 - "ClientSeeder / ClientsImport"
Cohesion: 0.21
Nodes (4): ClientsImport, {closure#1}(), QrIdGenerator, ClientSeeder

### Community 35 - "CLAUDE / EDGE_CASE_TESTS"
Cohesion: 0.18
Nodes (12): Internet Outage: Offline Mode Local Attendance Storage, QR Attendance Checks (5-min duplicate, expired red, offline upload), Attendance Check-in lockForUpdate(), Composer/Artisan Dev Commands, config/gymos.php (duplicate window, freeze limits, QR prefix, expiry warning), EC-01 Double Submit Protection, EC-02 Freeze + Expiry Conflict, EC-03 Negative Sessions (+4 more)

### Community 37 - "2026_04_03_210004_create_qr_cards_table "
Cohesion: 0.15
Nodes (3): {closure#1}(), {closure#1}(), {closure#1}()

### Community 38 - "AttendanceController"
Cohesion: 0.24
Nodes (4): AttendanceController, {closure#1}(), {closure#3}(), {closure#4}()

### Community 41 - "CLAUDE / FINAL_CHECKLIST"
Cohesion: 0.22
Nodes (11): Staff Password Reset (gymos:reset-password), Backup Path (config/backup.php) and schedule:run Cron, GymOS Final Pre-Launch Checklist, gymos:health-check command, migrate:fresh --seed ProductionSeeder, WhatsApp Microservice Checks (Node port 3001, health-check, job queued), Custom Artisan Commands (app/Console/Commands), gymos:monitor-whatsapp command (+3 more)

### Community 42 - "CLAUDE / EDGE_CASE_TESTS"
Cohesion: 0.18
Nodes (9): audit_logs/transactions Without updated_at or deleted_at, API Middleware Stack (ForceJsonResponse, SecurityHeaders, SanitizeInput), /api/v1 Routes with Sanctum Bearer Tokens, DiscountRequest Approval (max_discount_without_approval), lib/api.js Axios Client, PreventImmutableModification Middleware, Runtime Settings Table (Setting model), EC-05 Discount Above Limit Without Approval (+1 more)

### Community 43 - "ManualSubscriptionNotificationController"
Cohesion: 0.25
Nodes (3): {closure#2}(), {closure#4}(), ManualSubscriptionNotificationController

### Community 46 - "authMiddleware / index"
Cohesion: 0.20
Nodes (7): express, app, cors, express, express@^4.18.0, express, router

### Community 47 - "Index / TodayClasses"
Cohesion: 0.27
Nodes (7): classApi, days, initialForm, EmptyState(), LoadingCards(), StatCard(), TodayClasses()

### Community 48 - "Form"
Cohesion: 0.33
Nodes (10): ClientForm(), ConfirmModal(), DURATION_MAP, fromCents(), INIT, QrInput(), Row(), StepDot() (+2 more)

### Community 50 - "composer"
Cohesion: 0.20
Nodes (10): require, barryvdh/laravel-dompdf, laravel/framework, laravel/reverb, laravel/sanctum, laravel/tinker, maatwebsite/excel, php (+2 more)

### Community 51 - "2026_04_24_044637_add_manual_notificatio"
Cohesion: 0.22
Nodes (3): AddManualNotificationFieldsToClientSubscriptionsTable, {closure#1}(), {closure#2}()

### Community 52 - "KNOWN_ISSUES"
Cohesion: 0.20
Nodes (9): Bot CORS origin '*', Duplicate xxxx_create_whatsapp_* migrations, gymos:monitor-whatsapp command, HealthController, SendReceiptMessage, whatsapp-bot service (port 5004, wppconnect, active), whatsapp-bot package.json copied from sedrat-fatma (757MB deps), whatsapp-service (port 3001, whatsapp-web.js, legacy) (+1 more)

### Community 53 - "SubscriptionContract"
Cohesion: 0.33
Nodes (8): dateOnly(), dateTime(), InfoRow(), money(), SectionCard(), StatBox(), statusMeta, SubscriptionContract()

### Community 56 - "composer"
Cohesion: 0.22
Nodes (8): description, keywords, license, minimum-stability, name, prefer-stable, $schema, type

### Community 57 - "composer"
Cohesion: 0.22
Nodes (9): scripts, dev, post-autoload-dump, post-create-project-cmd, post-root-package-install, post-update-cmd, pre-package-uninstall, setup (+1 more)

### Community 58 - "package / server"
Cohesion: 0.22
Nodes (7): cors, app, cors, dotenv, express, path, cors@^2.8.6

### Community 59 - "client / package"
Cohesion: 0.25
Nodes (8): whatsapp-web.js, axios, { Client, LocalAuth }, initializeClient(), notifyLaravel(), qrcode, qrcodeTerminal, whatsapp-web.js@^1.26.0

### Community 60 - "Dashboard"
Cohesion: 0.50
Nodes (8): AttendanceSparkBar(), ChartBox(), CustomTooltip(), Dashboard(), fmt(), fmtMoney(), KpiCard(), MiniStat()

### Community 61 - "SubscriptionTypes"
Cohesion: 0.42
Nodes (8): FormModal(), fromCents(), INITIAL_FORM, PriceRow(), SkeletonCard(), SubscriptionTypes(), toCents(), TypeCard()

### Community 63 - "AuditLogs"
Cohesion: 0.36
Nodes (7): ACTION_TYPES, AuditLogs(), COLOR_MAP, DetailModal(), DiffRow(), INITIAL_FILTERS, StatPill()

### Community 64 - "SubscriptionEdit"
Cohesion: 0.46
Nodes (7): Field(), formatDate(), Input(), SectionCard(), Select(), Skeleton(), SubscriptionEdit()

### Community 65 - "QrCards"
Cohesion: 0.32
Nodes (7): emptyAddState, emptyReplaceState, emptyReturnState, QrCards(), SkeletonRow(), STATUS_CONFIG, StatusBadge()

### Community 66 - "SessionTypes"
Cohesion: 0.46
Nodes (7): FormModal(), fromCents(), INITIAL_FORM, SessionTypeCard(), SessionTypes(), SkeletonCard(), toCents()

### Community 67 - "CLAUDE / EDGE_CASE_TESTS"
Cohesion: 0.29
Nodes (7): Launch Security Checks (brute force, gender scope, 405, admin password), audit_logs Table / LogsActivity Trait, GenderScope Global Scope (Gender Isolation), Model Observers for Side Effects, WhatsAppService::send() pending_connection.json File Handoff, EC-06 Gender Access Enforcement on API, EC-08 Brute Force Protection (429 after 6 attempts, auth.blocked)

### Community 71 - "composer"
Cohesion: 0.29
Nodes (7): pestphp/pest-plugin, php-http/discovery, config, allow-plugins, optimize-autoloader, preferred-install, sort-packages

### Community 72 - "composer"
Cohesion: 0.29
Nodes (7): require-dev, fakerphp/faker, laravel/pail, laravel/pint, mockery/mockery, nunomaduro/collision, phpunit/phpunit

### Community 74 - "Index"
Cohesion: 0.52
Nodes (6): ClientCard(), ClientsIndex(), FilterStat(), formatDate(), SkeletonCard(), STATUS_CONFIG

### Community 75 - "Form"
Cohesion: 0.52
Nodes (6): ConfirmModal(), DURATION_MAP, fromCents(), SubscriptionForm(), SubTypeCard(), toCents()

### Community 76 - "CLAUDE / DEPLOYMENT"
Cohesion: 0.33
Nodes (6): React Frontend (GymApp.jsx, ProtectedRoute, TanStack Query, zustand), Realtime Broadcast via Laravel Reverb (attendance.{date}, admin.notifications), Roles: admin, reception, captain + permissions JSON, GymOS Deployment & SSL Setup, Local Deployment with Laragon or Herd (auto SSL), VPS Production: Ubuntu 22.04 + Nginx + Let's Encrypt Certbot

### Community 77 - "CLAUDE / emergency-procedures"
Cohesion: 0.40
Nodes (5): GymOS Emergency Procedures, QR Scanner Broken: Manual Check-in, Database Dumps and Archives (not source), GymOS Gym Management System, Stack: Laravel 13 API + React 19 SPA + MySQL + Redis + Reverb + Node WhatsApp bot

### Community 78 - "CLAUDE / EDGE_CASE_TESTS"
Cohesion: 0.50
Nodes (5): WhatsApp Down: Messages Held in Queue, Subscription Receipt PDF Check, dompdf Receipts and QR Cards / Excel Import, Queue Worker (queue:work) for WhatsApp, PDF, Reminder Jobs, EC-14 Queue Failure Recovery

### Community 79 - "composer"
Cohesion: 0.40
Nodes (5): autoload, psr-4, App\\, Database\\Factories\\, Database\\Seeders\\

### Community 106 - "CLAUDE / EDGE_CASE_TESTS"
Cohesion: 0.67
Nodes (3): Shift Close Cash Deficit Requires Note, Income Requires One Open Staff Shift, EC-04 Open Shift Enforcement

### Community 108 - "composer"
Cohesion: 0.67
Nodes (3): autoload-dev, psr-4, Tests\\

### Community 109 - "composer"
Cohesion: 0.67
Nodes (3): extra, laravel, dont-discover

### Community 110 - "KNOWN_ISSUES"
Cohesion: 1.00
Nodes (3): AttendanceCheckin event (never dispatched), Realtime (Reverb), useReverb hook (unused)

### Community 111 - "package"
Cohesion: 0.67
Nodes (3): scripts, dev, start

## Knowledge Gaps
- **32 isolated node(s):** `Stack: Laravel 13 API + React 19 SPA + MySQL + Redis + Reverb + Node WhatsApp bot`, `Runtime Settings Table (Setting model)`, `Database Dumps and Archives (not source)`, `VPS Production: Ubuntu 22.04 + Nginx + Let's Encrypt Certbot`, `EC-02 Freeze + Expiry Conflict` (+27 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 468 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **71 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Controller` connect `Classes Sessions Reports API` to `Shifts & Broadcast Events`, `ClientSession / ClientSessionController`, `AttendanceController`, `Auth Staff Debts Discounts`, `AttendanceController / AttendanceObserve`, `ManualSubscriptionNotificationController`, `AuditLogController`, `API Routes Health Settings`, `Client Model Usage`, `QR Card Lifecycle`, `WhatsApp Message Pipeline`, `AuditLogController`, `Client Observer & Profile`, `Audit Logging Calls`, `ClientController / SendScheduledWhatsApp`, `WhatsApp Controller Proxy`, `Dashboard Stats`, `Debts & Reminders`?**
  _High betweenness centrality (0.035) - this node is a cross-community bridge._
- **What connects `Stack: Laravel 13 API + React 19 SPA + MySQL + Redis + Reverb + Node WhatsApp bot`, `Runtime Settings Table (Setting model)`, `Database Dumps and Archives (not source)` to the rest of the system?**
  _32 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `WhatsApp Bot Service` be split into smaller, more focused modules?**
  _Cohesion score 0.06784260515603799 - nodes in this community are weakly interconnected._
- **Why does `ClientSubscription` connect `Subscription Observer & Jobs` to `ClientSeeder / ClientsImport`, `Classes Sessions Reports API`, `Clients API & Validation`, `AttendanceController`, `Auth Staff Debts Discounts`, `AttendanceController / AttendanceObserve`, `SubscriptionTest`, `ManualSubscriptionNotificationController`, `WhatsApp Message Pipeline`, `WhatsApp Notification Jobs`, `Feature Tests`, `ClientController / SendScheduledWhatsApp`, `Client Observer & Profile`, `Audit Logging Calls`, `Observers Registration`, `Dashboard Stats`, `Core Models`, `Debts & Reminders`?**
  _High betweenness centrality (0.032) - this node is a cross-community bridge._
- **Should `Frontend Build & Realtime` be split into smaller, more focused modules?**
  _Cohesion score 0.05580693815987934 - nodes in this community are weakly interconnected._
- **Why does `Client` connect `Client Observer & Profile` to `ClientSeeder / ClientsImport`, `Client / User`, `Clients API & Validation`, `ClientSession / ClientSessionController`, `Client / GenderScope`, `AttendanceController / AttendanceObserve`, `SubscriptionTest`, `Client Model Usage`, `QR Card Lifecycle`, `WhatsApp Message Pipeline`, `Feature Tests`, `ClientController / SendScheduledWhatsApp`, `Audit Logging Calls`, `Observers Registration`, `Dashboard Stats`, `Core Models`?**
  _High betweenness centrality (0.021) - this node is a cross-community bridge._
- **Should `Shifts & Broadcast Events` be split into smaller, more focused modules?**
  _Cohesion score 0.07198228128460686 - nodes in this community are weakly interconnected._