import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { getLoginUrl } from "@/const";
import { useIsMobile } from "@/hooks/useMobile";
import {
  LayoutDashboard, Users, Briefcase, ClipboardCheck, FileText,
  Clock, CalendarOff, Wallet, GraduationCap, Star, UserX,
  CreditCard, UserPlus, Building2, CalendarDays, ListChecks,
  Receipt, Store, Package, CalendarRange, FileBarChart,
  DollarSign, Bell, Shield, Settings, LogOut, PanelLeft,
  ChevronDown, ChevronRight, Flame, AlertTriangle,
} from "lucide-react";
import { CSSProperties, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from "./DashboardLayoutSkeleton";
import { Button } from "./ui/button";

type MenuItem = {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  path: string;
};

type MenuGroup = {
  label: string;
  items: MenuItem[];
};

const menuGroups: MenuGroup[] = [
  {
    label: "Overview",
    items: [
      { icon: LayoutDashboard, label: "Dashboard", path: "/" },
    ],
  },
  {
    label: "People & HRMS",
    items: [
      { icon: Users, label: "Associates", path: "/people" },
      { icon: Briefcase, label: "Hiring & ATS", path: "/hiring" },
      { icon: ClipboardCheck, label: "Onboarding", path: "/onboarding" },
      { icon: FileText, label: "Contracts", path: "/contracts" },
      { icon: Clock, label: "Attendance", path: "/attendance" },
      { icon: CalendarOff, label: "Leave", path: "/leave" },
      { icon: Wallet, label: "Payroll", path: "/payroll" },
      { icon: GraduationCap, label: "Training", path: "/training" },
      { icon: Star, label: "Performance", path: "/performance" },
      { icon: UserX, label: "Exits", path: "/exits" },
      { icon: CreditCard, label: "ID Cards", path: "/id-cards" },
      { icon: UserPlus, label: "Referrals", path: "/referrals" },
    ],
  },
  {
    label: "Operations",
    items: [
      { icon: Building2, label: "Properties", path: "/properties" },
      { icon: CalendarDays, label: "Roster", path: "/roster" },
      { icon: ListChecks, label: "Daily Ops", path: "/daily-ops" },
      { icon: Receipt, label: "Expenses", path: "/expenses" },
      { icon: Store, label: "Vendors", path: "/vendors" },
      { icon: Package, label: "Inventory", path: "/inventory" },
      { icon: CalendarRange, label: "Bookings", path: "/bookings" },
    ],
  },
  {
    label: "Finance",
    items: [
      { icon: FileBarChart, label: "Invoices", path: "/invoices" },
      { icon: DollarSign, label: "Payments", path: "/payments" },
    ],
  },
  {
    label: "System",
    items: [
      { icon: AlertTriangle, label: "Anomalies", path: "/anomalies" },
      { icon: Bell, label: "Notifications", path: "/notifications" },
      { icon: Shield, label: "Audit Log", path: "/audit-log" },
      { icon: Settings, label: "Settings", path: "/settings" },
    ],
  },
];

const allMenuItems = menuGroups.flatMap((g) => g.items);

// Bottom nav items for mobile — key screens only
const bottomNavItems: MenuItem[] = [
  { icon: LayoutDashboard, label: "Home", path: "/" },
  { icon: Users, label: "People", path: "/people" },
  { icon: Building2, label: "Properties", path: "/properties" },
  { icon: Receipt, label: "Expenses", path: "/expenses" },
  { icon: Bell, label: "Alerts", path: "/notifications" },
];

const SIDEBAR_WIDTH_KEY = "sidebar-width";
const DEFAULT_WIDTH = 260;
const MIN_WIDTH = 200;
const MAX_WIDTH = 420;

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    return saved ? parseInt(saved, 10) : DEFAULT_WIDTH;
  });
  const { loading, user } = useAuth();

  useEffect(() => {
    localStorage.setItem(SIDEBAR_WIDTH_KEY, sidebarWidth.toString());
  }, [sidebarWidth]);

  if (loading) {
    return <DashboardLayoutSkeleton />;
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-8 p-8 max-w-md w-full">
          <div className="flex flex-col items-center gap-4">
            <div className="flex items-center gap-2">
              <Flame className="h-8 w-8 text-gold" />
              <span className="font-display text-2xl font-semibold tracking-tight text-navy">
                Ember
              </span>
            </div>
            <p className="text-sm text-muted-foreground text-center max-w-sm">
              Property Operations Platform by Pinch Lifestyle Services.
              Sign in to access the dashboard.
            </p>
          </div>
          <Button
            onClick={() => {
              window.location.href = getLoginUrl();
            }}
            size="lg"
            className="w-full bg-navy text-white hover:bg-navy/90 shadow-lg hover:shadow-xl transition-all"
          >
            Sign in
          </Button>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": `${sidebarWidth}px`,
        } as CSSProperties
      }
    >
      <DashboardLayoutContent setSidebarWidth={setSidebarWidth}>
        {children}
      </DashboardLayoutContent>
    </SidebarProvider>
  );
}

type DashboardLayoutContentProps = {
  children: React.ReactNode;
  setSidebarWidth: (width: number) => void;
};

function DashboardLayoutContent({
  children,
  setSidebarWidth,
}: DashboardLayoutContentProps) {
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(
    () => {
      const initial: Record<string, boolean> = {};
      menuGroups.forEach((g) => {
        initial[g.label] = true;
      });
      return initial;
    }
  );

  const activeMenuItem = allMenuItems.find((item) => {
    if (item.path === "/") return location === "/";
    return location.startsWith(item.path);
  });

  const toggleGroup = (label: string) => {
    setExpandedGroups((prev) => ({ ...prev, [label]: !prev[label] }));
  };

  useEffect(() => {
    if (isCollapsed) {
      setIsResizing(false);
    }
  }, [isCollapsed]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const sidebarLeft =
        sidebarRef.current?.getBoundingClientRect().left ?? 0;
      const newWidth = e.clientX - sidebarLeft;
      if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH) {
        setSidebarWidth(newWidth);
      }
    };
    const handleMouseUp = () => setIsResizing(false);

    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, setSidebarWidth]);

  return (
    <>
      <div className="relative hidden md:block" ref={sidebarRef}>
        <Sidebar
          collapsible="icon"
          className="border-r-0"
          disableTransition={isResizing}
        >
          <SidebarHeader className="h-16 justify-center border-b border-sidebar-border">
            <div className="flex items-center gap-3 px-2 transition-all w-full">
              <button
                onClick={toggleSidebar}
                className="h-8 w-8 flex items-center justify-center hover:bg-accent rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring shrink-0"
                aria-label="Toggle navigation"
              >
                <PanelLeft className="h-4 w-4 text-muted-foreground" />
              </button>
              {!isCollapsed && (
                <div className="flex items-center gap-2 min-w-0">
                  <Flame className="h-5 w-5 text-gold shrink-0" />
                  <span className="font-display text-lg font-semibold tracking-tight text-navy truncate">
                    Ember
                  </span>
                </div>
              )}
            </div>
          </SidebarHeader>

          <SidebarContent className="gap-0 overflow-y-auto">
            {menuGroups.map((group) => (
              <div key={group.label} className="py-1">
                {!isCollapsed && (
                  <button
                    onClick={() => toggleGroup(group.label)}
                    className="flex items-center justify-between w-full px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <span>{group.label}</span>
                    {expandedGroups[group.label] ? (
                      <ChevronDown className="h-3 w-3" />
                    ) : (
                      <ChevronRight className="h-3 w-3" />
                    )}
                  </button>
                )}
                {(isCollapsed || expandedGroups[group.label]) && (
                  <SidebarMenu className="px-2">
                    {group.items.map((item) => {
                      const isActive =
                        item.path === "/"
                          ? location === "/"
                          : location.startsWith(item.path);
                      return (
                        <SidebarMenuItem key={item.path}>
                          <SidebarMenuButton
                            isActive={isActive}
                            onClick={() => setLocation(item.path)}
                            tooltip={item.label}
                            className="h-9 transition-all font-normal text-[13px]"
                          >
                            <item.icon
                              className={`h-4 w-4 shrink-0 ${
                                isActive ? "text-navy" : "text-muted-foreground"
                              }`}
                            />
                            <span
                              className={
                                isActive ? "text-navy font-medium" : ""
                              }
                            >
                              {item.label}
                            </span>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      );
                    })}
                  </SidebarMenu>
                )}
              </div>
            ))}
          </SidebarContent>

          <SidebarFooter className="p-3 border-t border-sidebar-border">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 rounded-lg px-1 py-1 hover:bg-accent/50 transition-colors w-full text-left group-data-[collapsible=icon]:justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <Avatar className="h-9 w-9 border border-gold/30 shrink-0">
                    <AvatarFallback className="text-xs font-medium bg-navy/5 text-navy">
                      {user?.name?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
                    <p className="text-sm font-medium truncate leading-none">
                      {user?.name || "-"}
                    </p>
                    <p className="text-xs text-muted-foreground truncate mt-1">
                      {user?.role || "user"}
                    </p>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem
                  onClick={logout}
                  className="cursor-pointer text-destructive focus:text-destructive"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sign out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarFooter>
        </Sidebar>
        <div
          className={`absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-primary/20 transition-colors ${
            isCollapsed ? "hidden" : ""
          }`}
          onMouseDown={() => {
            if (isCollapsed) return;
            setIsResizing(true);
          }}
          style={{ zIndex: 50 }}
        />
      </div>

      <SidebarInset className="flex flex-col">
        {/* Mobile top bar */}
        {isMobile && (
          <div className="flex border-b h-14 items-center justify-between bg-background/95 px-3 backdrop-blur supports-[backdrop-filter]:backdrop-blur sticky top-0 z-40">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="h-9 w-9 rounded-lg bg-background" />
              <Flame className="h-5 w-5 text-gold" />
              <span className="font-display text-base font-semibold text-navy">
                {activeMenuItem?.label ?? "Ember"}
              </span>
            </div>
            <Avatar className="h-8 w-8 border border-gold/30">
              <AvatarFallback className="text-xs font-medium bg-navy/5 text-navy">
                {user?.name?.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </div>
        )}

        {/* Desktop top bar */}
        {!isMobile && (
          <div className="flex h-14 items-center justify-between border-b px-6 bg-background/95 backdrop-blur sticky top-0 z-40">
            <div className="flex items-center gap-2">
              <h1 className="font-display text-lg font-semibold text-navy">
                {activeMenuItem?.label ?? "Dashboard"}
              </h1>
            </div>
          </div>
        )}

        <main className="flex-1 p-4 md:p-6 pb-20 md:pb-6">{children}</main>

        {/* Mobile bottom nav */}
        {isMobile && (
          <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur border-t safe-area-inset-bottom">
            <div className="flex items-center justify-around h-16 px-2">
              {bottomNavItems.map((item) => {
                const isActive =
                  item.path === "/"
                    ? location === "/"
                    : location.startsWith(item.path);
                return (
                  <button
                    key={item.path}
                    onClick={() => setLocation(item.path)}
                    className={`flex flex-col items-center justify-center gap-0.5 w-16 h-full transition-colors ${
                      isActive
                        ? "text-navy"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <item.icon
                      className={`h-5 w-5 ${isActive ? "text-navy" : ""}`}
                    />
                    <span className="text-[10px] font-medium leading-tight">
                      {item.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </nav>
        )}
      </SidebarInset>
    </>
  );
}
