import Link from "next/link";
import { LayoutDashboard, Users } from "lucide-react";

export function Nav() {
  return (
    <nav className="w-56 border-r min-h-screen p-4 space-y-1">
      <Link href="/dashboard" className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-secondary">
        <LayoutDashboard size={18} /> Dashboard
      </Link>
      <Link href="/contacts" className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-secondary">
        <Users size={18} /> Contacts
      </Link>
    </nav>
  );
}
