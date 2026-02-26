import React from "react";
import { useHandplockatAdminData } from "./useHandplockatAdminData";

export default function AdminHandplockatDashboard() {
  const { loading, error, kpi, listings, orders } = useHandplockatAdminData();

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Handplockat Admin</h1>
      {loading && <div className="p-8 text-center">Laddar data...</div>}
      {error && <div className="p-8 text-center text-red-600">{error}</div>}
      {!loading && !error && (
        <>
          {/* KPI-kort */}
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3 mb-8">
            <div className="rounded-xl bg-card p-6 shadow border">
              <div className="text-lg font-semibold">Tillgängliga</div>
              <div className="text-3xl font-bold">{kpi?.available ?? "-"}</div>
            </div>
            <div className="rounded-xl bg-card p-6 shadow border">
              <div className="text-lg font-semibold">Reserverade</div>
              <div className="text-3xl font-bold">{kpi?.reserved ?? "-"}</div>
            </div>
            <div className="rounded-xl bg-card p-6 shadow border">
              <div className="text-lg font-semibold">Sålda</div>
              <div className="text-3xl font-bold">{kpi?.sold ?? "-"}</div>
            </div>
            <div className="rounded-xl bg-card p-6 shadow border md:col-span-2 lg:col-span-1">
              <div className="text-lg font-semibold">Reservationer (7 dagar)</div>
              <div className="text-3xl font-bold">{kpi?.reservations_7d ?? "-"}</div>
            </div>
            <div className="rounded-xl bg-card p-6 shadow border md:col-span-2 lg:col-span-1">
              <div className="text-lg font-semibold">Sålt värde (30 dagar)</div>
              <div className="text-3xl font-bold">{kpi?.sold_sum_30d ? kpi.sold_sum_30d + " kr" : "-"}</div>
            </div>
          </div>

          {/* Listings & Orders tabeller */}
          <div className="grid gap-12 lg:grid-cols-2">
            <div>
              <h2 className="text-xl font-semibold mb-4">Objekt</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm border">
                  <thead>
                    <tr className="bg-muted">
                      <th className="p-2">Bild</th>
                      <th className="p-2">Titel</th>
                      <th className="p-2">Pris</th>
                      <th className="p-2">Status</th>
                      <th className="p-2">Område</th>
                      <th className="p-2">Upphämtn.tid</th>
                      <th className="p-2">Uppdaterad</th>
                    </tr>
                  </thead>
                  <tbody>
                    {listings.map((l) => (
                      <tr key={l.id} className="border-b">
                        <td className="p-2">
                          {l.image_cutout ? (
                            <img src={l.image_cutout} alt="" className="h-12 w-12 object-cover rounded" />
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </td>
                        <td className="p-2 font-medium">{l.title}</td>
                        <td className="p-2">{l.price_sek ?? "-"}</td>
                        <td className="p-2">{l.status}</td>
                        <td className="p-2">{l.pickup_area}</td>
                        <td className="p-2">{l.pickup_window}</td>
                        <td className="p-2">{l.updated_at ? new Date(l.updated_at).toLocaleString() : l.created_at ? new Date(l.created_at).toLocaleString() : "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div>
              <h2 className="text-xl font-semibold mb-4">Orders</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm border">
                  <thead>
                    <tr className="bg-muted">
                      <th className="p-2">Objekt</th>
                      <th className="p-2">Köpare</th>
                      <th className="p-2">Status</th>
                      <th className="p-2">Mailstatus</th>
                      <th className="p-2">Skapad</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((o) => (
                      <tr key={o.id} className="border-b">
                        <td className="p-2 font-medium">{o.listing?.title ?? o.listing_id}</td>
                        <td className="p-2">
                          {o.buyer_name}<br />
                          <span className="text-xs text-muted-foreground">{o.buyer_email}</span>
                        </td>
                        <td className="p-2">{o.status}</td>
                        <td className="p-2">
                          {o.admin_email_sent_at ? "Adminmail skickad" : "-"}<br />
                          {o.buyer_email_sent_at ? "Köparmail skickad" : "-"}<br />
                          {o.email_last_error && <span className="text-xs text-red-600">Fel: {o.email_last_error}</span>}
                        </td>
                        <td className="p-2">{o.created_at ? new Date(o.created_at).toLocaleString() : "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
