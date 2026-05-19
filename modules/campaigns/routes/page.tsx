import Link from "next/link";
import { Button } from "@/components/ui/button";
import { listCampaigns } from "../queries";

export default async function CampaignsPage() {
  const all = await listCampaigns();
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Campaigns</h1>
        <Button asChild><Link href="/campaigns/new">New campaign</Link></Button>
      </div>
      {all.length === 0 ? (
        <p className="text-muted-foreground">No campaigns yet.</p>
      ) : (
        <ul className="space-y-2">
          {all.map((c) => (
            <li key={c.id}>
              <Link href={`/campaigns/${c.id}`} className="block p-4 border rounded-md hover:bg-secondary">
                <div className="font-semibold">{c.name}</div>
                <div className="text-sm text-muted-foreground">
                  {c.type.replace("_", " ")} · {c.status} · ${(c.budgetCents / 100).toFixed(2)}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
