import React, { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";

type Props = {
  listingId: string;
  sourceImagePaths: string[]; // storage paths i private bucket
  sourceBucket?: "handplockat-private"; // valfri, default private
  onDone?: (publicUrls: string[]) => void;
};

export default function ImageCleaner({
  listingId,
  sourceImagePaths,
  sourceBucket = "handplockat-private",
  onDone,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [publicUrls, setPublicUrls] = useState<string[]>([]);
  const [err, setErr] = useState<string | null>(null);

  const handleRemoveBg = async () => {
    if (!listingId || !sourceImagePaths?.length) return;

    setLoading(true);
    setErr(null);

    try {
      // Säkerställ att vi skickar storage-paths (inte URL)
      if (sourceImagePaths.some((p) => /^https?:\/\//i.test(p))) {
        throw new Error("sourceImagePaths måste vara storage-paths (inte URL).");
      }

      const { data, error } = await supabase.functions.invoke("handplockat-generate-images", {
        body: {
          listing_id: listingId,
          source_image_paths: sourceImagePaths,
          
        },
      });

      if (error) throw error;
      if (!data?.public_urls?.length) throw new Error("Inga public_urls returnerades.");

      setPublicUrls(data.public_urls);
      onDone?.(data.public_urls);
    } catch (e: any) {
      console.error(e);
      setErr(typeof e?.message === "string" ? e.message : "Kunde inte ta bort bakgrund.");
    } finally {
      setLoading(false);
    }
  };

  const first = publicUrls[0] ?? null;

  return (
    <div className="space-y-3">
      <Button
        type="button"
        variant="outline"
        onClick={handleRemoveBg}
        disabled={loading || !listingId || sourceImagePaths.length === 0}
      >
        {loading ? "Bearbetar..." : "Ta bort bakgrund"}
      </Button>

      {err && <p className="text-xs text-destructive">{err}</p>}

      {first && (
        <div className="space-y-2">
          <div className="w-48 h-48 rounded-xl overflow-hidden border border-border bg-secondary flex items-center justify-center">
            <img src={first} alt="Rensad bild" className="object-contain w-full h-full" />
          </div>
          <div className="text-xs text-muted-foreground">Rensad bild (sparad i handplockat-public)</div>
        </div>
      )}
    </div>
  );
}