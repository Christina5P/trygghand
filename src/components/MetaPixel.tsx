import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { CONSENT_CHANGED_EVENT, getConsentPreferences } from "@/utils/cookies";

const META_PIXEL_ID = "1588425699042764";

type Fbq = ((...args: unknown[]) => void) & {
  callMethod?: (...args: unknown[]) => void;
  queue: unknown[];
  push: Fbq;
  loaded: boolean;
  version: string;
};

type MetaWindow = Window & { fbq?: Fbq; _fbq?: Fbq };

function loadMetaPixel() {
  const w = window as MetaWindow;

  // Redan laddad i denna session (t.ex. samtycke återkallat och givet igen)
  if (w.fbq) {
    w.fbq("consent", "grant");
    return;
  }

  // Metas standardsnippet, men körs först efter samtycke
  const fbq = function (...args: unknown[]) {
    if (fbq.callMethod) fbq.callMethod(...args);
    else fbq.queue.push(args);
  } as Fbq;
  fbq.push = fbq;
  fbq.loaded = true;
  fbq.version = "2.0";
  fbq.queue = [];
  w.fbq = fbq;
  if (!w._fbq) w._fbq = fbq;

  const script = document.createElement("script");
  script.id = "meta-pixel-script";
  script.async = true;
  script.src = "https://connect.facebook.net/en_US/fbevents.js";
  document.head.appendChild(script);

  fbq("init", META_PIXEL_ID);
  fbq("track", "PageView");
}

function removeMetaCookies() {
  const host = window.location.hostname;
  const domains = ["", host, `.${host.replace(/^www\./, "")}`];
  for (const name of ["_fbp", "_fbc"]) {
    for (const domain of domains) {
      const domainPart = domain ? `;domain=${domain}` : "";
      document.cookie = `${name}=;path=/;max-age=0${domainPart}`;
    }
  }
}

function revokeMetaPixel() {
  const w = window as MetaWindow;
  if (w.fbq) w.fbq("consent", "revoke");
  removeMetaCookies();
}

// Laddar Meta Pixel ENDAST om besökaren gett samtycke till marknadsföring
// och inte är inloggad (kundportal/admin ska aldrig spåras).
export default function MetaPixel() {
  const { user, loading } = useAuth();
  const [hasMarketingConsent, setHasMarketingConsent] = useState(
    () => getConsentPreferences()?.marketing === true,
  );

  useEffect(() => {
    const onChange = () => setHasMarketingConsent(getConsentPreferences()?.marketing === true);
    window.addEventListener(CONSENT_CHANGED_EVENT, onChange);
    // Fångar även ändringar i andra flikar eller om cookien raderas manuellt
    const interval = setInterval(onChange, 1000);
    return () => {
      window.removeEventListener(CONSENT_CHANGED_EVENT, onChange);
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (loading) return;
    if (hasMarketingConsent && !user) {
      loadMetaPixel();
    } else {
      revokeMetaPixel();
    }
  }, [user, loading, hasMarketingConsent]);

  return null;
}
