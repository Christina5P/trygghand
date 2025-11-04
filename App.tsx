import { Toaster } from "app/src/components/ui/toaster";
import { Toaster as Sonner } from "app/src/components/ui/sonner";
import { TooltipProvider } from "app/src/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import React, { useEffect } from "react";

// 🧩 Komponenter & sidor
import ResetPassword from "app/src/components/ResetPassword";
import CookieBanner from "app/src/components/CookieBanner";
import CookiePolicy from "app/src/pages/CookiePolicy";
import ClearCookies from "app/src/pages/ClearCookies";
import GDPRinfo from "app/src/pages/GDPRinfo";
import Index from "app/src/pages/Index";
import NotFound from "app/src/pages/NotFound";
import FragorTips from "app/src/pages/FragorTips";
import AdminPortal from "app/src/pages/AdminPortal";
import Portal from "app/src/pages/Portal";

// 💼 Services
import Services from "app/src/pages/services";
import Forsaljning from "app/src/pages/services/Forsaljning";
import Stadning from "app/src/pages/services/Stadning";
import Flytt from "app/src/pages/services/Flytt";
import TomningBohag from "app/src/pages/services/TomningBohag";
import Vardering from "app/src/pages/services/vardering-ai";
import Magasinering from "app/src/pages/services/Magasinering";
import RadgivningPlanering from "app/src/pages/services/RadgivningPlanering";

// 🧠 AI-värdering (ny)

const queryClient = new QueryClient();

function App() {
  useEffect(() => {}, []);

  return (
    <>
      <CookieBanner />
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <BrowserRouter>
            <Toaster />
            <Sonner />
            <Routes>
              {/* 🌍 Startsida */}
              <Route path="/" element={<Index />} />

              {/* 💼 Tjänster */}
              <Route path="/services" element={<Services />} />
              <Route path="/services/forsaljning" element={<Forsaljning />} />
              <Route path="/services/stadning" element={<Stadning />} />
              <Route path="/services/flytt" element={<Flytt />} />
              <Route path="/services/tomning-bohag" element={<TomningBohag />} />
              <Route path="/services/vardering" element={<Vardering />} />
              <Route path="/services/magasinering" element={<Magasinering />} />
              <Route path="/services/radgivning-planering" element={<RadgivningPlanering />} />

              {/* 🧠 AI Värdering */}
              <Route path="/vardering-ai" element={<Vardering />} />

              {/* 🧑‍💼 Portaler */}
              <Route path="/portal" element={<Portal />} />
              <Route path="/adminportal" element={<AdminPortal />} />
              <Route path="/admin" element={<AdminPortal />} />

              {/* ❓ Frågor & Policy */}
              <Route path="/fragor-tips" element={<FragorTips />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/cookiepolicy" element={<CookiePolicy />} />
              <Route path="/clearcookies" element={<ClearCookies />} />
              <Route path="/GDPRinfo" element={<GDPRinfo />} />

              {/* 🚫 404 */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </>
  );
}

export default App;
