import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { supabase, Case, Customer, ServiceType, ContactRequest, Subscription } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { Plus, LogOut, Users, FileText, Phone, Package } from 'lucide-react'

const AdminPortal = () => {
  const { customer, signOut } = useAuth()
  const [cases, setCases] = useState<Case[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([])
  const [contactRequests, setContactRequests] = useState<ContactRequest[]>([])
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    if (customer?.is_admin) {
      fetchAllData()
    }
  }, [customer])

  const fetchAllData = async () => {
    setLoading(true)
    try {
      await Promise.all([
        fetchCases(),
        fetchCustomers(),
        fetchServiceTypes(),
        fetchContactRequests(),
        fetchSubscriptions()
      ])
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchCases = async () => {
    const { data, error } = await supabase
      .from('cases')
      .select(`
        *,
        customer:customers(name, email, phone),
        service_type:service_types(name)
      `)
      .order('created_at', { ascending: false })

    if (error) throw error
    setCases(data || [])
  }

  const fetchCustomers = async () => {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error
    setCustomers(data || [])
  }

  const fetchServiceTypes = async () => {
    const { data, error } = await supabase
      .from('service_types')
      .select('*')
      .order('name')

    if (error) throw error
    setServiceTypes(data || [])
  }

  const fetchContactRequests = async () => {
    const { data, error } = await supabase
      .from('contact_requests')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error
    setContactRequests(data || [])
  }

  const fetchSubscriptions = async () => {
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .order('category', { ascending: true })

    if (error) throw error
    setSubscriptions(data || [])
  }

  const createCase = async (formData: FormData) => {
    try {
      const caseData = {
        customer_id: formData.get('customer_id') as string,
        service_type_id: formData.get('service_type_id') as string,
        title: formData.get('title') as string,
        description: formData.get('description') as string,
        status: formData.get('status') as string,
        priority: formData.get('priority') as string,
        scheduled_date: formData.get('scheduled_date') as string || null,
        address: formData.get('address') as string || null,
        total_price: Number(formData.get('total_price')) || null,
        notes: formData.get('notes') as string || null
      }

      const { error } = await supabase
        .from('cases')
        .insert(caseData)

      if (error) throw error

      toast({
        title: 'Ärende skapat',
        description: 'Det nya ärendet har skapats'
      })
      
      fetchCases()
    } catch (error) {
      console.error('Error creating case:', error)
      toast({
        title: 'Fel',
        description: 'Kunde inte skapa ärende',
        variant: 'destructive'
      })
    }
  }

  const createSubscription = async (formData: FormData) => {
    try {
      const subscriptionData = {
        name: formData.get('name') as string,
        provider: formData.get('provider') as string,
        category: formData.get('category') as string
      }

      const { error } = await supabase
        .from('subscriptions')
        .insert(subscriptionData)

      if (error) throw error

      toast({
        title: 'Abonnemang tillagt',
        description: 'Det nya abonnemanget har lagts till'
      })
      
      fetchSubscriptions()
    } catch (error) {
      console.error('Error creating subscription:', error)
      toast({
        title: 'Fel',
        description: 'Kunde inte skapa abonnemang',
        variant: 'destructive'
      })
    }
  }

  const updateContactRequest = async (id: string, status: string, notes?: string) => {
    try {
      const { error } = await supabase
        .from('contact_requests')
        .update({ 
          status, 
          admin_notes: notes,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)

      if (error) throw error

      toast({
        title: 'Förfrågan uppdaterad',
        description: 'Statusen har uppdaterats'
      })
      
      fetchContactRequests()
    } catch (error) {
      console.error('Error updating contact request:', error)
      toast({
        title: 'Fel',
        description: 'Kunde inte uppdatera förfrågan',
        variant: 'destructive'
      })
    }
  }

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
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-soft-gray flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-trust-blue mx-auto mb-4"></div>
          <p className="text-warm-gray">Laddar admin-panel...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-soft-gray">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div>
              <h1 className="text-xl font-semibold text-trust-blue">Admin Panel - Trygg Hand</h1>
              <p className="text-sm text-warm-gray">Hantera ärenden och kunder</p>
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
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Skapa nytt ärende</DialogTitle>
                    <DialogDescription>
                      Lägg till ett nytt ärende för en kund
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={(e) => {
                    e.preventDefault()
                    createCase(new FormData(e.currentTarget))
                  }} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="customer_id">Kund</Label>
                        <Select name="customer_id" required>
                          <SelectTrigger>
                            <SelectValue placeholder="Välj kund" />
                          </SelectTrigger>
                          <SelectContent>
                            {customers.map((customer) => (
                              <SelectItem key={customer.id} value={customer.id}>
                                {customer.name} ({customer.email})
                              </SelectItem>
                            ))}
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
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="status">Status</Label>
                        <Select name="status" defaultValue="pending">
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Väntar</SelectItem>
                            <SelectItem value="in_progress">Pågår</SelectItem>
                            <SelectItem value="completed">Klar</SelectItem>
                            <SelectItem value="cancelled">Avbruten</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="priority">Prioritet</Label>
                        <Select name="priority" defaultValue="medium">
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="low">Låg</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="high">Hög</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="total_price">Pris (kr)</Label>
                        <Input name="total_price" type="number" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="scheduled_date">Planerat datum</Label>
                        <Input name="scheduled_date" type="date" />
                      </div>
                      <div>
                        <Label htmlFor="address">Adress</Label>
                        <Input name="address" />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="notes">Anteckningar</Label>
                      <Textarea name="notes" />
                    </div>
                    <Button type="submit" className="w-full">Skapa ärende</Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid gap-4">
              {cases.map((case_) => (
                <Card key={case_.id}>
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
                      <p className="text-xs text-warm-gray">📍 {case_.address}</p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Contact Requests Tab */}
          <TabsContent value="contacts" className="space-y-6">
            <h2 className="text-2xl font-bold">Kontaktförfrågningar</h2>
            <div className="grid gap-4">
              {contactRequests.map((request) => (
                <Card key={request.id}>
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="font-semibold">{request.name}</h3>
                        <p className="text-sm text-warm-gray">
                          {request.email} • {request.phone}
                        </p>
                      </div>
                      <Select
                        value={request.status}
                        onValueChange={(value) => updateContactRequest(request.id, value)}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="new">Ny</SelectItem>
                          <SelectItem value="contacted">Kontaktad</SelectItem>
                          <SelectItem value="quoted">Offerterad</SelectItem>
                          <SelectItem value="converted">Konverterad</SelectItem>
                          <SelectItem value="closed">Stängd</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <p className="text-sm mb-2">{request.message}</p>
                    {request.service_interest && (
                      <p className="text-xs text-warm-gray">
                        Intresserad av: {request.service_interest}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Customers Tab */}
          <TabsContent value="customers" className="space-y-6">
            <h2 className="text-2xl font-bold">Kunder</h2>
            <div className="grid gap-4">
              {customers.map((customer) => (
                <Card key={customer.id}>
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-semibold">{customer.name}</h3>
                        <p className="text-sm text-warm-gray">{customer.email}</p>
                        {customer.phone && (
                          <p className="text-sm text-warm-gray">{customer.phone}</p>
                        )}
                      </div>
                      {customer.is_admin && (
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
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Abonnemang</h2>
              <Dialog>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Nytt abonnemang
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Lägg till abonnemang</DialogTitle>
                    <DialogDescription>
                      Skapa ett nytt abonnemang som kan avbrytas
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={(e) => {
                    e.preventDefault()
                    createSubscription(new FormData(e.currentTarget))
                  }} className="space-y-4">
                    <div>
                      <Label htmlFor="name">Namn</Label>
                      <Input name="name" required />
                    </div>
                    <div>
                      <Label htmlFor="provider">Leverantör</Label>
                      <Input name="provider" required />
                    </div>
                    <div>
                      <Label htmlFor="category">Kategori</Label>
                      <Input name="category" placeholder="t.ex. Streaming, Tidningar, Försäkring" required />
                    </div>
                    <Button type="submit" className="w-full">Lägg till</Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid gap-4">
              {subscriptions.map((subscription) => (
                <Card key={subscription.id}>
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-semibold">{subscription.name}</h3>
                        <p className="text-sm text-warm-gray">{subscription.provider}</p>
                        <Badge variant="outline" className="mt-2">
                          {subscription.category}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

export default AdminPortal