import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Mail, Loader2 } from "lucide-react";

/**
 * CreateCustomerForm: Administratörsverktyg för att skapa nya kunder
 * 
 * - Skapar ny kund direkt med is_customer = true
 * - Skickar automatisk invitationsemail med lösenordsinställning-länk
 */
export default function CreateCustomerForm({ onCustomerCreated }: { onCustomerCreated?: () => void }) {
  const [formData, setFormData] = useState({ name: "", email: "", phone: "" });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 1. Validering
      if (!formData.name.trim()) {
        toast({
          title: "Fel",
          description: "Namn är obligatoriskt.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // 2. Skicka invite via edge function (kör med Service Role på servern)
      const { data, error } = await supabase.functions.invoke("invite-customer", {
        body: {
          email: formData.email.trim() || null,
          fullName: formData.name.trim(),
          phone: formData.phone.trim() || null,
        },
      });

      if (error) throw error;
      if (!data?.ok) throw new Error(data?.message || "Kunde inte skapa kund");

      const invited = (data as any)?.invited === true;
      const authCreated = (data as any)?.auth_created === true;
      const hasEmail = !!formData.email.trim();
      const hasPhone = !!formData.phone.trim();

      toast({
        title: "Kund skapad!",
        description: invited
          ? `${formData.name} (${formData.email}) är nu registrerad som kund. En inbjudan har skickats via e-post.`
          : authCreated && !hasEmail && hasPhone
            ? `${formData.name} är nu registrerad som kund utan e-post. Inloggning sker via SMS-kod till ${formData.phone}.`
            : !hasEmail && !hasPhone
              ? `${formData.name} är nu registrerad som kund utan e-post och telefon. Ingen inloggning är möjlig förrän uppgifter kompletteras.`
              : `${formData.name} är nu registrerad som kund utan e-post. Ingen inbjudan skickades.`,
      });

      // Rensa formulär
      setFormData({ name: "", email: "", phone: "" });
      onCustomerCreated?.();
    } catch (err: any) {
      console.error("Fel vid skapande av kund:", err);
      toast({
        title: "Fel",
        description: err.message || "Kunde inte skapa kund.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Skapa Ny Kund</CardTitle>
        <CardDescription>
          Om e-post anges skickas en inbjudan. Utan e-post kan kunden logga in via SMS om telefon anges.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Namn *</Label>
            <Input
              id="name"
              type="text"
              placeholder="t.ex. Anna Svensson"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              disabled={loading}
              required
            />
          </div>

          <div>
            <Label htmlFor="email">E-post (valfritt)</Label>
            <Input
              id="email"
              type="email"
              placeholder="t.ex. anna@exempel.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              disabled={loading}
            />
          </div>

          <div>
            <Label htmlFor="phone">Telefon (valfritt)</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="t.ex. +46701234567"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              disabled={loading}
            />
            <p className="mt-1 text-xs text-muted-foreground">Tips: skriv i internationellt format (+46...) för SMS-inloggning.</p>
          </div>

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Skapar...
              </>
            ) : (
              <>
                <Mail className="mr-2 h-4 w-4" />
                {formData.email.trim()
                  ? "Skapa & Skicka Inbjudan"
                  : formData.phone.trim()
                    ? "Skapa kund (SMS-inloggning)"
                    : "Skapa kund"}
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
