"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createSubscription } from "../../actions";
import { getContactsForSubscription } from "../../loaders";

export default function NewSubscriptionPage() {
  const router = useRouter();
  const [contacts, setContacts] = useState<any[] | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);
  useEffect(() => { getContactsForSubscription().then(setContacts); }, []);
  if (!contacts) return <p>Loading...</p>;
  async function onSubmit(formData: FormData) {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    try {
      const s = await createSubscription({
        contactId: formData.get("contactId") as string,
        planName: formData.get("planName") as string,
        status: (formData.get("status") as any) || "active",
        monthlyValueCents: Math.round(parseFloat(formData.get("monthlyValue") as string || "0") * 100),
        notes: (formData.get("notes") as string) || undefined,
      });
      router.push(`/subscriptions/${s.id}`);
    } finally { submittingRef.current = false; setSubmitting(false); }
  }
  return (
    <div className="max-w-xl space-y-6">
      <h1 className="text-3xl font-bold">New subscription</h1>
      <form action={onSubmit} className="space-y-4">
        <div><Label htmlFor="planName">Plan name *</Label><Input id="planName" name="planName" placeholder="Pro / Team / Enterprise" required /></div>
        <div>
          <Label htmlFor="contactId">Contact *</Label>
          <select id="contactId" name="contactId" required className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
            <option value="">— select —</option>
            {contacts.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <Label htmlFor="status">Status</Label>
          <select id="status" name="status" defaultValue="active" className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
            <option value="active">Active</option>
            <option value="past_due">Past due</option>
            <option value="canceled">Canceled</option>
            <option value="expired">Expired</option>
          </select>
        </div>
        <div><Label htmlFor="monthlyValue">Monthly value (USD)</Label><Input id="monthlyValue" name="monthlyValue" type="number" step="0.01" /></div>
        <div><Label htmlFor="notes">Notes</Label><Textarea id="notes" name="notes" /></div>
        <Button type="submit" disabled={submitting}>{submitting ? "Creating..." : "Create subscription"}</Button>
      </form>
    </div>
  );
}
