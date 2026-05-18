import { UserButton, OrganizationSwitcher } from "@clerk/nextjs";

export function Topbar() {
  return (
    <header className="h-14 border-b flex items-center justify-between px-6">
      <OrganizationSwitcher />
      <UserButton />
    </header>
  );
}
