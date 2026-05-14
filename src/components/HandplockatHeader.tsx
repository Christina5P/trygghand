
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
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-3">
              <HouseHandsLogo
                variant="handplockat"
                className="h-12 w-auto md:h-16"
              />
              <span className="font-semibold text-lg md:text-xl tracking-tight truncate">
                Handplockat Sundsvall
              </span>
            </div>
            <Link
              to="/"
              className="text-xs md:text-sm text-muted-foreground hover:text-primary font-medium flex items-center gap-1 transition-colors"
            >
              ← Tillbaka till Trygg Hand
            </Link>
          </div>
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
          <Link
            to="/second-hand-sundsvall"
            className="font-semibold text-lg md:text-xl tracking-tight truncate hover:underline underline-offset-4 transition-colors"
          >
            Om second hand
          </Link>
          <a
            href="#listings"
            className="font-semibold text-lg md:text-xl tracking-tight truncate hover:underline underline-offset-4 transition-colors"
          >
            Alla fynd
          </a>
        </nav>

        <div className="hidden md:flex flex-col items-end text-sm text-muted-foreground gap-1">
  <span>
    Handplockat är en del av{" "}
    <Link
      to="/"
      className="underline underline-offset-4 hover:text-primary font-semibold text-foreground"
    >
      Trygg Hand
    </Link>{" "}
    (org.nr 559564-3445).
  </span>

  <span>
    Här säljer vi utvalda föremål från hem vi hjälper till att avveckla.
  </span>

  <span>
    Alla köp hanteras av Trygg Hand.
  </span>
</div>

        {/* Mobil meny */}
        {menuOpen && (
          <div className="w-full flex flex-col items-center gap-4 mt-3 md:hidden animate-fade-in">
            <Link
              to="/second-hand-sundsvall"
              className="text-muted-foreground text-base font-medium hover:underline underline-offset-4 transition-colors"
              onClick={() => setMenuOpen(false)}
            >
              Om second hand
            </Link>
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
                className="underline underline-offset-4 hover:text-primary font-semibold text-foreground"
                onClick={() => setMenuOpen(false)}
              >
                Trygg Hand
              </Link>
              <span>Handplockat är en del av Trygg Hand.
              Här säljer vi utvalda föremål från hem vi hjälper till att avveckla.
              Alla köp hanteras av Trygg Hand.</span>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}