import Link from "next/link";
import { LayoutDashboard, Users, Trello, Briefcase, ShoppingCart, Repeat, LifeBuoy } from "lucide-react";
import { getEnabledModules } from "@/lib/modules";

// Map module navIcon strings → lucide components. Add new icons here
// as modules ship in Phase 1c.
const iconMap: Record<string, React.ComponentType<{ size?: number }>> = {
  Trello,
  Briefcase,
  ShoppingCart,
  Repeat,
  LifeBuoy,
};

export function Nav() {
  const modules = getEnabledModules();

  return (
    <nav className="w-56 border-r min-h-screen p-4 space-y-1">
      <Link href="/dashboard" className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-secondary">
        <LayoutDashboard size={18} /> Dashboard
      </Link>
      <Link href="/contacts" className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-secondary">
        <Users size={18} /> Contacts
      </Link>
      {modules.flatMap((m) =>
        m.routes.map((r) => {
          const Icon = iconMap[m.navIcon] ?? LayoutDashboard;
          return (
            <Link key={r.path} href={r.path} className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-secondary">
              <Icon size={18} /> {r.label}
            </Link>
          );
        })
      )}
    </nav>
  );
}
