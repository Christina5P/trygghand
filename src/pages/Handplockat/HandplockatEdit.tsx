// /src/pages/Handplockat/HandplockatEdit.tsx

import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Seo from "@/components/Seo";
import { Button } from "@/components/ui/button";
import {
  deleteHandplockatListing,
  normalizeUrlList,
  parseJsonInput,
} from "@/lib/handplockat";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import type { HandplockatSource, HandplockatStatus, HandplockatListing } from "@/types";
import { useAuth } from "@/hooks/useAuth";
import { removeBackground } from "@imgly/background-removal";

/* ================= HELPERS ================= */

type BucketName = "handplockat-private" | "images";

const getErrorMessage = (err: unknown, fallback: string) => {
  if (err && typeof err === "object" && "message" in err) {
    const msg = (err as { message?: unknown }).message;
    if (typeof msg === "string" && msg.trim()) return msg;
  }
  return fallback;
};

const toDateInputValue = (value: string | null | undefined): string => {
  if (!value) return "";
  const raw = String(value).trim();
  if (!raw) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toISOString().slice(0, 10);
};

const isHttpUrl = (v: string) => /^https?:\/\//i.test(v);

function basePathWithoutExt(path: string): string {
  return String(path || "").replace(/\.(png|jpg|jpeg|webp)$/i, "");
}

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

async function tryCreateSignedUrl(path: string, expiresIn = 600): Promise<string | null> {
  const buckets: BucketName[] = ["handplockat-private", "images"];
  for (const bucket of buckets) {
    const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresIn);
    if (!error && data?.signedUrl) return data.signedUrl;
  }
  return null;
}

async function tryDownloadBlob(path: string): Promise<{ bucket: BucketName; blob: Blob } | null> {
  const buckets: BucketName[] = ["handplockat-private", "images"];
  for (const bucket of buckets) {
    const { data, error } = await supabase.storage.from(bucket).download(path);
    if (!error && data) return { bucket, blob: data };
  }
  return null;
}

// Rotera en blob och skriv tillbaka till storage (Rotera första bilden-knappen)
async function rotateBlobInPlace(blob: Blob, angle: number): Promise<Blob | null> {
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    img.crossOrigin = "anonymous";
    const loaded: HTMLImageElement = await new Promise((resolve, reject) => {
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = url;
    });
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    if (angle % 180 !== 0) {
      canvas.width = loaded.height;
      canvas.height = loaded.width;
    } else {
      canvas.width = loaded.width;
      canvas.height = loaded.height;
    }
    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((angle * Math.PI) / 180);
    ctx.drawImage(loaded, -loaded.width / 2, -loaded.height / 2);
    ctx.restore();
    return await new Promise((resolve) => {
      canvas.toBlob((b) => resolve(b), "image/png");
    });
  } catch {
    return null;
  } finally {
    URL.revokeObjectURL(url);
  }
}

// Rotera en blob i minnet (för lokal bakgrundsborttagning)
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

async function optimizeListingImageBlob(
  blob: Blob,
  maxDimension = 1600
): Promise<{ blob: Blob; extension: "webp"; contentType: "image/webp" }> {
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

// Lokal bakgrundsborttagning + uppladdning (identisk med CreateFile)
async function removeBgLocalAndUpload(args: {
  listingId: string;
  sourcePathOrUrl: string;
  rotationDeg: 0 | 90 | 180 | 270;
  targetIndex: number;
  targetPathOverride?: string;
}): Promise<string> {
  const { listingId, sourcePathOrUrl, rotationDeg, targetIndex, targetPathOverride } = args;

  const inputUrl = isHttpUrl(sourcePathOrUrl)
    ? sourcePathOrUrl
    : await tryCreateSignedUrl(sourcePathOrUrl, 600);

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

/* ================= COMPONENT ================= */

export default function HandplockatEdit() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const { customer, loading: authLoading } = useAuth();

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [ownerId, setOwnerId] = useState<string | null>(null);

  const [source, setSource] = useState<HandplockatSource>("manual");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priceSek, setPriceSek] = useState<string>("");
  const [status, setStatus] = useState<HandplockatStatus>("available");

  const [category, setCategory] = useState("");
  const [itemType, setItemType] = useState<"general" | "clothing">("general");
  const [sizeValue, setSizeValue] = useState("");
  const [clothingType, setClothingType] = useState("");
  const [brand, setBrand] = useState("");

  const [dimensionLength, setDimensionLength] = useState("");
  const [dimensionWidth, setDimensionWidth] = useState("");
  const [dimensionHeight, setDimensionHeight] = useState("");

  const [skick, setSkick] = useState("");
  const [pickupArea, setPickupArea] = useState("Sundsvall");
  const [pickupWindow, setPickupWindow] = useState("");
  const [pickupDeadlineAt, setPickupDeadlineAt] = useState("");

  const [valuationJsonRaw, setValuationJsonRaw] = useState("");
  const [extraInfo, setExtraInfo] = useState("");

  const [imagesOriginalRaw, setImagesOriginalRaw] = useState("");
  const [imageCutout, setImageCutout] = useState("");
  const [rotationDeg, setRotationDeg] = useState<0 | 90 | 180 | 270>(0);

  const [uploadingOriginal, setUploadingOriginal] = useState(false);
  const [uploadingAnnonsbild, setUploadingAnnonsbild] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [generatedAnnonsbilder, setGeneratedAnnonsbilder] = useState<string[]>([]);

  const [aiSuggesting, setAiSuggesting] = useState(false);
  const [aiSuggestError, setAiSuggestError] = useState<string | null>(null);

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

  const originalInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const editCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);
  const strokeDirtyRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const baseSnapshotRef = useRef<string | null>(null);

  const parsedValuation = useMemo(() => parseJsonInput(valuationJsonRaw), [valuationJsonRaw]);
  const originals = useMemo(() => normalizeUrlList(imagesOriginalRaw).filter(Boolean), [imagesOriginalRaw]);
  const firstOriginal = originals[0] || "";

  // All original previews – shown immediately via blob URLs on file select
  const [originalPreviewUrls, setOriginalPreviewUrls] = useState<string[]>([]);
  const [originalPreviewError, setOriginalPreviewError] = useState<string | null>(null);
  const [previewBust, setPreviewBust] = useState(0); // increment to force signed-URL refresh

  /* ================= LOAD ================= */

  useEffect(() => {
    if (!isSupabaseConfigured) { setLoadError("Tjänsten är inte konfigurerad i denna miljö."); setLoading(false); return; }
    if (!id) { setLoadError("Saknar annons-id."); setLoading(false); return; }

    let isMounted = true;
    const loadListing = async () => {
      try {
        const { data, error } = await supabase
          .from("handplockat_listings")
          .select("*")
          .eq("id", id)
          .maybeSingle();

        if (error) throw error;
        if (!data) throw new Error("Annonsen hittades inte.");
        if (!isMounted) return;

        const listing = data as HandplockatListing;

        setOwnerId((listing as any).owner_id ?? null);
        setSource(listing.source ?? "manual");
        setTitle(listing.title ?? "");
        // Strip Storlek/Märke lines from description on load – they're stored as structured fields
        setDescription(
          (listing.description ?? "")
            .split("\n")
            .filter((l) => !/^(Storlek|Märke):/i.test(l.trim()))
            .join("\n")
            .trim()
        );
        setPriceSek(listing.price_sek != null ? String(listing.price_sek) : "");
        setStatus((listing.status as HandplockatStatus) ?? "available");
        setCategory((listing as any).category ?? "");
        setSkick(listing.skick ?? "");

        setDimensionLength(listing.dimensions_mm?.length != null ? String(listing.dimensions_mm.length) : "");
        setDimensionWidth(listing.dimensions_mm?.width != null ? String(listing.dimensions_mm.width) : "");
        setDimensionHeight(listing.dimensions_mm?.height != null ? String(listing.dimensions_mm.height) : "");

        // Load size/brand from dedicated DB columns
        const dbSize = (listing as any).size ?? "";
        const dbBrand = (listing as any).brand ?? "";
        const dbClothingType = listing.clothingtype ?? "";
        // Detect clothing from clothingtype OR size column
        const isClothing = !!dbClothingType.trim() || !!dbSize.trim();
        setItemType(isClothing ? "clothing" : "general");
        setSizeValue(dbSize.trim());
        setClothingType(dbClothingType);
        setBrand(dbBrand.trim());

        setPickupArea(listing.pickup_area ?? "Sundsvall");
        setPickupWindow(listing.pickup_window ?? "");
        setPickupDeadlineAt(toDateInputValue((listing as any).pickup_deadline_at));
        setValuationJsonRaw(listing.valuation_json ? JSON.stringify(listing.valuation_json, null, 2) : "");
        setImagesOriginalRaw(Array.isArray(listing.images_original) ? listing.images_original.join("\n") : "");

        const cutouts: string[] = Array.isArray((listing as any).images_cutout)
          ? (listing as any).images_cutout.filter(Boolean)
          : listing.image_cutout ? [listing.image_cutout] : [];
        setGeneratedAnnonsbilder(cutouts);
        setImageCutout(listing.image_cutout ?? cutouts[0] ?? "");
        setLoadError(null);
      } catch (err) {
        if (!isMounted) return;
        setLoadError(getErrorMessage(err, "Kunde inte hämta annonsen."));
      } finally {
        if (!isMounted) return;
        setLoading(false);
      }
    };
    void loadListing();
    return () => { isMounted = false; };
  }, [id]);

  /* ================= ORIGINAL PREVIEW ================= */

  // Rebuild signed-URL previews whenever imagesOriginalRaw changes (but blob URLs take priority)
  useEffect(() => {
    let isMounted = true;
    setOriginalPreviewError(null);

    const paths = normalizeUrlList(imagesOriginalRaw).filter(Boolean);
    if (paths.length === 0) { setOriginalPreviewUrls([]); return; }
    if (!isSupabaseConfigured) return;

    Promise.all(
      paths.map((p) => (isHttpUrl(p) ? Promise.resolve(p) : tryCreateSignedUrl(p, 600)))
    )
      .then((urls) => {
        if (!isMounted) return;
        setOriginalPreviewUrls(urls.filter(Boolean) as string[]);
      })
      .catch(() => {
        if (!isMounted) return;
        setOriginalPreviewError("Kunde inte skapa förhandsvisning.");
      });

    return () => { isMounted = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imagesOriginalRaw, previewBust]);

  /* ================= CANVAS EDITOR ================= */

  const getCanvasPoint = (event: React.PointerEvent<HTMLCanvasElement>) => {
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
      canvas.width = img.width;
      canvas.height = img.height;
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
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "rgba(0,0,0,1)";
    ctx.lineWidth = brushSize;
    ctx.beginPath();
    ctx.moveTo(point.x, point.y);
    ctx.lineTo(point.x, point.y);
    ctx.stroke();
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
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "rgba(0,0,0,1)";
    ctx.lineWidth = brushSize;
    if (from) {
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(point.x, point.y);
      ctx.stroke();
      strokeDirtyRef.current = true;
    }
    lastPointRef.current = point;
  };

  const finishDrawing = () => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    lastPointRef.current = null;
    if (strokeDirtyRef.current) pushUndoSnapshot();
    strokeDirtyRef.current = false;
  };

  useEffect(() => {
    if (!editorOpen || !imageCutout.trim()) return;
    let cancelled = false;
    setEditorReady(false);
    setEditorError(null);
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      if (cancelled) return;
      const canvas = editCanvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) { setEditorError("Kunde inte starta bildredigeraren."); return; }
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.globalCompositeOperation = "source-over";
      ctx.drawImage(img, 0, 0);
      try {
        const snapshot = canvas.toDataURL("image/png");
        baseSnapshotRef.current = snapshot;
        setUndoStack([snapshot]);
        setRedoStack([]);
        setEditorReady(true);
      } catch { setEditorError("Kunde inte läsa bilddata för redigering."); }
    };
    img.onerror = () => { if (cancelled) return; setEditorError("Kunde inte läsa annonsbilden för redigering."); };
    img.src = imageCutout.trim();
    return () => { cancelled = true; };
  }, [editorOpen, imageCutout]);

  const handleSaveEditedImage = async () => {
    if (!isSupabaseConfigured) { setEditorError("Tjänsten är inte konfigurerad i denna miljö."); return; }
    const canvas = editCanvasRef.current;
    if (!canvas || !id) return;
    setSavingEditedImage(true);
    setEditorError(null);
    try {
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((result) => {
          if (!result) return reject(new Error("Kunde inte skapa WebP från canvas."));
          resolve(result);
        }, "image/webp", 0.82);
      });
      const rawPath = getCutoutStoragePath(imageCutout.trim(), id);
      const path = `${basePathWithoutExt(rawPath)}.webp`;
      const { error: uploadErr } = await supabase.storage
        .from("handplockat-public")
        .upload(path, blob, { upsert: true, contentType: "image/webp" });
      if (uploadErr) throw uploadErr;
      const oldPaths = [`${basePathWithoutExt(path)}.jpg`, `${basePathWithoutExt(path)}.jpeg`, `${basePathWithoutExt(path)}.png`].filter((c) => c !== path);
      if (oldPaths.length > 0) await supabase.storage.from("handplockat-public").remove(oldPaths);
      const { data } = supabase.storage.from("handplockat-public").getPublicUrl(path);
      setImageCutout(`${data.publicUrl}?t=${Date.now()}`);
      setEditorOpen(false);
      setZoom2x(false);
    } catch (err) {
      setEditorError(getErrorMessage(err, "Kunde inte spara redigerad annonsbild."));
    } finally {
      setSavingEditedImage(false);
    }
  };

  /* ================= UPLOAD ================= */

  const uploadFileToBucket = async (file: File, bucket: "handplockat-private", folder: string) => {
    const ext = (file.name.split(".").pop() || "bin").toLowerCase();
    const fileId = crypto.randomUUID();
    const path = `${folder}/${fileId}.${ext}`;
    const { error: uploadErr } = await supabase.storage
      .from(bucket)
      .upload(path, file, { upsert: false, contentType: file.type });
    if (uploadErr) throw uploadErr;
    return { path };
  };

  const handleOriginalUpload = async (files: FileList | null) => {
    if (!files || files.length === 0 || !id) return;
    if (!isSupabaseConfigured) { setUploadError("Tjänsten är inte konfigurerad i denna miljö."); return; }
    setUploadError(null);

    // Instant local previews (blob URLs) before upload completes – PWA-friendly
    const blobUrls = Array.from(files).map((f) => URL.createObjectURL(f));
    setOriginalPreviewUrls((prev) => {
      // Revoke any existing blob URLs to avoid memory leaks
      prev.forEach((u) => { if (u.startsWith("blob:")) URL.revokeObjectURL(u); });
      return blobUrls;
    });

    setUploadingOriginal(true);
    try {
      const uploads = await Promise.all(
        Array.from(files).map((file) =>
          uploadFileToBucket(file, "handplockat-private", `handplockat-original/${id}`)
        )
      );
      const paths = uploads.map((u) => u.path);
      // Revoke blob URLs now that paths are in storage
      blobUrls.forEach((u) => URL.revokeObjectURL(u));
      setImagesOriginalRaw([...normalizeUrlList(imagesOriginalRaw), ...paths].join("\n"));
      setGeneratedAnnonsbilder([]);

      // AI description suggestion
      setAiSuggesting(true);
      setAiSuggestError(null);
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
            if (result && typeof result.foremal_beskrivning === "string" && !description.trim()) {
              setDescription(result.foremal_beskrivning.trim());
            }
          } else {
            const err = await response.json().catch(() => ({ error: "Okänt fel" }));
            setAiSuggestError(err.error || "AI-förslag misslyckades");
          }
        }
      } catch (err) {
        setAiSuggestError(getErrorMessage(err, "AI-förslag misslyckades"));
      } finally {
        setAiSuggesting(false);
      }
    } catch (err) {
      setUploadError(getErrorMessage(err, "Kunde inte ladda upp originalbilder."));
    } finally {
      setUploadingOriginal(false);
      if (originalInputRef.current) originalInputRef.current.value = "";
      if (cameraInputRef.current) cameraInputRef.current.value = "";
    }
  };

  /* ================= ROTATE FIRST ORIGINAL ================= */

  const handleRotateFirstOriginal = async () => {
    setUploadError(null);
    if (!id || !firstOriginal) { setUploadError("Ingen originalbild att rotera."); return; }
    if (isHttpUrl(firstOriginal)) { setUploadError("Rotation kräver en storage-path, inte en URL."); return; }
    setUploadingOriginal(true);
    try {
      const downloaded = await tryDownloadBlob(firstOriginal);
      if (!downloaded) throw new Error(`Object not found: ${firstOriginal}`);
      const rotated = await rotateBlobInPlace(downloaded.blob, 90);
      if (!rotated) throw new Error("Kunde inte rotera bilden.");
      const { error: upErr } = await supabase.storage
        .from(downloaded.bucket)
        .upload(firstOriginal, rotated, { upsert: true, contentType: "image/png" });
      if (upErr) throw upErr;
      // (imagesOriginalRaw unchanged – previewBust triggers the preview refresh)
      setPreviewBust((n) => n + 1); // cache-bust signed-URL previews after rotation
    } catch (err) {
      setUploadError(getErrorMessage(err, "Kunde inte rotera bilden."));
    } finally {
      setUploadingOriginal(false);
    }
  };

  /* ================= GENERATE ANNONSBILD ================= */

  const handleGenerateAnnonsbild = async () => {
    if (!isSupabaseConfigured) { setUploadError("Tjänsten är inte konfigurerad i denna miljö."); return; }
    if (!id || originals.length === 0) { setUploadError("Ladda upp minst en originalbild först."); return; }
    setUploadError(null);
    setUploadingAnnonsbild(true);
    setGeneratedAnnonsbilder([]);
    try {
      const publicUrls: string[] = [];
      const firstTargetPath = imageCutout.trim()
        ? getCutoutStoragePath(imageCutout.trim(), id)
        : `handplockat/${id}/1.webp`;
      for (let index = 0; index < originals.length; index++) {
        const publicUrl = await removeBgLocalAndUpload({
          listingId: id,
          sourcePathOrUrl: originals[index],
          rotationDeg,
          targetIndex: index + 1,
          targetPathOverride: index === 0 ? firstTargetPath : undefined,
        });
        publicUrls.push(publicUrl);
      }
      setGeneratedAnnonsbilder(publicUrls);
      setImageCutout(publicUrls[0] || "");
    } catch (err) {
      setUploadError(getErrorMessage(err, "Kunde inte skapa annonsbild."));
    } finally {
      setUploadingAnnonsbild(false);
    }
  };

  /* ================= SAVE ================= */

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!id) { setError("Annons-ID saknas."); return; }

    const isDraft = status === "draft";
    const rawPrice = Number(priceSek);
    const finalPrice = isDraft && (!priceSek.trim() || Number.isNaN(rawPrice)) ? 0 : rawPrice;

    if (!isDraft) {
      if (!title.trim()) { setError("Rubrik saknas."); return; }
      if (!description.trim()) { setError("Beskrivning saknas."); return; }
      if (Number.isNaN(finalPrice) || finalPrice <= 0) { setError("Pris måste vara ett giltigt tal."); return; }
    } else if (Number.isNaN(finalPrice) || finalPrice < 0) {
      setError("Pris måste vara 0 eller högre för utkast.");
      return;
    }

    // Strip Storlek/Märke lines – they live in clothingtype/brand fields, not description
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

    const pickupAreaSafe = pickupArea.trim() || "Sundsvall";
    const pickupText = pickupWindow.trim()
      ? `${pickupAreaSafe} – ${pickupWindow.trim()}`
      : `${pickupAreaSafe} – tid enligt överenskommelse`;

    const images_cutout_final =
      generatedAnnonsbilder.length > 0
        ? generatedAnnonsbilder
        : imageCutout.trim()
        ? [imageCutout.trim()]
        : [];

    const payload: Record<string, unknown> = {
      title: title.trim() || "Utkast",
      description: [cleanDescription, extraInfo.trim()].filter(Boolean).join("\n\n"),
      price_sek: finalPrice,
      status,
      source,
      category: category.trim() || null,
      clothingtype: itemType === "clothing" ? (clothingType.trim() || null) : null,
      size: itemType === "clothing" ? (sizeValue.trim() || null) : null,
      brand: brand.trim() || null,
      dimensions_mm,
      skick: skick.trim() || null,
      pickup_area: pickupAreaSafe,
      pickup_window: pickupWindow.trim() || null,
      pickup_text: pickupText,
      pickup_deadline_at: pickupDeadlineAt || null,
      payment_method: "swish",
      valuation_json: parsedValuation,
      images_original: normalizeUrlList(imagesOriginalRaw),
      image_cutout: imageCutout.trim() || null,
      images_cutout: images_cutout_final,
    };

    console.log("[Edit] saving id:", id, payload);

    setSaving(true);
    try {
      const { error: saveError } = await supabase
        .from("handplockat_listings")
        .update(payload)
        .eq("id", id);

      console.log("[Edit] save error:", saveError);
      if (saveError) throw saveError;

      // Always navigate away so the page doesn't reload and overwrite form state
      const isPortalFlow = location.pathname.startsWith("/portal/handplockat");
      if (status === "draft") {
        navigate(isPortalFlow ? `/portal/handplockat` : `/admin/handplockat`);
      } else {
        navigate(`/handplockat/${id}`);
      }
    } catch (err) {
      const msg = getErrorMessage(err, "Kunde inte uppdatera annons.");
      console.error("[Edit] save error:", err);
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  /* ================= DELETE ================= */

  const handleDelete = async () => {
    if (!id || !window.confirm("Är du säker på att du vill ta bort annonsen?")) return;
    setSaving(true);
    try {
      await deleteHandplockatListing(id);
      navigate("/handplockat");
    } catch (err) {
      setError(getErrorMessage(err, "Kunde inte ta bort annonsen."));
    } finally {
      setSaving(false);
    }
  };

  /* ================= GUARDS ================= */

  if (loading) {
    return (
      <div className="min-h-[100svh] bg-background">
        <Header handplockatLogo />
        <main className="container mx-auto px-4 py-12"><p className="text-muted-foreground">Laddar annons…</p></main>
        <Footer handplockatLogo />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-[100svh] bg-background">
        <Header handplockatLogo />
        <main className="container mx-auto px-4 py-12"><p className="text-destructive">{loadError}</p></main>
        <Footer handplockatLogo />
      </div>
    );
  }

  const isOwner = !!customer?.id && !!ownerId && customer.id === ownerId;
  const canEdit = !!(customer as any)?.is_admin || isOwner;
  const CONTACT_EMAIL = "kontakt@trygghand.com";

  if (!authLoading && !canEdit) {
    return (
      <div className="min-h-[100svh] bg-background">
        <Header />
        <main className="container mx-auto px-4 py-12"><p className="text-destructive">Du saknar behörighet att redigera denna annons.</p></main>
        <Footer />
      </div>
    );
  }

  /* ================= UI ================= */

  return (
    <div className="min-h-[100svh] bg-background">
      <Seo
        title="Redigera annons | Handplockat"
        description="Redigera Handplockat-annons."
        canonical={`https://www.trygghand.com/admin/handplockat/redigera/${id}`}
        robots="noindex"
      />
      <Header handplockatLogo />

      <main className="container mx-auto px-4 py-10 pb-20">
        <div className="max-w-3xl mx-auto space-y-6">

          <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
            <h1 className="text-2xl font-bold text-foreground">Redigera annons</h1>
            <p className="text-sm text-muted-foreground mt-2">Uppdatera annonsen och spara ändringar.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">

            {/* ── Grunduppgifter ── */}
            <div className="rounded-3xl border border-border bg-card p-6 space-y-4">
              <h2 className="text-lg font-semibold">Grunduppgifter</h2>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium">Annons-ID</label>
                <input value={id || ""} readOnly className="w-full rounded-xl border border-input px-3 py-2 text-sm bg-muted" />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium">Utgångspunkt</label>
                <div className="flex flex-wrap gap-3">
                  <label className="flex items-center gap-2 text-sm">
                    <input type="radio" name="source" value="valuation" checked={source === "valuation"} onChange={() => setSource("valuation")} />
                    Från värdering
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="radio" name="source" value="manual" checked={source === "manual"} onChange={() => setSource("manual")} />
                    Manuell annons
                  </label>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Rubrik</label>
                  <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full rounded-xl border border-input px-3 py-2 text-sm" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Pris (SEK)</label>
                  <input value={priceSek} onChange={(e) => setPriceSek(e.target.value)} className="w-full rounded-xl border border-input px-3 py-2 text-sm" type="number" min="0" />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Kategori</label>
                  <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full rounded-xl border border-input px-3 py-2 text-sm">
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
                  <select value={itemType} onChange={(e) => setItemType(e.target.value as "general" | "clothing")} className="w-full rounded-xl border border-input px-3 py-2 text-sm">
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
                      <input value={sizeValue} onChange={(e) => setSizeValue(e.target.value)} className="w-full rounded-xl border border-input px-3 py-2 text-sm" placeholder="t.ex. S, M, L eller 34–46" />
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
                    <input value={dimensionLength} onChange={(e) => setDimensionLength(e.target.value)} className="w-full rounded-xl border border-input px-2 py-2 text-sm" placeholder="L" type="number" min="0" />
                    <input value={dimensionWidth} onChange={(e) => setDimensionWidth(e.target.value)} className="w-full rounded-xl border border-input px-2 py-2 text-sm" placeholder="B" type="number" min="0" />
                    <input value={dimensionHeight} onChange={(e) => setDimensionHeight(e.target.value)} className="w-full rounded-xl border border-input px-2 py-2 text-sm" placeholder="H" type="number" min="0" />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium">Skick</label>
                <select value={skick} onChange={(e) => setSkick(e.target.value)} className="w-full rounded-xl border border-input px-3 py-2 text-sm">
                  <option value="">Välj skick</option>
                  <option value="Nyskick">Nyskick</option>
                  <option value="Mycket gott skick">Mycket gott skick</option>
                  <option value="Gott skick">Gott skick</option>
                  <option value="Okej skick">Okej skick</option>
                  <option value="Slitet / renoveringsobjekt">Slitet / renoveringsobjekt</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Beskrivning</label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="w-full rounded-xl border border-input px-3 py-2 text-sm min-h-[120px]" placeholder="Kort och tydlig beskrivning av föremålet" />
                <p className="text-xs text-muted-foreground">Tänk på integritet: skriv inte namn, adresser eller andra personuppgifter.</p>
                {aiSuggesting && <p className="text-xs text-blue-600 mt-1">AI föreslår beskrivning…</p>}
                {aiSuggestError && <p className="text-xs text-destructive mt-1">{aiSuggestError}</p>}
              </div>
            </div>

            {/* ── Upphämtning ── */}
            <div className="rounded-3xl border border-border bg-card p-6 space-y-4">
              <h2 className="text-lg font-semibold">Upphämtning</h2>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Senaste hämtning</label>
                  <input value={pickupDeadlineAt} onChange={(e) => setPickupDeadlineAt(e.target.value)} className="w-full rounded-xl border border-input px-3 py-2 text-sm" type="date" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Upphämtning (område)</label>
                  <input value={pickupArea} onChange={(e) => setPickupArea(e.target.value)} className="w-full rounded-xl border border-input px-3 py-2 text-sm" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Upphämtningstid</label>
                <input value={pickupWindow} onChange={(e) => setPickupWindow(e.target.value)} className="w-full rounded-xl border border-input px-3 py-2 text-sm" placeholder="Tid enligt överenskommelse" />
              </div>
            </div>

            {/* ── Bilder ── */}
            <div className="rounded-3xl border border-border bg-card p-6 space-y-4">
              <h2 className="text-lg font-semibold">Bilder</h2>
              <p className="text-xs text-muted-foreground">Originalbilder sparas internt. Annonsbilder skapas lokalt (bakgrunden tas bort i webbläsaren).</p>

              <input ref={originalInputRef} type="file" accept="image/*,image/heic,image/heif" multiple className="hidden" onChange={(e) => handleOriginalUpload(e.target.files)} />
              <input ref={cameraInputRef} type="file" accept="image/*,image/heic,image/heif" capture="environment" className="hidden" onChange={(e) => handleOriginalUpload(e.target.files)} />

              <div className="flex flex-wrap gap-3">
                <Button type="button" variant="outline" onClick={() => originalInputRef.current?.click()} disabled={uploadingOriginal}>
                  {uploadingOriginal ? "Laddar upp…" : "Ladda upp originalbilder"}
                </Button>
                <Button type="button" variant="outline" onClick={() => cameraInputRef.current?.click()} disabled={uploadingOriginal}>
                  Ta bild med kamera
                </Button>
                <Button type="button" variant="outline" onClick={handleRotateFirstOriginal} disabled={uploadingOriginal || !firstOriginal}>
                  {uploadingOriginal ? "Roterar…" : "Rotera första bilden"}
                </Button>
              </div>

              {uploadError && <p className="text-xs text-destructive">{uploadError}</p>}
              {originalPreviewError && <p className="text-xs text-destructive">{originalPreviewError}</p>}

              {originalPreviewUrls.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {originalPreviewUrls.map((url, i) => (
                    <div key={url} className="w-24 h-24 rounded-xl overflow-hidden border border-border bg-secondary flex items-center justify-center flex-shrink-0">
                      <img
                        src={url}
                        alt={`Originalbild ${i + 1}`}
                        className="object-contain w-full h-full"
                      />
                    </div>
                  ))}
                  <div className="w-full text-xs text-muted-foreground mt-1">
                    {uploadingOriginal ? "Laddar upp bilder…" : "Uppladdade originalbilder"}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium">Originalbilder (paths, en per rad)</label>
                <textarea
                  value={imagesOriginalRaw}
                  onChange={(e) => { setImagesOriginalRaw(e.target.value); setGeneratedAnnonsbilder([]); }}
                  className="w-full rounded-xl border border-input px-3 py-2 text-sm min-h-[100px]"
                  placeholder="handplockat-original/<annons-id>/<fil>.jpg"
                />
              </div>

              <div className="space-y-2">
                <div className="text-sm font-medium">Skapa annonsbild</div>
                <p className="text-xs text-muted-foreground">Bakgrunden tas bort lokalt i webbläsaren – ingen edge function.</p>
                <div className="flex flex-wrap items-center gap-2">
                  <Button type="button" variant="outline" onClick={() => setRotationDeg((d) => (((d + 90) % 360) as 0 | 90 | 180 | 270))}>
                    Rotera 90°
                  </Button>
                  <span className="text-xs text-muted-foreground">Rotation: {rotationDeg}°</span>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Button type="button" variant="outline" onClick={handleGenerateAnnonsbild} disabled={uploadingAnnonsbild || originals.length === 0}>
                    {uploadingAnnonsbild ? "Skapar annonsbilder…" : "Skapa annonsbilder"}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setImageCutout("")} disabled={!imageCutout}>
                    Ta bort annonsbild
                  </Button>
                </div>
              </div>

              {generatedAnnonsbilder.length > 0 && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Genererade annonsbilder</label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {generatedAnnonsbilder.map((url) => (
                      <button key={url} type="button" className="aspect-square rounded-xl border border-border bg-secondary/60 overflow-hidden" onClick={() => setImageCutout(url)} aria-label="Välj som annonsbild">
                        <img src={url} alt="Genererad annonsbild" className="h-full w-full object-contain" />
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">Klicka på en bild för att välja den som annonsbild.</p>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium">Annonsbild (publik länk)</label>
                <input value={imageCutout} onChange={(e) => setImageCutout(e.target.value)} className="w-full rounded-xl border border-input px-3 py-2 text-sm" placeholder="Skapas automatiskt av knappen ovan" />
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
                        <label htmlFor="eraser-size-edit" className="font-medium">Penselstorlek</label>
                        <input id="eraser-size-edit" type="range" min={8} max={80} step={1} value={brushSize} onChange={(e) => setBrushSize(Number(e.target.value))} />
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
              <h2 className="text-lg font-semibold">Extra information</h2>
              <textarea value={extraInfo} onChange={(e) => setExtraInfo(e.target.value)} className="w-full rounded-xl border border-input px-3 py-2 text-sm min-h-[80px]" placeholder="Eventuell extra information som ska synas i annonsen" />
            </div>

            {error && <p className="text-destructive text-sm">{error}</p>}

            {/* ── Publicering + Spara ── */}
            <div className="rounded-3xl border border-border bg-card p-6 space-y-4">
              <h2 className="text-lg font-semibold">Publicering</h2>
              <div className="grid gap-4 md:grid-cols-2">
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
              <div className="flex flex-wrap items-center gap-3 mt-2">
                <Button type="submit" disabled={saving}>{saving ? "Sparar…" : "Uppdatera annons"}</Button>
                <Button type="button" variant="outline" onClick={() => navigate("/handplockat")}>Visa annonser</Button>
                <Button type="button" variant="destructive" onClick={handleDelete} disabled={saving}>Ta bort annons</Button>
              </div>
            </div>

          </form>
        </div>
      </main>

      <Footer handplockatLogo />
    </div>
  );
}