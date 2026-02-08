import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import React, { Suspense, useEffect } from "react";
import "@/index.css";
import PwaHead from "@/components/PwaHead";
import ScrollToTop from "@/components/ScrollToTop";

// 🧩 Komponenter & sidor
import ResetPassword from "@/components/ResetPassword";
import CookieBanner from "@/components/CookieBanner";
import GoogleAnalytics from "@/components/GoogleAnalytics";
import CustomerRoute from "@/components/CustomerRoute";
import About from "@/components/About";

const ClearCookies = React.lazy(() => import("@/pages/ClearCookies"));
const Privacy = React.lazy(() => import("@/pages/Privacy"));
const Terms = React.lazy(() => import("@/pages/Terms"));
const Index = React.lazy(() => import("@/pages/Index"));
const NotFound = React.lazy(() => import("@/pages/NotFound"));
const DodsbohanteringSundsvall = React.lazy(() => import("@/pages/DodsbohanteringSundsvall"));
const SeniorforandringSundsvall = React.lazy(() => import("@/pages/SeniorforandringSundsvall"));
const ChecklistaVidDodsfallSundsvall = React.lazy(() => import("@/pages/ChecklistaVidDodsfallSundsvall"));
const VadIngarIDodsbohantering = React.lazy(() => import("@/pages/VadIngarIDodsbohantering"));
const FragorTips = React.lazy(() => import("@/components/FragorTips"));
const AdminPortal = React.lazy(() => import("@/pages/Portal/AdminPortal"));
const Portal = React.lazy(() => import("@/pages/Portal/Portal"));
const CubePlannerApp = React.lazy(() => import("@/portal/cube-planner/CubePlannerApp"));
const AuthPostbackTunnel = React.lazy(() => import("@/pages/AuthPostbackTunnel"));

// 💼 Services
const Services = React.lazy(() => import("@/pages/services"));
const Forsaljning = React.lazy(() => import("@/pages/services/Forsaljning"));
const Flyttstad = React.lazy(() => import("@/pages/services/Flyttstad"));
const TomningBohag = React.lazy(() => import("@/pages/services/TomningBohag"));
const Flytt = React.lazy(() => import("@/pages/services/Flytt"));
const Vardering = React.lazy(() => import("@/pages/services/Vardering-ai"));
const Magasinering = React.lazy(() => import("@/pages/services/Magasinering"));
const RadgivningPlanering = React.lazy(() => import("@/pages/services/RadgivningPlanering"));
const Juridikguide = React.lazy(() => import("@/pages/services/Juridikguide"));
import { AuthProvider } from "@/hooks/useAuth";
import { getCookieConsent, acceptStatisticsCookies } from "@/utils/cookies";
// 🧠 AI-värdering (ny)

const queryClient = new QueryClient();

function App() {
  useEffect(() => {
    // Initiera cookie consent vid sidladdning
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
            <Suspense fallback={null}>
              <Routes>
                  {/* Codespaces Dev Tunnel postback */}
                  <Route path="/auth/postback/tunnel" element={<AuthPostbackTunnel />} />

                  {/* 🌍 Startsida */}
                  <Route path="/" element={<Index />} />
                  <Route path="/contact" element={<Navigate to="/#contact" replace />} />
                  <Route path="/kontakt" element={<Navigate to="/#contact" replace />} />
                  <Route path="/dodsbohantering-sundsvall" element={<DodsbohanteringSundsvall />} />
                  <Route path="/seniorforandring-sundsvall" element={<SeniorforandringSundsvall />} />
                  <Route path="/forsaljning" element={<Navigate to="/services/forsaljning" replace />} />
                  <Route path="/checklista-vid-dodsfall-sundsvall" element={<ChecklistaVidDodsfallSundsvall />} />
                  <Route path="/vad-ingar-i-dodsbohantering" element={<VadIngarIDodsbohantering />} />

                  {/* About */}
                  <Route path="/about" element={<About />} />

                  {/* Services översikt */}
                  <Route path="/services" element={<Services />} />
                  <Route path="/services/forsaljning" element={<Forsaljning />} />
                  <Route path="/services/flyttstad" element={<Flyttstad />} />
                  <Route path="/services/flytt" element={<Flytt />} />
                  <Route path="/services/tomning-bohag" element={<TomningBohag />} />
                  <Route path="/services/vardering" element={<Vardering />} />
                  <Route path="/services/magasinering" element={<Magasinering />} />
                  <Route path="/services/radgivning-planering" element={<RadgivningPlanering />} />
                  <Route path="/services/juridikguide" element={<Juridikguide />} />

          
                  {/* 🧠 AI Värdering */}
                  {/*<Route path="/vardering-ai" element={<Vardering />} />*/}
                  {/* 🧑‍💼 Portaler */}
                  <Route path="/portal" element={<Portal />} />
                  <Route path="/adminportal" element={<AdminPortal />} />

                  {/* 🛡️ Kundskyddade rutter */}
                  <Route element={<CustomerRoute />}>
                    <Route path="/min-sida" element={<Portal />} />
                    <Route path="/portal/admin/cube-planner" element={<CubePlannerApp />} />
                    <Route path="/portal/cube-planner" element={<CubePlannerApp />} />
                  </Route>

                  {/* ❓ Frågor & Policy */}
                  <Route path="/fragor-tips" element={<FragorTips />} />
                  <Route path="/reset-password" element={<ResetPassword />} />
                  <Route path="/clearcookies" element={<ClearCookies />} />
                  <Route path="/privacy" element={<Privacy />} />
                  <Route path="/terms" element={<Terms />} />
                  <Route path="/services/Forsaljning" element={<Navigate to="/services/forsaljning" replace />} />
                  <Route path="/services/Flytt" element={<Navigate to="/services/flytt" replace />} />
                  <Route path="/services/Magasinering" element={<Navigate to="/services/magasinering" replace />} />
                  <Route path="/services/Juridikguide" element={<Navigate to="/services/juridikguide" replace />} />
                  <Route path="/services/dodsbohantering-sundsvall" element={<Navigate to="/dodsbohantering-sundsvall" replace />} />
                  <Route path="/services/seniorforandring-sundsvall" element={<Navigate to="/seniorforandring-sundsvall" replace />} />

                  {/* 🚫 404 */}
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
