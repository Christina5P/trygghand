import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, ArrowLeft, CheckCircle, Heart } from "lucide-react";
import { Link } from "react-router-dom";

const Magasinering = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <Link to="/#tjanster" className="inline-flex items-center text-primary hover:text-primary/80 mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Tillbaka till tjänster
          </Link>
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
              <Shield className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Magasinering</h1>
              <p className="text-xl text-muted-foreground">Säker förvaring av värdesaker</p>
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Säker förvaring för dina värdesaker</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <p className="text-muted-foreground leading-relaxed text-lg">
                Vi erbjuder magasinering av föremål som inte har en given plats för tillfället.
              </p>

              <div className="grid md:grid-cols-2 gap-6 mt-8">
                <div className="space-y-4">
                  <h3 className="font-semibold text-foreground">Vad vi kan magasinera:</h3>
                  <ul className="space-y-2">
                    {[
                      "Möbler och inredning",
                      "Värdefulla föremål",
                      "Minnessaker och familjearv",
                      "Antika och vintage-objekt",
                      "Säsongsföremål",
                      "Konst och tavlor"
                    ].map((item, index) => (
                      <li key={index} className="flex items-start">
                        <CheckCircle className="h-4 w-4 text-trust-green mr-2 mt-0.5 flex-shrink-0" />
                        <span className="text-muted-foreground text-sm">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="space-y-4">
                  <h3 className="font-semibold text-foreground">Våra fördelar:</h3>
                  <ul className="space-y-2">
                    {[
                      "Klimatkontrollerade lokaler",
                      "Säkerhet dygnet runt",
                      "Försäkringsskydd",
                      "Flexibla avtalsperioder",
                      "Enkel åtkomst",
                      "Professionell hantering"
                    ].map((item, index) => (
                      <li key={index} className="flex items-start">
                        <CheckCircle className="h-4 w-4 text-trust-green mr-2 mt-0.5 flex-shrink-0" />
                        <span className="text-muted-foreground text-sm">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="bg-muted/30 rounded-lg p-6 mt-8">
                <h3 className="text-lg font-semibold text-foreground mb-4">Perfekt för tillfälliga behov</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Magasinering är den ideala lösningen när du behöver tid att bestämma vad som ska hända med viktiga föremål, 
                  när du är mellan bostäder, eller när du helt enkelt behöver mer plats. Vi tar hand om dina saker med största omsorg.
                </p>
              </div>

              <div className="grid md:grid-cols-3 gap-4 mt-8">
                <div className="text-center p-4 bg-primary/5 rounded-lg">
                  <Shield className="h-8 w-8 text-primary mx-auto mb-2" />
                  <h4 className="font-medium text-foreground">Säkert</h4>
                  <p className="text-sm text-muted-foreground">Övervakade lokaler</p>
                </div>
                <div className="text-center p-4 bg-primary/5 rounded-lg">
                  <CheckCircle className="h-8 w-8 text-primary mx-auto mb-2" />
                  <h4 className="font-medium text-foreground">Försäkrat</h4>
                  <p className="text-sm text-muted-foreground">Fullständig täckning</p>
                </div>
                <div className="text-center p-4 bg-primary/5 rounded-lg">
                  <Heart className="h-8 w-8 text-primary mx-auto mb-2" />
                  <h4 className="font-medium text-foreground">Omsorgsfullt</h4>
                  <p className="text-sm text-muted-foreground">Professionell hantering</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mt-12 text-center">
          <Button size="lg" className="bg-gradient-to-r from-primary to-trust-blue-dark">
            Boka kostnadsfri konsultation
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Magasinering;