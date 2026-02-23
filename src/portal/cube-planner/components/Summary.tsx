import { MovingItem } from '../data/items';
import { TruckMeter } from './TruckMeter';
import { Package, Trash2, X } from 'lucide-react';

interface SelectedItemData {
  quantity: number;
  customDimensions?: { length: number; width: number; height: number };
  customWeightKg?: number;
}

interface SummaryProps {
  selectedItems: Map<string, SelectedItemData>;
  items: MovingItem[];
  selectedTruckIndex: number;
  onTruckChange: (index: number) => void;
  onClear: () => void;
  onRemoveItem: (id: string) => void;
}

export function Summary({ 
  selectedItems, 
  items, 
  selectedTruckIndex, 
  onTruckChange,
  onClear,
  onRemoveItem
}: SummaryProps) {
  const totalVolume = Array.from(selectedItems.entries()).reduce((sum, [id, data]) => {
    const item = items.find(i => i.id === id);
    if (!item) return sum;
    
    const dimensions = data.customDimensions || item.dimensions;
    const itemVolume = dimensions 
      ? (dimensions.length * dimensions.width * dimensions.height) / 1000000
      : item.volume;
    
    return sum + itemVolume * data.quantity;
  }, 0);

  const totalItems = Array.from(selectedItems.values()).reduce((sum, data) => sum + data.quantity, 0);

  const totalWeightKg = Array.from(selectedItems.entries()).reduce((sum, [id, data]) => {
    const item = items.find(i => i.id === id);
    if (!item) return sum;

    const itemWeightKg = data.customWeightKg ?? item.weightKg;
    return sum + itemWeightKg * data.quantity;
  }, 0);

  const selectedList = Array.from(selectedItems.entries())
    .filter(([, data]) => data.quantity > 0)
    .map(([id, data]) => {
      const item = items.find(i => i.id === id);
      if (!item) return null;
      
      const dimensions = data.customDimensions || item.dimensions;
      const itemVolume = dimensions 
        ? (dimensions.length * dimensions.width * dimensions.height) / 1000000
        : item.volume;

      const itemWeightKg = data.customWeightKg ?? item.weightKg;
      
      return { ...item, quantity: data.quantity, calculatedVolume: itemVolume, calculatedWeightKg: itemWeightKg };
    })
    .filter(Boolean);

  return (
    <div className="summary-card space-y-6 lg:sticky lg:top-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Package className="w-5 h-5 text-primary" />
          Summering
        </h2>
        {totalItems > 0 && (
          <button
            onClick={onClear}
            className="text-sm text-muted-foreground hover:text-destructive transition-colors flex items-center gap-1"
          >
            <Trash2 className="w-4 h-4" />
            Rensa alla
          </button>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="bg-secondary rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-primary">
            {totalVolume.toFixed(1)}
          </div>
          <div className="text-sm text-muted-foreground">kubik (m³)</div>
        </div>
          <div className="bg-secondary rounded-xl p-4 text-center">
          <div className="text-2xl font-bold !text-orange-800 dark:!text-orange-300">
            {totalWeightKg.toFixed(0)}
          </div>
          <div className="text-sm font-medium !text-orange-800 dark:!text-orange-300">kg</div>
        </div>
        <div className="bg-secondary rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-foreground">
            {totalItems}
          </div>
          <div className="text-sm text-muted-foreground">föremål</div>
        </div>
      </div>

      <TruckMeter
        totalVolume={totalVolume}
        selectedTruckIndex={selectedTruckIndex}
        onTruckChange={onTruckChange}
      />

      {selectedList.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-muted-foreground">Valda föremål</h3>
          <div className="max-h-48 overflow-y-auto space-y-1 pr-2">
            {selectedList.map((item) => item && (
              <div 
                key={item.id} 
                className="flex justify-between items-center text-sm py-1.5 px-2 rounded-lg bg-secondary/50 group"
              >
                <span className="flex items-center gap-2">
                  {item.imageSrc ? (
                    <img
                      src={item.imageSrc}
                      alt={item.name}
                      className="h-8 w-8 object-contain"
                      loading="lazy"
                    />
                  ) : (
                    <span aria-hidden="true">{item.icon ?? '📦'}</span>
                  )}
                  <span>{item.name}</span>
                </span>
                <span className="flex items-center gap-2">
                  <span className="text-muted-foreground">
                    {item.quantity}× ({(item.calculatedVolume * item.quantity).toFixed(2)} m³,
                    <span className="font-semibold !text-orange-800 dark:!text-orange-300"> {(item.calculatedWeightKg * item.quantity).toFixed(0)} kg</span>)
                  </span>
                  <button
                    onClick={() => onRemoveItem(item.id)}
                    className="p-1 hover:bg-destructive/20 rounded transition-colors opacity-0 group-hover:opacity-100"
                    aria-label={`Ta bort ${item.name}`}
                  >
                    <X className="w-3 h-3 text-destructive" />
                  </button>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {totalItems === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <Package className="w-12 h-12 mx-auto mb-2 opacity-30" />
          <p className="text-sm">Klicka på föremål för att lägga till dem</p>
        </div>
      )}
    </div>
  );
}
