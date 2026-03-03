import { useEffect } from "react";

export default function Tidio() {
  useEffect(() => {
    const key = import.meta.env.VITE_TIDIO_KEY ?? "vxtqmisxoxoilyri3a2arswtxddqr416"; // fallback key if needed
    if (!key) return;

    // Avoid double-loading
    if (document.getElementById("tidio-script")) return;

    // inject custom style to limit widget size/position
    const style = document.createElement("style");
    style.id = "tidio-style";
    style.innerHTML = `
/* Constrain Tidio widget size and position */
.tidio-chat-iframe, .tidio-chat-iframe, .tidio-widget, #tidio-chat {
  width: 360px !important;
  height: 520px !important;
  max-width: 90vw !important;
  max-height: 80vh !important;
  bottom: 24px !important;
  right: 24px !important;
}

/* If Tidio injects an overlay or fullscreen container, reduce its z-index so it doesn't cover everything */
.tidio-overlay, .tidio-chat-iframe__overlay, .tidio-chat-iframe__container {
  pointer-events: auto;
}

/* improve visibility on dark backgrounds if needed */
.tidio-chat-iframe, .tidio-widget {
  border-radius: 12px !important;
  box-shadow: 0 8px 30px rgba(16,24,40,0.35) !important;
}

@media (max-width: 767px) {
  .tidio-chat-iframe, .tidio-widget, #tidio-chat {
    width: min(88vw, 340px) !important;
    height: min(60vh, 420px) !important;
    right: 12px !important;
    bottom: calc(env(safe-area-inset-bottom, 0px) + 88px) !important;
  }
}
`;
    document.head.appendChild(style);

    const s = document.createElement("script");
    s.id = "tidio-script";
    s.src = `https://code.tidio.co/${key}.js`;
    s.async = true;
    document.body.appendChild(s);

    // cleanup on unmount
    return () => {
      const script = document.getElementById("tidio-script");
      if (script) script.remove();
      const injectedStyle = document.getElementById("tidio-style");
      if (injectedStyle) injectedStyle.remove();

      // attempt to remove possible widget containers
      const possibleContainers = [
        document.querySelector(".tidio-chat-iframe"),
        document.querySelector(".tidio-widget"),
        document.getElementById("tidio-chat"),
        document.querySelector('iframe[src*="tidio"]')
      ];
      possibleContainers.forEach((el) => {
        if (el && el.parentNode) el.parentNode.removeChild(el);
      });

      try {
        // best-effort cleanup of global API
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        delete window.tidioChatApi;
      } catch {}
    };
  }, []);

  return null;
}