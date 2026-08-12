import { supabase } from "@/lib/supabase";

export type CubePlanItem = {
  item_id: string;
  name: string;
  quantity: number;
  volume_m3: number;
  weight_kg: number;
  dimensions_cm?: { length: number; width: number; height: number };
};

export type CubePlanPayload = {
  items: CubePlanItem[];
  total_volume_m3: number;
  total_weight_kg: number;
  total_items: number;
  truck_name: string;
  truck_capacity_m3: number;
};

export type CubePlan = CubePlanPayload & {
  id: string;
  customer_id: string;
  created_at: string;
  customer?: { name: string | null; email: string | null } | null;
};

export async function saveCubePlan(plan: CubePlanPayload) {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) throw authError;
  if (!user) throw new Error("Du måste vara inloggad för att spara flyttplanen.");

  const { data, error } = await supabase
    .from("cube_plans")
    .insert({ ...plan, customer_id: user.id })
    .select("id, created_at")
    .single();

  if (error) throw error;
  return data;
}

export async function getMyCubePlans() {
  const { data, error } = await supabase
    .from("cube_plans")
    .select("id, customer_id, items, total_volume_m3, total_weight_kg, total_items, truck_name, truck_capacity_m3, created_at")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as CubePlan[];
}

export async function getCubePlansForAdmin() {
  const { data, error } = await supabase
    .from("cube_plans")
    .select("id, customer_id, items, total_volume_m3, total_weight_kg, total_items, truck_name, truck_capacity_m3, created_at, customer:customers(name, email)")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as CubePlan[];
}