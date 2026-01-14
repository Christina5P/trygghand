import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";

/**
 * CustomerRoute: Skyddar rutter som bara kunder ska ha tillgång till.
 * 
 * Om användaren INTE är inloggad eller INTE är markerad som kund,
 * visas en behörighetssida istället för att rendera innehållet.
 */
export default function CustomerRoute() {
  const { user, customer, loading, isCustomer } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg text-gray-600">Laddar...</p>
        </div>
      </div>
    );
  }

  // Om användaren inte är inloggad eller inte är en aktiv kund
  if (!user || !isCustomer) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <AlertCircle className="h-12 w-12 text-yellow-600" />
            </div>
            <CardTitle>Åtkomst Nekad</CardTitle>
            <CardDescription>Du har inte tillgång till denna sida</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-600 text-center">
              {!user
                ? "Du måste vara inloggad för att komma åt denna sida."
                : "Du är inte registrerad som kund ännu. Kontakta oss för att aktivera ditt konto."}
            </p>
            <div className="flex gap-3 justify-center">
              {!user ? (
                <Button onClick={() => (window.location.href = "/portal")}>
                  Logga In
                </Button>
              ) : (
                <>
                  <Button variant="outline" onClick={() => (window.location.href = "/")}>
                    Tillbaka
                  </Button>
                  <Button onClick={() => (window.location.href = "/#contact")}> 
                    Kontakta Oss
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Användaren är inloggad och är en aktiv kund - rendera innehållet
  return <Outlet />;
}
