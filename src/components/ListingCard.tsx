import { Link } from "react-router-dom";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import type { HandplockatListing } from "@/types";
import { formatSek } from "@/lib/handplockat";

interface ListingCardProps {
  listing: HandplockatListing;
  eager?: boolean;
}

const ListingCard = ({ listing, eager = false }: ListingCardProps) => {
  const [loaded, setLoaded] = useState(false);

  const imageSrc = listing.image_cutout || listing.images_cutout?.[0] || "";
  const priceLabel = formatSek(listing.price_sek);
  const brandLabel = listing.brand?.trim() || listing.description?.match(/Märke:\s*(.+)/i)?.[1]?.trim() || null;

  return (
    <Link
      to={`/handplockat/annons/${listing.id}`}
      className="group block bg-card rounded-xl border border-border overflow-hidden hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
    >
      {/* IMAGE */}
      <div className="aspect-square overflow-hidden bg-muted relative">
        {imageSrc ? (
          <>
            <img
              src={imageSrc}
              alt={listing.title}
              loading={eager ? "eager" : "lazy"}
              fetchPriority={eager ? "high" : "auto"}
              decoding="async"
              width={600}
              height={600}
              onLoad={() => setLoaded(true)}
              className={`w-full h-full object-contain transition duration-500 ${
                loaded ? "opacity-100" : "opacity-0"
              } group-hover:scale-105`}
            />
            {!loaded && (
              <div className="absolute inset-0 bg-gray-200 animate-pulse" />
            )}
          </>
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">
            Ingen bild
          </div>
        )}
      </div>

      {/* CONTENT */}
      <div className="p-4 space-y-2">
        <h3 className="font-semibold text-foreground text-sm leading-snug line-clamp-2 group-hover:text-primary transition-colors">
          {listing.title}
        </h3>

        <div className="flex items-center justify-between">
          <span className="text-lg font-bold text-primary">{priceLabel}</span>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {listing.skick && (
            <Badge variant="secondary" className="text-xs font-normal">
              {listing.skick}
            </Badge>
          )}
          {listing.clothingtype && (
            <Badge variant="secondary" className="text-xs font-normal">
              {listing.clothingtype}
            </Badge>
          )}
          {brandLabel && (
            <Badge variant="secondary" className="text-xs font-normal">
              {brandLabel}
            </Badge>
          )}
          {listing.category && (
            <Badge variant="outline" className="text-xs font-normal">
              {listing.category}
            </Badge>
          )}
        </div>
      </div>
    </Link>
  );
};

export default ListingCard;