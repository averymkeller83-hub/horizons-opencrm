import { notFound } from "next/navigation";
import Link from "next/link";
import { eq, and } from "drizzle-orm";
import { db } from "@/lib/db";
import { contacts } from "@/lib/db/schema";
import { jobs } from "../../schema";
import { campaigns } from "@/modules/campaigns/schema";
import { requireOrg } from "@/lib/clerk";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default async function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const orgId = await requireOrg();
  const j = db.select().from(jobs).where(and(eq(jobs.id, id), eq(jobs.organizationId, orgId))).get();
  if (!j) notFound();
  const c = db.select().from(contacts).where(eq(contacts.id, j.contactId)).get();
  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{j.title}</h1>
          <p className="text-muted-foreground">
            {j.status} · ${(j.priceCents / 100).toFixed(2)}
            {j.scheduledAt && ` · ${j.scheduledAt.toLocaleString()}`}
          </p>
        </div>
        <Button asChild variant="outline"><Link href="/jobs">Back</Link></Button>
      </div>
      <Card>
        <CardHeader><h2 className="font-semibold">Contact</h2></CardHeader>
        <CardContent>{c ? <Link className="text-primary hover:underline" href={`/contacts/${c.id}`}>{c.name}</Link> : "—"}</CardContent>
      </Card>
      {j.campaignId && (() => {
        const camp = db.select().from(campaigns).where(eq(campaigns.id, j.campaignId)).get();
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
      {j.notes && (
        <Card>
          <CardHeader><h2 className="font-semibold">Notes</h2></CardHeader>
          <CardContent><p className="whitespace-pre-wrap">{j.notes}</p></CardContent>
        </Card>
      )}
    </div>
  );
}
