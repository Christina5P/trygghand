import React, { useState, useRef, useEffect, DragEvent } from "react";
import { uploadImages } from "../integrations/supabaseUpload";
import { saveValuation } from "@/lib/valuations";
import { PlusCircle, Save, Camera, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";

interface ValuationResult {
  foremal_beskrivning: string;
  skick: string;
  varde_min_sek: number;
  varde_max_sek: number;
  motivering: string;
}

interface Props {
  customerId?: string | null;
  onSaved?: () => void;
}

const ValueEstimator: React.FC<Props> = ({ customerId, onSaved }) => {
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [comments, setComments] = useState("");
  const [analysis, setAnalysis] = useState<ValuationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    previews.forEach(URL.revokeObjectURL);
    setPreviews(files.map((f) => URL.createObjectURL(f)));
  }, [files]);

  const addFiles = (list: File[]) => {
    const images = list.filter((f) => f.type.startsWith("image/"));
    setFiles(images);
    setAnalysis(null);
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    addFiles(Array.from(e.dataTransfer.files));
  };

  const runAnalysis = async () => {
    setError(null);
    setLoading(true);

    try {
      const functionBase = import.meta.env.VITE_SUPABASE_FUNCTION_URL;
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      const imageUrls = await uploadImages(files);

      const res = await fetch(`${functionBase}/analyze-item`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: anonKey,
          Authorization: `Bearer ${anonKey}`,
        },
        body: JSON.stringify({ imageUrls, comments }),
      });

      if (!res.ok) {
        const e = await res.json();
        throw new Error(e.error || "Analys misslyckades");
      }

      setAnalysis(await res.json());
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const save = async () => {
    if (!analysis || !customerId) return;
    const imageUrls = await uploadImages(files);
    await saveValuation({ analysis_result: analysis, source: "value_estimator" }, imageUrls);
    toast({ title: "Sparat", description: "Värdering sparad" });
    onSaved?.();
  };

  return (
    <div
      className="border rounded-lg p-4 bg-white"
      onDragOver={(e) => e.preventDefault()}
      onDrop={onDrop}
    >
      <input ref={inputRef} type="file" hidden multiple accept="image/*" onChange={(e) => addFiles(Array.from(e.target.files || []))} />
      <input ref={cameraRef} type="file" hidden accept="image/*" capture="environment" onChange={(e) => addFiles(Array.from(e.target.files || []))} />

      <div className="flex gap-2">
        <Button onClick={() => inputRef.current?.click()}>
          <PlusCircle className="mr-2 h-4 w-4" /> Välj
        </Button>
        <Button variant="outline" onClick={() => cameraRef.current?.click()}>
          <Camera className="mr-2 h-4 w-4" /> Kamera
        </Button>
      </div>

      <textarea
        className="w-full mt-4 border rounded p-2"
        placeholder="Kommentarer om föremålet (valfritt)"
        value={comments}
        onChange={(e) => setComments(e.target.value)}
      />

      <div className="flex gap-2 mt-4">
        <Button onClick={runAnalysis} disabled={loading || files.length === 0}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Analysera
        </Button>
        <Button onClick={save} disabled={!analysis}>
          <Save className="mr-2 h-4 w-4" /> Spara
        </Button>
      </div>

      {error && <div className="text-red-600 mt-2">{error}</div>}

      <div className="grid grid-cols-3 gap-2 mt-4">
        {previews.map((p, i) => (
          <img key={i} src={p} className="rounded border object-cover" />
        ))}
      </div>

      {analysis && (
        <div className="mt-4 p-3 bg-green-50 border rounded">
          <strong>
            {analysis.varde_min_sek} – {analysis.varde_max_sek} SEK
          </strong>
          <p>{analysis.foremal_beskrivning}</p>
          <p>{analysis.motivering}</p>
        </div>
      )}
    </div>
  );
};

export default ValueEstimator;
