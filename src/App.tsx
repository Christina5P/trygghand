import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import React, { useEffect } from "react";
import "@/index.css";

// 🧩 Komponenter & sidor
import ResetPassword from "@/components/ResetPassword";
import CookieBanner from "@/components/CookieBanner";
import GoogleAnalytics from "@/components/GoogleAnalytics";
import CustomerRoute from "@/components/CustomerRoute";
import About from "@/components/About";

import CookiePolicy from "@/pages/CookiePolicy";
import ClearCookies from "@/pages/ClearCookies";
import Privacy from "@/pages/Privacy";
import Index from "@/pages/Index";
import NotFound from "@/pages/NotFound";
import FragorTips from "@/components/FragorTips";
import AdminPortal from "@/pages/Portal/AdminPortal";
import Portal from "@/pages/Portal/Portal";

// 💼 Services
import Services from "@/pages/services";
import Forsaljning from "@/pages/services/Forsaljning";
import Stadning from "@/pages/services/Stadning";
import Flytt from "@/pages/services/Flytt";
import TomningBohag from "@/pages/services/TomningBohag";
import Vardering from "@/pages/services/vardering-ai";
import Magasinering from "@/pages/services/Magasinering";
import RadgivningPlanering from "@/pages/services/RadgivningPlanering";
import Juridikguide from "@/pages/services/Juridikguide";
import { AuthProvider } from "@/hooks/useAuth";
// 🧠 AI-värdering (ny)

const queryClient = new QueryClient();

function App() {
  useEffect(() => {
    // här kan du initiera analytics eller liknande
  }, []);

  return (
    <AuthProvider>
      <CookieBanner />
      <GoogleAnalytics />
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <BrowserRouter>
            <Toaster />
            <Sonner />
            <Routes>
              {/* 🌍 Startsida */}
              <Route path="/" element={<Index />} />

              {/* About */}
              <Route path="/about" element={<About />} />

              {/* Services översikt */}
              <Route path="/services" element={<Services />} />
              <Route path="/services/forsaljning" element={<Forsaljning />} />
              <Route path="/services/stadning" element={<Stadning />} />
              <Route path="/services/flytt" element={<Flytt />} />
              <Route path="/services/tomning-bohag" element={<TomningBohag />} />
              {/*<Route path="/services/vardering" element={<Vardering />} />*/}
              <Route path="/services/magasinering" element={<Magasinering />} />
              <Route path="/services/RadgivningPlanering" element={<RadgivningPlanering />} />

        
              {/* 🧠 AI Värdering */}
              <Route path="/vardering-ai" element={<Vardering />} />
              {/* 🧑‍💼 Portaler */}
              <Route path="/portal" element={<Portal />} />
              <Route path="/adminportal" element={<AdminPortal />} />

              {/* 🛡️ Kundskyddade rutter */}
              <Route element={<CustomerRoute />}>
                <Route path="/min-sida" element={<Portal />} />
              </Route>

              {/* ❓ Frågor & Policy */}
              <Route path="/fragor-tips" element={<FragorTips />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/cookiepolicy" element={<CookiePolicy />} />
              <Route path="/clearcookies" element={<ClearCookies />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/services/Juridikguide" element={<Juridikguide />} />

              {/* 🚫 404 */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </AuthProvider>
  );
}

export default App;
