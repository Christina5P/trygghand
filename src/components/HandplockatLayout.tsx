import React from "react";
import HandplockatHeader from "@/components/HandplockatHeader";
import HandplockatFooter from "@/components/HandplockatFooter";
import { Outlet } from "react-router-dom";

// TODO: Byt ut mot HandplockatHeader/Footer för unik stil

const HandplockatLayout: React.FC = () => (
  <>
    <HandplockatHeader />
    <main className="min-h-[80vh] bg-background">
      <Outlet />
    </main>
    <HandplockatFooter />
  </>
);

export default HandplockatLayout;
