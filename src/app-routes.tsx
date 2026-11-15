import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import { DetailPage, ModulePage } from "@/components/partner/module-page";
import AppLayout from "@/pages/app/layout";
import AuthLayout from "@/pages/auth/layout";
import Loading from "@/pages/loading.tsx";
import NotFound from "@/pages/not-found";

// Page modules resolved lazily — route-level code splitting preserved.
const modules = import.meta.glob("./pages/**/page.tsx");

const lazyPage = (key: string) => {
  const importer = modules[key];
  if (!importer) return <Navigate to="/404" replace />;
  const Component = React.lazy(importer as () => Promise<{ default: React.ComponentType<Record<string, never>> }>);
  return (
    <React.Suspense fallback={<Loading />}>
      <Component />
    </React.Suspense>
  );
};

const modulePage = (titleKey: string, descriptionKey?: string) => (
  <ModulePage titleKey={titleKey} descriptionKey={descriptionKey} />
);

const detailPage = (titleKey: string) => <DetailPage titleKey={titleKey} />;

/**
 * Route registry — independent of navigation metadata (menu-items.tsx).
 * Detail routes stay routable even when absent from the sidebar.
 * Menu permissions control presentation only; authorization is server-side.
 */
const appRoutes: { path: string; element: React.ReactElement }[] = [
  { path: "/today", element: lazyPage("./pages/app/today/page.tsx") },

  // Prospects & Customers
  { path: "/prospects", element: modulePage("menu-my-prospects") },
  { path: "/prospects/pipeline", element: modulePage("menu-sales-pipeline") },
  { path: "/prospects/new", element: modulePage("menu-new-prospect") },
  { path: "/prospects/:id", element: detailPage("menu-prospect-detail") },
  { path: "/prospects/:id/activities", element: detailPage("menu-prospect-activities") },
  { path: "/customers", element: modulePage("menu-my-customers") },
  { path: "/customers/new", element: modulePage("menu-new-customer") },
  { path: "/customers/:id", element: detailPage("menu-customer-detail") },
  { path: "/customers/:id/policies", element: detailPage("menu-customer-policies") },
  { path: "/customers/:id/interactions", element: detailPage("menu-customer-interactions") },

  // Sales
  { path: "/sales/products", element: modulePage("menu-products") },
  { path: "/sales/products/:id", element: detailPage("menu-product-detail") },
  { path: "/sales/illustrations", element: modulePage("menu-illustrations") },
  { path: "/sales/illustrations/new", element: modulePage("menu-new-illustration") },
  { path: "/sales/illustrations/:id", element: detailPage("menu-illustration-detail") },
  { path: "/sales/proposals", element: modulePage("menu-proposals") },
  { path: "/sales/proposals/new", element: modulePage("menu-new-proposal") },
  { path: "/sales/proposals/:id", element: detailPage("menu-proposal-detail") },
  { path: "/sales/applications", element: modulePage("menu-applications") },
  { path: "/sales/applications/:id", element: detailPage("menu-application-detail") },

  // My Portfolio
  { path: "/portfolio/policies", element: modulePage("menu-policies") },
  { path: "/portfolio/policies/:id", element: detailPage("menu-policy-detail") },
  { path: "/portfolio/renewals", element: modulePage("menu-renewals") },
  { path: "/portfolio/servicing", element: modulePage("menu-service-requests") },
  { path: "/portfolio/servicing/new", element: modulePage("menu-new-service-request") },
  { path: "/portfolio/servicing/:id", element: detailPage("menu-service-request-detail") },
  { path: "/portfolio/claims", element: modulePage("menu-claim-assistance") },
  { path: "/portfolio/claims/new", element: modulePage("menu-new-claim") },
  { path: "/portfolio/claims/:id", element: detailPage("menu-claim-detail") },

  // My Development
  { path: "/development/overview", element: modulePage("menu-my-journey") },
  { path: "/development/onboarding", element: modulePage("menu-onboarding") },
  { path: "/development/onboarding/:step", element: detailPage("menu-onboarding-step") },
  { path: "/development/learning", element: modulePage("menu-learning") },
  { path: "/development/learning/:courseId", element: detailPage("menu-course-detail") },
  { path: "/development/certifications", element: modulePage("menu-certifications") },
  { path: "/development/certifications/:id", element: detailPage("menu-certification-detail") },
  { path: "/development/eligibility", element: modulePage("menu-selling-eligibility") },
  { path: "/development/cpd", element: modulePage("menu-cpd") },
  { path: "/development/career", element: modulePage("menu-career-progress") },

  // Earnings
  { path: "/earnings", element: modulePage("menu-earnings-overview") },
  { path: "/earnings/commissions", element: modulePage("menu-commissions") },
  { path: "/earnings/statements", element: modulePage("menu-statements") },
  { path: "/earnings/payouts", element: modulePage("menu-payouts") },
  { path: "/earnings/adjustments", element: modulePage("menu-earnings-adjustments") },

  // Performance
  { path: "/performance", element: modulePage("menu-my-performance") },
  { path: "/performance/targets", element: modulePage("menu-targets") },
  { path: "/performance/achievements", element: modulePage("menu-achievements") },
  { path: "/performance/campaigns", element: modulePage("menu-campaigns-contests") },
  { path: "/performance/campaigns/:id", element: detailPage("menu-campaign-detail") },
  { path: "/performance/contests", element: modulePage("menu-contests") },
  { path: "/performance/contests/:id", element: detailPage("menu-contest-detail") },

  // My Agency
  { path: "/agency", element: modulePage("menu-my-agency") },
  { path: "/agency/hierarchy", element: modulePage("menu-organization") },
  { path: "/agency/team", element: modulePage("menu-my-team") },
  { path: "/agency/team/:id", element: detailPage("menu-team-member-detail") },

  // Support & Resources
  { path: "/support", element: modulePage("menu-help-center") },
  { path: "/support/tickets", element: modulePage("menu-my-tickets") },
  { path: "/support/tickets/new", element: modulePage("menu-new-ticket") },
  { path: "/support/tickets/:id", element: detailPage("menu-ticket-detail") },
  { path: "/resources/documents", element: modulePage("menu-documents") },
  { path: "/resources/documents/:id", element: detailPage("menu-document-detail") },
  { path: "/resources/announcements", element: modulePage("menu-announcements") },
  { path: "/resources/announcements/:id", element: detailPage("menu-announcement-detail") },
  { path: "/resources/faq", element: modulePage("menu-faq") },

  // Profile & Settings
  { path: "/me", element: <Navigate to="/me/profile" replace /> },
  { path: "/me/profile", element: modulePage("menu-my-profile") },
  { path: "/me/preferences", element: modulePage("menu-preferences") },
  { path: "/me/security", element: modulePage("menu-security") },
  { path: "/me/notifications", element: modulePage("menu-notifications") },
];

const authRoutes: { path: string; element: React.ReactElement }[] = [
  { path: "sign-in", element: lazyPage("./pages/auth/sign-in/page.tsx") },
  { path: "sign-up", element: lazyPage("./pages/auth/sign-up/page.tsx") },
  { path: "password-reset", element: lazyPage("./pages/auth/password-reset/page.tsx") },
  { path: "password-sent", element: lazyPage("./pages/auth/password-sent/page.tsx") },
  { path: "password-new", element: lazyPage("./pages/auth/password-new/page.tsx") },
  { path: "get-verification", element: lazyPage("./pages/auth/get-verification/page.tsx") },
  { path: "set-verification", element: lazyPage("./pages/auth/set-verification/page.tsx") },
  { path: "terms-and-conditions", element: lazyPage("./pages/auth/terms-and-conditions/page.tsx") },
  { path: "privacy-policy", element: lazyPage("./pages/auth/privacy-policy/page.tsx") },
];

const AppRoutes = () => {
  return (
    <Routes>
      {/* Auth routes with AuthLayout */}
      <Route path="/auth" element={<AuthLayout />}>
        <Route index element={<Navigate to="/auth/sign-in" replace />} />
        {authRoutes.map((r) => (
          <Route key={r.path} path={r.path} element={r.element} />
        ))}
      </Route>

      {/* Partner app routes with AppLayout */}
      <Route element={<AppLayout />}>
        <Route path="/" element={<Navigate to="/today" replace />} />
        {appRoutes.map((r) => (
          <Route key={r.path} path={r.path} element={r.element} />
        ))}
      </Route>

      <Route path="/404" element={<NotFound />} />
      <Route path="*" element={<Navigate to="/404" replace />} />
    </Routes>
  );
};

export default AppRoutes;
