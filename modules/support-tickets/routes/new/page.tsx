"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createTicket } from "../../actions";
import { getContactsForTicket } from "../../loaders";

export default function NewTicketPage() {
  const router = useRouter();
  const [contacts, setContacts] = useState<any[] | null>(null);
  const [submitting, setSubmitting] = useState(false);
  useEffect(() => { getContactsForTicket().then(setContacts); }, []);
  if (!contacts) return <p>Loading...</p>;
  async function onSubmit(formData: FormData) {
    setSubmitting(true);
    try {
      const t = await createTicket({
        contactId: formData.get("contactId") as string,
        subject: formData.get("subject") as string,
        body: formData.get("body") as string,
        priority: (formData.get("priority") as any) || "medium",
      });
      router.push(`/support-tickets/${t.id}`);
    } finally { setSubmitting(false); }
  }
  return (
    <div className="max-w-xl space-y-6">
      <h1 className="text-3xl font-bold">New ticket</h1>
      <form action={onSubmit} className="space-y-4">
        <div><Label htmlFor="subject">Subject *</Label><Input id="subject" name="subject" placeholder="Brief description of the issue" required /></div>
        <div>
          <Label htmlFor="contactId">Contact *</Label>
          <select id="contactId" name="contactId" required className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
            <option value="">— select —</option>
            {contacts.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <Label htmlFor="priority">Priority</Label>
          <select id="priority" name="priority" defaultValue="medium" className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
        </div>
        <div><Label htmlFor="body">Description *</Label><Textarea id="body" name="body" placeholder="Detailed description of the issue..." required /></div>
        <Button type="submit" disabled={submitting}>{submitting ? "Creating..." : "Create ticket"}</Button>
      </form>
    </div>
  );
}
