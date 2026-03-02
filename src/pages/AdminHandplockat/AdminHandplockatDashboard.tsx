import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useHandplockatAdminData } from "./useHandplockatAdminData";
import { supabase } from "@/lib/supabase";

const STATUS_LABELS: Record<string, string> = {
  available: "Tillgänglig",
  reserved: "Reserverad",
  sold: "Såld",
  hidden: "Dold",
};

const STATUS_COLORS: Record<string, string> = {
  available: "bg-green-100 text-green-800",
  reserved: "bg-yellow-100 text-yellow-800",
  sold: "bg-gray-100 text-gray-600",
  hidden: "bg-red-100 text-red-700",
};

function formatSek(val: number) {
  return new Intl.NumberFormat("sv-SE", { maximumFractionDigits: 0 }).format(val) + " kr";
}

export default function AdminHandplockatDashboard() {
  const { loading, error, kpi, listings, orders, reload } = useHandplockatAdminData();
  const navigate = useNavigate();

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [statusUpdating, setStatusUpdating] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; title: string } | null>(null);

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
              { label: "Tillgängliga", value: kpi?.available },
              { label: "Reserverade", value: kpi?.reserved },
              { label: "Sålda", value: kpi?.sold },
              { label: "Reserv. (7 dagar)", value: kpi?.reservations_7d },
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
            <h2 className="text-xl font-semibold mb-4">Objekt ({listings.length})</h2>
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
                  {listings.length === 0 && (
                    <tr>
                      <td colSpan={7} className="p-6 text-center text-muted-foreground">
                        Inga annonser ännu
                      </td>
                    </tr>
                  )}
                  {listings.map((l) => (
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
                          {Object.entries(STATUS_LABELS).map(([val, label]) => (
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
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Orders tabell */}
          <div>
            <h2 className="text-xl font-semibold mb-4">Orders ({orders.length})</h2>
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
                        <div className="text-xs text-muted-foreground">{o.buyer_email}</div>
                        <div className="text-xs text-muted-foreground">{o.buyer_phone}</div>
                      </td>
                      <td className="p-3">
                        <span className={`text-xs font-semibold px-2 py-1 rounded ${STATUS_COLORS[o.status] ?? "bg-gray-100"}`}>
                          {STATUS_LABELS[o.status] ?? o.status}
                        </span>
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