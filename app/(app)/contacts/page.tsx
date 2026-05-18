import Link from "next/link";
import { db } from "@/lib/db";
import { contacts } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { requireOrg } from "@/lib/clerk";
import { Button } from "@/components/ui/button";

export default async function ContactsPage() {
  const orgId = await requireOrg();
  const rows = db.select().from(contacts).where(eq(contacts.organizationId, orgId)).all();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Contacts</h1>
        <Button asChild>
          <Link href="/contacts/new">New contact</Link>
        </Button>
      </div>
      {rows.length === 0 ? (
        <p className="text-muted-foreground">No contacts yet. Create your first one.</p>
      ) : (
        <ul className="space-y-2">
          {rows.map((c) => (
            <li key={c.id}>
              <Link href={`/contacts/${c.id}`} className="block p-4 border rounded-md hover:bg-secondary">
                <div className="font-semibold">{c.name}</div>
                {c.email && <div className="text-sm text-muted-foreground">{c.email}</div>}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
