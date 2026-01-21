import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';

const DodsbohanteringSundsvall: React.FC = () => {
  return (
    <>
      <Helmet>
        <title>Dödsbohantering i Sundsvall – helhetskoordinator | Trygg Hand</title>
        <meta name="description" content="Få professionell dödsbohantering i Sundsvall med Trygg Hand. Vi hjälper anhöriga med tömning, städ och samordning av dödsbo för en smidig process." />
        <link rel="canonical" href="https://trygghand.se/dodsbohantering-sundsvall" />
      </Helmet>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-4">
          <Link to="/" className="text-primary underline">
            ← Tillbaka till startsidan
          </Link>
        </div>
        <h1 className="text-4xl font-bold mb-6">Dödsbohantering i Sundsvall</h1>
        
        <section className="mb-8">
          <p className="text-lg mb-4">
            Att hantera ett dödsbo kan vara en överväldigande uppgift, särskilt när sorgen är så nära. I Sundsvall erbjuder Trygg Hand som lokalt verksam helhetskoordinator professionell hjälp med dödsbohantering. Vi tar hand om allt från början till slut, så att du som anhörig kan fokusera på att sörja och minnas.
          </p>
          <p className="mb-4">
            Vår tjänst omfattar samordning av dödsbo, inklusive tömning av bohag, dödsbostäd och försäljning av värdefulla föremål. Vi arbetar nära dig för att säkerställa att processen blir så enkel och respektfull som möjligt.
          </p>
          <p className="mb-4">
            Behöver du istället stöd vid en äldreflytt? Läs mer om vår{" "}
            <Link to="/seniorforandring-sundsvall" className="text-primary underline">
              seniorförändring i Sundsvall
            </Link>
            .
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Vad ingår i vår dödsbohantering?</h2>
          <p className="mb-4">
            När du väljer Trygg Hand för hjälp med dödsbo i Sundsvall kan du få en komplett lösning. Vi börjar med en initial konsultation där vi går igenom fastigheten och inventarierna. Därefter planerar vi en strategi som passar dina behov.
          </p>
          <h3 className="text-xl font-medium mb-2">Tömning av bohag</h3>
          <p className="mb-4">
            Vi erbjuder noggrann tömning av bohag i Sundsvall med omnejd. Vi hanterar allt från möbler till personliga tillhörigheter med största omsorg. Vi sorterar, packar och transporterar bort det som inte ska behållas.
          </p>
          <h3 className="text-xl font-medium mb-2">Dödsbostäd</h3>
          <p className="mb-4">
            Efter tömningen utför vi en grundlig dödsbostäd för att lämna fastigheten i ett rent och presentabelt skick. Detta inkluderar rengöring av alla ytor, golv och fönster.
          </p>
          <h3 className="text-xl font-medium mb-2">Samordning och administration</h3>
          <p className="mb-4">
            Vi hjälper till med all nödvändig administration, som kontakt med myndigheter och försäljning av egendom. Vårt mål är att göra processen så smidig som möjligt för dig.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Varför välja Trygg Hand för dödsbohantering i Sundsvall?</h2>
          <p className="mb-4">
            Som lokal aktör i Sundsvall förstår vi de unika utmaningarna i regionen.
          </p>
          <ul className="list-disc list-inside mb-4">
            <li>Lokal närvaro och kunskap om Sundsvall</li>
            <li>Komplett service från start till mål</li>
            <li>Respektfull hantering av personliga tillhörigheter</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Hur fungerar processen?</h2>
          <p className="mb-4">
            Vi börjar alltid med ett möte där vi diskuterar dina önskemål.Efter det följer tömning, städning och eventuell försäljning.
          </p>
          <h3 className="text-xl font-medium mb-2">Steg för steg</h3>
          <ol className="list-decimal list-inside mb-4">
            <li>Kontakt och konsultation</li>
            <li>Värdering och planering</li>
            <li>Tömning av bohag</li>
            <li>Städning</li>
            <li>Avslutande administration</li>
          </ol>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Anhörigstöd och känslomässig hjälp</h2>
          <p className="mb-4">
            Vi erbjuder praktisk hjälp OCH rådgivning. 
          </p>
          <p className="mb-4">
           Vi förstår att varje dödsbo är unikt och anpassar vår service därefter. Vi är lokalt förankrade i Sundsvall med omnejd.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Priser och kostnader</h2>
          <p className="mb-4">
            Vi har transparenta priser i olika servicepaket. Vi erbjuder även en gratis konsultation för att ge en exakt offert efter speciella behov.
          </p>
          
        </section>

        <section className="text-center">
          <h2 className="text-2xl font-semibold mb-4">Kontakta oss för dödsbohantering i Sundsvall</h2>
          <p className="mb-4">
            Är du i behov av hjälp med dödsbo i Sundsvall? Kontakta Trygg Hand idag för en kostnadsfri konsultation. Vi är här för att underlätta för dig och din familj.
          </p>
          <Link to="/#contact" className="bg-blue-500 text-white px-6 py-2 rounded hover:bg-blue-600">
            Kontakta oss nu
          </Link>
        </section>
      </div>
    </>
  );
};

export default DodsbohanteringSundsvall;