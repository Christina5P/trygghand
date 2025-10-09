import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";

export default function ResetPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    if (!email) {
      setMsg("Fyll i din e‑postadress.");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`
      });
      if (error) {
        setMsg("Kunde inte skicka återställningslänk: " + error.message);
      } else {
        setMsg("Återställningslänk skickad. Kolla din e‑post (inkl. skräppost).");
        setEmail("");
      }
    } catch {
      setMsg("Ett fel uppstod. Försök igen senare.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Glömt lösenord</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">E‑post</label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="din@epost.se"
              required
            />
          </div>

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Skickar..." : "Skicka återställningslänk"}
          </Button>

          {msg && <p className="text-sm text-center text-foreground">{msg}</p>}
        </form>
      </CardContent>
    </Card>
  );
}