import { type TruckCapacity, truckCapacities } from '../data/items';
import { Bus, BusFront, Car, Truck } from 'lucide-react';

interface TruckMeterProps {
  totalVolume: number;
  selectedTruckIndex: number;
  onTruckChange: (index: number) => void;
}

export function TruckMeter({ totalVolume, selectedTruckIndex, onTruckChange }: TruckMeterProps) {
  const truck = truckCapacities[selectedTruckIndex];
  const fillPercentage = Math.min((totalVolume / truck.volume) * 100, 100);
  const displayFillPercentage = fillPercentage === 0 ? 0 : Math.max(fillPercentage, 1);
  const isOverCapacity = totalVolume > truck.volume;
  const isNearCapacity = fillPercentage >= 80 && !isOverCapacity;

  const getVehicleIcon = (vehicle: TruckCapacity) => {
    // Use safe, known-to-exist lucide icons.
    switch (vehicle.icon) {
      case 'car':
        return Car;
      case 'busFront':
        return BusFront;
      case 'bus':
        return Bus;
      case 'truck':
      default:
        return Truck;
    }
  };

  const getFillColor = () => {
    if (isOverCapacity) return 'bg-destructive';
    if (isNearCapacity) return 'bg-amber-500';
    return 'bg-trust-blue';
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Truck className="w-5 h-5 text-primary" />
          <span className="font-medium">Fordonstyp</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {truckCapacities.map((t, index) => (
          <button
            key={t.name}
            onClick={() => onTruckChange(index)}
            className={`p-3 rounded-lg text-left transition-all duration-200 ${
              selectedTruckIndex === index
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary hover:bg-secondary/80'
            }`}
          >
            <div className="text-sm font-medium">{t.name}</div>
            <div className={`text-xs ${
              selectedTruckIndex === index ? 'text-primary-foreground/80' : 'text-muted-foreground'
            }`}>
              {t.volume} m³
            </div>

            {/* Visual model indicator (replaces brand/description text) */}
            {(() => {
              const VehicleIcon = getVehicleIcon(t);
              const imageSrc = t.imageSrc;

              return (
                <div className="mt-2 flex items-center justify-start">
                  <span
                    className={`inline-flex h-12 w-14 items-center justify-center rounded-xl border ${
                      selectedTruckIndex === index
                        ? 'border-primary-foreground/20 bg-primary-foreground/10'
                        : 'border-border bg-background/40'
                    }`}
                    aria-label={`Fordonsmodell: ${t.name}`}
                  >
                    {imageSrc ? (
                      <img
                        src={imageSrc}
                        alt={t.name}
                        className="h-10 w-12 object-contain"
                        loading="lazy"
                      />
                    ) : (
                      <VehicleIcon className="h-7 w-7" aria-hidden="true" />
                    )}
                  </span>
                </div>
              );
            })()}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Fyllnadsgrad</span>
          <span className={`font-medium ${isOverCapacity ? 'text-destructive' : ''}`}>
            {fillPercentage.toFixed(0)}%
          </span>
        </div>

        <div className="space-y-1">
          <div className="relative h-3 w-full rounded-full bg-secondary overflow-hidden border border-border">
            {/* Tick marks */}
            <div className="absolute inset-0 flex justify-between px-[1px] pointer-events-none">
              {[0, 25, 50, 75, 100].map((tick) => (
                <div key={tick} className="w-px h-full bg-border/70" />
              ))}
            </div>

            {/* Fill */}
            <div
              className={`h-full ${getFillColor()} transition-[width] duration-300`}
              style={{ width: `${Math.min(displayFillPercentage, 100)}%` }}
              aria-label="Fyllnadsgrad"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Number(fillPercentage.toFixed(0))}
              role="progressbar"
            />
          </div>

          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>0%</span>
            <span>50%</span>
            <span>100%</span>
          </div>
        </div>

        {isOverCapacity && (
          <p className="text-xs text-destructive font-medium">
            ⚠️ Överstiger kapacitet med {(totalVolume - truck.volume).toFixed(1)} m³
          </p>
        )}
      </div>
    </div>
  );
}
