"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import type { Deal } from "../schema";

export function DealCard({ deal }: { deal: Deal }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: deal.id });

  return (
    <Card
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }}
      className="p-3 cursor-grab active:cursor-grabbing"
      {...attributes}
      {...listeners}
    >
      <Link href={`/pipeline/${deal.id}`} onClick={(e) => e.stopPropagation()}>
        <div className="font-medium text-sm">{deal.title}</div>
        <div className="text-xs text-muted-foreground">
          ${(deal.valueCents / 100).toFixed(2)}
        </div>
      </Link>
    </Card>
  );
}
