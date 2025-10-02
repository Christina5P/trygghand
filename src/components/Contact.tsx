import { Button } from "@/components/ui/button";
import { useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Phone, Mail, MapPin, Clock } from "lucide-react";

const Contact = () => {
  useEffect(() => {
    if (window.location.hash === '#kontakt-form') {
      setTimeout(() => {
        const form = document.getElementById('kontakt-form');
        if (form) {
          form.scrollIntoView({ behavior: 'smooth' });
          (form.querySelector('input,textarea,button') as HTMLElement)?.focus();
        }
      }, 100);
    }
  }, []);
  const contactInfo = [
    {
      icon: Phone,
      title: "Telefon",
      value: "070-175 35 85",
      description: "Vardagar 08:00-17:00"
    },
    {
      icon: Mail,
      title: "E-post",
      value: "info@trygghand.se",
      description: "Vi svarar inom 24 timmar"
    },
    {
      icon: MapPin,
      title: "Kontor",
      value: "Sundsvall, Sverige",
      description: "Vi verkar i hela Sundsvallsområdet"
    },
    {
      icon: Clock,
      title: "Öppettider",
      value: "Måndag-Fredag",
      description: "08:00-17:00"
    }
  ];

  return (
    <section id="contact" className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center space-y-4 mb-16">
          <h2 className="text-3xl lg:text-4xl font-bold text-foreground">Kontakta oss</h2>
          <p className="text-xl text-foreground max-w-3xl mx-auto">
            Låt oss hjälpa dig med din livsförändring. Boka en kostnadsfri konsultation idag.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12">
          <div className="space-y-8">
            <div>
              <h3 className="text-2xl font-bold text-foreground mb-6">Få en kostnadsfri konsultation</h3>
              <Card className="shadow-lg border-border/50" id="kontakt-form">
                <CardHeader>
                  <CardTitle>Berätta om din situation</CardTitle>
                  <CardDescription className="text-foreground">
                    Vi återkommer inom 24 timmar med en skräddarsydd lösning
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <Input placeholder="Förnamn" />
                    <Input placeholder="Efternamn" />
                  </div>
                  <Input placeholder="E-postadress" type="email" />
                  <Input placeholder="Telefonnummer" type="tel" />
                  <Textarea 
                    placeholder="Beskriv kort din situation och vilken hjälp du behöver..."
                    className="min-h-[120px]"
                  />
                  <Button size="lg" className="w-full bg-gradient-to-r from-primary to-trust-blue-dark">
                    Skicka förfrågan
                  </Button>
                  <p className="text-xs text-foreground text-center">
                    Genom att skicka denna förfrågan godkänner du att vi kontaktar dig angående våra tjänster.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>

          <div className="space-y-8">
            <div>
              <h3 className="text-2xl font-bold text-foreground mb-6">Kontaktinformation</h3>
              <div className="grid gap-6">
                {contactInfo.map((info, index) => {
                  const Icon = info.icon;
                  return (
                    <Card key={index} className="border-border/50 hover:border-primary/20 transition-colors">
                      <CardContent className="p-6">
                        <div className="flex items-start space-x-4">
                          <div className="w-12 h-12 rounded-full bg-trust-green-light flex items-center justify-center flex-shrink-0">
                            <Icon className="h-6 w-6 text-trust-green" />
                          </div>
                          <div className="space-y-1">
                            <h4 className="font-semibold text-foreground">{info.title}</h4>
                            {info.title === "E-post" ? (
                              <a 
                                href="mailto:info@trygghand.se"
                                className="text-foreground font-medium underline hover:text-primary transition-colors"
                              >
                                {info.value}
                              </a>
                            ) : (
                              <p className="text-foreground font-medium">{info.value}</p>
                            )}
                            <p className="text-sm text-muted-foreground">{info.description}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>

            <Card className="bg-trust-green-light border-trust-green/20">
              <CardContent className="p-6">
                <h4 className="font-semibold text-trust-green mb-2">Kostnadsfri konsultation</h4>
                <p className="text-sm text-foreground">
                  Vi erbjuder alltid en kostnadsfri initial konsultation där vi går igenom 
                  din situation och föreslår den bästa lösningen för just dina behov. 
                  Ingen förpliktelse - bara professionell rådgivning.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Contact;