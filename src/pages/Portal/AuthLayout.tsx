import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button, Input, Label, Card, Tabs, TabsContent, TabsList, TabsTrigger, CardHeader, CardTitle, CardDescription, CardContent } from "../../components/ui";

const AuthLayout = () => {
  // använd auth-objekt så vi kan nå optional reset-funktion säkert
  const auth = useAuth();
  const signIn = auth.signIn;
  const signUp = auth.signUp;
   const { toast } = useToast();
   const [isLoading, setIsLoading] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
 
   const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
     e.preventDefault();
     setIsLoading(true);
     const formData = new FormData(e.currentTarget);
     const email = formData.get("email") as string;
     const password = formData.get("password") as string;

     const { error } = await signIn(email, password);
     if (error) toast({ title: "Inloggning misslyckades", description: error.message, variant: "destructive" });
     else toast({ title: "Välkommen!", description: "Du är nu inloggad." });

     setIsLoading(false);
   };
 
   const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
     e.preventDefault();
     setIsLoading(true);
     const formData = new FormData(e.currentTarget);
     const email = formData.get("email") as string;
     const password = formData.get("password") as string;
     const name = formData.get("name") as string;
     const phone = formData.get("phone") as string;

     const { error } = await signUp(email, password, name, phone);
     if (error) toast({ title: "Registrering misslyckades", description: error.message, variant: "destructive" });
     else toast({ title: "Registrering lyckad!", description: "Kontrollera din e-post för att bekräfta kontot." });

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
      // Försök anropa hookens reset-metod om den finns
      const sendReset = (auth as any).sendPasswordReset ?? (auth as any).resetPassword ?? (auth as any).sendResetEmail;
      if (typeof sendReset === "function") {
        const res = await sendReset(forgotEmail);
        if (res?.error) {
          toast({ title: "Fel", description: String(res.error?.message ?? res), variant: "destructive" });
        } else {
          toast({ title: "E-post skickad", description: "Om kontot finns skickades en återställningslänk." });
          setForgotMode(false);
        }
      } else {
        // Fallback - informera användare/admin
        toast({
          title: "Återställning ej tillgänglig",
          description: "Funktionen för lösenordsåterställning är inte konfigurerad. Kontakta support.",
          variant: "destructive",
        });
      }
    } catch (err: any) {
      console.error("Forgot password error:", err);
      toast({ title: "Fel", description: String(err?.message ?? err), variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
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
             <Tabs defaultValue="signin">
               <TabsList className="grid w-full grid-cols-2">
                 <TabsTrigger value="signin">Logga in</TabsTrigger>
                 <TabsTrigger value="signup">Registrera</TabsTrigger>
               </TabsList>
 
               <TabsContent value="signin">
                 {!forgotMode ? (
                   <form onSubmit={handleSignIn} className="space-y-4">
                     <Label htmlFor="email">E-post</Label>
                     <Input id="email" name="email" type="email" required />
                     <Label htmlFor="password">Lösenord</Label>
                     <Input id="password" name="password" type="password" required />
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
 
               <TabsContent value="signup">
                 <form onSubmit={handleSignUp} className="space-y-4">
                   <Label htmlFor="name">Namn</Label>
                   <Input id="name" name="name" type="text" required />
                   <Label htmlFor="phone">Telefon</Label>
                   <Input id="phone" name="phone" type="tel" />
                   <Label htmlFor="email">E-post</Label>
                   <Input id="email" name="email" type="email" required />
                   <Label htmlFor="password">Lösenord</Label>
                   <Input id="password" name="password" type="password" required />
                   <Button type="submit" disabled={isLoading}>{isLoading ? "Laddar..." : "Registrera"}</Button>
                 </form>
               </TabsContent>
             </Tabs>
           </CardContent>
         </Card>
       </div>
     </div>
   );
 };
 
 export default AuthLayout;
