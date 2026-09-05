import Link from "next/link";

export function PortalHeader({
  name,
  logoutAction,
}: {
  name: string;
  logoutAction: () => Promise<void>;
}) {
  return (
    <header className="border-b border-border bg-card">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
        <Link href="/portal" className="flex items-center gap-2 font-semibold text-foreground">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-sm font-bold text-primary-foreground">
            D
          </span>
          DealFlow360 Portal
        </Link>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-muted-foreground">{name}</span>
          <form action={logoutAction}>
            <button type="submit" className="font-medium text-primary hover:underline">
              Sign out
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
