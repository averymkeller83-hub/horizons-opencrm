import Link from "next/link";
import { Button } from "@/components/ui/button";
import { listJobs } from "../queries";

export default async function JobsPage() {
  const all = await listJobs();
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Jobs</h1>
        <Button asChild><Link href="/jobs/new">New job</Link></Button>
      </div>
      {all.length === 0 ? (
        <p className="text-muted-foreground">No jobs yet.</p>
      ) : (
        <ul className="space-y-2">
          {all.map((j) => (
            <li key={j.id}>
              <Link href={`/jobs/${j.id}`} className="block p-4 border rounded-md hover:bg-secondary">
                <div className="font-semibold">{j.title}</div>
                <div className="text-sm text-muted-foreground">
                  {j.status} {j.scheduledAt && `· ${j.scheduledAt.toLocaleDateString()}`} · ${(j.priceCents / 100).toFixed(2)}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
