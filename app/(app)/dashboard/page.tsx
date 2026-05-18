import { db } from "@/lib/db";
import { contacts, interactions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { requireOrg } from "@/lib/clerk";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export default async function DashboardPage() {
  const orgId = await requireOrg();

  const contactCount = db.select().from(contacts).where(eq(contacts.organizationId, orgId)).all().length;
  const interactionCount = db.select().from(interactions).where(eq(interactions.organizationId, orgId)).all().length;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle>Contacts</CardTitle></CardHeader>
          <CardContent><p className="text-4xl font-semibold">{contactCount}</p></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Interactions logged</CardTitle></CardHeader>
          <CardContent><p className="text-4xl font-semibold">{interactionCount}</p></CardContent>
        </Card>
      </div>
    </div>
  );
}
