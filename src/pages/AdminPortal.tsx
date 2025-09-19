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
}

interface Subscription {
  id: string;
  category: string;
  customer_id: string;
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
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

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
    // ... (same as before) ...
    const { data, error } = await supabase
      .from("contact_requests")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    setContactRequests(data || []);
  };

  const fetchSubscriptions = async () => {
    // ... (same as before) ...
    const { data, error } = await supabase
      .from("subscriptions")
      .select("*")
      .order("category", { ascending: true });
    if (error) throw error;
    setSubscriptions(data || []);
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
      ]);
      setLoading(false);
    };
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  const createCase = async (formData) => {
    // ... (same as before) ...
    try {
      const caseData = {
        customer_id: formData.get("customer_id") as string,
        service_type_id: formData.get("service_type_id") as string,
        title: (formData.get("title") as string)?.toString().trim(),
        description: ((formData.get("description") as string) || '').toString().trim() || '',
        status: ((formData.get("status") as string) || "pending") as string,
        priority: (formData.get("priority") as string) || null,
        scheduled_date: (formData.get("scheduled_date") as string) || null,
        address: (formData.get("address") as string) || null,
        total_price: Number(formData.get("total_price")) || null,
        notes: (formData.get("notes") as string) || null,
      };
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
            <Button onClick={signOut} variant="outline" size="sm">
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
            <TabsTrigger value="contacts">Kontakter</TabsTrigger>
            <TabsTrigger value="customers">Kunder</TabsTrigger>
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
                          <SelectTrigger>
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
                      <Badge>{case_.status}</Badge>
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

          {/* ... other tabs (contacts, customers, subscriptions) ... */}

        </Tabs>
      </div>
      
      {selectedCaseId && (
        <EditCaseDialog
          caseId={selectedCaseId}
          onClose={() => setSelectedCaseId(null)}
        />
      )}
    </div>
  );
};

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

export default AdminPortal;