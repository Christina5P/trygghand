import { categories } from '../data/items';

interface CategoryTabsProps {
  activeCategory: string;
  onCategoryChange: (category: string) => void;
}

export function CategoryTabs({ activeCategory, onCategoryChange }: CategoryTabsProps) {
  return (
    <div className="flex flex-wrap gap-2 justify-center">
      {categories.map((category) => (
        <button
          key={category.id}
          onClick={() => onCategoryChange(category.id)}
          className={`inline-flex items-center px-3 py-2 rounded-full text-sm font-medium border-2 shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-primary/40 focus:ring-offset-2 focus:ring-offset-background ${
            activeCategory === category.id
              ? 'bg-primary text-primary-foreground border-primary shadow-md'
              : 'bg-background/70 text-foreground border-slate-300 hover:bg-background'
          }`}
        >
          <span className="mr-1.5">{category.icon}</span>
          {category.name}
        </button>
      ))}
    </div>
  );
}
