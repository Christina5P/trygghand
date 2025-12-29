import { Button } from "@/components/ui/button";
import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Phone, Mail, MapPin, Clock } from "lucide-react";
import { supabase } from "@/lib/supabase"; // Du måste ha denna fil
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, CheckCircle2 } from "lucide-react";

const Contact = () => {
  const formRef = useRef<HTMLFormElement>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const form = formRef.current;
    if (!form) return;

    setSuccessMessage(null);
    setErrorMessage(null);
    setIsLoading(true);

    const data = {
      firstname: (form as any).firstname.value,
      lastname: (form as any).lastname.value,
      email: (form as any).email.value,
      phone: (form as any).phone.value,
      message: (form as any).message.value,
      gdpr_consent: (form as any)['gdpr-consent'].checked,
      consent_timestamp: new Date().toISOString(),
    };

    console.log("Contact form submitting:", data);
    try {
      // 1) Try server-side API (uses service role key in test/dev)
      const apiRes = await fetch("/api/contact-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (apiRes.ok) {
        setSuccessMessage("Tack för din förfrågan!");
        form.reset();
        setTimeout(() => setSuccessMessage(null), 5000);
      } else {
        // 2) Fallback to direct Supabase insert (if API not available)
        const { error } = await supabase.from("contact_requests").insert([data]).select();
        if (!error) {
          setSuccessMessage("Tack för din förfrågan!");
          form.reset();
          setTimeout(() => setSuccessMessage(null), 5000);
        } else {
          setErrorMessage("Något gick fel, försök igen: " + error.message);
        }
      }
    } catch (e: any) {
      console.error("Contact form exception:", e);
      setErrorMessage("Något gick fel, försök igen: " + e.message);
    }
    setIsLoading(false);
  };

  const contactInfo = [
    {
      icon: Phone,
      title: "Telefon",
      value: "076- 116 95 54",
      description: "Vardagar 08:00-17:00"
    },
    {
      icon: Mail,
      title: "E-post",
      value: "kontakt@trygghand.com",
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
          <h2 id="kontakt" className="text-3xl lg:text-4xl font-bold text-foreground">
            Kontakta oss
          </h2>
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
                  {successMessage && (
                    <Alert className="bg-green-50 border-green-200">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      <AlertDescription className="text-green-800">
                        {successMessage}
                      </AlertDescription>
                    </Alert>
                  )}
                  
                  {errorMessage && (
                    <Alert className="bg-red-50 border-red-200">
                      <AlertCircle className="h-4 w-4 text-red-600" />
                      <AlertDescription className="text-red-800">
                        {errorMessage}
                      </AlertDescription>
                    </Alert>
                  )}

                  <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <Input name="firstname" placeholder="Förnamn" required className="w-full" disabled={isLoading} />
                      <Input name="lastname" placeholder="Efternamn" className="w-full" disabled={isLoading} />
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <Input name="email" placeholder="E-postadress" type="email" className="w-full" disabled={isLoading} />
                      <Input name="phone" placeholder="Telefonnummer" type="tel" required className="w-full" disabled={isLoading} />
                    </div>

                    <div>
                      <Textarea
                        name="message"
                        placeholder="Beskriv kort din situation och vilken hjälp du behöver..."
                        className="min-h-[120px] w-full"
                        disabled={isLoading}
                      />
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-start space-x-2">
                        <input
                          type="checkbox"
                          id="gdpr-consent"
                          required
                          className="mt-1 h-4 w-4 text-trust-blue focus:ring-trust-blue border-gray-300 rounded"
                        />
                        <label htmlFor="gdpr-consent" className="text-sm text-foreground">
                          Jag godkänner att mina personuppgifter behandlas för att hantera min kontaktförfrågan. Behandlingen sker enligt dataskyddsförordningen (GDPR).
                          Läs mer i vår <a href="/privacy" className="underline text-trust-blue">integritetspolicy</a>.
                        </label>
                      </div>
                    </div>

                    <Button type="submit" size="lg" className="w-full bg-gradient-to-r from-primary to-trust-blue-dark" disabled={isLoading}>
                      {isLoading ? "Skickar..." : "Skicka förfrågan"}
                    </Button>
                  </form>
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
                                href="mailto:kontakt@trygghand.com"
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

                {/* Google Calendar Appointment Scheduling begin */}
                
                    <div className="w-full overflow-hidden rounded-md">
                    <div className="text-foreground  p-4 rounded-lg shadow-md mb-4">
                    <iframe
  src="https://calendar.google.com/calendar/appointments/schedules/AcZssZ1UAZQAx03XE6hyOig-HfYTIaEGIHD2r0nJijTEhzeuviQxvsSF0TOx1sL8lwreiQyfbTzV_Zxx?gv=true/&hl=sv"
  className="w-full overflow-hidden rounded-md"
  style={{ 
    border: 0,
    height: "800px",   // 👉 fasta höjden löser scroll-problemet
    backgroundColor: "white"
  }}
  aria-label="Google Calendar booking"
  loading="lazy"
/>

                  </div>
                </div>
                {/* Google Calendar Appointment Scheduling end */}

              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Contact;