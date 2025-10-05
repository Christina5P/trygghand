import { useState, useEffect } from "react";
// Update the import path if needed, or create the client file as shown below
//import { supabase } from "src/integrations/supabase/client";
import { createClient } from '@supabase/supabase-js'
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Mail, Lock } from "lucide-react";
import { supabase } from "@/lib/supabase";

const checkAdminStatus = async (email: string) => {
  const { data, error } = await supabase
    .from('customers')
    .select('is_admin')
    .eq('email', email)
    .single();

  if (error) {
    console.error('Error fetching admin status:', error);
    return false;
  }
  return data?.is_admin === true;
};

const Auth = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session) {
        const email = session.user.email;
        const is_admin = await checkAdminStatus(email);

        if (!is_admin) {
          toast.error("Du har inte behörighet till adminpanelen");
          return;
        }
        navigate("/admin");
      }
    });

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session) {
        const email = session.user.email;
        const is_admin = await checkAdminStatus(email);

        if (!is_admin) {
          toast.error("Du har inte behörighet till adminpanelen");
          return;
        }
        navigate("/admin");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (isLogin) {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        toast.error("Felaktiga inloggningsuppgifter");
      } else {
        toast.success("Inloggad!");
      }
    } else {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`
        }
      });

      if (error) {
        toast.error("Något gick fel vid registrering");
      } else {
        toast.success("Konto skapat! Kontrollera din e-post.");
      }
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{isLogin ? "Logga in" : "Skapa konto"}</CardTitle>
          <CardDescription>
            {isLogin
              ? "Logga in på ditt adminkonto"
              : "Skapa ett nytt konto för att komma igång"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAuth} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-post</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="din@email.se"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Lösenord</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete={isLogin ? "current-password" : "new-password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="pl-10"
                />
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Laddar..." : isLogin ? "Logga in" : "Skapa konto"}
            </Button>

            <Button
              type="button"
              variant="link"
              className="w-full"
              onClick={() => setIsLogin(!isLogin)}
            >
              {isLogin ? "Har du inget konto? Registrera dig" : "Har du redan ett konto? Logga in"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
