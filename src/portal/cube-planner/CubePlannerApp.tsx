import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { ArrowLeft, Truck } from "lucide-react";

import { movingItems } from "./data/items";
import { ItemCard } from "./components/ItemCard";
import { CategoryTabs } from "./components/CategoryTabs";
import { Summary } from "./components/Summary";

export default function CubePlannerApp() {
  const { user, customer, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  interface SelectedItemData {
    quantity: number;
    customDimensions?: { length: number; width: number; height: number };
    customWeightKg?: number;
  }

  const [selectedItems, setSelectedItems] = useState<Map<string, SelectedItemData>>(new Map());
  const [activeCategory, setActiveCategory] = useState("all");
  const [selectedTruckIndex, setSelectedTruckIndex] = useState(1);

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

  if (loading) return null;

  // Determine back link for customer/admin
  const isAdminPath = location.pathname.startsWith("/portal/admin");
  const isAdmin = !!customer?.is_admin || isAdminPath;
  const backLink = isAdmin ? "/adminportal" : "/portal";

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
            />
          </div>
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
