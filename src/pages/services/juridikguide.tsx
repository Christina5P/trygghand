import React from "react";

export default function juridikguide() {
  return (
    <main className="prose max-w-3xl mx-auto py-12 px-4">
      <h1 className="text-2xl font-semibold">Din Juridiska Guide i Fickan!</h1>

      <p>
        Som kund har du tillgång till vår smarta guide som snabbt ger tydliga
        svar på vanliga juridiska frågor. Guiden ger en första bedömning,
        pekar på relevanta lagrum och visar nästa steg.
      </p>

      <h2 className="text-lg font-medium mt-4">Vad du kan förvänta dig</h2>
      <ul>
        <li>Snabb, begriplig vägledning på vanligt språk.</li>
        <li>Referenser till relevanta lagar och källor vid behov.</li>
        <li>Tips om när du bör boka rådgivning med en jurist.</li>
      </ul>

      <h2 className="text-lg font-medium mt-4">Ansvarsbegränsning</h2>
      <p>
        Observera att guiden inte ersätter juridisk rådgivning från en
        licensierad jurist. För komplexa eller tidkänsliga ärenden rekommenderar
        vi alltid personlig rådgivning.
      </p>

      <div className="mt-6">
        <a
          href="/kontakt"
          className="inline-block rounded bg-trust-blue text-white px-4 py-2 text-sm hover:opacity-90"
        >
          Kontakta rådgivning
        </a>
      </div>
    </main>
  );
}
