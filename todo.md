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
- [ ] Bulk CSV import with validation preview
- [ ] Deployable toggle with eligibility check

## Phase 3: People Domain — Hiring & ATS
- [x] Requisitions list with filters
- [x] Candidate pipeline list
- [x] New requisition form
- [x] Candidate detail with stage tracking
- [ ] Hiring dashboard (open reqs, time-to-fill, source funnel)

## Phase 4: People Domain — Onboarding
- [x] Onboarding page with progress tracking, blocker alerts, and checklist template
- [ ] Per-person onboarding checklist on detail page

## Phase 5: People Domain — Contracts & Documents
- [x] Contracts page with contract list, template management, and signing service tab
- [x] Zoho Sign swappable service interface documented (ISigningService)
- [ ] Contract generation from templates (backend)

## Phase 6: People Domain — Attendance
- [x] Shift event list with filters
- [x] Attendance recording (check_in, break_start, break_end, check_out)
- [x] GPS + selfie verification fields in schema
- [x] Supervisor-marked mode in schema
- [ ] Daily attendance derived view
- [ ] Edit audit trail with approval workflow

## Phase 7: People Domain — Leave Management
- [x] Leave application list with approve/reject
- [x] Leave create form
- [ ] Leave policy configuration UI
- [ ] Leave balance tracking with accrual engine
- [ ] Leave calendar view

## Phase 8: People Domain — Payroll
- [x] Payroll run list
- [x] Payroll run creation form
- [ ] Worker-type-aware calculations
- [ ] Payslip generation
- [ ] Bank file export

## Phase 9: People Domain — Training & L&D
- [x] Training module list
- [ ] Role-based assignment UI
- [ ] Completion tracking UI

## Phase 10: People Domain — Performance & Feedback
- [x] Performance page with review cycles and continuous feedback tabs
- [x] Feedback capture (appreciations, complaints) with mock data
- [ ] Performance review cycles (backend CRUD)

## Phase 11: People Domain — Exit Management
- [x] Exit management page with exit initiation, F&F process flow, and absconding UI
- [ ] F&F calculation and processing (backend)
- [ ] Absconding detection automation

## Phase 12: People Domain — Identity (ID Cards)
- [x] Digital ID cards page with card list, status tracking, and QR preview
- [ ] QR code generation (backend)
- [ ] Card validity and auto-expiry automation

## Phase 13: People Domain — Referrals
- [x] Referrals page with bounty structure, referral submission, and tranche tracking
- [ ] Bounty tracking automation (30-day and 90-day tranches)

## Phase 14: Operations — Property Master
- [x] Properties list with filters and create dialog
- [x] Property detail with tabs (overview, staff, financials, ops)
- [ ] Property onboarding wizard (7 steps)
- [ ] Fee structure configuration UI
- [ ] SLA configuration UI
- [ ] Geofence map integration

## Phase 15: Operations — Assignment Roster
- [x] Assignment list with create dialog
- [ ] Roster calendar (multi-property, multi-day)
- [ ] Coverage gap detection and alerts

## Phase 16: Operations — Daily Operations
- [x] Daily checklist list with status
- [x] Breakage list
- [ ] Checklist submission form (mobile-first)
- [ ] Anomaly detection dashboard

## Phase 17: Operations — Expense Management
- [x] Expense list with approve/reject actions
- [x] Expense create form
- [ ] Omni reconciliation queue (mocked interface)

## Phase 18: Operations — Vendor Management
- [x] Vendor list with create dialog
- [x] Work order list with create dialog
- [ ] Vendor blacklist management

## Phase 19: Operations — Inventory & Assets
- [x] Per-property inventory list with create dialog
- [ ] Periodic audit interface
- [ ] Breakage logging with photo + attribution

## Phase 20: Operations — Bookings & Occupancy
- [x] Booking list
- [ ] Booking calendar view
- [ ] Occupancy dashboard

## Phase 21: Finance — Invoicing & Payments
- [x] Invoice list with create dialog
- [x] Payment list
- [ ] GST handling UI
- [ ] Cashfree payment integration (mocked)

## Phase 22: Owner Portal
- [x] Owner portal at /owner with top-nav layout
- [x] Property overview dashboard
- [x] Invoice list and payment view
- [x] Request list
- [ ] Monthly reports viewer
- [ ] Owner communication thread

## Phase 23: Cross-cutting
- [x] Audit log viewer with entity filter
- [x] Notification page with inbox, channel management, and documented interfaces
- [x] Settings page with RBAC roles/permissions, general config, and integration management
- [x] Vitest test coverage (26 tests passing)
- [ ] Interakt WhatsApp mock interface implementation
- [ ] Cloudflare R2 media storage mock
