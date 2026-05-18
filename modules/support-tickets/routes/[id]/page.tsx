import { notFound } from "next/navigation";
import Link from "next/link";
import { eq, and } from "drizzle-orm";
import { db } from "@/lib/db";
import { contacts } from "@/lib/db/schema";
import { supportTickets } from "../../schema";
import { requireOrg } from "@/lib/clerk";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const priorityVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  low: "outline",
  medium: "secondary",
  high: "default",
  urgent: "destructive",
};

export default async function TicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const orgId = await requireOrg();
  const t = db.select().from(supportTickets).where(and(eq(supportTickets.id, id), eq(supportTickets.organizationId, orgId))).get();
  if (!t) notFound();
  const c = db.select().from(contacts).where(eq(contacts.id, t.contactId)).get();
  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold">{t.subject}</h1>
            <Badge variant={priorityVariant[t.priority]}>{t.priority}</Badge>
          </div>
          <p className="text-muted-foreground">{t.status}</p>
        </div>
        <Button asChild variant="outline"><Link href="/support-tickets">Back</Link></Button>
      </div>
      <Card>
        <CardHeader><h2 className="font-semibold">Description</h2></CardHeader>
        <CardContent><p className="whitespace-pre-wrap">{t.body}</p></CardContent>
      </Card>
      <Card>
        <CardHeader><h2 className="font-semibold">Contact</h2></CardHeader>
        <CardContent>{c ? <Link className="text-primary hover:underline" href={`/contacts/${c.id}`}>{c.name}</Link> : "—"}</CardContent>
      </Card>
      {t.slaDueAt && (
        <Card>
          <CardHeader><h2 className="font-semibold">SLA due</h2></CardHeader>
          <CardContent><p>{t.slaDueAt.toLocaleString()}</p></CardContent>
        </Card>
      )}
      {t.resolvedAt && (
        <Card>
          <CardHeader><h2 className="font-semibold">Resolved</h2></CardHeader>
          <CardContent><p>{t.resolvedAt.toLocaleString()}</p></CardContent>
        </Card>
      )}
    </div>
  );
}
