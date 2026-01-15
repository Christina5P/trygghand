import { MessageCircle } from "lucide-react";

export function CommentBubble({
  count,
  className = "",
  ariaLabel = "Antal kommentarer",
}: {
  count: number;
  className?: string;
  ariaLabel?: string;
}) {
  return (
    <div className={`flex items-center gap-1 text-sm text-gray-500 ${className}`.trim()} aria-label={ariaLabel}>
      <MessageCircle className="h-4 w-4" />
      <span>{count}</span>
    </div>
  );
}
