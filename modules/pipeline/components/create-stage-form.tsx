"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createStage } from "../actions";

type Props = {
  /** The next available order (count of existing stages). Defaults to 0. */
  nextOrder?: number;
  /** Show as a card on the empty-state, or compact above the kanban */
  variant?: "empty-state" | "compact";
};

export function CreateStageForm({ nextOrder = 0, variant = "empty-state" }: Props) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(formData: FormData) {
    const raw = (formData.get("name") as string)?.trim();
    if (!raw) return;
    setSubmitting(true);
    try {
      await createStage({ name: raw, order: nextOrder });
      setName("");
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  if (variant === "compact") {
    return (
      <form action={onSubmit} className="flex items-end gap-2">
        <div className="flex-1">
          <Label htmlFor="stage-name" className="sr-only">New stage name</Label>
          <Input
            id="stage-name"
            name="name"
            placeholder="New stage name (e.g. Negotiation)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        <Button type="submit" disabled={submitting || !name.trim()} variant="outline" size="sm">
          {submitting ? "Adding…" : "+ Add stage"}
        </Button>
      </form>
    );
  }

  return (
    <div className="max-w-md space-y-4 border rounded-lg p-6 bg-secondary/20">
      <div>
        <h2 className="text-lg font-semibold">Create your first stage</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Stages are columns in your pipeline. Common starters: <em>Lead</em>, <em>Qualified</em>, <em>Won</em>.
          You can add more anytime.
        </p>
      </div>
      <form action={onSubmit} className="space-y-3">
        <div>
          <Label htmlFor="stage-name-first">Stage name *</Label>
          <Input
            id="stage-name-first"
            name="name"
            placeholder="Lead"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoFocus
          />
        </div>
        <Button type="submit" disabled={submitting || !name.trim()}>
          {submitting ? "Creating…" : "Create stage"}
        </Button>
      </form>
    </div>
  );
}
