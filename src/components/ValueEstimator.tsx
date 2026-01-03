import React, { useState, useRef, useEffect } from "react";
import { analyzeImageViaApi } from "@/lib/services/geminiApiService"; 
import { uploadImages } from '../integrations/supabaseUpload'; 
import { saveValuation } from "@/lib/valuations"; 
import { PlusCircle, Save, Camera, Loader2 } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";


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
  const [extraPrompt, setExtraPrompt] = useState<string>("");
  const inputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);

  const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB per fil (ändra vid behov)

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
    const tooLarge = images.filter((f) => f.size > MAX_FILE_SIZE);
    if (tooLarge.length > 0) {
      setError(`Filer överstiger maxstorlek (${Math.round(MAX_FILE_SIZE / (1024*1024))} MB). Ta bort stora filer eller minska storleken.`);
      e.target.value = "";
      return;
    }
    setFiles(images);
    setAnalysisResult(null);
    e.target.value = ''; // tillåt samma fil igen
  };

  const openFilePicker = () => inputRef.current?.click();

  const openCameraPicker = () => cameraInputRef.current?.click();

  // samma kontroll även för kamera-capture
  const handleCameraCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const list = e.target.files ? Array.from(e.target.files) : [];
    const images = list.filter((f) => f.type.startsWith("image/"));
    if (images.some((f) => f.size > MAX_FILE_SIZE)) {
      setError(`Filen överstiger maxstorlek (${Math.round(MAX_FILE_SIZE / (1024*1024))} MB).`);
      e.target.value = "";
      return;
    }
    if (images.length > 0) {
      setFiles(images);
      setAnalysisResult(null);
    }
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
      // Skicka extraPrompt så modellen får kompletterande info från användaren
      // analyzeImageViaApi anropar din SÄKRA Edge Function
      const jsonString = await analyzeImageViaApi(files, extraPrompt);
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

    console.debug("handleSaveValuation start", { customerId, filesCount: files.length, analysisResult });

    if (!customerId) {
      setError("Missing customerId. Logga in eller kontakta support.");
      console.warn("Missing customerId when saving valuation");
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
        // STEG 1: Ladda upp bilder till Supabase Storage (med Klient-Supabase)
        // uploadImages SKA importeras från 'supabaseUpload' och är funktionen som returnerar string[]
        console.debug("1. Uploading images to Storage...");
        const imageUrls = await uploadImages(files); 

        // STEG 2: Spara värdering och URL:er (med Klient-Fetch till din säkra Backend/Edge Function)
        console.debug("2. Saving valuation to backend API...");
        // imageUrls är nu garanterat string[], vilket löser ditt tidigare typfel!
        const analysisPayload = {
          analysis_result: analysisResult,
          source: "value_estimator",
        };
        await saveValuation(analysisPayload, imageUrls);
      toast({
        title: "Sparat",
        description: `Värdering sparad.`});
      setFiles([]);
      setAnalysisResult(null);
      onSaved?.();
    } catch (err) {
      console.error("Save error:", err);
      const msg = err && (err as any).message ? (err as any).message : "Misslyckades att spara värdering.";
      setError(msg);
      toast({
        title: "Kunde inte spara",
        description: msg
      });
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Hidden inputs */}
      <input ref={inputRef} type="file" multiple accept="image/*" onChange={handleFiles} className="hidden" />
      <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" onChange={handleCameraCapture} className="hidden" />

      <div className="mt-6 bg-white border rounded-lg shadow p-4 md:p-6">
        <div className="md:flex md:items-start md:justify-between gap-4">
         
 
        </div>

        {/* Controls + preview */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="col-span-2">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex flex-wrap gap-2">
                <Button onClick={openFilePicker} className="px-4 py-2 bg-trust-blue text-white rounded hover:bg-trust-blue/90 flex items-center w-full sm:w-auto">
                  <PlusCircle className="w-4 h-4 mr-2" />
                  Välj ({files.length})
                </Button>
                <Button onClick={openCameraPicker} className="px-3 py-2 bg-white text-gray-700 border rounded hover:bg-gray-50 flex items-center w-full sm:w-auto">
                  <Camera className="w-4 h-4 mr-2" />
                  Kamera
                </Button>
              </div>

              <div className="flex gap-2 w-full sm:w-auto">
                <Button
                  onClick={runAnalysis}
                  disabled={loading || files.length === 0}
                  className="px-4 py-2 bg-trust-green text-white rounded hover:bg-trust-green/90 flex-1 sm:flex-none"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  {loading ? "Analyserar" : "Analysera"}
                </Button>
                <Button
                  onClick={handleSaveValuation}
                  disabled={loading || !analysisResult}
                  className="px-4 py-2 bg-trust-blue text-white rounded hover:bg-trust-blue/90 flex-1 sm:flex-none"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                  Spara
                </Button>
              </div>
            </div>

            {/* Extra prompt */}
            <div className="mt-4">
              <label className="block text-sm font-medium mb-2">Mer information (valfritt)</label>
              <textarea
                value={extraPrompt}
                onChange={(e) => setExtraPrompt(e.target.value)}
                placeholder="Beskriv ålder, material, skick eller andra detaljer som kan hjälpa analysen..."
                className="w-full rounded-md border border-input p-2 min-h-[80px] text-sm"
              />
            </div>

            {error && <div className="text-red-600 mt-3 p-2 bg-red-100 border border-red-300 rounded text-sm whitespace-pre-wrap">{error}</div>}

            {/* Resultat */}
            <div className="mt-4">
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

          {/* Preview column */}
          <div>
            <div className="grid grid-cols-3 sm:grid-cols-1 md:grid-cols-1 gap-2">
              {previewUrls.length > 0 ? (
                <div className="grid grid-cols-3 gap-2 md:grid-cols-1">
                  {previewUrls.map((url, i) => (
                    <div key={i} className="w-full h-24 md:h-32 rounded-md overflow-hidden border bg-white flex items-center justify-center">
                      <img src={url} alt={files[i]?.name ?? `preview-${i}`} className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="w-full h-32 rounded-md border border-dashed flex items-center justify-center text-sm text-gray-400 bg-gray-50">
                  Förhandsgranskning visas här
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ValueEstimator;