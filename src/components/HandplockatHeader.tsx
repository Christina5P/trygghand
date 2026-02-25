import React from "react";
import { Link } from "react-router-dom";
import HouseHandsLogo from "@/components/HouseHandsLogo";

export default function HandplockatHeader() {
  return (
    <header className="w-full bg-white border-b border-border shadow-sm">
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-2 md:gap-6">
        <div className="flex items-center gap-3">
          <HouseHandsLogo className="w-8 h-8 text-primary" />
          <span className="font-bold text-lg tracking-tight">Handplockat Sundsvall</span>
        </div>
        <div className="flex-1 flex justify-center">
          <a href="#listings" className="text-muted-foreground text-base font-semibold hover:underline underline-offset-2 transition-colors">Alla fynd</a>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground justify-end">
          <span>En del av</span>
          <Link to="/" className="underline underline-offset-2 hover:text-primary">Trygg Hand</Link>
        </div>
      </div>
    </header>
  );
}
