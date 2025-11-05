import React, { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, LogOut, Loader2, X } from "lucide-react";
import EditCaseDialog from "../EditCaseDialog";
import CustomerDialog from "../CustomerDialog";
import ContactRequestDialog from "../ContactRequestDialog";
import Tidio from "@/components/Tidio";
import { format } from "date-fns";
import { sv } from "date-fns/locale";

export interface Case {
  id: string;
  title: string;
  description: string;
  status: string;
  priority?: string;
  scheduled_date?: string | null;
  address?: string | null;
  total_price?: number | null;
  notes?: string | null;
  customer?: Customer;
  service_type?: ServiceType;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone?: string;
  is_admin?: boolean;
  created_at?: string;
}

export interface ServiceType {
  id: string;
  name: string;
}

export interface ContactRequest {
  id: string;
  name: string;
  email: string;
  message: string;
  created_at: string;
  status: string;
  admin_notes?: string;
}

export interface Subscription {
  id: string;
  category: string;
  customer_id: string;
  provider?: string;
  notes?: string;
  created_at?: string;
  status?: string;
}

export interface Valuation {
  id: number;
  created_at: string;
  analysis_result: string;
  image_urls: string[];
  customer?: {
    name: string;
    email: string;
  };
}

const getStatusColor = (status: string) => {
  switch (status) {
    case "pending":
      return "bg-yellow-100 text-yellow-800";
    case "in_progress":
      return "bg-blue-100 text-blue-800";
    case "completed":
      return "bg-green-100 text-green-800";
    case "cancelled":
      return "bg-red-100 text-red-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

export const AdminPortal: React.FC = () => {
  const { user, customer, signOut } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [loadingValuations, setLoadingValuations] = useState(false);
  const [cases, setCases] = useState<Case[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [contactRequests, setContactRequests] = useState<ContactRequest[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [valuations, setValuations] = useState<Valuation[]>([]);
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<ContactRequest | null>(null);

  const [mainTab, setMainTab] = useState<
    "cases" | "contact_requests" | "customers" | "subscriptions" | "valuations"
  >("cases");

  // ---- FETCH HELPERS ----
  const fetchCases = async () => {
    const { data, error } = await supabase
      .from("cases")
      .select("*, customer:customer_id(*), service_type:service_type_id(*)")
      .order("created_at", { ascending: false });
    if (error) throw error;
    setCases(data || []);
  };

  const fetchCustomers = async () => {
    const { data, error } = await supabase
      .from("customers")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    setCustomers(data || []);
  };

  const fetchContactRequests = async () => {
    const { data, error } = await supabase
      .from("contact_requests")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    setContactRequests(data || []);
  };

  const fetchSubscriptions = async () => {
    const { data, error } = await supabase
      .from("subscriptions")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    setSubscriptions(data || []);
  };

  const fetchValuations = async () => {
    setLoadingValuations(true);
    const { data, error } = await supabase
      .from("valuations")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    const arr = (data || []).map((v: any) => ({
      id: v.id,
      created_at: v.created_at,
      analysis_result: v.analysis_result ?? v.analysis ?? "",
      image_urls: Array.isArray(v.image_urls) ? v.image_urls : [],
    }));
    setValuations(arr);
    setLoadingValuations(false);
  };

  // ---- INIT ----
  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      try {
        await Promise.allSettled([
          fetchCases(),
          fetchCustomers(),
          fetchContactRequests(),
          fetchSubscriptions(),
          fetchValuations(),
        ]);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  // ---- DELETE VALUATION ----
  const deleteValuation = async (id: number) => {
    if (!window.confirm("Vill du verkligen ta bort denna värdering?")) return;
    const { error } = await supabase.from("valuations").delete().eq("id", id);
    if (error) {
      toast({ title: "Fel", description: "Kunde inte ta bort värdering", variant: "destructive" });
    } else {
      setValuations((prev) => prev.filter((v) => v.id !== id));
      toast({ title: "Raderad", description: `Värdering #${id} togs bort.` });
    }
  };

  // ---- UPDATE CASE STATE ----
  const handleCaseUpdated = (updatedCase: Case) => {
    setCases((prev) =>
      prev.map((c) => (c.id === updatedCase.id ? updatedCase : c))
    );
  };

  if (!customer?.is_admin) {
    return (
      <div className="min-h-screen bg-soft-gray flex items-center justify-center">
        <Card>
          <CardContent className="p-6 text-center">
            <h2 className="text-xl font-semibold mb-2">Ingen åtkomst</h2>
            <p className="text-warm-gray">Du har inte admin-behörighet.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-soft-gray flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 text-trust-blue animate-spin mx-auto mb-4" />
          <p className="text-warm-gray">Laddar admin-panel...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-soft-gray">
      <Tidio />
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div>
              <h1 className="text-xl font-semibold text-trust-blue">Admin Panel - Trygg Hand</h1>
              <p className="text-sm text-warm-gray">Hantera ärenden och kunder</p>
            </div>
            <Button onClick={() => signOut()} variant="outline" size="sm">
              <LogOut className="w-4 h-4 mr-2" />
              Logga ut
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs
          value={mainTab}
          onValueChange={(v) =>
            setMainTab(
              v as "cases" | "contact_requests" | "customers" | "subscriptions" | "valuations"
            )
          }
          className="space-y-6"
        >
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="cases">Ärenden</TabsTrigger>
            <TabsTrigger value="contact_requests">Kontakter</TabsTrigger>
            <TabsTrigger value="customers">Kunder</TabsTrigger>
            <TabsTrigger value="subscriptions">Abonnemang</TabsTrigger>
            <TabsTrigger value="valuations">Värderingar</TabsTrigger>
          </TabsList>

          {/* === ÄRENDEN === */}
          <TabsContent value="cases" className="space-y-6">
            <h2 className="text-2xl font-bold">Ärenden</h2>
            {cases.length === 0 ? (
              <p>Inga ärenden hittades.</p>
            ) : (
              <div className="grid gap-4">
                {cases.map((c) => (
                  <Card
                    key={c.id}
                    className="cursor-pointer hover:shadow-md transition"
                    onClick={() => setSelectedCaseId(c.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-semibold">{c.title}</h3>
                          <p
                            className="text-sm text-gray-500 underline cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (c.customer) setSelectedCustomer(c.customer);
                            }}
                          >
                            {c.customer?.name ?? "Okänd kund"}
                          </p>
                          <p className="text-sm text-gray-400">{c.service_type?.name}</p>
                        </div>
                        <Badge className={`${getStatusColor(c.status)} capitalize`}>
                          {c.status}
                        </Badge>
                      </div>
                      <p className="text-sm mt-2">{c.description}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* === KUNDER === */}
          <TabsContent value="customers">
            <h2 className="text-2xl font-bold mb-3">Kunder</h2>
            {customers.length === 0 ? (
              <p>Inga kunder hittades.</p>
            ) : (
              <div className="space-y-2">
                {customers.map((c) => (
                  <Card key={c.id} className="cursor-pointer" onClick={() => setSelectedCustomer(c)}>
                    <CardContent className="p-3">
                      <p className="font-medium">{c.name}</p>
                      <p className="text-sm text-gray-500">{c.email}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* === KONTAKTER === */}
          <TabsContent value="contact_requests">
            <h2 className="text-2xl font-bold mb-3">Kontaktförfrågningar</h2>
            {contactRequests.length === 0 ? (
              <p>Inga kontaktförfrågningar.</p>
            ) : (
              <div className="space-y-2">
                {contactRequests.map((r) => (
                  <Card
                    key={r.id}
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => setSelectedRequest(r)}
                  >
                    <CardContent className="p-3">
                      <div className="flex justify-between">
                        <div>
                          <p className="font-medium">{r.name}</p>
                          <p className="text-sm text-gray-500">{r.email}</p>
                        </div>
                        <Badge className={getStatusColor(r.status)}>{r.status}</Badge>
                      </div>
                      <p className="text-sm mt-2">{r.message}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* === ABONNEMANG === */}
          <TabsContent value="subscriptions">
            <h2 className="text-2xl font-bold">Abonnemang</h2>
            {subscriptions.length === 0 ? (
              <p>Inga abonnemang hittades.</p>
            ) : (
              <div className="space-y-2">
                {subscriptions.map((s) => (
                  <Card key={s.id}>
                    <CardContent className="p-3">
                      <p className="font-medium">{s.category}</p>
                      <p className="text-sm text-gray-500">{s.customer_id}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* === VÄRDERINGAR === */}
          <TabsContent value="valuations" className="space-y-6">
            <h2 className="text-2xl font-bold">Värderingar</h2>
            {loadingValuations ? (
              <div className="text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div>
            ) : valuations.length === 0 ? (
              <p>Inga värderingar skapade ännu.</p>
            ) : (
              <div className="space-y-3">
                {valuations.map((v) => (
                  <div key={v.id} className="bg-white p-4 border rounded relative">
                    <button
                      onClick={() => deleteValuation(v.id)}
                      className="absolute top-2 right-2 text-gray-400 hover:text-red-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    <div>
                      <p className="font-medium text-sm">#{v.id}</p>
                      <p className="text-xs text-gray-500">
                        {format(new Date(v.created_at), "dd MMM yyyy HH:mm", { locale: sv })}
                      </p>
                    </div>
                    {v.image_urls.length > 0 && (
                      <img
                        src={v.image_urls[0]}
                        alt="valuation"
                        className="w-20 h-20 object-cover rounded mt-2"
                      />
                    )}
                    <p className="text-sm mt-2 whitespace-pre-wrap">
                      {v.analysis_result}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {selectedCaseId && (
        <EditCaseDialog
          caseId={selectedCaseId}
          onClose={() => setSelectedCaseId(null)}
          onCaseUpdated={handleCaseUpdated}
        />
      )}

      {selectedCustomer && (
        <CustomerDialog
          customer={selectedCustomer}
          onClose={() => setSelectedCustomer(null)}
        />
      )}

      {selectedRequest && (
        <ContactRequestDialog
          request={selectedRequest}
          onClose={() => setSelectedRequest(null)}
          onUpdated={fetchContactRequests}
        />
      )}
    </div>
  );
};

export default AdminPortal;
