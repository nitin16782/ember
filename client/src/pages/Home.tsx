import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Users, Building2, Receipt, CalendarOff, ArrowRight,
  TrendingUp, Clock, AlertTriangle, Plus,
} from "lucide-react";
import { useLocation } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";

export default function Home() {
  const [, setLocation] = useLocation();
  const { data: stats, isLoading } = trpc.dashboard.stats.useQuery();

  const statCards = [
    {
      title: "Total Associates",
      value: stats?.people.total ?? 0,
      subtitle: `${stats?.people.active ?? 0} active`,
      icon: Users,
      color: "text-navy",
      bg: "bg-navy/5",
      path: "/people",
    },
    {
      title: "Properties",
      value: stats?.properties.total ?? 0,
      subtitle: `${stats?.properties.live ?? 0} live`,
      icon: Building2,
      color: "text-gold",
      bg: "bg-gold/5",
      path: "/properties",
    },
    {
      title: "Pending Expenses",
      value: stats?.expenses.pending ?? 0,
      subtitle: "awaiting approval",
      icon: Receipt,
      color: "text-orange-600",
      bg: "bg-orange-50",
      path: "/expenses",
    },
    {
      title: "Leave Requests",
      value: stats?.leaves.pending ?? 0,
      subtitle: "pending review",
      icon: CalendarOff,
      color: "text-red-600",
      bg: "bg-red-50",
      path: "/leave",
    },
  ];

  const quickActions = [
    { label: "Add Associate", icon: Plus, path: "/people", color: "bg-navy text-white hover:bg-navy/90" },
    { label: "Add Property", icon: Plus, path: "/properties", color: "bg-gold/10 text-gold hover:bg-gold/20" },
    { label: "Log Expense", icon: Receipt, path: "/expenses", color: "bg-orange-50 text-orange-700 hover:bg-orange-100" },
    { label: "View Roster", icon: Clock, path: "/roster", color: "bg-blue-50 text-blue-700 hover:bg-blue-100" },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div>
        <h2 className="font-display text-2xl font-semibold text-navy">
          Operations Dashboard
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Overview of your property management operations
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <Card
            key={card.title}
            className="cursor-pointer hover:shadow-md transition-shadow border-border/50"
            onClick={() => setLocation(card.path)}
          >
            <CardContent className="p-5">
              {isLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-8 w-16" />
                  <Skeleton className="h-3 w-20" />
                </div>
              ) : (
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      {card.title}
                    </p>
                    <p className="text-2xl font-semibold text-foreground">
                      {card.value}
                    </p>
                    <p className="text-xs text-muted-foreground">{card.subtitle}</p>
                  </div>
                  <div className={`p-2.5 rounded-lg ${card.bg}`}>
                    <card.icon className={`h-5 w-5 ${card.color}`} />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {quickActions.map((action) => (
              <Button
                key={action.label}
                variant="ghost"
                className={`h-auto py-3 px-4 flex flex-col items-center gap-2 rounded-lg ${action.color}`}
                onClick={() => setLocation(action.path)}
              >
                <action.icon className="h-5 w-5" />
                <span className="text-xs font-medium">{action.label}</span>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Module Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <ModuleCard
          title="People & HRMS"
          description="Manage associates, attendance, leave, payroll, and training across all properties."
          items={[
            { label: "Associates", path: "/people" },
            { label: "Attendance", path: "/attendance" },
            { label: "Leave", path: "/leave" },
            { label: "Payroll", path: "/payroll" },
          ]}
          icon={Users}
          color="text-navy"
          bg="bg-navy/5"
        />
        <ModuleCard
          title="Operations"
          description="Property management, daily checklists, roster assignments, and vendor coordination."
          items={[
            { label: "Properties", path: "/properties" },
            { label: "Daily Ops", path: "/daily-ops" },
            { label: "Roster", path: "/roster" },
            { label: "Vendors", path: "/vendors" },
          ]}
          icon={Building2}
          color="text-gold"
          bg="bg-gold/5"
        />
        <ModuleCard
          title="Finance"
          description="Invoicing, payment tracking, expense management, and financial reporting."
          items={[
            { label: "Invoices", path: "/invoices" },
            { label: "Payments", path: "/payments" },
            { label: "Expenses", path: "/expenses" },
            { label: "Bookings", path: "/bookings" },
          ]}
          icon={TrendingUp}
          color="text-green-600"
          bg="bg-green-50"
        />
      </div>
    </div>
  );
}

function ModuleCard({
  title,
  description,
  items,
  icon: Icon,
  color,
  bg,
}: {
  title: string;
  description: string;
  items: { label: string; path: string }[];
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bg: string;
}) {
  const [, setLocation] = useLocation();
  return (
    <Card className="border-border/50 hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${bg}`}>
            <Icon className={`h-4 w-4 ${color}`} />
          </div>
          <CardTitle className="text-base font-semibold">{title}</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-4">{description}</p>
        <div className="space-y-1">
          {items.map((item) => (
            <button
              key={item.path}
              onClick={() => setLocation(item.path)}
              className="flex items-center justify-between w-full px-3 py-2 rounded-md text-sm hover:bg-accent transition-colors group"
            >
              <span>{item.label}</span>
              <ArrowRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
