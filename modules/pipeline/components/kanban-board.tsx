"use client";

import { useState } from "react";
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { DealCard } from "./deal-card";
import { moveDealStage } from "../actions";
import type { Deal, PipelineStage } from "../schema";

type Props = {
  initialGroups: { stage: PipelineStage; deals: Deal[] }[];
};

export function KanbanBoard({ initialGroups }: Props) {
  const [groups, setGroups] = useState(initialGroups);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  async function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const overGroup = groups.find((g) =>
      g.stage.id === over.id || g.deals.some((d) => d.id === over.id)
    );
    if (!overGroup) return;

    const activeDeal = groups.flatMap((g) => g.deals).find((d) => d.id === active.id);
    if (!activeDeal || activeDeal.stageId === overGroup.stage.id) return;

    setGroups((prev) =>
      prev.map((g) => {
        if (g.stage.id === activeDeal.stageId) {
          return { ...g, deals: g.deals.filter((d) => d.id !== activeDeal.id) };
        }
        if (g.stage.id === overGroup.stage.id) {
          return { ...g, deals: [...g.deals, { ...activeDeal, stageId: overGroup.stage.id }] };
        }
        return g;
      })
    );

    await moveDealStage(activeDeal.id, overGroup.stage.id);
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={onDragEnd}>
      <div className="grid grid-flow-col auto-cols-[300px] gap-4 overflow-x-auto">
        {groups.map(({ stage, deals }) => (
          <div key={stage.id} className="bg-secondary/30 rounded-lg p-3 space-y-2 min-h-[300px]">
            <h3 className="font-semibold">{stage.name}</h3>
            <p className="text-xs text-muted-foreground">{deals.length} deal{deals.length === 1 ? "" : "s"}</p>
            <SortableContext items={deals.map((d) => d.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-2" data-stage-id={stage.id}>
                {deals.map((d) => <DealCard key={d.id} deal={d} />)}
              </div>
            </SortableContext>
          </div>
        ))}
      </div>
    </DndContext>
  );
}
