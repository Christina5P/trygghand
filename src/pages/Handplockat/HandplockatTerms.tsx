import React, { useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import Seo from "@/components/Seo";

const HandplockatTerms: React.FC = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-soft-gray py-12 px-4 sm:px-6 lg:px-8">
      <Seo
        title="Användarvillkor & Leveranspolicy | Handplockat"
        description="Läs användarvillkoren för Handplockat – kuraterad second hand-försäljning i Sundsvall, förmedlad av Trygg Hand Sverige AB."
        canonical="https://www.trygghand.com/handplockat-terms"
        robots="index, follow"
      />

      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Button variant="ghost" asChild className="mb-4">
            <Link to="/handplockat" className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Tillbaka till Handplockat
            </Link>
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-3xl font-bold text-center text-foreground">
              Användarvillkor & Leveranspolicy
            </CardTitle>
            <p className="text-center text-foreground/70 mt-2">
              Handplockat – En tjänst av Trygg Hand Sverige AB
            </p>
            <p>Trygg Hand agerar som förmedlare och hanterar kontakt, bokning och överlämning, men är inte säljare av varorna.</p>
            <p className="text-center text-xs text-foreground/50 mt-1">
              Senast uppdaterad: 1 april 2026
            </p>
          </CardHeader>

          <CardContent className="prose prose-lg max-w-none">

            {/* Så här fungerar ett köp */}
            <section className="mb-6 p-6 bg-blue-50 border border-blue-100 rounded-lg not-prose">
              <h2 className="text-xl font-semibold text-blue-900 mb-3">
                Så här fungerar ett köp
              </h2>
              <p className="text-blue-800 text-sm mb-4">
                När du klickar på "Köp" skickar du en förfrågan. Ingen betalning sker direkt via webbplatsen.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white rounded-md p-3 border border-blue-100">
                  <p className="text-sm font-semibold text-blue-900 mb-1">1. Bekräftelse</p>
                  <p className="text-xs text-blue-700">Vi bekräftar att varan finns kvar</p>
                </div>
                <div className="bg-white rounded-md p-3 border border-blue-100">
                  <p className="text-sm font-semibold text-blue-900 mb-1">2. Kontakt</p>
                  <p className="text-xs text-blue-700">Du nås via SMS eller e-post av Trygg Hand</p>
                </div>
                <div className="bg-white rounded-md p-3 border border-blue-100">
                  <p className="text-sm font-semibold text-blue-900 mb-1">3. Betalning</p>
                  <p className="text-xs text-blue-700">Swish efter överenskommelse med Trygg Hand</p>
                </div>
                <div className="bg-white rounded-md p-3 border border-blue-100">
                  <p className="text-sm font-semibold text-blue-900 mb-1">4. Upphämtning</p>
                  <p className="text-xs text-blue-700">Vanligtvis inom 24–48 timmar efter bekräftelse</p>
                </div>
              </div>
            </section>

            {/* Frakt- och hämtningsvillkor */}
            <section className="mb-8 p-6 bg-blue-50 border border-blue-100 rounded-lg not-prose">
              <h2 className="text-xl font-semibold text-blue-900 mb-3">
                Frakt- och hämtningsvillkor
              </h2>
              <table className="w-full text-sm">
                <tbody>
                  <tr className="border-b border-blue-100">
                    <td className="py-2 text-blue-700 w-2/5">Fraktkostnad</td>
                    <td className="py-2 font-medium text-blue-900">0 kr – endast lokal hämtning</td>
                  </tr>
                  <tr className="border-b border-blue-100">
                    <td className="py-2 text-blue-700">Leveranstid</td>
                    <td className="py-2 font-medium text-blue-900">Enligt överenskommelse</td>
                  </tr>
                  <tr className="border-b border-blue-100">
                    <td className="py-2 text-blue-700">Hämtningsplats</td>
                    <td className="py-2 font-medium text-blue-900">Sundsvall</td>
                  </tr>
                  <tr className="border-b border-blue-100">
                    <td className="py-2 text-blue-700">Varornas skick</td>
                    <td className="py-2 font-medium text-blue-900">Begagnade, säljs i befintligt skick</td>
                  </tr>
                  <tr>
                    <td className="py-2 text-blue-700">Ingen ångerrätt</td>
                    <td className="py-2 font-medium text-blue-900">Privatköp regleras av köplagen</td>
                  </tr>
                </tbody>
              </table>
            </section>

            {/* Villkor */}
            <h2 className="text-2xl font-semibold text-foreground mb-4">Villkor</h2>

            <section className="mb-6">
              <h3 className="text-lg font-semibold text-foreground mb-2">1. Om Handplockat</h3>
              <p>
                Handplockat är en tjänst som drivs av Trygg Hand Sverige AB. Trygg Hand hjälper
                till att förmedla försäljning av föremål i samband med bl.a. flytt.
                Trygg Hand hanterar hela processen – från annonsering till överlämning – som
                förmedlare åt uppdragsgivaren.
              </p>
            </section>

            <section className="mb-6">
              <h3 className="text-lg font-semibold text-foreground mb-2">2. Köpet</h3>
              <p>
                Köpet sker mellan köparen och uppdragsgivaren. Trygg Hand ansvarar inte för
                varans skick utan agerar som förmedlare. Trygg Hand är din kontaktpunkt genom
                hela processen.
              </p>
            </section>

            <section className="mb-6">
              <h3 className="text-lg font-semibold text-foreground mb-2">3. Juridisk grund</h3>
              <p>
                Handel regleras av köplagen (SFS 1990:931). Konsumentköplagen är inte tillämplig.
                Köparen saknar lagstadgad ångerrätt och reklamationsmöjligheten är begränsad
                jämfört med konsumentköp.
              </p>
            </section>

            <section className="mb-6">
              <h3 className="text-lg font-semibold text-foreground mb-2">4. Vem kan använda tjänsten?</h3>
              <p>
                Tjänsten riktar sig till privatpersoner som är minst 18 år och godkänner dessa villkor.
              </p>
            </section>

            <section className="mb-6">
              <h3 className="text-lg font-semibold text-foreground mb-2">5. Förbjudet innehåll</h3>
              <p>
                Stulna varor, vapen, läkemedel, alkohol, illegala produkter, förfalskningar och
                levande djur förmedlas inte. Trygg Hand förbehåller sig rätten att avvisa uppdrag
                utan förvarning.
              </p>
            </section>

            <section className="mb-6">
              <h3 className="text-lg font-semibold text-foreground mb-2">6. Ansvarsbegränsning</h3>
              <p>
                Trygg Hand ansvarar inte för varans skick, felaktig information från
                uppdragsgivaren, utebliven affär eller tekniska avbrott.
              </p>
            </section>

            <section className="mb-6">
              <h3 className="text-lg font-semibold text-foreground mb-2">7. Personuppgifter (GDPR)</h3>
              <p>
                Personuppgifter behandlas enligt GDPR. Du kan begära utdrag, rättelse eller
                radering via kontakt@trygghand.com.
              </p>
            </section>

            <section className="mb-6">
              <h3 className="text-lg font-semibold text-foreground mb-2">8. Förmedlingstjänsten</h3>
              <p>
                Trygg Hand erbjuder uppdragsgivaren hjälp med fotografering, annonsering,
                kontakt med köpare, överlämning och betalningshantering – allt i egenskap av ombud.
              </p>
            </section>

            <section className="mb-6">
              <h3 className="text-lg font-semibold text-foreground mb-2">9. Arvode</h3>
              <p>
                Trygg Hand tar 25% av nettopriset (försäljningspriset efter eventuella rabatter).
                Arvodet dras av innan utbetalning till uppdragsgivaren sker.
              </p>
            </section>

            <section className="mb-6">
              <h3 className="text-lg font-semibold text-foreground mb-2">10. Värdering & utbetalning</h3>
              <p>
                Värdering är en uppskattning – inget garanterat pris. Uppdragsgivaren har rätt
                till full redovisning av vad som sålts och till vilket pris. Utbetalning sker
                efter avdrag enligt överenskommelse.
              </p>
            </section>

            <section className="mb-8">
              <h3 className="text-lg font-semibold text-foreground mb-2">11. Lag, tvist & ändringar</h3>
              <p>
                Villkoren regleras av svensk rätt. Tvist avgörs i Sundsvalls tingsrätt.
                Trygg Hand kan uppdatera villkoren vid behov.
              </p>
            </section>

            <section className="border-t pt-6">
              <h3 className="text-lg font-semibold text-foreground mb-2">Kontakt</h3>
              <p>
                Trygg Hand Sverige AB<br />
                kontakt@trygghand.com<br />
                www.trygghand.com
              </p>
            </section>

          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default HandplockatTerms;