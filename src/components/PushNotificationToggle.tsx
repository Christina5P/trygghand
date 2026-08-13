import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { usePushNotifications } from "@/hooks/usePushNotifications";

type Props = {
  className?: string;
};

export function PushNotificationToggle({ className }: Props) {
  const {
    supported,
    loading,
    saving,
    hasVapidPublicKey,
    isSubscribed,
    permission,
    preferences,
    error,
    subscribe,
    unsubscribe,
    updatePreferences,
  } = usePushNotifications();

  const disabled = loading || saving;
  const activationBlockedByConfig = !hasVapidPublicKey;

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-xl font-bold text-trust-blue">Notiser</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!supported ? (
          <p className="text-sm text-gray-600">Din webbläsare stödjer inte push-notiser.</p>
        ) : (
          <>
            <div className="flex items-center justify-between rounded-md border p-3">
              <div>
                <Label htmlFor="push-enabled" className="text-sm font-medium">
                  Aktivera notiser
                </Label>
                <p className="text-xs text-gray-600">Du kan stänga av när som helst.</p>
              </div>
              <Switch
                id="push-enabled"
                checked={isSubscribed && preferences.push_enabled}
                disabled={disabled || activationBlockedByConfig}
                onCheckedChange={async (next) => {
                  if (next) await subscribe();
                  else await unsubscribe();
                }}
              />
            </div>

            {activationBlockedByConfig && (
              <p className="text-xs text-amber-700">
                Saknar VAPID public key i frontend-miljön. Sätt <strong>VITE_PUSH_VAPID_PUBLIC_KEY</strong> och starta om appen.
              </p>
            )}

            <div className="space-y-3 rounded-md border p-3">
              <p className="text-sm font-medium">Notisinställningar</p>

              <div className="flex items-center justify-between">
                <Label htmlFor="pref-case-updates" className="text-sm">Ärendeuppdatering</Label>
                <Switch
                  id="pref-case-updates"
                  checked={preferences.case_updates_enabled}
                  disabled={disabled}
                  onCheckedChange={(next) => {
                    void updatePreferences({ case_updates_enabled: next });
                  }}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="pref-new-messages" className="text-sm">Nytt meddelande</Label>
                <Switch
                  id="pref-new-messages"
                  checked={preferences.new_messages_enabled}
                  disabled={disabled}
                  onCheckedChange={(next) => {
                    void updatePreferences({ new_messages_enabled: next });
                  }}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="pref-contact-requests" className="text-sm">Nya kontaktförfrågningar</Label>
                <Switch
                  id="pref-contact-requests"
                  checked={preferences.contact_requests_enabled}
                  disabled={disabled}
                  onCheckedChange={(next) => {
                    void updatePreferences({ contact_requests_enabled: next });
                  }}
                />
              </div>

              <div className="space-y-2 pt-2 border-t">
                <div className="flex items-center justify-between">
                  <Label htmlFor="pref-quiet-hours" className="text-sm">Tysta tider</Label>
                  <Switch
                    id="pref-quiet-hours"
                    checked={preferences.quiet_hours_enabled}
                    disabled={disabled}
                    onCheckedChange={(next) => {
                      void updatePreferences({ quiet_hours_enabled: next });
                    }}
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label htmlFor="quiet-hours-start" className="text-xs text-gray-600">Från</Label>
                    <Input
                      id="quiet-hours-start"
                      type="time"
                      value={preferences.quiet_hours_start.slice(0, 5)}
                      disabled={disabled || !preferences.quiet_hours_enabled}
                      onChange={(e) => {
                        void updatePreferences({ quiet_hours_start: e.target.value });
                      }}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="quiet-hours-end" className="text-xs text-gray-600">Till</Label>
                    <Input
                      id="quiet-hours-end"
                      type="time"
                      value={preferences.quiet_hours_end.slice(0, 5)}
                      disabled={disabled || !preferences.quiet_hours_enabled}
                      onChange={(e) => {
                        void updatePreferences({ quiet_hours_end: e.target.value });
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {permission === "denied" && (
              <p className="text-xs text-amber-700">
                Webbläsaren blockerar notiser. Tillåt notiser i webbläsarens inställningar.
              </p>
            )}

            {error && <p className="text-xs text-red-600">{error}</p>}

            {!isSubscribed && (
              <div className="flex justify-end">
                <Button size="sm" disabled={disabled} onClick={() => void subscribe()}>
                  Aktivera notiser
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default PushNotificationToggle;
