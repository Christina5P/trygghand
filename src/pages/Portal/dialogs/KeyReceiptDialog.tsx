import React, { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { buildCustomerPath, insertCustomerFile } from "@/lib/customerFiles";
import { uploadKeyReceiptSignature } from "@/lib/keyReceipts";

export type KeyReceiptDialogProps = {
  mode: "admin" | "customer";
  customerId?: string | null; // endast för admin (null = admin-only kvittens)
  onReceiptCreated?: () => Promise<void> | void;
};

type KeyReceipt = {
  id: string;
  customer_id?: string | null;
  key_count: number;
  description: string | null;
  signed_at: string;
  created_at: string;
};

type CustomerLite = {
  id: string;
  name: string | null;
  address: string | null;
};

type ReceiptMetaV1 = {
  version: "v1";
  company_name: "Trygg Hand";
  customer_name: string;
  customer_address: string;
  recipient_name: string;
  key_markings: string[];
  admin_signature_data_url: string;
};

function safeText(value?: string | null): string {
  const v = (value ?? "").trim();
  return v.length ? v : "Ej angivet";
}

function parseReceiptMeta(description?: string | null): ReceiptMetaV1 | null {
  const raw = (description ?? "").trim();
  if (!raw) return null;
  if (!raw.startsWith("{")) return null;
  try {
    const parsed = JSON.parse(raw);
    if (parsed?.version !== "v1") return null;
    if (parsed?.company_name !== "Trygg Hand") return null;
    if (typeof parsed?.admin_signature_data_url !== "string") return null;
    return parsed as ReceiptMetaV1;
  } catch {
    return null;
  }
}

function formatDate(value?: string | null): string {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString("sv-SE");
}

function formatDateOnly(value?: string | null): string {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString("sv-SE");
}

function hashTo4Digits(input: string): string {
  // djb2-ish, deterministic, fast, no UUID exposure.
  let hash = 5381;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 33) ^ input.charCodeAt(i);
  }
  const n = Math.abs(hash) % 10_000;
  return String(n).padStart(4, "0");
}

function toReceiptNumber(receiptId: string, createdAt?: string | null): string {
  const d = createdAt ? new Date(createdAt) : null;
  const year = d && !Number.isNaN(d.getTime()) ? String(d.getFullYear()) : "0000";
  const suffix = hashTo4Digits(receiptId);
  // Example: NK-2026-0007
  return `NK-${year}-${suffix}`;
}

function normalizeText(value?: string | null): string {
  const v = (value ?? "").trim();
  return v;
}

function parseMarking(description?: string | null): string {
  // "Märkning" är fri text. Vi visar den rakt av.
  return normalizeText(description) || "—";
}

function SignaturePad({
  disabled,
  output,
  onSave,
  saveLabel,
}: {
  disabled: boolean;
  output: "blob" | "dataUrl";
  onSave: (value: Blob | string) => Promise<void> | void;
  saveLabel: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);

  const getPoint = (e: React.PointerEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const start = (e: React.PointerEvent) => {
    if (disabled) return;
    drawingRef.current = true;
    const ctx = canvasRef.current!.getContext("2d")!;
    const p = getPoint(e);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
  };

  const move = (e: React.PointerEvent) => {
    if (disabled) return;
    if (!drawingRef.current) return;
    const ctx = canvasRef.current!.getContext("2d")!;
    const p = getPoint(e);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
  };

  const end = () => {
    drawingRef.current = false;
  };

  const clear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const save = async () => {
    if (disabled) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (output === "dataUrl") {
      const dataUrl = canvas.toDataURL("image/png");
      await onSave(dataUrl);
      return;
    }

    const blob: Blob = await new Promise((resolve, reject) => {
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob failed"))), "image/png");
    });

    await onSave(blob);
  };

  return (
    <div>
      <canvas
        ref={canvasRef}
        width={320}
        height={160}
        style={{ border: "1px solid #ccc", touchAction: "none" }}
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={end}
        onPointerLeave={end}
      />
      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
        <button
          type="button"
          onClick={clear}
          disabled={disabled}
          className="inline-flex min-h-10 items-center justify-center rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Rensa signatur
        </button>
        <button
          type="button"
          onClick={save}
          disabled={disabled}
          className="inline-flex min-h-10 items-center justify-center rounded-md bg-trust-blue px-4 py-2 text-sm font-medium text-white hover:bg-trust-blue/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saveLabel}
        </button>
      </div>
    </div>
  );
}

export default function KeyReceiptDialog(props: KeyReceiptDialogProps) {
  const { mode, customerId, onReceiptCreated } = props;

  // -----------------
  // Admin state
  // -----------------
  const [keyCount, setKeyCount] = useState<number>(2);
  const [description, setDescription] = useState<string>("");
  const [adminReceiptId, setAdminReceiptId] = useState<string | null>(null);
  const [adminStatus, setAdminStatus] = useState<string | null>(null);
  const [adminError, setAdminError] = useState<string | null>(null);

  const [adminCustomerName, setAdminCustomerName] = useState<string>("");
  const [adminCustomerAddress, setAdminCustomerAddress] = useState<string>("");
  const [adminRecipientName, setAdminRecipientName] = useState<string>("");
  const [adminKeyMarkingsText, setAdminKeyMarkingsText] = useState<string>("");
  const [adminSignatureDataUrl, setAdminSignatureDataUrl] = useState<string | null>(null);
  const [adminReceipts, setAdminReceipts] = useState<KeyReceipt[]>([]);
  const [adminReceiptsLoading, setAdminReceiptsLoading] = useState(false);

  // -----------------
  // Customer state
  // -----------------
  const [customerReceipts, setCustomerReceipts] = useState<KeyReceipt[]>([]);
  const [customerSignedReceipts, setCustomerSignedReceipts] = useState<KeyReceipt[]>([]);
  const [customerLoading, setCustomerLoading] = useState(false);
  const [customerError, setCustomerError] = useState<string | null>(null);
  const [customerInfo, setCustomerInfo] = useState<string | null>(null);
  const [signing, setSigning] = useState(false);

  // Customer identity (name/address) for display in the receipt.
  const [subjectCustomer, setSubjectCustomer] = useState<CustomerLite | null>(null);
  const [subjectCustomerLoading, setSubjectCustomerLoading] = useState(false);

  const latestUnsigned = useMemo(() => {
    return customerReceipts[0] ?? null;
  }, [customerReceipts]);

  const subjectCustomerId = useMemo(() => {
    if (mode === "admin") return customerId ?? null;
    return null;
  }, [mode, customerId]);

  const receiptForDisplay: KeyReceipt | null = useMemo(() => {
    if (mode === "customer") return latestUnsigned;
    if (adminReceiptId) {
      // We only store the id from the RPC response; other metadata comes from current form.
      return {
        id: adminReceiptId,
        key_count: keyCount,
        description: description.trim() ? description.trim() : null,
        signed_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      };
    }
    return null;
  }, [mode, latestUnsigned, adminReceiptId, keyCount, description]);

  const receiptNumber = useMemo(() => {
    if (!receiptForDisplay?.id) return "";
    return toReceiptNumber(receiptForDisplay.id, receiptForDisplay.created_at || receiptForDisplay.signed_at);
  }, [receiptForDisplay]);

  const resolveStorageCustomerId = async (): Promise<string | null> => {
    if (mode === "admin") return subjectCustomerId ?? null;

    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id ?? null;
    if (!userId) return null;

    const { data: byUserId, error: userIdErr } = await supabase
      .from("customers")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();
    if (!userIdErr && byUserId?.id) return String(byUserId.id);

    const { data: byId, error: byIdErr } = await supabase
      .from("customers")
      .select("id")
      .eq("id", userId)
      .maybeSingle();
    if (!byIdErr && byId?.id) return String(byId.id);

    return null;
  };

  // -----------------
  // Customer: fetch + pick latest unsigned
  // -----------------
  const fetchCustomerReceipts = async () => {
    setCustomerLoading(true);
    setCustomerError(null);
    setCustomerInfo(null);

    try {
      const { data, error } = await supabase.rpc("customer_get_my_key_receipts");
      if (error) throw error;

      const list: KeyReceipt[] = Array.isArray(data)
        ? (data as any[]).map((r) => ({
            id: String((r as any).id),
            customer_id: (r as any).customer_id ?? null,
            key_count: Number((r as any).key_count),
            description: (r as any).description ?? null,
            signed_at: String((r as any).signed_at ?? ""),
            created_at: String((r as any).created_at ?? ""),
          }))
        : [];

      const unsigned: KeyReceipt[] = [];
      const signed: KeyReceipt[] = [];
      const storageCustomerId = await resolveStorageCustomerId();

      for (const receipt of list) {
        if (!storageCustomerId) {
          unsigned.push(receipt);
          continue;
        }
        const path = buildCustomerPath(storageCustomerId, ["key-receipts", receipt.id], "signature.png");
        const { error: dlErr } = await supabase.storage.from("key-receipts").download(path);
        if (dlErr) {
          unsigned.push(receipt);
        } else {
          signed.push(receipt);
        }
      }

      setCustomerReceipts(unsigned);
      setCustomerSignedReceipts(signed);
      if (unsigned.length === 0 && signed.length === 0) {
        setCustomerInfo("Ingen nyckelkvittens hittades.");
      }
    } catch (e) {
      console.error("customer_get_my_key_receipts failed", e);
      setCustomerError("Kunde inte hämta nyckelkvittenser.");
    } finally {
      setCustomerLoading(false);
    }
  };

  useEffect(() => {
    if (mode !== "customer") return;
    let cancelled = false;

    const run = async () => {
      if (cancelled) return;
      await fetchCustomerReceipts();
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [mode]);

  // -----------------
  // Fetch customer name/address (customer mode: current user; admin mode: selected customer)
  // -----------------
  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      setSubjectCustomerLoading(true);

      try {
        let targetId: string | null = null;

        if (mode === "admin") {
          targetId = subjectCustomerId;
        } else {
          const {
            data: { user },
          } = await supabase.auth.getUser();
          targetId = user?.id ?? null;
        }

        if (!targetId) {
          if (!cancelled) setSubjectCustomer(null);
          return;
        }

        // Try selecting name + address; if address column doesn't exist, fall back to name only.
        let data: any = null;
        let error: any = null;

        {
          const res = await supabase
            .from("customers")
            .select("id,name,address")
            .eq("id", targetId)
            .maybeSingle();
          data = res.data;
          error = res.error;
        }

        if (error && String(error?.message || "").toLowerCase().includes("column") && String(error?.message || "").includes("address")) {
          const res = await supabase
            .from("customers")
            .select("id,name")
            .eq("id", targetId)
            .maybeSingle();
          data = res.data;
          error = res.error;
        }

        if (error) throw error;

        const customer: CustomerLite = {
          id: String(data?.id ?? targetId),
          name: (data?.name ?? null) as string | null,
          address: (data?.address ?? null) as string | null,
        };

        if (!cancelled) setSubjectCustomer(customer);
      } catch (e) {
        console.error("fetch customer for key receipt failed", e);
        if (!cancelled) setSubjectCustomer(null);
      } finally {
        if (!cancelled) setSubjectCustomerLoading(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [mode, subjectCustomerId]);

  // Admin: prefill customer name/address from selected customer if admin hasn't typed yet.
  useEffect(() => {
    if (mode !== "admin") return;
    if (!subjectCustomer) return;

    setAdminCustomerName((prev) => (prev.trim().length ? prev : (subjectCustomer.name ?? "")));
    setAdminCustomerAddress((prev) => (prev.trim().length ? prev : (subjectCustomer.address ?? "")));
  }, [mode, subjectCustomer]);

  // -----------------
  // Admin: create receipt
  // -----------------
  const fetchAdminReceipts = async () => {
    if (mode !== "admin") return;
    setAdminReceiptsLoading(true);
    try {
      const { data, error } = await supabase.rpc("admin_get_key_receipts");
      if (error) throw error;

      const list: KeyReceipt[] = Array.isArray(data)
        ? (data as any[]).map((r) => ({
            id: String((r as any).id),
            key_count: Number((r as any).key_count),
            description: (r as any).description ?? null,
            signed_at: String((r as any).signed_at ?? ""),
            created_at: String((r as any).created_at ?? ""),
          }))
        : [];

      const filtered = subjectCustomerId
        ? list.filter((r: any) => String((r as any).customer_id ?? "") === subjectCustomerId)
        : list;

      setAdminReceipts(filtered);
    } catch (e) {
      console.error("admin_get_key_receipts failed", e);
      setAdminReceipts([]);
    } finally {
      setAdminReceiptsLoading(false);
    }
  };

  useEffect(() => {
    if (mode !== "admin") return;
    void fetchAdminReceipts();
  }, [mode, subjectCustomerId]);

  const handleAdminCreate = async () => {
    setAdminStatus(null);
    setAdminReceiptId(null);
    setAdminError(null);

    try {
      if (!adminSignatureDataUrl) {
        setAdminError("Signera mottagandet innan du skapar kvittensen.");
        return;
      }

      const keyMarkings = adminKeyMarkingsText
        .split("\n")
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

      const meta: ReceiptMetaV1 = {
        version: "v1",
        company_name: "Trygg Hand",
        customer_name: safeText(adminCustomerName),
        customer_address: safeText(adminCustomerAddress),
        recipient_name: safeText(adminRecipientName),
        key_markings: keyMarkings.length ? keyMarkings : ["Ej angivet"],
        admin_signature_data_url: adminSignatureDataUrl,
      };

      const { data, error } = await supabase.rpc("admin_create_key_receipt", {
        p_key_count: keyCount,
        p_customer_id: customerId ?? null,
        // Store structured receipt info + admin signature in description.
        p_description: JSON.stringify(meta),
      });

      if (error) throw error;

      const id = (data as any)?.id ? String((data as any).id) : null;
      setAdminReceiptId(id);
      await fetchAdminReceipts();
      await onReceiptCreated?.();

      if (customerId) {
        try {
          const { data: userData } = await supabase.auth.getUser();
          const actorId = userData?.user?.id;
          if (!actorId || !id) throw new Error("Saknar uppgifter för att skapa kundnotis.");

          const { data: customer, error: customerError } = await supabase
            .from("customers")
            .select("user_id")
            .eq("id", customerId)
            .maybeSingle();
          if (customerError) throw customerError;

          const response = await fetch("https://trygghand.netlify.app/.netlify/functions/create-notification", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              type: "key_receipt",
              ref_id: id,
              ref_type: "key_receipt",
              actor_id: actorId,
              recipient_id: customer?.user_id ?? customerId,
            }),
          });
          if (!response.ok) throw new Error(await response.text());
          setAdminStatus("Nyckelkvittensen skapades och kunden har notifierats.");
        } catch (e) {
          console.error("create-notification failed", e);
          setAdminStatus("Nyckelkvittensen skapades, men kundnotisen kunde inte skickas.");
        }
      } else {
        setAdminStatus("Nyckelkvittens signerad av Trygg Hand.");
      }
    } catch (e) {
      console.error("admin_create_key_receipt failed", e);
      setAdminError("Kunde inte skapa nyckelkvittens.");
    }
  };

  const handleAdminSaveSignature = async (value: Blob | string) => {
    if (typeof value === "string") {
      setAdminSignatureDataUrl(value);
      setAdminStatus("Signatur registrerad – skapa kvittensen för att spara.");
      return;
    }
  };

  // -----------------
  // Customer: sign + upload
  // -----------------
  const handleCustomerSaveSignature = async (blob: Blob) => {
    if (!latestUnsigned?.id) return;

    setSigning(true);
    setCustomerError(null);
    setCustomerInfo(null);

    try {
      const storageCustomerId = await resolveStorageCustomerId();
      if (!storageCustomerId) throw new Error("Saknar kund-ID för nyckelkvittens");
      
      await uploadKeyReceiptSignature(
        latestUnsigned.id,
        storageCustomerId,
        blob,
        latestUnsigned.customer_id
      );

      setCustomerInfo("Nycklar mottagna och kvitterade av kund");
      await fetchCustomerReceipts();
    } catch (e) {
      console.error("upload signature failed", e);
      setCustomerError("Kunde inte spara signaturen.");
    } finally {
      setSigning(false);
    }
  };

  const parsedMeta = useMemo(() => {
    if (mode === "customer") {
      return latestUnsigned ? parseReceiptMeta(latestUnsigned.description) : null;
    }
    // In admin view, we show based on current inputs + signature.
    if (mode === "admin") {
      const keyMarkings = adminKeyMarkingsText
        .split("\n")
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
      if (!adminSignatureDataUrl) return null;
      const meta: ReceiptMetaV1 = {
        version: "v1",
        company_name: "Trygg Hand",
        customer_name: safeText(adminCustomerName),
        customer_address: safeText(adminCustomerAddress),
        recipient_name: safeText(adminRecipientName),
        key_markings: keyMarkings.length ? keyMarkings : ["Ej angivet"],
        admin_signature_data_url: adminSignatureDataUrl,
      };
      return meta;
    }
    return null;
  }, [mode, latestUnsigned, adminCustomerName, adminCustomerAddress, adminRecipientName, adminKeyMarkingsText, adminSignatureDataUrl]);

  const customerName = safeText(parsedMeta?.customer_name ?? subjectCustomer?.name ?? null);
  const customerAddress = safeText(parsedMeta?.customer_address ?? subjectCustomer?.address ?? null);

  const renderReceipt = (receipt: KeyReceipt, options?: { showSignaturePad?: boolean }) => {
    const showSignaturePad = options?.showSignaturePad ?? false;
    const dateOfHandover = formatDateOnly(receipt.created_at || receipt.signed_at);
    const number = toReceiptNumber(receipt.id, receipt.created_at || receipt.signed_at);

    const meta = parseReceiptMeta(receipt.description) ?? parsedMeta;
    const keyMarkings = meta?.key_markings ?? (receipt.description ? [normalizeText(receipt.description)] : []);
    const recipientName = safeText(meta?.recipient_name ?? null);
    const companyName = "Trygg Hand";

    const adminIntro = `Jag, ${recipientName}, intygar härmed att jag har mottagit ovan angivet antal nycklar från kund.`;
    const customerIntro = "Jag bekräftar härmed att jag har mottagit mina nycklar efter avslutat uppdrag.";

    return (
      <div className="w-full rounded-lg border border-slate-200 bg-white p-4 space-y-4">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold text-trust-blue">
            {mode === "admin" ? "Nyckelkvittens – Mottagande" : "Nyckelkvittens – Återlämning"}
          </h2>
          <div className="text-sm text-slate-600">Kvittensnummer: <span className="font-medium text-slate-900">{number}</span></div>
        </div>

        {/* Metadata */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-md bg-slate-50 border border-slate-200 p-3 text-sm">
          <div>
            <div className="text-slate-500">Kund</div>
            <div className="font-medium text-slate-900">{customerName}</div>
          </div>
          <div>
            <div className="text-slate-500">Adress</div>
            <div className="font-medium text-slate-900 whitespace-pre-wrap">{customerAddress}</div>
          </div>
          <div>
            <div className="text-slate-500">Datum</div>
            <div className="font-medium text-slate-900">{dateOfHandover || "Ej angivet"}</div>
          </div>
          <div>
            <div className="text-slate-500">Antal nycklar</div>
            <div className="font-medium text-slate-900">{Number.isFinite(receipt.key_count) ? receipt.key_count : "Ej angivet"}</div>
          </div>
          <div className="sm:col-span-2">
            <div className="text-slate-500">Numrerad nyckelmärkning</div>
            {keyMarkings.length ? (
              <ol className="mt-1 list-decimal pl-5 text-slate-900">
                {keyMarkings.map((k, idx) => (
                  <li key={idx} className="font-medium whitespace-pre-wrap">{safeText(k)}</li>
                ))}
              </ol>
            ) : (
              <div className="font-medium text-slate-900">Ej angivet</div>
            )}
          </div>
          <div>
            <div className="text-slate-500">Företag</div>
            <div className="font-medium text-slate-900">{companyName}</div>
          </div>
          <div>
            <div className="text-slate-500">Mottagare</div>
            <div className="font-medium text-slate-900">{recipientName}</div>
          </div>
        </div>

        {/* Förbindelsetext */}
        <div className="rounded-md border border-slate-200 p-3 bg-white">
          <div className="text-sm font-semibold text-slate-900 mb-2">Förbindelse / Bekräftelse</div>
          {mode === "admin" ? (
            <div className="text-sm text-slate-700 space-y-3">
              <p>{adminIntro}</p>
              <div className="whitespace-pre-wrap">
                {"Genom min kvittens förbinder jag mig att:\n\n" +
                  "• Förvara nycklarna på ett betryggande sätt så att de inte kommer i obehörigas händer.\n" +
                  "• Inte låna ut nycklarna till någon obehörig.\n" +
                  "• Inte tillverka kopior av någon nyckel.\n" +
                  "• Inte märka någon nyckel så att den av obehörig kan identifieras till avsedd adress oavsett lås.\n" +
                  "• Omedelbart anmäla eventuell förlust av nycklar till kunden.\n" +
                  "• Vid förlust av nycklar ersätta kundens kostnad för låsbyte.\n" +
                  "• Vid avslutat arbete omedelbart lämna tillbaka utkvitterade nycklar enligt överenskommelse med kund."}
              </div>
            </div>
          ) : (
            <div className="text-sm text-slate-700 space-y-2">
              <p>{customerIntro}</p>
            </div>
          )}
        </div>

        {/* Signatur */}
        <div className="space-y-2">
          <div className="text-sm font-semibold text-slate-900">Signatur</div>
          {showSignaturePad ? (
            <>
              <div className="text-sm text-slate-700">
                {mode === "admin"
                  ? "Signera mottagandet av nycklar (Trygg Hand)."
                  : "Signera återlämningen och bekräfta att nycklarna är mottagna."}
              </div>
              {mode === "admin" ? (
                <SignaturePad
                  disabled={false}
                  output="dataUrl"
                  onSave={handleAdminSaveSignature}
                  saveLabel="Spara Trygg Hands signatur"
                />
              ) : (
                <SignaturePad
                  disabled={signing}
                  output="blob"
                  onSave={(v) => handleCustomerSaveSignature(v as Blob)}
                  saveLabel="Signera och spara kvittensen"
                />
              )}
              {mode === "admin" && parsedMeta?.admin_signature_data_url ? (
                <div className="pt-2">
                  <div className="text-xs text-slate-600 mb-1">Signatur (Trygg Hand)</div>
                  <img
                    src={parsedMeta.admin_signature_data_url}
                    alt="Signatur Trygg Hand"
                    className="max-w-full border border-slate-200 rounded"
                  />
                </div>
              ) : null}
            </>
          ) : (
            <div className="text-sm text-slate-600">
              {mode === "admin" ? "Signeras av Trygg Hand i adminportalen." : "Signeras av kund i kundportalen."}
            </div>
          )}
        </div>
      </div>
    );
  };

  if (mode === "admin") {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-3">
          <div className="text-sm font-semibold text-slate-900">Nyckelkvittens – Mottagande</div>

          <div>
            <div className="text-sm font-medium text-slate-900">Kundens namn</div>
            <input
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm"
              type="text"
              value={adminCustomerName}
              onChange={(e) => setAdminCustomerName(e.target.value)}
              placeholder="Ange kundens namn"
            />
          </div>

          <div>
            <div className="text-sm font-medium text-slate-900">Adress</div>
            <input
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm"
              type="text"
              value={adminCustomerAddress}
              onChange={(e) => setAdminCustomerAddress(e.target.value)}
              placeholder="Ange adress"
            />
          </div>

          <div>
            <div className="text-sm font-medium text-slate-900">Mottagarens namn (Trygg Hand)</div>
            <input
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm"
              type="text"
              value={adminRecipientName}
              onChange={(e) => setAdminRecipientName(e.target.value)}
              placeholder="Ange mottagarens namn"
            />
          </div>

          <div>
            <div className="text-sm font-medium text-slate-900">Antal nycklar</div>
            <input
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm"
              type="number"
              min={1}
              required
              value={Number.isFinite(keyCount) ? keyCount : 1}
              onChange={(e) => setKeyCount(Number(e.target.value))}
            />
          </div>

          <div>
            <div className="text-sm font-medium text-slate-900">Numrerad nyckelmärkning</div>
            <textarea
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm min-h-[120px]"
              value={adminKeyMarkingsText}
              onChange={(e) => setAdminKeyMarkingsText(e.target.value)}
              placeholder={"Nyckel 1 – ytterdörr\nNyckel 2 – garage"}
            />
          </div>

          <div>
            <div className="text-sm font-medium text-slate-900">Företagsnamn</div>
            <div className="mt-1 text-sm text-slate-900">Trygg Hand</div>
          </div>

          <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
            <div className="text-sm font-medium text-slate-900 mb-2">Signera mottagande</div>
            <p className="mb-3 text-sm text-slate-600">
              Spara först Trygg Hands signatur och skapa sedan kvittensen.
            </p>
            <SignaturePad
              disabled={false}
              output="dataUrl"
              onSave={handleAdminSaveSignature}
              saveLabel="Spara Trygg Hands signatur"
            />
            {adminSignatureDataUrl ? (
              <div className="mt-2 text-sm text-slate-700">Signatur registrerad.</div>
            ) : (
              <div className="mt-2 text-sm text-slate-700">Signera för att kunna skapa kvittensen.</div>
            )}
          </div>

          <button
            type="button"
            className="inline-flex items-center justify-center rounded bg-trust-blue px-4 py-2 text-sm font-medium text-white hover:bg-trust-blue/90"
            onClick={handleAdminCreate}
          >
            {customerId ? "Skapa nyckelkvittens och skicka till kund" : "Skapa nyckelkvittens"}
          </button>

          {subjectCustomerLoading ? <div className="text-sm text-slate-600">Hämtar kunduppgifter…</div> : null}
          {adminError ? <div className="text-sm text-red-700">{adminError}</div> : null}
          {adminStatus ? <div className="text-sm text-slate-700">{adminStatus}</div> : null}
          {adminReceiptId && receiptNumber ? (
            <div className="text-sm text-slate-700">
              Kvittensnummer: <span className="font-medium text-slate-900">{receiptNumber}</span>
            </div>
          ) : null}
        </div>

        {receiptForDisplay ? renderReceipt(receiptForDisplay, { showSignaturePad: false }) : null}

        <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-3">
          <div className="text-sm font-semibold text-slate-900">Klara nyckelkvittenser</div>
          {adminReceiptsLoading ? (
            <div className="text-sm text-slate-600">Laddar…</div>
          ) : adminReceipts.length === 0 ? (
            <div className="text-sm text-slate-600">Inga nyckelkvittenser hittades.</div>
          ) : (
            <div className="space-y-4">
              {adminReceipts.map((receipt) => (
                <div key={receipt.id}>{renderReceipt(receipt, { showSignaturePad: false })}</div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {customerLoading ? <div className="text-sm text-slate-600">Laddar…</div> : null}
      {subjectCustomerLoading ? <div className="text-sm text-slate-600">Hämtar kunduppgifter…</div> : null}
      {customerError ? <div className="text-sm text-red-700">{customerError}</div> : null}
      {customerInfo ? <div className="text-sm text-slate-700">{customerInfo}</div> : null}

      {!customerLoading && customerReceipts.length > 0 ? (
        <div className="space-y-4">
          {customerReceipts.map((receipt) => (
            <div key={receipt.id}>
              {renderReceipt(receipt, { showSignaturePad: receipt.id === latestUnsigned?.id })}
            </div>
          ))}
        </div>
      ) : null}

      {!customerLoading && customerSignedReceipts.length > 0 ? (
        <div className="space-y-4">
          <div className="text-sm font-semibold text-slate-900">Klara nyckelkvittenser</div>
          {customerSignedReceipts.map((receipt) => (
            <div key={receipt.id}>{renderReceipt(receipt, { showSignaturePad: false })}</div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
