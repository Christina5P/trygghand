import { MovingItem } from '../data/items';
import { Minus, Plus, Ruler } from 'lucide-react';
import { useState } from 'react';
import { DimensionsEditor } from './DimensionsEditor';

interface ItemCardProps {
  item: MovingItem;
  quantity: number;
  customDimensions?: { length: number; width: number; height: number };
  customWeightKg?: number;
  onQuantityChange: (quantity: number) => void;
  onDimensionsChange?: (dimensions: { length: number; width: number; height: number }) => void;
  onWeightChange?: (weightKg: number) => void;
}

export function ItemCard({ 
  item, 
  quantity, 
  customDimensions,
  customWeightKg,
  onQuantityChange,
  onDimensionsChange,
  onWeightChange
}: ItemCardProps) {
  const [showDimensions, setShowDimensions] = useState(false);
  const isSelected = quantity > 0;
  
  const currentDimensions = customDimensions || item.dimensions;
  const currentWeightKg = customWeightKg ?? item.weightKg;
  const displayVolume = currentDimensions 
    ? (currentDimensions.length * currentDimensions.width * currentDimensions.height) / 1000000
    : item.volume;

  return (
    <>
      <div
        className={`item-card ${isSelected ? 'item-card-selected' : ''}`}
        onClick={() => quantity === 0 && onQuantityChange(1)}
      >
        <div className="flex flex-col items-center gap-2">
          {item.imageSrc ? (
            <span
              className="inline-flex h-24 w-24 items-center justify-center rounded-xl border border-border bg-background/40"
              aria-label={item.name}
            >
              <img
                src={item.imageSrc}
                alt={item.name}
                className="h-22 w-22 object-contain"
                loading="lazy"
              />
            </span>
          ) : (
            <span className="text-3xl" role="img" aria-label={item.name}>
              {item.icon ?? '📦'}
            </span>
          )}
          <h3 className="text-sm font-medium text-center leading-tight">
            {item.name}
          </h3>
          <p className="text-xs text-muted-foreground">
            {displayVolume.toFixed(2)} m³
          </p>
          <p className="text-sm font-semibold !text-orange-800 dark:!text-orange-300">
            {currentWeightKg.toFixed(0)} kg
          </p>
          {item.dimensions && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowDimensions(true);
              }}
              className="text-xs text-primary hover:text-primary/80 flex items-center gap-1 transition-colors"
            >
              <Ruler className="w-3 h-3" />
              {currentDimensions ? `${currentDimensions.length}×${currentDimensions.width}×${currentDimensions.height} • ${currentWeightKg.toFixed(0)} kg` : 'Mått & vikt'}
            </button>
          )}
        </div>

        {isSelected && (
          <div 
            className="flex items-center justify-center gap-2 mt-3 pt-3 border-t border-border"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="quantity-btn"
              onClick={() => onQuantityChange(Math.max(0, quantity - 1))}
              aria-label="Minska antal"
            >
              <Minus className="w-4 h-4" />
            </button>
            <span className="w-8 text-center font-semibold text-lg">
              {quantity}
            </span>
            <button
              className="quantity-btn"
              onClick={() => onQuantityChange(quantity + 1)}
              aria-label="Öka antal"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {showDimensions && item.dimensions && (
        <DimensionsEditor
          item={item}
          currentDimensions={currentDimensions!}
          currentWeightKg={currentWeightKg}
          onSave={({ dimensions, weightKg }) => {
            onDimensionsChange?.(dimensions);
            onWeightChange?.(weightKg);
            setShowDimensions(false);
          }}
          onClose={() => setShowDimensions(false)}
        />
      )}
    </>
  );
}
