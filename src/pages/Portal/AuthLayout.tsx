import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button, Input, Label, Card, Tabs, TabsContent, TabsList, TabsTrigger, CardHeader, CardTitle, CardDescription, CardContent } from "../../components/ui";

const AuthLayout = () => {
  const { signIn, signUp } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    const { error } = await signIn(email, password);
    if (error) toast({ title: "Inloggning misslyckades", description: error.message, variant: "destructive" });
    else toast({ title: "Välkommen!", description: "Du är nu inloggad." });

    setIsLoading(false);
  };

  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const name = formData.get("name") as string;
    const phone = formData.get("phone") as string;

    const { error } = await signUp(email, password, name, phone);
    if (error) toast({ title: "Registrering misslyckades", description: error.message, variant: "destructive" });
    else toast({ title: "Registrering lyckad!", description: "Kontrollera din e-post för att bekräfta kontot." });

    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Trygg Hand</CardTitle>
          <CardDescription>Logga in för att hantera dina ärenden</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="signin">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Logga in</TabsTrigger>
              <TabsTrigger value="signup">Registrera</TabsTrigger>
            </TabsList>

            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-4">
                <Label htmlFor="email">E-post</Label>
                <Input id="email" name="email" type="email" required />
                <Label htmlFor="password">Lösenord</Label>
                <Input id="password" name="password" type="password" required />
                <Button type="submit" disabled={isLoading}>{isLoading ? "Laddar..." : "Logga in"}</Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4">
                <Label htmlFor="name">Namn</Label>
                <Input id="name" name="name" type="text" required />
                <Label htmlFor="phone">Telefon</Label>
                <Input id="phone" name="phone" type="tel" />
                <Label htmlFor="email">E-post</Label>
                <Input id="email" name="email" type="email" required />
                <Label htmlFor="password">Lösenord</Label>
                <Input id="password" name="password" type="password" required />
                <Button type="submit" disabled={isLoading}>{isLoading ? "Laddar..." : "Registrera"}</Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default AuthLayout;
