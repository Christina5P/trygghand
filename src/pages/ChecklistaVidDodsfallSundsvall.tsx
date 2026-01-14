import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';

const ChecklistaVidDodsfallSundsvall: React.FC = () => {
  return (
    <>
      <Helmet>
        <title>Checklista vid dödsfall i Sundsvall | Trygg Hand</title>
        <meta name="description" content="Praktisk checklista vid dödsfall i Sundsvall. Få hjälp med allt från bouppteckning till tömning av bostaden." />
        <link rel="canonical" href="https://trygghand.se/checklista-vid-dodsfall-sundsvall" />
      </Helmet>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold mb-6">Checklista vid dödsfall i Sundsvall</h1>
        
        <p className="text-lg mb-4">
          Att hantera ett dödsfall kan kännas överväldigande. Här är en checklista för att hjälpa dig genom processen i Sundsvall.
        </p>
        
        <p className="mb-4">
          För mer omfattande hjälp, överväg vår <Link to="/dodsbohantering-sundsvall" className="text-primary underline">dödsbohantering i Sundsvall</Link>, där vi tar hand om hela samordningen.
        </p>
        
        <h2 className="text-2xl font-semibold mb-4">Steg att ta</h2>
        <ol className="list-decimal list-inside mb-4">
          <li>Anmäla dödsfallet till Skatteverket</li>
          <li>Kontakta försäkringsbolag</li>
          <li>Organisera bouppteckning</li>
          <li>Hantera bostaden och bohaget</li>
        </ol>
        
            <Link to="/#contact" className="bg-blue-500 text-white px-6 py-2 rounded hover:bg-blue-600">
          Få personlig rådgivning
        </Link>
      </div>
    </>
  );
};

export default ChecklistaVidDodsfallSundsvall;