import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";

export type PushPreferences = {
  push_enabled: boolean;
  case_updates_enabled: boolean;
  new_messages_enabled: boolean;
  contact_requests_enabled: boolean;
  quiet_hours_enabled: boolean;
  quiet_hours_start: string;
  quiet_hours_end: string;
  timezone: string;
};

type HookState = {
  supported: boolean;
  loading: boolean;
  saving: boolean;
  permission: NotificationPermission | "unsupported";
  isSubscribed: boolean;
  preferences: PushPreferences;
  error: string | null;
};

const DEFAULT_PREFERENCES: PushPreferences = {
  push_enabled: false,
  case_updates_enabled: false,
  new_messages_enabled: false,
  contact_requests_enabled: false,
  quiet_hours_enabled: false,
  quiet_hours_start: "22:00",
  quiet_hours_end: "07:00",
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/Stockholm",
};

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

function normalizeVapidPublicKey(raw: unknown): string {
  if (typeof raw !== "string") return "";
  const trimmed = raw.trim().replace(/^['"]|['"]$/g, "");
  return trimmed.replace(/\s+/g, "");
}

function validateVapidPublicKey(raw: unknown): { ok: true; value: string } | { ok: false; reason: string } {
  const value = normalizeVapidPublicKey(raw);
  if (!value) {
    return { ok: false, reason: "Saknar VAPID public key i frontend-miljön." };
  }

  try {
    const bytes = urlBase64ToUint8Array(value);
    if (bytes.length !== 65) {
      return { ok: false, reason: "Ogiltig VAPID public key (fel längd)." };
    }
    if (bytes[0] !== 0x04) {
      return { ok: false, reason: "Ogiltig VAPID public key (fel format)." };
    }
    return { ok: true, value };
  } catch {
    return { ok: false, reason: "Ogiltig VAPID public key (kan inte avkodas)." };
  }
}

async function getCurrentUserId(): Promise<string | null> {
  const { data: sessionData } = await supabase.auth.getSession();
  const sessionUserId = sessionData.session?.user?.id ?? null;
  if (sessionUserId) return sessionUserId;

  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

async function ensureServiceWorkerRegistration(): Promise<ServiceWorkerRegistration> {
  const existing = await navigator.serviceWorker.getRegistration("/");
  if (existing) return existing;
  return navigator.serviceWorker.register("/service-worker.js");
}

export function usePushNotifications() {
  const hasVapidPublicKey = validateVapidPublicKey(import.meta.env.VITE_PUSH_VAPID_PUBLIC_KEY).ok;
  const stateVersionRef = useRef(0);

  const [state, setState] = useState<HookState>({
    supported:
      typeof window !== "undefined" &&
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      "Notification" in window,
    loading: true,
    saving: false,
    permission:
      typeof window !== "undefined" && "Notification" in window
        ? Notification.permission
        : "unsupported",
    isSubscribed: false,
    preferences: DEFAULT_PREFERENCES,
    error: null,
  });

  const setError = useCallback((error: string | null) => {
    setState((prev) => ({ ...prev, error }));
  }, []);

  const ensurePreferenceRow = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from("push_notification_preferences")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      const row = { user_id: userId, ...DEFAULT_PREFERENCES };
      const { error: insertError } = await supabase
        .from("push_notification_preferences")
        .insert(row);
      if (insertError) throw insertError;
      return row as PushPreferences;
    }

    return {
      ...DEFAULT_PREFERENCES,
      ...(data as PushPreferences),
    } as PushPreferences;
  }, []);

  const syncSubscriptionState = useCallback(async () => {
    const syncVersion = stateVersionRef.current;

    if (!state.supported) {
      if (syncVersion !== stateVersionRef.current) return;
      setState((prev) => ({ ...prev, loading: false, permission: "unsupported" }));
      return;
    }

    try {
      const userId = await getCurrentUserId();
      if (!userId) {
        if (syncVersion !== stateVersionRef.current) return;
        setState((prev) => ({ ...prev, loading: false, isSubscribed: false }));
        return;
      }

      await ensureServiceWorkerRegistration();
      const registration = await navigator.serviceWorker.ready;
      const preferences = await ensurePreferenceRow(userId);
      let subscription = await registration.pushManager.getSubscription();

      if (!subscription && preferences.push_enabled && Notification.permission === "granted") {
        const vapidValidation = validateVapidPublicKey(import.meta.env.VITE_PUSH_VAPID_PUBLIC_KEY);
        if (vapidValidation.ok) {
          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(vapidValidation.value) as unknown as BufferSource,
          });
        }
      }

      if (subscription) {
        const json = subscription.toJSON() as Record<string, unknown>;
        const { error: upsertError } = await supabase.from("push_subscriptions").upsert(
          {
            user_id: userId,
            endpoint: subscription.endpoint,
            subscription: json,
          },
          { onConflict: "endpoint" }
        );

        if (upsertError) throw upsertError;
      }

      if (syncVersion !== stateVersionRef.current) return;

      setState((prev) => ({
        ...prev,
        loading: false,
        permission: Notification.permission,
        isSubscribed: Boolean(subscription),
        preferences,
        error: null,
      }));
    } catch (err: any) {
      if (syncVersion !== stateVersionRef.current) return;
      setState((prev) => ({
        ...prev,
        loading: false,
        error: err?.message || "Kunde inte läsa push-inställningar",
      }));
    }
  }, [ensurePreferenceRow, state.supported]);

  useEffect(() => {
    void syncSubscriptionState();
  }, [syncSubscriptionState]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      void syncSubscriptionState();
    });

    return () => subscription.unsubscribe();
  }, [syncSubscriptionState]);

  const subscribe = useCallback(async () => {
    if (!state.supported) {
      setError("Din webbläsare stödjer inte push-notiser.");
      return false;
    }

    stateVersionRef.current += 1;
    setState((prev) => ({ ...prev, saving: true }));
    try {
      const userId = await getCurrentUserId();
      if (!userId) throw new Error("Du måste vara inloggad.");

      const vapidValidation = validateVapidPublicKey(import.meta.env.VITE_PUSH_VAPID_PUBLIC_KEY);
      if (!vapidValidation.ok) throw new Error(vapidValidation.reason);

      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState((prev) => ({ ...prev, permission }));
        throw new Error("Notisbehörighet nekad.");
      }

      await ensureServiceWorkerRegistration();
      const registration = await navigator.serviceWorker.ready;
      const existing = await registration.pushManager.getSubscription();
if (existing) {
  await existing.unsubscribe();
  await supabase.from("push_subscriptions").delete().eq("endpoint", existing.endpoint);
}
const subscription = await registration.pushManager.subscribe({
  userVisibleOnly: true,
  applicationServerKey: urlBase64ToUint8Array(vapidValidation.value) as unknown as BufferSource,
});

      const subscriptionJson = subscription.toJSON() as Record<string, unknown>;
      const { error: upsertSubscriptionError } = await supabase.from("push_subscriptions").upsert(
        {
          user_id: userId,
          endpoint: subscription.endpoint,
          subscription: subscriptionJson,
        },
        { onConflict: "endpoint" }
      );
      if (upsertSubscriptionError) throw upsertSubscriptionError;

      const mergedPreferences = {
        ...state.preferences,
        push_enabled: true,
      };

      const { error: upsertPrefError } = await supabase
        .from("push_notification_preferences")
        .upsert({
          user_id: userId,
          ...mergedPreferences,
        });
      if (upsertPrefError) throw upsertPrefError;

      setState((prev) => ({
        ...prev,
        saving: false,
        permission,
        isSubscribed: true,
        preferences: mergedPreferences,
        error: null,
      }));

      return true;
    } catch (err: any) {
      setState((prev) => ({
        ...prev,
        saving: false,
        error: err?.message || "Kunde inte aktivera notiser",
      }));
      return false;
    }
  }, [setError, state.preferences, state.supported]);

  const unsubscribe = useCallback(async () => {
    if (!state.supported) return false;

    stateVersionRef.current += 1;
    setState((prev) => ({ ...prev, saving: true }));
    try {
      const userId = await getCurrentUserId();
      if (!userId) throw new Error("Du måste vara inloggad.");

      await ensureServiceWorkerRegistration();
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        await subscription.unsubscribe();
        await supabase
          .from("push_subscriptions")
          .delete()
          .eq("user_id", userId)
          .eq("endpoint", subscription.endpoint);
      }

      const nextPreferences = {
        ...state.preferences,
        push_enabled: false,
      };

      await supabase
        .from("push_notification_preferences")
        .upsert({ user_id: userId, ...nextPreferences });

      setState((prev) => ({
        ...prev,
        saving: false,
        isSubscribed: false,
        preferences: nextPreferences,
        error: null,
      }));

      return true;
    } catch (err: any) {
      setState((prev) => ({
        ...prev,
        saving: false,
        error: err?.message || "Kunde inte stänga av notiser",
      }));
      return false;
    }
  }, [state.preferences, state.supported]);

  

  const updatePreferences = useCallback(async (patch: Partial<PushPreferences>) => {
    stateVersionRef.current += 1;
    setState((prev) => ({ ...prev, saving: true }));
    try {
      const userId = await getCurrentUserId();
      if (!userId) throw new Error("Du måste vara inloggad.");

      const nextPreferences = {
        ...state.preferences,
        ...patch,
      };

      const { error } = await supabase
        .from("push_notification_preferences")
        .upsert({ user_id: userId, ...nextPreferences });

      if (error) throw error;

      setState((prev) => ({
        ...prev,
        saving: false,
        preferences: nextPreferences,
        error: null,
      }));

      return true;
    } catch (err: any) {
      setState((prev) => ({
        ...prev,
        saving: false,
        error: err?.message || "Kunde inte spara notisinställningar",
      }));
      return false;
    }
  }, [state.preferences]);

  const canShowPermissionPrompt = useMemo(() => {
    return state.supported && state.permission === "default";
  }, [state.permission, state.supported]);

  return {
    ...state,
    hasVapidPublicKey,
    canShowPermissionPrompt,
    subscribe,
    unsubscribe,
    updatePreferences,
    refresh: syncSubscriptionState,
  };
}
