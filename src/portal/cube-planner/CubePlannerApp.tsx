import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, ChevronDown, Truck } from "lucide-react";

import { movingItems, truckCapacities } from "./data/items";
import { ItemCard } from "./components/ItemCard";
import { CategoryTabs } from "./components/CategoryTabs";
import { Summary } from "./components/Summary";
import { getCubePlansForAdmin, getMyCubePlans, saveCubePlan, type CubePlan, type CubePlanPayload } from "@/lib/cubePlans";

interface SelectedItemData {
  quantity: number;
  customDimensions?: { length: number; width: number; height: number };
  customWeightKg?: number;
}

export default function CubePlannerApp() {
  const { user, loading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [selectedItems, setSelectedItems] = useState<Map<string, SelectedItemData>>(new Map());
  const [activeCategory, setActiveCategory] = useState("all");
  const [selectedTruckIndex, setSelectedTruckIndex] = useState(1);
  const [savedPlans, setSavedPlans] = useState<CubePlan[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(false);
  const [savingPlan, setSavingPlan] = useState(false);
  const [expandedPlanId, setExpandedPlanId] = useState<string | null>(null);
  const isAdminView = location.pathname.startsWith("/portal/admin/");

  const filteredItems = useMemo(() => {
    if (activeCategory === "all") return movingItems;
    return movingItems.filter((item) => item.category === activeCategory);
  }, [activeCategory]);

  // Only redirect if not logged in
  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate("/portal", { replace: true });
      return;
    }
  }, [user, loading, navigate]);

  const loadSavedPlans = async () => {
    if (!user) return;
    setLoadingPlans(true);
    try {
      setSavedPlans(isAdminView ? await getCubePlansForAdmin() : await getMyCubePlans());
    } catch (error) {
      console.error("Could not load saved cube plans", error);
      toast({
        title: "Kunde inte hämta sparade planer",
        description: "Försök igen om en stund.",
        variant: "destructive",
      });
    } finally {
      setLoadingPlans(false);
    }
  };

  useEffect(() => {
    void loadSavedPlans();
  }, [user?.id, isAdminView]);

  const createPlanPayload = (): CubePlanPayload | null => {
    const items = Array.from(selectedItems.entries()).flatMap(([itemId, selection]) => {
      const item = movingItems.find((candidate) => candidate.id === itemId);
      if (!item || selection.quantity <= 0) return [];

      const dimensions = selection.customDimensions ?? item.dimensions;
      const volumeM3 = dimensions
        ? (dimensions.length * dimensions.width * dimensions.height) / 1000000
        : item.volume;
      const weightKg = selection.customWeightKg ?? item.weightKg;

      return [{
        item_id: item.id,
        name: item.name,
        quantity: selection.quantity,
        volume_m3: volumeM3,
        weight_kg: weightKg,
        ...(selection.customDimensions ? { dimensions_cm: selection.customDimensions } : {}),
      }];
    });

    if (items.length === 0) return null;

    const truck = truckCapacities[selectedTruckIndex];
    return {
      items,
      total_volume_m3: items.reduce((total, item) => total + item.volume_m3 * item.quantity, 0),
      total_weight_kg: items.reduce((total, item) => total + item.weight_kg * item.quantity, 0),
      total_items: items.reduce((total, item) => total + item.quantity, 0),
      truck_name: truck.name,
      truck_capacity_m3: truck.volume,
    };
  };

  const handleSavePlan = async () => {
    const plan = createPlanPayload();
    if (!plan) return;

    setSavingPlan(true);
    try {
      await saveCubePlan(plan);
      toast({
        title: "Flyttplanen är skickad",
        description: "Resultatet är sparat och tillgängligt för admin.",
      });
      await loadSavedPlans();
    } catch (error) {
      console.error("Could not save cube plan", error);
      toast({
        title: "Kunde inte spara flyttplanen",
        description: error instanceof Error ? error.message : "Försök igen om en stund.",
        variant: "destructive",
      });
    } finally {
      setSavingPlan(false);
    }
  };

  if (loading) return null;

  // Always return to customer portal to avoid admin login confusion.
  const backLink = "/portal";

  const savedPlansSection = (
    <section className={isAdminView ? "mb-6" : "mt-8 border-t pt-6"}>
      <h2 className="text-lg font-semibold text-foreground">
        {isAdminView ? "Inskickade flyttplaner" : "Mina sparade flyttplaner"}
      </h2>
      {loadingPlans ? (
        <p className="mt-3 text-sm text-muted-foreground">Hämtar planer...</p>
      ) : savedPlans.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">
          {isAdminView ? "Inga flyttplaner har skickats in ännu." : "Du har inte sparat någon flyttplan ännu."}
        </p>
      ) : (
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {savedPlans.map((plan) => (
            <article
              key={plan.id}
              className="overflow-hidden rounded-lg border border-amber-300 bg-amber-50 text-sm shadow-sm"
            >
              <button
                type="button"
                className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-amber-100/70"
                onClick={() => setExpandedPlanId((current) => current === plan.id ? null : plan.id)}
                aria-expanded={expandedPlanId === plan.id}
              >
                <span className="min-w-0">
                  <span className="block font-semibold text-amber-950">
                    {isAdminView ? plan.customer?.name || plan.customer?.email || "Okänd kund" : "Sparad flyttplan"}
                  </span>
                  <span className="mt-0.5 block text-xs text-amber-900/80">
                    {new Date(plan.created_at).toLocaleString("sv-SE", { dateStyle: "medium", timeStyle: "short" })}
                  </span>
                </span>
                <ChevronDown className={`h-5 w-5 shrink-0 text-amber-800 transition-transform ${expandedPlanId === plan.id ? "rotate-180" : ""}`} />
              </button>
              {expandedPlanId === plan.id && (
                <div className="border-t border-amber-200 px-4 py-3">
                  <dl className="grid grid-cols-3 gap-2">
                    <div><dt className="text-muted-foreground">Volym</dt><dd className="font-semibold">{Number(plan.total_volume_m3).toFixed(1)} m3</dd></div>
                    <div><dt className="text-muted-foreground">Vikt</dt><dd className="font-semibold">{Number(plan.total_weight_kg).toFixed(0)} kg</dd></div>
                    <div><dt className="text-muted-foreground">Föremål</dt><dd className="font-semibold">{plan.total_items}</dd></div>
                  </dl>
                  <p className="mt-3 text-muted-foreground">Fordon: {plan.truck_name} ({Number(plan.truck_capacity_m3).toFixed(0)} m3)</p>
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );

  return (
    <div className="cube-planner">
      <div className="min-h-[100svh] bg-background">
        <header className="bg-card border-b sticky top-0 z-10">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between gap-3">
              <Link
                to={backLink}
                className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="h-4 w-4" />
                Tillbaka
              </Link>

              <div className="flex items-center justify-center gap-3 flex-1">
                <div className="bg-primary rounded-xl p-2">
                  <Truck className="w-6 h-6 text-primary-foreground" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-foreground">Kubikräknare för flyttplanering</h1>
                  <p className="text-xs text-muted-foreground">Planera din flytt enkelt</p>
                </div>
              </div>

              <div className="w-[84px]" aria-hidden="true" />
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 py-6 pb-[calc(2rem+env(safe-area-inset-bottom))]">
          {isAdminView && savedPlansSection}

          <div className="lg:grid lg:grid-cols-[1fr_340px] lg:gap-8">
            <div className="space-y-6">
              <CategoryTabs activeCategory={activeCategory} onCategoryChange={setActiveCategory} />

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {filteredItems.map((item) => (
                  <ItemCard
                    key={item.id}
                    item={item}
                    quantity={selectedItems.get(item.id)?.quantity || 0}
                    customDimensions={selectedItems.get(item.id)?.customDimensions}
                    customWeightKg={selectedItems.get(item.id)?.customWeightKg}
                    onQuantityChange={(quantity) => {
                      setSelectedItems((prev) => {
                        const next = new Map(prev);
                        if (quantity === 0) {
                          next.delete(item.id);
                        } else {
                          const existing = next.get(item.id);
                          next.set(item.id, {
                            quantity,
                            customDimensions: existing?.customDimensions,
                            customWeightKg: existing?.customWeightKg,
                          });
                        }
                        return next;
                      });
                    }}
                    onDimensionsChange={(dimensions) => {
                      setSelectedItems((prev) => {
                        const next = new Map(prev);
                        const existing = next.get(item.id);
                        next.set(item.id, {
                          quantity: existing?.quantity || 1,
                          customDimensions: dimensions,
                          customWeightKg: existing?.customWeightKg,
                        });
                        return next;
                      });
                    }}
                    onWeightChange={(weightKg) => {
                      setSelectedItems((prev) => {
                        const next = new Map(prev);
                        const existing = next.get(item.id);
                        next.set(item.id, {
                          quantity: existing?.quantity || 1,
                          customDimensions: existing?.customDimensions,
                          customWeightKg: weightKg,
                        });
                        return next;
                      });
                    }}
                  />
                ))}
              </div>
            </div>

            <aside className="hidden lg:block">
              <Summary
                selectedItems={selectedItems}
                items={movingItems}
                selectedTruckIndex={selectedTruckIndex}
                onTruckChange={setSelectedTruckIndex}
                onClear={() => setSelectedItems(new Map())}
                onRemoveItem={(id) =>
                  setSelectedItems((prev) => {
                    const next = new Map(prev);
                    next.delete(id);
                    return next;
                  })
                }
                onSave={handleSavePlan}
                saving={savingPlan}
              />
            </aside>
          </div>

          <div className="lg:hidden mt-6">
            <Summary
              selectedItems={selectedItems}
              items={movingItems}
              selectedTruckIndex={selectedTruckIndex}
              onTruckChange={setSelectedTruckIndex}
              onClear={() => setSelectedItems(new Map())}
              onRemoveItem={(id) =>
                setSelectedItems((prev) => {
                  const next = new Map(prev);
                  next.delete(id);
                  return next;
                })
              }
              onSave={handleSavePlan}
              saving={savingPlan}
            />
          </div>

          {!isAdminView && savedPlansSection}
        </main>

        <footer className="bg-card border-t mt-12 py-6">
          <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
            <p>Volymerna är uppskattningar baserade på standardstorlekar.</p>
            <p className="mt-1">Faktisk volym kan variera beroende på specifika mått.</p>
          </div>
        </footer>
      </div>
    </div>
  );
}
