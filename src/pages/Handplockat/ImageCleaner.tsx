import React, { useState } from "react";
import { supabase } from "@/lib/supabase";
import { removeBgAndUpload } from "@/hooks/useRemoveBackground";
import { Button } from "@/components/ui/button";

type Props = {
  path: string; // storage path (t.ex. handplockat-original/...)
  onDone?: (publicUrl: string) => void; // callback när den är klar
};

export default function ImageCleaner({ path, onDone }: Props) {
  const [loading, setLoading] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const handleRemoveBg = async () => {
    if (!path) return;

    setLoading(true);
    setErr(null);

    try {
      // Skapa en signed URL för privat bucket (originalbild)
      const signed = await supabase.storage
        .from("handplockat-private")
        .createSignedUrl(path, 600);

      if (signed.error || !signed.data?.signedUrl) {
        throw signed.error || new Error("Kunde inte skapa signed URL.");
      }

      // Kör background removal + uploadar resultatet till handplockat-public
      const cleanPublicUrl = await removeBgAndUpload(signed.data.signedUrl);

      setResultUrl(cleanPublicUrl);
      onDone?.(cleanPublicUrl);
    } catch (e: unknown) {
      console.error(e);
      const msg =
        e && typeof e === "object" && "message" in e && typeof (e as any).message === "string"
          ? (e as any).message
          : "Kunde inte ta bort bakgrund.";
      setErr(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <Button
        type="button"
        variant="outline"
        onClick={handleRemoveBg}
        disabled={loading || !path}
      >
        {loading ? "Bearbetar..." : "Ta bort bakgrund"}
      </Button>

      {err && <p className="text-xs text-destructive">{err}</p>}

      {resultUrl && (
        <div className="space-y-2">
          <div className="w-48 h-48 rounded-xl overflow-hidden border border-border bg-secondary flex items-center justify-center">
            <img
              src={resultUrl}
              alt="Rensad bild"
              className="object-contain w-full h-full"
            />
          </div>
          <div className="text-xs text-muted-foreground">
            Rensad bild (sparad i Storage)
          </div>
        </div>
      )}
    </div>
  );
}