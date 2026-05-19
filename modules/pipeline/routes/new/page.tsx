"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createDeal } from "../../actions";
import { getContactsAndStages } from "../../loaders";

export default function NewDealPage() {
  const router = useRouter();
  const [opts, setOpts] = useState<{ contacts: any[]; stages: any[]; campaigns: any[] } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);

  useEffect(() => {
    getContactsAndStages().then(setOpts);
  }, []);

  if (!opts) return <p>Loading...</p>;

  async function onSubmit(formData: FormData) {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    try {
      const deal = await createDeal({
        contactId: formData.get("contactId") as string,
        stageId: formData.get("stageId") as string,
        title: formData.get("title") as string,
        valueCents: Math.round(parseFloat(formData.get("value") as string || "0") * 100),
        notes: (formData.get("notes") as string) || undefined,
        campaignId: (formData.get("campaignId") as string) || undefined,
      });
      router.push(`/pipeline/${deal.id}`);
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-xl space-y-6">
      <h1 className="text-3xl font-bold">New deal</h1>
      <form action={onSubmit} className="space-y-4">
        <div>
          <Label htmlFor="title">Title *</Label>
          <Input id="title" name="title" required />
        </div>
        <div>
          <Label htmlFor="contactId">Contact *</Label>
          <select id="contactId" name="contactId" required className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
            <option value="">— select contact —</option>
            {opts.contacts.map((c: any) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="stageId">Stage *</Label>
          <select id="stageId" name="stageId" required className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
            <option value="">— select stage —</option>
            {opts.stages.map((s: any) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="value">Value (USD)</Label>
          <Input id="value" name="value" type="number" step="0.01" />
        </div>
        <div>
          <Label htmlFor="campaignId">Campaign (optional)</Label>
          <select id="campaignId" name="campaignId" className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
            <option value="">— none —</option>
            {opts.campaigns.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <Label htmlFor="notes">Notes</Label>
          <Textarea id="notes" name="notes" />
        </div>
        <Button type="submit" disabled={submitting}>
          {submitting ? "Creating..." : "Create deal"}
        </Button>
      </form>
    </div>
  );
}
