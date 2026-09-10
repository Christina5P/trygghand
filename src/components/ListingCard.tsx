import { Link } from "react-router-dom";
import { useState } from "react";
import type { HandplockatListing } from "@/types";
import { formatSek } from "@/lib/handplockat";
import { ArrowUpRight, MapPin } from "lucide-react";

interface ListingCardProps {
  listing: HandplockatListing;
  eager?: boolean;
  compact?: boolean;
}

const ListingCard = ({ listing, eager = false, compact = false }: ListingCardProps) => {
  const [loaded, setLoaded] = useState(false);

  const imageSrc = listing.image_cutout || listing.images_cutout?.[0] || "";
  const priceLabel = formatSek(listing.price_sek);
  const brandLabel = listing.brand?.trim() || listing.description?.match(/Märke:\s*(.+)/i)?.[1]?.trim() || null;

  return (
    <Link
      to={`/handplockat/annons/${listing.id}`}
      className="group block overflow-hidden rounded-2xl border border-[#e5e0d7] bg-white transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_18px_45px_-22px_rgba(38,53,47,0.5)]"
    >
      {/* IMAGE */}
      <div className={`relative overflow-hidden bg-[#f1eee8] ${compact ? "aspect-[5/4]" : "aspect-[4/3]"}`}>
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
              className={`h-full w-full object-contain transition duration-500 ${compact ? "p-3" : "p-4"} ${
                loaded ? "opacity-100" : "opacity-0"
              } group-hover:scale-105`}
            />
            {!loaded && (
              <div className="absolute inset-0 bg-gray-200 animate-pulse" />
            )}
          </>
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm text-[#6b746e]">
            Ingen bild
          </div>
        )}
      </div>

      {/* CONTENT */}
      <div className={`space-y-3 ${compact ? "p-4" : "p-5"}`}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#aa7945]">{listing.category || "Handplockat fynd"}</p>
            <h3 className={`font-nunito font-bold leading-tight text-[#26352f] transition-colors group-hover:text-[#8d6335] ${compact ? "text-lg" : "text-xl"}`}>{listing.title}</h3>
          </div>
          <ArrowUpRight className="mt-1 h-5 w-5 shrink-0 text-[#aa7945] transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-[#eeeae3] pt-3">
          <span className={`${compact ? "text-lg" : "text-xl"} font-semibold text-[#26352f]`}>{priceLabel}</span>
          <span className="inline-flex items-center gap-1 text-xs text-[#6b746e]"><MapPin className="h-3.5 w-3.5" /> {listing.pickup_area || "Sundsvall"}</span>
        </div>

        <p className={`line-clamp-2 text-sm leading-relaxed text-[#6b746e] ${compact ? "min-h-0" : "min-h-10"}`}>{listing.skick || brandLabel || "Utvalt föremål med mer att upptäcka."}</p>
        <span className="inline-flex items-center gap-1 text-sm font-semibold text-[#8d6335]">Se fyndet <ArrowUpRight className="h-4 w-4" /></span>
      </div>
    </Link>
  );
};

export default ListingCard;