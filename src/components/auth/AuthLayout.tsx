import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/use-toast'
import { Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase';

const checkAdminStatus = async (email: string) => {
  const { data, error } = await supabase
    .from('customers')
    .select('is_admin')
    .eq('email', email)
    .single();

  return data?.is_admin === true;
};

const AuthLayout = () => {
  const [isLoading, setIsLoading] = useState(false)
  const { signIn, signUp } = useAuth()
  const { toast } = useToast()

  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)

    const formData = new FormData(e.currentTarget)
    const email = formData.get('email') as string
    const password = formData.get('password') as string

    const { error } = await signIn(email, password)

    if (error) {
      toast({
        title: 'Inloggning misslyckades',
        description: error.message,
        variant: 'destructive'
      })
    } else {
      toast({
        title: 'Välkommen!',
        description: 'Du är nu inloggad.', duration: 5000
      })
    }

    setIsLoading(false)
  }

  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)

    const formData = new FormData(e.currentTarget)
    const email = formData.get('email') as string
    const password = formData.get('password') as string
    const name = formData.get('name') as string
    const phone = formData.get('phone') as string

    const { error } = await signUp(email, password, name, phone)

    if (error) {
      toast({
        title: 'Registrering misslyckades',
        description: error.message,
        variant: 'destructive'
      })
    } else {
      toast({
        title: 'Registrering lyckad!',
        description: 'Kontrollera din e-post för att bekräfta kontot.'
      })
    }

    setIsLoading(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-trust-blue-dark via-trust-blue to-trust-green flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-trust-blue">Trygg Hand</CardTitle>
          <CardDescription>
            Logga in för att hantera dina ärenden
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Logga in</TabsTrigger>
              <TabsTrigger value="signup">Registrera</TabsTrigger>
            </TabsList>
            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">E-postadress</Label>
                  <Input id="email" name="email" type="email" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Lösenord</Label>
                  <Input id="password" name="password" type="password" required />
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Logga in
                </Button>
              </form>
            </TabsContent>
            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Namn</Label>
                  <Input id="name" name="name" type="text" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Telefon</Label>
                  <Input id="phone" name="phone" type="tel" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">E-postadress</Label>
                  <Input id="email" name="email" type="email" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Lösenord</Label>
                  <Input id="password" name="password" type="password" required />
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Registrera
                </Button>
              </form>
            </TabsContent>
          </Tabs>
          <div className="mt-6 text-center">
            <a href="/" className="text-trust-blue hover:underline text-sm">&#8592; Tillbaka till startsidan</a>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default AuthLayout