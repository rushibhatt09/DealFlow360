import Link from "next/link";
import { requireInternalUser } from "@/lib/guards";
import { logoutAction } from "@/app/actions/auth";

export default async function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const user = await requireInternalUser();

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-slate-900 text-white">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <span className="font-semibold">DealFlow360</span>
            <nav className="flex gap-4 text-sm text-slate-300">
              <Link href="/workspace/quotations" className="hover:text-white">Quotations</Link>
              <Link href="/workspace/quotations?view=pipeline" className="hover:text-white">Pipeline</Link>
              <Link href="/workspace/dashboard" className="hover:text-white">Deal Health</Link>
            </nav>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-slate-300">{user.name} · {user.role.replace("_", " ")}</span>
            {(user.role === "ADMIN" || user.role === "SALES_MANAGER") && (
              <Link href="/admin" className="underline hover:text-white">Go to Back-end</Link>
            )}
            <form action={logoutAction}>
              <button className="underline hover:text-white">Close Workspace</button>
            </form>
          </div>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-6 py-8">{children}</main>
    </div>
  );
}
