import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';

const TomningAvBohagSundsvall: React.FC = () => {
  return (
    <>
      <Helmet>
        <title>Tömning av bohag i Sundsvall | Trygg Hand</title>
        <meta name="description" content="Professionell tömning av bohag i Sundsvall. Vi hanterar allt från möbler till personliga tillhörigheter med omsorg och respekt." />
        <link rel="canonical" href="https://trygghand.se/tomning-av-bohag-sundsvall" />
      </Helmet>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold mb-6">Tömning av bohag i Sundsvall</h1>
        
        <p className="text-lg mb-4">
          Behöver du hjälp med tömning av bohag i Sundsvall? Trygg Hand erbjuder professionell och respektfull service för att hantera allt från stora möbler till små personliga föremål.
        </p>
        
        <p className="mb-4">
          Vår tjänst ingår ofta som en del av vår <Link to="/dodsbohantering-sundsvall" className="text-primary underline">dödsbohantering i Sundsvall</Link>, där vi samordnar hela processen för att underlätta för anhöriga.
        </p>
        
        <h2 className="text-2xl font-semibold mb-4">Vad vi erbjuder</h2>
        <ul className="list-disc list-inside mb-4">
          <li>Sortering och packning</li>
          <li>Transport och bortforsling</li>
          <li>Miljövänlig hantering</li>
        </ul>
        
        <Link to="/#contact" className="bg-blue-500 text-white px-6 py-2 rounded hover:bg-blue-600">
          Kontakta oss
        </Link>
      </div>
    </>
  );
};

export default TomningAvBohagSundsvall;