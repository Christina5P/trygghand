import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const forceScrollTop = () => {
  window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;
};

const ScrollToTop = () => {
  const location = useLocation();

  useEffect(() => {
    if (location.hash) return;

    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }

    forceScrollTop();
    const rafId = requestAnimationFrame(forceScrollTop);
    const timeoutId = window.setTimeout(forceScrollTop, 60);

    return () => {
      cancelAnimationFrame(rafId);
      clearTimeout(timeoutId);
    };
  }, [location.pathname, location.search, location.hash]);

  return null;
};

export default ScrollToTop;
