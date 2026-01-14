import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff } from "lucide-react";
import { Button, Input, Label, Card, Tabs, TabsContent, TabsList, TabsTrigger, CardHeader, CardTitle, CardDescription, CardContent } from "../../components/ui";
import { formatPhoneWithDash, normalizeSwedishPhoneToE164 } from "@/utils";

const AuthLayout = () => {
  const enablePhoneLogin = import.meta.env.VITE_ENABLE_PHONE_LOGIN === "true";

  // använd auth-objekt så vi kan nå optional reset-funktion säkert
  const auth = useAuth();
  const signIn = auth.signIn;
  const requestPhoneOtp = auth.requestPhoneOtp;
  const verifyPhoneOtp = auth.verifyPhoneOtp;
   const { toast } = useToast();
   const [isLoading, setIsLoading] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
 
   const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
     e.preventDefault();
     setIsLoading(true);
     
     const { error } = await signIn(email, password);
     if (error) toast({ title: "Inloggning misslyckades", description: error.message, variant: "destructive" });
     else toast({ title: "Välkommen!", description: "Du är nu inloggad." });

     setEmail("");
     setPassword("");
     setIsLoading(false);
   };

  const handleForgotPassword = async (e?: React.FormEvent<HTMLFormElement>) => {
    if (e) e.preventDefault();
    if (!forgotEmail) {
      toast({ title: "Fyll i e-post", description: "Ange din e-postadress för återställning", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    try {
      const { error } = await auth.sendPasswordReset(forgotEmail);
      if (error) {
        toast({ title: "Fel", description: String(error?.message ?? error), variant: "destructive" });
      } else {
        toast({ 
          title: "E-post skickad", 
          description: "Kontrollera din e-postinkorg. Om mailet inte kommer fram inom några minuter, kontakta support.", 
          duration: 5000 
        });
        setForgotMode(false);
        setForgotEmail("");
      }
    } catch (err: any) {
      console.error("Forgot password error:", err);
      toast({ title: "Fel", description: String(err?.message ?? err), variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendOtp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!phone) {
      toast({ title: "Fyll i telefon", description: "Ange ditt nummer i format +46…", variant: "destructive" });
      return;
    }

    const phoneE164 = normalizeSwedishPhoneToE164(phone);
    if (!phoneE164.startsWith("+")) {
      toast({ title: "Ogiltigt nummer", description: "Ange ett giltigt telefonnummer (t.ex. 070-1234567 eller +46701234567).", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    const { error } = await requestPhoneOtp(phoneE164);
    if (error) {
      const code = (error as any)?.code;
      if (code === "phone_provider_disabled") {
        toast({
          title: "SMS-inloggning är inte aktiverad",
          description: "Supabase saknar SMS-provider. Aktivera Phone provider och konfigurera SMS (t.ex. Twilio/Vonage/MessageBird) i Supabase Auth.",
          variant: "destructive",
          duration: 7000,
        });
      } else {
        toast({ title: "Kunde inte skicka kod", description: error.message, variant: "destructive" });
      }
    } else {
      setOtpSent(true);
      toast({ title: "Kod skickad", description: "Kontrollera SMS och ange koden." });
    }
    setIsLoading(false);
  };

  const handleVerifyOtp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!phone || !otp) {
      toast({ title: "Fyll i uppgifter", description: "Ange både telefon och kod.", variant: "destructive" });
      return;
    }

    const phoneE164 = normalizeSwedishPhoneToE164(phone);
    if (!phoneE164.startsWith("+")) {
      toast({ title: "Ogiltigt nummer", description: "Ange ett giltigt telefonnummer (t.ex. 070-1234567 eller +46701234567).", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    const { error } = await verifyPhoneOtp(phoneE164, otp);
    if (error) {
      toast({ title: "Verifiering misslyckades", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Välkommen!", description: "Du är nu inloggad." });
    }
    setIsLoading(false);
  };
 
   return (
     <div className="min-h-screen bg-gradient-to-b from-indigo-50 via-white to-gray-50 flex flex-col items-center">
       {/* Topbar / tillbaka-knapp */}
       <header className="w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-4">
         <a
           href="/"
           aria-label="Tillbaka till startsidan"
           className="inline-flex items-center gap-2 text-sm text-trust-blue bg-white/95 px-3 py-1 rounded shadow-md border border-trust-blue/10 hover:bg-white"
         >
           ← Till startsidan
         </a>
       </header>
 
       {/* Innehåll centrerat */}
       <div className="flex-1 flex items-center justify-center w-full px-4">
         <Card className="w-full max-w-md">
           <CardHeader>
             <CardTitle>Trygg Hand</CardTitle>
             <CardDescription className="mb-2">Logga in för att hantera dina ärenden</CardDescription>
           </CardHeader>
           <CardContent>
              <Tabs defaultValue="email">
                <TabsList className={`grid w-full ${enablePhoneLogin ? "grid-cols-2" : "grid-cols-1"}`}>
                 <TabsTrigger value="email">E-post</TabsTrigger>
                  {enablePhoneLogin && <TabsTrigger value="phone">Telefon</TabsTrigger>}
               </TabsList>

               <TabsContent value="email">
                 {!forgotMode ? (
                   <form onSubmit={handleSignIn} className="space-y-4">
                     <Label htmlFor="email">E-post</Label>
                     <Input id="email" value={email} onChange={(e) => setEmail(e.target.value)} type="email" required />
                     <Label htmlFor="password">Lösenord</Label>
                     <div className="relative">
                       <Input id="password" value={password} onChange={(e) => setPassword(e.target.value)} type={showPassword ? "text" : "password"} required />
                       <button
                         type="button"
                         onClick={() => setShowPassword(!showPassword)}
                         className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                         aria-label={showPassword ? "Dölj lösenord" : "Visa lösenord"}
                       >
                         {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                       </button>
                     </div>
                     <div className="flex items-center justify-between">
                       <Button type="submit" disabled={isLoading}>{isLoading ? "Laddar..." : "Logga in"}</Button>
                       <button type="button" onClick={() => setForgotMode(true)} className="text-sm text-trust-blue hover:underline">
                         Glömt lösenord?
                       </button>
                     </div>
                   </form>
                 ) : (
                   <form onSubmit={handleForgotPassword} className="space-y-4">
                     <Label htmlFor="forgotEmail">Ange din e-post</Label>
                     <Input id="forgotEmail" value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)} type="email" required />
                     <div className="flex items-center gap-2">
                       <Button type="submit" disabled={isLoading}>{isLoading ? "Skickar..." : "Skicka återställning"}</Button>
                       <button type="button" onClick={() => setForgotMode(false)} className="text-sm text-warm-gray hover:underline">
                         Avbryt
                       </button>
                     </div>
                   </form>
                 )}
               </TabsContent>

              {enablePhoneLogin && (
                <TabsContent value="phone">
                  {!otpSent ? (
                    <form onSubmit={handleSendOtp} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="phone">Telefonnummer</Label>
                        <Input
                          id="phone"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          onBlur={() => setPhone((p) => formatPhoneWithDash(p))}
                          type="tel"
                          placeholder="070-1234567"
                          required
                        />
                        <p className="text-xs text-muted-foreground">Du kan skriva 070-1234567 eller +46701234567 (vi normaliserar automatiskt).</p>
                      </div>
                      <Button type="submit" disabled={isLoading}>{isLoading ? "Skickar..." : "Skicka kod"}</Button>
                    </form>
                  ) : (
                    <form onSubmit={handleVerifyOtp} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="phone_verify">Telefonnummer</Label>
                        <Input
                          id="phone_verify"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          onBlur={() => setPhone((p) => formatPhoneWithDash(p))}
                          type="tel"
                          placeholder="070-1234567"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="otp">Kod</Label>
                        <Input
                          id="otp"
                          value={otp}
                          onChange={(e) => setOtp(e.target.value)}
                          inputMode="numeric"
                          placeholder="123456"
                          required
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <Button type="submit" disabled={isLoading}>{isLoading ? "Verifierar..." : "Verifiera"}</Button>
                        <button
                          type="button"
                          onClick={() => {
                            setOtpSent(false);
                            setOtp("");
                          }}
                          className="text-sm text-warm-gray hover:underline"
                        >
                          Ändra nummer
                        </button>
                      </div>
                    </form>
                  )}
                </TabsContent>
              )}
             </Tabs>
           </CardContent>
         </Card>
       </div>
     </div>
   );
 };
 
 export default AuthLayout;
