import React from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";

const SeniorforandringSundsvall: React.FC = () => {
  return (
    <>
      <Helmet>
        <title>Seniorförändring i Sundsvall – äldreflytt med helhetsstöd | Trygg Hand</title>
        <meta
          name="description"
          content="Trygg seniorförändring i Sundsvall med Trygg Hand. Helhetskoordinator vid äldreflytt: planering, sortering, flyttsamordning, städ och anhörigstöd – steg för steg." 
        />
        <link rel="canonical" href="https://trygghand.se/seniorforandring-sundsvall" />
      </Helmet>

      <div className="container mx-auto px-4 py-8">
        <div className="mb-4">
          <Link to="/" className="text-primary underline">
            ← Tillbaka till startsidan
          </Link>
        </div>
        <h1 className="text-4xl font-bold mb-6">Seniorförändring i Sundsvall</h1>

        <section className="mb-8">
          <p className="text-lg mb-4">
            En seniorförändring kan väcka många känslor – både lättnad och oro. I Sundsvall hjälper Trygg Hand dig som senior och er som anhöriga med en trygg, respektfull och stegvis äldreflytt.
            Som helhetskoordinator samordnar jag helheten, så att flytten till ett mindre boende, trygghetsboende eller särskilt boende blir så lugn och tydlig som möjligt.
          </p>
          <p className="mb-4">
            Det kan handla om att sortera ett helt hem, göra val kring bohag, planera logistik och få ett hem redo att lämnas över. Du får praktisk hjälp, tydlig kommunikation och anhörigstöd – utan att det blir rörigt eller stressande.
          </p>
          <p className="mb-4">
            Behöver du istället hjälp med dödsbohantering i Sundsvall? Läs mer om vår 
            {" "}
            <Link to="/dodsbohantering-sundsvall" className="text-primary underline">
              dödsbohantering i Sundsvall
            </Link>
            .
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Vad ingår i vår seniorförändring?</h2>
          <p className="mb-4">
            När du väljer Trygg Hand för seniorförändring i Sundsvall får du helhetsstöd – från första samtalet till att bostaden är överlämnad. Vi börjar med en lugn genomgång av behov, tidplan och förutsättningar.
            Därefter tar vi fram en plan som passar dig.
          </p>

          <h3 className="text-xl font-medium mb-2">Planering och rådgivning</h3>
          <p className="mb-4">
            Vi går igenom vad som ska göras, i vilken ordning och vilka beslut som behöver tas. Du får stöd i prioriteringar, tidsplan och praktiska detaljer, så att flytten blir hanterbar steg för steg.
          </p>

          <h3 className="text-xl font-medium mb-2">Sortering och urval av bohag</h3>
          <p className="mb-4">
            Att välja vad som ska följa med till ett mindre boende kan vara svårt. Jag hjälper till att sortera, packa och göra urval på ett respektfullt sätt – med fokus på trygghet, tydlighet och att viktiga saker tas om hand.
          </p>

          <h3 className="text-xl font-medium mb-2">Flyttsamordning</h3>
          <p className="mb-4">
            Jag samordnar flytten med rätt insatser vid rätt tidpunkt. Det kan inkludera koordinering av transport, nycklar, tillträde och praktiska moment i både den gamla och nya bostaden.
          </p>

          <h3 className="text-xl font-medium mb-2">Städ och överlämning</h3>
          <p className="mb-4">
            När bohaget är sorterat och flytten är genomförd hjälper jag till med städ och förberedelser inför överlämning. Målet är att bostaden lämnas i ett fint och tryggt skick – utan att du behöver hålla ihop alla trådar själv.
          </p>

          <h3 className="text-xl font-medium mb-2">Administration och kontakt med anhöriga</h3>
          <p className="mb-4">
            Vid en äldreflytt uppstår ofta administration och många frågor. Jag hjälper till att hålla struktur i kommunikationen och kan vara en trygg kontaktpunkt för anhöriga, så att alla vet vad som händer och när.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Varför välja Trygg Hand i Sundsvall?</h2>
          <p className="mb-4">
            Som lokal helhetskoordinator i Sundsvall är målet att skapa lugn, tydlighet och trygghet i en förändring som annars lätt blir övermäktig.
          </p>
          <ul className="list-disc list-inside mb-4">
            <li>Lokal närvaro och förståelse för Sundsvall</li>
            <li>Helhetskoordinator som samordnar hela flytten</li>
            <li>Anhörigstöd och trygg kommunikation genom hela processen</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Hur fungerar processen?</h2>
          <p className="mb-4">
            Vi börjar med ett första samtal där vi går igenom situation, boendeform och önskemål. Därefter följer sortering, planering, flytt och överlämning i en ordning som känns trygg.
          </p>
          <h3 className="text-xl font-medium mb-2">Steg för steg</h3>
          <ol className="list-decimal list-inside mb-4">
            <li>Kontakt och konsultation</li>
            <li>Planering och tidplan</li>
            <li>Sortering och urval av bohag</li>
            <li>Flyttsamordning</li>
            <li>Städ och överlämning</li>
          </ol>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Anhörigstöd och trygg kommunikation</h2>
          <p className="mb-4">
            En äldreflytt berör ofta hela familjen. Du får tydlig kommunikation och ett lugnt upplägg där anhöriga kan känna sig trygga med att processen går framåt, utan missförstånd eller onödig stress.
          </p>
          <p className="mb-4">
            Jag anpassar insatsen efter behov.</p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Priser och kostnader</h2>
          <p className="mb-4">
           Vi har transparenta priser i olika servicepaket. Vi erbjuder även en gratis konsultation för att ge en exakt offert efter speciella behov. </p>
        </section>

        <section className="text-center">
          <h2 className="text-2xl font-semibold mb-4">Kontakta oss för seniorförändring i Sundsvall</h2>
          <p className="mb-4">
            Behöver du stöd vid äldreflytt i Sundsvall? Kontakta Trygg Hand för en kostnadsfri konsultation. Du får en trygg plan, helhetsstöd och tydliga nästa steg.
          </p>
          <Link to="/#contact" className="bg-blue-500 text-white px-6 py-2 rounded hover:bg-blue-600">
            Kontakta oss nu
          </Link>
        </section>
      </div>
    </>
  );
};

export default SeniorforandringSundsvall;
