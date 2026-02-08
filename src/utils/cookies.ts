export const COOKIE_NAME = 'trygghand_cookie_consent';

export function getCookieConsent(): boolean | null {
  const cookie = document.cookie.split('; ').find(row => row.startsWith(COOKIE_NAME + '='));
  if (!cookie) return null;
  const value = cookie.split('=')[1];
  return value === 'true';
}

export function setCookieConsent(accepted: boolean) {
  const d = new Date();
  d.setTime(d.getTime() + 365 * 24 * 60 * 60 * 1000);
  document.cookie = `${COOKIE_NAME}=${accepted};path=/;expires=${d.toUTCString()};SameSite=Lax`;
}

export function acceptStatisticsCookies() {
  setCookieConsent(true);
  if ((window as any).gtag) {
    (window as any).gtag('consent', 'update', {
      analytics_storage: 'granted',
      ad_storage: 'denied'
    });
  }
}

export function declineStatisticsCookies() {
  setCookieConsent(false);
  // Consent remains denied
}

export function clearCookieConsent() {
  document.cookie = `${COOKIE_NAME}=;path=/;max-age=0;SameSite=Lax`;
  if ((window as any).gtag) {
    (window as any).gtag('consent', 'update', {
      analytics_storage: 'denied',
      ad_storage: 'denied'
    });
  }
}