# Ember — Property Operations Platform TODO

## Phase 0: Foundation
- [x] Database schema — all 21 module tables (42 tables created)
- [x] Firebrick design system (colors, typography, spacing)
- [x] RBAC role definitions and permission model
- [x] Audit log infrastructure (every state-changing action writes audit_log)

## Phase 1: Core Layout & Navigation
- [x] DashboardLayout with sidebar (desktop) + bottom nav (mobile)
- [x] Staff app navigation structure
- [x] Owner portal top-nav layout at /owner route
- [x] Route registration for all modules
- [x] Auth integration with role-based route guards

## Phase 2: People Domain — Associates & Staff Master
- [x] People list with filters (status, type, search)
- [x] People detail page with tabs (overview, documents, salary, history)
- [x] People add form (fullName, phone, staffType, email, etc.)
- [x] Bulk CSV import button (UI placeholder — toast describes expected format)
- [x] Deployable toggle (UI placeholder — toast-based eligibility check)

## Phase 3: People Domain — Hiring & ATS
- [x] Requisitions list with filters
- [x] Candidate pipeline list
- [x] New requisition form
- [x] Candidate detail with stage tracking
- [x] Hiring dashboard with pipeline Kanban view

## Phase 4: People Domain — Onboarding
- [x] Onboarding page with progress tracking, blocker alerts, and checklist template
- [x] Onboarding CRUD mutations wired (create/list/update)
- [x] Per-person onboarding tab on PersonDetail page (with checklist progress)

## Phase 5: People Domain — Contracts & Documents
- [x] Contracts page with contract list, template management, and signing service tab
- [x] Zoho Sign swappable service interface documented (ISigningService)
- [x] Contract + template CRUD mutations wired
- [x] Template merge/document generation engine (mergeTemplate + wrapContractHtml + storeContractDocument)

## Phase 6: People Domain — Attendance
- [x] Shift event list with filters
- [x] Attendance recording (check_in, break_start, break_end, check_out)
- [x] GPS + selfie verification fields in schema
- [x] Supervisor-marked mode in schema
- [x] Daily attendance derived view with summary cards (client-side derivation from events)
- [x] Edit audit trail tab (mock data — connects to audit_log table in production)

## Phase 7: People Domain — Leave Management
- [x] Leave application list with approve/reject
- [x] Leave create form
- [x] Leave policy configuration UI tab (backend CRUD wired via leavePolicies router)
- [x] Leave balance tracking with accrual display (mock balances)
- [x] Leave calendar view tab (month grid with mock leave data)

## Phase 8: People Domain — Payroll
- [x] Payroll run list
- [x] Payroll run creation form
- [x] Worker-type-aware calculations tab (config display with mock breakdowns)
- [x] Payslip generation tab (mock payslips — PDF generation pending)
- [x] Bank file export tab (UI with bank selection — file generation pending)

## Phase 9: People Domain — Training & L&D
- [x] Training module list
- [x] Role-based assignment UI tab (mock role-module bundles)
- [x] Completion tracking UI tab (mock completion data with progress bars)

## Phase 10: People Domain — Performance & Feedback
- [x] Performance page with review cycles and continuous feedback tabs
- [x] Feedback capture (appreciations, complaints) with mock data
- [x] Performance review + feedback create/list mutations wired
- [x] Performance review + feedback create/list mutations wired

## Phase 11: People Domain — Exit Management
- [x] Exit management page with exit initiation, F&F process flow, and absconding UI
- [x] Exit create/update mutations wired
- [x] F&F settlement calculation engine (calculateFnF with full earnings/deductions breakdown)
- [x] Absconding detection automation (scheduled handler — flags 3+ day no-shows)

## Phase 12: People Domain — Identity (ID Cards)
- [x] Digital ID cards page with card list, status tracking, and QR preview
- [x] ID card create/revoke mutations wired (QR token string auto-generated)
- [x] QR code image rendering (real scannable QR via qrcode npm package, navy brand colors)
- [x] Card validity and auto-expiry automation (scheduled handler — revokes expired cards daily)

## Phase 13: People Domain — Referrals
- [x] Referrals page with bounty structure, referral submission, and tranche tracking
- [x] Referral create/update mutations wired
- [x] Automated bounty tranche tracking (scheduled handler — checks 30/90-day milestones daily)

## Phase 14: Operations — Property Master
- [x] Properties list with filters and create dialog
- [x] Property detail with tabs (overview, staff, financials, ops)
- [x] Property onboarding wizard (multi-step form with SLA, fees, geofence)
- [x] Fee structure configuration in wizard
- [x] SLA configuration in wizard
- [x] Geofence map placeholder in wizard

## Phase 15: Operations — Assignment Roster
- [x] Assignment list with create dialog
- [x] Roster calendar view (weekly grid)
- [x] Coverage gap detection and alerts

## Phase 16: Operations — Daily Operations
- [x] Daily checklist list with status
- [x] Breakage list
- [x] Checklist submission form with interactive items, photo capture, and progress tracking
- [x] Checklist template management tab
- [x] Anomaly detection dashboard (cross-module anomaly monitoring page with scheduled job info)

## Phase 17: Operations — Expense Management
- [x] Expense list with approve/reject actions
- [x] Expense create form
- [x] Omni reconciliation interface documented (IReconciliationService + MockOmniReconciliation)

## Phase 18: Operations — Vendor Management
- [x] Vendor list with create dialog
- [x] Work order list with create dialog
- [x] Vendor blacklist management and rating system

## Phase 19: Operations — Inventory & Assets
- [x] Per-property inventory list with create dialog
- [x] Audit trail tab with inventory history
- [x] Reorder alerts and low stock warnings
- [x] Breakage create/update mutations wired with attribution status
- [x] File upload tRPC procedure (base64 upload with validation, module-scoped S3 storage)

## Phase 20: Operations — Bookings & Occupancy
- [x] Booking list with create dialog
- [x] Booking calendar view (monthly grid)
- [x] Occupancy dashboard with property-wise stats

## Phase 21: Finance — Invoicing & Payments
- [x] Invoice list with create dialog
- [x] Payment list with record payment dialog
- [x] GST handling UI (CGST/SGST breakdown, auto-calculation)
- [x] Revenue summary with collection tracking
- [x] Payment reconciliation view
- [x] Cashfree payment interface documented (IPaymentGateway + MockCashfreeGateway)

## Phase 22: Owner Portal
- [x] Owner portal at /owner with top-nav layout
- [x] Property overview dashboard
- [x] Invoice list and payment view
- [x] Request list
- [x] Monthly reports viewer with download
- [x] Owner communication thread (chat-style UI)
- [x] Upcoming bookings tab

## Phase 23: Cross-cutting
- [x] Audit log viewer with entity filter
- [x] Notification page with inbox, channel management, and documented interfaces
- [x] Settings page with RBAC roles/permissions, general config, and integration management
- [x] Vitest test coverage (26 tests passing)
- [x] ISigningService interface (Zoho Sign swappable)
- [x] INotificationProvider interface (WhatsApp/Email/SMS mocked)
- [x] Interakt WhatsApp mock adapter (INotificationProvider interface documented)
- [x] File storage via platform S3 helpers (storagePut/storageGet)
- [x] Module-specific media upload service (uploadModuleFile + validateUpload helpers)

## Phase 24: Gap Fixes
- [x] Fix contracts.generate to load contract by ID (getContractById)
- [x] Implement real anomaly aggregation from attendance, invoices, checklists, roster, inventory data
- [x] Wire breakage photo upload from frontend to upload procedure with photo preview

## Phase 25: Final Gap Fixes
- [x] Implement roster coverage gap detection in anomaly aggregation (properties with no active assignment)
- [x] Extend breakage create to accept photoUrls and wire end-to-end (upload -> create -> render)
- [x] Add tests for anomaly aggregation, contracts.generate, breakages.create, and exits.calculateFnF (30 tests passing)
