import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import type { HandplockatListing } from "@/types";
import { formatSek } from "@/lib/handplockat";

interface ListingCardProps {
  listing: HandplockatListing;
}

const ListingCard = ({ listing }: ListingCardProps) => {
  const imageSrc = listing.image_cutout || listing.images_cutout?.[0] || "";
  const priceLabel = formatSek(listing.price_sek);

  return (
    <Link
      to={`/handplockat/${listing.id}`}
      className="group block bg-card rounded-xl border border-border overflow-hidden hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
    >
      <div className="aspect-square overflow-hidden bg-muted">
        {imageSrc ? (
          <img
            src={imageSrc}
            alt={listing.title}
            className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">
            Ingen bild
          </div>
        )}
      </div>
      <div className="p-4 space-y-2">
        <h3 className="font-semibold text-foreground text-sm leading-snug line-clamp-2 group-hover:text-primary transition-colors">
          {listing.title}
        </h3>
        <div className="flex items-center justify-between">
          <span className="text-lg font-bold text-primary">
            {priceLabel}
          </span>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {listing.skick && (
            <Badge variant="secondary" className="text-xs font-normal">
              {listing.skick}
            </Badge>
          )}
        </div>
      </div>
    </Link>
  );
};

export default ListingCard;
