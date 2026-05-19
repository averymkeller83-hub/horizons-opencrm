"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createOrder } from "../../actions";
import { getContactsForOrder } from "../../loaders";

type LineItemDraft = { productName: string; quantity: number; unitPriceCents: number };

export default function NewOrderPage() {
  const router = useRouter();
  const [contacts, setContacts] = useState<any[] | null>(null);
  const [items, setItems] = useState<LineItemDraft[]>([{ productName: "", quantity: 1, unitPriceCents: 0 }]);
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);

  useEffect(() => { getContactsForOrder().then(setContacts); }, []);
  if (!contacts) return <p>Loading...</p>;

  function addItem() { setItems((cur) => [...cur, { productName: "", quantity: 1, unitPriceCents: 0 }]); }
  function removeItem(i: number) { setItems((cur) => cur.filter((_, idx) => idx !== i)); }
  function updateItem(i: number, patch: Partial<LineItemDraft>) {
    setItems((cur) => cur.map((it, idx) => idx === i ? { ...it, ...patch } : it));
  }

  const total = items.reduce((acc, it) => acc + it.quantity * it.unitPriceCents, 0);

  async function onSubmit(formData: FormData) {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    try {
      const o = await createOrder({
        contactId: formData.get("contactId") as string,
        notes: (formData.get("notes") as string) || undefined,
        items: items.filter((it) => it.productName.trim().length > 0),
      });
      router.push(`/orders/${o.id}`);
    } finally { submittingRef.current = false; setSubmitting(false); }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-3xl font-bold">New order</h1>
      <form action={onSubmit} className="space-y-4">
        <div>
          <Label htmlFor="contactId">Customer *</Label>
          <select id="contactId" name="contactId" required className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
            <option value="">— select —</option>
            {contacts.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        <div className="space-y-2">
          <Label>Items</Label>
          {items.map((it, i) => (
            <div key={i} className="flex gap-2 items-end">
              <div className="flex-1">
                <Input placeholder="Product name" value={it.productName}
                  onChange={(e) => updateItem(i, { productName: e.target.value })} />
              </div>
              <div className="w-20">
                <Input type="number" min={1} value={it.quantity}
                  onChange={(e) => updateItem(i, { quantity: parseInt(e.target.value || "1") })} />
              </div>
              <div className="w-28">
                <Input type="number" step="0.01" placeholder="Unit $"
                  value={(it.unitPriceCents / 100).toFixed(2)}
                  onChange={(e) => updateItem(i, { unitPriceCents: Math.round(parseFloat(e.target.value || "0") * 100) })} />
              </div>
              <Button type="button" variant="outline" size="sm" onClick={() => removeItem(i)}>×</Button>
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={addItem}>+ Add item</Button>
        </div>

        <div className="text-right text-lg">
          Total: <strong>${(total / 100).toFixed(2)}</strong>
        </div>

        <div><Label htmlFor="notes">Notes</Label><Textarea id="notes" name="notes" /></div>
        <Button type="submit" disabled={submitting}>{submitting ? "Creating..." : "Create order"}</Button>
      </form>
    </div>
  );
}
