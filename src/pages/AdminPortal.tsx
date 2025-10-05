import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
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
import EditCaseDialog from './EditCaseDialog'; // Ensure this path is correct
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress"; // Om du har en Progress-komponent

// --- Type Definitions ---
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
  status: string; // Add status property
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
  status?: string; // Add status property
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

// --- AdminPortal Component ---
const AdminPortal = () => {
  const { customer, signOut } = useAuth();
  const [cases, setCases] = useState<Case[]>([]);
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([]);
  const [contactRequests, setContactRequests] = useState<ContactRequest[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [caseSubscriptions, setCaseSubscriptions] = useState<CaseSubscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingSubscriptions, setLoadingSubscriptions] = useState(false);
  const [loadingCaseSubscriptions, setLoadingCaseSubscriptions] = useState(false);
  const { toast } = useToast();
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showCustomerDialog, setShowCustomerDialog] = useState(false);
  const [providerValue, setProviderValue] = useState("");
  const [providerInput, setProviderInput] = useState("");
  const [openOverview, setOpenOverview] = useState<"cases" | "subscriptions" | "comments" | null>(null);

  const fetchCases = async () => {
    try {
      const { data, error } = await supabase
        .from("cases")
        .select("*, customer:customer_id(*), service_type:service_type_id(*)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setCases(data || []);
    } catch (error) {
      console.error("Error fetching cases:", error);
      toast({
        title: "Fel",
        description: "Kunde inte hämta ärenden",
        variant: "destructive",
      });
    }
  };

  const fetchCustomers = async () => {
    // ... (same as before) ...
    try {
      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .order("name");
      if (error) throw error;
      setCustomers(data || []);
    } catch (error) {
      console.error("Error fetching customers:", error);
      toast({
        title: "Fel",
        description: "Kunde inte hämta kunder",
        variant: "destructive",
      });
    }
  };
  
  const fetchServiceTypes = async () => {
    // ... (same as before) ...
    const { data, error } = await supabase
      .from("service_types")
      .select("*")
      .order("name");
    if (error) throw error;
    setServiceTypes(data || []);
  };

  const fetchContactRequests = async () => {
    const { data, error } = await supabase
      .from("contact_requests")
      .select("*")
      .order("created_at", { ascending: false });
    console.log("Contact requests:", data, error);
    if (error) throw error;
    setContactRequests(data || []);
  };

  const fetchSubscriptions = async () => {
    setLoadingSubscriptions(true);
    const { data, error } = await supabase
      .from("case_comments")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      toast({
        title: "Fel",
        description: "Kunde inte hämta abonnemang",
        variant: "destructive",
      });
      console.error(error);
    } else {
      setSubscriptions(data || []);
    }
    setLoadingSubscriptions(false);
  };
  
  const fetchCaseSubscriptions = async () => {
    setLoadingCaseSubscriptions(true);
    const { data, error } = await supabase
      .from("case_subscriptions")
      .select("*, case:case_id(*), subscription:subscription_id(*)")
      .order("created_at", { ascending: false });
    if (error) {
      toast({
        title: "Fel",
        description: "Kunde inte hämta ärendeabonnemang",
        variant: "destructive",
      });
      console.error(error);
    } else {
      setCaseSubscriptions(data || []);
    }
    setLoadingCaseSubscriptions(false);
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
        fetchCaseSubscriptions(), // Lägg till denna rad!
      ]);
      setLoading(false);
    };
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  const createCase = async (formData) => {
    // ... (same as before) ...
    try {
      const title = (formData.get("title") as string)?.toString().trim();
      const description = ((formData.get("description") as string) || '').toString().trim();
      const rawStatus = ((formData.get("status") as string) || '').toString();
      const rawPriority = ((formData.get("priority") as string) || '').toString();
      const allowedStatuses = ['pending','in_progress','completed','cancelled'];
      const allowedPriorities = ['low','medium','high'];
      const status = allowedStatuses.includes(rawStatus) ? rawStatus : undefined;
      const priority = allowedPriorities.includes(rawPriority) ? rawPriority : undefined;

      const caseData: any = {
        customer_id: formData.get("customer_id") as string,
        service_type_id: formData.get("service_type_id") as string,
        title,
        description,
      };
      if (status) caseData.status = status;
      

      const scheduled_date = (formData.get("scheduled_date") as string) || '';
      if (scheduled_date) caseData.scheduled_date = scheduled_date;

      const address = (formData.get("address") as string) || '';
      if (address) caseData.address = address;

      const total_price_raw = (formData.get("total_price") as string) || '';
      const total_price = total_price_raw ? Number(total_price_raw) : undefined;
      if (total_price !== undefined && !Number.isNaN(total_price)) caseData.total_price = total_price;

      const notes = (formData.get("notes") as string) || '';
      if (notes) caseData.notes = notes;

      const { error } = await supabase.from("cases").insert(caseData);
      if (error) throw error;
      toast({
        title: "Ärende skapat",
        description: "Det nya ärendet har skapats",
      });
      fetchCases();
    } catch (error) {
      console.error("Error creating case:", error);
      toast({
        title: "Fel",
        description: "Kunde inte skapa ärende",
        variant: "destructive",
      });
    }
  };

  const createSubscription = async (formData: FormData) => {
    try {
      const category = (formData.get("category") as string)?.trim();
      // Hämta leverantör från select eller input
      const providerSelect = (formData.get("provider_select") as string)?.trim();
      const providerInput = (formData.get("provider") as string)?.trim();
      const provider = providerSelect === "custom" ? providerInput : providerSelect;
      const customer_id = (formData.get("customer_id") as string)?.trim();
      const status = (formData.get("status") as string)?.trim();
      const notes = (formData.get("notes") as string)?.trim();

      if (!category || !provider || !customer_id || !status) {
        toast({
          title: "Fel",
          description: "Alla fält måste fyllas i",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase.from("subscriptions").insert({
        category,
        provider,
        customer_id,
        status,
        notes,
      });

      if (error) throw error;

      toast({
        title: "Abonnemang avslutat",
        description: "Abonnemanget har markerats som avslutat",
      });
      fetchSubscriptions();
    } catch (error) {
      console.error("Error creating subscription:", error);
      toast({
        title: "Fel",
        description: "Kunde inte avsluta abonnemang",
        variant: "destructive",
      });
    }
  };

  const updateContactRequestStatus = async (id: string, status: string) => {
    const { error } = await supabase
      .from('contact_requests')
      .update({ status })
      .eq('id', id);

    if (error) {
      toast({
        title: "Fel",
        description: "Kunde inte uppdatera status",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Status uppdaterad",
        description: "Kontaktens status har uppdaterats",
      });
      await fetchContactRequests();
    }
  };

  const updateCaseStatus = async (id: string, status: string) => {
    const { error } = await supabase
      .from("cases")
      .update({ status })
      .eq("id", id);

    if (error) {
      toast({
        title: "Fel",
        description: "Kunde inte uppdatera ärendestatus",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Status uppdaterad",
        description: "Ärendets status har uppdaterats",
      });
      fetchCases();
    }
  };

  const updateSubscriptionStatus = async (id: string, status: string) => {
    const { error } = await supabase
      .from("subscriptions")
      .update({ status })
      .eq("id", id);

    if (error) {
      toast({
        title: "Fel",
        description: "Kunde inte uppdatera abonnemangsstatus",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Status uppdaterad",
        description: "Abonnemangets status har uppdaterats",
      });
      fetchSubscriptions();
    }
  };

  if (!customer?.is_admin) {
    // ... (same as before) ...
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
    // ... (same as before) ...
    return (
      <div className="min-h-screen bg-soft-gray flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 text-trust-blue animate-spin mx-auto mb-4" />
          <p className="text-warm-gray">Laddar admin-panel...</p>
        </div>
      </div>
    );
  }

  // Räkna nya förfrågningar (t.ex. senaste 24h)
  const newContactRequests = contactRequests.filter(
    (req) => req.status === "new"
  );
  // Räkna nya kunder (t.ex. senaste 24h)
  const newCustomers = customers.filter(
    (c) => new Date(c.created_at) > new Date(Date.now() - 24 * 60 * 60 * 1000)
  );

  // --- Statistik för vald kund ---
  const customerCases = cases.filter(c => c.customer?.id === selectedCustomer?.id);
  const customerSubscriptions = subscriptions.filter(s => s.customer_id === selectedCustomer?.id);
  const customerComments = []; // Hämta från customer_comments-tabellen om du har det

  const completedCases = customerCases.filter(c => c.status === "completed").length;
  const completedSubscriptions = customerSubscriptions.filter(s => s.status === "completed").length;

  const caseProgress = customerCases.length > 0 ? Math.round((completedCases / customerCases.length) * 100) : 0;
  const subscriptionProgress = customerSubscriptions.length > 0 ? Math.round((completedSubscriptions / customerSubscriptions.length) * 100) : 0;

  return (
    <div className="min-h-screen bg-soft-gray">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div>
              <h1 className="text-xl font-semibold text-trust-blue">
                Admin Panel - Trygg Hand
              </h1>
              <p className="text-sm text-warm-gray">
                Hantera ärenden och kunder
              </p>
            </div>
            <Button 
  onClick={() => signOut({ redirectTo: '/' })} 
  variant="outline" 
  size="sm"
>
  <LogOut className="w-4 h-4 mr-2" />
  Logga ut
</Button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs defaultValue="cases" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
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
          </TabsList>

          {/* Cases Tab */}
          <TabsContent value="cases" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Ärenden</h2>
              <Dialog>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Nytt ärende
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Skapa nytt ärende</DialogTitle>
                    <DialogDescription>
                      Lägg till ett nytt ärende för en kund
                    </DialogDescription>
                  </DialogHeader>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      createCase(new FormData(e.currentTarget));
                    }}
                    className="space-y-4"
                  >
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <Label htmlFor="customer_id">Kund</Label>
                        <Select name="customer_id" required>
                          <SelectTrigger>
                            <SelectValue placeholder="Välj kund" />
                          </SelectTrigger>
                          <SelectContent>
                            {customers.length > 0 ? (
                              customers.map((c) => (
                                <SelectItem key={c.id} value={c.id}>
                                  {c.name} ({c.email})
                                </SelectItem>
                              ))
                            ) : (
                              <SelectItem value="none" disabled>
                                Inga kunder tillgängliga
                              </SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="service_type_id">Tjänst</Label>
                        <Select name="service_type_id" required>
                          <SelectTrigger className="max-w-xs">
                            <SelectValue placeholder="Välj tjänst" />
                          </SelectTrigger>
                          <SelectContent>
                            {serviceTypes.map((service) => (
                              <SelectItem key={service.id} value={service.id}>
                                {service.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 gap-4">
                      <div>
                        <Label htmlFor="title">Titel</Label>
                        <Input id="title" name="title" required placeholder="Ange ärendets titel" />
                      </div>
                      <div>
                        <Label htmlFor="description">Beskrivning</Label>
                        <Textarea id="description" name="description" placeholder="Kort beskrivning" />
                      </div>
                      <div>
                        <Label htmlFor="scheduled_date">Datum</Label>
                        <Input
                          id="scheduled_date"
                          name="scheduled_date"
                          type="date"
                          placeholder="Välj datum"
                        />
                      </div>
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                          <Label htmlFor="status">Status</Label>
                          <Select name="status" defaultValue="pending" required>
                            <SelectTrigger>
                              <SelectValue placeholder="Välj status" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pending">Väntande</SelectItem>
                              <SelectItem value="in_progress">Pågår</SelectItem>
                              <SelectItem value="completed">Avslutad</SelectItem>
                              <SelectItem value="cancelled">Avbruten</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="priority">Prioritet</Label>
                          <Select name="priority" defaultValue="medium">
                            <SelectTrigger>
                              <SelectValue placeholder="Välj prioritet" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="low">Låg</SelectItem>
                              <SelectItem value="medium">Medel</SelectItem>
                              <SelectItem value="high">Hög</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                    <Button type="submit" className="w-full">
                      Skapa ärende
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid gap-4">
              {cases.map((case_) => (
                <Card key={case_.id} className="cursor-pointer" onClick={() => setSelectedCaseId(case_.id)}>
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="font-semibold text-lg">{case_.title}</h3>
                        <p className="text-sm text-warm-gray">
                          {case_.customer?.name} • {case_.service_type?.name}
                        </p>
                      </div>
                      <Select
                        value={case_.status}
                        onValueChange={(value) => updateCaseStatus(case_.id, value)}
                      >
                        <SelectTrigger className="w-[140px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Väntande</SelectItem>
                          <SelectItem value="in_progress">Pågår</SelectItem>
                          <SelectItem value="completed">Avslutad</SelectItem>
                          <SelectItem value="cancelled">Avbruten</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <p className="text-sm mb-2">{case_.description}</p>
                    {case_.address && (
                      <p className="text-xs text-warm-gray">
                        📍 {case_.address}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* contact_requests Tab */}
          <TabsContent value="contact_requests" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Kontakter</h2>
            </div>

            <div className="grid gap-4">
              {contactRequests.map((request) => (
                <Card key={request.id}>
                  <CardContent className="p-6">
                    <h3 className="font-semibold text-lg">
                      {request.name?.trim() ||
  `${request.firstname ?? ""} ${request.lastname ?? ""}`.trim() ||
  "Okänd"}
                    </h3>
                    <p className="text-sm text-warm-gray">
                      {request.email?.trim() || "Ingen e-post"}
                    </p>
                    <p className="text-sm text-warm-gray">
                      {request.message?.trim() || "Ingen meddelande"}
                    </p>
                    {request.phone && (
                      <p className="text-sm text-warm-gray">📞 {request.phone}</p>
                    )}
                    {request.service_interest && (
                      <p className="text-sm text-warm-gray">Intresse: {request.service_interest}</p>
                    )}
                    <Select
                      value={request.status}
                      onValueChange={(value) => updateContactRequestStatus(request.id, value)}
                    >
                      <SelectTrigger className="w-[140px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="new">Ny</SelectItem>
                        <SelectItem value="in_progress">Pågående</SelectItem>
                        <SelectItem value="completed">Klar</SelectItem>
                        <SelectItem value="cancelled">Avbruten</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-warm-gray">
                      {new Date(request.created_at).toLocaleString("sv-SE")}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Customers Tab */}
          <TabsContent value="customers" className="space-y-6">
  <h2 className="text-2xl font-bold">Kunder</h2>
  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
    {customers.length === 0 ? (
      <p className="text-warm-gray">Inga kunder hittades.</p>
    ) : (
      customers.map((customer) => (
        <Card key={customer.id} className="cursor-pointer" onClick={() => { setSelectedCustomer(customer); setShowCustomerDialog(true); }}>
          <CardContent className="p-6">
            <h3 className="font-semibold text-lg">{customer.name}</h3>
            <p className="text-sm text-warm-gray">{customer.email}</p>
            {customer.phone && (
              <p className="text-sm text-warm-gray">📞 {customer.phone}</p>
            )}
            <Button variant="outline" size="sm" className="mt-2" onClick={(e) => { e.stopPropagation(); setSelectedCustomer(customer); setShowCustomerDialog(true); }}>
              Öppna kundkort
            </Button>
          </CardContent>
        </Card>
      ))
    )}
  </div>
</TabsContent>

          {/* Subscriptions Tab */}
          <TabsContent value="subscriptions" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Abonnemang</h2>
              <Dialog>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Avsluta abonnemang
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Avsluta abonnemang</DialogTitle>
                    <DialogDescription>
                      Markera ett abonnemang som avslutat och lämna kommentar.
                    </DialogDescription>
                  </DialogHeader>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      createSubscription(new FormData(e.currentTarget));
                    }}
                    className="space-y-4"
                  >
                    <div>
                      <Label htmlFor="status">Status</Label>
                      <Select name="status" required>
                        <SelectTrigger>
                          <SelectValue placeholder="Välj status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">Aktiv</SelectItem>
                          <SelectItem value="cancelled">Avslutad</SelectItem>
                          <SelectItem value="completed">Klar</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="provider">Leverantör</Label>
                      <Select
                        name="provider_select"
                        onValueChange={(value) => setProviderValue(value)}
                        value={providerValue}
                        required
                      >
                        <SelectTrigger className="max-w-xs">
                          <SelectValue placeholder="Välj leverantör" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="custom">Skriv själv</SelectItem>
                          <SelectItem value="Sundsvalls Energi">Sundsvalls Energi</SelectItem>
                          <SelectItem value="Fortum">Fortum</SelectItem>
                          <SelectItem value="Övrige elavtal">Övriga elavtal</SelectItem>
                          <SelectItem value="MittSverigeVatten">MittSverigeVatten</SelectItem>
                          <SelectItem value="Hemförsäkring">Hemförsäkring</SelectItem>
                          <SelectItem value="Postkodslotteriet">Postkodslotteriet</SelectItem>
                          <SelectItem value="Telia">Telia</SelectItem>
                          <SelectItem value="Tele2">Tele2</SelectItem>
                          <SelectItem value="Netflix">Netflix</SelectItem>
                          <SelectItem value="Övrigt streaming abonnemang">Övrigt streaming abonnemang</SelectItem>
                          <SelectItem value="Spotify">Spotify</SelectItem>
                          <SelectItem value="Googlekonto">Googlekonto</SelectItem>
                          <SelectItem value="Mail">Mail</SelectItem>
                          <SelectItem value="Övrigt">Övrigt</SelectItem>
                        </SelectContent>
                      </Select>
                      {providerValue === "custom" && (
    <Input
      id="provider"
      name="provider"
      required
      placeholder="Skriv leverantör"
      className="mt-2 max-w-xs"
      onChange={e => setProviderInput(e.target.value)}
      value={providerInput}
    />
  )}
                    </div>
                    <div>
                      <Label htmlFor="customer_id">Kund</Label>
                      <Select name="customer_id" required>
                        <SelectTrigger>
                          <SelectValue placeholder="Välj kund" />
                        </SelectTrigger>
                        <SelectContent>
                          {customers.length > 0 ? (
                            customers.map((c) => (
                              <SelectItem key={c.id} value={c.id}>
                                {c.name} ({c.email})
                              </SelectItem>
                            ))
                          ) : (
                            <SelectItem value="none" disabled>
                              Inga kunder tillgängliga
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="notes">Kommentar</Label>
                      <Textarea id="notes" name="notes" placeholder="Kommentar till avslut" />
                    </div>
                    <Button type="submit" className="w-full">
                      Avsluta abonnemang
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
            {loadingSubscriptions ? (
              <p>Laddar...</p>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {subscriptions.length === 0 ? (
                  <p className="text-warm-gray">Inga abonnemang hittades.</p>
                ) : (
                  subscriptions.map((sub) => (
                    <Card key={sub.id}>
                      <CardContent className="p-6">
                        <h3 className="font-semibold text-lg">{sub.category || "Ingen kategori"}</h3>
                        {sub.provider && (
                          <p className="text-sm text-warm-gray">Leverantör: {sub.provider}</p>
                        )}
                        <p className="text-sm text-warm-gray">
                          Kund: <span className="font-semibold">
                            {(() => {
                              const cust = customers.find(c => c.id === sub.customer_id);
                              return cust?.name || "Okänd kund";
                            })()}
                          </span>
                          {(() => {
                            const cust = customers.find(c => c.id === sub.customer_id);
                            return cust?.email ? <> ({cust.email})</> : null;
                          })()}
                        </p>
                        <Select
      value={sub.status}
      onValueChange={(value) => updateSubscriptionStatus(sub.id, value)}
    >
      <SelectTrigger className="w-[140px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="pending">Väntande</SelectItem>
        <SelectItem value="in_progress">Pågår</SelectItem>
        <SelectItem value="completed">Avslutad</SelectItem>
        <SelectItem value="cancelled">Avbruten</SelectItem>
      </SelectContent>
    </Select>
                        {sub.notes && (
                          <p className="text-sm text-warm-gray">Kommentar: {sub.notes}</p>
                        )}
                        {sub.created_at && (
                          <p className="text-xs text-warm-gray">
                            Skapad: {new Date(sub.created_at).toLocaleDateString("sv-SE")}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  ))
                )}
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
  <Dialog open={showCustomerDialog} onOpenChange={setShowCustomerDialog}>
    <DialogContent className="sm:max-w-md max-h-[80vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Kundkort: {selectedCustomer.name}</DialogTitle>
        <DialogDescription>
          {selectedCustomer.email}<br />
          {selectedCustomer.phone && <>📞 {selectedCustomer.phone}<br /></>}
          Skapad: {new Date(selectedCustomer.created_at).toLocaleDateString("sv-SE")}
        </DialogDescription>
      </DialogHeader>

      {/* Visualisering i kundkortet */}
      <div className="mb-6">
        <h3 className="text-lg font-bold mb-2">Projektöversikt</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardContent className="p-4">
              <h4 className="font-semibold mb-1">Ärenden</h4>
              <p className="text-sm mb-2">
                {completedCases} av {customerCases.length} ärenden genomförda
              </p>
              <Progress value={caseProgress} className="h-2" />
              <p className="text-xs text-warm-gray mt-1">{caseProgress}% klart</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <h4 className="font-semibold mb-1">Abonnemang</h4>
              <p className="text-sm mb-2">
                {completedSubscriptions} av {customerSubscriptions.length} avslutade
              </p>
              <Progress value={subscriptionProgress} className="h-2" />
              <p className="text-xs text-warm-gray mt-1">{subscriptionProgress}% klart</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <h4 className="font-semibold mb-1">Meddelanden & kommentarer</h4>
              <p className="text-sm mb-2">
                {customerComments.length} meddelanden skickade
              </p>
              <ul className="text-xs text-warm-gray list-disc ml-4">
                {customerComments.slice(-3).map((comment, idx) => (
                  <li key={idx}>{comment.comment}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>

      <h4 className="font-semibold mt-4 mb-2">Skapa nytt ärende för denna kund</h4>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const formData = new FormData(e.currentTarget);
          formData.set("customer_id", selectedCustomer.id); // Sätt kund-id automatiskt
          createCase(formData);
          setShowCustomerDialog(false);
        }}
        className="space-y-4"
      >
        <div>
          <Label htmlFor="service_type_id">Tjänst</Label>
          <Select name="service_type_id" required>
            <SelectTrigger className="max-w-xs">
              <SelectValue placeholder="Välj tjänst" />
            </SelectTrigger>
            <SelectContent>
              {serviceTypes
                .filter((service) => service.name !== "Avslut av abonnemang")
                .map((service) => (
                  <SelectItem key={service.id} value={service.id}>
                    {service.name}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="title">Titel</Label>
          <Input id="title" name="title" required placeholder="Ange ärendets titel" />
        </div>
        <div>
          <Label htmlFor="description">Beskrivning</Label>
          <Textarea id="description" name="description" placeholder="Kort beskrivning" />
        </div>
        <div>
          <Label htmlFor="scheduled_date">Datum</Label>
          <Input
            id="scheduled_date"
            name="scheduled_date"
            type="date"
            placeholder="Välj datum"
          />
        </div>
        <div>
          <Label htmlFor="status">Status</Label>
          <Select name="status" defaultValue="pending" required>
            <SelectTrigger>
              <SelectValue placeholder="Välj status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Väntande</SelectItem>
              <SelectItem value="in_progress">Pågår</SelectItem>
              <SelectItem value="completed">Avslutad</SelectItem>
              <SelectItem value="cancelled">Avbruten</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="priority">Prioritet</Label>
          <Select name="priority" defaultValue="medium">
            <SelectTrigger>
              <SelectValue placeholder="Välj prioritet" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Låg</SelectItem>
              <SelectItem value="medium">Medel</SelectItem>
              <SelectItem value="high">Hög</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button type="submit" className="w-full">
          Skapa ärende
        </Button>
      </form>

      {/* Avsluta abonnemang för denna kund */}
      <h4 className="font-semibold mt-6 mb-2">Avsluta abonnemang för denna kund</h4>
<form
  onSubmit={(e) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    formData.set("customer_id", selectedCustomer.id); // Sätt kund-id automatiskt
    createSubscription(formData);
    setShowCustomerDialog(false);
  }}
  className="space-y-4"
>
  <div>
    <Label htmlFor="status">Status</Label>
    <Select name="status" required>
      <SelectTrigger>
        <SelectValue placeholder="Välj status" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="pending">Väntande</SelectItem>
        <SelectItem value="in_progress">Pågår</SelectItem>
        <SelectItem value="completed">Avslutad</SelectItem>
        <SelectItem value="cancelled">Avbruten</SelectItem>
      </SelectContent>
    </Select>
  </div>
  <div>
    <Label htmlFor="provider">Leverantör</Label>
    <Select
      name="provider_select"
      onValueChange={(value) => setProviderValue(value)}
      value={providerValue}
      required
    >
      <SelectTrigger className="max-w-xs">
        <SelectValue placeholder="Välj leverantör" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="custom">Skriv själv</SelectItem>
        <SelectItem value="Sundsvalls Energi">Sundsvalls Energi</SelectItem>
        <SelectItem value="Fortum">Fortum</SelectItem>
        <SelectItem value="Övrige elavtal">Övriga elavtal</SelectItem>
        <SelectItem value="MittSverigeVatten">MittSverigeVatten</SelectItem>
        <SelectItem value="Hemförsäkring">Hemförsäkring</SelectItem>
        <SelectItem value="Postkodslotteriet">Postkodslotteriet</SelectItem>
        <SelectItem value="Telia">Telia</SelectItem>
        <SelectItem value="Tele2">Tele2</SelectItem>
        <SelectItem value="Netflix">Netflix</SelectItem>
        <SelectItem value="Övrigt streaming abonnemang">Övrigt streaming abonnemang</SelectItem>
        <SelectItem value="Spotify">Spotify</SelectItem>
        <SelectItem value="Googlekonto">Googlekonto</SelectItem>
        <SelectItem value="Mail">Mail</SelectItem>
        <SelectItem value="Övrigt">Övrigt</SelectItem>
      </SelectContent>
    </Select>
    {providerValue === "custom" && (
    <Input
      id="provider"
      name="provider"
      required
      placeholder="Skriv leverantör"
      className="mt-2 max-w-xs"
      onChange={e => setProviderInput(e.target.value)}
      value={providerInput}
    />
  )}
  </div>
  <div>
    <Label htmlFor="customer_id">Kund</Label>
    <Select name="customer_id" required>
      <SelectTrigger>
        <SelectValue placeholder="Välj kund" />
      </SelectTrigger>
      <SelectContent>
        {customers.length > 0 ? (
          customers.map((c) => (
            <SelectItem key={c.id} value={c.id}>
              {c.name} ({c.email})
            </SelectItem>
          ))
        ) : (
          <SelectItem value="none" disabled>
            Inga kunder tillgängliga
          </SelectItem>
        )}
      </SelectContent>
    </Select>
  </div>
  <div>
    <Label htmlFor="notes">Kommentar</Label>
    <Textarea id="notes" name="notes" placeholder="Kommentar till avslut" />
  </div>
  <Button type="submit" className="w-full">
    Avsluta abonnemang
  </Button>
</form>

{/* Meddelande till kund - eget avsnitt */}

<form
  onSubmit={async (e) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const comment = formData.get("customer_comment") as string;
    // Spara kommentaren till t.ex. en "customer_comments"-tabell
    const { error } = await supabase.from("customer_comments").insert({
      customer_id: selectedCustomer.id,
      comment,
      created_at: new Date().toISOString(),
    });
    if (!error) {
      toast({ title: "Meddelande skickat", description: "Meddelandet har sparats/skickats till kund." });
      setShowCustomerDialog(false);
    }
  }}
  className="space-y-4"
>
  <Label htmlFor="customer_comment">Meddelande till kund</Label>
  <Textarea id="customer_comment" name="customer_comment" placeholder="Skriv ett meddelande till kunden här..." />
  <Button type="submit" className="w-full">
    Skicka meddelande
  </Button>
</form>
    </DialogContent>
  </Dialog>
)}

<Dialog open={openOverview !== null} onOpenChange={() => setOpenOverview(null)}>
  <DialogContent>
    {openOverview === "cases" && (
      <>
        <DialogHeader>
          <DialogTitle>Alla ärenden</DialogTitle>
        </DialogHeader>
        <ul>
          {customerCases.map((c) => (
            <li key={c.id}>
              <strong>{c.title}</strong> – {c.status}
              <br />
              {c.description}
            </li>
          ))}
        </ul>
      </>
    )}
    {openOverview === "subscriptions" && (
      <>
        <DialogHeader>
          <DialogTitle>Alla abonnemang</DialogTitle>
        </DialogHeader>
        <ul>
          {customerSubscriptions.map((s) => (
            <li key={s.id}>
              <strong>{s.category}</strong> – {s.status}
              <br />
              Leverantör: {s.provider}
            </li>
          ))}
        </ul>
      </>
    )}
    {openOverview === "comments" && (
      <>
        <DialogHeader>
          <DialogTitle>Meddelanden & kommentarer</DialogTitle>
        </DialogHeader>
        <ul>
          {customerComments.map((comment, idx) => (
            <li key={idx}>{comment.comment}</li>
          ))}
        </ul>
      </>
    )}
  </DialogContent>
</Dialog>
    </div>
  );
};

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

export default AdminPortal;