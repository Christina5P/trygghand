import React, { useState, useRef, useEffect, useMemo } from "react";
// Importera den nu korrigerade analyzeImage funktionen
import { analyzeImage } from "@/components/services/geminiService"; 
import { saveValuation } from "@/lib/valuations";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";

// ✅ NYTT GRÄNSSNITT för AI-svaret
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

export const ValueEstimator: React.FC<Props> = ({ customerId = null, onSaved }) => {
  const [files, setFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  // ✅ ÄNDRAD: Spara det strukturerade resultatet i ett objekt
  const [analysisResult, setAnalysisResult] = useState<ValuationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Skapar förhandsgranskningar och rensar upp Object URLs
  useEffect(() => {
    previewUrls.forEach((url) => URL.revokeObjectURL(url));
    const urls = files.map((f) => URL.createObjectURL(f));
    setPreviewUrls(urls);

    return () => {
      urls.forEach((u) => URL.revokeObjectURL(u));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [files]);

  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const list = e.target.files ? Array.from(e.target.files) : [];
    const images = list.filter((f) => f.type.startsWith("image/"));
    setFiles(images);
    setAnalysisResult(null); // Rensa analysen vid nya filer
  };

  const openFilePicker = () => {
    inputRef.current?.click();
  };

  // ✅ ÄNDRAD: Parsar JSON-svaret
  const runAnalysis = async () => {
    setError(null);
    setLoading(true);
    setAnalysisResult(null);
    try {
      // Anropa den korrigerade funktionen
      const jsonString = await analyzeImage(files);
      
      // Försök parsa JSON-strängen
      const result: ValuationResult = JSON.parse(jsonString);
      setAnalysisResult(result);

    } catch (err) {
      setError(String(err ?? "Unknown error during analysis"));
    } finally {
      setLoading(false);
    }
  };

  // Format funktion för priserna
  const formatPrice = (price: number) => 
    new Intl.NumberFormat('sv-SE', { style: 'currency', currency: 'SEK', maximumFractionDigits: 0 }).format(price);

  const save = async () => {
    setError(null);
    if (!customerId) {
      setError("Missing customerId");
      return;
    }
    if (!analysisResult) {
      setError("Analys saknas att spara.");
      return;
    }
    
    setLoading(true);
    try {
      // Skicka JSON-strängen till sparfunktionen (viktigt att skicka JSON, inte objektet)
      const analysisJsonString = JSON.stringify(analysisResult); 
      const imageUrls = files.map((f) => f.name); 
      await saveValuation(customerId, analysisJsonString, imageUrls);
      onSaved?.();
    } catch (err) {
      setError(String(err ?? "Misslyckades att spara värdering"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept="image/*"
        onChange={handleFiles}
        className="hidden"
      />

      {/* Uppladdnings- och förhandsgranskningsdel */}
      <div className="mb-4 flex items-center gap-4">
        <Button onClick={openFilePicker} className="px-4 py-2 bg-trust-blue text-white rounded">
          <PlusCircle className="w-4 h-4 mr-2" />
          Välj bilder
        </Button>

        {files.length > 0 && (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              {previewUrls.slice(0, 3).map((url, i) => (
                <div key={i} className="w-20 h-20 bg-gray-50 rounded-md overflow-hidden border">
                  <img src={url} alt={files[i]?.name ?? `preview-${i}`} className="w-full h-full object-cover" />
                </div>
              ))}
              {files.length > 3 && (
                <span className="text-sm text-warm-gray">+{files.length - 3}</span>
              )}
            </div>
            <div className="text-sm text-warm-gray">
              {files.length} bild{files.length > 1 ? "er" : ""} valda
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-3">
        <Button onClick={runAnalysis} disabled={loading || files.length === 0}>
          {loading ? "Analyserar..." : "Analysera"}
        </Button>

        <Button onClick={save} disabled={loading || !analysisResult}>
          {loading ? "Sparar..." : "Spara värdering"}
        </Button>
      </div>

      {error && <div className="text-red-600 mt-3">{error}</div>}

      {/* ✅ NY PRESENTATION AV RESULTATET */}
      {analysisResult ? (
        <div className="w-full mt-4 p-4 border border-green-500 bg-green-50 rounded-lg">
          <h3 className="text-xl font-bold text-green-700 mb-3">AI Värderingsresultat</h3>
          <div className="text-2xl font-extrabold mb-4 border-b pb-2 text-primary">
            Uppskattat värde: {formatPrice(analysisResult.varde_min_sek)} - {formatPrice(analysisResult.varde_max_sek)}
          </div>
          
          <div className="space-y-3 text-sm">
            <p><strong>Föremålsbeskrivning:</strong> {analysisResult.foremal_beskrivning}</p>
            <p><strong>Skick:</strong> {analysisResult.skick}</p>
            <p><strong>Motivering:</strong> {analysisResult.motivering}</p>
          </div>
        </div>
      ) : (
        <div className="w-full mt-4 p-3 border rounded text-gray-500 h-32 flex items-center justify-center">
          {!loading && files.length > 0 ? "Klicka på 'Analysera' för att få en värdering." : "AI-värdering kommer att visas här."}
        </div>
      )}
    </div>
  );
};

export default ValueEstimator;