import React, { useEffect, useState } from "react";

export default function ClearCookies() {
  const [done, setDone] = useState(false);

  useEffect(() => {
    // Ta bort vår consent-cookie
    document.cookie = "trygghand_cookie_consent=; path=/; max-age=0; SameSite=Lax";
    // Ta bort andra cookies du kontrollerar lokalt om nödvändigt:
    // document.cookie = "other_cookie_name=; path=/; max-age=0; SameSite=Lax";
    setDone(true);
  }, []);

  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold mb-4">Rensa cookies</h1>
      {done ? (
        <p className="text-base">Din cookie har tagits bort i denna webbläsare. Be användaren ladda om sidan.</p>
      ) : (
        <p className="text-base">Rensar…</p>
      )}
    </div>
  );
}