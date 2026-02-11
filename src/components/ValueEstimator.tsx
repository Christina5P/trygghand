import React, { useState, useRef, useEffect } from "react";
import { uploadImages } from "../integrations/supabaseUpload";
import { adminCreateValuation, saveValuation, deleteValuation } from "@/lib/valuations";
import { PlusCircle, Save, Camera, Loader2, Trash2 } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import type { Customer } from "@/types";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// =====================
// Typer
// =====================
interface ValuationResult {
  foremal_beskrivning: string;
  skick: string;
  varde_min_sek: number;
  varde_max_sek: number;
  motivering: string;
}

interface Props {
  customerId?: string | null;
  valuationId?: string | null; // krävs för radering
  onSaved?: () => void;
  onDeleted?: () => void;
  mode?: "customer" | "admin";
  customers?: Customer[];
}

// =====================
// Komponent
// =====================
const ValueEstimator: React.FC<Props> = ({
  customerId = null,
  valuationId = null,
  onSaved,
  onDeleted,
  mode = "customer",
  customers = [],
}) => {
  const [files, setFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [analysisResult, setAnalysisResult] = useState<ValuationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingText, setLoadingText] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [extraPrompt, setExtraPrompt] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");

  const inputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);

  const MAX_FILE_SIZE = 50 * 1024 * 1024;

  // =====================
  // Preview cleanup
  // =====================
  useEffect(() => {
    previewUrls.forEach((url) => URL.revokeObjectURL(url));
    const urls = files.map((f) => URL.createObjectURL(f));
    setPreviewUrls(urls);
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, [files]);

  useEffect(() => {
    if (mode !== "admin") return;
    if (customers.length > 0) {
      setSelectedCustomerId(customers[0].id);
    }
  }, [mode, customers]);

  // =====================
  // Filhantering
  // =====================
  const addFiles = (incoming: File[]) => {
    const images = incoming.filter((f) => f.type.startsWith("image/"));

    if (images.some((f) => f.size > MAX_FILE_SIZE)) {
      setError("En eller flera bilder är för stora (max 50 MB).");
      return;
    }

    setFiles((prev) => [...prev, ...images]);
    setAnalysisResult(null);
  };

  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    if (e.target.files) addFiles(Array.from(e.target.files));
    e.target.value = "";
  };

  const handleCameraCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    if (e.target.files) addFiles(Array.from(e.target.files));
    e.target.value = "";
  };

  // =====================
  // Drag & Drop
  // =====================
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setError(null);
    addFiles(Array.from(e.dataTransfer.files));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const resizeImage = async (file: File, maxDimension = 1280): Promise<File> => {
    try {
      if (!file.type.startsWith("image/")) return file;

      const bitmap = await createImageBitmap(file);
      const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));

      if (scale >= 1) return file;

      const width = Math.max(1, Math.round(bitmap.width * scale));
      const height = Math.max(1, Math.round(bitmap.height * scale));

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (!ctx) return file;

      ctx.drawImage(bitmap, 0, 0, width, height);

      const blob: Blob = await new Promise((resolve, reject) => {
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error("Kunde inte skapa bildblob"))),
          "image/jpeg",
          0.85
        );
      });

      const baseName = file.name.replace(/\.[^/.]+$/, "");
      return new File([blob], `${baseName}-1280.jpg`, {
        type: "image/jpeg",
        lastModified: file.lastModified,
      });
    } catch (e) {
      console.warn("resizeImage failed, using original", e);
      return file;
    }
  };

  // =====================
  // Analys
  // =====================
  const runAnalysis = async () => {
    setError(null);
    setLoading(true);
    setLoadingText("");
    setAnalysisResult(null);

    if (files.length === 0) {
      setError("Välj minst en bild att analysera.");
      setLoading(false);
      return;
    }

    if (files.length > 3) {
      setError("Välj max 3 bilder för analys.");
      setLoading(false);
      return;
    }

    try {
      const targetCustomerId = mode === "admin" ? selectedCustomerId : customerId;
      if (!targetCustomerId) {
        setError("Kund saknas för uppladdning.");
        setLoading(false);
        return;
      }
      const functionBase = import.meta.env.VITE_SUPABASE_FUNCTION_URL;
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      setLoadingText("Analyserar bilder…");
      const resizedFiles = await Promise.all(files.map((f) => resizeImage(f, 1280)));

      const imageUrls = await uploadImages(resizedFiles, "analysis-temp", {
        customerId: targetCustomerId,
        returnType: "signedUrl",
      });

      setLoadingText("Bedömer skick…");

      const response = await fetch(`${functionBase}/analyze-item`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: anonKey,
          Authorization: `Bearer ${anonKey}`,
        },
        body: JSON.stringify({
          imageUrls,
          comments: extraPrompt || undefined,
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: "Okänt fel" }));
        throw new Error(err.error || "Analysen misslyckades");
      }

      setLoadingText("Beräknar värde…");
      const result: ValuationResult = await response.json();
      setAnalysisResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Okänt fel vid analys.");
    } finally {
      setLoading(false);
      setLoadingText("");
    }
  };

  const formatPrice = (price: number) =>
    new Intl.NumberFormat("sv-SE", {
      style: "currency",
      currency: "SEK",
      maximumFractionDigits: 0,
    }).format(price);

  // =====================
  // Spara
  // =====================
  const handleSaveValuation = async () => {
    if (!analysisResult) {
      setError("Ingen värdering att spara.");
      return;
    }

    if (mode === "admin" && !selectedCustomerId) {
      setError("Välj kund för att spara värderingen.");
      return;
    }

    if (mode !== "admin" && !customerId) {
      setError("Ingen värdering att spara.");
      return;
    }

    setLoading(true);
    try {
      const targetCustomerId = mode === "admin" ? selectedCustomerId : customerId;
      if (!targetCustomerId) {
        throw new Error("Kund saknas för uppladdning.");
      }

      const imageUrls = await uploadImages(files, "valuations", {
        customerId: targetCustomerId,
        returnType: "path",
      });

      if (mode === "admin") {
        await adminCreateValuation(
          { analysis_result: analysisResult, source: "value_estimator" },
          imageUrls,
          selectedCustomerId
        );
      } else {
        await saveValuation(
          { analysis_result: analysisResult, source: "value_estimator" },
          imageUrls
        );
      }

      toast({
        title: "Sparat",
        description: "Värderingen har sparats.",
      });

      setFiles([]);
      setAnalysisResult(null);
      onSaved?.();
    } catch {
      toast({
        title: "Fel",
        description: "Kunde inte spara värderingen.",
      });
    } finally {
      setLoading(false);
    }
  };

  // =====================
  // Radera värdering
  // =====================
  const handleDeleteValuation = async () => {
    if (!valuationId) return;

    if (!confirm("Vill du radera denna värdering? Detta går inte att ångra.")) {
      return;
    }

    try {
      await deleteValuation(valuationId);
      toast({ title: "Raderad", description: "Värderingen har raderats." });
      onDeleted?.();
    } catch {
      toast({
        title: "Fel",
        description: "Kunde inte radera värderingen.",
      });
    }
  };

  // =====================
  // Render
  // =====================
  return (
    <div className="w-full max-w-4xl mx-auto px-4">
      {/* Hidden inputs */}
      <input ref={inputRef} type="file" multiple accept="image/*" onChange={handleFiles} className="hidden" />
      <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" onChange={handleCameraCapture} className="hidden" />

      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        className="mt-6 bg-white border rounded-lg shadow p-4 md:p-6"
      >
        {/* Upload controls */}
        {mode === "admin" && (
          <div className="mb-4">
            <div className="text-sm font-medium mb-1">Kund för värdering</div>
            <Select value={selectedCustomerId} onValueChange={setSelectedCustomerId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Välj kund" />
              </SelectTrigger>
              <SelectContent>
                {customers.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name || c.email || c.id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="flex gap-2 mb-4">
          <Button onClick={() => inputRef.current?.click()} className="bg-trust-blue text-white">
            <PlusCircle className="w-4 h-4 mr-2" /> Välj ({files.length})
          </Button>
          <Button onClick={() => cameraInputRef.current?.click()} variant="outline">
            <Camera className="w-4 h-4 mr-2" /> Kamera
          </Button>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 mb-4">
          <Button
            onClick={runAnalysis}
            disabled={loading || files.length === 0}
            className="bg-trust-green text-white hover:bg-trust-green/90"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            Analysera
          </Button>

          <Button
            onClick={handleSaveValuation}
            disabled={loading || !analysisResult}
            className="bg-trust-blue text-white"
          >
            <Save className="w-4 h-4 mr-2" />
            Spara
          </Button>

          {valuationId && (
            <Button onClick={handleDeleteValuation} variant="destructive">
              <Trash2 className="w-4 h-4 mr-2" />
              Radera
            </Button>
          )}
        </div>

        {loading && loadingText && (
          <div className="text-sm text-gray-600 mb-3">{loadingText}</div>
        )}

        {/* Extra information – placeholder återställd */}
        <textarea
          value={extraPrompt}
          onChange={(e) => setExtraPrompt(e.target.value)}
          placeholder="Beskriv ålder, märke, material, skick och andra detaljer som hjälper analysen"
          className="w-full border rounded p-2 min-h-[80px] text-sm mb-3"
        />

        {/* GDPR-korttext */}
        <p className="text-xs text-gray-500 mb-3">
          Bilder som används för analys raderas automatiskt inom 24 timmar om värderingen inte sparas.
        </p>

        {error && (
          <div className="text-red-600 bg-red-100 border border-red-300 p-2 rounded text-sm">
            {error}
          </div>
        )}

        {/* Resultat */}
        {analysisResult && (
          <div className="mt-4 border border-trust-green bg-green-50 p-4 rounded">
            <h3 className="font-bold text-trust-green mb-2">AI-värderingsresultat</h3>
            <p className="text-xl font-bold mb-2">
              {formatPrice(analysisResult.varde_min_sek)} – {formatPrice(analysisResult.varde_max_sek)}
            </p>
            <p><strong>Beskrivning:</strong> {analysisResult.foremal_beskrivning}</p>
            <p><strong>Skick:</strong> {analysisResult.skick}</p>
            <p><strong>Motivering:</strong> {analysisResult.motivering}</p>
          </div>
        )}

        {/* Preview */}
        <div className="grid grid-cols-3 gap-2 mt-4">
          {previewUrls.map((url, i) => (
            <img key={i} src={url} className="h-24 w-full object-cover rounded border" />
          ))}
        </div>
      </div>
    </div>
  );
};

export default ValueEstimator;
