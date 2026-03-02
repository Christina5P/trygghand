
import React, { useState } from "react";
import { Link } from "react-router-dom";
import HouseHandsLogo from "@/components/HouseHandsLogo";

export default function HandplockatHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <header className="w-full bg-white border-b border-border shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-4">
        {/* Logo och titel */}
        <div className="flex items-center gap-3 min-w-0">
          <HouseHandsLogo
            variant="handplockat"
            className="h-12 w-auto md:h-16"
          />
          <span className="font-semibold text-lg md:text-xl tracking-tight truncate">
            Handplockat Sundsvall
          </span>
        </div>

        {/* Hamburger meny för mobil */}
        <button
          className="md:hidden ml-auto p-2 rounded focus:outline-none focus:ring-2 focus:ring-primary"
          aria-label="Öppna meny"
          onClick={() => setMenuOpen((v) => !v)}
        >
          <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        {/* Desktop meny */}
        <nav className="hidden md:flex flex-1 items-center justify-center gap-8">
          <a
            href="#listings"
            className="text-muted-foreground text-base font-medium hover:underline underline-offset-4 transition-colors"
          >
            Alla fynd
          </a>
        </nav>

        <div className="hidden md:flex items-center gap-2 text-sm text-muted-foreground justify-end">
          <span>Handplockat är</span>
          <Link
            to="/"
            className="underline underline-offset-4 hover:text-primary"
          >
            Trygg Hands
          </Link>
          <span>marknadsplats för privatpersoner</span>
        </div>

        {/* Mobil meny */}
        {menuOpen && (
          <div className="w-full flex flex-col items-center gap-4 mt-3 md:hidden animate-fade-in">
            <a
              href="#listings"
              className="text-muted-foreground text-base font-medium hover:underline underline-offset-4 transition-colors"
              onClick={() => setMenuOpen(false)}
            >
              Alla fynd
            </a>
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <span>Handplockat är</span>
              <Link
                to="/"
                className="underline underline-offset-4 hover:text-primary"
                onClick={() => setMenuOpen(false)}
              >
                Trygg Hands
              </Link>
              <span>marknadsplats för privatpersoner</span>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}