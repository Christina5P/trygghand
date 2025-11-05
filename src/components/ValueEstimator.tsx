import React, { useState, useRef, useEffect } from "react";
import { analyzeImage } from "@/components/services/geminiService"; 
import { uploadAndSaveValuation } from "@/lib/valuations"; 
import { Button } from "@/components/ui/button";
import { PlusCircle, Save, Camera, Loader2 } from "lucide-react";
import { toast } from "@/components/ui/use-toast";

// ✅ Gränssnitt för AI-resultatet
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
  onOpenSaved?: () => void; // parent callback to show saved valuations
  onNew?: () => void; // parent callback to switch to "new" (optional)
}

const ValueEstimator: React.FC<Props> = ({ customerId = null, onSaved, ...props }) => {
  const [files, setFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [analysisResult, setAnalysisResult] = useState<ValuationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);

  // Förhandsgranskning av bilder
  useEffect(() => {
    previewUrls.forEach((url) => URL.revokeObjectURL(url));
    const urls = files.map((f) => URL.createObjectURL(f));
    setPreviewUrls(urls);
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [files]);

  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const list = e.target.files ? Array.from(e.target.files) : [];
    const images = list.filter((f) => f.type.startsWith("image/"));
    setFiles(images);
    setAnalysisResult(null);
    e.target.value = ''; // tillåt samma fil igen
  };

  const openFilePicker = () => inputRef.current?.click();

  const openCameraPicker = () => cameraInputRef.current?.click();

  const handleCameraCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const list = e.target.files ? Array.from(e.target.files) : [];
    const images = list.filter((f) => f.type.startsWith("image/"));
    // Kamera-capture brukar vara en fil — behåll samma state-hantering som handleFiles
    if (images.length > 0) {
      setFiles(images);
      setAnalysisResult(null);
    }
    // nollställ värdet så samma fil kan väljas igen
    e.target.value = "";
  };

  const handleNewValuation = () => {
    // Reset current selection and analysis to start a new valuation
    setFiles([]);
    setPreviewUrls([]);
    setAnalysisResult(null);
    setError(null);
    // Also clear the file input so the same files can be picked again
    if (inputRef.current) inputRef.current.value = "";
    // notify parent if it wants to switch tab / state
    props.onNew?.();
  };

  const openSavedValuations = () => {
    // Ask parent to open saved valuations view if provided, otherwise fallback to toast
    if (props.onOpenSaved) {
      props.onOpenSaved();
      return;
    }
    toast({
      title: "Funktion saknas",
      description: "Visning av sparade värderingar är inte implementerad än."
    });
  };

  
  // Analysera bilder med AI
  const runAnalysis = async () => {
    setError(null);
    setLoading(true);
    setAnalysisResult(null);

    if (files.length === 0) {
      setError("Vänligen välj minst en bild att analysera.");
      setLoading(false);
      return;
    }

    try {
      const jsonString = await analyzeImage(files);
      const result: ValuationResult = JSON.parse(jsonString);
      setAnalysisResult(result);
    } catch (err) {
      console.error("Analysis Error:", err);
      setError(String(err instanceof Error ? err.message : "Okänt fel vid analys."));
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price: number) =>
    new Intl.NumberFormat('sv-SE', { style: 'currency', currency: 'SEK', maximumFractionDigits: 0 }).format(price);

  // Spara värdering + bilder
  const handleSaveValuation = async () => {
    setError(null);

    if (!customerId) {
      setError("Missing customerId. Logga in eller kontakta support.");
      return;
    }
    if (!analysisResult) {
      setError("Analys saknas att spara. Kör analysen först.");
      return;
    }
    if (files.length === 0) {
      setError("Inga bilder att spara.");
      return;
    }

    setLoading(true);
    try {
      const analysisJsonString = JSON.stringify(analysisResult);
      const saved = await uploadAndSaveValuation(customerId, analysisJsonString, files);

      // Ensure id is a string before calling substring
      const savedIdStr = saved && saved.id != null ? String(saved.id) : undefined;
      toast({
        title: "Sparat",
        description: `Värdering #${savedIdStr ? savedIdStr.substring(0, 8) : "okänd"} sparad.`
      });

      setFiles([]);
      setAnalysisResult(null);
      onSaved?.();
    } catch (err) {
      console.error("Save error:", err);
      setError(String(err instanceof Error ? err.message : "Misslyckades att spara värdering."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {/* Hidden inputs: vanlig fil och kamera-capture */}
      <input
        ref={inputRef}
        type="file"
        multiple
        accept="image/*"
        onChange={handleFiles}
        className="hidden"
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleCameraCapture}
        className="hidden"
      />
      
      {/* Card: flyttat upp så även 'Välj bilder' finns inuti kortet */}
      <div className="w-full mt-2 bg-white border rounded-lg shadow p-4">
        {/* Rubrik + knappar för Ny värdering / Sparade värderingar */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-2xl font-semibold leading-none tracking-tight">Värdera bilder</h3>
            <p className="text-sm text-muted-foreground">Analysera bilder och spara värdering</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={openSavedValuations} className="px-3 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200">
              <Save className="w-4 h-4 mr-2" />
              Sparade värderingar
            </Button>
          </div>
        </div>

        {/* Uppladdning och förhandsgranskning (nu inne i kortet) */}
        <div className="mb-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button
              onClick={openFilePicker}
              className="px-4 py-2 bg-trust-blue text-white rounded hover:bg-trust-blue/90 flex items-center"
              aria-label="Välj bilder"
              title="Välj bilder från enheten"
            >
              <PlusCircle className="w-4 h-4 mr-2" />
              Välj ({files.length})
            </Button>

            <Button
              onClick={openCameraPicker}
              className="px-3 py-2 bg-white text-gray-700 border rounded hover:bg-gray-50 flex items-center"
              aria-label="Öppna kamera"
              title="Ta bild med kamera (mobil)"
            >
              <Camera className="w-4 h-4 mr-2" />
              Kamera
            </Button>

            {files.length > 0 && (
              <div className="flex items-center gap-2">
                {previewUrls.slice(0, 3).map((url, i) => (
                  <button
                    key={i}
                    type="button"
                    aria-label={`Förhandsgranskning ${i + 1}`}
                    title={files[i]?.name ?? `preview-${i}`}
                    className="w-12 h-12 rounded-md overflow-hidden border p-0 flex items-center justify-center bg-white"
                  >
                    <img
                      src={url}
                      alt={files[i]?.name ?? `preview-${i}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}

                {files.length > 3 && (
                  <div className="w-12 h-12 rounded-md bg-gray-100 flex items-center justify-center text-sm text-warm-gray border">
                    +{files.length - 3}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <Button
              onClick={runAnalysis}
              disabled={loading || files.length === 0}
              className="px-4 py-2 bg-trust-green text-white rounded hover:bg-trust-green/90 flex items-center"
              aria-label="Analysera bilder"
              title="Analysera valda bilder"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {loading ? "Analyserar" : "Analysera"}
            </Button>

            <Button
              onClick={handleSaveValuation}
              disabled={loading || !analysisResult}
              className="px-4 py-2 bg-trust-blue text-white rounded hover:bg-trust-blue/90 flex items-center"
              aria-label="Spara värdering"
              title="Spara värdering med bilder"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
              Spara
            </Button>
          </div>
        </div>

        {error && <div className="text-red-600 mt-3 p-2 bg-red-100 border border-red-300 rounded text-sm whitespace-pre-wrap">{error}</div>}

        <div className="mt-4">
          {/* Resultat */}
          {analysisResult ? (
            <div className="w-full p-4 border border-trust-green bg-green-50 rounded-lg shadow-md">
              <h3 className="text-xl font-bold text-trust-green mb-3">AI Värderingsresultat</h3>
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
            <div className="w-full p-3 border rounded text-gray-500 h-32 flex items-center justify-center bg-white shadow-sm">
              {!loading && files.length > 0 ? "Klicka på 'Analysera' för att få en värdering." : "AI-värdering kommer att visas här."}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ValueEstimator;
