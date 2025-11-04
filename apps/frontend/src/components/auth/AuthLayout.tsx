import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Label } from "../ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@supabase/supabase-js";

// Initialize Supabase client using environment variables (Vite or CRA fallbacks)
const supabaseUrl =
  (typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_SUPABASE_URL) ||
  process.env.REACT_APP_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  "";
const supabaseAnonKey =
  (typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_SUPABASE_ANON_KEY) ||
  process.env.REACT_APP_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  "";

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("Supabase URL or ANON KEY not set in environment variables.");
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Kontrollera om användaren är admin
const checkAdminStatus = async (email?: string) => {
  if (!email) return false;

  const { data, error } = await supabase
    .from("customers")
    .select("is_admin")
    .eq("email", email)
    .single();

  if (error) {
    console.error("Error fetching admin status:", error);
    return false;
  }

  return data?.is_admin === true;
};

const AuthLayout = () => {
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  // Inloggning
  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const formData = new FormData(e.currentTarget);
      const email = formData.get("email") as string;
      const password = formData.get("password") as string;

      const { error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        toast.error("Inloggning misslyckades", { description: error.message });
      } else {
        const is_admin = await checkAdminStatus(email);
        if (is_admin) {
          navigate("/admin");
        } else {
          navigate("/portal"); // Vanliga användare går hit
        }

        toast.success("Välkommen!", { description: "Du är nu inloggad." });
      }
    } catch (err) {
      console.error(err);
      toast.error("Ett oväntat fel uppstod vid inloggning.");
    } finally {
      setIsLoading(false);
    }
  };

  // Registrering
  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const formData = new FormData(e.currentTarget);
      const email = formData.get("email") as string;
      const password = formData.get("password") as string;
      const name = formData.get("name") as string;
      const phone = formData.get("phone") as string;

      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/` },
      });

      if (error) {
        toast.error("Registrering misslyckades", { description: error.message });
      } else {
        // Optionally insert additional user metadata into your "customers" table here
        toast.success("Registrering lyckades", {
          description: "Ett konto har skapats. Kolla din e-post för verifiering.",
        });
        navigate("/"); // adjust as needed
      }
    } catch (err) {
      console.error(err);
      toast.error("Ett oväntat fel uppstod vid registrering.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-trust-blue-dark via-trust-blue to-trust-green flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-trust-blue">Trygg Hand</CardTitle>
          <CardDescription>Logga in för att hantera dina ärenden</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Logga in</TabsTrigger>
              <TabsTrigger value="signup">Registrera</TabsTrigger>
            </TabsList>

            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">E-postadress</Label>
                  <Input id="email" name="email" type="email" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Lösenord</Label>
                  <Input id="password" name="password" type="password" required />
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Logga in
                </Button>
                <div className="mt-2 text-right">
                  <a href="/reset-password" className="text-sm text-trust-blue hover:underline">
                    Glömt lösenord?
                  </a>
                </div>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Namn</Label>
                  <Input id="name" name="name" type="text" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Telefon</Label>
                  <Input id="phone" name="phone" type="tel" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">E-postadress</Label>
                  <Input id="email" name="email" type="email" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Lösenord</Label>
                  <Input id="password" name="password" type="password" required />
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Registrera
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          <div className="mt-6 text-center">
            <a href="/" className="text-trust-blue hover:underline text-sm">
              &#8592; Tillbaka till startsidan
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AuthLayout;
