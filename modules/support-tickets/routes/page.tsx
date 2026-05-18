import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { listAllTickets } from "../queries";

const priorityVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  low: "outline",
  medium: "secondary",
  high: "default",
  urgent: "destructive",
};

export default async function SupportTicketsPage() {
  const all = await listAllTickets();
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Support tickets</h1>
        <Button asChild><Link href="/support-tickets/new">New ticket</Link></Button>
      </div>
      {all.length === 0 ? (
        <p className="text-muted-foreground">No tickets yet.</p>
      ) : (
        <ul className="space-y-2">
          {all.map((t) => (
            <li key={t.id}>
              <Link href={`/support-tickets/${t.id}`} className="block p-4 border rounded-md hover:bg-secondary">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{t.subject}</span>
                  <Badge variant={priorityVariant[t.priority]}>{t.priority}</Badge>
                </div>
                <div className="text-sm text-muted-foreground">{t.status}</div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
