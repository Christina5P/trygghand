// Fix for window._pendingLocalPreviews type
declare global {
  interface Window {
    _pendingLocalPreviews?: string[];
  }
}
// /workspaces/trygghand/src/pages/Handplockat/HandplockatCreate.tsx

import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Seo from "@/components/Seo";
import { Button } from "@/components/ui/button";
import {
  createHandplockatListing,
  normalizeUrlList,
  parseJsonInput,
} from "@/lib/handplockat";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import type { HandplockatSource, HandplockatStatus, Valuation } from "@/types";
import { removeBackground } from "@imgly/background-removal";

const COMPANY_SMS = "+46761169554";
const CONTACT_EMAIL = "kontakt@trygghand.com";

type TouchedField =
  | "title"
  | "description"
  | "priceSek"
  | "skick"
  | "category"
  | "itemType"
  | "size"
  | "dimensionLength"
  | "dimensionWidth"
  | "dimensionHeight"
  | "pickupDeadlineAt"
  | "imagesOriginalRaw";

type BucketName = "handplockat-private" | "images";

const toLocalDateValue = (date: Date) => {
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
};

const addDays = (days: number) =>
  new Date(Date.now() + days * 24 * 60 * 60 * 1000);

const getErrorMessage = (err: unknown, fallback: string) => {
  if (err && typeof err === "object" && "message" in err) {
    const msg = (err as { message?: unknown }).message;
    if (typeof msg === "string" && msg.trim()) return msg;
  }
  return fallback;
};

function basePathWithoutExt(path: string): string {
  return String(path || "").replace(/\.(png|jpg|jpeg|webp)$/i, "");
}

function isUuid(v: unknown): v is string {
  return (
    typeof v === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v)
  );
}

function generateUuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

const shouldFill = (
  touched: Record<string, boolean>,
  key: TouchedField,
  value: string
) => !touched[key] && !value.trim();

const deriveCategory = (payload: any): string => {
  if (typeof payload?.kategori === "string") return payload.kategori;
  if (Array.isArray(payload?.taggar)) {
    const tags = payload.taggar.map((t: string) => String(t).toLowerCase());
    if (tags.some((t: string) => t.includes("kläder") || t.includes("klader") || t.includes("byxa") || t.includes("tröja") || t.includes("troja"))) return "Kläder & Skor";
    if (tags.some((t: string) => t.includes("lampa") || t.includes("belys"))) return "Belysning";
    if (tags.some((t: string) => t.includes("bord") || t.includes("stol") || t.includes("soffa"))) return "Möbler";
    if (tags.some((t: string) => t.includes("textil") || t.includes("matta"))) return "Textil";
  }
  return "";
};

const isClothingItem = (payload: any): boolean => {
  if (typeof payload?.kategori === "string" && payload.kategori.toLowerCase().includes("kläd")) return true;
  if (Array.isArray(payload?.taggar)) {
    const tags = payload.taggar.map((t: string) => String(t).toLowerCase());
    return tags.some((t: string) => t.includes("kläder") || t.includes("klader") || t.includes("byxa") || t.includes("tröja") || t.includes("troja"));
  }
  return false;
};

const isHttpUrl = (v: string) => /^https?:\/\//i.test(String(v || "").trim());

function getCutoutStoragePath(cutoutUrl: string, fallbackListingId: string): string {
  try {
    const parsed = new URL(cutoutUrl, window.location.origin);
    const marker = "/handplockat-public/";
    const idx = parsed.pathname.indexOf(marker);
    if (idx >= 0) {
      const path = parsed.pathname.slice(idx + marker.length);
      if (path) return decodeURIComponent(path);
    }
  } catch {
    // ignore
  }
  return `handplockat/${fallbackListingId}/1.webp`;
}

function ensureValuationFolder(path: string): string {
  const p = String(path || "").trim().replace(/^\/+/, "");
  if (!p) return p;
  if (p.includes("/")) return p;
  return `valuations/${p}`;
}

async function tryCreateSignedUrl(pathOrUrl: string, expiresIn = 600): Promise<string | null> {
  const value = String(pathOrUrl || "").trim();
  if (!value) return null;
  if (isHttpUrl(value)) return value;
  const buckets: BucketName[] = ["handplockat-private", "images"];
  for (const bucket of buckets) {
    const { data, error } = await supabase.storage.from(bucket).createSignedUrl(value, expiresIn);
    if (!error && data?.signedUrl) return data.signedUrl;
  }
  if (!value.includes("/")) {
    const vPath = ensureValuationFolder(value);
    const { data, error } = await supabase.storage.from("images").createSignedUrl(vPath, expiresIn);
    if (!error && data?.signedUrl) return data.signedUrl;
  }
  return null;
}

async function rotateBlob(blob: Blob, rotationDeg: 0 | 90 | 180 | 270): Promise<Blob> {
  if (rotationDeg === 0) return blob;
  const img = await createImageBitmap(blob);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return blob;
  const swap = rotationDeg === 90 || rotationDeg === 270;
  canvas.width = swap ? img.height : img.width;
  canvas.height = swap ? img.width : img.height;
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate((rotationDeg * Math.PI) / 180);
  ctx.drawImage(img, -img.width / 2, -img.height / 2);
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => {
      if (!b) return reject(new Error("Kunde inte rotera bilden."));
      resolve(b);
    }, "image/png");
  });
}

async function optimizeListingImageBlob(blob: Blob, maxDimension = 1600): Promise<{ blob: Blob; extension: "webp"; contentType: "image/webp" }> {
  const image = await createImageBitmap(blob);
  const longestSide = Math.max(image.width, image.height);
  const scale = longestSide > maxDimension ? maxDimension / longestSide : 1;
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Kunde inte skapa canvas för bildoptimering.");
  ctx.drawImage(image, 0, 0, width, height);
  const webpBlob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((next) => {
      if (!next) return reject(new Error("Kunde inte skapa WebP-bild."));
      resolve(next);
    }, "image/webp", 0.82);
  });
  return { blob: webpBlob, extension: "webp", contentType: "image/webp" };
}

async function removeBgLocalAndUpload(args: {
  listingId: string;
  sourcePathOrUrl: string;
  rotationDeg: 0 | 90 | 180 | 270;
  targetIndex: number;
  targetPathOverride?: string;
}): Promise<string> {
  const { listingId, sourcePathOrUrl, rotationDeg, targetIndex, targetPathOverride } = args;
  const inputUrl = isHttpUrl(sourcePathOrUrl) ? sourcePathOrUrl : await tryCreateSignedUrl(sourcePathOrUrl, 600);
  if (!inputUrl) throw new Error("Kunde inte skapa signed URL för originalbilden.");
  const cutoutBlob: Blob = await removeBackground(inputUrl);
  const rotated = await rotateBlob(cutoutBlob, rotationDeg);
  const optimized = await optimizeListingImageBlob(rotated);
  const basePath = (targetPathOverride || `handplockat/${listingId}/${targetIndex}`)
    .replace(/\.(png|jpg|jpeg|webp)$/i, "")
    .replace(/^\/+/, "");
  const targetPath = `${basePath}.${optimized.extension}`;
  const { error: uploadError } = await supabase.storage
    .from("handplockat-public")
    .upload(targetPath, optimized.blob, { upsert: true, contentType: optimized.contentType });
  if (uploadError) throw uploadError;
  const oldPaths = [`${basePath}.jpg`, `${basePath}.jpeg`, `${basePath}.png`].filter((p) => p !== targetPath);
  if (oldPaths.length > 0) {
    const { error: removeError } = await supabase.storage.from("handplockat-public").remove(oldPaths);
    if (removeError) console.warn("Kunde inte rensa gamla public-filer:", removeError.message);
  }
  const { data: pub } = supabase.storage.from("handplockat-public").getPublicUrl(targetPath);
  if (!pub?.publicUrl) throw new Error("Kunde inte skapa public URL för annonsbilden.");
  return pub.publicUrl;
}

export default function HandplockatCreate() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const [listingId, setListingId] = useState(() => generateUuid());

  const [source, setSource] = useState<HandplockatSource>("manual");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priceSek, setPriceSek] = useState<string>("");
  const [status, setStatus] = useState<HandplockatStatus>("draft");

  const [category, setCategory] = useState("");
  const [itemType, setItemType] = useState<"general" | "clothing">("general");
  const [sizeValue, setSizeValue] = useState("");
  const [clothingType, setClothingType] = useState("");
  const [brand, setBrand] = useState("");

  const [dimensionLength, setDimensionLength] = useState("");
  const [dimensionWidth, setDimensionWidth] = useState("");
  const [dimensionHeight, setDimensionHeight] = useState("");

  const [skick, setSkick] = useState("");
  const [pickupArea, setPickupArea] = useState("Alnö");
  const [pickupWindow, setPickupWindow] = useState("Enligt överenskommelse");
  const [pickupDeadlineAt, setPickupDeadlineAt] = useState(toLocalDateValue(addDays(7)));

  const [valuationJsonRaw, setValuationJsonRaw] = useState("");
  const [extraInfo, setExtraInfo] = useState("Ta med bärhjälp");

  const [imagesOriginalRaw, setImagesOriginalRaw] = useState("");
  const [imageCutout, setImageCutout] = useState("");

  const [valuations, setValuations] = useState<Valuation[]>([]);
  const [selectedValuationId, setSelectedValuationId] = useState("");
  const [valuationsLoading, setValuationsLoading] = useState(false);
  const [valuationsError, setValuationsError] = useState<string | null>(null);

  const [valuationImagePaths, setValuationImagePaths] = useState<string[]>([]);
  const [valuationImageUrls, setValuationImageUrls] = useState<string[]>([]);

  const [stepFilled, setStepFilled] = useState(false);
  const [stepImported, setStepImported] = useState(false);
  const [stepGenerated, setStepGenerated] = useState(false);

  const [importingImages, setImportingImages] = useState(false);
  const [importImagesError, setImportImagesError] = useState<string | null>(null);

  const [generatingAnnonsbild, setGeneratingAnnonsbild] = useState(false);
  const [generateImagesError, setGenerateImagesError] = useState<string | null>(null);

  const [uploadingOriginal, setUploadingOriginal] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [originalPreviewUrls, setOriginalPreviewUrls] = useState<string[]>([]);
  const [originalPreviewError, setOriginalPreviewError] = useState<string | null>(null);

  const [annonsbildKlar, setAnnonsbildKlar] = useState(false);
  const [rotationDeg, setRotationDeg] = useState<0 | 90 | 180 | 270>(0);
  const [generatedAnnonsbilder, setGeneratedAnnonsbilder] = useState<string[]>([]);

  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [editorOpen, setEditorOpen] = useState(false);
  const [editorReady, setEditorReady] = useState(false);
  const [editorError, setEditorError] = useState<string | null>(null);
  const [savingEditedImage, setSavingEditedImage] = useState(false);
  const [brushSize, setBrushSize] = useState(26);
  const [zoom2x, setZoom2x] = useState(false);
  const [undoStack, setUndoStack] = useState<string[]>([]);
  const [redoStack, setRedoStack] = useState<string[]>([]);

  const [aiSuggesting, setAiSuggesting] = useState(false);
  const [aiSuggestError, setAiSuggestError] = useState<string | null>(null);

  const [touched, setTouched] = useState<Record<TouchedField, boolean>>({
    title: false,
    description: false,
    priceSek: false,
    skick: false,
    category: false,
    itemType: false,
    size: false,
    dimensionLength: false,
    dimensionWidth: false,
    dimensionHeight: false,
    pickupDeadlineAt: false,
    imagesOriginalRaw: false,
  });

  const originalInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const editCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);
  const strokeDirtyRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const baseSnapshotRef = useRef<string | null>(null);

  const parsedValuation = useMemo(() => parseJsonInput(valuationJsonRaw || ""), [valuationJsonRaw]);

  /* ── Original preview effect ── */
  useEffect(() => {
    let mounted = true;
    setOriginalPreviewError(null);
    const originals = normalizeUrlList(imagesOriginalRaw).filter(Boolean);
    if (!isSupabaseConfigured || originals.length === 0) {
      setOriginalPreviewUrls([]);
      return;
    }
    if (window._pendingLocalPreviews && window._pendingLocalPreviews.length > 0) {
      setOriginalPreviewUrls(window._pendingLocalPreviews.slice());
      return;
    }
    Promise.all(originals.map((path) => tryCreateSignedUrl(path, 600)))
      .then((urls) => { if (!mounted) return; setOriginalPreviewUrls(urls.filter(Boolean) as string[]); })
      .catch(() => { if (!mounted) return; setOriginalPreviewUrls([]); setOriginalPreviewError("Kunde inte skapa förhandsvisning."); });
    return () => { mounted = false; };
  }, [imagesOriginalRaw]);

  /* ── Load valuations ── */
  useEffect(() => {
    if (!isSupabaseConfigured) { setValuationsError("Tjänsten är inte konfigurerad i denna miljö."); return; }
    let isMounted = true;
    setValuationsLoading(true);
    supabase.functions
      .invoke("admin-get-all-valuations", { body: {} })
      .then(({ data, error }) => {
        if (!isMounted) return;
        if (error) throw error;
        if ((data as any)?.ok === false) throw new Error((data as any)?.message || (data as any)?.error || "Kunde inte hämta värderingar.");
        const vals = ((data as any)?.valuations ?? []) as any[];
        const normalized: Valuation[] = vals.map((v: any) => ({ ...v, id: String(v.id), customer_id: String(v.customer_id) }));
        setValuations(normalized);
        setValuationsError(null);
      })
      .catch((err) => { if (!isMounted) return; setValuationsError(getErrorMessage(err, "Kunde inte hämta värderingar.")); })
      .finally(() => { if (!isMounted) return; setValuationsLoading(false); });
    return () => { isMounted = false; };
  }, []);

  const getValuationPayload = (valuation: Valuation) => {
    const raw = (valuation as any).analysis_result ?? (valuation as any).analysis ?? null;
    if (!raw) return null;
    if (typeof raw === "string") { try { return JSON.parse(raw); } catch { return raw; } }
    return raw;
  };

  const toStoragePath = (value: unknown): string | null => {
    const raw = String(value || "").trim();
    if (!raw) return null;
    const fromSupabaseObjectPath = (pathname: string): string | null => {
      const decoded = decodeURIComponent(pathname || "").replace(/^\/+/, "");
      if (!decoded) return null;
      const storageMatch = decoded.match(/^storage\/v1\/object\/(?:public|sign|authenticated)\/[^/]+\/(.+)$/i);
      if (storageMatch?.[1]) return storageMatch[1].replace(/^\/+/, "") || null;
      const objectMatch = decoded.match(/^object\/(?:public|sign|authenticated)\/[^/]+\/(.+)$/i);
      if (objectMatch?.[1]) return objectMatch[1].replace(/^\/+/, "") || null;
      return null;
    };
    if (!isHttpUrl(raw)) {
      const fromObject = fromSupabaseObjectPath(raw);
      if (fromObject) return fromObject;
      const cleaned = raw.replace(/^\/+/, "").replace(/^(images|handplockat-private|handplockat-public)\//i, "");
      return cleaned || null;
    }
    try { const parsed = new URL(raw); return fromSupabaseObjectPath(parsed.pathname); } catch { }
    return null;
  };

  const normalizeStoragePaths = (items: unknown[]): string[] => {
    return Array.from(new Set(
      items.map((item) => toStoragePath(item)).filter((item): item is string => Boolean(item)).map((p) => p.trim()).filter(Boolean)
    ));
  };

  const firstNonEmptyImagePaths = (...candidates: unknown[]): string[] => {
    for (const candidate of candidates) {
      if (!Array.isArray(candidate)) continue;
      const normalized = normalizeStoragePaths(candidate);
      if (normalized.length > 0) return normalized;
    }
    return [];
  };

  const getValuationImagePaths = (valuation: Valuation, payload: any): string[] => {
    const fromArrays = firstNonEmptyImagePaths(
      (valuation as any).image_paths, (valuation as any).image_urls,
      payload?.image_paths, payload?.analysis_result?.image_paths, payload?.analysis?.image_paths,
      payload?.analysis_result?.image_urls, payload?.analysis?.image_urls, payload?.image_urls
    );
    if (fromArrays.length > 0) return fromArrays.map((p) => (p.includes("/") ? p : ensureValuationFolder(p)));
    const singleCandidates = [
      (valuation as any).signedURL, (valuation as any).signedUrl,
      payload?.signedURL, payload?.signedUrl,
      payload?.analysis_result?.signedURL, payload?.analysis_result?.signedUrl,
      payload?.analysis?.signedURL, payload?.analysis?.signedUrl,
    ];
    for (const candidate of singleCandidates) {
      const path = toStoragePath(candidate);
      if (path) return [path.includes("/") ? path : ensureValuationFolder(path)];
    }
    return [];
  };

  const getValuationLabel = (valuation: Valuation) => {
    const payload = getValuationPayload(valuation) as any;
    const objectLabel = payload?.foremal_beskrivning || payload?.analysis_result?.foremal_beskrivning;
    const created = valuation.created_at ? new Date(valuation.created_at).toLocaleDateString("sv-SE") : "";
    return `${objectLabel ?? "Värdering"} ${created ? `(${created})` : ""}`.trim();
  };

  const ensureListingId = () => {
    const current = typeof listingId === "string" ? listingId.trim() : "";
    if (isUuid(current)) return current;
    const newId = generateUuid();
    setListingId(newId);
    return newId;
  };

  /* ── Canvas editor helpers ── */
  const getCanvasPoint = (event: React.PointerEvent<HTMLCanvasElement>): { x: number; y: number } => {
    const canvas = event.currentTarget;
    const rect = canvas.getBoundingClientRect();
    const scaleX = rect.width > 0 ? canvas.width / rect.width : 1;
    const scaleY = rect.height > 0 ? canvas.height / rect.height : 1;
    return { x: (event.clientX - rect.left) * scaleX, y: (event.clientY - rect.top) * scaleY };
  };

  const drawSnapshotToCanvas = (snapshot: string) => {
    const canvas = editCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const img = new Image();
    img.onload = () => {
      canvas.width = img.width; canvas.height = img.height;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.globalCompositeOperation = "source-over";
      ctx.drawImage(img, 0, 0);
    };
    img.src = snapshot;
  };

  const pushUndoSnapshot = () => {
    const canvas = editCanvasRef.current;
    if (!canvas) return;
    try {
      const snap = canvas.toDataURL("image/png");
      setUndoStack((prev) => [...prev, snap].slice(-20));
      setRedoStack([]);
    } catch { setEditorError("Kunde inte spara historik för ångra/gör om."); }
  };

  const handleUndo = () => {
    if (undoStack.length <= 1) return;
    const current = undoStack[undoStack.length - 1];
    const previous = undoStack[undoStack.length - 2];
    drawSnapshotToCanvas(previous);
    setUndoStack((prev) => prev.slice(0, -1));
    setRedoStack((prev) => [...prev, current].slice(-20));
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    drawSnapshotToCanvas(next);
    setRedoStack((prev) => prev.slice(0, -1));
    setUndoStack((prev) => [...prev, next].slice(-20));
  };

  const handleResetEditor = () => {
    const base = baseSnapshotRef.current;
    if (!base) return;
    drawSnapshotToCanvas(base);
    setUndoStack([base]);
    setRedoStack([]);
  };

  const handleCanvasPointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!editorReady) return;
    const canvas = event.currentTarget;
    const point = getCanvasPoint(event);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    drawingRef.current = true;
    strokeDirtyRef.current = false;
    lastPointRef.current = point;
    canvas.setPointerCapture(event.pointerId);
    ctx.globalCompositeOperation = "destination-out";
    ctx.lineCap = "round"; ctx.lineJoin = "round";
    ctx.strokeStyle = "rgba(0,0,0,1)"; ctx.lineWidth = brushSize;
    ctx.beginPath(); ctx.moveTo(point.x, point.y); ctx.lineTo(point.x, point.y); ctx.stroke();
    strokeDirtyRef.current = true;
  };

  const handleCanvasPointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current || !editorReady) return;
    event.preventDefault();
    const canvas = event.currentTarget;
    const point = getCanvasPoint(event);
    const from = lastPointRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.globalCompositeOperation = "destination-out";
    ctx.lineCap = "round"; ctx.lineJoin = "round";
    ctx.strokeStyle = "rgba(0,0,0,1)"; ctx.lineWidth = brushSize;
    if (from) { ctx.beginPath(); ctx.moveTo(from.x, from.y); ctx.lineTo(point.x, point.y); ctx.stroke(); strokeDirtyRef.current = true; }
    lastPointRef.current = point;
  };

  const finishDrawing = () => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    lastPointRef.current = null;
    if (strokeDirtyRef.current) pushUndoSnapshot();
    strokeDirtyRef.current = false;
  };

  const handleSaveEditedImage = async () => {
    if (!isSupabaseConfigured) { setEditorError("Tjänsten är inte konfigurerad i denna miljö."); return; }
    const canvas = editCanvasRef.current;
    if (!canvas) return;
    setSavingEditedImage(true);
    setEditorError(null);
    try {
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((result) => {
          if (!result) return reject(new Error("Kunde inte skapa WebP från canvas."));
          resolve(result);
        }, "image/webp", 0.82);
      });
      const id = ensureListingId();
      const rawPath = getCutoutStoragePath(imageCutout.trim(), id);
      const path = `${basePathWithoutExt(rawPath)}.webp`;
      const { error: uploadError } = await supabase.storage.from("handplockat-public").upload(path, blob, { upsert: true, contentType: "image/webp" });
      if (uploadError) throw uploadError;
      const oldPaths = [`${basePathWithoutExt(path)}.jpg`, `${basePathWithoutExt(path)}.jpeg`, `${basePathWithoutExt(path)}.png`].filter((c) => c !== path);
      if (oldPaths.length > 0) {
        const { error: removeError } = await supabase.storage.from("handplockat-public").remove(oldPaths);
        if (removeError) console.warn("Kunde inte rensa gamla redigerade filer:", removeError.message);
      }
      const { data } = supabase.storage.from("handplockat-public").getPublicUrl(path);
      setImageCutout(`${data.publicUrl}?t=${Date.now()}`);
      setAnnonsbildKlar(true); setStepGenerated(true); setEditorOpen(false); setZoom2x(false);
    } catch (err) {
      setEditorError(getErrorMessage(err, "Kunde inte spara redigerad annonsbild."));
    } finally { setSavingEditedImage(false); }
  };

  useEffect(() => {
    if (!editorOpen || !imageCutout.trim()) return;
    let cancelled = false;
    setEditorReady(false); setEditorError(null);
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      if (cancelled) return;
      const canvas = editCanvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) { setEditorError("Kunde inte starta bildredigeraren."); return; }
      canvas.width = img.width; canvas.height = img.height;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.globalCompositeOperation = "source-over";
      ctx.drawImage(img, 0, 0);
      try {
        const snapshot = canvas.toDataURL("image/png");
        baseSnapshotRef.current = snapshot;
        setUndoStack([snapshot]); setRedoStack([]); setEditorReady(true);
      } catch { setEditorError("Kunde inte läsa bilddata för redigering."); }
    };
    img.onerror = () => { if (cancelled) return; setEditorError("Kunde inte läsa annonsbilden för redigering."); };
    img.src = imageCutout.trim();
    return () => { cancelled = true; };
  }, [editorOpen, imageCutout]);

  /* ── Valuation helpers ── */
  const applyValuationToForm = (payload: any) => {
    let data = payload;
    if (typeof data === "string") { try { data = JSON.parse(data); } catch { return; } }
    if (!data || typeof data !== "object") return;
    const raw = data as any;
    const obj = typeof raw.analysis_result === "object" && raw.analysis_result ? raw.analysis_result
      : typeof raw.analysis === "object" && raw.analysis ? raw.analysis : raw;
    const cleanText = (txt: string) => txt.replace(/\(\s*nypris[^)]*\)/gi, "").replace(/nypris[^.,;\n]*/gi, "").replace(/\s+/g, " ").trim();
    const suggestedTitle = typeof obj.foremal_beskrivning === "string" ? cleanText(obj.foremal_beskrivning) : "";
    const suggestedDescription = typeof obj.foremal_beskrivning === "string" ? cleanText(obj.foremal_beskrivning) : "";
    let medelpris: number | undefined;
    if (typeof obj.varde_med_sek === "number") medelpris = obj.varde_med_sek;
    else if (typeof obj.varde_min_sek === "number" && typeof obj.varde_max_sek === "number") medelpris = Math.round((obj.varde_min_sek + obj.varde_max_sek) / 2);
    else if (typeof obj.varde_sek === "number") medelpris = obj.varde_sek;
    const suggestedPrice = typeof medelpris === "number" ? String(medelpris) : "";
    const suggestedCategory = deriveCategory(obj);
    const clothing = isClothingItem(obj);
    const suggestedSize = typeof obj.storlek === "string" ? obj.storlek : typeof obj.size === "string" ? obj.size : "";
    const dims = obj?.matt ?? obj?.dimensions_mm ?? obj?.dimensions ?? null;
    setSource("valuation");
    if (suggestedTitle && shouldFill(touched, "title", title)) setTitle(suggestedTitle);
    if (suggestedDescription && shouldFill(touched, "description", description)) setDescription(suggestedDescription);
    if (suggestedPrice && shouldFill(touched, "priceSek", priceSek)) setPriceSek(suggestedPrice);
    if (suggestedCategory && shouldFill(touched, "category", category)) setCategory(suggestedCategory);
    if (!touched.itemType && clothing) setItemType("clothing");
    if (clothing && suggestedSize && shouldFill(touched, "size", sizeValue)) setSizeValue(suggestedSize);
    if (!clothing && dims && typeof dims === "object") {
      const length = dims.length ?? dims?.length_mm ?? dims?.length_cm;
      const width = dims.width ?? dims?.width_mm ?? dims?.width_cm;
      const height = dims.height ?? dims?.height_mm ?? dims?.height_cm;
      if (length && shouldFill(touched, "dimensionLength", dimensionLength)) setDimensionLength(String(length));
      if (width && shouldFill(touched, "dimensionWidth", dimensionWidth)) setDimensionWidth(String(width));
      if (height && shouldFill(touched, "dimensionHeight", dimensionHeight)) setDimensionHeight(String(height));
    }
    if (shouldFill(touched, "pickupDeadlineAt", pickupDeadlineAt)) setPickupDeadlineAt(toLocalDateValue(addDays(7)));
  };

  const handleLoadValuation = () => {
    if (!selectedValuationId) return;
    const selected = valuations.find((v) => String(v.id) === selectedValuationId);
    if (!selected) return;
    const payload = getValuationPayload(selected);
    if (!payload) { setError("Vald värdering saknar underlag."); return; }
    setValuationJsonRaw(typeof payload === "string" ? payload : JSON.stringify(payload, null, 2));
    const paths = getValuationImagePaths(selected, payload);
    setValuationImagePaths(paths);
    setValuationImageUrls([]);
    applyValuationToForm(payload);
    setStepFilled(true); setStepImported(false); setStepGenerated(false);
    setAnnonsbildKlar(false); setGeneratedAnnonsbilder([]);
    setImportImagesError(null); setGenerateImagesError(null);
    setError(null);
  };

  useEffect(() => {
    if (valuationImagePaths.length === 0) { setValuationImageUrls([]); return; }
    let isMounted = true;
    Promise.all(valuationImagePaths.map((path) => tryCreateSignedUrl(path, 600)))
      .then((urls) => { if (!isMounted) return; setValuationImageUrls(urls.filter(Boolean) as string[]); })
      .catch(() => { if (!isMounted) return; setValuationImageUrls([]); });
    return () => { isMounted = false; };
  }, [valuationImagePaths]);

  /* ── Upload ── */
  const uploadFileToBucket = async (file: File, bucket: "handplockat-private", folder: string) => {
    const ext = (file.name.split(".").pop() || "bin").toLowerCase();
    const fileId = generateUuid();
    const path = `${folder}/${fileId}.${ext}`;
    const { error: uploadErr } = await supabase.storage.from(bucket).upload(path, file, { upsert: false, contentType: file.type });
    if (uploadErr) throw uploadErr;
    return { path };
  };

  const handleOriginalUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    if (!isSupabaseConfigured) { setUploadError("Tjänsten är inte konfigurerad i denna miljö."); return; }

    // Instant local previews
    window._pendingLocalPreviews = Array.from(files).map((f) => URL.createObjectURL(f));
    setOriginalPreviewUrls(window._pendingLocalPreviews.slice());

    const id = ensureListingId();
    setUploadError(null);
    setUploadingOriginal(true);
    try {
      const uploads = await Promise.all(
        Array.from(files).map((file) => uploadFileToBucket(file, "handplockat-private", `handplockat-original/${id}`))
      );
      window._pendingLocalPreviews = [];
      const paths = uploads.map((u) => u.path);
      const existing = normalizeUrlList(imagesOriginalRaw);
      setImagesOriginalRaw([...existing, ...paths].join("\n"));
      setTouched((prev) => ({ ...prev, imagesOriginalRaw: true }));
      setStepImported(true); setStepGenerated(false); setAnnonsbildKlar(false); setGeneratedAnnonsbilder([]);

      // AI suggestion
      setAiSuggesting(true); setAiSuggestError(null);
      try {
        const functionBase = import.meta.env.VITE_SUPABASE_FUNCTION_URL;
        const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
        const imageUrls = await Promise.all(paths.map((p) => tryCreateSignedUrl(p, 600)));
        const filteredUrls = imageUrls.filter(Boolean);
        if (filteredUrls.length > 0) {
          const response = await fetch(`${functionBase}/analyze-item`, {
            method: "POST",
            headers: { "Content-Type": "application/json", apikey: anonKey, Authorization: `Bearer ${anonKey}` },
            body: JSON.stringify({ imageUrls: filteredUrls }),
          });
          if (response.ok) {
            const result = await response.json();
            if (result && typeof result.foremal_beskrivning === "string" && shouldFill(touched, "description", description)) {
              setDescription(result.foremal_beskrivning.trim());
            }
          } else {
            const err = await response.json().catch(() => ({ error: "Okänt fel" }));
            setAiSuggestError(err.error || "AI-förslag misslyckades");
          }
        }
      } catch (err) {
        setAiSuggestError(getErrorMessage(err, "AI-förslag misslyckades"));
      } finally { setAiSuggesting(false); }
    } catch (err) {
      setUploadError(getErrorMessage(err, "Kunde inte ladda upp originalbilder."));
    } finally {
      setUploadingOriginal(false);
      if (originalInputRef.current) originalInputRef.current.value = "";
      if (cameraInputRef.current) cameraInputRef.current.value = "";
    }
  };

  /* ── Import valuation images ── */
  const handleImportValuationImages = async () => {
    if (!isSupabaseConfigured) { setImportImagesError("Tjänsten är inte konfigurerad i denna miljö."); return; }
    const id = ensureListingId();
    const valuationId = selectedValuationId.trim();
    if (!valuationId) { setImportImagesError("Välj en värdering innan du importerar bilder."); return; }
    setImportImagesError(null); setImportingImages(true);
    try {
      const safePaths = valuationImagePaths.filter(Boolean).map((p) => (p.includes("/") ? p : ensureValuationFolder(p)));
      const { data, error } = await supabase.functions.invoke("handplockat-import-valuation-images", {
        body: { listing_id: id, valuation_id: valuationId, source_image_paths: safePaths },
      });
      if (error) throw error;
      if ((data as any)?.ok === false) throw new Error((data as any)?.error || (data as any)?.message || "Import misslyckades.");
      const imported = Array.isArray((data as any)?.imported_paths) ? (data as any).imported_paths : [];
      if (!imported.length) throw new Error("Inga bilder importerades.");
      setImagesOriginalRaw(imported.join("\n"));
      setTouched((prev) => ({ ...prev, imagesOriginalRaw: true }));
      setStepImported(true); setStepGenerated(false); setAnnonsbildKlar(false); setGeneratedAnnonsbilder([]);
    } catch (err) {
      setImportImagesError(getErrorMessage(err, "Kunde inte importera bilder."));
    } finally { setImportingImages(false); }
  };

  /* ── Generate annonsbild ── */
  const handleGenerateAnnonsbild = async () => {
    if (!isSupabaseConfigured) { setGenerateImagesError("Tjänsten är inte konfigurerad i denna miljö."); return; }
    const id = ensureListingId();
    const originals = normalizeUrlList(imagesOriginalRaw).filter(Boolean);
    if (originals.length === 0) { setGenerateImagesError("Importera eller ladda upp minst en originalbild först."); return; }
    setGenerateImagesError(null); setGeneratingAnnonsbild(true); setAnnonsbildKlar(false); setStepGenerated(false); setGeneratedAnnonsbilder([]);
    try {
      const publicUrls: string[] = [];
      const firstTargetPath = imageCutout.trim() ? getCutoutStoragePath(imageCutout.trim(), id) : `handplockat/${id}/1.webp`;
      for (let index = 0; index < originals.length; index += 1) {
        const publicUrl = await removeBgLocalAndUpload({ listingId: id, sourcePathOrUrl: originals[index], rotationDeg, targetIndex: index + 1, targetPathOverride: index === 0 ? firstTargetPath : undefined });
        publicUrls.push(publicUrl);
      }
      setGeneratedAnnonsbilder(publicUrls);
      setImageCutout(publicUrls[0] || "");
      setAnnonsbildKlar(true); setStepGenerated(true);
    } catch (err) {
      setGenerateImagesError(getErrorMessage(err, "Kunde inte skapa annonsbild."));
      setAnnonsbildKlar(false); setStepGenerated(false);
    } finally { setGeneratingAnnonsbild(false); }
  };

  /* ── Submit ── */
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    const finalId = ensureListingId();
    const isDraft = status === "draft";
    const rawPrice = Number(priceSek);
    const finalPrice = isDraft && (!priceSek.trim() || Number.isNaN(rawPrice)) ? 0 : rawPrice;

    if (!isDraft) {
      if (!title.trim()) return setError("Rubrik saknas.");
      if (!description.trim()) return setError("Beskrivning saknas.");
      if (Number.isNaN(finalPrice) || finalPrice <= 0) return setError("Pris måste vara ett giltigt tal.");
    } else if (Number.isNaN(finalPrice) || finalPrice < 0) {
      return setError("Pris måste vara 0 eller högre för utkast.");
    }

    if (!user?.id) return setError("Kunde inte hitta användar-id (logga in igen).");

    // Strip Storlek/Märke lines – these live in clothingtype/brand, not description
    const cleanDescription = description
      .split("\n")
      .filter((l) => !/^(Storlek|Märke):/i.test(l.trim()))
      .join("\n")
      .trim();

    const dimensions_mm =
      itemType === "general" && (dimensionLength || dimensionWidth || dimensionHeight)
        ? {
            length: dimensionLength ? Number(dimensionLength) : null,
            width: dimensionWidth ? Number(dimensionWidth) : null,
            height: dimensionHeight ? Number(dimensionHeight) : null,
          }
        : null;

    const pickupAreaSafe = pickupArea.trim() || "Alnö";
    const pickupWindowSafe = pickupWindow.trim() || "Enligt överenskommelse";
    const pickupText = pickupWindow.trim()
      ? `${pickupAreaSafe} – ${pickupWindow.trim()}`
      : `${pickupAreaSafe} – tid enligt överenskommelse`;

    setSaving(true);
    try {
      const createdId = await createHandplockatListing({
        id: finalId,
        owner_id: user.id,
        title: title.trim() || "Utkast",
        description: [
        cleanDescription,
        extraInfo.trim(),
        "—",
        "Så fungerar köpet:",
        "• Reserveras via formulär – ingen betalning sker direkt",
        "• Bekräftelse skickas från Trygg Hand",
        "• Betalning sker via Swish vid överenskommelse",
      ].filter(Boolean).join("\n\n"),
        price_sek: finalPrice,
        bid_start_sek: null,
        status,
        category: category.trim() || null,
        clothingtype: itemType === "clothing" ? (clothingType || null) : null,
        size: itemType === "clothing" ? (sizeValue.trim() || null) : null,
        brand: brand.trim() || null,
        dimensions_mm,
        skick: skick.trim() || null,
        pickup_area: pickupAreaSafe,
        pickup_window: pickupWindowSafe,
        pickup_text: pickupText,
        pickup_deadline_at: pickupDeadlineAt || null,
        auction_end_at: null,
        sms_phone: COMPANY_SMS,
        payment_method: "swish",
        source,
        valuation_json: parsedValuation,
        images_original: normalizeUrlList(imagesOriginalRaw),
        image_cutout: imageCutout.trim() || null,
        images_cutout:
          generatedAnnonsbilder.length > 0
            ? generatedAnnonsbilder
            : imageCutout.trim()
            ? [imageCutout.trim()]
            : [],
      });

      if (status === "draft") {
        const isPortalFlow = location.pathname.startsWith("/portal/handplockat");
        navigate(isPortalFlow ? `/portal/handplockat/${createdId}/redigera` : `/admin/handplockat/${createdId}/redigera`);
      } else {
        navigate(`/handplockat/${createdId}`);
      }
    } catch (err) {
      setError(getErrorMessage(err, "Kunde inte skapa annons."));
    } finally {
      setSaving(false);
    }
  };

  /* ── UI ── */
  return (
    <div className="min-h-[100svh] bg-background">
      <Seo
        title="Skapa annons | Handplockat"
        description="Skapa och publicera Handplockat-annonser."
        canonical="https://www.trygghand.com/admin/handplockat/skapa"
        robots="noindex"
      />
      <Header handplockatLogo />

      <main className="container mx-auto px-4 py-10 pb-20">
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
            <h1 className="text-2xl font-bold text-foreground">Skapa annons</h1>
            <p className="text-sm text-muted-foreground mt-2">
              Skapa en tydlig annons. Du kan utgå från en värdering eller fylla i manuellt.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">

            {/* ── Värdering ── */}
            <div className="rounded-3xl border border-border bg-card p-6 space-y-4">
              <h2 className="text-lg font-semibold">Utgå från värdering (valfritt)</h2>
              <p className="text-sm text-muted-foreground">Välj en värdering för att fylla i rubrik, pris och kategori. Importera sedan bilder.</p>

              <div className="flex flex-col gap-3 md:flex-row md:items-center">
                <select value={selectedValuationId} onChange={(e) => setSelectedValuationId(e.target.value)} className="w-full rounded-xl border border-input px-3 py-2 text-sm">
                  <option value="">Välj värdering…</option>
                  {valuations.map((v) => (
                    <option key={v.id} value={String(v.id)}>{getValuationLabel(v)}</option>
                  ))}
                </select>
                <Button type="button" variant={stepFilled ? "default" : "outline"} onClick={handleLoadValuation} disabled={!selectedValuationId}>
                  Fyll i från värdering
                </Button>
              </div>

              {valuationsLoading && <p className="text-xs text-muted-foreground">Laddar värderingar…</p>}
              {valuationsError && <p className="text-xs text-destructive">{valuationsError}</p>}
              {stepFilled && <p className="text-sm font-medium text-green-600">Uppgifter ifyllda ✓</p>}

              {valuationImageUrls.length > 0 && (
                <div className="grid grid-cols-3 gap-3">
                  {valuationImageUrls.map((url) => (
                    <div key={url} className="aspect-square rounded-xl bg-secondary/60 overflow-hidden">
                      <img src={url} alt="Bild från värdering" className="h-full w-full object-cover" />
                    </div>
                  ))}
                </div>
              )}

              <div className="flex flex-wrap gap-3">
                <Button type="button" variant={stepImported ? "default" : "outline"} onClick={handleImportValuationImages} disabled={!stepFilled || importingImages || valuationImagePaths.length === 0}>
                  {importingImages ? "Importerar bilder…" : "Importera bilder"}
                </Button>
                {stepImported && <p className="text-sm font-medium text-green-600 self-center">Bilder importerade ✓</p>}
              </div>
              {importImagesError && <p className="text-xs text-destructive">{importImagesError}</p>}
            </div>

            {/* ── Grunduppgifter ── */}
            <div className="rounded-3xl border border-border bg-card p-6 space-y-4">
              <h2 className="text-lg font-semibold">Grunduppgifter</h2>

              <div className="flex flex-wrap gap-3">
                <label className="flex items-center gap-2 text-sm">
                  <input type="radio" name="source" checked={source === "valuation"} onChange={() => setSource("valuation")} /> Från värdering
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="radio" name="source" checked={source === "manual"} onChange={() => setSource("manual")} /> Manuell annons
                </label>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Rubrik</label>
                  <input value={title} onChange={(e) => { setTitle(e.target.value); setTouched((prev) => ({ ...prev, title: true })); }} className="w-full rounded-xl border border-input px-3 py-2 text-sm" placeholder="T.ex. Vitrinskåp i ek" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Pris (kr)</label>
                  <input value={priceSek} onChange={(e) => { setPriceSek(e.target.value); setTouched((prev) => ({ ...prev, priceSek: true })); }} className="w-full rounded-xl border border-input px-3 py-2 text-sm" placeholder="T.ex. 1800" type="number" min="0" />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Kategori</label>
                  <select value={category} onChange={(e) => { setCategory(e.target.value); setTouched((prev) => ({ ...prev, category: true })); }} className="w-full rounded-xl border border-input px-3 py-2 text-sm">
                    <option value="">Välj kategori…</option>
                    <option value="Möbler">Möbler</option>
                    <option value="Kläder & Skor">Kläder & Skor</option>
                    <option value="Belysning">Belysning</option>
                    <option value="Textil">Textil</option>
                    <option value="Kök">Kök</option>
                    <option value="Leksaker">Leksaker</option>
                    <option value="Böcker">Böcker</option>
                    <option value="Elektronik">Elektronik</option>
                    <option value="Tavlor">Tavlor</option>
                    <option value="Porslin">Porslin</option>
                    <option value="Sport">Sport</option>
                    <option value="Övrigt">Övrigt</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Typ av vara</label>
                  <select value={itemType} onChange={(e) => { setItemType(e.target.value as "general" | "clothing"); setTouched((prev) => ({ ...prev, itemType: true })); }} className="w-full rounded-xl border border-input px-3 py-2 text-sm">
                    <option value="general">Allmänt</option>
                    <option value="clothing">Kläder</option>
                  </select>
                </div>
              </div>

              {itemType === "clothing" ? (
                <>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Storlek</label>
                      <input value={sizeValue} onChange={(e) => { setSizeValue(e.target.value); setTouched((prev) => ({ ...prev, size: true })); }} className="w-full rounded-xl border border-input px-3 py-2 text-sm" placeholder="T.ex. M eller 38" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Dam/Herr/Barn</label>
                      <select value={clothingType} onChange={(e) => setClothingType(e.target.value)} className="w-full rounded-xl border border-input px-3 py-2 text-sm">
                        <option value="">Välj typ…</option>
                        <option value="Dam">Dam</option>
                        <option value="Herr">Herr</option>
                        <option value="Barn">Barn</option>
                      </select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Märke</label>
                    <input value={brand} onChange={(e) => setBrand(e.target.value)} className="w-full rounded-xl border border-input px-3 py-2 text-sm" placeholder="T.ex. H&M, Nike, Polarn O. Pyret" />
                  </div>
                </>
              ) : (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Mått (mm)</label>
                  <div className="grid grid-cols-3 gap-2">
                    <input value={dimensionLength} onChange={(e) => { setDimensionLength(e.target.value); setTouched((prev) => ({ ...prev, dimensionLength: true })); }} className="w-full rounded-xl border border-input px-2 py-2 text-sm" placeholder="L" type="number" min="0" />
                    <input value={dimensionWidth} onChange={(e) => { setDimensionWidth(e.target.value); setTouched((prev) => ({ ...prev, dimensionWidth: true })); }} className="w-full rounded-xl border border-input px-2 py-2 text-sm" placeholder="B" type="number" min="0" />
                    <input value={dimensionHeight} onChange={(e) => { setDimensionHeight(e.target.value); setTouched((prev) => ({ ...prev, dimensionHeight: true })); }} className="w-full rounded-xl border border-input px-2 py-2 text-sm" placeholder="H" type="number" min="0" />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium">Skick</label>
                <select value={skick} onChange={(e) => { setSkick(e.target.value); setTouched((prev) => ({ ...prev, skick: true })); }} className="w-full rounded-xl border border-input px-3 py-2 text-sm">
                  <option value="">Välj skick…</option>
                  <option value="Nyskick">Nyskick</option>
                  <option value="Mycket gott skick">Mycket gott skick</option>
                  <option value="Gott skick">Gott skick</option>
                  <option value="Okej skick">Okej skick</option>
                  <option value="Slitet / renoveringsobjekt">Slitet / renoveringsobjekt</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Beskrivning</label>
                <textarea value={description} onChange={(e) => { setDescription(e.target.value); setTouched((prev) => ({ ...prev, description: true })); }} className="w-full rounded-xl border border-input px-3 py-2 text-sm min-h-[120px]" placeholder="Kort och tydlig beskrivning." />
                <p className="text-xs text-muted-foreground">Skriv inte namn, adresser eller andra personuppgifter.</p>
                {aiSuggesting && <p className="text-xs text-blue-600 mt-1">AI föreslår beskrivning…</p>}
                {aiSuggestError && <p className="text-xs text-destructive mt-1">{aiSuggestError}</p>}
              </div>
            </div>

            {/* ── Upphämtning ── */}
            <div className="rounded-3xl border border-border bg-card p-6 space-y-4">
              <h2 className="text-lg font-semibold">Upphämtning</h2>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Senast upphämtning</label>
                  <input value={pickupDeadlineAt} onChange={(e) => { setPickupDeadlineAt(e.target.value); setTouched((prev) => ({ ...prev, pickupDeadlineAt: true })); }} className="w-full rounded-xl border border-input px-3 py-2 text-sm" type="date" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Upphämtning sker i</label>
                  <input value={pickupArea} onChange={(e) => setPickupArea(e.target.value)} className="w-full rounded-xl border border-input px-3 py-2 text-sm" placeholder="T.ex. Alnö" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Upphämtningstid</label>
                <input value={pickupWindow} onChange={(e) => setPickupWindow(e.target.value)} className="w-full rounded-xl border border-input px-3 py-2 text-sm" placeholder="T.ex. Enligt överenskommelse" />
              </div>
            </div>

            {/* ── Bilder ── */}
            <div className="rounded-3xl border border-border bg-card p-6 space-y-4">
              <h2 className="text-lg font-semibold">Bilder</h2>
              <p className="text-xs text-muted-foreground">Ladda upp originalbilder eller importera från värdering. Skapa sedan annonsbilder.</p>

              <input ref={originalInputRef} type="file" accept="image/*,image/heic,image/heif" multiple className="hidden" onChange={(e) => handleOriginalUpload(e.target.files)} />
              <input ref={cameraInputRef} type="file" accept="image/*,image/heic,image/heif" capture="environment" className="hidden" onChange={(e) => handleOriginalUpload(e.target.files)} />

              <div className="flex flex-wrap gap-3">
                <Button type="button" variant="outline" onClick={() => originalInputRef.current?.click()} disabled={uploadingOriginal}>
                  {uploadingOriginal ? "Laddar upp…" : "Välj bilder (mobil/dator)"}
                </Button>
                <Button type="button" variant="outline" onClick={() => cameraInputRef.current?.click()} disabled={uploadingOriginal}>
                  Ta bild med kamera
                </Button>
              </div>

              {uploadError && <p className="text-xs text-destructive">{uploadError}</p>}
              {originalPreviewError && <p className="text-xs text-destructive">{originalPreviewError}</p>}

              <div className="space-y-2">
                <label className="text-sm font-medium">Originalbilder (en per rad)</label>
                <textarea
                  value={imagesOriginalRaw}
                  onChange={(e) => {
                    setImagesOriginalRaw(e.target.value);
                    setTouched((prev) => ({ ...prev, imagesOriginalRaw: true }));
                    setStepImported(normalizeUrlList(e.target.value).length > 0);
                    setStepGenerated(false); setAnnonsbildKlar(false); setGeneratedAnnonsbilder([]);
                  }}
                  className="w-full rounded-xl border border-input px-3 py-2 text-sm min-h-[100px]"
                  placeholder="handplockat-original/<annons-id>/<fil>.jpg"
                />
              </div>

              {originalPreviewUrls.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {originalPreviewUrls.map((url, i) => (
                    <div key={url} className="w-32 h-32 rounded-xl overflow-hidden border border-border bg-secondary flex items-center justify-center">
                      <img src={url} alt={`Förhandsvisning originalbild ${i + 1}`} className="object-contain w-full h-full" />
                    </div>
                  ))}
                  <div className="w-full text-xs text-muted-foreground mt-1">Förhandsvisning av uppladdade bilder</div>
                </div>
              )}

              <div className="mt-4 space-y-2">
                <div className="text-sm font-medium">Skapa annonsbild</div>
                <p className="text-xs text-muted-foreground">Vi tar bort bakgrunden och anpassar bilden för Handplockat.</p>
                <div className="flex flex-wrap items-center gap-2">
                  <Button type="button" variant="outline" onClick={() => setRotationDeg((d) => (((d + 90) % 360) as 0 | 90 | 180 | 270))}>
                    Rotera 90°
                  </Button>
                  <span className="text-xs text-muted-foreground">Rotation: {rotationDeg}°</span>
                </div>
                <Button type="button" variant={annonsbildKlar ? "default" : "outline"} onClick={handleGenerateAnnonsbild} disabled={generatingAnnonsbild || normalizeUrlList(imagesOriginalRaw).length === 0}>
                  {generatingAnnonsbild ? "Skapar annonsbilder…" : "Skapa annonsbilder"}
                </Button>
                {stepGenerated && <div className="text-sm font-medium text-green-600">Annonsbild klar ✓</div>}
                {generateImagesError && <p className="text-xs text-destructive">{generateImagesError}</p>}
              </div>

              {generatedAnnonsbilder.length > 0 && (
                <div className="space-y-2">
                  <div className="text-sm font-medium">Genererade annonsbilder</div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {generatedAnnonsbilder.map((url) => (
                      <button key={url} type="button" className="aspect-square rounded-xl border border-border bg-secondary/60 overflow-hidden" onClick={() => { setImageCutout(url); setAnnonsbildKlar(true); setStepGenerated(true); }} aria-label="Välj som annonsbild">
                        <img src={url} alt="Genererad annonsbild" className="h-full w-full object-contain" />
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">Klicka på en bild för att välja den som annonsbild.</p>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium">Annonsbild (länk)</label>
                <input value={imageCutout} onChange={(e) => { setImageCutout(e.target.value); const ok = Boolean(e.target.value.trim()); setAnnonsbildKlar(ok); setStepGenerated(ok); }} className="w-full rounded-xl border border-input px-3 py-2 text-sm" placeholder="Skapas när du klickar 'Skapa annonsbild'" />
              </div>

              {imageCutout?.trim() && (
                <div className="rounded-xl border border-border p-4 space-y-3">
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="outline" onClick={() => { setEditorOpen((prev) => !prev); setEditorError(null); }}>
                      {editorOpen ? "Stäng sudda" : "Sudda bakgrundsrester"}
                    </Button>
                    {editorOpen && (
                      <Button type="button" variant={zoom2x ? "default" : "outline"} onClick={() => setZoom2x((prev) => !prev)}>Zoom 2x</Button>
                    )}
                  </div>
                  {editorOpen && (
                    <>
                      <div className="flex flex-wrap items-center gap-3 text-sm">
                        <label htmlFor="eraser-size" className="font-medium">Penselstorlek</label>
                        <input id="eraser-size" type="range" min={8} max={80} step={1} value={brushSize} onChange={(e) => setBrushSize(Number(e.target.value))} />
                        <span className="text-muted-foreground">{brushSize}px</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button type="button" variant="outline" onClick={handleUndo} disabled={undoStack.length <= 1}>Ångra</Button>
                        <Button type="button" variant="outline" onClick={handleRedo} disabled={redoStack.length === 0}>Gör om</Button>
                        <Button type="button" variant="outline" onClick={handleResetEditor} disabled={!editorReady}>Återställ</Button>
                        <Button type="button" onClick={handleSaveEditedImage} disabled={!editorReady || savingEditedImage}>
                          {savingEditedImage ? "Sparar..." : "Spara suddad bild"}
                        </Button>
                      </div>
                      <div className="rounded-xl border border-border overflow-auto max-h-[70vh] bg-secondary/30 p-2">
                        <canvas
                          ref={editCanvasRef}
                          onPointerDown={handleCanvasPointerDown}
                          onPointerMove={handleCanvasPointerMove}
                          onPointerUp={finishDrawing}
                          onPointerCancel={finishDrawing}
                          style={{ width: "100%", maxWidth: "720px", height: "auto", display: "block", touchAction: "none", transform: zoom2x ? "scale(2)" : "none", transformOrigin: "top left", cursor: "crosshair" }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">Dra med fingret eller musen för att sudda bort rester. Bilden skrivs över när du sparar.</p>
                      {editorError && <p className="text-xs text-destructive">{editorError}</p>}
                    </>
                  )}
                </div>
              )}

              {imageCutout?.trim() && (
                <div className="mt-2">
                  <div className="w-48 h-48 rounded-xl overflow-hidden border border-border bg-secondary flex items-center justify-center">
                    <img src={imageCutout.trim()} alt="Förhandsvisning av annonsbild" className="object-contain w-full h-full" />
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">Förhandsvisning av annonsbild</div>
                </div>
              )}
            </div>

            {/* ── Extra information ── */}
            <div className="rounded-3xl border border-border bg-card p-6 space-y-4">
              <h2 className="text-lg font-semibold">Extra information (valfritt)</h2>
              <textarea value={extraInfo} onChange={(e) => setExtraInfo(e.target.value)} className="w-full rounded-xl border border-input px-3 py-2 text-sm min-h-[80px]" placeholder="T.ex. tungt att bära, finns på bottenplan, osv." />
            </div>

            {error && <p className="text-destructive text-sm">{error}</p>}

            {/* ── Spara ── */}
            <div className="rounded-3xl border border-border bg-card p-6">
              <h2 className="text-lg font-semibold">Spara</h2>
              <div className="grid gap-4 md:grid-cols-2 mt-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Annonsstatus</label>
                  <select value={status} onChange={(e) => setStatus(e.target.value as HandplockatStatus)} className="w-full rounded-xl border border-input px-3 py-2 text-sm">
                    <option value="draft">Utkast</option>
                    <option value="available">Publicerad</option>
                    <option value="reserved">Reserverad</option>
                    <option value="sold">Såld</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Kontakt</label>
                  <div className="text-sm text-muted-foreground">e-post:<br />{CONTACT_EMAIL}</div>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3 mt-4">
                <Button type="submit" disabled={saving}>{saving ? "Sparar…" : "Spara annons"}</Button>
                <Button type="button" variant="outline" onClick={() => navigate("/handplockat")}>Visa annonser</Button>
              </div>
            </div>

          </form>
        </div>
      </main>

      <Footer />
    </div>
  );
}