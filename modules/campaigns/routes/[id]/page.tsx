import { notFound } from "next/navigation";
import Link from "next/link";
import { getCampaignWithLinkedCounts } from "../../queries";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

function formatDollars(cents: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

export default async function CampaignDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getCampaignWithLinkedCounts(id);
  if (!data) notFound();
  const { campaign, counts } = data;

  const total = counts.deals + counts.jobs + counts.orders + counts.subscriptions + counts.tickets;

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{campaign.name}</h1>
          <p className="text-muted-foreground">
            {campaign.type.replace("_", " ")} · {campaign.status} · {formatDollars(campaign.budgetCents)}
          </p>
        </div>
        <Button asChild variant="outline"><Link href="/campaigns">Back</Link></Button>
      </div>

      <Card>
        <CardHeader><h2 className="font-semibold">Linked entities ({total} total)</h2></CardHeader>
        <CardContent>
          {total === 0 ? (
            <p className="text-muted-foreground">No entities attached yet. Attach this campaign when creating deals, jobs, orders, subscriptions, or support tickets.</p>
          ) : (
            <ul className="space-y-1 text-sm">
              {counts.deals > 0 && <li>{counts.deals} {counts.deals === 1 ? "deal" : "deals"}</li>}
              {counts.jobs > 0 && <li>{counts.jobs} {counts.jobs === 1 ? "job" : "jobs"}</li>}
              {counts.orders > 0 && <li>{counts.orders} {counts.orders === 1 ? "order" : "orders"}</li>}
              {counts.subscriptions > 0 && <li>{counts.subscriptions} {counts.subscriptions === 1 ? "subscription" : "subscriptions"}</li>}
              {counts.tickets > 0 && <li>{counts.tickets} {counts.tickets === 1 ? "support ticket" : "support tickets"}</li>}
            </ul>
          )}
        </CardContent>
      </Card>

      {campaign.notes && (
        <Card>
          <CardHeader><h2 className="font-semibold">Notes</h2></CardHeader>
          <CardContent><p className="whitespace-pre-wrap">{campaign.notes}</p></CardContent>
        </Card>
      )}
    </div>
  );
}
