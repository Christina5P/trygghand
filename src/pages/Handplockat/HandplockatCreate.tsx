// /workspaces/trygghand/src/pages/Handplockat/HandplockatCreate.tsx

import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
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
import { stripExif } from "@/integrations/supabaseUpload";
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
  return new Date(date.getTime() - offset).toISOString().slice(0, 10); // YYYY-MM-DD
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

function isUuid(v: unknown): v is string {
  return (
    typeof v === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      v
    )
  );
}

function generateUuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  // fallback (inte krypto-säker, men bättre än att sakna id)
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
    if (
      tags.some(
        (t: string) =>
          t.includes("kläder") ||
          t.includes("klader") ||
          t.includes("byxa") ||
          t.includes("tröja") ||
          t.includes("troja")
      )
    )
      return "Kläder";
    if (tags.some((t: string) => t.includes("lampa") || t.includes("belys")))
      return "Belysning";
    if (
      tags.some(
        (t: string) =>
          t.includes("bord") || t.includes("stol") || t.includes("soffa")
      )
    )
      return "Möbler";
    if (tags.some((t: string) => t.includes("textil") || t.includes("matta")))
      return "Textil";
  }

  return "";
};

const isClothingItem = (payload: any): boolean => {
  if (
    typeof payload?.kategori === "string" &&
    payload.kategori.toLowerCase().includes("kläd")
  )
    return true;

  if (Array.isArray(payload?.taggar)) {
    const tags = payload.taggar.map((t: string) => String(t).toLowerCase());
    return tags.some(
      (t: string) =>
        t.includes("kläder") ||
        t.includes("klader") ||
        t.includes("byxa") ||
        t.includes("tröja") ||
        t.includes("troja")
    );
  }

  return false;
};

const isHttpUrl = (v: string) => /^https?:\/\//i.test(String(v || "").trim());

async function tryCreateSignedUrl(
  pathOrUrl: string,
  expiresIn = 600
): Promise<string | null> {
  const value = String(pathOrUrl || "").trim();
  if (!value) return null;
  if (isHttpUrl(value)) return value;

  const buckets: BucketName[] = ["handplockat-private", "images"];
  for (const bucket of buckets) {
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(value, expiresIn);
    if (!error && data?.signedUrl) return data.signedUrl;
  }
  return null;
}

async function rotateBlob(
  blob: Blob,
  rotationDeg: 0 | 90 | 180 | 270
): Promise<Blob> {
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

  const out = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => {
      if (!b) return reject(new Error("Kunde inte rotera bilden."));
      resolve(b);
    }, "image/png");
  });

  return out;
}

async function removeBgLocalAndUpload(args: {
  listingId: string;
  sourcePathOrUrl: string;
  rotationDeg: 0 | 90 | 180 | 270;
}): Promise<string> {
  const { listingId, sourcePathOrUrl, rotationDeg } = args;

  const inputUrl = /^https?:\/\//i.test(sourcePathOrUrl)
    ? sourcePathOrUrl
    : await tryCreateSignedUrl(sourcePathOrUrl, 600);

  if (!inputUrl) throw new Error("Kunde inte skapa signed URL för originalbilden.");

  // Frilägg gratis i webbläsaren
  const cutoutBlob: Blob = await removeBackground(inputUrl);

  // Valbar rotation
  const rotated = await rotateBlob(cutoutBlob, rotationDeg);

  // Ladda upp PNG till handplockat-public
  const targetPath = `handplockat/${listingId}/1.png`;

  const { error: uploadError } = await supabase.storage
    .from("handplockat-public")
    .upload(targetPath, rotated, { upsert: true, contentType: "image/png" });

  if (uploadError) throw uploadError;

  const { data: pub } = supabase.storage
    .from("handplockat-public")
    .getPublicUrl(targetPath);

  if (!pub?.publicUrl) throw new Error("Kunde inte skapa public URL för annonsbilden.");

  return pub.publicUrl;
}

export default function HandplockatCreate() {
  const navigate = useNavigate();
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

  const [dimensionLength, setDimensionLength] = useState("");
  const [dimensionWidth, setDimensionWidth] = useState("");
  const [dimensionHeight, setDimensionHeight] = useState("");

  const [skick, setSkick] = useState("");
  const [pickupArea, setPickupArea] = useState("Sundsvall");
  const [pickupWindow, setPickupWindow] = useState("");
  const [pickupDeadlineAt, setPickupDeadlineAt] = useState(
    toLocalDateValue(addDays(7))
  );

  const [valuationJsonRaw, setValuationJsonRaw] = useState("");
  const [extraInfo, setExtraInfo] = useState("");

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

  const [originalPreviewUrl, setOriginalPreviewUrl] = useState<string>("");
  const [originalPreviewError, setOriginalPreviewError] = useState<string | null>(null);

  const [annonsbildKlar, setAnnonsbildKlar] = useState(false);
  const [rotationDeg, setRotationDeg] = useState<0 | 90 | 180 | 270>(0);

  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

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

  const parsedValuation = useMemo(
    () => parseJsonInput(valuationJsonRaw || ""),
    [valuationJsonRaw]
  );

  const firstOriginal = useMemo(
    () => normalizeUrlList(imagesOriginalRaw).filter(Boolean)[0] || "",
    [imagesOriginalRaw]
  );

  useEffect(() => {
    let mounted = true;
    setOriginalPreviewError(null);

    if (!isSupabaseConfigured || !firstOriginal) {
      setOriginalPreviewUrl("");
      return;
    }

    (async () => {
      try {
        const url = await tryCreateSignedUrl(firstOriginal, 600);
        if (!mounted) return;
        if (!url) {
          setOriginalPreviewUrl("");
          setOriginalPreviewError(
            "Kunde inte skapa förhandsvisning. Kontrollera att bilden finns i Storage."
          );
          return;
        }
        setOriginalPreviewUrl(url);
      } catch {
        if (!mounted) return;
        setOriginalPreviewUrl("");
        setOriginalPreviewError("Kunde inte skapa förhandsvisning.");
      }
    })();

    return () => {
      mounted = false;
    };
  }, [firstOriginal]);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setValuationsError("Tjänsten är inte konfigurerad i denna miljö.");
      return;
    }

    let isMounted = true;
    setValuationsLoading(true);

    supabase.functions
      .invoke("admin-get-all-valuations", { body: {} })
      .then(({ data, error }) => {
        if (!isMounted) return;
        if (error) throw error;

        if ((data as any)?.ok === false) {
          throw new Error(
            (data as any)?.message ||
              (data as any)?.error ||
              "Kunde inte hämta värderingar."
          );
        }

        const vals = ((data as any)?.valuations ?? []) as any[];
        const normalized: Valuation[] = vals.map((v: any) => ({
          ...v,
          id: String(v.id),
          customer_id: String(v.customer_id),
        }));

        setValuations(normalized);
        setValuationsError(null);
      })
      .catch((err) => {
        if (!isMounted) return;
        setValuationsError(getErrorMessage(err, "Kunde inte hämta värderingar."));
      })
      .finally(() => {
        if (!isMounted) return;
        setValuationsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const getValuationPayload = (valuation: Valuation) => {
    const raw =
      (valuation as any).analysis_result ?? (valuation as any).analysis ?? null;
    if (!raw) return null;

    if (typeof raw === "string") {
      try {
        return JSON.parse(raw);
      } catch {
        return raw;
      }
    }
    return raw;
  };

  const getValuationImagePaths = (valuation: Valuation, payload: any): string[] => {
    if (Array.isArray((valuation as any).image_paths))
      return ((valuation as any).image_paths as any[]).map(String).filter(Boolean);

    if (Array.isArray(payload?.image_paths))
      return payload.image_paths.map(String).filter(Boolean);

    if (Array.isArray(payload?.analysis_result?.image_paths))
      return payload.analysis_result.image_paths.map(String).filter(Boolean);

    if (Array.isArray((valuation as any).image_urls))
      return ((valuation as any).image_urls as any[]).map(String).filter(Boolean);

    if (Array.isArray(payload?.image_urls))
      return payload.image_urls.map(String).filter(Boolean);

    return [];
  };

  const getValuationLabel = (valuation: Valuation) => {
    const payload = getValuationPayload(valuation) as any;
    const objectLabel =
      payload?.foremal_beskrivning ||
      payload?.analysis_result?.foremal_beskrivning;
    const created = valuation.created_at
      ? new Date(valuation.created_at).toLocaleDateString("sv-SE")
      : "";
    return `${objectLabel ?? "Värdering"} ${created ? `(${created})` : ""}`.trim();
  };

  // ✅ Ny robust ensure: id måste vara UUID, annars skapas ett nytt.
  const ensureListingId = () => {
    const current = typeof listingId === "string" ? listingId.trim() : "";
    if (isUuid(current)) return current;

    const newId = generateUuid();
    setListingId(newId);
    return newId;
  };

  const applyValuationToForm = (payload: any) => {
    let data = payload;
    if (typeof data === "string") {
      try {
        data = JSON.parse(data);
      } catch {
        return;
      }
    }
    if (!data || typeof data !== "object") return;

    const raw = data as any;
    const obj =
      typeof raw.analysis_result === "object" && raw.analysis_result
        ? raw.analysis_result
        : typeof raw.analysis === "object" && raw.analysis
        ? raw.analysis
        : raw;

    const cleanText = (txt: string) =>
      txt
        .replace(/\(\s*nypris[^)]*\)/gi, "")
        .replace(/nypris[^.,;\n]*/gi, "")
        .replace(/\s+/g, " ")
        .trim();

    const suggestedTitle =
      typeof obj.foremal_beskrivning === "string"
        ? cleanText(obj.foremal_beskrivning)
        : "";
    const suggestedDescription =
      typeof obj.foremal_beskrivning === "string"
        ? cleanText(obj.foremal_beskrivning)
        : "";

    let medelpris: number | undefined;
    if (typeof obj.varde_med_sek === "number") medelpris = obj.varde_med_sek;
    else if (
      typeof obj.varde_min_sek === "number" &&
      typeof obj.varde_max_sek === "number"
    )
      medelpris = Math.round((obj.varde_min_sek + obj.varde_max_sek) / 2);
    else if (typeof obj.varde_sek === "number") medelpris = obj.varde_sek;

    const suggestedPrice = typeof medelpris === "number" ? String(medelpris) : "";
    const suggestedCategory = deriveCategory(obj);

    const clothing = isClothingItem(obj);
    const suggestedSize =
      typeof obj.storlek === "string"
        ? obj.storlek
        : typeof obj.size === "string"
        ? obj.size
        : "";
    const dims = obj?.matt ?? obj?.dimensions_mm ?? obj?.dimensions ?? null;

    setSource("valuation");
    if (suggestedTitle && shouldFill(touched, "title", title)) setTitle(suggestedTitle);
    if (suggestedDescription && shouldFill(touched, "description", description))
      setDescription(suggestedDescription);
    if (suggestedPrice && shouldFill(touched, "priceSek", priceSek)) setPriceSek(suggestedPrice);
    if (suggestedCategory && shouldFill(touched, "category", category))
      setCategory(suggestedCategory);

    if (!touched.itemType && clothing) setItemType("clothing");
    if (clothing && suggestedSize && shouldFill(touched, "size", sizeValue))
      setSizeValue(suggestedSize);

    if (!clothing && dims && typeof dims === "object") {
      const length = dims.length ?? dims?.length_mm ?? dims?.length_cm;
      const width = dims.width ?? dims?.width_mm ?? dims?.width_cm;
      const height = dims.height ?? dims?.height_mm ?? dims?.height_cm;

      if (length && shouldFill(touched, "dimensionLength", dimensionLength))
        setDimensionLength(String(length));
      if (width && shouldFill(touched, "dimensionWidth", dimensionWidth))
        setDimensionWidth(String(width));
      if (height && shouldFill(touched, "dimensionHeight", dimensionHeight))
        setDimensionHeight(String(height));
    }

    if (shouldFill(touched, "pickupDeadlineAt", pickupDeadlineAt))
      setPickupDeadlineAt(toLocalDateValue(addDays(7)));
  };

  const handleLoadValuation = () => {
    if (!selectedValuationId) return;
    const selected = valuations.find((v) => String(v.id) === selectedValuationId);
    if (!selected) return;

    const payload = getValuationPayload(selected);
    if (!payload) {
      setError("Vald värdering saknar underlag.");
      return;
    }

    setValuationJsonRaw(typeof payload === "string" ? payload : JSON.stringify(payload, null, 2));

    const paths = getValuationImagePaths(selected, payload);
    setValuationImagePaths(paths);
    setValuationImageUrls([]);

    applyValuationToForm(payload);

    setStepFilled(true);
    setStepImported(false);
    setStepGenerated(false);
    setAnnonsbildKlar(false);
    setImportImagesError(null);
    setGenerateImagesError(null);

    setError(null);
  };

  useEffect(() => {
    if (valuationImagePaths.length === 0) {
      setValuationImageUrls([]);
      return;
    }

    let isMounted = true;
    Promise.all(valuationImagePaths.map((path) => tryCreateSignedUrl(path, 600)))
      .then((urls) => {
        if (!isMounted) return;
        setValuationImageUrls(urls.filter(Boolean) as string[]);
      })
      .catch(() => {
        if (!isMounted) return;
        setValuationImageUrls([]);
      });

    return () => {
      isMounted = false;
    };
  }, [valuationImagePaths]);

  const uploadFileToBucket = async (
    file: File,
    bucket: "handplockat-private",
    folder: string
  ) => {
    const safeFile = await stripExif(file);
    const ext = (safeFile.name.split(".").pop() || "bin").toLowerCase();

    // ✅ använd vår generator (faller tillbaka om crypto saknas)
    const fileId = generateUuid();

    const filename = `${fileId}.${ext}`;
    const path = `${folder}/${filename}`;

    const { error: uploadErr } = await supabase.storage
      .from(bucket)
      .upload(path, safeFile, { upsert: false });

    if (uploadErr) throw uploadErr;

    return { path };
  };

  const handleOriginalUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    if (!isSupabaseConfigured) {
      setUploadError("Tjänsten är inte konfigurerad i denna miljö.");
      return;
    }

    const id = ensureListingId();
    setUploadError(null);
    setUploadingOriginal(true);

    try {
      const uploads = await Promise.all(
        Array.from(files).map((file) =>
          uploadFileToBucket(file, "handplockat-private", `handplockat-original/${id}`)
        )
      );

      const paths = uploads.map((u) => u.path);
      const existing = normalizeUrlList(imagesOriginalRaw);
      const next = [...existing, ...paths].join("\n");

      setImagesOriginalRaw(next);
      setTouched((prev) => ({ ...prev, imagesOriginalRaw: true }));

      setStepImported(true);
      setStepGenerated(false);
      setAnnonsbildKlar(false);
    } catch (err) {
      setUploadError(getErrorMessage(err, "Kunde inte ladda upp originalbilder."));
    } finally {
      setUploadingOriginal(false);
      if (originalInputRef.current) originalInputRef.current.value = "";
      if (cameraInputRef.current) cameraInputRef.current.value = "";
    }
  };

  const handleImportValuationImages = async () => {
    if (!isSupabaseConfigured) {
      setImportImagesError("Tjänsten är inte konfigurerad i denna miljö.");
      return;
    }

    const id = ensureListingId();
    const paths = valuationImagePaths.filter(Boolean);

    if (paths.length === 0) {
      setImportImagesError("Ingen bild hittades i värderingen.");
      return;
    }

    setImportImagesError(null);
    setImportingImages(true);

    try {
      const { data, error } = await supabase.functions.invoke(
        "handplockat-import-valuation-images",
        {
          body: {
            listing_id: id,
            source_image_paths: paths,
            source_bucket: "images", // ✅ viktigt: dina valuation-bilder ligger i bucket "images"
          },
        }
      );

      if (error) throw error;

      if ((data as any)?.ok === false) {
        throw new Error(
          (data as any)?.error ||
            (data as any)?.message ||
            "Import misslyckades."
        );
      }

      const imported = Array.isArray((data as any)?.imported_paths)
        ? (data as any).imported_paths
        : [];

      if (!imported.length) throw new Error("Inga bilder importerades.");

      setImagesOriginalRaw(imported.join("\n"));
      setTouched((prev) => ({ ...prev, imagesOriginalRaw: true }));

      setStepImported(true);
      setStepGenerated(false);
      setAnnonsbildKlar(false);
    } catch (err) {
      setImportImagesError(getErrorMessage(err, "Kunde inte importera bilder."));
    } finally {
      setImportingImages(false);
    }
  };

  const handleGenerateAnnonsbild = async () => {
    if (!isSupabaseConfigured) {
      setGenerateImagesError("Tjänsten är inte konfigurerad i denna miljö.");
      return;
    }

    const id = ensureListingId();
    const originals = normalizeUrlList(imagesOriginalRaw).filter(Boolean);
    const first = originals[0];

    if (!first) {
      setGenerateImagesError("Importera eller ladda upp minst en originalbild först.");
      return;
    }

    setGenerateImagesError(null);
    setGeneratingAnnonsbild(true);
    setAnnonsbildKlar(false);
    setStepGenerated(false);

    try {
      const publicUrl = await removeBgLocalAndUpload({
        listingId: id,
        sourcePathOrUrl: first,
        rotationDeg,
      });

      setImageCutout(publicUrl);
      setAnnonsbildKlar(true);
      setStepGenerated(true);
    } catch (err) {
      setGenerateImagesError(getErrorMessage(err, "Kunde inte skapa annonsbild."));
      setAnnonsbildKlar(false);
      setStepGenerated(false);
    } finally {
      setGeneratingAnnonsbild(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    const finalId = ensureListingId(); // ✅ alltid uuid här
    const isDraft = status === "draft";
    const rawPrice = Number(priceSek);
    const finalPrice =
      isDraft && (!priceSek.trim() || Number.isNaN(rawPrice)) ? 0 : rawPrice;

    if (!isDraft) {
      if (!title.trim()) return setError("Rubrik saknas.");
      if (!description.trim()) return setError("Beskrivning saknas.");
      if (Number.isNaN(finalPrice) || finalPrice <= 0)
        return setError("Pris måste vara ett giltigt tal.");
    } else if (Number.isNaN(finalPrice) || finalPrice < 0) {
      return setError("Pris måste vara 0 eller högre för utkast.");
    }

    if (!user?.id)
      return setError("Kunde inte hitta användar-id (logga in igen).");

    const safeTitle = title.trim() || "Utkast";
    const safeDescription = description.trim();

    const sizeLine =
      itemType === "clothing" && sizeValue.trim()
        ? `Storlek: ${sizeValue.trim()}`
        : "";

    const dimensions_mm =
      itemType === "general" &&
      (dimensionLength || dimensionWidth || dimensionHeight)
        ? {
            length: dimensionLength ? Number(dimensionLength) : null,
            width: dimensionWidth ? Number(dimensionWidth) : null,
            height: dimensionHeight ? Number(dimensionHeight) : null,
          }
        : null;

    const pickupAreaSafe = pickupArea.trim() || "Sundsvall";
    const pickupWindowSafe = pickupWindow.trim() || "Enligt överenskommelse";
    const pickupText =
      pickupWindow.trim()
        ? `${pickupAreaSafe} – ${pickupWindow.trim()}`
        : `${pickupAreaSafe} – tid enligt överenskommelse`;

    setSaving(true);
    try {
      const createdId = await createHandplockatListing({
        id: finalId,
        owner_id: user.id,

        title: safeTitle,
        description: [safeDescription, sizeLine, extraInfo.trim()]
          .filter(Boolean)
          .join("\n\n"),

        price_sek: finalPrice,
        bid_start_sek: null,
        status,

        category: category.trim() || null,
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
      });

      if (status === "draft") {
        navigate(`/admin/handplockat/redigera/${createdId}`);
      } else {
        navigate(`/handplockat/${createdId}`);
      }
    } catch (err) {
      setError(getErrorMessage(err, "Kunde inte skapa annons."));
    } finally {
      setSaving(false);
    }
  };

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
            {/* VÄRDERING */}
            <div className="rounded-3xl border border-border bg-card p-6 space-y-4">
              <h2 className="text-lg font-semibold">Utgå från värdering (valfritt)</h2>
              <p className="text-sm text-muted-foreground">
                Välj en värdering för att fylla i rubrik, pris och kategori. Importera sedan bilder.
              </p>

              <div className="flex flex-col gap-3 md:flex-row md:items-center">
                <select
                  value={selectedValuationId}
                  onChange={(e) => setSelectedValuationId(e.target.value)}
                  className="w-full rounded-xl border border-input px-3 py-2 text-sm"
                >
                  <option value="">Välj värdering…</option>
                  {valuations.map((v) => (
                    <option key={v.id} value={String(v.id)}>
                      {getValuationLabel(v)}
                    </option>
                  ))}
                </select>

                <Button
                  type="button"
                  variant={stepFilled ? "default" : "outline"}
                  onClick={handleLoadValuation}
                  disabled={!selectedValuationId}
                >
                  Fyll i från värdering
                </Button>
              </div>

              {valuationsLoading && <p className="text-xs text-muted-foreground">Laddar värderingar…</p>}
              {valuationsError && <p className="text-xs text-destructive">{valuationsError}</p>}

              {stepFilled && (
                <p className="text-sm font-medium text-green-600">
                  Uppgifter ifyllda ✓
                </p>
              )}

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
                <Button
                  type="button"
                  variant={stepImported ? "default" : "outline"}
                  onClick={handleImportValuationImages}
                  disabled={!stepFilled || importingImages || valuationImagePaths.length === 0}
                >
                  {importingImages ? "Importerar bilder…" : "Importera bilder"}
                </Button>

                {stepImported && (
                  <p className="text-sm font-medium text-green-600 self-center">
                    Bilder importerade ✓
                  </p>
                )}
              </div>

              {importImagesError && <p className="text-xs text-destructive">{importImagesError}</p>}
            </div>

            {/* GRUNDUPPGIFTER */}
            <div className="rounded-3xl border border-border bg-card p-6 space-y-4">
              <h2 className="text-lg font-semibold">Grunduppgifter</h2>

              <div className="flex flex-wrap gap-3">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="source"
                    checked={source === "valuation"}
                    onChange={() => setSource("valuation")}
                  />
                  Från värdering
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="source"
                    checked={source === "manual"}
                    onChange={() => setSource("manual")}
                  />
                  Manuell annons
                </label>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Rubrik</label>
                  <input
                    value={title}
                    onChange={(e) => {
                      setTitle(e.target.value);
                      setTouched((prev) => ({ ...prev, title: true }));
                    }}
                    className="w-full rounded-xl border border-input px-3 py-2 text-sm"
                    placeholder="T.ex. Vitrinskåp i ek"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Pris (kr)</label>
                  <input
                    value={priceSek}
                    onChange={(e) => {
                      setPriceSek(e.target.value);
                      setTouched((prev) => ({ ...prev, priceSek: true }));
                    }}
                    className="w-full rounded-xl border border-input px-3 py-2 text-sm"
                    placeholder="T.ex. 1800"
                    type="number"
                    min="0"
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Kategori</label>
                  <select
                    value={category}
                    onChange={(e) => {
                      setCategory(e.target.value);
                      setTouched((prev) => ({ ...prev, category: true }));
                    }}
                    className="w-full rounded-xl border border-input px-3 py-2 text-sm"
                  >
                    <option value="">Välj kategori…</option>
                    <option value="Möbler">Möbler</option>
                    <option value="Kläder">Kläder</option>
                    <option value="Belysning">Belysning</option>
                    <option value="Textil">Textil</option>
                    <option value="Sport">Sport</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Typ av vara</label>
                  <select
                    value={itemType}
                    onChange={(e) => {
                      setItemType(e.target.value as "general" | "clothing");
                      setTouched((prev) => ({ ...prev, itemType: true }));
                    }}
                    className="w-full rounded-xl border border-input px-3 py-2 text-sm"
                  >
                    <option value="general">Allmänt</option>
                    <option value="clothing">Kläder</option>
                  </select>
                </div>
              </div>

              {itemType === "clothing" ? (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Storlek</label>
                  <input
                    value={sizeValue}
                    onChange={(e) => {
                      setSizeValue(e.target.value);
                      setTouched((prev) => ({ ...prev, size: true }));
                    }}
                    className="w-full rounded-xl border border-input px-3 py-2 text-sm"
                    placeholder="T.ex. M eller 38"
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Mått (mm)</label>
                  <div className="grid grid-cols-3 gap-2">
                    <input
                      value={dimensionLength}
                      onChange={(e) => {
                        setDimensionLength(e.target.value);
                        setTouched((prev) => ({ ...prev, dimensionLength: true }));
                      }}
                      className="w-full rounded-xl border border-input px-2 py-2 text-sm"
                      placeholder="L"
                      type="number"
                      min="0"
                    />
                    <input
                      value={dimensionWidth}
                      onChange={(e) => {
                        setDimensionWidth(e.target.value);
                        setTouched((prev) => ({ ...prev, dimensionWidth: true }));
                      }}
                      className="w-full rounded-xl border border-input px-2 py-2 text-sm"
                      placeholder="B"
                      type="number"
                      min="0"
                    />
                    <input
                      value={dimensionHeight}
                      onChange={(e) => {
                        setDimensionHeight(e.target.value);
                        setTouched((prev) => ({ ...prev, dimensionHeight: true }));
                      }}
                      className="w-full rounded-xl border border-input px-2 py-2 text-sm"
                      placeholder="H"
                      type="number"
                      min="0"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium">Skick</label>
                <select
                  value={skick}
                  onChange={(e) => {
                    setSkick(e.target.value);
                    setTouched((prev) => ({ ...prev, skick: true }));
                  }}
                  className="w-full rounded-xl border border-input px-3 py-2 text-sm"
                >
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
                <textarea
                  value={description}
                  onChange={(e) => {
                    setDescription(e.target.value);
                    setTouched((prev) => ({ ...prev, description: true }));
                  }}
                  className="w-full rounded-xl border border-input px-3 py-2 text-sm min-h-[120px]"
                  placeholder="Kort och tydlig beskrivning."
                />
                <p className="text-xs text-muted-foreground">
                  Skriv inte namn, adresser eller andra personuppgifter.
                </p>
              </div>
            </div>

            {/* UPPHÄMTNING */}
            <div className="rounded-3xl border border-border bg-card p-6 space-y-4">
              <h2 className="text-lg font-semibold">Upphämtning</h2>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Senast upphämtning</label>
                  <input
                    value={pickupDeadlineAt}
                    onChange={(e) => {
                      setPickupDeadlineAt(e.target.value);
                      setTouched((prev) => ({ ...prev, pickupDeadlineAt: true }));
                    }}
                    className="w-full rounded-xl border border-input px-3 py-2 text-sm"
                    type="date"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Upphämtning sker i</label>
                  <input
                    value={pickupArea}
                    onChange={(e) => setPickupArea(e.target.value)}
                    className="w-full rounded-xl border border-input px-3 py-2 text-sm"
                    placeholder="T.ex. Sundsvall"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Upphämtningstid</label>
                <input
                  value={pickupWindow}
                  onChange={(e) => setPickupWindow(e.target.value)}
                  className="w-full rounded-xl border border-input px-3 py-2 text-sm"
                  placeholder="T.ex. Enligt överenskommelse"
                />
              </div>
            </div>

            {/* BILDER */}
            <div className="rounded-3xl border border-border bg-card p-6 space-y-4">
              <h2 className="text-lg font-semibold">Bilder</h2>
              <p className="text-xs text-muted-foreground">
                Ladda upp originalbilder eller importera från värdering. Skapa sedan annonsbild från första originalbilden.
              </p>

              <input
                ref={originalInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => handleOriginalUpload(e.target.files)}
              />

              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => handleOriginalUpload(e.target.files)}
              />

              <div className="flex flex-wrap gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => originalInputRef.current?.click()}
                  disabled={uploadingOriginal}
                >
                  {uploadingOriginal ? "Laddar upp…" : "Välj bilder (mobil/dator)"}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => cameraInputRef.current?.click()}
                  disabled={uploadingOriginal}
                >
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
                    setStepGenerated(false);
                    setAnnonsbildKlar(false);
                  }}
                  className="w-full rounded-xl border border-input px-3 py-2 text-sm min-h-[100px]"
                  placeholder="handplockat-original/<annons-id>/<fil>.jpg"
                />
              </div>

              {originalPreviewUrl && (
                <div className="mt-2">
                  <div className="w-48 h-48 rounded-xl overflow-hidden border border-border bg-secondary flex items-center justify-center">
                    <img
                      src={originalPreviewUrl}
                      alt="Förhandsvisning av första originalbilden"
                      className="object-contain w-full h-full"
                    />
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Förhandsvisning av första originalbilden
                  </div>
                </div>
              )}

              <div className="mt-4 space-y-2">
                <div>
                  <div className="text-sm font-medium">Skapa annonsbild</div>
                  <p className="text-xs text-muted-foreground">
                    Vi tar bort bakgrunden och anpassar bilden för Handplockat.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      setRotationDeg((d) => (((d + 90) % 360) as 0 | 90 | 180 | 270))
                    }
                  >
                    Rotera 90°
                  </Button>
                  <span className="text-xs text-muted-foreground">
                    Rotation: {rotationDeg}°
                  </span>
                </div>

                <Button
                  type="button"
                  variant={annonsbildKlar ? "default" : "outline"}
                  onClick={handleGenerateAnnonsbild}
                  disabled={generatingAnnonsbild || normalizeUrlList(imagesOriginalRaw).length === 0}
                >
                  {generatingAnnonsbild ? "Skapar annonsbild…" : "Skapa annonsbild"}
                </Button>

                {stepGenerated && (
                  <div className="text-sm font-medium text-green-600">
                    Annonsbild klar ✓
                  </div>
                )}

                {generateImagesError && <p className="text-xs text-destructive">{generateImagesError}</p>}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Annonsbild (länk)</label>
                <input
                  value={imageCutout}
                  onChange={(e) => {
                    setImageCutout(e.target.value);
                    const ok = Boolean(e.target.value.trim());
                    setAnnonsbildKlar(ok);
                    setStepGenerated(ok);
                  }}
                  className="w-full rounded-xl border border-input px-3 py-2 text-sm"
                  placeholder="Skapas när du klickar 'Skapa annonsbild'"
                />
              </div>

              {imageCutout?.trim() && (
                <div className="mt-2">
                  <div className="w-48 h-48 rounded-xl overflow-hidden border border-border bg-secondary flex items-center justify-center">
                    <img
                      src={imageCutout.trim()}
                      alt="Förhandsvisning av annonsbild"
                      className="object-contain w-full h-full"
                    />
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Förhandsvisning av annonsbild
                  </div>
                </div>
              )}
            </div>

            {/* EXTRA INFO */}
            <div className="rounded-3xl border border-border bg-card p-6 space-y-4">
              <h2 className="text-lg font-semibold">Extra information (valfritt)</h2>
              <textarea
                value={extraInfo}
                onChange={(e) => setExtraInfo(e.target.value)}
                className="w-full rounded-xl border border-input px-3 py-2 text-sm min-h-[80px]"
                placeholder="T.ex. tungt att bära, finns på bottenplan, osv."
              />
            </div>

            {error && <p className="text-destructive text-sm">{error}</p>}

            {/* SPARA */}
            <div className="rounded-3xl border border-border bg-card p-6">
              <h2 className="text-lg font-semibold">Spara</h2>

              <div className="grid gap-4 md:grid-cols-2 mt-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Annonsstatus</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as HandplockatStatus)}
                    className="w-full rounded-xl border border-input px-3 py-2 text-sm"
                  >
                    <option value="draft">Utkast</option>
                    <option value="available">Publicerad</option>
                    <option value="reserved">Reserverad</option>
                    <option value="sold">Såld</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Kontakt</label>
                  <div className="text-sm text-muted-foreground">
                    e-post: <br />{CONTACT_EMAIL}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 mt-4">
                <Button type="submit" disabled={saving}>
                  {saving ? "Sparar…" : "Spara annons"}
                </Button>
                <Button type="button" variant="outline" onClick={() => navigate("/handplockat")}>
                  Visa annonser
                </Button>
              </div>
            </div>
          </form>
        </div>
      </main>

      <Footer />
    </div>
  );
}