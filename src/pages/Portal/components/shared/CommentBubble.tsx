import { MessageCircle } from "lucide-react";

export function CommentBubble({
  count,
  highlight = false,
  className = "",
  ariaLabel = "Antal kommentarer",
}: {
  count: number;
  highlight?: boolean;
  className?: string;
  ariaLabel?: string;
}) {
  return (
    <div
      className={`flex items-center gap-1 text-sm ${highlight ? "bg-orange-200 text-orange-900 px-2 py-0.5 rounded-full font-bold animate-pulse" : "text-gray-500"} ${className}`.trim()}
      aria-label={ariaLabel}
    >
      <MessageCircle className="h-4 w-4" />
      <span>{count}</span>
    </div>
  );
}
