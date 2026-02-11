import React, { useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import Seo from "@/components/Seo";

const Terms: React.FC = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);
  return (
    <div className="min-h-screen bg-soft-gray py-12 px-4 sm:px-6 lg:px-8">
      <Seo
        title="Allmänna Villkor | Trygg Hand"
        description="Läs våra allmänna villkor för tjänster inom dödsbohantering och äldreflytt."
        canonical="https://www.trygghand.com/terms"
        robots="noindex, follow"
      />
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Button variant="ghost" asChild className="mb-4">
            <Link to="/" className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Tillbaka till startsidan
            </Link>
          </Button>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl font-bold text-center text-foreground">
              Allmänna Villkor – Trygg Hand AB
            </CardTitle>
            <p className="text-center text-foreground/70 mt-2">
              Gäller från och med 2026-01-01
            </p>
          </CardHeader>
          <CardContent className="prose prose-lg max-w-none">
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-foreground mb-4">1. Parter och tillämpning</h2>
              <p>
                <strong>Trygg Hand AB</strong> (organisationsnummer 559564-3445) utför flytt-, städ-, packnings-, transport- och relaterade
                tjänster genom egna anställda och godkända underleverantörer till dig som beställer våra tjänster ("Kunden"). 
                <br />Vid dödsbo avses dödsbodelägarna eller den som företräder dem med fullmakt.
                {" "}Bolaget innehar F-skatt och momsregistrering.
                Vi tillämpar Konsumenttjänstlagen och GDPR.
                Dessa villkor gäller för alla uppdrag som Trygg Hand utför, såvida inte annat avtalats skriftligt.
              </p>
              <p>      
                  <br /><p>Den exakta omfattningen av ditt uppdrag framgår av din <strong>uppdragsbekräftelse</strong>, som alltid har företräde framför dessa allmänna villkor.</p>
              <p>Vi förbehåller oss rätten att uppdatera och ändra dessa villkor. Ändringarna träder i kraft omedelbart efter att de har publicerats på webbplatsen.</p>
              <p>Vi förbehåller oss rätten att avsäga oss en städning ifall vi anser att lägenheten är onormalt nedsmutsad. I sådana fall erbjuder vi möjligheten till timdebitering eller ett nytt fast pris baserat på lägenhetens befintliga skick.</p>
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-foreground mb-4">2. Våra tjänster</h2>
              <p>Trygg Hand erbjuder helhetskoordinering vid äldreflytt och dödsbohantering. Det kan innefatta:</p>
              <ul className="list-disc pl-6 mb-4">
                <li>Planering och samordning av flytt, tömning och städning</li>
                <li>Sortering och värdering av bohag</li>
                <li>Försäljning eller donation av tillgångar</li>
                <li>Administrativa kontakter med myndigheter och företag</li>
                <li>Digital uppföljning och dokumentation</li>
              </ul>
              <p className="font-semibold">Vad vi INTE gör:</p>
              <ul className="list-disc pl-6 mb-4">
                <li>Juridisk, ekonomisk eller medicinsk rådgivning</li>
                <li>Myndighetsutövning eller beslut</li>
              </ul>
             
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-foreground mb-4">3. Innan vi börjar</h2>
              <p className="font-semibold mb-2">Fullmakter:</p>
              <p className="mb-4">För att vi ska kunna utföra vissa arbeten åt dig, såsom hantering av dödsbo eller andras bostäder, behöver du ge oss skriftliga fullmakter som visar att du har rätt att agera. För andra typer av uppdrag kan detta inte vara nödvändigt.</p>

              <p className="font-semibold mb-2">Korrekta uppgifter:</p>
              <p className="mb-4">Du ansvarar för att informationen du ger oss är korrekt, särskilt om ägarförhållanden, skulder och tillgångar.</p>

              <p className="font-semibold mb-2">Nycklar och tillträde:</p>
              <p>När du ger oss nycklar eller koder till bostaden bekräftar du att du har rätt att ge oss tillträde. Vi hanterar nycklar säkert och återlämnar dem när uppdraget är klart.</p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-foreground mb-4">4. Underleverantörer</h2>
              <p>
                Vi använder underleverantörer (flyttfirmor, städföretag m.fl.) för vissa delar av uppdraget. Du betalar oss för hela tjänsten och vi ansvarar för att samordna och betala underleverantörerna. Vi ansvarar för deras arbete gentemot dig.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-foreground mb-4">5. Försäljning av bohag</h2>
              <p className="font-semibold mb-2">Så går det till:</p>
              <ul className="list-disc pl-6 mb-4">
                <li>Trygg Hand kan ta hand om försäljning (via auktion, andrahandsbutiker, privatköpare etc.)</li>
                <li>Vi tar emot betalning från köpare</li>
                <li>Vi drar av vårt arvode och eventuella kostnader</li>
                <li>Resterande belopp betalas ut till dig enligt överenskommelse</li>
              </ul>

              <p className="font-semibold mb-2">Vårt arvode:</p>
              <p className="mb-4">Vi tar 25% arvode på försäljningspriset för att täcka vårt arbete med värdering, fotografering, annonsering, visning och försäljning.</p>

              <p className="font-semibold mb-2">Värdering är ingen garanti:</p>
              <p className="mb-4">Våra bedömningar av värde är uppskattningar baserade på erfarenhet. Vi garanterar inte vad saker faktiskt säljs för – marknaden avgör priset.</p>

              <p className="font-semibold mb-2">Transparens:</p>
              <p>Du får information och kvitton som visar vad som sålts och för vilket pris.</p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-foreground mb-4">6. Pris och betalning</h2>
              <p className="font-semibold mb-2">Prissättning:</p>
              <p className="mb-4">Priset framgår av din uppdragsbekräftelse (fast pris, timpris eller kombination). Alla priser inkluderar moms.<br /><br /> I uppdraget ingår resor upp till 2 mil enkel väg från Trygg Hands verksamhetsort samt upp till tre (3) arbetsbesök per uppdrag, om inget annat avtalats.
              <br />
              Vid behov av ytterligare arbetsbesök utöver detta debiteras en kostnad om 395 kr inklusive moms per extra resa.
              Antalet resor planeras i dialog med kunden i syfte att genomföra uppdraget på ett effektivt och omsorgsfullt sätt.</p>

              <p className="font-semibold mb-2">Delbetalning:</p>
              <p className="mb-4">
              40 % av det avtalade priset faktureras vid uppdragets påbörjande. 
              Resterande 60 % faktureras efter slutfört uppdrag, om inget annat avtalats skriftligt.
              </p>
              <p className="font-semibold mb-2">RUT-avdrag:</p>
              <p className="mb-4">
                Om RUT-avdrag har avtalats och Skatteverket helt eller delvis nekar avdraget, debiteras kunden det nekade beloppet.
              </p>

              <p className="font-semibold mb-2">Betalningsvillkor:</p>
              <p className="mb-4">Betalning ska ske inom <strong>10 dagar</strong> från fakturadatum. Vid försenad betalning tillkommer dröjsmålsränta enligt räntelagen.</p>

              <p className="font-semibold mb-2">Påbörjat arbete:</p>
              <p>Arbete som redan utförts faktureras alltid, även om uppdraget avbryts.</p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-foreground mb-4">7. Avbokning och ändringar</h2>
              <p className="font-semibold mb-2">Avbokning:</p>
              <p className="mb-4">Meddela alltid avbokning skriftligt (mejl räcker). Om du avbokar senare än 48 timmar innan planerad insats har vi rätt att debitera upp till 50% av den planerade kostnaden. Redan utfört arbete debiteras alltid fullt ut.</p>

              <p className="font-semibold mb-2">Ångerrätt (konsument):</p>
              <p>Som privatperson har du 14 dagars ångerrätt, om inte tjänsten påbörjats efter ditt godkännande.</p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-foreground mb-4">8. Ansvar och försäkring</h2>
              <p className="font-semibold mb-2">Vårt ansvar:</p>
              <p className="mb-4">Vi arbetar professionellt och omsorgfullt. Om vi gör fel som orsakar dig skada ansvarar vi för det.</p>

              <p className="font-semibold mb-2">Försäkring:</p>
              <p className="mb-4">Trygg Hand har en ansvarsförsäkring som täcker skador på egendom som vi eller våra underleverantörer orsakar under uppdraget (vid flytt, städning, hantering av bohag).</p>

              <p className="font-semibold mb-2">Kundpackade lådor:</p>
              <p className="mb-4">
                Kundpackade lådor hanteras på kundens egen risk. Detta gäller särskilt (men inte begränsat till) innehåll som glas, porslin,
                elektronik, tavlor och antikviteter.
              </p>

              <p className="font-semibold mb-2">Antika föremål och arv:</p>
              <p className="mb-4">
                Ersättning för antika föremål och arv utgår endast om kunden har lämnat värdeintyg i förväg. Affektionsvärde ersätts aldrig.
              </p>

              <p className="font-semibold mb-2">Skadeanmälan:</p>
              <p className="mb-4">
                Upptäcker du en skada måste du anmäla den skriftligt till oss inom 7 dagar. Skadeanmälan ska innehålla bilder på skadan,
                objektet och emballaget samt eventuellt värdeintyg.
              </p>

              <p className="font-semibold mb-2">Ansvarsbegränsning:</p>
              <p className="mb-4">Vi ansvarar för skador som uppstår till följd av fel eller försummelse i samband med utförandet av uppdraget.
                                  Vårt sammanlagda ansvar är begränsat till fem (5) gånger uppdragspriset, dock högst det belopp som täcks av vår ansvarsförsäkring.
                                  Föremål med särskilt högt ekonomiskt eller affektionsvärde ska i förväg identifieras och hanteras separat enligt överenskommelse.
                                  Ansvarsbegränsningen gäller inte vid uppsåt eller grov vårdslöshet.</p>

              <p className="font-semibold mb-2">Din hemförsäkring:</p>
              <p>Egendom i bostaden omfattas normalt av din/dödsboets hemförsäkring tills vi faktiskt tagit över hanteringen.</p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-foreground mb-4">9. Personuppgifter (GDPR)</h2>
              <p>
                Vi behandlar dina personuppgifter enligt dataskyddsförordningen (GDPR), endast för att kunna utföra uppdraget. Vi delar inte dina uppgifter med andra utan laglig grund eller ditt samtycke. Mer information finns i vår integritetspolicy på vår hemsida.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-foreground mb-4">10. Uppsägning</h2>
              <p>
                Båda parter kan avsluta uppdraget i förtid vid allvarligt avtalsbrott (t.ex. utebliven betalning eller om du inte kan ge oss nödvändiga fullmakter). Redan utfört arbete debiteras.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-foreground mb-4">11. Om vi inte kommer överens</h2>
              <p className="font-semibold mb-2">Lag:</p>
              <p className="mb-4">Svensk lag gäller.</p>

             
              <p className="mb-4">
Om du är privatperson och vi hamnar i tvist kan du alltid vända 
dig till Allmänna Reklamationsnämnden (ARN) – vi följer deras 
rekommendationer. 

För företagskunder avgörs eventuella tvister av Sundsvalls tingsrätt.</p>
      </section>

            <div className="border-t pt-8 mt-8">
              <p className="text-center text-foreground/70 italic">
                *Har du frågor om villkoren? Kontakta oss på kontakt@trygghand.com eller 076-116 95 54*
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Terms;