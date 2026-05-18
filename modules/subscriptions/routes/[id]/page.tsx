import { notFound } from "next/navigation";
import Link from "next/link";
import { eq, and } from "drizzle-orm";
import { db } from "@/lib/db";
import { contacts } from "@/lib/db/schema";
import { subscriptions } from "../../schema";
import { requireOrg } from "@/lib/clerk";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

function formatDollars(cents: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

export default async function SubscriptionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const orgId = await requireOrg();
  const s = db.select().from(subscriptions).where(and(eq(subscriptions.id, id), eq(subscriptions.organizationId, orgId))).get();
  if (!s) notFound();
  const c = db.select().from(contacts).where(eq(contacts.id, s.contactId)).get();
  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{s.planName}</h1>
          <p className="text-muted-foreground">
            {s.status} · {formatDollars(s.monthlyValueCents)}/mo
            {s.currentPeriodEnd && ` · renews ${s.currentPeriodEnd.toLocaleString()}`}
          </p>
        </div>
        <Button asChild variant="outline"><Link href="/subscriptions">Back</Link></Button>
      </div>
      <Card>
        <CardHeader><h2 className="font-semibold">Contact</h2></CardHeader>
        <CardContent>{c ? <Link className="text-primary hover:underline" href={`/contacts/${c.id}`}>{c.name}</Link> : "—"}</CardContent>
      </Card>
      {s.canceledAt && (
        <Card>
          <CardHeader><h2 className="font-semibold">Canceled</h2></CardHeader>
          <CardContent><p>{s.canceledAt.toLocaleString()}</p></CardContent>
        </Card>
      )}
      {s.notes && (
        <Card>
          <CardHeader><h2 className="font-semibold">Notes</h2></CardHeader>
          <CardContent><p className="whitespace-pre-wrap">{s.notes}</p></CardContent>
        </Card>
      )}
    </div>
  );
}
