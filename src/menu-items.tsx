import { MenuItem } from "@/types/types";

/**
 * Averuna Partner navigation metadata.
 * Visibility here controls presentation only — routes are registered
 * independently in app-routes.tsx and authorization stays server-side.
 * Icons: NextureIcons only (Gogo Design identity preserved).
 */
export const leftMenuItems: MenuItem[] = [
  {
    id: "today",
    icon: "NiHome",
    label: "menu-today",
    href: "/today",
    color: "text-primary",
  },
  {
    id: "dashboard",
    icon: "NiCells",
    label: "menu-dashboard",
    href: "/dashboard",
    color: "text-primary",
  },
  {
    id: "prospects-customers",
    icon: "NiUsers",
    label: "menu-prospects-customers",
    href: "/prospects",
    color: "text-primary",
    children: [
      { id: "my-prospects", icon: "NiUser", label: "menu-my-prospects", href: "/prospects" },
      { id: "sales-pipeline", icon: "NiChartLine", label: "menu-sales-pipeline", href: "/prospects/pipeline" },
      { id: "my-customers", icon: "NiUsers", label: "menu-my-customers", href: "/customers" },
    ],
  },
  {
    id: "sales",
    icon: "NiBag",
    label: "menu-sales",
    href: "/sales",
    color: "text-primary",
    children: [
      { id: "product-catalogue", icon: "NiCatalog", label: "menu-product-catalogue", href: "/sales/products" },
      { id: "illustrations", icon: "NiDocumentFull", label: "menu-illustrations", href: "/sales/illustrations" },
      { id: "proposals", icon: "NiDocumentFull", label: "menu-proposals", href: "/sales/proposals" },
      { id: "applications", icon: "NiListCheck", label: "menu-applications", href: "/sales/applications" },
    ],
  },
  {
    id: "portfolio",
    icon: "NiShieldCheck",
    label: "menu-portfolio",
    href: "/portfolio",
    color: "text-primary",
    children: [
      { id: "my-policies", icon: "NiDocumentFull", label: "menu-my-policies", href: "/portfolio/policies" },
      { id: "renewals", icon: "NiCalendar", label: "menu-renewals", href: "/portfolio/renewals" },
      { id: "servicing", icon: "NiSettings", label: "menu-service-requests", href: "/portfolio/servicing" },
      { id: "claims", icon: "NiShield", label: "menu-claim-assistance", href: "/portfolio/claims" },
    ],
  },
  {
    id: "development",
    icon: "NiGraduation",
    label: "menu-development",
    href: "/development",
    color: "text-primary",
    children: [
      { id: "journey", icon: "NiPath", label: "menu-my-journey", href: "/development/overview" },
      { id: "learning", icon: "NiBook", label: "menu-learning", href: "/development/learning" },
      { id: "certifications", icon: "NiBadge", label: "menu-certifications", href: "/development/certifications" },
      { id: "eligibility", icon: "NiShieldCheck", label: "menu-selling-eligibility", href: "/development/eligibility" },
      { id: "cpd", icon: "NiChartPie", label: "menu-cpd", href: "/development/cpd" },
    ],
  },
  {
    id: "earnings",
    icon: "NiWallet",
    label: "menu-earnings",
    href: "/earnings",
    color: "text-primary",
    children: [
      { id: "earnings-overview", icon: "NiChartPie", label: "menu-earnings-overview", href: "/earnings" },
      { id: "commissions", icon: "NiMoney", label: "menu-commissions", href: "/earnings/commissions" },
      { id: "statements", icon: "NiReceipt", label: "menu-statements", href: "/earnings/statements" },
      { id: "payouts", icon: "NiWallet", label: "menu-payouts", href: "/earnings/payouts" },
    ],
  },
  {
    id: "performance",
    icon: "NiChartLine",
    label: "menu-performance",
    href: "/performance",
    color: "text-primary",
    children: [
      { id: "my-performance", icon: "NiChartLine", label: "menu-my-performance", href: "/performance" },
      { id: "targets", icon: "NiCrosshair", label: "menu-targets", href: "/performance/targets" },
      { id: "campaigns", icon: "NiStar", label: "menu-campaigns-contests", href: "/performance/campaigns" },
    ],
  },
  {
    id: "agency",
    icon: "NiGroup",
    label: "menu-agency",
    href: "/agency",
    color: "text-primary",
    children: [
      { id: "agency-overview", icon: "NiBuilding", label: "menu-agency-overview", href: "/agency" },
      { id: "organization", icon: "NiDirectory", label: "menu-organization", href: "/agency/hierarchy" },
      { id: "my-team", icon: "NiUsers", label: "menu-my-team", href: "/agency/team" },
    ],
  },
  {
    id: "support-resources",
    icon: "NiHeadset",
    label: "menu-support-resources",
    href: "/support",
    color: "text-primary",
    children: [
      { id: "help-center", icon: "NiQuestionHexagon", label: "menu-help-center", href: "/support" },
      { id: "my-tickets", icon: "NiMessages", label: "menu-my-tickets", href: "/support/tickets" },
      { id: "documents", icon: "NiFolder", label: "menu-documents", href: "/resources/documents" },
      { id: "announcements", icon: "NiBell", label: "menu-announcements", href: "/resources/announcements" },
    ],
  },
];

export const leftMenuBottomItems: MenuItem[] = [
  { id: "me-profile", label: "menu-my-profile", href: "/me/profile", icon: "NiUser" },
  { id: "settings", label: "menu-settings", href: "/me/preferences", icon: "NiSettings" },
  { id: "help", label: "menu-help", href: "/support", icon: "NiQuestionHexagon" },
  { id: "sign-out", label: "menu-sign-out", href: "/auth/sign-out", icon: "NiArrowRightSquare" },
];
