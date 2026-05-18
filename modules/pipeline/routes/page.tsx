import Link from "next/link";
import { Button } from "@/components/ui/button";
import { KanbanBoard } from "../components/kanban-board";
import { getDealsGroupedByStage } from "../queries";

export default async function PipelinePage() {
  const groups = await getDealsGroupedByStage();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Pipeline</h1>
        <Button asChild>
          <Link href="/pipeline/new">New deal</Link>
        </Button>
      </div>
      {groups.length === 0 ? (
        <p className="text-muted-foreground">
          No stages yet. Create your first stage (e.g. &quot;Lead&quot;) to get started.
        </p>
      ) : (
        <KanbanBoard initialGroups={groups} />
      )}
    </div>
  );
}
