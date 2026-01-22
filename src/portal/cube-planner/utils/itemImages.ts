import type { MovingItem } from '../data/items';

export function defaultItemImageSrc(itemId: string): string {
  // Convention: put generated item images in public/images/items/<id>.png
  return `/images/items/${itemId}.png`;
}

export function getItemImageSrc(item: Pick<MovingItem, 'id' | 'imageSrc'>): string {
  // Enabled by default; set VITE_ITEM_IMAGES=0 to disable auto lookup.
  const autoEnabled = import.meta.env.VITE_ITEM_IMAGES !== '0';
  if (item.imageSrc) return item.imageSrc;
  return autoEnabled ? defaultItemImageSrc(item.id) : '';
}
