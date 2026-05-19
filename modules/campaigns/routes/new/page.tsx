"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createCampaign } from "../../actions";

export default function NewCampaignPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);

  async function onSubmit(formData: FormData) {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    try {
      const c = await createCampaign({
        name: formData.get("name") as string,
        type: (formData.get("type") as any) || "other",
        status: "active",
        budgetCents: Math.round(parseFloat(formData.get("budget") as string || "0") * 100),
        notes: (formData.get("notes") as string) || undefined,
      });
      router.push(`/campaigns/${c.id}`);
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-xl space-y-6">
      <h1 className="text-3xl font-bold">New campaign</h1>
      <form action={onSubmit} className="space-y-4">
        <div>
          <Label htmlFor="name">Name *</Label>
          <Input id="name" name="name" placeholder="e.g. Facebook Ad — May Launch" required />
        </div>
        <div>
          <Label htmlFor="type">Type</Label>
          <select id="type" name="type" defaultValue="other" className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
            <option value="paid_ad">Paid ad</option>
            <option value="referral">Referral</option>
            <option value="cold_email">Cold email</option>
            <option value="event">Event</option>
            <option value="content">Content</option>
            <option value="partnership">Partnership</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div>
          <Label htmlFor="budget">Budget (USD)</Label>
          <Input id="budget" name="budget" type="number" step="0.01" />
        </div>
        <div>
          <Label htmlFor="notes">Notes</Label>
          <Textarea id="notes" name="notes" />
        </div>
        <Button type="submit" disabled={submitting}>
          {submitting ? "Creating…" : "Create campaign"}
        </Button>
      </form>
    </div>
  );
}
