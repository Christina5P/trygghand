import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CommentBubble } from "./CommentBubble";
import type { ReactNode } from "react";

export function ConversationCard({
  title,
  subtitle,
  unread,
  readStatusLabel,
  commentCount,
  statusSlot,
  actionsSlot,
  onClick,
}: {
  title: string;
  subtitle: string;
  unread: boolean;
  readStatusLabel?: string;
  commentCount: number;
  statusSlot?: ReactNode;
  actionsSlot?: ReactNode;
  onClick: () => void;
}) {
  const label = readStatusLabel ?? (unread ? "Oläst" : "Läst");

  return (
    <Card
      className="relative hover:shadow-lg transition-shadow cursor-pointer"
      onClick={onClick}
    >
      <CardHeader className="relative pb-3">
        <CardTitle className="text-base truncate pr-2">{title}</CardTitle>
        <CardDescription className="truncate">{subtitle}</CardDescription>
        <div className="mt-2">
          <span
            className={`inline-flex items-center rounded border px-2 py-0.5 text-[11px] font-medium ${
              unread ? "border-amber-400 text-amber-700" : "border-emerald-400 text-emerald-700"
            }`}
          >
            {label}
          </span>
        </div>
        {(statusSlot || actionsSlot) && (
          <div
            className="mt-2 flex flex-wrap gap-2 sm:absolute sm:top-2 sm:right-2 sm:mt-0"
            onClick={(e) => e.stopPropagation()}
          >
            {statusSlot}
            {actionsSlot}
          </div>
        )}
        <CommentBubble
          className={`absolute bottom-2 right-2 transition-all ${unread ? "ring-2 ring-blue-400 scale-110" : ""}`}
          count={commentCount}
          highlight={unread}
        />
      </CardHeader>
    </Card>
  );
}
