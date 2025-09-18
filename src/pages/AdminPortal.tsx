import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  DialogDescription,
  DialogHeader,
  DialogTitle,
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

// --- Edit Case Dialog Component ---
const EditCaseDialog = ({ selectedCase, customers, serviceTypes, onUpdate, onClose }) => {
  const [formData, setFormData] = useState({
    title: selectedCase.title,
    description: selectedCase.description,
    status: selectedCase.status,
    priority: selectedCase.priority || '',
    scheduled_date: selectedCase.scheduled_date || '',
    address: selectedCase.address || '',
    total_price: selectedCase.total_price || '',
    notes: selectedCase.notes || '',
    customer_id: selectedCase.customer?.id || '',
    service_type_id: selectedCase.service_type?.id || '',
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name, value) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    await onUpdate(selectedCase.id, formData);
    onClose();
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Redigera ärende</DialogTitle>
          <DialogDescription>
            Ändra informationen för ärende "{selectedCase.title}".
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="customer_id">Kund</Label>
              <Select name="customer_id" value={formData.customer_id} onValueChange={(val) => handleSelectChange('customer_id', val)} required>
                <SelectTrigger>
                  <SelectValue placeholder="Välj kund" />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name} ({c.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="service_type_id">Tjänst</Label>
              <Select name="service_type_id" value={formData.service_type_id} onValueChange={(val) => handleSelectChange('service_type_id', val)} required>
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
          <div>
            <Label htmlFor="title">Titel</Label>
            <Input name="title" value={formData.title} onChange={handleInputChange} required />
          </div>
          <div>
            <Label htmlFor="description">Beskrivning</Label>
            <Textarea name="description" value={formData.description} onChange={handleInputChange} required />
          </div>
          <div>
            <Label htmlFor="status">Status</Label>
            <Select name="status" value={formData.status} onValueChange={(val) => handleSelectChange('status', val)} required>
              <SelectTrigger>
                <SelectValue placeholder="Välj status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Öppen">Öppen</SelectItem>
                <SelectItem value="Pågående">Pågående</SelectItem>
                <SelectItem value="Avslutad">Avslutad</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="priority">Prioritet</Label>
            <Select name="priority" value={formData.priority} onValueChange={(val) => handleSelectChange('priority', val)}>
              <SelectTrigger>
                <SelectValue placeholder="Välj prioritet" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Låg">Låg</SelectItem>
                <SelectItem value="Normal">Normal</SelectItem>
                <SelectItem value="Hög">Hög</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="scheduled_date">Schemalagt datum</Label>
            <Input type="date" name="scheduled_date" value={formData.scheduled_date} onChange={handleInputChange} />
          </div>
          <div>
            <Label htmlFor="address">Adress</Label>
            <Input name="address" value={formData.address} onChange={handleInputChange} />
          </div>
          <div>
            <Label htmlFor="total_price">Pris</Label>
            <Input type="number" name="total_price" value={formData.total_price} onChange={handleInputChange} />
          </div>
          <div>
            <Label htmlFor="notes">Anteckningar</Label>
            <Textarea name="notes" value={formData.notes} onChange={handleInputChange} />
          </div>
          <Button type="submit" className="w-full">
            Spara ändringar
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

// --- Main AdminPortal Component ---
const AdminPortal = () => {
  const { customer, signOut } = useAuth();
  const [cases, setCases] = useState<Case[]>([]);
  const [selectedCase, setSelectedCase] = useState<Case | null>(null);
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
    if (error) throw error;
    setContactRequests(data || []);
  };

  const fetchSubscriptions = async () => {
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
    try {
      const caseData = {
        customer_id: formData.get("customer_id") as string,
        service_type_id: formData.get("service_type_id") as string,
        title: formData.get("title") as string,
        description: formData.get("description") as string,
        status: formData.get("status") as string,
        priority: formData.get("priority") as string,
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

  const updateCase = async (caseId: string, formData: any) => {
    try {
      const { error } = await supabase.from("cases").update({
        customer_id: formData.customer_id,
        service_type_id: formData.service_type_id,
        title: formData.title,
        description: formData.description,
        status: formData.status,
        priority: formData.priority || null,
        scheduled_date: formData.scheduled_date || null,
        address: formData.address || null,
        total_price: Number(formData.total_price) || null,
        notes: formData.notes || null,
      }).eq("id", caseId);
      if (error) throw error;
      toast({
        title: "Ärende uppdaterat",
        description: "Ärendet har uppdaterats framgångsrikt",
      });
      fetchCases();
    } catch (error) {
      console.error("Error updating case:", error);
      toast({
        title: "Fel",
        description: "Kunde inte uppdatera ärendet",
        variant: "destructive",
      });
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
                    <div>
                      <Label htmlFor="title">Titel</Label>
                      <Input name="title" required />
                    </div>
                    <div>
                      <Label htmlFor="description">Beskrivning</Label>
                      <Textarea name="description" required />
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
                <Card key={case_.id} className="cursor-pointer" onClick={() => setSelectedCase(case_)}>
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

          {/* Contacts Tab */}
          <TabsContent value="contacts" className="space-y-6">
            <h2 className="text-2xl font-bold">Kontaktförfrågningar</h2>
            {contactRequests.length === 0 ? (
              <p className="text-warm-gray">Inga kontaktförfrågningar finns.</p>
            ) : (
              <div className="grid gap-4">
                {contactRequests.map((req) => (
                  <Card key={req.id}>
                    <CardContent className="p-6">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-semibold">{req.name}</h3>
                          <p className="text-sm text-warm-gray">{req.email}</p>
                          <p className="text-xs text-warm-gray">Skickad: {new Date(req.created_at).toLocaleString()}</p>
                        </div>
                        <div className="flex-1 ml-6">
                          <p className="text-sm">{req.message}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Customers Tab */}
          <TabsContent value="customers" className="space-y-6">
            <h2 className="text-2xl font-bold">Kunder</h2>
            <div className="grid gap-4">
              {customers.map((c) => (
                <Card key={c.id}>
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-semibold">{c.name}</h3>
                        <p className="text-sm text-warm-gray">{c.email}</p>
                        {c.phone && (
                          <p className="text-sm text-warm-gray">{c.phone}</p>
                        )}
                      </div>
                      {c.is_admin && (
                        <Badge variant="secondary">Admin</Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Subscriptions Tab */}
          <TabsContent value="subscriptions" className="space-y-6">
            <h2 className="text-2xl font-bold">Abonnemang</h2>
            {subscriptions.length === 0 ? (
              <p className="text-warm-gray">Inga abonnemang finns.</p>
            ) : (
              <div className="grid gap-4">
                {subscriptions.map((sub) => (
                  <Card key={sub.id}>
                    <CardContent className="p-6">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-semibold">Kategori: {sub.category}</h3>
                          <p className="text-sm text-warm-gray">Kund ID: {sub.customer_id}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

        </Tabs>
      </div>

      {selectedCase && (
        <EditCaseDialog
          selectedCase={selectedCase}
          customers={customers}
          serviceTypes={serviceTypes}
          onUpdate={updateCase}
          onClose={() => setSelectedCase(null)}
        />
      )}
    </div>
  );
};

export default AdminPortal;