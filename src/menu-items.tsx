import { MenuItem } from "@/types/types";

/**
 * Averuna Partner navigation metadata.
 * Visibility here controls presentation only — routes are registered
 * independently in app-routes.tsx and authorization stays server-side.
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
    id: "prospects-customers",
    icon: "NiUserPlus",
    label: "menu-prospects-customers",
    color: "text-primary",
    children: [
      { id: "my-prospects", icon: "NiUser", label: "menu-my-prospects", href: "/prospects" },
      { id: "sales-pipeline", icon: "NiChartFunnel", label: "menu-sales-pipeline", href: "/prospects/pipeline" },
      { id: "my-customers", icon: "NiUsers", label: "menu-my-customers", href: "/customers" },
    ],
  },
  {
    id: "sales",
    icon: "NiChartLine",
    label: "menu-sales",
    color: "text-primary",
    children: [
      { id: "products", icon: "NiBag", label: "menu-products", href: "/sales/products" },
      { id: "illustrations", icon: "NiChartBar", label: "menu-illustrations", href: "/sales/illustrations" },
      { id: "proposals", icon: "NiDocumentFull", label: "menu-proposals", href: "/sales/proposals" },
      { id: "applications", icon: "NiDocumentCheck", label: "menu-applications", href: "/sales/applications" },
    ],
  },
  {
    id: "portfolio",
    icon: "NiBriefcase",
    label: "menu-portfolio",
    color: "text-primary",
    children: [
      { id: "policies", icon: "NiShieldCheck", label: "menu-policies", href: "/portfolio/policies" },
      { id: "renewals", icon: "NiCalendarClock", label: "menu-renewals", href: "/portfolio/renewals" },
      { id: "servicing", icon: "NiSettings", label: "menu-service-requests", href: "/portfolio/servicing" },
      { id: "claims", icon: "NiHeadphones", label: "menu-claim-assistance", href: "/portfolio/claims" },
    ],
  },
  {
    id: "development",
    icon: "NiGraduation",
    label: "menu-development",
    color: "text-primary",
    children: [
      { id: "journey", icon: "NiFlag", label: "menu-my-journey", href: "/development/overview" },
      { id: "learning", icon: "NiBook", label: "menu-learning", href: "/development/learning" },
      { id: "certifications", icon: "NiBadgeCheck", label: "menu-certifications", href: "/development/certifications" },
      { id: "eligibility", icon: "NiShield", label: "menu-selling-eligibility", href: "/development/eligibility" },
      { id: "cpd", icon: "NiChartPie", label: "menu-cpd", href: "/development/cpd" },
      { id: "career", icon: "NiTrendUp", label: "menu-career-progress", href: "/development/career" },
    ],
  },
  {
    id: "earnings",
    icon: "NiMoneyBag",
    label: "menu-earnings",
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
    icon: "NiMedal",
    label: "menu-performance",
    color: "text-primary",
    children: [
      { id: "my-performance", icon: "NiChartBar", label: "menu-my-performance", href: "/performance" },
      { id: "targets", icon: "NiCrosshair", label: "menu-targets", href: "/performance/targets" },
      { id: "campaigns", icon: "NiFlag", label: "menu-campaigns-contests", href: "/performance/campaigns" },
    ],
  },
  {
    id: "agency",
    icon: "NiBuilding",
    label: "menu-agency",
    color: "text-primary",
    children: [
      { id: "my-agency", icon: "NiBuilding", label: "menu-my-agency", href: "/agency" },
      { id: "organization", icon: "NiNetwork", label: "menu-organization", href: "/agency/hierarchy" },
      { id: "my-team", icon: "NiGroup", label: "menu-my-team", href: "/agency/team" },
    ],
  },
  {
    id: "support-resources",
    icon: "NiHeadphones",
    label: "menu-support-resources",
    color: "text-primary",
    children: [
      { id: "help-center", icon: "NiQuestionHexagon", label: "menu-help-center", href: "/support" },
      { id: "my-tickets", icon: "NiDocumentFull", label: "menu-my-tickets", href: "/support/tickets" },
      { id: "documents", icon: "NiDocumentFull", label: "menu-documents", href: "/resources/documents" },
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
