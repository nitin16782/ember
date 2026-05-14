export const ROLE_OPTIONS = [
  {
    value: "super_admin",
    label: "Super Admin",
    description: "Full system access, RBAC configuration, audit log access.",
  },
  {
    value: "central_admin",
    label: "Central Admin",
    description: "Multi-property oversight, payroll review, cross-property reports.",
  },
  {
    value: "ops_lead",
    label: "Operations Lead",
    description: "Manage properties, staff assignments, daily ops, expenses.",
  },
  {
    value: "supply_lead",
    label: "Supply Lead",
    description: "Manage vendors, inventory, purchase orders, breakages.",
  },
  {
    value: "finance_admin",
    label: "Finance Admin",
    description: "Invoicing, payments, payroll processing, expense reconciliation.",
  },
  {
    value: "property_manager",
    label: "Property Manager",
    description: "Day-to-day ops at assigned properties, owner communication.",
  },
  {
    value: "supervisor",
    label: "Supervisor",
    description: "On-property attendance, edit approvals, daily checklists.",
  },
  {
    value: "associate",
    label: "Associate",
    description: "Self-service: attendance, leave, payslips, ID card, training.",
  },
  {
    value: "owner_portal",
    label: "Owner Portal",
    description: "Property owners — view-only access to their property reports.",
  },
] as const;

export type RoleValue = (typeof ROLE_OPTIONS)[number]["value"];

export function labelForRole(value: string): string {
  return ROLE_OPTIONS.find((r) => r.value === value)?.label ?? value;
}
