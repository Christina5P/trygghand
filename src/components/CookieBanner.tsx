import React, { useEffect, useState, useRef } from "react";
import { acceptStatisticsCookies, declineStatisticsCookies } from "@/utils/cookies";

const COOKIE_NAME = "trygghand_cookie_consent";

function getCookie(name: string) {
  return document.cookie.split("; ").find((row) => row.startsWith(name + "="))?.split("=")[1];
}

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState({ x: 16, y: window.innerHeight - 150 }); // Initial position: left-4 (16px), higher up from bottom
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const bannerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const c = getCookie(COOKIE_NAME);
    const url = new URL(window.location.href);
    const force = url.searchParams.get("showCookieBanner") === "1";
    if (!c || force) setVisible(true);
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
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
    acceptStatisticsCookies();
    setVisible(false);
  };

  const acceptOnlyNecessary = () => {
    declineStatisticsCookies();
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
            Vi behöver några tekniska cookies för att sidan ska fungera. Välj "Acceptera alla" om du vill tillåta statistik‑cookies som hjälper oss förbättra tjänsten? Ditt val sparas i ett år.
          </div>
          <a href="/privacy" className="text-xs underline mt-1 inline-block">Läs mer om cookies</a>
        </div>

        <div className="flex gap-2 items-center">
          <button
            onClick={acceptOnlyNecessary}
            className="rounded-md px-3 py-2 border border-gray-300 bg-gray-50 text-xs"
            aria-label="Endast nödvändiga cookies"
          >
            Endast nödvändiga
          </button>

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