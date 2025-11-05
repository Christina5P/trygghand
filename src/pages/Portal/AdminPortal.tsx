import React, { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { saveValuation } from "@/lib/valuations";
import { uploadImages, supabase, getValuations } from "@/lib/supabase";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, LogOut, Loader2 } from "lucide-react";
import EditCaseDialog from '../EditCaseDialog';
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import ValueEstimator from "@/components/ValueEstimator";

// --- Type Definitions ---
// (Interface definitions remain the same)
interface Case {
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

interface Customer {
  id: string;
  name: string;
  email: string;
  phone?: string;
  is_admin?: boolean;
  created_at: string;
}

interface ServiceType {
  id: string;
  name: string;
}

interface ContactRequest {
  id: string;
  name: string;
  email: string;
  message: string;
  created_at: string;
  status: string;
  firstname?: string;
  lastname?: string;
  phone?: string;
  service_interest?: string;
}

interface Subscription {
  id: string;
  category: string;
  customer_id: string;
  provider?: string;
  notes?: string;
  created_at?: string;
  status?: string;
}

interface CaseSubscription {
  id: string;
  case_id: string;
  subscription_id: string;
  status: string;
  cancellation_date?: string | null;
  notes?: string | null;
  created_at: string;
  case?: Case;
  subscription?: Subscription;
}

// NY TYP FÖR VÄRDERINGAR
interface Valuation {
  id: number;
  created_at: string;
  analysis_result: string;
  image_urls: string[];
  customer?: {
    name: string;
    email: string;
  };
}

// --- AdminPortal Component ---
export const AdminPortal: React.FC = () => {
  const { user, customer, signOut } = useAuth();
  const [cases, setCases] = useState<Case[]>([]);
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([]);
  const [contactRequests, setContactRequests] = useState<ContactRequest[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [caseSubscriptions, setCaseSubscriptions] = useState<CaseSubscription[]>([]);
  const [valuations, setValuations] = useState<Valuation[]>([]); // Ny state för värderingar
  const [loading, setLoading] = useState(true);
  const [loadingValuations, setLoadingValuations] = useState(false);
  const { toast } = useToast();
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showCustomerDialog, setShowCustomerDialog] = useState(false);
  const [providerValue, setProviderValue] = useState("");
  const [providerInput, setProviderInput] = useState("");
  const [showEstimator, setShowEstimator] = useState(false);
  // Kontrollera huvudfliken i Tabs (nu kontrollerbar)
  const [mainTab, setMainTab] = useState<
    "cases" | "contact_requests" | "customers" | "subscriptions" | "valuations"
  >("cases");

  const customerId = customer?.id ?? user?.id;

  const fetchCases = async () => { /* ... (no changes) ... */ };
  const fetchCustomers = async () => { /* ... (no changes) ... */ };
  const fetchServiceTypes = async () => { /* ... (no changes) ... */ };
  const fetchContactRequests = async () => { /* ... (no changes) ... */ };
  const fetchSubscriptions = async () => { /* ... (no changes) ... */ };
  const fetchCaseSubscriptions = async () => { /* ... (no changes) ... */ };
  
  // NY FUNKTION för att hämta värderingar (robust: försök extern helper, fallback till Supabase direkt)
  const fetchValuations = async () => {
    setLoadingValuations(true);
    try {
      // 1) Försök via helper/getValuations
      try {
        const data = await getValuations();
        if (Array.isArray(data) && data.length > 0) {
          console.debug("fetchValuations: got data from getValuations helper", data.length);
          // normalize similar to previous logic
          const normalized: Valuation[] = data
            .filter((item: any) => item && typeof item === "object" && !("error" in item))
            .map((v: any) => {
              const id = typeof v.id === "number" ? v.id : parseInt(String(v.id || "0"), 10) || 0;
              const created_at = v.created_at ?? v.createdAt ?? String(v.created_at ?? "");
              const analysis_result = v.analysis_result ?? v.analysis ?? v.result ?? "";
              const image_urls: string[] = Array.isArray(v.image_urls)
                ? v.image_urls
                : Array.isArray(v.images)
                ? v.images.map((i: any) => i.url).filter(Boolean)
                : [];
              const customer =
                v.customer && typeof v.customer === "object"
                  ? { name: v.customer.name ?? v.customer.full_name ?? "", email: v.customer.email ?? "" }
                  : undefined;
              return { id, created_at, analysis_result, image_urls, customer };
            });
          setValuations(normalized);
          return normalized;
        }
        console.debug("fetchValuations: helper returned no data or empty array, falling back to Supabase");
      } catch (helperErr) {
        console.warn("fetchValuations: getValuations helper failed, falling back to Supabase:", helperErr);
      }

      // 2) Fallback: hämta direkt från Supabase (använder existing fetchValuationsFromSupabase logic)
      await fetchValuationsFromSupabase();
      return valuations;
    } catch (error) {
      console.error("Error fetching valuations (final):", error);
      toast({
        title: "Fel",
        description: "Kunde inte hämta värderingar",
        variant: "destructive",
      });
      return [];
    } finally {
      setLoadingValuations(false);
    }
  };

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      await Promise.all([
        fetchCases(),
        fetchCustomers(),
        fetchServiceTypes(),
        fetchContactRequests(),
        fetchSubscriptions(),
        fetchCaseSubscriptions(),
        fetchValuations(), // Lägg till anropet här
      ]);
      setLoading(false);
    };
    fetchAll();
  }, []);
  
  const createCase = async (formData: FormData) => { /* ... (no changes) ... */ };
  const createSubscription = async (formData: FormData) => { /* ... (no changes) ... */ };
  const updateContactRequestStatus = async (id: string, status: string) => { /* ... (no changes) ... */ };
  const updateCaseStatus = async (id: string, status: string) => { /* ... (no changes) ... */ };
  const updateSubscriptionStatus = async (id: string, status: string) => { /* ... (no changes) ... */ };

  // HÄR: intern analys- + spara-funktion i portalen
  const analyzeAndSave = async (files: File[]) => {
    if (!files || files.length === 0) throw new Error("Inga filer valda");
    if (!customerId) throw new Error("customerId saknas!");

    setLoading(true);
    try {
      // 1) Skicka bilder till server-proxy /api/gemini
      const form = new FormData();
      files.forEach((f, i) => form.append(`file${i}`, f));
      const resp = await fetch("/api/gemini", { method: "POST", body: form });
      if (!resp.ok) throw new Error("Gemini-proxy returned " + resp.status);
      const json = await resp.json();
      // Se till att analysis sparas som en string (JSON när det är ett objekt)
      const rawAnalysis = (json && json.analysis) ?? json?.result ?? "";
      const analysis = typeof rawAnalysis === "string" ? rawAnalysis : JSON.stringify(rawAnalysis);

      // 2) Ladda upp bilder till ditt storage (om du har en uploadImages helper)
      let imageUrls: string[] = [];
      if (typeof uploadImages === "function") {
        imageUrls = await uploadImages(files); // förväntas returnera string[]
      } else {
        // fallback: temporära object URLs (ej permanenta)
        imageUrls = files.map((f) => URL.createObjectURL(f));
      }

      // 3) Normalisera customerId och spara värdering
      const custToSend = !customerId || customerId === "_UNKNOWN_" ? null : customerId;
      // analysis är nu alltid en string (säker för DB-kolumn)
      await saveValuation(custToSend, analysis, imageUrls);

      // 4) uppdatera lokalt state
      await fetchValuations();
      return analysis;
    } finally {
      setLoading(false);
    }
  };

  // HÄR: hämta valuations + mappa customers lokalt (ingen FK-join i query)
    const fetchValuationsFromSupabase = async () => {
      setLoading(true);
      try {
        const { data: vals, error: vErr } = await supabase
          .from("valuations")
          .select("*")
          .order("created_at", { ascending: false });
  
        if (vErr) throw vErr;
        const valArr = vals ?? [];
  
        const customerIds = Array.from(
          new Set(valArr.map((v: any) => v.customer_id).filter(Boolean))
        );
        let customers: any[] = [];
        if (customerIds.length > 0) {
          const { data: custData, error: cErr } = await supabase
            .from("customers")
            .select("id,name,email")
            .in("id", customerIds);
          if (cErr) console.warn("Could not fetch customers:", cErr);
          customers = custData ?? [];
        }
        const custMap = new Map(customers.map((c: any) => [c.id, c]));
        const merged = valArr.map((v: any) => ({ ...v, customer: custMap.get(v.customer_id) ?? null }));
        setValuations(merged);
      } catch (err) {
        console.error("Error fetching valuations:", err);
      } finally {
        setLoading(false);
      }
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

  const newContactRequests = contactRequests.filter((req) => req.status === "new");
  const newCustomers = customers.filter(c => new Date(c.created_at) > new Date(Date.now() - 24 * 60 * 60 * 1000));
  const customerCases = cases.filter(c => c.customer?.id === selectedCustomer?.id);
  const customerSubscriptions = subscriptions.filter(s => s.customer_id === selectedCustomer?.id);
  
  return (
    <div className="min-h-screen bg-soft-gray">
      {/* Tidio chat removed: no client-side component available in this context */}
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
        {/* Knappval för Ny / Sparade värderingar */}
        <div className="mb-6 flex gap-3">
          <button
            className={`px-4 py-2 rounded ${mainTab === "cases" ? "bg-trust-blue text-white" : "bg-white border"}`}
            onClick={() => {
              setMainTab("cases");
              setShowEstimator(true);
            }}
          >
            Ny värdering
          </button>
          <button
            className={`px-4 py-2 rounded ${mainTab === "valuations" ? "bg-trust-blue text-white" : "bg-white border"}`}
            onClick={() => {
              setMainTab("valuations");
              setShowEstimator(false);
              // ladda valuations när man öppnar sparade
              fetchValuations();
            }}
          >
            Sparade värderingar
          </button>
        </div>

        {/* Estimator visas bara när "Ny" är aktiv */}
        {showEstimator && (
          <ValueEstimator
            customerId={customer?.id ?? user?.id}
            onSaved={async () => {
              await fetchValuations();
              setMainTab("valuations");
              setShowEstimator(false);
            }}
          />
        )}

        <Tabs
          value={mainTab}
          onValueChange={(value: string) =>
            setMainTab(
              value as
                | "cases"
                | "contact_requests"
                | "customers"
                | "subscriptions"
                | "valuations"
            )
          }
          className="space-y-6"
        >
          <TabsList className="grid w-full grid-cols-5"> {/* Ändra till 5 kolumner */}
            <TabsTrigger value="cases">Ärenden</TabsTrigger>
            <TabsTrigger value="contact_requests">
              Kontakter
              {newContactRequests.length > 0 && (
                <Badge variant="outline" className="ml-2">{newContactRequests.length} ny</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="customers">
              Kunder
              {newCustomers.length > 0 && (
                <Badge variant="outline" className="ml-2">{newCustomers.length} ny</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="subscriptions">Abonnemang</TabsTrigger>
            <TabsTrigger value="valuations">Värderingar</TabsTrigger> {/* Ny flik */}
          </TabsList>

          {/* Ärenden, Kontakter, Kunder, Abonnemang flikar (inga ändringar i JSX) */}
          <TabsContent value="cases" className="space-y-6">{/* ... befintlig kod ... */}</TabsContent>
          <TabsContent value="contact_requests" className="space-y-6">{/* ... befintlig kod ... */}</TabsContent>
          <TabsContent value="customers" className="space-y-6">{/* ... befintlig kod ... */}</TabsContent>
          <TabsContent value="subscriptions" className="space-y-6">{/* ... befintlig kod ... */}</TabsContent>

          {/* NY FLIKINNEHÅLL FÖR VÄRDERINGAR */}
          <TabsContent value="valuations" className="space-y-6">
            <h2 className="text-2xl font-bold">Inkomna Värderingar</h2>
            {loadingValuations ? (
              <div className="text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto" /></div>
            ) : valuations.length === 0 ? (
              <p className="text-warm-gray">Inga värderingar har skapats än.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {valuations.map((valuation) => (
                  <div key={valuation.id} className="bg-white rounded-2xl shadow-lg p-6 border flex flex-col gap-4">
                    <div className="flex-shrink-0">
                      <p className="font-semibold text-gray-800">{valuation.customer?.name || "Okänd kund"}</p>
                      <p className="text-sm text-gray-500">{valuation.customer?.email}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(valuation.created_at).toLocaleString('sv-SE')}
                      </p>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-2">
                      {valuation.image_urls.slice(0, 3).map((url, index) => (
                        <a href={url} target="_blank" rel="noopener noreferrer" key={index} className="relative group aspect-square">
                          <img src={url} alt={`Valuation image ${index + 1}`} className="w-full h-full object-cover rounded-md group-hover:opacity-80 transition-opacity" />
                        </a>
                      ))}
                      {valuation.image_urls.length > 3 && (
                          <div className="aspect-square bg-gray-200 rounded-md flex items-center justify-center text-lg font-bold text-gray-500">
                            +{valuation.image_urls.length - 3}
                          </div>
                      )}
                    </div>

                    <div className="flex-grow bg-gray-50 p-4 rounded-md border min-h-[200px] overflow-y-auto">
                      <h3 className="font-bold text-lg mb-2 text-trust-blue">AI Analys</h3>
                      <p className="text-gray-700 whitespace-pre-wrap text-sm">{valuation.analysis_result}</p>
                    </div>
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
        />
      )}

            {showCustomerDialog && selectedCustomer && (
                <Dialog open={showCustomerDialog} onOpenChange={setShowCustomerDialog}>{/* ... befintlig kod ... */}</Dialog>
            )}
      
            {/* Tabbar */}
          </div>
        );
      };
      
      export default AdminPortal;
