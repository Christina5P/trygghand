import { MovingItem } from '../data/items';
import { X, RotateCcw } from 'lucide-react';
import { useState } from 'react';

interface DimensionsEditorProps {
  item: MovingItem;
  currentDimensions: { length: number; width: number; height: number };
  currentWeightKg: number;
  onSave: (payload: { dimensions: { length: number; width: number; height: number }; weightKg: number }) => void;
  onClose: () => void;
}

export function DimensionsEditor({ item, currentDimensions, currentWeightKg, onSave, onClose }: DimensionsEditorProps) {
  const [dimensions, setDimensions] = useState(currentDimensions);
  const [weightKg, setWeightKg] = useState(currentWeightKg);
  
  const volume = (dimensions.length * dimensions.width * dimensions.height) / 1000000;
  
  const handleReset = () => {
    if (item.dimensions) {
      setDimensions(item.dimensions);
    }
    setWeightKg(item.weightKg);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div 
        className="bg-card rounded-2xl p-6 max-w-sm w-full shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            {item.imageSrc ? (
              <span className="inline-flex h-14 w-14 items-center justify-center rounded-lg border border-border bg-background/40">
                <img
                  src={item.imageSrc}
                  alt={item.name}
                  className="h-12 w-12 object-contain"
                  loading="lazy"
                />
              </span>
            ) : (
              <span className="text-2xl" aria-hidden="true">{item.icon ?? '📦'}</span>
            )}
            <h3 className="font-semibold">{item.name}</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-secondary rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Längd (cm)</label>
              <input
                type="number"
                value={dimensions.length}
                onChange={(e) => setDimensions(prev => ({ ...prev, length: Math.max(1, parseInt(e.target.value) || 0) }))}
                className="w-full px-3 py-2 bg-secondary rounded-lg text-center font-medium focus:outline-none focus:ring-2 focus:ring-primary"
                min="1"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Bredd (cm)</label>
              <input
                type="number"
                value={dimensions.width}
                onChange={(e) => setDimensions(prev => ({ ...prev, width: Math.max(1, parseInt(e.target.value) || 0) }))}
                className="w-full px-3 py-2 bg-secondary rounded-lg text-center font-medium focus:outline-none focus:ring-2 focus:ring-primary"
                min="1"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Höjd (cm)</label>
              <input
                type="number"
                value={dimensions.height}
                onChange={(e) => setDimensions(prev => ({ ...prev, height: Math.max(1, parseInt(e.target.value) || 0) }))}
                className="w-full px-3 py-2 bg-secondary rounded-lg text-center font-medium focus:outline-none focus:ring-2 focus:ring-primary"
                min="1"
              />
            </div>
          </div>

          <div className="bg-secondary rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-primary">{volume.toFixed(3)} m³</div>
            <div className="text-xs text-muted-foreground">Beräknad volym</div>
          </div>

          <div>
            <label className="text-xs text-muted-foreground block mb-1">Vikt (kg)</label>
            <input
              type="number"
              value={weightKg}
              onChange={(e) => setWeightKg(Math.max(0, parseFloat(e.target.value) || 0))}
              className="w-full px-3 py-2 bg-secondary rounded-lg text-center font-medium focus:outline-none focus:ring-2 focus:ring-primary"
              min="0"
              step="0.5"
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleReset}
              className="flex-1 px-4 py-2 bg-secondary hover:bg-secondary/80 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              Återställ
            </button>
            <button
              onClick={() => onSave({ dimensions, weightKg })}
              className="flex-1 px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg font-medium transition-colors"
            >
              Spara
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
