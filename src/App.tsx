import React, { Suspense, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";

import "@/index.css";

// UI / Providers
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// App utils
import PwaHead from "@/components/PwaHead";
import ScrollToTop from "@/components/ScrollToTop";
import CookieBanner from "@/components/CookieBanner";
import GoogleAnalytics from "@/components/GoogleAnalytics";

// Auth
import { AuthProvider } from "@/hooks/useAuth";
import CustomerRoute from "@/components/CustomerRoute";

// Helpers
import { getCookieConsent, acceptStatisticsCookies } from "@/utils/cookies";

// Components
import ResetPassword from "@/components/ResetPassword";
import About from "@/components/About";

// DEBUG
// @ts-ignore
window.supabase = supabase;

// --------------------
// Lazy pages
// --------------------

const Index = React.lazy(() => import("@/pages/Index"));
const NotFound = React.lazy(() => import("@/pages/NotFound"));

const ClearCookies = React.lazy(() => import("@/pages/ClearCookies"));
const Privacy = React.lazy(() => import("@/pages/Privacy"));
const Terms = React.lazy(() => import("@/pages/Terms"));

const DodsbohanteringSundsvall = React.lazy(() => import("@/pages/DodsbohanteringSundsvall"));
const SeniorforandringSundsvall = React.lazy(() => import("@/pages/SeniorforandringSundsvall"));
const ChecklistaVidDodsfallSundsvall = React.lazy(() => import("@/pages/ChecklistaVidDodsfallSundsvall"));
const VadIngarIDodsbohantering = React.lazy(() => import("@/pages/VadIngarIDodsbohantering"));

const FragorTips = React.lazy(() => import("@/components/FragorTips"));

const Portal = React.lazy(() => import("@/pages/Portal/Portal"));
const AdminPortal = React.lazy(() => import("@/pages/Portal/AdminPortal"));

const AuthPostbackTunnel = React.lazy(() => import("@/pages/AuthPostbackTunnel"));

// Services
const Services = React.lazy(() => import("@/pages/services"));
const Forsaljning = React.lazy(() => import("@/pages/services/Forsaljning"));
const Flyttstad = React.lazy(() => import("@/pages/services/Flyttstad"));
const Flytt = React.lazy(() => import("@/pages/services/Flytt"));
const TomningBohag = React.lazy(() => import("@/pages/services/TomningBohag"));
const Vardering = React.lazy(() => import("@/pages/services/Vardering-ai"));
const Magasinering = React.lazy(() => import("@/pages/services/Magasinering"));
const RadgivningPlanering = React.lazy(() => import("@/pages/services/RadgivningPlanering"));
const Juridikguide = React.lazy(() => import("@/pages/services/Juridikguide"));

// Handplockat
const HandplockatIndex = React.lazy(() => import("@/pages/Handplockat/HandplockatIndex"));
const HandplockatListing = React.lazy(() => import("@/pages/Handplockat/HandplockatListing"));
const HandplockatCreate = React.lazy(() => import("@/pages/Handplockat/HandplockatCreate"));
const HandplockatEdit = React.lazy(() => import("@/pages/Handplockat/HandplockatEdit"));
const HandplockatLayout = React.lazy(() => import("@/components/HandplockatLayout"));

const HandplockatTerms = React.lazy(() => import("@/pages/Handplockat/HandplockatTerms"));
const AdminHandplockat = React.lazy(() => import("@/pages/AdminHandplockat"));

// --------------------

const queryClient = new QueryClient();

function App() {
  useEffect(() => {
    const consent = getCookieConsent();
    if (consent === true) {
      acceptStatisticsCookies();
    }
  }, []);

  return (
    <AuthProvider>
      <PwaHead />
      <CookieBanner />
      <GoogleAnalytics />

      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <BrowserRouter>
            <ScrollToTop />
            <Toaster />
            <Sonner />

            <Suspense fallback={<div className="p-6 text-center">Laddar…</div>}>
              <Routes>

                {/* Auth */}
                <Route path="/auth/postback/tunnel" element={<AuthPostbackTunnel />} />

                {/* Start */}
                <Route path="/" element={<Index />} />
                <Route path="/contact" element={<Navigate to="/#contact" />} />
                <Route path="/kontakt" element={<Navigate to="/#contact" />} />

                {/* Info */}
                <Route path="/dodsbohantering-sundsvall" element={<DodsbohanteringSundsvall />} />
                <Route path="/seniorforandring-sundsvall" element={<SeniorforandringSundsvall />} />
                <Route path="/checklista-vid-dodsfall-sundsvall" element={<ChecklistaVidDodsfallSundsvall />} />
                <Route path="/vad-ingar-i-dodsbohantering" element={<VadIngarIDodsbohantering />} />
                <Route path="/about" element={<About />} />

                {/* Services */}
                <Route path="/services" element={<Services />} />
                <Route path="/services/forsaljning" element={<Forsaljning />} />
                <Route path="/services/flyttstad" element={<Flyttstad />} />
                <Route path="/services/flytt" element={<Flytt />} />
                <Route path="/services/tomning-bohag" element={<TomningBohag />} />
                <Route path="/services/vardering" element={<Vardering />} />
                <Route path="/services/magasinering" element={<Magasinering />} />
                <Route path="/services/radgivning-planering" element={<RadgivningPlanering />} />
                <Route path="/services/juridikguide" element={<Juridikguide />} />

                {/* Portal */}
                <Route path="/portal" element={<Portal />} />
                <Route path="/adminportal" element={<AdminPortal />} />

                {/* 🔥 ADMIN – LIGGER FÖRST (VIKTIGT) */}
              <Route element={<CustomerRoute />}>
                <Route path="/admin/handplockat">
                  <Route index element={<AdminHandplockat />} />
                  <Route path="skapa" element={<HandplockatCreate />} />
                  <Route path=":id/redigera" element={<HandplockatEdit />} />
                </Route>
              </Route>

                {/* 🔥 PORTAL */}
                <Route element={<CustomerRoute />}>
                  <Route path="/portal/handplockat" element={<HandplockatIndex />} />
                  <Route path="/portal/handplockat/skapa" element={<HandplockatCreate />} />
                  <Route path="/portal/handplockat/:id/redigera" element={<HandplockatEdit />} />
                </Route>

                {/* 🔥 PUBLIK – FIXAD */}
                <Route path="/handplockat" element={<HandplockatLayout />}>
                  <Route index element={<HandplockatIndex />} />
                  <Route path="annons/:id" element={<HandplockatListing />} />
                </Route>

                {/* Alias (valfri) */}
                <Route
                  path="/handplockat/:id"
                  element={<Navigate to="/handplockat" replace />}
                />

                {/* Policy */}
                <Route path="/fragor-tips" element={<FragorTips />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/clearcookies" element={<ClearCookies />} />
                <Route path="/privacy" element={<Privacy />} />
                <Route path="/terms" element={<Terms />} />
                <Route path="/handplockat-terms" element={<HandplockatTerms />} />

                {/* 404 */}
                <Route path="*" element={<NotFound />} />

              </Routes>
            </Suspense>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </AuthProvider>
  );
}

export default App;