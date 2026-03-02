import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useHandplockatAdminData } from "./useHandplockatAdminData";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";

const LISTING_STATUS_LABELS: Record<string, string> = {
  draft: "Utkast",
  available: "Tillgänglig",
  reserved: "Reserverad",
  sold: "Såld",
};

const ORDER_STATUS_LABELS: Record<string, string> = {
  pending: "Väntande",
  reserved: "Reserverad",
  cancelled: "Avbruten",
  completed: "Slutförd",
};

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-blue-100 text-blue-800",
  available: "bg-green-100 text-green-800",
  reserved: "bg-yellow-100 text-yellow-800",
  sold: "bg-gray-100 text-gray-600",
  pending: "bg-amber-100 text-amber-800",
  cancelled: "bg-red-100 text-red-700",
  completed: "bg-emerald-100 text-emerald-800",
};

function formatSek(val: number) {
  return new Intl.NumberFormat("sv-SE", { maximumFractionDigits: 0 }).format(val) + " kr";
}

function parseField(message: string | null | undefined, label: string): string | null {
  const prefix = `${label}:`;
  const line = String(message || "")
    .split("\n")
    .map((v) => v.trim())
    .find((v) => v.startsWith(prefix));
  if (!line) return null;
  const value = line.slice(prefix.length).trim();
  return value || null;
}

function maskEmail(value: string | null | undefined): string {
  const email = String(value || "").trim();
  if (!email || !email.includes("@")) return "-";
  const [name, domain] = email.split("@");
  const safeName = name.length <= 2 ? `${name[0] || "*"}*` : `${name.slice(0, 2)}***`;
  return `${safeName}@${domain}`;
}

function maskPhone(value: string | null | undefined): string {
  const phone = String(value || "").trim();
  if (!phone) return "-";
  const clean = phone.replace(/\s+/g, "");
  if (clean.length <= 4) return "***";
  return `${clean.slice(0, 3)}***${clean.slice(-2)}`;
}

export default function AdminHandplockatDashboard() {
  const { loading, error, kpi, listings, orders, purchaseInterests, reload } = useHandplockatAdminData();
  const { customer } = useAuth();
  const navigate = useNavigate();

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [statusUpdating, setStatusUpdating] = useState<string | null>(null);
  const [orderStatusUpdating, setOrderStatusUpdating] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; title: string } | null>(null);
  const [interestDeletingId, setInterestDeletingId] = useState<string | null>(null);
  const [editingInterestId, setEditingInterestId] = useState<string | null>(null);
  const [interestSaving, setInterestSaving] = useState(false);
  const [interestDraft, setInterestDraft] = useState<{
    category: string;
    budgetSek: string;
    area: string;
    wish: string;
  }>({ category: "", budgetSek: "", area: "", wish: "" });
  const [listingSort, setListingSort] = useState<
    "default" | "title-asc" | "title-desc" | "status-asc" | "status-desc"
  >("default");
  const [showPersonalData, setShowPersonalData] = useState(false);
  const [hideSold, setHideSold] = useState(false);
  const [showArchivedSold, setShowArchivedSold] = useState(false);
  const [archivedSoldIds, setArchivedSoldIds] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem("handplockat_admin_archived_sold_ids");
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.map(String) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("handplockat_admin_archived_sold_ids", JSON.stringify(archivedSoldIds));
    } catch {
      // ignore storage errors
    }
  }, [archivedSoldIds]);

  async function handleStatusChange(id: string, newStatus: string) {
    setStatusUpdating(id);
    const { error } = await supabase
      .from("handplockat_listings")
      .update({ status: newStatus })
      .eq("id", id);
    if (error) alert("Kunde inte uppdatera status: " + error.message);
    else reload();
    setStatusUpdating(null);
  }

  async function handleOrderStatusChange(id: string, newStatus: string) {
    setOrderStatusUpdating(id);
    const { error } = await supabase
      .from("handplockat_orders")
      .update({ status: newStatus })
      .eq("id", id);
    if (error) alert("Kunde inte uppdatera orderstatus: " + error.message);
    else reload();
    setOrderStatusUpdating(null);
  }

  async function handleDeletePurchaseInterest(id: string) {
    const ok = window.confirm("Ta bort denna köpförfrågan?");
    if (!ok) return;

    setInterestDeletingId(id);
    const { error } = await supabase.from("contact_requests").delete().eq("id", id);
    if (error) {
      alert("Kunde inte ta bort köpförfrågan: " + error.message);
    } else {
      reload();
    }
    setInterestDeletingId(null);
  }

  function startEditPurchaseInterest(item: any) {
    setEditingInterestId(String(item.id));
    setInterestDraft({
      category: parseField(item.message, "Kategori") || "",
      budgetSek: parseField(item.message, "Budget (SEK)") || "",
      area: parseField(item.message, "Område") || "",
      wish: parseField(item.message, "Önskemål") || "",
    });
  }

  async function savePurchaseInterest(item: any) {
    setInterestSaving(true);
    const imagePath = parseField(item.message, "Bild (intern path)");
    const imageFile = parseField(item.message, "Bildefil");

    const nextMessage = [
      "[Köpintresse Handplockat]",
      interestDraft.category.trim() ? `Kategori: ${interestDraft.category.trim()}` : "",
      interestDraft.budgetSek.trim() ? `Budget (SEK): ${interestDraft.budgetSek.trim()}` : "",
      interestDraft.area.trim() ? `Område: ${interestDraft.area.trim()}` : "",
      interestDraft.wish.trim() ? `Önskemål: ${interestDraft.wish.trim()}` : "",
      imagePath ? `Bild (intern path): ${imagePath}` : "",
      imageFile ? `Bildefil: ${imageFile}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    const { error } = await supabase
      .from("contact_requests")
      .update({ message: nextMessage, updated_at: new Date().toISOString() })
      .eq("id", item.id);

    if (error) {
      alert("Kunde inte spara köpförfrågan: " + error.message);
    } else {
      setEditingInterestId(null);
      reload();
    }
    setInterestSaving(false);
  }

  function toggleArchiveSold(id: string) {
    setArchivedSoldIds((prev) =>
      prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]
    );
  }

  const visibleListings = useMemo(() => {
    let next = [...listings];
    const statusRank: Record<string, number> = {
      draft: 1,
      available: 2,
      reserved: 3,
      sold: 4,
    };

    if (hideSold) {
      next = next.filter((l) => l.status !== "sold");
    }

    if (!showArchivedSold) {
      next = next.filter((l) => !(l.status === "sold" && archivedSoldIds.includes(String(l.id))));
    }

    if (listingSort !== "default") {
      next.sort((a, b) => {
        const av = String(a?.title || "");
        const bv = String(b?.title || "");
        const as = statusRank[String(a?.status || "")] ?? 99;
        const bs = statusRank[String(b?.status || "")] ?? 99;

        if (listingSort === "title-asc") return av.localeCompare(bv, "sv-SE");
        if (listingSort === "title-desc") return bv.localeCompare(av, "sv-SE");
        if (listingSort === "status-asc") return as !== bs ? as - bs : av.localeCompare(bv, "sv-SE");
        return as !== bs ? bs - as : av.localeCompare(bv, "sv-SE");
      });
    }

    return next;
  }, [listings, hideSold, showArchivedSold, archivedSoldIds, listingSort]);

  async function handleDelete(id: string) {
    setDeletingId(id);
    const { error } = await supabase
      .from("handplockat_listings")
      .delete()
      .eq("id", id);
    if (error) alert("Kunde inte ta bort: " + error.message);
    else reload();
    setDeletingId(null);
    setConfirmDelete(null);
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold">Handplockat Admin</h1>
        <div className="flex gap-3">
          <button
            onClick={() => navigate("/admin/handplockat/skapa")}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 py-2 rounded-lg transition"
          >
            + Skapa ny annons
          </button>
          <a
            href="/handplockat"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-yellow-400 hover:bg-yellow-300 text-black font-semibold px-5 py-2 rounded-lg transition shadow"
          >
            Publik Handplockat-sida
          </a>
        </div>
      </div>

      {loading && <div className="p-8 text-center text-muted-foreground">Laddar data...</div>}
      {error && <div className="p-8 text-center text-red-600">{error}</div>}

      {!loading && !error && (
        <>
          {/* KPI-kort */}
          <div className="grid gap-4 grid-cols-2 lg:grid-cols-5 mb-10">
            {[
              { label: "Utkast", value: kpi?.draft },
              { label: "Tillgängliga", value: kpi?.available },
              { label: "Reserverade", value: kpi?.reserved },
              { label: "Sålda", value: kpi?.sold },
              { label: "Sålt värde (30 dagar)", value: kpi?.sold_sum_30d ? formatSek(kpi.sold_sum_30d) : "0 kr" },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-xl bg-card p-5 shadow border">
                <div className="text-sm text-muted-foreground mb-1">{label}</div>
                <div className="text-2xl font-bold">{value ?? "-"}</div>
              </div>
            ))}
          </div>

          {/* Listings tabell */}
          <div className="mb-12">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <h2 className="text-xl font-semibold">Objekt ({visibleListings.length})</h2>
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={listingSort}
                  onChange={(e) =>
                    setListingSort(
                      e.target.value as
                        | "default"
                        | "title-asc"
                        | "title-desc"
                        | "status-asc"
                        | "status-desc"
                    )
                  }
                  className="text-sm border rounded px-2 py-1"
                >
                  <option value="default">Sortering: Senast först</option>
                  <option value="title-asc">Rubrik A–Ö</option>
                  <option value="title-desc">Rubrik Ö–A</option>
                  <option value="status-asc">Status: Utkast → Såld</option>
                  <option value="status-desc">Status: Såld → Utkast</option>
                </select>

                <button
                  onClick={() => setHideSold((v) => !v)}
                  className="text-sm border rounded px-3 py-1 hover:bg-muted"
                >
                  {hideSold ? "Visa sålda" : "Dölj sålda"}
                </button>

                <button
                  onClick={() => setShowArchivedSold((v) => !v)}
                  className="text-sm border rounded px-3 py-1 hover:bg-muted"
                >
                  {showArchivedSold ? "Dölj arkiverade" : "Visa arkiverade"}
                </button>
              </div>
            </div>
            <div className="overflow-x-auto rounded-lg border shadow-sm">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-muted text-left">
                    <th className="p-3">Bild</th>
                    <th className="p-3">Titel</th>
                    <th className="p-3">Pris</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Område</th>
                    <th className="p-3">Uppdaterad</th>
                    <th className="p-3">Åtgärder</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleListings.length === 0 && (
                    <tr>
                      <td colSpan={7} className="p-6 text-center text-muted-foreground">
                        Inga annonser ännu
                      </td>
                    </tr>
                  )}
                  {visibleListings.map((l) => (
                    <tr key={l.id} className="border-t hover:bg-muted/40 transition">
                      <td className="p-3">
                        {l.image_cutout ? (
                          <img src={l.image_cutout} alt="" className="h-12 w-12 object-cover rounded" />
                        ) : (
                          <div className="h-12 w-12 bg-muted rounded flex items-center justify-center text-muted-foreground text-xs">
                            Ingen
                          </div>
                        )}
                      </td>
                      <td className="p-3 font-medium max-w-[160px]">
                        <button
                          className="text-left hover:underline text-blue-700"
                          onClick={() => navigate(`/handplockat/${l.id}`)}
                        >
                          {l.title}
                        </button>
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        {l.price_sek ? formatSek(l.price_sek) : "-"}
                      </td>
                      <td className="p-3">
                        <select
                          value={l.status}
                          disabled={statusUpdating === l.id}
                          onChange={(e) => handleStatusChange(l.id, e.target.value)}
                          className={`text-xs font-semibold px-2 py-1 rounded border cursor-pointer ${STATUS_COLORS[l.status] ?? "bg-gray-100"}`}
                        >
                          {Object.entries(LISTING_STATUS_LABELS).map(([val, label]) => (
                            <option key={val} value={val}>{label}</option>
                          ))}
                        </select>
                      </td>
                      <td className="p-3 text-muted-foreground">{l.pickup_area ?? "-"}</td>
                      <td className="p-3 text-muted-foreground whitespace-nowrap">
                        {l.updated_at
                          ? new Date(l.updated_at).toLocaleString("sv-SE", { dateStyle: "short", timeStyle: "short" })
                          : l.created_at
                          ? new Date(l.created_at).toLocaleString("sv-SE", { dateStyle: "short", timeStyle: "short" })
                          : "-"}
                      </td>
                      <td className="p-3">
                        <div className="flex gap-2">
                          <button
                            onClick={() => navigate(`/admin/handplockat/${l.id}/redigera`)}
                            className="bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-semibold px-3 py-1.5 rounded transition"
                          >
                            Redigera
                          </button>
                          <button
                            onClick={() => setConfirmDelete({ id: l.id, title: l.title })}
                            disabled={deletingId === l.id}
                            className="bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs font-semibold px-3 py-1.5 rounded transition"
                          >
                            {deletingId === l.id ? "..." : "Ta bort"}
                          </button>
                          {l.status === "sold" && (
                            <button
                              onClick={() => toggleArchiveSold(String(l.id))}
                              className="bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200 text-xs font-semibold px-3 py-1.5 rounded transition"
                            >
                              {archivedSoldIds.includes(String(l.id)) ? "Återställ" : "Arkivera"}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Orders tabell */}
          <div className="mb-12">
            <h2 className="text-xl font-semibold mb-4">Köpförfrågningar ({purchaseInterests.length})</h2>
            <div className="overflow-x-auto rounded-lg border shadow-sm">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-muted text-left">
                    <th className="p-3">Kategori</th>
                    <th className="p-3">Önskemål</th>
                    <th className="p-3">Budget</th>
                    <th className="p-3">Område</th>
                    <th className="p-3">Kontakt</th>
                    <th className="p-3">Skapad</th>
                  </tr>
                </thead>
                <tbody>
                  {purchaseInterests.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-6 text-center text-muted-foreground">
                        Inga köpförfrågningar ännu
                      </td>
                    </tr>
                  )}
                  {purchaseInterests.map((item) => {
                    const category = parseField(item.message, "Kategori") || "-";
                    const wish = parseField(item.message, "Önskemål") || "-";
                    const budget = parseField(item.message, "Budget (SEK)") || "-";
                    const area = parseField(item.message, "Område") || "-";
                    const isEditing = editingInterestId === String(item.id);
                    const fullName =
                      String(item?.name || "").trim() ||
                      `${String(item?.firstname || "").trim()} ${String(item?.lastname || "").trim()}`.trim() ||
                      "-";

                    return (
                      <tr key={item.id} className="border-t hover:bg-muted/40 transition">
                        <td className="p-3">
                          {isEditing ? (
                            <input
                              value={interestDraft.category}
                              onChange={(e) => setInterestDraft((prev) => ({ ...prev, category: e.target.value }))}
                              className="w-full rounded border px-2 py-1 text-sm"
                              placeholder="Kategori"
                            />
                          ) : (
                            category
                          )}
                        </td>
                        <td className="p-3 max-w-[340px] text-muted-foreground whitespace-pre-line">
                          {isEditing ? (
                            <textarea
                              value={interestDraft.wish}
                              onChange={(e) => setInterestDraft((prev) => ({ ...prev, wish: e.target.value }))}
                              className="w-full rounded border px-2 py-1 text-sm min-h-[70px]"
                              placeholder="Önskemål"
                            />
                          ) : (
                            wish
                          )}
                        </td>
                        <td className="p-3 whitespace-nowrap">
                          {isEditing ? (
                            <input
                              value={interestDraft.budgetSek}
                              onChange={(e) => setInterestDraft((prev) => ({ ...prev, budgetSek: e.target.value }))}
                              className="w-full rounded border px-2 py-1 text-sm"
                              placeholder="Budget"
                            />
                          ) : budget !== "-" ? `${budget} kr` : "-"}
                        </td>
                        <td className="p-3">
                          {isEditing ? (
                            <input
                              value={interestDraft.area}
                              onChange={(e) => setInterestDraft((prev) => ({ ...prev, area: e.target.value }))}
                              className="w-full rounded border px-2 py-1 text-sm"
                              placeholder="Område"
                            />
                          ) : (
                            area
                          )}
                        </td>
                        <td className="p-3">
                          <div>{fullName}</div>
                          <div className="text-xs text-muted-foreground">
                            {showPersonalData && customer?.is_admin ? (item.email || "-") : maskEmail(item.email)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {showPersonalData && customer?.is_admin ? (item.phone || "-") : maskPhone(item.phone)}
                          </div>
                        </td>
                        <td className="p-3 text-muted-foreground whitespace-nowrap">
                          {item.created_at
                            ? new Date(item.created_at).toLocaleString("sv-SE", { dateStyle: "short", timeStyle: "short" })
                            : "-"}
                          <div className="mt-2 flex gap-2">
                            {isEditing ? (
                              <>
                                <button
                                  onClick={() => savePurchaseInterest(item)}
                                  disabled={interestSaving}
                                  className="bg-green-50 hover:bg-green-100 text-green-700 border border-green-200 text-xs font-semibold px-2 py-1 rounded"
                                >
                                  {interestSaving ? "Sparar..." : "Spara"}
                                </button>
                                <button
                                  onClick={() => setEditingInterestId(null)}
                                  className="bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200 text-xs font-semibold px-2 py-1 rounded"
                                >
                                  Avbryt
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={() => startEditPurchaseInterest(item)}
                                  className="bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-semibold px-2 py-1 rounded"
                                >
                                  Redigera
                                </button>
                                <button
                                  onClick={() => handleDeletePurchaseInterest(String(item.id))}
                                  disabled={interestDeletingId === String(item.id)}
                                  className="bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs font-semibold px-2 py-1 rounded"
                                >
                                  {interestDeletingId === String(item.id) ? "Tar bort..." : "Ta bort"}
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Orders tabell */}
          <div>
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <h2 className="text-xl font-semibold">Orders ({orders.length})</h2>
              <button
                onClick={() => setShowPersonalData((v) => !v)}
                className="text-sm border rounded px-3 py-1 hover:bg-muted"
              >
                {showPersonalData ? "Dölj personuppgifter" : "Visa personuppgifter"}
              </button>
            </div>
            <div className="overflow-x-auto rounded-lg border shadow-sm">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-muted text-left">
                    <th className="p-3">Objekt</th>
                    <th className="p-3">Köpare</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">E-post status</th>
                    <th className="p-3">Skapad</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-6 text-center text-muted-foreground">
                        Inga orders ännu
                      </td>
                    </tr>
                  )}
                  {orders.map((o) => (
                    <tr key={o.id} className="border-t hover:bg-muted/40 transition">
                      <td className="p-3 font-medium">
                        <button
                          className="hover:underline text-blue-700 text-left"
                          onClick={() => navigate(`/handplockat/${o.listing_id}`)}
                        >
                          {o.listing?.title ?? o.listing_id}
                        </button>
                      </td>
                      <td className="p-3">
                        <div>{o.buyer_name ?? "-"}</div>
                        <div className="text-xs text-muted-foreground">
                          {showPersonalData && customer?.is_admin ? (o.buyer_email || "-") : maskEmail(o.buyer_email)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {showPersonalData && customer?.is_admin ? (o.buyer_phone || "-") : maskPhone(o.buyer_phone)}
                        </div>
                      </td>
                      <td className="p-3">
                        <select
                          value={o.status}
                          disabled={orderStatusUpdating === o.id}
                          onChange={(e) => handleOrderStatusChange(o.id, e.target.value)}
                          className={`text-xs font-semibold px-2 py-1 rounded border cursor-pointer ${STATUS_COLORS[o.status] ?? "bg-gray-100"}`}
                        >
                          {Object.entries(ORDER_STATUS_LABELS).map(([val, label]) => (
                            <option key={val} value={val}>{label}</option>
                          ))}
                        </select>
                      </td>
                      <td className="p-3 text-xs space-y-0.5">
                        <div className={o.admin_email_sent_at ? "text-green-700" : "text-muted-foreground"}>
                          {o.admin_email_sent_at ? "✓ Adminmail skickad" : "– Adminmail ej skickad"}
                        </div>
                        <div className={o.buyer_email_sent_at ? "text-green-700" : "text-muted-foreground"}>
                          {o.buyer_email_sent_at ? "✓ Köparmail skickad" : "– Köparmail ej skickad"}
                        </div>
                        {o.email_last_error && (
                          <div className="text-red-600">⚠ {o.email_last_error}</div>
                        )}
                      </td>
                      <td className="p-3 text-muted-foreground whitespace-nowrap">
                        {o.created_at
                          ? new Date(o.created_at).toLocaleString("sv-SE", { dateStyle: "short", timeStyle: "short" })
                          : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Bekräftelsedialog för radering */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-bold mb-2">Ta bort annons?</h3>
            <p className="text-muted-foreground mb-6">
              Är du säker på att du vill ta bort <strong>"{confirmDelete.title}"</strong>? Detta går inte att ångra.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setConfirmDelete(null)}
                className="px-4 py-2 border rounded-lg hover:bg-muted transition text-sm font-medium"
              >
                Avbryt
              </button>
              <button
                onClick={() => handleDelete(confirmDelete.id)}
                disabled={deletingId === confirmDelete.id}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition text-sm font-semibold"
              >
                {deletingId === confirmDelete.id ? "Tar bort..." : "Ja, ta bort"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}