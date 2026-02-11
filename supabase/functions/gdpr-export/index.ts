// @ts-ignore - Deno remote module resolved at deploy/runtime
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// @ts-ignore - Remote supabase-js for Deno resolved at deploy/runtime
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
// @ts-ignore - Deno remote module resolved at deploy/runtime
import { PDFDocument, StandardFonts, rgb } from "https://esm.sh/pdf-lib@1.17.1";

declare const Deno: { env: { get: (key: string) => string | undefined } };

type GdprRequestRow = {
  id: string;
  customer_id: string;
  status: string;
  export_bucket: string | null;
  export_path: string | null;
  expires_at: string | null;
};

type CustomerRow = {
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  customer_number?: string | number | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type CustomerFileRow = {
  customer_id: string;
  bucket: string;
  path: string;
  file_type?: string | null;
  size?: number | null;
  created_at?: string | null;
};

function corsHeaders(req?: Request) {
  const requested = req?.headers.get("access-control-request-headers");
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": requested || "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}

function json(req: Request, status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(req), "Content-Type": "application/json" },
  });
}

function isUuid(v: unknown): v is string {
  return typeof v === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}

function isMissingRelation(err: any): boolean {
  const code = typeof err?.code === "string" ? err.code : "";
  const message = typeof err?.message === "string" ? err.message.toLowerCase() : "";
  return code === "42P01" || message.includes("does not exist");
}

function isMissingColumn(err: any): boolean {
  const code = typeof err?.code === "string" ? err.code : "";
  const message = typeof err?.message === "string" ? err.message.toLowerCase() : "";
  return code === "42703" || message.includes("column");
}

function pickCustomerFields(customer: Record<string, any>) {
  return {
    name: customer?.name ?? null,
    email: customer?.email ?? null,
    phone: customer?.phone ?? null,
    address: customer?.address ?? null,
    customer_number: customer?.customer_number ?? null,
    created_at: customer?.created_at ?? null,
    updated_at: customer?.updated_at ?? null,
  };
}

function fileCategory(bucket: string, path: string) {
  const bucketLower = bucket.toLowerCase();
  const pathLower = path.toLowerCase();
  if (bucketLower.includes("image") || pathLower.includes("/images/") || pathLower.includes("/bilder/")) {
    return "images";
  }
  return "documents";
}

function filenameFromPath(path: string) {
  const parts = path.split("/");
  return parts[parts.length - 1] || path;
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleDateString("sv-SE");
}

function formatDateTime(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleString("sv-SE");
}

function wrapText(text: string, maxWidth: number, font: any, size: number) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    const width = font.widthOfTextAtSize(candidate, size);
    if (width <= maxWidth) {
      current = candidate;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }

  if (current) lines.push(current);
  return lines.length ? lines : [""];
}

async function isAdmin(service: any, userId: string): Promise<boolean> {
  const { data, error } = await service
    .from("profiles")
    .select("is_admin")
    .eq("id", userId)
    .maybeSingle();

  if (error) return false;
  return (data as any)?.is_admin === true;
}

async function fetchRequest(service: any, requestId: string): Promise<GdprRequestRow | null> {
  const { data, error } = await service
    .from("gdpr_requests")
    .select("id, customer_id, status, export_bucket, export_path, expires_at")
    .eq("id", requestId)
    .maybeSingle();

  if (error || !data) return null;
  return data as GdprRequestRow;
}

async function fetchCustomerFile(service: any, bucket: string, path: string): Promise<CustomerFileRow | null> {
  const { data, error } = await service
    .from("customer_files")
    .select("customer_id, bucket, path")
    .eq("bucket", bucket)
    .eq("path", path)
    .maybeSingle();

  if (error || !data) return null;
  return data as CustomerFileRow;
}

async function safeSelect<T>(query: Promise<{ data: T | null; error: any }>): Promise<T | null> {
  const { data, error } = await query;
  if (error) {
    if (isMissingRelation(error) || isMissingColumn(error)) return null;
    throw error;
  }
  return data ?? null;
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response("ok", { status: 200, headers: corsHeaders(req) });
  if (req.method !== "POST") return json(req, 405, { error: "Method not allowed" });

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !anonKey || !serviceRoleKey) return json(req, 500, { error: "Server configuration missing" });

  let payload: any;
  try {
    payload = await req.json();
  } catch {
    return json(req, 400, { error: "Invalid JSON" });
  }

  const requestId = payload?.request_id;
  const action = typeof payload?.action === "string" ? payload.action : "generate";
  const fileBucket = typeof payload?.bucket === "string" ? payload.bucket : null;
  const filePath = typeof payload?.path === "string" ? payload.path : null;

  if (action !== "file" && !isUuid(requestId)) return json(req, 400, { error: "Invalid request_id" });

  const authHeader = req.headers.get("authorization") || "";
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: userData, error: userErr } = await userClient.auth.getUser();
  const user = userData?.user;
  if (userErr || !user) return json(req, 401, { error: "Unauthorized" });

  const service = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let reqRow: GdprRequestRow | null = null;
  if (action !== "file") {
    reqRow = await fetchRequest(service, requestId);
    if (!reqRow) return json(req, 404, { error: "Not found" });
  }

  const admin = await isAdmin(service, user.id);
  if (action === "file") {
    if (!fileBucket || !filePath) return json(req, 400, { error: "Missing file" });
    const fileRow = await fetchCustomerFile(service, fileBucket, filePath);
    if (!fileRow) return json(req, 404, { error: "Not found" });

    if (!admin) {
      const { data: ownerRow, error: ownerErr } = await service
        .from("customers")
        .select("id, user_id")
        .eq("id", fileRow.customer_id)
        .maybeSingle();

      if (ownerErr || !ownerRow) return json(req, 403, { error: "Forbidden" });
      if ((ownerRow as any).user_id !== user.id) return json(req, 403, { error: "Forbidden" });
    }

    const { data, error } = await service.storage
      .from(fileRow.bucket)
      .createSignedUrl(fileRow.path, 600);

    if (error || !data?.signedUrl) return json(req, 500, { error: "Could not create signed url" });
    return json(req, 200, { ok: true, signed_url: data.signedUrl });
  }
  if (action === "download") {
    if (!reqRow) return json(req, 404, { error: "Not found" });
    if (!admin) {
      const { data: ownerRow, error: ownerErr } = await service
        .from("customers")
        .select("id, user_id")
        .eq("id", reqRow.customer_id)
        .maybeSingle();

      if (ownerErr || !ownerRow) return json(req, 403, { error: "Forbidden" });
      const ownerUserId = (ownerRow as any).user_id ?? null;
      const ownerMatch = ownerUserId === user.id;
      console.log("gdpr-export download owner check", {
        user_id: user.id,
        customer_id: reqRow.customer_id,
        owner_user_id: ownerUserId,
        owner_match: ownerMatch,
      });
      if (!ownerMatch) return json(req, 403, { error: "Forbidden (not owner)" });
    }

    if (!reqRow || !reqRow.export_bucket || !reqRow.export_path) return json(req, 400, { error: "Export missing" });

    let expiresAtIso: string | null = reqRow.expires_at ?? null;
    if (expiresAtIso) {
      const expiresAt = new Date(expiresAtIso).getTime();
      if (Number.isFinite(expiresAt) && Date.now() > expiresAt) {
        return json(req, 410, { error: "Export expired" });
      }
    } else {
      expiresAtIso = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    }

    const { data, error } = await service.storage
      .from(reqRow.export_bucket)
      .createSignedUrl(reqRow.export_path, 600);

    if (error || !data?.signedUrl) return json(req, 500, { error: "Could not create signed url" });

    await service
      .from("gdpr_requests")
      .update({
        status: "delivered",
        delivered_at: new Date().toISOString(),
        expires_at: expiresAtIso,
      })
      .eq("id", requestId);

    return json(req, 200, { ok: true, signed_url: data.signedUrl });
  }

  if (action === "retry") {
    if (!reqRow) return json(req, 404, { error: "Not found" });
    if (!admin) return json(req, 403, { error: "Forbidden" });

    const { data: resetRow, error: resetErr } = await service
      .from("gdpr_requests")
      .update({
        status: "requested",
        processed_at: null,
        ready_at: null,
        export_bucket: null,
        export_path: null,
        expires_at: null,
        delivered_at: null,
      })
      .eq("id", requestId)
      .in("status", ["processing", "rejected"])
      .select("id")
      .maybeSingle();

    if (resetErr) return json(req, 500, { error: "Failed to reset status" });
    if (!resetRow) return json(req, 200, { ok: true, skipped: true });

    if (reqRow) reqRow.status = "requested";
  }

  if (!reqRow) return json(req, 404, { error: "Not found" });
  if (!admin) return json(req, 403, { error: "Forbidden" });

  if (reqRow && reqRow.status === "ready" && reqRow.export_bucket && reqRow.export_path) {
    return json(req, 200, { ok: true });
  }

  if (!reqRow || reqRow.status !== "requested") {
    return json(req, 200, { ok: true, skipped: true });
  }

  const nowIso = new Date().toISOString();

  const { data: processingRow, error: processingErr } = await service
    .from("gdpr_requests")
    .update({ status: "processing", processed_at: nowIso })
    .eq("id", requestId)
    .eq("status", "requested")
    .select("id")
    .maybeSingle();

  if (processingErr) return json(req, 500, { error: "Failed to update status" });
  if (!processingRow) return json(req, 200, { ok: true, skipped: true });

  const customerId = reqRow.customer_id;

  const customer = await safeSelect<CustomerRow>(
    service.from("customers").select("*").eq("id", customerId).maybeSingle()
  );

  const cases =
    (await safeSelect<any[]>(service.from("cases").select("*").eq("customer_id", customerId))) ?? [];
  const caseIds = Array.isArray(cases) ? cases.map((c: any) => c.id).filter(Boolean) : [];

  const caseComments = caseIds.length
    ? (await safeSelect<any[]>(service.from("case_comments").select("*").in("case_id", caseIds))) ?? []
    : [];

  const customerComments =
    (await safeSelect<any[]>(service.from("customer_comments").select("*").eq("customer_id", customerId))) ?? [];

  const contactRequests =
    (await safeSelect<any[]>(service.from("contact_requests").select("*").eq("customer_id", customerId))) ?? [];

  const keyReceipts =
    (await safeSelect<any[]>(service.from("key_receipts").select("*").eq("customer_id", customerId))) ?? [];

  const subscriptions =
    (await safeSelect<any[]>(service.from("subscriptions").select("*").eq("customer_id", customerId))) ?? [];

  const subscriptionCancellations =
    (await safeSelect<any[]>(service.from("subscription_cancellations").select("*").eq("customer_id", customerId))) ?? [];
  const cancellationIds = Array.isArray(subscriptionCancellations)
    ? subscriptionCancellations.map((c: any) => c.id).filter(Boolean)
    : [];

  const cancellationComments = cancellationIds.length
    ? (await safeSelect<any[]>(service.from("cancellation_comments").select("*").in("cancellation_id", cancellationIds))) ?? []
    : [];

  const valuationsRaw =
    (await safeSelect<any[]>(service.from("valuations").select("*").eq("customer_id", customerId))) ?? [];

  const valuations = Array.isArray(valuationsRaw)
    ? valuationsRaw.map((valuation: any) => {
        const { image_urls, ...rest } = valuation || {};
        const legacy = Array.isArray(image_urls)
          ? image_urls
          : image_urls
          ? [image_urls]
          : [];
        return legacy.length > 0
          ? { ...rest, image_urls_legacy: legacy, image_urls_legacy_note: "legacy" }
          : { ...rest };
      })
    : [];

  const valuationsBackup =
    (await safeSelect<any[]>(service.from("valuations_backup").select("*").eq("customer_id", customerId))) ?? [];

  const storageItems = caseIds.length
    ? (await safeSelect<any[]>(service.from("storage_items").select("*").in("case_id", caseIds))) ?? []
    : [];

  const customerFilesRaw =
    (await safeSelect(
      service
        .from("customer_files")
        .select("bucket, path, file_type, size, created_at")
        .eq("customer_id", customerId)
    )) ?? [];

  const customerFiles = Array.isArray(customerFilesRaw)
    ? customerFilesRaw.map((file: CustomerFileRow) => {
        const bucket = file.bucket;
        const path = file.path;
        return {
          bucket,
          path,
          file_type: file.file_type ?? null,
          size: file.size ?? null,
          created_at: file.created_at ?? null,
          filename: filenameFromPath(path),
          category: fileCategory(bucket, path),
        };
      })
    : [];

  const filesByCategory = customerFiles.reduce(
    (acc: { documents: any[]; images: any[] }, file: any) => {
      if (file.category === "images") acc.images.push(file);
      else acc.documents.push(file);
      return acc;
    },
    { documents: [], images: [] }
  );

  const exportPayload = {
    generated_at: nowIso,
    customer_id: customerId,
    data: {
      customers: customer ? [pickCustomerFields(customer as any)] : [],
      cases,
      case_comments: caseComments,
      customer_comments: customerComments,
      contact_requests: contactRequests,
      key_receipts: keyReceipts,
      subscriptions,
      subscription_cancellations: subscriptionCancellations,
      cancellation_comments: cancellationComments,
      valuations,
      valuations_backup: valuationsBackup,
      storage_items: storageItems,
    },
    files: customerFiles,
    files_by_category: filesByCategory,
  };

  const exportPathJson = `customers/${customerId}/exports/${requestId}.json`;
  const exportPathPdf = `customers/${customerId}/exports/${requestId}.pdf`;
  const jsonBytes = new TextEncoder().encode(JSON.stringify(exportPayload, null, 2));

  const { error: uploadJsonErr } = await service.storage
    .from("gdpr-exports")
    .upload(exportPathJson, jsonBytes, { contentType: "application/json", upsert: true });

  if (uploadJsonErr) return json(req, 500, { error: "Failed to upload export" });

  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontSize = 11;
  const lineHeight = 15;
  const margin = 40;
  let page = pdfDoc.addPage();
  let { width, height } = page.getSize();
  let cursorY = height - margin;

  const drawLine = (text: string, bold = false) => {
    if (cursorY < margin + lineHeight) {
      page = pdfDoc.addPage();
      ({ width, height } = page.getSize());
      cursorY = height - margin;
    }
    page.drawText(text, {
      x: margin,
      y: cursorY,
      size: fontSize,
      font: bold ? fontBold : font,
      color: rgb(0.12, 0.12, 0.12),
    });
    cursorY -= lineHeight;
  };

  const drawParagraph = (text: string) => {
    const maxWidth = width - margin * 2;
    const lines = wrapText(text, maxWidth, font, fontSize);
    for (const line of lines) drawLine(line);
  };

  drawLine("Registerutdrag (GDPR)", true);
  drawLine(`Skapat: ${formatDateTime(nowIso)}`);
  drawLine("");

  drawLine("Kunduppgifter", true);
  drawLine(`Namn: ${customer?.name ?? "-"}`);
  drawLine(`E-post: ${customer?.email ?? "-"}`);
  drawLine(`Telefon: ${customer?.phone ?? "-"}`);
  drawLine(`Adress: ${customer?.address ?? "-"}`);
  drawLine(`Kundnummer: ${customer?.customer_number ?? "-"}`);
  drawLine(`Kund sedan: ${formatDate(customer?.created_at)}`);
  drawLine(`Senast uppdaterad: ${formatDate(customer?.updated_at)}`);
  drawLine("");

  const totalComments = caseComments.length + customerComments.length;
  drawLine("Sammanfattning", true);
  drawLine(`Arenden: ${cases.length}`);
  drawLine(`Kommentarer: ${totalComments}`);
  drawLine(`Varderingar: ${valuations.length}`);
  drawLine(`Filer: ${customerFiles.length}`);
  drawLine("");

  if (customerFiles.length > 0) {
    drawLine("Filer (urval)", true);
    const maxFiles = 50;
    const displayFiles = customerFiles.slice(0, maxFiles);
    for (const file of displayFiles) {
      const name = file.filename || filenameFromPath(file.path);
      const when = formatDate(file.created_at);
      drawParagraph(`- ${name} (${file.bucket}) · ${when}`);
    }
    if (customerFiles.length > maxFiles) {
      drawParagraph(`Visar ${maxFiles} av ${customerFiles.length} filer. Radata finns i JSON-filen.`);
    }
    drawLine("");
  }

  drawParagraph("Utdraget ar en sammanfattning. Fullstandig radata finns i JSON-filen.");

  const pdfBytes = await pdfDoc.save();

  const { error: uploadPdfErr } = await service.storage
    .from("gdpr-exports")
    .upload(exportPathPdf, pdfBytes, { contentType: "application/pdf", upsert: true });

  if (uploadPdfErr) return json(req, 500, { error: "Failed to upload export" });

  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const { error: readyErr } = await service
    .from("gdpr_requests")
    .update({
      status: "ready",
      export_bucket: "gdpr-exports",
      export_path: exportPathPdf,
      expires_at: expiresAt,
      ready_at: nowIso,
      processed_at: nowIso,
    })
    .eq("id", requestId);

  if (readyErr) return json(req, 500, { error: "Failed to update request" });

  return json(req, 200, { ok: true });
});
