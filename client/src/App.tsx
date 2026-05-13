import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Redirect, Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import DashboardLayout from "./components/DashboardLayout";
import { OwnerLayout } from "./components/OwnerLayout";
import { AssociateLayout } from "./components/AssociateLayout";
import { RequireAuth } from "./components/RequireAuth";
import { useAuth } from "./contexts/AuthContext";
import { lazy, Suspense, type ReactNode } from "react";
import { Loader2 } from "lucide-react";

// Auth pages
const StaffLogin = lazy(() => import("./pages/auth/StaffLogin"));
const AssociateLogin = lazy(() => import("./pages/auth/AssociateLogin"));
const OwnerLogin = lazy(() => import("./pages/auth/OwnerLogin"));
const MagicLinkRequest = lazy(() => import("./pages/auth/MagicLinkRequest"));
const MagicLinkConsume = lazy(() => import("./pages/auth/MagicLinkConsume"));
const SetPassword = lazy(() => import("./pages/auth/SetPassword"));

// App pages
const Home = lazy(() => import("./pages/Home"));
const People = lazy(() => import("./pages/People"));
const PersonDetail = lazy(() => import("./pages/PersonDetail"));
const Hiring = lazy(() => import("./pages/Hiring"));
const Onboarding = lazy(() => import("./pages/Onboarding"));
const Contracts = lazy(() => import("./pages/Contracts"));
const Attendance = lazy(() => import("./pages/Attendance"));
const Leave = lazy(() => import("./pages/Leave"));
const Payroll = lazy(() => import("./pages/Payroll"));
const Training = lazy(() => import("./pages/Training"));
const Performance = lazy(() => import("./pages/Performance"));
const Exits = lazy(() => import("./pages/Exits"));
const IdCards = lazy(() => import("./pages/IdCards"));
const Referrals = lazy(() => import("./pages/Referrals"));
const Properties = lazy(() => import("./pages/Properties"));
const PropertyDetail = lazy(() => import("./pages/PropertyDetail"));
const Roster = lazy(() => import("./pages/Roster"));
const DailyOps = lazy(() => import("./pages/DailyOps"));
const Expenses = lazy(() => import("./pages/Expenses"));
const Vendors = lazy(() => import("./pages/Vendors"));
const Inventory = lazy(() => import("./pages/Inventory"));
const Bookings = lazy(() => import("./pages/Bookings"));
const Invoices = lazy(() => import("./pages/Invoices"));
const Payments = lazy(() => import("./pages/Payments"));
const Notifications = lazy(() => import("./pages/Notifications"));
const AuditLog = lazy(() => import("./pages/AuditLog"));
const Settings = lazy(() => import("./pages/Settings"));
const OwnerPortal = lazy(() => import("./pages/OwnerPortal"));
const Anomalies = lazy(() => import("./pages/Anomalies"));
const AttendanceHome = lazy(() => import("./pages/associate/AttendanceHome"));
const TodaysRoster = lazy(() => import("./pages/supervisor/TodaysRoster"));
const AttendanceOverview = lazy(() => import("./pages/admin/AttendanceOverview"));
const AttendanceAuditLog = lazy(() => import("./pages/admin/AuditLog"));

function PageLoader() {
  return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="h-6 w-6 animate-spin text-navy/50" />
    </div>
  );
}

function Router() {
  return (
    <Switch>
      {/* Public auth routes — no layout */}
      <Route path="/login">
        <Suspense fallback={<PageLoader />}><StaffLogin /></Suspense>
      </Route>
      <Route path="/login/magic">
        <Suspense fallback={<PageLoader />}><MagicLinkRequest /></Suspense>
      </Route>
      <Route path="/login/associate">
        <Suspense fallback={<PageLoader />}><AssociateLogin /></Suspense>
      </Route>
      <Route path="/login/owner">
        <Suspense fallback={<PageLoader />}><OwnerLogin /></Suspense>
      </Route>
      <Route path="/auth/magic">
        <Suspense fallback={<PageLoader />}><MagicLinkConsume /></Suspense>
      </Route>
      <Route path="/auth/set-password">
        <RequireAuth>
          <Suspense fallback={<PageLoader />}><SetPassword /></Suspense>
        </RequireAuth>
      </Route>

      {/* Owner portal — separate layout, role-gated */}
      <Route path="/portal/:rest*">
        <RequireAuth allowedRoles={["owner_portal"]} loginPath="/login/owner">
          <OwnerLayout>
            <Suspense fallback={<PageLoader />}><OwnerPortal /></Suspense>
          </OwnerLayout>
        </RequireAuth>
      </Route>
      {/* Legacy redirect: /owner → /portal */}
      <Route path="/owner">
        <Redirect to="/portal" />
      </Route>

      {/* Associate mobile area — role-gated to "associate" */}
      <Route path="/associate/:rest*">
        <RequireAuth allowedRoles={["associate"]} loginPath="/login/associate">
          <AssociateLayout>
            <Suspense fallback={<PageLoader />}>
              <Switch>
                <Route path="/associate/attendance" component={AttendanceHome} />
                <Route><Redirect to="/associate/attendance" /></Route>
              </Switch>
            </Suspense>
          </AssociateLayout>
        </RequireAuth>
      </Route>

      {/* Staff routes — DashboardLayout, all gated */}
      <Route>
        <RequireAuth>
          <BounceAssociates>
          <DashboardLayout>
            <Suspense fallback={<PageLoader />}>
              <Switch>
                <Route path="/" component={Home} />
                <Route path="/people" component={People} />
                <Route path="/people/:id" component={PersonDetail} />
                <Route path="/hiring" component={Hiring} />
                <Route path="/onboarding" component={Onboarding} />
                <Route path="/contracts" component={Contracts} />
                <Route path="/attendance/today" component={TodaysRoster} />
                <Route path="/attendance/overview" component={AttendanceOverview} />
                <Route path="/attendance/audit" component={AttendanceAuditLog} />
                <Route path="/attendance" component={Attendance} />
                <Route path="/leave" component={Leave} />
                <Route path="/payroll" component={Payroll} />
                <Route path="/training" component={Training} />
                <Route path="/performance" component={Performance} />
                <Route path="/exits" component={Exits} />
                <Route path="/id-cards" component={IdCards} />
                <Route path="/referrals" component={Referrals} />
                <Route path="/properties" component={Properties} />
                <Route path="/properties/:id" component={PropertyDetail} />
                <Route path="/roster" component={Roster} />
                <Route path="/daily-ops" component={DailyOps} />
                <Route path="/expenses" component={Expenses} />
                <Route path="/vendors" component={Vendors} />
                <Route path="/inventory" component={Inventory} />
                <Route path="/bookings" component={Bookings} />
                <Route path="/invoices" component={Invoices} />
                <Route path="/payments" component={Payments} />
                <Route path="/notifications" component={Notifications} />
                <Route path="/anomalies" component={Anomalies} />
                <Route path="/audit-log" component={AuditLog} />
                <Route path="/settings" component={Settings} />
                <Route path="/404" component={NotFound} />
                <Route component={NotFound} />
              </Switch>
            </Suspense>
          </DashboardLayout>
          </BounceAssociates>
        </RequireAuth>
      </Route>
    </Switch>
  );
}

/** Bounce associate-role users to /associate/attendance if they hit a staff route. */
function BounceAssociates({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  if (user?.role === "associate") {
    return <Redirect to="/associate/attendance" />;
  }
  return <>{children}</>;
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
