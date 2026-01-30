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
        {truckCapacities.map((t, index) => {
          const VehicleIcon = getVehicleIcon(t);
          const imageSrc = t.imageSrc;
          return (
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
            </button>
          );
        })}
      </div>

      <button
        className="mt-4 px-4 py-2 rounded bg-primary text-primary-foreground font-semibold"
        type="button"
      >
        kubikmätare- planering inför flytt
      </button>

      {isOverCapacity && (
        <p className="text-xs text-destructive font-medium mt-2">
          ⚠️ Överstiger kapacitet med {(totalVolume - truck.volume).toFixed(1)} m³
        </p>
      )}
    </div>
  );
}
