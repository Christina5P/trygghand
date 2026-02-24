import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
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
import type { HandplockatCtaType, HandplockatSource, HandplockatStatus, Valuation } from "@/types";

const DEFAULT_SMS = "+46700000000";
const COMPANY_SMS = "+46761169554";
const BID_START_FACTOR = 0.7;

type TouchedField =
  | "title"
  | "description"
  | "priceSek"
  | "skick"
  | "category"
  | "dimensionLength"
  | "dimensionWidth"
  | "dimensionHeight"
  | "ctaTyp"
  | "bidStartSek"
  | "auctionEndAt"
  | "pickupDeadlineAt"
  | "imagesOriginalRaw";

const toLocalInputValue = (date: Date) => {
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
};

const addHours = (hours: number) => new Date(Date.now() + hours * 60 * 60 * 1000);
const addDays = (days: number) => new Date(Date.now() + days * 24 * 60 * 60 * 1000);

const shouldFill = (touched: Record<string, boolean>, key: TouchedField, value: string) => {
  return !touched[key] && !value.trim();
};

const deriveCategory = (payload: any): string => {
  if (typeof payload?.kategori === "string") return payload.kategori;
  if (Array.isArray(payload?.taggar)) {
    const tags = payload.taggar.map((t: string) => t.toLowerCase());
    if (tags.some((t: string) => t.includes("lampa") || t.includes("belys"))) return "Belysning";
    if (tags.some((t: string) => t.includes("bord") || t.includes("stol") || t.includes("soffa"))) return "Möbler";
    if (tags.some((t: string) => t.includes("textil") || t.includes("matta"))) return "Textil";
  }
  return "";
};

const formatDimensions = (dims: any): string => {
  if (!dims || typeof dims !== "object") return "";
  const length = dims.length ?? dims?.length_mm ?? dims?.length_cm;
  const width = dims.width ?? dims?.width_mm ?? dims?.width_cm;
  const height = dims.height ?? dims?.height_mm ?? dims?.height_cm;
  const parts = [length, width, height].filter((value) => value != null);
  if (parts.length === 0) return "";
  return `Mått: ${parts.join(" x ")} mm`;
};

const getErrorMessage = (err: unknown, fallback: string) => {
  if (err && typeof err === "object" && "message" in err) {
    const msg = (err as { message?: unknown }).message;
    if (typeof msg === "string") return msg;
  }
  return fallback;
};

function generateUuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (char) => {
    const rand = (Math.random() * 16) | 0;
    const value = char === "x" ? rand : (rand & 0x3) | 0x8;
    return value.toString(16);
  });
}

export default function HandplockatCreate() {
  const navigate = useNavigate();
  const [listingId, setListingId] = useState("");
  const [source, setSource] = useState<HandplockatSource>("manual");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priceSek, setPriceSek] = useState<string>("");
  const [ctaTyp, setCtaTyp] = useState<HandplockatCtaType>("direktkop");
  const [bidStartSek, setBidStartSek] = useState<string>("");
  const [status, setStatus] = useState<HandplockatStatus>("available");
  const [category, setCategory] = useState("");
  const [dimensionLength, setDimensionLength] = useState("");
  const [dimensionWidth, setDimensionWidth] = useState("");
  const [dimensionHeight, setDimensionHeight] = useState("");
  const [skick, setSkick] = useState("");
  const [pickupArea, setPickupArea] = useState("Sundsvall");
  const [pickupWindow, setPickupWindow] = useState("");
  const [pickupDeadlineAt, setPickupDeadlineAt] = useState("");
  const [auctionEndAt, setAuctionEndAt] = useState("");
  const [smsPhone, setSmsPhone] = useState(COMPANY_SMS);
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
  const [generatingImages, setGeneratingImages] = useState(false);
  const [generateImagesError, setGenerateImagesError] = useState<string | null>(null);
  const [uploadingOriginal, setUploadingOriginal] = useState(false);
  const [uploadingCutout, setUploadingCutout] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [autoFilled, setAutoFilled] = useState(false);
  const [touched, setTouched] = useState<Record<TouchedField, boolean>>({
    title: false,
    description: false,
    priceSek: false,
    skick: false,
    category: false,
    dimensionLength: false,
    dimensionWidth: false,
    dimensionHeight: false,
    ctaTyp: false,
    bidStartSek: false,
    auctionEndAt: false,
    pickupDeadlineAt: false,
    imagesOriginalRaw: false,
  });
  const originalInputRef = useRef<HTMLInputElement | null>(null);
  const cutoutInputRef = useRef<HTMLInputElement | null>(null);

  const parsedValuation = useMemo(() => parseJsonInput(valuationJsonRaw), [valuationJsonRaw]);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setValuationsError("Tjänsten är inte konfigurerad i denna miljö.");
      return;
    }

    let isMounted = true;
    setValuationsLoading(true);
    supabase.functions.invoke("admin-get-all-valuations", { body: {} })
      .then(({ data, error }) => {
        if (!isMounted) return;
        if (error) throw error;
        if ((data as any)?.ok === false) {
          const msg = (data as any)?.message || (data as any)?.error || "Kunde inte hämta värderingar.";
          throw new Error(msg);
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

  useEffect(() => {
    setAutoFilled(false);
  }, [valuationJsonRaw]);

  const afterfraganLokalt = useMemo(() => {
    if (parsedValuation && typeof parsedValuation === "object") {
      const raw = (parsedValuation as any).afterfragan_lokalt;
      if (typeof raw === "string") {
        return raw
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "");
      }
    }
    return "normal";
  }, [parsedValuation]);

  const handleAutoFill = () => {
    if (!parsedValuation || typeof parsedValuation !== "object") {
      setError("Kunde inte tolka värderingen.");
      return;
    }

    const valuation = parsedValuation as any;
    const suggestedTitle = typeof valuation.foremal_beskrivning === "string" ? valuation.foremal_beskrivning : "";
    const suggestedDescription = typeof valuation.motivering === "string" ? valuation.motivering : "";
    const suggestedPrice = typeof valuation.varde_min_sek === "number"
      ? String(valuation.varde_min_sek)
      : typeof valuation.varde_sek === "number"
        ? String(valuation.varde_sek)
        : "";
    const suggestedSkick = typeof valuation.skick === "string" ? valuation.skick : typeof valuation.condition === "string" ? valuation.condition : "";
    const dims = valuation?.matt ?? valuation?.dimensions_mm ?? valuation?.dimensions ?? null;
    const suggestedCategory = deriveCategory(valuation);
    const dimensionLabel = formatDimensions(dims);
    const combinedDescription = [
      suggestedDescription,
      suggestedSkick ? `Skick: ${suggestedSkick}` : "",
      dimensionLabel,
    ].filter(Boolean).join("\n");

    setSource("valuation");
    if (suggestedTitle && shouldFill(touched, "title", title)) setTitle(suggestedTitle);
    if (combinedDescription && shouldFill(touched, "description", description)) setDescription(combinedDescription);
    if (suggestedPrice && shouldFill(touched, "priceSek", priceSek)) setPriceSek(suggestedPrice);
    if (suggestedSkick && shouldFill(touched, "skick", skick)) setSkick(suggestedSkick);
    if (suggestedCategory && shouldFill(touched, "category", category)) setCategory(suggestedCategory);
    if (dims && typeof dims === "object") {
      const length = dims.length ?? dims?.length_mm ?? dims?.length_cm;
      const width = dims.width ?? dims?.width_mm ?? dims?.width_cm;
      const height = dims.height ?? dims?.height_mm ?? dims?.height_cm;
      if (length && shouldFill(touched, "dimensionLength", dimensionLength)) setDimensionLength(String(length));
      if (width && shouldFill(touched, "dimensionWidth", dimensionWidth)) setDimensionWidth(String(width));
      if (height && shouldFill(touched, "dimensionHeight", dimensionHeight)) setDimensionHeight(String(height));
    }

    const nextCta: HandplockatCtaType = afterfraganLokalt === "hog" ? "bud" : "direktkop";
    if (!touched.ctaTyp) setCtaTyp(nextCta);

    if (nextCta === "bud" && suggestedPrice && shouldFill(touched, "bidStartSek", bidStartSek)) {
      const base = Number(suggestedPrice);
      const fallback = Number.isNaN(base) ? "" : String(Math.round(base * BID_START_FACTOR));
      setBidStartSek(fallback || suggestedPrice);
    }
    if (nextCta === "bud" && shouldFill(touched, "auctionEndAt", auctionEndAt)) {
      setAuctionEndAt(toLocalInputValue(addHours(48)));
    }
    if (shouldFill(touched, "pickupDeadlineAt", pickupDeadlineAt)) {
      setPickupDeadlineAt(toLocalInputValue(addDays(7)));
    }

    setError(null);
  };

  const getValuationPayload = (valuation: Valuation) => {
    const raw = (valuation as any).analysis_result ?? (valuation as any).analysis ?? null;
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
    if (Array.isArray((valuation as any).image_urls)) {
      return ((valuation as any).image_urls as any[]).map(String).filter(Boolean);
    }
    if (Array.isArray(payload?.image_urls)) {
      return payload.image_urls.map(String).filter(Boolean);
    }
    if (Array.isArray(payload?.analysis_result?.image_urls)) {
      return payload.analysis_result.image_urls.map(String).filter(Boolean);
    }
    return [];
  };

  const createSignedUrlForPath = async (path: string): Promise<string | null> => {
    const buckets = ["handplockat-private", "images"];
    for (const bucket of buckets) {
      const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 600);
      if (!error && data?.signedUrl) return data.signedUrl;
    }
    return null;
  };

  const getValuationLabel = (valuation: Valuation) => {
    const payload = getValuationPayload(valuation) as any;
    const objectLabel = payload?.foremal_beskrivning || payload?.analysis_result?.foremal_beskrivning;
    const created = valuation.created_at ? new Date(valuation.created_at).toLocaleDateString("sv-SE") : "";
    return `${objectLabel ?? "Värdering"} ${created ? `(${created})` : ""}`.trim();
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
    setSource("valuation");
    const paths = getValuationImagePaths(selected, payload);
    setValuationImagePaths(paths);
    setValuationImageUrls([]);
    if (paths.length > 0 && shouldFill(touched, "imagesOriginalRaw", imagesOriginalRaw)) {
      setImagesOriginalRaw(paths.join("\n"));
    }
    setError(null);
  };

  useEffect(() => {
    if (valuationImagePaths.length === 0) {
      setValuationImageUrls([]);
      return;
    }

    let isMounted = true;
    Promise.all(valuationImagePaths.map((path) => createSignedUrlForPath(path)))
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

  const ensureListingId = () => {
    if (listingId.trim()) return listingId.trim();
    setUploadError("Fyll i annons-ID innan du laddar upp bilder.");
    return "";
  };

  const uploadFileToBucket = async (file: File, bucket: string, folder: string) => {
    const safeFile = await stripExif(file);
    const ext = (safeFile.name.split(".").pop() || "bin").toLowerCase();
    const fileId = crypto.randomUUID();
    const filename = `${fileId}.${ext}`;
    const path = `${folder}/${filename}`;

    const { error: uploadError } = await supabase.storage.from(bucket).upload(path, safeFile, { upsert: false });
    if (uploadError) throw uploadError;

    return { path };
  };

  const handleOriginalUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    if (!isSupabaseConfigured) {
      setUploadError("Tjänsten är inte konfigurerad i denna miljö.");
      return;
    }
    const id = ensureListingId();
    if (!id) return;

    setUploadError(null);
    setUploadingOriginal(true);
    try {
      const uploads = await Promise.all(
        Array.from(files).map((file) => uploadFileToBucket(file, "handplockat-private", `handplockat-original/${id}`))
      );
      const paths = uploads.map((u) => u.path);
      const existing = normalizeUrlList(imagesOriginalRaw);
      const next = [...existing, ...paths].join("\n");
      setImagesOriginalRaw(next);
    } catch (err) {
      setUploadError(getErrorMessage(err, "Kunde inte ladda upp originalbilder."));
    } finally {
      setUploadingOriginal(false);
      if (originalInputRef.current) originalInputRef.current.value = "";
    }
  };

  const handleGenerateImages = async () => {
    setGenerateImagesError(null);
    const id = ensureListingId();
    if (!id) return;
    if (valuationImagePaths.length === 0) {
      setGenerateImagesError("Inga bilder hittades i värderingen.");
      return;
    }

    setGeneratingImages(true);
    try {
      const { data, error } = await supabase.functions.invoke("handplockat-generate-images", {
        body: {
          listing_id: id,
          source_image_paths: valuationImagePaths,
        },
      });

      if (error) throw error;
      if ((data as any)?.ok === false) {
        const msg = (data as any)?.error || (data as any)?.message || "Bildtjänsten är inte aktiverad. Ladda upp bilder manuellt i stället.";
        throw new Error(msg);
      }

      const urls = Array.isArray((data as any)?.public_urls) ? (data as any).public_urls : [];
      if (urls.length > 0) {
        setImageCutout(String(urls[0]));
      }
    } catch (err) {
      setGenerateImagesError(getErrorMessage(err, "Bildtjänsten är inte aktiverad. Ladda upp bilder manuellt i stället."));
    } finally {
      setGeneratingImages(false);
    }
  };

  const handleCutoutUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    if (!isSupabaseConfigured) {
      setUploadError("Tjänsten är inte konfigurerad i denna miljö.");
      return;
    }
    const id = ensureListingId();
    if (!id) return;

    setUploadError(null);
    setUploadingCutout(true);
    try {
      const file = files[0];
      const { path } = await uploadFileToBucket(file, "handplockat-public", `handplockat/${id}`);
      const { data } = supabase.storage.from("handplockat-public").getPublicUrl(path);
      if (!data?.publicUrl) throw new Error("Kunde inte hämta publik länk.");
      setImageCutout(data.publicUrl);
    } catch (err) {
      setUploadError(getErrorMessage(err, "Kunde inte ladda upp frilagd bild."));
    } finally {
      setUploadingCutout(false);
      if (cutoutInputRef.current) cutoutInputRef.current.value = "";
    }
  };

  useEffect(() => {
    if (!parsedValuation || typeof parsedValuation !== "object" || autoFilled) return;

    const valuation = parsedValuation as any;
    const suggestedTitle = typeof valuation.foremal_beskrivning === "string" ? valuation.foremal_beskrivning : "";
    const suggestedDescription = typeof valuation.motivering === "string" ? valuation.motivering : "";
    const suggestedPrice = typeof valuation.varde_min_sek === "number"
      ? String(valuation.varde_min_sek)
      : typeof valuation.varde_sek === "number"
        ? String(valuation.varde_sek)
        : "";
    const suggestedSkick = typeof valuation.skick === "string" ? valuation.skick : typeof valuation.condition === "string" ? valuation.condition : "";
    const dims = valuation?.matt ?? valuation?.dimensions_mm ?? valuation?.dimensions ?? null;
    const suggestedCategory = deriveCategory(valuation);
    const dimensionLabel = formatDimensions(dims);
    const combinedDescription = [
      suggestedDescription,
      suggestedSkick ? `Skick: ${suggestedSkick}` : "",
      dimensionLabel,
    ].filter(Boolean).join("\n");

    if (source !== "valuation") setSource("valuation");
    if (suggestedTitle && shouldFill(touched, "title", title)) setTitle(suggestedTitle);
    if (combinedDescription && shouldFill(touched, "description", description)) setDescription(combinedDescription);
    if (suggestedPrice && shouldFill(touched, "priceSek", priceSek)) setPriceSek(suggestedPrice);
    if (suggestedSkick && shouldFill(touched, "skick", skick)) setSkick(suggestedSkick);
    if (suggestedCategory && shouldFill(touched, "category", category)) setCategory(suggestedCategory);
    if (dims && typeof dims === "object") {
      const length = dims.length ?? dims?.length_mm ?? dims?.length_cm;
      const width = dims.width ?? dims?.width_mm ?? dims?.width_cm;
      const height = dims.height ?? dims?.height_mm ?? dims?.height_cm;
      if (length && shouldFill(touched, "dimensionLength", dimensionLength)) setDimensionLength(String(length));
      if (width && shouldFill(touched, "dimensionWidth", dimensionWidth)) setDimensionWidth(String(width));
      if (height && shouldFill(touched, "dimensionHeight", dimensionHeight)) setDimensionHeight(String(height));
    }

    const nextCta: HandplockatCtaType = afterfraganLokalt === "hog" ? "bud" : "direktkop";
    if (!touched.ctaTyp) setCtaTyp(nextCta);
    if (nextCta === "bud" && suggestedPrice && shouldFill(touched, "bidStartSek", bidStartSek)) {
      const base = Number(suggestedPrice);
      const fallback = Number.isNaN(base) ? "" : String(Math.round(base * BID_START_FACTOR));
      setBidStartSek(fallback || suggestedPrice);
    }
    if (nextCta === "bud" && shouldFill(touched, "auctionEndAt", auctionEndAt)) {
      setAuctionEndAt(toLocalInputValue(addHours(48)));
    }
    if (shouldFill(touched, "pickupDeadlineAt", pickupDeadlineAt)) {
      setPickupDeadlineAt(toLocalInputValue(addDays(7)));
    }

    setAutoFilled(true);
  }, [
    parsedValuation,
    autoFilled,
    source,
    title,
    description,
    priceSek,
    ctaTyp,
    bidStartSek,
    afterfraganLokalt,
  ]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    const finalId = listingId.trim() || generateUuid();
    const finalSms = smsPhone.trim() || DEFAULT_SMS;
    const finalPrice = Number(priceSek);

    if (!finalId) {
      setError("Annons-ID saknas.");
      return;
    }

    if (!title.trim()) {
      setError("Rubrik saknas.");
      return;
    }

    if (!description.trim()) {
      setError("Beskrivning saknas.");
      return;
    }

    if (Number.isNaN(finalPrice) || finalPrice <= 0) {
      setError("Pris måste vara ett giltigt tal.");
      return;
    }

    if (source === "manual" && (!priceSek || Number.isNaN(finalPrice))) {
      setError("Pris är obligatoriskt.");
      return;
    }

    const finalBidStart = bidStartSek ? Number(bidStartSek) : null;
    const pickupText = pickupWindow.trim()
      ? `${pickupArea.trim() || "Sundsvall"} – ${pickupWindow.trim()}`
      : `${pickupArea.trim() || "Sundsvall"} – tid enligt överenskommelse`;
    const dimensions_mm =
      dimensionLength || dimensionWidth || dimensionHeight
        ? {
            length: dimensionLength ? Number(dimensionLength) : null,
            width: dimensionWidth ? Number(dimensionWidth) : null,
            height: dimensionHeight ? Number(dimensionHeight) : null,
          }
        : null;

    setSaving(true);
    try {
      const listing = await createHandplockatListing({
        id: finalId,
        title: title.trim(),
        description: [description.trim(), extraInfo.trim()].filter(Boolean).join("\n\n"),
        price_sek: finalPrice,
        cta_typ: ctaTyp,
        bid_start_sek: finalBidStart,
        status,
        category: category.trim() || null,
        dimensions_mm,
        skick: skick.trim() || null,
        pickup_area: pickupArea.trim() || "Sundsvall",
        pickup_window: pickupWindow.trim() || null,
        pickup_text: pickupText,
        pickup_deadline_at: pickupDeadlineAt || null,
        auction_end_at: auctionEndAt || null,
        sms_phone: finalSms,
        payment_method: "swish",
        source,
        valuation_json: parsedValuation,
        images_original: normalizeUrlList(imagesOriginalRaw),
        image_cutout: imageCutout.trim() || null,
      });

      navigate(`/handplockat/${listing.id}`);
    } catch (err) {
      setError(getErrorMessage(err, "Kunde inte skapa annons."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-[100svh] bg-background">
      <Seo
        title="Skapa annons | Handplockat Sundsvall"
        description="Skapa och publicera Handplockat-annonser for Sundsvall."
        canonical="https://www.trygghand.com/admin/handplockat/skapa"
        robots="noindex"
      />
      <Header />
      <main className="container mx-auto px-4 py-10 pb-20">
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
            <h1 className="text-2xl font-bold text-foreground">Skapa annons</h1>
            <p className="text-sm text-muted-foreground mt-2">
              Fyll i stegen nedan för att skapa en trygg och tydlig annons.
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Obs: sidan ska skyddas med admininloggning.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="rounded-3xl border border-border bg-card p-6 space-y-4">
              <h2 className="text-lg font-semibold">Steg 1: Utgå från värdering (valfritt)</h2>
              <p className="text-sm text-muted-foreground">
                Välj en tidigare värdering för att fylla i annonsen automatiskt.
              </p>
              <div className="flex flex-col gap-3 md:flex-row md:items-center">
                <select
                  value={selectedValuationId}
                  onChange={(e) => setSelectedValuationId(e.target.value)}
                  className="w-full rounded-xl border border-input px-3 py-2 text-sm"
                >
                  <option value="">Välj värdering...</option>
                  {valuations.map((valuation) => (
                    <option key={valuation.id} value={String(valuation.id)}>
                      {getValuationLabel(valuation)}
                    </option>
                  ))}
                </select>
                <Button type="button" variant="outline" onClick={handleLoadValuation} disabled={!selectedValuationId}>
                  Fyll i från värdering
                </Button>
              </div>
              {valuationsLoading && (
                <p className="text-xs text-muted-foreground">Laddar värderingar...</p>
              )}
              {valuationsError && (
                <p className="text-xs text-destructive">{valuationsError}</p>
              )}
              {valuationImageUrls.length > 0 && (
                <div className="grid grid-cols-3 gap-3">
                  {valuationImageUrls.map((url) => (
                    <div key={url} className="aspect-square rounded-xl bg-secondary/60 overflow-hidden">
                      <img src={url} alt="Valueringsbild" className="h-full w-full object-cover" />
                    </div>
                  ))}
                </div>
              )}
              <div className="flex flex-wrap gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleGenerateImages}
                  disabled={generatingImages}
                >
                  {generatingImages ? "Skapar annonsbilder..." : "Skapa annonsbilder"}
                </Button>
                {generateImagesError && (
                  <p className="text-xs text-destructive">{generateImagesError}</p>
                )}
              </div>
            </div>
            <div className="rounded-3xl border border-border bg-card p-6 space-y-4">
              <h2 className="text-lg font-semibold">Steg 2: Grunduppgifter</h2>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium">Annons-ID</label>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <input
                    value={listingId}
                    onChange={(e) => setListingId(e.target.value)}
                    placeholder="Lamn tomt sa skapas ett ID automatiskt"
                    className="w-full rounded-xl border border-input px-3 py-2 text-sm"
                  />
                  <Button type="button" variant="outline" onClick={() => setListingId(generateUuid())}>
                    Skapa ID
                  </Button>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium">Utgångspunkt</label>
                <div className="flex flex-wrap gap-3">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="source"
                      value="valuation"
                      checked={source === "valuation"}
                      onChange={() => setSource("valuation")}
                    />
                    Från värdering
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="source"
                      value="manual"
                      checked={source === "manual"}
                      onChange={() => setSource("manual")}
                    />
                    Manuell annons
                  </label>
                </div>
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
                    placeholder="Kort och tydlig rubrik"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Pris (SEK)</label>
                  <input
                    value={priceSek}
                    onChange={(e) => {
                      setPriceSek(e.target.value);
                      setTouched((prev) => ({ ...prev, priceSek: true }));
                    }}
                    className="w-full rounded-xl border border-input px-3 py-2 text-sm"
                    placeholder="t.ex. 1800"
                    type="number"
                    min="0"
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Kategori</label>
                  <input
                    value={category}
                    onChange={(e) => {
                      setCategory(e.target.value);
                      setTouched((prev) => ({ ...prev, category: true }));
                    }}
                    className="w-full rounded-xl border border-input px-3 py-2 text-sm"
                    placeholder="t.ex. Möbler, Belysning"
                  />
                </div>
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
              </div>

              <h3 className="text-base font-semibold text-foreground">Steg 3: Beskrivning</h3>
              <div className="space-y-2">
                <label className="text-sm font-medium">Beskrivning</label>
                <textarea
                  value={description}
                  onChange={(e) => {
                    setDescription(e.target.value);
                    setTouched((prev) => ({ ...prev, description: true }));
                  }}
                  className="w-full rounded-xl border border-input px-3 py-2 text-sm min-h-[120px]"
                  placeholder="Kort och tydlig beskrivning av föremålet"
                />
                <p className="text-xs text-muted-foreground">
                  Tänk på integritet: skriv inte namn, adresser eller andra personuppgifter.
                </p>
              </div>

              <h3 className="text-base font-semibold text-foreground">Steg 4: Försäljningssätt</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Försäljningssätt</label>
                  <select
                    value={ctaTyp}
                    onChange={(e) => {
                      setCtaTyp(e.target.value as HandplockatCtaType);
                      setTouched((prev) => ({ ...prev, ctaTyp: true }));
                    }}
                    className="w-full rounded-xl border border-input px-3 py-2 text-sm"
                  >
                    <option value="direktkop">Direktköp</option>
                    <option value="bud">Budgivning</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Budstart (valfritt)</label>
                  <input
                    value={bidStartSek}
                    onChange={(e) => {
                      setBidStartSek(e.target.value);
                      setTouched((prev) => ({ ...prev, bidStartSek: true }));
                    }}
                    className="w-full rounded-xl border border-input px-3 py-2 text-sm"
                    type="number"
                    min="0"
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
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
                  <label className="text-sm font-medium">Kontakt via SMS</label>
                  <input
                    value={smsPhone}
                    onChange={(e) => setSmsPhone(e.target.value)}
                    className="w-full rounded-xl border border-input px-3 py-2 text-sm"
                    placeholder={DEFAULT_SMS}
                  />
                </div>
              </div>

              <h3 className="text-base font-semibold text-foreground">Steg 5: Upphämtning</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Senaste hämtning</label>
                  <input
                    value={pickupDeadlineAt}
                    onChange={(e) => {
                      setPickupDeadlineAt(e.target.value);
                      setTouched((prev) => ({ ...prev, pickupDeadlineAt: true }));
                    }}
                    className="w-full rounded-xl border border-input px-3 py-2 text-sm"
                    type="datetime-local"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Budgivning slutar</label>
                  <input
                    value={auctionEndAt}
                    onChange={(e) => {
                      setAuctionEndAt(e.target.value);
                      setTouched((prev) => ({ ...prev, auctionEndAt: true }));
                    }}
                    className="w-full rounded-xl border border-input px-3 py-2 text-sm"
                    type="datetime-local"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Skick</label>
                <input
                  value={skick}
                    onChange={(e) => {
                      setSkick(e.target.value);
                      setTouched((prev) => ({ ...prev, skick: true }));
                    }}
                  className="w-full rounded-xl border border-input px-3 py-2 text-sm"
                  placeholder="t.ex. Mycket gott skick"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Upphämtning (område)</label>
                  <input
                    value={pickupArea}
                    onChange={(e) => setPickupArea(e.target.value)}
                    className="w-full rounded-xl border border-input px-3 py-2 text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Upphämtningstid</label>
                  <input
                    value={pickupWindow}
                    onChange={(e) => setPickupWindow(e.target.value)}
                    className="w-full rounded-xl border border-input px-3 py-2 text-sm"
                    placeholder="Tid enligt överenskommelse"
                  />
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-border bg-card p-6 space-y-4">
              <h2 className="text-lg font-semibold">Steg 6: Bilder</h2>
              <p className="text-xs text-muted-foreground">
                Originalbilder sparas internt. Frilagda bilder visas publikt.
              </p>
              <div className="flex flex-wrap gap-3">
                <input
                  ref={originalInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => handleOriginalUpload(e.target.files)}
                />
                <input
                  ref={cutoutInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleCutoutUpload(e.target.files)}
                />
                <Button type="button" variant="outline" onClick={() => originalInputRef.current?.click()} disabled={uploadingOriginal}>
                  {uploadingOriginal ? "Laddar upp..." : "Ladda upp originalbilder"}
                </Button>
                <Button type="button" variant="outline" onClick={() => cutoutInputRef.current?.click()} disabled={uploadingCutout}>
                  {uploadingCutout ? "Laddar upp..." : "Ladda upp frilagd bild"}
                </Button>
              </div>
              {uploadError && <p className="text-xs text-destructive">{uploadError}</p>}
              <div className="space-y-2">
                <label className="text-sm font-medium">Originalbilder (en per rad)</label>
                <textarea
                  value={imagesOriginalRaw}
                  onChange={(e) => {
                    setImagesOriginalRaw(e.target.value);
                    setTouched((prev) => ({ ...prev, imagesOriginalRaw: true }));
                  }}
                  className="w-full rounded-xl border border-input px-3 py-2 text-sm min-h-[100px]"
                  placeholder="Länkar eller sparade sökvägar"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Frilagd bild (länk)</label>
                <input
                  value={imageCutout}
                  onChange={(e) => setImageCutout(e.target.value)}
                  className="w-full rounded-xl border border-input px-3 py-2 text-sm"
                  placeholder="Länk till frilagd bild"
                />
              </div>
            </div>

            <div className="rounded-3xl border border-border bg-card p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Steg 7: Extra information</h2>
                <Button type="button" variant="outline" onClick={handleAutoFill}>
                  Hämta uppgifter igen
                </Button>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Extra information (valfritt)</label>
                <textarea
                  value={extraInfo}
                  onChange={(e) => setExtraInfo(e.target.value)}
                  className="w-full rounded-xl border border-input px-3 py-2 text-sm min-h-[80px]"
                  placeholder="Extra information som ska synas i annonsen"
                />
              </div>
            </div>

            {error && <p className="text-destructive text-sm">{error}</p>}

            <div className="rounded-3xl border border-border bg-card p-6">
              <h2 className="text-lg font-semibold">Steg 8: Spara och publicera</h2>
              <div className="flex flex-wrap items-center gap-3 mt-4">
                <Button type="submit" disabled={saving}>
                  {saving ? "Sparar..." : "Spara annons"}
                </Button>
                <Button type="button" variant="outline" onClick={() => navigate("/handplockat")}>
                  Visa publika annonser
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
