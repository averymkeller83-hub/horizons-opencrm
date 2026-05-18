import Link from "next/link";
import { Button } from "@/components/ui/button";
import { KanbanBoard } from "../components/kanban-board";
import { CreateStageForm } from "../components/create-stage-form";
import { getDealsGroupedByStage } from "../queries";

export default async function PipelinePage() {
  const groups = await getDealsGroupedByStage();
  const stageCount = groups.length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Pipeline</h1>
        {stageCount > 0 && (
          <Button asChild>
            <Link href="/pipeline/new">New deal</Link>
          </Button>
        )}
      </div>

      {stageCount === 0 ? (
        <CreateStageForm nextOrder={0} variant="empty-state" />
      ) : (
        <div className="space-y-4">
          <CreateStageForm nextOrder={stageCount} variant="compact" />
          <KanbanBoard initialGroups={groups} />
        </div>
      )}
    </div>
  );
}
