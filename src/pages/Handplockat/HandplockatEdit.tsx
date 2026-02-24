import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Seo from "@/components/Seo";
import { Button } from "@/components/ui/button";
import {
  normalizeUrlList,
  parseJsonInput,
  updateHandplockatListing,
} from "@/lib/handplockat";
import { stripExif } from "@/integrations/supabaseUpload";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import type { HandplockatCtaType, HandplockatSource, HandplockatStatus, HandplockatListing } from "@/types";
import { useAuth } from "@/hooks/useAuth";

const DEFAULT_SMS = "+46700000000";
const COMPANY_SMS = "+46761169554";

const getErrorMessage = (err: unknown, fallback: string) => {
  if (err && typeof err === "object" && "message" in err) {
    const msg = (err as { message?: unknown }).message;
    if (typeof msg === "string") return msg;
  }
  return fallback;
};

export default function HandplockatEdit() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { customer, loading: authLoading } = useAuth();

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

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
  const [uploadingOriginal, setUploadingOriginal] = useState(false);
  const [uploadingCutout, setUploadingCutout] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const originalInputRef = useRef<HTMLInputElement | null>(null);
  const cutoutInputRef = useRef<HTMLInputElement | null>(null);

  const parsedValuation = useMemo(() => parseJsonInput(valuationJsonRaw), [valuationJsonRaw]);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoadError("Tjänsten är inte konfigurerad i denna miljö.");
      setLoading(false);
      return;
    }

    if (!id) {
      setLoadError("Saknar annons-id.");
      setLoading(false);
      return;
    }

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
        setSource(listing.source ?? "manual");
        setTitle(listing.title ?? "");
        setDescription(listing.description ?? "");
        setPriceSek(listing.price_sek != null ? String(listing.price_sek) : "");
        setCtaTyp(listing.cta_typ ?? "direktkop");
        setBidStartSek(listing.bid_start_sek != null ? String(listing.bid_start_sek) : "");
        setStatus(listing.status ?? "available");
        setCategory(listing.category ?? "");
        setDimensionLength(listing.dimensions_mm?.length != null ? String(listing.dimensions_mm.length) : "");
        setDimensionWidth(listing.dimensions_mm?.width != null ? String(listing.dimensions_mm.width) : "");
        setDimensionHeight(listing.dimensions_mm?.height != null ? String(listing.dimensions_mm.height) : "");
        setSkick(listing.skick ?? "");
        setPickupArea(listing.pickup_area ?? "Sundsvall");
        setPickupWindow(listing.pickup_window ?? "");
        setPickupDeadlineAt(listing.pickup_deadline_at ?? "");
        setAuctionEndAt(listing.auction_end_at ?? "");
        setSmsPhone(listing.sms_phone ?? COMPANY_SMS);
        setValuationJsonRaw(listing.valuation_json ? JSON.stringify(listing.valuation_json, null, 2) : "");
        setImagesOriginalRaw(Array.isArray(listing.images_original) ? listing.images_original.join("\n") : "");
        setImageCutout(listing.image_cutout ?? "");
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

    return () => {
      isMounted = false;
    };
  }, [id]);

  const ensureListingId = () => {
    if (id) return id;
    setUploadError("Annons-ID saknas.");
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
    const listingId = ensureListingId();
    if (!listingId) return;

    setUploadError(null);
    setUploadingOriginal(true);
    try {
      const uploads = await Promise.all(
        Array.from(files).map((file) => uploadFileToBucket(file, "handplockat-private", `handplockat-original/${listingId}`))
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

  const handleCutoutUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    if (!isSupabaseConfigured) {
      setUploadError("Tjänsten är inte konfigurerad i denna miljö.");
      return;
    }
    const listingId = ensureListingId();
    if (!listingId) return;

    setUploadError(null);
    setUploadingCutout(true);
    try {
      const file = files[0];
      const { path } = await uploadFileToBucket(file, "handplockat-public", `handplockat/${listingId}`);
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

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!id) {
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

    const finalPrice = Number(priceSek);
    if (Number.isNaN(finalPrice) || finalPrice <= 0) {
      setError("Pris måste vara ett giltigt tal.");
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
      await updateHandplockatListing({
        id,
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
        sms_phone: smsPhone.trim() || DEFAULT_SMS,
        payment_method: "swish",
        source,
        valuation_json: parsedValuation,
        images_original: normalizeUrlList(imagesOriginalRaw),
        image_cutout: imageCutout.trim() || null,
      });

      navigate(`/handplockat/${id}`);
    } catch (err) {
      setError(getErrorMessage(err, "Kunde inte uppdatera annons."));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[100svh] bg-background">
        <Header />
        <main className="container mx-auto px-4 py-12">
          <p className="text-muted-foreground">Laddar annons...</p>
        </main>
        <Footer />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-[100svh] bg-background">
        <Header />
        <main className="container mx-auto px-4 py-12">
          <p className="text-destructive">{loadError}</p>
        </main>
        <Footer />
      </div>
    );
  }

  if (!authLoading && !customer?.is_admin) {
    return (
      <div className="min-h-[100svh] bg-background">
        <Header />
        <main className="container mx-auto px-4 py-12">
          <p className="text-destructive">Du saknar behörighet att redigera annonser.</p>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-[100svh] bg-background">
      <Seo
        title="Redigera annons | Handplockat Sundsvall"
        description="Redigera Handplockat-annons."
        canonical={`https://www.trygghand.com/admin/handplockat/redigera/${id}`}
        robots="noindex"
      />
      <Header />
      <main className="container mx-auto px-4 py-10 pb-20">
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
            <h1 className="text-2xl font-bold text-foreground">Redigera annons</h1>
            <p className="text-sm text-muted-foreground mt-2">
              Uppdatera annonsen och spara ändringar.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="rounded-3xl border border-border bg-card p-6 space-y-4">
              <h2 className="text-lg font-semibold">Grunduppgifter</h2>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium">Annons-ID</label>
                <input
                  value={id || ""}
                  readOnly
                  className="w-full rounded-xl border border-input px-3 py-2 text-sm bg-muted"
                />
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
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full rounded-xl border border-input px-3 py-2 text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Pris (SEK)</label>
                  <input
                    value={priceSek}
                    onChange={(e) => setPriceSek(e.target.value)}
                    className="w-full rounded-xl border border-input px-3 py-2 text-sm"
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
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full rounded-xl border border-input px-3 py-2 text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Mått (mm)</label>
                  <div className="grid grid-cols-3 gap-2">
                    <input
                      value={dimensionLength}
                      onChange={(e) => setDimensionLength(e.target.value)}
                      className="w-full rounded-xl border border-input px-2 py-2 text-sm"
                      placeholder="L"
                      type="number"
                      min="0"
                    />
                    <input
                      value={dimensionWidth}
                      onChange={(e) => setDimensionWidth(e.target.value)}
                      className="w-full rounded-xl border border-input px-2 py-2 text-sm"
                      placeholder="B"
                      type="number"
                      min="0"
                    />
                    <input
                      value={dimensionHeight}
                      onChange={(e) => setDimensionHeight(e.target.value)}
                      className="w-full rounded-xl border border-input px-2 py-2 text-sm"
                      placeholder="H"
                      type="number"
                      min="0"
                    />
                  </div>
                </div>
              </div>

              <h3 className="text-base font-semibold text-foreground">Beskrivning</h3>
              <div className="space-y-2">
                <label className="text-sm font-medium">Beskrivning</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full rounded-xl border border-input px-3 py-2 text-sm min-h-[120px]"
                  placeholder="Kort och tydlig beskrivning av föremålet"
                />
                <p className="text-xs text-muted-foreground">
                  Tänk på integritet: skriv inte namn, adresser eller andra personuppgifter.
                </p>
              </div>

              <h3 className="text-base font-semibold text-foreground">Försäljningssätt</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Försäljningssätt</label>
                  <select
                    value={ctaTyp}
                    onChange={(e) => setCtaTyp(e.target.value as HandplockatCtaType)}
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
                    onChange={(e) => setBidStartSek(e.target.value)}
                    className="w-full rounded-xl border border-input px-3 py-2 text-sm"
                    type="number"
                    min="0"
                  />
                </div>
              </div>

              <h3 className="text-base font-semibold text-foreground">Upphämtning</h3>
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

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Senaste hämtning</label>
                  <input
                    value={pickupDeadlineAt}
                    onChange={(e) => setPickupDeadlineAt(e.target.value)}
                    className="w-full rounded-xl border border-input px-3 py-2 text-sm"
                    type="datetime-local"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Budgivning slutar</label>
                  <input
                    value={auctionEndAt}
                    onChange={(e) => setAuctionEndAt(e.target.value)}
                    className="w-full rounded-xl border border-input px-3 py-2 text-sm"
                    type="datetime-local"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Skick</label>
                <input
                  value={skick}
                  onChange={(e) => setSkick(e.target.value)}
                  className="w-full rounded-xl border border-input px-3 py-2 text-sm"
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
                  />
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-border bg-card p-6 space-y-4">
              <h2 className="text-lg font-semibold">Bilder</h2>
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
                  onChange={(e) => setImagesOriginalRaw(e.target.value)}
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
                <h2 className="text-lg font-semibold">Extra information</h2>
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
              <h2 className="text-lg font-semibold">Spara och publicera</h2>
              <div className="flex flex-wrap items-center gap-3 mt-4">
                <Button type="submit" disabled={saving}>
                  {saving ? "Sparar..." : "Uppdatera annons"}
                </Button>
                <Button type="button" variant="outline" onClick={() => navigate("/handplockat")}
                >
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
