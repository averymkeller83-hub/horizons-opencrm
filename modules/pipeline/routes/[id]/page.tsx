import { notFound } from "next/navigation";
import Link from "next/link";
import { eq, and } from "drizzle-orm";
import { db } from "@/lib/db";
import { contacts } from "@/lib/db/schema";
import { deals, pipelineStages } from "../../schema";
import { campaigns } from "@/modules/campaigns/schema";
import { requireOrg } from "@/lib/clerk";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default async function DealDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const orgId = await requireOrg();

  const deal = db.select().from(deals)
    .where(and(eq(deals.id, id), eq(deals.organizationId, orgId)))
    .get();
  if (!deal) notFound();

  const contact = db.select().from(contacts).where(eq(contacts.id, deal.contactId)).get();
  const stage = db.select().from(pipelineStages).where(eq(pipelineStages.id, deal.stageId)).get();

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{deal.title}</h1>
          <p className="text-muted-foreground">${(deal.valueCents / 100).toFixed(2)} · {stage?.name}</p>
        </div>
        <Button asChild variant="outline">
          <Link href="/pipeline">Back to pipeline</Link>
        </Button>
      </div>

      <Card>
        <CardHeader><h2 className="font-semibold">Contact</h2></CardHeader>
        <CardContent>
          {contact ? (
            <Link href={`/contacts/${contact.id}`} className="text-primary hover:underline">
              {contact.name}
            </Link>
          ) : (
            <p className="text-muted-foreground">Contact deleted</p>
          )}
        </CardContent>
      </Card>

      {deal.campaignId && (() => {
        const camp = db.select().from(campaigns).where(eq(campaigns.id, deal.campaignId)).get();
        return camp ? (
          <Card>
            <CardHeader><h2 className="font-semibold">Campaign</h2></CardHeader>
            <CardContent>
              <Link className="text-primary hover:underline" href={`/campaigns/${camp.id}`}>
                {camp.name}
              </Link>
            </CardContent>
          </Card>
        ) : null;
      })()}

      {deal.notes && (
        <Card>
          <CardHeader><h2 className="font-semibold">Notes</h2></CardHeader>
          <CardContent><p className="whitespace-pre-wrap">{deal.notes}</p></CardContent>
        </Card>
      )}
    </div>
  );
}
