import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';

const VadIngarIDodsbohantering: React.FC = () => {
  return (
    <>
      <Helmet>
        <title>Vad ingår i en dödsbohantering? | Trygg Hand</title>
        <meta name="description" content="Lär dig vad som ingår i en professionell dödsbohantering. Från planering till avslutande administration." />
        <link rel="canonical" href="https://www.trygghand.com/vad-ingar-i-dodsbohantering" />
      </Helmet>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold mb-6">Vad ingår i en dödsbohantering?</h1>
        
        <p className="text-lg mb-4">
          En komplett dödsbohantering omfattar många steg för att säkerställa att allt hanteras korrekt och respektfullt.
        </p>
        
        <p className="mb-4">
          För detaljerad information om vår tjänst i Sundsvall, se vår sida om <Link to="/dodsbohantering-sundsvall" className="text-primary underline">dödsbohantering i Sundsvall</Link>.
        </p>
        
        <h2 className="text-2xl font-semibold mb-4">Typiska tjänster</h2>
        <ul className="list-disc list-inside mb-4">
          <li>Planering och konsultation</li>
          <li>Tömning och städning</li>
          <li>Försäljning av egendom</li>
          <li>Administration och bouppteckning</li>
        </ul>
        
        <Link to="/#contact" className="bg-blue-500 text-white px-6 py-2 rounded hover:bg-blue-600">
          Kontakta oss för offert
        </Link>
      </div>
    </>
  );
};

export default VadIngarIDodsbohantering;