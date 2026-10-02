import React, { useEffect, useState, useRef } from "react";
import {
  acceptAllCookies,
  acceptOnlyNecessaryCookies,
  getConsentPreferences,
  needsConsentPrompt,
  saveConsentPreferences,
} from "@/utils/cookies";

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState({ x: 16, y: window.innerHeight - 150 }); // Initial position: left-4 (16px), higher up from bottom
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [showSettings, setShowSettings] = useState(false);
  const [statistics, setStatistics] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const bannerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const url = new URL(window.location.href);
    const force = url.searchParams.get("showCookieBanner") === "1";
    if (needsConsentPrompt() || force) {
      const prefs = getConsentPreferences();
      setStatistics(prefs?.statistics ?? false);
      setMarketing(prefs?.marketing ?? false);
      setVisible(true);
    }
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    // Låt knappar, länkar och kryssrutor fungera som vanligt
    if ((e.target as HTMLElement).closest("button, a, input, label")) return;
    setIsDragging(true);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    });
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    } else {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    }
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragStart]);

  const acceptAll = () => {
    acceptAllCookies();
    setVisible(false);
  };

  const acceptOnlyNecessary = () => {
    acceptOnlyNecessaryCookies();
    setVisible(false);
  };

  const saveSelection = () => {
    saveConsentPreferences({ statistics, marketing });
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      ref={bannerRef}
      role="dialog"
      aria-live="polite"
      aria-label="Cookie-meddelande"
      className="fixed z-50 max-w-3xl mx-auto cursor-move"
      style={{
        left: position.x,
        top: position.y,
        fontSize: "13px",
      }}
      onMouseDown={handleMouseDown}
    >
      <div
        className="bg-[#d6dde0] text-gray-800 border border-[#d6e6ee] rounded-lg shadow-lg p-2 md:p-3 flex flex-col md:flex-row md:items-center md:justify-between gap-2 max-w-xl mx-auto"
      >
        <div>
          <strong className="block text-base mb-1">Vi använder cookies</strong>
          <div className="text-sm">
            Nödvändiga cookies krävs för att sidan ska fungera. Med ditt samtycke använder vi även
            statistik (Google Analytics) och marknadsföring (Meta Pixel) för att förbättra sidan och
            mäta våra annonser på Facebook och Instagram. Ditt val sparas i ett år.
          </div>
          <a href="/privacy" className="text-xs underline mt-1 inline-block">Läs mer om cookies</a>

          {showSettings && (
            <fieldset className="mt-2 space-y-1 text-sm">
              <legend className="sr-only">Välj cookies</legend>
              <label className="flex items-start gap-2">
                <input type="checkbox" checked disabled className="mt-1" />
                <span><strong>Nödvändiga</strong> – krävs för att sidan ska fungera.</span>
              </label>
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={statistics}
                  onChange={(e) => setStatistics(e.target.checked)}
                  className="mt-1"
                />
                <span><strong>Statistik</strong> – hjälper oss förstå hur sidan används.</span>
              </label>
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={marketing}
                  onChange={(e) => setMarketing(e.target.checked)}
                  className="mt-1"
                />
                <span><strong>Marknadsföring</strong> – mäter och anpassar våra annonser hos Meta.</span>
              </label>
            </fieldset>
          )}
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          <button
            onClick={acceptOnlyNecessary}
            className="rounded-md px-3 py-2 border border-gray-300 bg-gray-50 text-xs"
            aria-label="Endast nödvändiga cookies"
          >
            Endast nödvändiga
          </button>

          {showSettings ? (
            <button
              onClick={saveSelection}
              className="rounded-md px-3 py-2 border border-gray-300 bg-gray-50 text-xs"
            >
              Spara val
            </button>
          ) : (
            <button
              onClick={() => {
                setShowSettings(true);
                // Flytta upp så att de utfällda valen syns
                setPosition((p) => ({ ...p, y: Math.max(16, Math.min(p.y, window.innerHeight - 340)) }));
              }}
              className="rounded-md px-3 py-2 border border-gray-300 bg-gray-50 text-xs"
              aria-expanded={showSettings}
            >
              Anpassa
            </button>
          )}

          <button
            onClick={acceptAll}
            className="rounded-md px-4 py-2 bg-[#2f6f99] hover:bg-[#256089] text-white font-semibold text-xs"
            aria-label="Acceptera alla cookies"
          >
            Acceptera alla
          </button>
        </div>
      </div>
    </div>
  );
}