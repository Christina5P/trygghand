export const COOKIE_NAME = 'trygghand_cookie_consent';
export const CONSENT_CHANGED_EVENT = 'trygghand:consent-changed';

export type ConsentPreferences = {
  statistics: boolean;
  marketing: boolean;
};

function readRawConsent(): string | null {
  const cookie = document.cookie.split('; ').find(row => row.startsWith(COOKIE_NAME + '='));
  if (!cookie) return null;
  return cookie.split('=')[1] ?? '';
}

// Format: "v2.s1.m0" (s = statistik, m = marknadsföring).
// Äldre värden "true"/"false" gällde bara statistik.
export function getConsentPreferences(): ConsentPreferences | null {
  const raw = readRawConsent();
  if (raw === null) return null;
  if (raw === 'true') return { statistics: true, marketing: false };
  if (raw === 'false') return { statistics: false, marketing: false };

  const match = /^v2\.s([01])\.m([01])$/.exec(raw);
  if (!match) return null;
  return { statistics: match[1] === '1', marketing: match[2] === '1' };
}

// Bannern visas om inget val finns, eller om besökaren godkände "alla"
// innan marknadsföringskategorin fanns (då har hen inte tagit ställning till den).
export function needsConsentPrompt(): boolean {
  const raw = readRawConsent();
  return raw === null || raw === 'true' || getConsentPreferences() === null;
}

// Behålls för bakåtkompatibilitet: true = statistik godkänd.
export function getCookieConsent(): boolean | null {
  const prefs = getConsentPreferences();
  return prefs ? prefs.statistics : null;
}

// Pushar direkt till dataLayer (GTM kräver ett arguments-objekt) så att
// samtycket når GTM även när window.gtag inte är satt.
function gtagConsent(..._args: unknown[]) {
  window.dataLayer = window.dataLayer || [];
  // eslint-disable-next-line prefer-rest-params
  window.dataLayer.push(arguments);
}

function updateGoogleConsent(prefs: ConsentPreferences) {
  const marketing = prefs.marketing ? 'granted' : 'denied';
  gtagConsent('consent', 'update', {
    analytics_storage: prefs.statistics ? 'granted' : 'denied',
    ad_storage: marketing,
    ad_user_data: marketing,
    ad_personalization: marketing,
  });
}

function notifyConsentChanged(prefs: ConsentPreferences | null) {
  window.dispatchEvent(new CustomEvent(CONSENT_CHANGED_EVENT, { detail: prefs }));
}

export function saveConsentPreferences(prefs: ConsentPreferences) {
  const d = new Date();
  d.setTime(d.getTime() + 365 * 24 * 60 * 60 * 1000);
  const value = `v2.s${prefs.statistics ? 1 : 0}.m${prefs.marketing ? 1 : 0}`;
  document.cookie = `${COOKIE_NAME}=${value};path=/;expires=${d.toUTCString()};SameSite=Lax`;
  updateGoogleConsent(prefs);
  notifyConsentChanged(prefs);
}

// Körs vid sidladdning för att återställa ett tidigare val.
export function applyStoredConsent() {
  const prefs = getConsentPreferences();
  if (prefs) updateGoogleConsent(prefs);
}

export function acceptAllCookies() {
  saveConsentPreferences({ statistics: true, marketing: true });
}

export function acceptOnlyNecessaryCookies() {
  saveConsentPreferences({ statistics: false, marketing: false });
}

export function clearCookieConsent() {
  document.cookie = `${COOKIE_NAME}=;path=/;max-age=0;SameSite=Lax`;
  updateGoogleConsent({ statistics: false, marketing: false });
  notifyConsentChanged(null);
}
