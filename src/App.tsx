import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import ResetPassword from "@/components/ResetPassword";
import CookieBanner from "@/components/CookieBanner";
import CookiePolicy from "@/pages/CookiePolicy";
import ClearCookies from "@/pages/ClearCookies";
import Privacy from "@/pages/Privacy";
import React, { useEffect } from "react";

const ResetPasswordRoute = () => {
  return <div>Reset Password</div>;
};

import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import FragorTips from "./pages/FragorTips";
import AdminPortal from "./pages/AdminPortal";

// Dina services-sidor
import Services from "./pages/services";
import Forsaljning from "./pages/services/Forsaljning";
import Stadning from "./pages/services/Stadning";
import Flytt from "./pages/services/Flytt";
import TomningBohag from "./pages/services/TomningBohag";
import Vardering from "./pages/services/Vardering";
import Magasinering from "./pages/services/Magasinering";
import RadgivningPlanering from "./pages/services/RadgivningPlanering";
// Viktigt! Importera Portal-komponenten
import Portal from "./pages/Portal";

const queryClient = new QueryClient();

function App() {
  useEffect(() => {
    // initiera analytics här, t.ex. load script eller starta gtag
  }, []);

  return (
    <>
      <CookieBanner />
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <BrowserRouter>
            <Toaster />
            <Sonner />
            <Routes>
              {/* Startsida */}
              <Route path="/" element={<Index />} />

              {/* Services översikt */}
              <Route path="/services" element={<Services />} />

              {/* Individuella tjänster */}
              <Route path="/services/forsaljning" element={<Forsaljning />} />
              <Route path="/services/stadning" element={<Stadning />} />
              <Route path="/services/flytt" element={<Flytt />} />
              <Route path="/services/tomning-bohag" element={<TomningBohag />} />
              <Route path="/services/vardering" element={<Vardering />} />
              <Route path="/services/magasinering" element={<Magasinering />} />
              <Route path="/services/RadgivningPlanering" element={<RadgivningPlanering />} />

              {/* Portal för kunder och admin */}
              <Route path="/portal" element={<Portal />} />

              {/* Frågor och Tips */}
              <Route path="/fragor-tips" element={<FragorTips />} />

              <Route path="/reset-password" element={<ResetPassword />} />

              <Route path="/cookiepolicy" element={<CookiePolicy />} />

              <Route path="/clearcookies" element={<ClearCookies />} />

              <Route path="/privacy" element={<Privacy />} />

              {/* Catch-all 404 */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </>
  );
}

export default App;