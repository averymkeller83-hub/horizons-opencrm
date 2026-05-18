import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { contacts, interactions } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { requireOrg } from "@/lib/clerk";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent } from "@/components/ui/card";

export default async function ContactDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const orgId = await requireOrg();

  const contact = db.select().from(contacts)
    .where(and(eq(contacts.id, id), eq(contacts.organizationId, orgId)))
    .get();
  if (!contact) notFound();

  const log = db.select().from(interactions)
    .where(eq(interactions.contactId, contact.id))
    .orderBy(desc(interactions.occurredAt))
    .all();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{contact.name}</h1>
          {contact.email && <p className="text-muted-foreground">{contact.email}</p>}
        </div>
        <Button asChild>
          <Link href={`/contacts/${contact.id}/log-interaction`}>Log interaction</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <h2 className="text-xl font-semibold">Interactions ({log.length})</h2>
        </CardHeader>
        <CardContent className="space-y-3">
          {log.length === 0 ? (
            <p className="text-muted-foreground">No interactions yet.</p>
          ) : (
            log.map((i) => (
              <div key={i.id} className="border-l-2 pl-3">
                <div className="text-sm font-semibold capitalize">{i.type} — {i.occurredAt.toLocaleString()}</div>
                <div className="text-sm">{i.summary}</div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
