import { useRef } from "react";
import { Button } from "@/components/ui/button";

interface InstagramPostPreviewProps {
  title: string;
  price: string;
  category: string;
  condition: string;
  description: string;
  imageSrc?: string;
  onExport: (canvas: HTMLCanvasElement) => void;
  onShare?: (canvas: HTMLCanvasElement) => void;
}

/**
 * Instagram Post Preview Component
 * Renders a 1080x1350px Instagram-formatted listing preview
 * This is the visual template, export functionality handled by parent
 */
export default function InstagramPostPreview({
  title,
  price,
  category,
  condition,
  description,
  imageSrc,
  onExport,
  onShare,
}: InstagramPostPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const handleExport = async () => {
    if (!containerRef.current) return;

    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js";
    script.onload = async () => {
      const canvas = await (window as any).html2canvas(containerRef.current, {
        backgroundColor: "#ffffff",
        scale: 2,
        logging: false,
        useCORS: true,
        allowTaint: true,
      });
      onExport(canvas);
    };
    document.head.appendChild(script);
  };

  const handleShare = async () => {
    if (!containerRef.current || !onShare) return;

    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js";
    script.onload = async () => {
      const canvas = await (window as any).html2canvas(containerRef.current, {
        backgroundColor: "#ffffff",
        scale: 2,
        logging: false,
        useCORS: true,
        allowTaint: true,
      });
      onShare(canvas);
    };
    document.head.appendChild(script);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-center gap-2 text-sm">
        <span className="text-muted-foreground">Instagram Post Preview (1080x1350px)</span>
      </div>

      {/* Instagram Post Container */}
      <div
        ref={containerRef}
        style={{
          width: "1080px",
          height: "1350px",
          backgroundColor: "#ffffff",
        }}
        className="mx-auto bg-white border border-gray-200 overflow-hidden flex flex-col"
      >
        {/* Image Section */}
        <div className="relative flex-1 bg-gray-100 overflow-hidden">
          {imageSrc ? (
            <img
              src={imageSrc}
              alt={title}
              className="w-full h-full object-cover"
              style={{ minHeight: "520px" }}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-center p-12">
              <p className="text-gray-400 text-lg">Ingen bild vald</p>
            </div>
          )}
          <div className="absolute left-0 top-0 m-4 rounded-full bg-black/60 px-4 py-2 text-xs uppercase tracking-[0.18em] text-white">
            trygghand.com/handplockat
          </div>
        </div>

        {/* Info Section */}
        <div className="px-8 py-6 bg-white space-y-5 border-t border-gray-200">
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-blue-700">{condition || "Gott skick"}</span>
            <span className="inline-flex items-center rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-amber-700">{category || "Kök"}</span>
          </div>

          <div>
            <h3 className="text-4xl font-bold text-gray-900 leading-tight">{title}</h3>
          </div>

          <div className="text-lg font-black text-amber-600">{price} kr</div>

          <div className="text-sm text-gray-700 leading-6 line-clamp-3">{description}</div>

          <div className="pt-4 border-t border-gray-200">
            <p className="text-sm font-semibold text-gray-800">trygghand.com/handplockat</p>
          </div>
        </div>
      </div>

      {/* Export Button */}
      <div className="flex flex-col gap-3 items-center">
        <Button
          type="button"
          onClick={handleExport}
          variant="default"
          size="lg"
          className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
        >
          📸 Ladda ner för Instagram
        </Button>
        {onShare && (
          <Button
            type="button"
            onClick={handleShare}
            variant="outline"
            size="lg"
            className="w-full md:w-auto"
          >
            🚀 Dela till Instagram
          </Button>
        )}
      </div>
    </div>
  );
}
