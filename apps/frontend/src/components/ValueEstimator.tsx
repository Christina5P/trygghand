import React, { useRef, useState, useEffect } from "react";
import { analyzeImages } from "./services/geminiService";

interface Props { customerId?: string | null; onSaved?: () => void; }

export const ValueEstimator: React.FC<Props> = ({ customerId = null, onSaved }) => {
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [analysis, setAnalysis] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const MAX_FILES = 5;

  useEffect(() => {
    const urls = files.map((f) => URL.createObjectURL(f));
    setPreviews(urls);
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, [files]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const list = e.target.files ? Array.from(e.target.files) : [];
    const next = [...files, ...list].slice(0, MAX_FILES);
    setFiles(next);
    if (inputRef.current) inputRef.current.value = "";
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAnalyze = async () => {
    setError(null);
    setAnalysis("");
    if (!files || files.length === 0) {
      setError("Välj minst en bild först.");
      return;
    }
    setLoading(true);
    try {
      console.log("Calling analyzeImages with files:", files.map(f => f.name));
      const result = await analyzeImages(files);
      console.log("analyzeImages result:", result);
      setAnalysis(result ?? "");
    } catch (err: any) {
      console.error("Analyze error:", err);
      setError(err?.message ?? "Kunde inte analysera bilderna");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">AI‑värdering</h3>
        <div className="text-sm text-gray-500">{files.length} / {MAX_FILES} bilder</div>
      </div>

      <div className="mb-3 flex gap-2">
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleFileChange}
        />
        <button onClick={() => inputRef.current?.click()} className="px-3 py-2 bg-indigo-600 text-white rounded">
          Lägg till bilder
        </button>
        <button
          onClick={handleAnalyze}
          disabled={loading || files.length === 0}
          className="ml-2 px-3 py-2 bg-emerald-600 text-white rounded disabled:opacity-50"
        >
          {loading ? "Analyserar..." : "Analysera"}
        </button>
        <button
          onClick={() => { setFiles([]); setAnalysis(""); setError(null); onSaved?.(); }}
          className="ml-2 px-3 py-2 bg-gray-200 text-gray-800 rounded"
        >
          Stäng
        </button>
      </div>

      {previews.length > 0 && (
        <div className="grid grid-cols-3 gap-2 mb-3">
          {previews.map((src, i) => (
            <div key={src} className="relative">
              <img src={src} alt={`preview-${i}`} className="w-full h-24 object-cover rounded" />
              <button
                onClick={() => removeFile(i)}
                className="absolute top-1 right-1 bg-white/80 rounded-full p-1 text-sm"
                aria-label="Remove image"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {error && <p className="text-sm text-red-600 mb-2">{error}</p>}

      <label className="block text-sm font-medium mb-1">Analys</label>
      <textarea readOnly value={analysis} rows={8} className="w-full p-2 border rounded text-sm" placeholder="Analys kommer här" />
    </div>
  );
};

export default ValueEstimator;
