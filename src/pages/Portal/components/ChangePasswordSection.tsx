import React, { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Eye, EyeOff } from "lucide-react";

export const ChangePasswordSection: React.FC = () => {
  const { toast } = useToast();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleChangePassword = async () => {
    // Validering
    if (!currentPassword.trim()) {
      toast({ title: "Fel", description: "Ange ditt nuvarande lösenord.", variant: "destructive" });
      return;
    }
    if (!newPassword.trim()) {
      toast({ title: "Fel", description: "Ange ett nytt lösenord.", variant: "destructive" });
      return;
    }
    if (newPassword.length < 6) {
      toast({ title: "Fel", description: "Lösenordet måste vara minst 6 tecken långt.", variant: "destructive" });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: "Fel", description: "Lösenorden matchar inte.", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      // Supabase updateUser-metod med lösenord
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      toast({ title: "Lösenord uppdaterat", description: "Ditt lösenord har ändrats.", variant: "default" });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      console.error("Lösenordsändring misslyckades:", err);
      toast({ 
        title: "Fel", 
        description: err.message || "Kunde inte ändra lösenord.", 
        variant: "destructive" 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <div>
        <Label htmlFor="currentPassword">Nuvarande lösenord</Label>
        <div className="relative">
          <Input
            id="currentPassword"
            type={showCurrentPassword ? "text" : "password"}
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            placeholder="Ange ditt nuvarande lösenord"
            disabled={loading}
          />
          <button
            type="button"
            onClick={() => setShowCurrentPassword(!showCurrentPassword)}
            className="absolute right-2 top-2 text-gray-500 hover:text-gray-700"
            disabled={loading}
          >
            {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <div>
        <Label htmlFor="newPassword">Nytt lösenord</Label>
        <div className="relative">
          <Input
            id="newPassword"
            type={showNewPassword ? "text" : "password"}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Ange ett nytt lösenord"
            disabled={loading}
          />
          <button
            type="button"
            onClick={() => setShowNewPassword(!showNewPassword)}
            className="absolute right-2 top-2 text-gray-500 hover:text-gray-700"
            disabled={loading}
          >
            {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <div>
        <Label htmlFor="confirmPassword">Bekräfta lösenord</Label>
        <div className="relative">
          <Input
            id="confirmPassword"
            type={showConfirmPassword ? "text" : "password"}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Bekräfta ditt nya lösenord"
            disabled={loading}
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            className="absolute right-2 top-2 text-gray-500 hover:text-gray-700"
            disabled={loading}
          >
            {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <Button
        onClick={handleChangePassword}
        disabled={loading}
        className="w-full bg-trust-blue hover:bg-trust-blue/90"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : "Ändra lösenord"}
      </Button>
    </div>
  );
};

export default ChangePasswordSection;
