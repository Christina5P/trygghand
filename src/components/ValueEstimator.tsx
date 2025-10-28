import React, { useState } from "react";
import { analyzeImages } from "./services/geminiService";
import { saveValuation } from "../lib/valuations";

interface Props {
  customerId?: string | null;
  onSaved?: () => void;
}

export const ValueEstimator: React.FC<Props> = ({ customerId = null, onSaved }) => {
  const [files, setFiles] = useState<File[]>([]);
  const [analysis, setAnalysis] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const list = e.target.files ? Array.from(e.target.files) : [];
    setFiles(list);
  };

  const runAnalysis = async () => {
    setError(null);
    setLoading(true);
    try {
      const result = await analyzeImages(files);
      setAnalysis(result);
    } catch (err) {
      setError(String(err ?? "Unknown error during analysis"));
    } finally {
      setLoading(false);
    }
  };

  const save = async () => {
    setError(null);
    if (!customerId) {
      setError("Missing customerId");
      return;
    }
    setLoading(true);
    try {
      const imageUrls = files.map((f) => f.name); // replace with actual upload URLs if available
      await saveValuation(customerId, analysis, imageUrls);
      onSaved?.();
    } catch (err) {
      setError(String(err ?? "Failed to save valuation"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <label>
        Upload images
        <input type="file" multiple accept="image/*" onChange={handleFiles} />
      </label>

      <div>
        <button onClick={runAnalysis} disabled={loading || files.length === 0}>
          {loading ? "Analyzing..." : "Analyze"}
        </button>

        <button onClick={save} disabled={loading || !analysis}>
          {loading ? "Saving..." : "Save Valuation"}
        </button>
      </div>

      {error && <div style={{ color: "red" }}>{error}</div>}

      <textarea
        readOnly
        value={analysis}
        placeholder="AI analysis will appear here"
        rows={8}
        style={{ width: "100%", marginTop: 8 }}
      />
    </div>
  );
};

export default ValueEstimator;
