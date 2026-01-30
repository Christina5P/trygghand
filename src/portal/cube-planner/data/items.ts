export interface MovingItem {
  id: string;
  name: string;
  category: 'living-room' | 'bedroom' | 'kitchen' | 'bathroom' | 'office' | 'storage' | 'outdoor';
  volume: number; // in cubic meters
  weightKg: number;
  icon?: string;
  imageSrc?: string;
  dimensions?: {
    length: number; // in cm
    width: number;  // in cm
    height: number; // in cm
  };
}

export interface SelectedItem extends MovingItem {
  quantity: number;
  customDimensions?: {
    length: number;
    width: number;
    height: number;
  };
}

// Helper to calculate volume from dimensions (cm to m³)
export function calculateVolume(length: number, width: number, height: number): number {
  return (length * width * height) / 1000000;
}

export const movingItems: MovingItem[] = [
  // Vardagsrum
  { id: 'sofa-3', name: '3-sits soffa', category: 'living-room', volume: 1.5, weightKg: 70, icon: '🛋️', imageSrc: '/images/items/sofa-3.png', dimensions: { length: 220, width: 90, height: 75 } },
  { id: 'sofa-2', name: '2-sits soffa', category: 'living-room', volume: 1.0, weightKg: 55, icon: '🛋️', imageSrc: '/images/items/sofa-2.png', dimensions: { length: 160, width: 90, height: 75 } },
  { id: 'armchair', name: 'Fåtölj', category: 'living-room', volume: 0.5, weightKg: 20, icon: '🪑', imageSrc: '/images/items/armchair.png', dimensions: { length: 85, width: 80, height: 75 } },
  { id: 'coffee-table', name: 'Soffbord', category: 'living-room', volume: 0.3, weightKg: 15, icon: '☕', imageSrc: '/images/items/coffee-table.png', dimensions: { length: 120, width: 60, height: 45 } },
  { id: 'tv-stand', name: 'TV-bänk', category: 'living-room', volume: 0.4, weightKg: 25, icon: '📺', imageSrc: '/images/items/tv-stand.png', dimensions: { length: 150, width: 45, height: 55 } },
  { id: 'tv-large', name: 'Stor TV', category: 'living-room', volume: 0.3, weightKg: 25, icon: '📺', imageSrc: '/images/items/tv-large.png', dimensions: { length: 140, width: 10, height: 80 } },
  { id: 'tv-small', name: 'Liten TV', category: 'living-room', volume: 0.15, weightKg: 10, icon: '📺', imageSrc: '/images/items/tv-small.png', dimensions: { length: 80, width: 10, height: 50 } },
  { id: 'bookshelf', name: 'Bokhylla', category: 'living-room', volume: 0.6, weightKg: 30, icon: '📚', imageSrc: '/images/items/bookshelf.png', dimensions: { length: 80, width: 30, height: 200 } },
  { id: 'lamp-floor', name: 'Golvlampa', category: 'living-room', volume: 0.15, weightKg: 6, icon: '💡', imageSrc: '/images/items/lamp-floor.png', dimensions: { length: 40, width: 40, height: 170 } },
  { id: 'rug-large', name: 'Stor matta', category: 'living-room', volume: 0.15, weightKg: 8, icon: '🧶', imageSrc: '/images/items/rug-large.png', dimensions: { length: 300, width: 200, height: 2 } },
  { id: 'mirror-large', name: 'Stor spegel', category: 'living-room', volume: 0.2, weightKg: 12, icon: '🪞', imageSrc: '/images/items/mirror-large.png', dimensions: { length: 150, width: 5, height: 60 } },
  
  // Sovrum
  { id: 'bed-double', name: 'Dubbelsäng', category: 'bedroom', volume: 1.8, weightKg: 80, icon: '🛏️', imageSrc: '/images/items/bed-double.png', dimensions: { length: 200, width: 180, height: 50 } },
  { id: 'bed-single', name: 'Enkelsäng', category: 'bedroom', volume: 1.0, weightKg: 45, icon: '🛏️', imageSrc: '/images/items/bed-single.png', dimensions: { length: 200, width: 90, height: 50 } },
  { id: 'wardrobe-large', name: 'Stor garderob', category: 'bedroom', volume: 2.0, weightKg: 100, icon: '🚪', imageSrc: '/images/items/wardrobe-large.png', dimensions: { length: 200, width: 60, height: 220 } },
  { id: 'wardrobe-small', name: 'Liten garderob', category: 'bedroom', volume: 1.0, weightKg: 60, icon: '🚪', imageSrc: '/images/items/wardrobe-small.png', dimensions: { length: 100, width: 60, height: 200 } },
  { id: 'dresser', name: 'Byrå', category: 'bedroom', volume: 0.5, weightKg: 50, icon: '🗄️', imageSrc: '/images/items/dresser.png', dimensions: { length: 120, width: 50, height: 80 } },
  { id: 'nightstand', name: 'Sängbord', category: 'bedroom', volume: 0.1, weightKg: 15, icon: '🛏️', imageSrc: '/images/items/nightstand.png', dimensions: { length: 50, width: 40, height: 55 } },
  { id: 'lamp-table', name: 'Bordslampa', category: 'bedroom', volume: 0.03, weightKg: 3, icon: '💡', imageSrc: '/images/items/lamp-table.png', dimensions: { length: 30, width: 30, height: 50 } },
  
  // Kök
  { id: 'dining-table', name: 'Matbord', category: 'kitchen', volume: 0.8, weightKg: 50, imageSrc: '/images/items/dining-table.png', dimensions: { length: 160, width: 90, height: 75 } },
  { id: 'dining-chair', name: 'Matstol', category: 'kitchen', volume: 0.15, weightKg: 7, icon: '🪑', imageSrc: '/images/items/dining-chair.png', dimensions: { length: 45, width: 45, height: 90 } },
  { id: 'microwave', name: 'Mikrovågsugn', category: 'kitchen', volume: 0.05, weightKg: 15, icon: '📻', dimensions: { length: 50, width: 40, height: 30 } },
  
  // Badrum
  { id: 'bathroom-cabinet', name: 'Badrumsskåp', category: 'bathroom', volume: 0.15, weightKg: 20, icon: '🚿', imageSrc: '/images/items/bathroom-cabinet.png', dimensions: { length: 60, width: 30, height: 80 } },
  
  // Kontor
  { id: 'desk', name: 'Skrivbord', category: 'office', volume: 0.5, weightKg: 35, icon: '🖥️', imageSrc: '/images/items/desk.png', dimensions: { length: 140, width: 70, height: 75 } },
    { id: 'office-chair', name: 'Kontorsstol', category: 'office', volume: 0.3, weightKg: 18, imageSrc: '/images/items/office-chair.png', dimensions: { length: 65, width: 65, height: 120 } },
  
  // Förråd
  // Standardkartonger (volym beräknas även från måtten). Mellankartong ska vara 0,14 m³.
  { id: 'box-large', name: 'Stor kartong', category: 'storage', volume: 0.19, weightKg: 18, icon: '📦', imageSrc: '/images/items/box.png', dimensions: { length: 70, width: 50, height: 55 } },
  { id: 'box-medium', name: 'Mellan kartong', category: 'storage', volume: 0.14, weightKg: 12, icon: '📦', imageSrc: '/images/items/box.png', dimensions: { length: 60, width: 50, height: 47 } },
  { id: 'box-small', name: 'Liten kartong', category: 'storage', volume: 0.08, weightKg: 8, icon: '📦', imageSrc: '/images/items/box.png', dimensions: { length: 50, width: 40, height: 40 } },
  { id: 'suitcase', name: 'Resväska', category: 'storage', volume: 0.08, weightKg: 15, icon: '🧳', imageSrc: '/images/items/suitcase.png', dimensions: { length: 70, width: 45, height: 25 } },
  { id: 'vacuum', name: 'Dammsugare', category: 'storage', volume: 0.1, weightKg: 8, icon: '🧹', imageSrc: '/images/items/vacuum.png', dimensions: { length: 40, width: 30, height: 80 } },
  
  // Utomhus
  { id: 'bicycle', name: 'Cykel', category: 'outdoor', volume: 0.4, weightKg: 15, icon: '🚲', imageSrc: '/images/items/bicycle.png', dimensions: { length: 170, width: 60, height: 100 } },
  { id: 'plants-large', name: 'Stor krukväxt', category: 'outdoor', volume: 0.2, weightKg: 12, icon: '🌿', imageSrc: '/images/items/plants-large.png', dimensions: { length: 50, width: 50, height: 120 } },
  { id: 'plants-small', name: 'Liten krukväxt', category: 'outdoor', volume: 0.05, weightKg: 5, icon: '🪴', imageSrc: '/images/items/plants-small.png', dimensions: { length: 30, width: 30, height: 40 } },
  { id: 'bbq', name: 'Grill', category: 'outdoor', volume: 0.4, weightKg: 45, icon: '🍖', imageSrc: '/images/items/bbq.png', dimensions: { length: 120, width: 60, height: 110 } },
  { id: 'garden-furniture', name: 'Utemöbler (set)', category: 'outdoor', volume: 1.0, weightKg: 60, icon: '🌳', imageSrc: '/images/items/garden-furniture.png', dimensions: { length: 150, width: 90, height: 80 } },
  { id: 'garden-tools', name: 'Trädgårdsredskap', category: 'outdoor', volume: 0.15, weightKg: 12, icon: '🌱', imageSrc: '/images/items/garden-tools.png', dimensions: { length: 150, width: 30, height: 30 } },
];

export const categories = [
  { id: 'all', name: 'Alla', icon: '📋' },
  { id: 'living-room', name: 'Vardagsrum', icon: '🛋️' },
  { id: 'bedroom', name: 'Sovrum', icon: '🛏️' },
  { id: 'kitchen', name: 'Kök', icon: '🍽️' },
  { id: 'bathroom', name: 'Badrum', icon: '🚿' },
  { id: 'office', name: 'Kontor', icon: '🖥️' },
  { id: 'storage', name: 'Förråd', icon: '📦' },
  { id: 'outdoor', name: 'Utomhus', icon: '🌳' },
] as const;

export type TruckCapacity = {
  name: string;
  volume: number;
  description: string;
  icon: 'car' | 'busFront' | 'bus' | 'truck';
  imageSrc?: string;
};

export const truckCapacities: TruckCapacity[] = [
  {
    name: 'Liten skåpbil',
    volume: 8,
    description: 'VW Caddy / Berlingo',
    icon: 'car',
    imageSrc: '/images/liten_skapbil.png',
  },
  {
    name: 'Mellan skåpbil',
    volume: 12,
    description: 'VW Transporter / Ducato',
    icon: 'busFront',
    imageSrc: '/images/mellan_skapbil.png',
  },
  {
    name: 'Stor skåpbil',
    volume: 17,
    description: 'Mercedes Sprinter',
    icon: 'bus',
    imageSrc: '/images/stor_skapbil.png',
  },
];
