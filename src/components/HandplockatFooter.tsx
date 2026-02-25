import React from "react";
import HouseHandsLogo from "@/components/HouseHandsLogo";

export default function HandplockatFooter() {
  return (
    <footer className="w-full bg-white border-t border-border mt-12">
      <div className="max-w-5xl mx-auto px-4 py-6 flex items-center justify-between gap-2 md:gap-6">
        <div className="flex items-center gap-3">
          <HouseHandsLogo className="w-7 h-7 text-primary" />
          <span className="font-bold text-base tracking-tight">Handplockat Sundsvall</span>
        </div>
        <div className="flex-1 flex justify-center">
          <span className="inline-flex items-center gap-1 text-muted-foreground text-sm">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-recycle w-4 h-4"><path d="M7 19H4.815a1.83 1.83 0 0 1-1.57-.881 1.785 1.785 0 0 1-.004-1.784L7.196 9.5"></path><path d="M11 19h8.203a1.83 1.83 0 0 0 1.556-.89 1.784 1.784 0 0 0 0-1.775l-1.226-2.12"></path><path d="m14 16-3 3 3 3"></path><path d="M8.293 13.596 7.196 9.5 3.1 10.598"></path><path d="m9.344 5.811 1.093-1.892A1.83 1.83 0 0 1 11.985 3a1.784 1.784 0 0 1 1.546.888l3.943 6.843"></path><path d="m13.378 9.633 4.096 1.098 1.097-4.096"></path></svg>
            Cirkulära fynd från riktiga hem
          </span>
        </div>
        <div className="flex flex-col md:items-end text-xs text-muted-foreground gap-1 justify-end">
          <span>En del av Trygg Hand</span>
          <span>Betalning via Swish · Enkelt och tryggt köp</span>
        </div>
      </div>
    </footer>
  );
}
