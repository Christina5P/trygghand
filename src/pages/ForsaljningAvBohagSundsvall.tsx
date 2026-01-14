import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';

const ForsaljningAvBohagSundsvall: React.FC = () => {
  return (
    <>
      <Helmet>
        <title>Försäljning av bohag i Sundsvall | Trygg Hand</title>
        <meta name="description" content="Professionell försäljning av bohag i Sundsvall. Vi värderar och säljer dina föremål för att maximera värdet." />
        <link rel="canonical" href="https://trygghand.se/forsaljning-av-bohag-sundsvall" />
      </Helmet>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold mb-6">Försäljning av bohag i Sundsvall</h1>
        
        <p className="text-lg mb-4">
          Vill du sälja bohag i Sundsvall? Trygg Hand hjälper dig att värdera och sälja dina föremål på ett effektivt sätt.
        </p>
        
        <p className="mb-4">
          Denna tjänst är en viktig del av vår <Link to="/dodsbohantering-sundsvall" className="text-primary underline">dödsbohantering i Sundsvall</Link>, där vi ser till att värdefulla tillgångar hanteras korrekt.
        </p>
        
        <h2 className="text-2xl font-semibold mb-4">Hur vi hjälper till</h2>
        <ul className="list-disc list-inside mb-4">
          <li>Värdering av föremål</li>
          <li>Auktion eller direktförsäljning</li>
          <li>Administration av försäljning</li>
        </ul>
        
        <Link to="/#contact" className="bg-blue-500 text-white px-6 py-2 rounded hover:bg-blue-600">
          Kontakta oss
        </Link>
      </div>
    </>
  );
};

export default ForsaljningAvBohagSundsvall;