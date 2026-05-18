"use client";

import { useRouter } from "next/navigation";
import { useState, use } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { logInteraction } from "@/lib/actions/interactions";

export default function LogInteractionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(formData: FormData) {
    setSubmitting(true);
    try {
      await logInteraction({
        contactId: id,
        type: formData.get("type") as "call" | "email" | "message" | "meeting" | "note",
        summary: formData.get("summary") as string,
      });
      router.push(`/contacts/${id}`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-xl space-y-6">
      <h1 className="text-3xl font-bold">Log interaction</h1>
      <form action={onSubmit} className="space-y-4">
        <div>
          <Label htmlFor="type">Type *</Label>
          <select id="type" name="type" required className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
            <option value="call">Call</option>
            <option value="email">Email</option>
            <option value="message">Message</option>
            <option value="meeting">Meeting</option>
            <option value="note">Note</option>
          </select>
        </div>
        <div>
          <Label htmlFor="summary">Summary *</Label>
          <Textarea id="summary" name="summary" required />
        </div>
        <Button type="submit" disabled={submitting}>
          {submitting ? "Logging…" : "Log interaction"}
        </Button>
      </form>
    </div>
  );
}
