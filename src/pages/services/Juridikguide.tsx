import React from "react";
import { useNavigate } from "react-router-dom";

export default function Juridikguide() {
  const navigate = useNavigate();

  const scrollToContact = (e?: React.MouseEvent) => {
    e?.preventDefault();
    const el = document.getElementById("kontakt-form");
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  return (
    <main
      className="prose max-w-3xl mx-auto py-12 px-4"
      style={{ backgroundImage: "linear-gradient(180deg, rgba(250,250,250,0.6), transparent)" }}
    >
      <div className="mb-6">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-sm text-foreground/80 hover:underline"
          aria-label="Tillbaka"
        >
          ← Tillbaka
        </button>
      </div>

      <h1 className="text-2xl font-semibold">
        Din Juridiska Guide i Fickan – Digitala Juristen
      </h1>

      <p>
        Som kund har du tillgång till vår smarta chatbot som snabbt ger
        vägledning i vanliga juridiska frågor. Informationen grundar sig på
        aktuell svensk lagstiftning och betrodda källor.
      </p>

      <blockquote className="border-l-4 border-yellow-500 bg-yellow-50 p-3 mt-4 italic">
        Viktigt att veta: Chatboten ger en första vägledning och översikt, men
        ersätter inte juridisk rådgivning från en licensierad jurist eller
        advokat. För komplexa eller tidskritiska ärenden rekommenderar vi alltid
        personlig rådgivning.
      </blockquote>

      <p className="mt-4">
        Använd guiden för att få en initial bedömning, förbereda dig inför ett
        samtal med en rådgivare eller för att snabbt få faktauppgifter i enklare
        frågor.
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

 

      {/* Kontaktformulär direkt på sidan - mål för knappen ovan */}
      <div id="kontakt-form" className="mt-12 rounded-lg border bg-card text-card-foreground shadow-lg border-border/50">
        <div className="flex flex-col space-y-1.5 p-6">
          <h3 className="text-2xl font-semibold leading-none tracking-tight">Berätta om din situation</h3>
          <p className="text-sm text-foreground">Vi återkommer inom 24 timmar med en skräddarsydd lösning</p>
        </div>

        <div className="p-6 pt-0 space-y-4">
          <form className="space-y-4" /* you can wire up formRef/submit handler here */>
            <div className="grid md:grid-cols-2 gap-4">
              <input name="firstname" placeholder="Förnamn" required className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-base md:text-sm w-full" />
              <input name="lastname" placeholder="Efternamn" className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-base md:text-sm w-full" />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <input type="email" name="email" placeholder="E-postadress" className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-base md:text-sm w-full" />
              <input type="tel" name="phone" placeholder="Telefonnummer" required className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-base md:text-sm w-full" />
            </div>

            <div>
              <textarea name="message" placeholder="Beskriv kort din situation och vilken hjälp du behöver..." className="flex rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[120px] w-full" />
            </div>

            <button type="submit" className="inline-flex items-center justify-center gap-2 text-sm font-medium bg-gradient-to-r from-primary to-trust-blue-dark text-primary-foreground hover:bg-primary/90 h-11 rounded-md px-8 w-full">
              Skicka förfrågan
            </button>

            <p className="text-xs text-foreground text-center">
              Genom att skicka denna förfrågan godkänner du att vi kontaktar dig angående våra tjänster.
            </p>
          </form>
        </div>
      </div>
    </main>
  );
}
