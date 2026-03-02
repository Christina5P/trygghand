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
        title="Användarvillkor | Handplockat"
        description="Läs användarvillkoren för Handplockat."
        canonical="https://www.trygghand.com/handplockat-terms"
        robots="noindex, follow"
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
              Användarvillkor – Handplockat
            </CardTitle>
            <p className="text-center text-foreground/70 mt-2">
              En förmedlingstjänst driven av Trygg Hand
            </p>
          </CardHeader>
          <CardContent className="prose prose-lg max-w-none">
            <p>
              Dessa villkor beskriver vad Handplockat är, hur tjänsten fungerar och vilka regler som gäller.
              Villkoren är uppdelade i två delar: Del 1 gäller alla användare av plattformen.
              Del 2 gäller dig som säljare och väljer att använda Trygg Hands förmedlingstjänst som tillägg.
            </p>

            <h2 className="text-2xl font-semibold text-foreground mb-4">DEL 1 – PLATTFORMEN (gäller alla användare)</h2>

            <section className="mb-8">
              <h3 className="text-xl font-semibold text-foreground mb-4">1. Om Handplockat</h3>
              <p>
                Handplockat är en digital marknadsplats för förmedling av köp och försäljning mellan privatpersoner.
                Tjänsten drivs av Trygg Hand Sverige AB (“Trygg Hand”) i egenskap av plattformsoperatör.
              </p>
              <p>
                Trygg Hand är inte säljare av några varor på plattformen och är inte part i köpeavtalet mellan säljare och köpare.
                Vi tillhandahåller enbart en förmedlingstjänst.
              </p>
            </section>

            <section className="mb-8">
              <h3 className="text-xl font-semibold text-foreground mb-4">2. Vem kan använda Handplockat?</h3>
              <p>För att använda Handplockat krävs att du:</p>
              <ul className="list-disc pl-6 mb-4">
                <li>är myndig (18 år eller äldre)</li>
                <li>agerar som privatperson, inte som näringsidkare</li>
                <li>godkänner dessa användarvillkor i sin helhet</li>
              </ul>
            </section>

            <section className="mb-8">
              <h3 className="text-xl font-semibold text-foreground mb-4">3. Juridisk grund</h3>
              <p>
                Handel mellan privatpersoner på Handplockat regleras av svensk köplag (SFS 1990:931).
                Konsumentköplagen är inte tillämplig då ingen av parterna är näringsidkare.
              </p>
              <p>Det innebär att:</p>
              <ul className="list-disc pl-6 mb-4">
                <li>Köparen saknar lagstadgad ångerrätt</li>
                <li>Reklamationsmöjligheten är begränsad jämfört med konsumentköp</li>
                <li>Parterna ansvarar själva för att göra upp om villkoren för köpet</li>
              </ul>
            </section>

            <section className="mb-8">
              <h3 className="text-xl font-semibold text-foreground mb-4">4. Säljarens ansvar</h3>
              <p>Som säljare på Handplockat åtar du dig att:</p>
              <ul className="list-disc pl-6 mb-4">
                <li>Annonsera enbart varor du äger och har rätt att sälja</li>
                <li>Lämna korrekt och sanningsenlig beskrivning av varans skick, ålder och eventuella fel</li>
                <li>Meddela Handplockat om varan sålts via annan kanal så att annonsen kan tas bort</li>
                <li>Inte lista varor som är olagliga, stulna eller kräver särskilt tillstånd</li>
              </ul>
            </section>

            <section className="mb-8">
              <h3 className="text-xl font-semibold text-foreground mb-4">5. Förbjudet innehåll</h3>
              <p>Följande får inte annonseras på Handplockat:</p>
              <ul className="list-disc pl-6 mb-4">
                <li>Stulna varor eller ägodelar med oklart ursprung</li>
                <li>Varor som kräver särskilt tillstånd (t.ex. vapen, läkemedel, alkohol)</li>
                <li>Illegala varor eller tjänster</li>
                <li>Förfalskade eller kopierade produkter</li>
                <li>Levande djur</li>
              </ul>
              <p>
                Trygg Hand förbehåller sig rätten att ta bort annonser som bryter mot dessa regler utan föregående meddelande.
              </p>
            </section>

            <section className="mb-8">
              <h3 className="text-xl font-semibold text-foreground mb-4">6. Ansvarsbegränsning</h3>
              <p>Trygg Hand ansvarar inte för:</p>
              <ul className="list-disc pl-6 mb-4">
                <li>Skada som uppkommer till följd av köp eller försäljning på plattformen</li>
                <li>Felaktig eller vilseledande information i annons</li>
                <li>Utebliven leverans eller betalning mellan parterna</li>
                <li>Tekniska avbrott i tjänsten</li>
              </ul>
            </section>

            <section className="mb-8">
              <h3 className="text-xl font-semibold text-foreground mb-4">7. Personuppgifter (GDPR)</h3>
              <p>
                Trygg Hand behandlar personuppgifter i enlighet med GDPR och svensk dataskyddslagstiftning.
                Uppgifter samlas in för att möjliggöra förmedlingstjänsten och administration.
              </p>
              <p>
                Du har rätt att begära utdrag, rättelse eller radering av dina uppgifter via info@trygghand.se.
                Se fullständig integritetspolicy på vår webbplats.
              </p>
            </section>

            <h2 className="text-2xl font-semibold text-foreground mb-4">DEL 2 – TRYGG HAND FÖRMEDLING (tilläggstjänst för säljare)</h2>
            <p>
              Denna del gäller enbart säljare som aktivt valt att använda Trygg Hands förmedlingstjänst.
              Tjänsten är ett frivilligt tillägg och är fristående från själva köpeavtalet mellan säljare och köpare.
            </p>

            <section className="mb-8">
              <h3 className="text-xl font-semibold text-foreground mb-4">8. Vad ingår i förmedlingstjänsten?</h3>
              <p>Trygg Hand kan på uppdrag av säljaren erbjuda följande praktiska hjälp:</p>
              <ul className="list-disc pl-6 mb-4">
                <li>Fotografering av varor</li>
                <li>Skapande och publicering av annons på Handplockat</li>
                <li>Visning och kommunikation med intresserade köpare</li>
                <li>Överlämning av vara till köpare som ombud för säljaren</li>
                <li>Mottagande av betalning som ombud för säljaren</li>
              </ul>
            </section>

            <section className="mb-8">
              <h3 className="text-xl font-semibold text-foreground mb-4">9. Trygg Hands roll som ombud</h3>
              <p>
                När Trygg Hand hjälper till med överlämning eller betalning sker detta uteslutande i egenskap av ombud för säljaren.
                Det innebär att:
              </p>
              <ul className="list-disc pl-6 mb-4">
                <li>Köpeavtalet är och förblir ingånget mellan säljaren och köparen</li>
                <li>Trygg Hand är inte part i köpet och ansvarar inte för varans skick</li>
                <li>Betalning som mottas av Trygg Hand mottas för säljarens räkning</li>
                <li>Trygg Hand förbinder sig att redovisa mottagna medel till säljaren efter avdrag för arvode</li>
              </ul>
            </section>

            <section className="mb-8">
              <h3 className="text-xl font-semibold text-foreground mb-4">10. Arvode</h3>
              <p>
                För förmedlingstjänsten tar Trygg Hand ett arvode om 25% på försäljningspriset.
                Arvodet täcker arbete med fotografering, annonsering, visning, överlämning och administration.
              </p>
              <p>
                Arvodet dras av från köpeskillingen innan utbetalning till säljaren sker.
                Eventuella tilläggskostnader (t.ex. transport) redovisas separat och dras av innan utbetalning.
              </p>
            </section>

            <section className="mb-8">
              <h3 className="text-xl font-semibold text-foreground mb-4">11. Värdering</h3>
              <p>
                Trygg Hands bedömning av ett föremåls värde är en uppskattning baserad på erfarenhet och aktuellt marknadsvärde.
                Värderingen är ingen garanti för vilket pris varan faktiskt säljs för – marknaden avgör det slutliga priset.
              </p>
            </section>

            <section className="mb-8">
              <h3 className="text-xl font-semibold text-foreground mb-4">12. Transparens och redovisning</h3>
              <p>
                Säljaren har rätt att få information och kvitto som visar vad som sålts och till vilket pris.
                Trygg Hand åtar sig att redovisa försäljning på ett öppet och spårbart sätt.
              </p>
            </section>

            <section className="mb-8">
              <h3 className="text-xl font-semibold text-foreground mb-4">13. Utbetalning</h3>
              <p>
                Resterande belopp efter avdrag för arvode och eventuella kostnader betalas ut till säljaren enligt överenskommelse.
                Utbetalningssätt och tidsram fastställs i samband med att uppdraget ingås.
              </p>
            </section>

            <section className="mb-8">
              <h3 className="text-xl font-semibold text-foreground mb-4">14. Ändringar av villkor</h3>
              <p>
                Trygg Hand förbehåller sig rätten att ändra dessa villkor.
                Vid väsentliga ändringar meddelas registrerade användare via e-post eller via meddelande på plattformen.
              </p>
            </section>

            <section className="mb-8">
              <h3 className="text-xl font-semibold text-foreground mb-4">15. Tillämplig lag och tvist</h3>
              <p>
                Dessa villkor regleras av svensk rätt. Tvist ska i första hand lösas genom förhandling,
                i andra hand i allmän domstol med Sundsvalls tingsrätt som första instans.
              </p>
            </section>

            <section className="mb-8">
              <h3 className="text-xl font-semibold text-foreground mb-4">16. Kontakt</h3>
              <p>
                Trygg Hand AB
                <br />
                E-post: kontakt@trygghand.com
                <br />
                Webbplats: www.trygghand.com
              </p>
            </section>

            <p className="text-center text-foreground/70 italic mt-6">
              Dessa villkor gäller från och med det datum du som användare godkänner dem vid registrering eller annonsering på Handplockat.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default HandplockatTerms;