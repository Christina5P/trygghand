import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, ArrowLeft, CheckCircle } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import Seo from "@/components/Seo";

const TomningBohag = () => {
  const navigate = useNavigate();

  // useEffect(() => {
  //   document.title = "Tömning av Bohag - Trygg Hand";
  // }, []);
 
   const scrollToSection = (id: string) => {
     const el = document.getElementById(id);
     if (el) el.scrollIntoView({ behavior: "smooth" });
   };
 
   const handleConsultationClick = () => {
     // Navigera till startsidan
     navigate("/", { replace: false });
     // Scrolla till kontakt efter en kort timeout
     setTimeout(() => scrollToSection("kontakt"), 50);
   };
 
   const handleBackToServicesClick = () => {
     navigate("/", { replace: false });
     setTimeout(() => scrollToSection("skraddarsydda-losningar"), 50);
   };
 
   return (
     <div className="min-h-screen bg-background">
       <Seo
         title="Tömning av bohag i Sundsvall| Trygg Hand"
        description="Professionell tömning av bohag som del av våra servicepaket för dödsbohantering – sortering och borttransport."
         canonical="https://www.trygghand.com/services/tomning-bohag"
       />
       <div className="container mx-auto px-4 py-8">
         <div className="mb-8">
           <button
             onClick={handleBackToServicesClick}
             className="inline-flex items-center text-primary hover:text-primary/80 mb-4"
           >
             <ArrowLeft className="mr-2 h-4 w-4" />
             Tillbaka till tjänster
           </button>
 
    <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
              <Shield className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Tömning av Bohag</h1>
              <h2 className="text-xl font-semibold text-foreground/80">Del av våra servicepaket för dödsbohantering</h2>
              <p className="text-xl text-muted-foreground">Sortering och borttransport</p>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          <Card className="transition-shadow duration-200 hover:shadow-2xl hover:shadow-gray-300">
            <CardHeader>
              <CardTitle className="text-xl">Tömning av bohag – sortering och borttransport</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground leading-relaxed mb-6">
                När det är dags att flytta från ett hem man bott länge i, eller när en anhörig gått bort, kan det kännas både tungt och överväldigande att ta hand om ett helt bohag.
               <br /> Tömning av bohag innebär att vi tar hand om att tömma alla tillhörigheter från en bostad efter en person flyttat eller avlidit. 
               Då ansvaret ligger hos oss minskar risken för konflikter och missförstånd mellan anhöriga.
               <br /> För en komplett lösning vid dödsfall, se vår <Link to="/dodsbohantering-sundsvall" className="text-primary underline">dödsbohantering i Sundsvall</Link>.
                <br /><br />

                 <p className="font-medium text-trust-green mb-2">Miljömedveten hantering – vi prioriterar återbruk och minimerar avfall!
                 </p>
              </p>
            </CardContent>
          </Card>

          <Card className="transition-shadow duration-200 hover:shadow-2xl hover:shadow-gray-300">
            <CardHeader>
              <CardTitle className="text-xl">Det här ingår i våra tjänster för tömning av bohag:</CardTitle>
            </CardHeader>
            <CardContent>
              
<ul>
  {[
    "Planeringsmöte där vi går igenom vad som ska sparas, återbrukas eller slängas",
    "Transport av återbrukbart till second hand/loppis",
    "Transport av övrigt till återvinningscentral",
  ].map((item, index) => (
    <li key={index} className="flex items-start">
      <CheckCircle className="h-4 w-4 text-trust-green mr-2 mt-0.5 flex-shrink-0" />
      <span className="text-muted-foreground text-sm">{item}</span>
    </li>
  ))}
</ul>
<br />
<h3 className="font-semibold text-foreground mb-3">Som tillval kan du få hjälp med:</h3>
<ul>
  {[
    "Packning och bärhjälp",
    "Sortering av minnessaker och viktiga dokument",
    "Magasinering eller transport till ny adress",
    "Dokumentation (t.ex. foton av föremål innan bortforsling)"
  ].map((item, index) => (
    <li key={index} className="flex items-start">
      <CheckCircle className="h-4 w-4 text-trust-green mr-2 mt-0.5 flex-shrink-0" />
      <span className="text-muted-foreground text-sm">{item}</span>
    </li>
  ))}
</ul>
            </CardContent>
          </Card>
        </div>

         <div className="mt-12 text-center">
          <Link to="/#kontakt-form">
            <Button
              size="lg"
              className="bg-gradient-to-r from-primary to-trust-blue-dark"
            >
              Boka kostnadsfri konsultation
            </Button>
          </Link>

          <p className="text-muted-foreground mt-4 text-center">
            Denna tjänst ingår ofta i våra <a href="/#paketlosningar" className="text-primary hover:underline">servicepaket för dödsbohantering</a>.
          </p>
        </div>
      </div>
    </div>
  );
};

export default TomningBohag;