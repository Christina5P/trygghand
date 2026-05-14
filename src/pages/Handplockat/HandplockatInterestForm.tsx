import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const MAX_IMAGE_SIZE_MB = 5;

export default function HandplockatInterestForm() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [category, setCategory] = useState("");
  const [budgetSek, setBudgetSek] = useState("");
  const [area, setArea] = useState("Sundsvall");
  const [interestText, setInterestText] = useState("");
  const [gdprConsent, setGdprConsent] = useState(false);
  const [interestImage, setInterestImage] = useState<File | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fileToDataUrl = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(new Error("Kunde inte läsa bildfilen."));
      reader.readAsDataURL(file);
    });

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSuccessMessage(null);
    setErrorMessage(null);

    if (!firstName.trim() || !phone.trim()) {
      setErrorMessage("Fyll i förnamn och telefonnummer.");
      return;
    }

    if (!gdprConsent) {
      setErrorMessage("Du behöver godkänna GDPR-villkoret för att skicka.");
      return;
    }

    if (interestImage && interestImage.size > MAX_IMAGE_SIZE_MB * 1024 * 1024) {
      setErrorMessage(`Bildfilen är för stor. Max ${MAX_IMAGE_SIZE_MB} MB.`);
      return;
    }

    if (interestImage && !interestImage.type.startsWith("image/")) {
      setErrorMessage("Endast bildfiler är tillåtna.");
      return;
    }

    const message = [
      "[Köpintresse Handplockat]",
      category.trim() ? `Kategori: ${category.trim()}` : "",
      budgetSek.trim() ? `Budget (SEK): ${budgetSek.trim()}` : "",
      area.trim() ? `Område: ${area.trim()}` : "",
      interestText.trim() ? `Önskemål: ${interestText.trim()}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    setIsLoading(true);
    try {
      let imageBase64: string | null = null;
      if (interestImage) {
        const dataUrl = await fileToDataUrl(interestImage);
        imageBase64 = dataUrl.includes(",") ? dataUrl.split(",")[1] : dataUrl;
      }

      const response = await fetch("/api/contact-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstname: firstName.trim(),
          lastname: lastName.trim(),
          email: email.trim() || null,
          phone: phone.trim(),
          message,
          gdpr_consent: true,
          interest_image_base64: imageBase64,
          interest_image_name: interestImage?.name || null,
          interest_image_type: interestImage?.type || null,
        }),
      });

      if (!response.ok) throw new Error("Kunde inte skicka köpintresse.");

      setSuccessMessage("Tack! Vi har tagit emot ditt köpintresse och matchar mot kommande annonser.");
      setFirstName("");
      setLastName("");
      setEmail("");
      setPhone("");
      setCategory("");
      setBudgetSek("");
      setArea("Sundsvall");
      setInterestText("");
      setGdprConsent(false);
      setInterestImage(null);
    } catch {
      setErrorMessage("Något gick fel. Försök igen eller kontakta oss via e-post.");
    } finally {
      setIsLoading(false);
    }
  };
return (
  <div className="mt-8 rounded-3xl border border-border bg-slate-50/80 p-6 shadow-sm">
    
    <div className="mb-6 flex items-start justify-between gap-4">
      <div>
        <h3 className="text-xl font-semibold text-foreground">
          Hittar du inte rätt föremål?
        </h3>

        <p className="mt-2 text-sm text-muted-foreground max-w-2xl">
          Lämna ett köpintresse så matchar vi dig mot nya annonser i Handplockat.
        </p>
      </div>

    </div>

    <form
      onSubmit={handleSubmit}
      className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]"
    >
      <div className="space-y-4 rounded-3xl border border-border bg-white p-5 shadow-sm">
        
        <div className="grid gap-4 md:grid-cols-2">
          <Input
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder="Förnamn *"
            required
            disabled={isLoading}
            className="rounded-2xl"
          />

          <Input
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            placeholder="Efternamn"
            disabled={isLoading}
            className="rounded-2xl"
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Telefonnummer *"
            type="tel"
            required
            disabled={isLoading}
            className="rounded-2xl"
          />

          <Input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="E-post (valfritt)"
            type="email"
            disabled={isLoading}
            className="rounded-2xl"
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Input
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="Kategori (t.ex. Möbler)"
            disabled={isLoading}
            className="rounded-2xl"
          />

          <Input
            value={budgetSek}
            onChange={(e) => setBudgetSek(e.target.value)}
            placeholder="Budget (SEK)"
            type="number"
            inputMode="numeric"
            min="0"
            disabled={isLoading}
            className="rounded-2xl"
          />
        </div>

        <Textarea
          value={interestText}
          onChange={(e) => setInterestText(e.target.value)}
          placeholder="Beskriv vad du letar efter (modell, storlek, skick, stil...)"
          className="min-h-[120px] rounded-2xl"
          disabled={isLoading}
        />

        {errorMessage && (
          <p className="text-sm text-destructive">{errorMessage}</p>
        )}

        {successMessage && (
          <p className="text-sm text-trust-green">{successMessage}</p>
        )}
      </div>

      <aside className="space-y-5 rounded-3xl border border-border bg-white p-5 shadow-sm">
        
        <div className="rounded-2xl bg-slate-50 p-4 border border-border">
          <h4 className="font-medium text-foreground">
            Så fungerar det
          </h4>

          <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
            Vi kontaktar dig om något som matchar ditt köpintresse dyker upp i Handplockat.
          </p>
        </div>

        <div className="space-y-3 text-sm text-muted-foreground">
          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={gdprConsent}
              onChange={(e) => setGdprConsent(e.target.checked)}
              className="mt-1 h-4 w-4"
              disabled={isLoading}
              required
            />

            <span>
              Jag godkänner att mina personuppgifter behandlas för att hantera mitt köpintresse enligt GDPR.
            </span>
          </label>
        </div>

        <Button
          type="submit"
          size="lg"
          className="w-full rounded-2xl"
          disabled={isLoading}
        >
          {isLoading ? "Skickar..." : "Skicka köpintresse"}
        </Button>
      </aside>
    </form>
  </div>
);}
