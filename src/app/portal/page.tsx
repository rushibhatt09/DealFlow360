import Link from "next/link";
import { db } from "@/lib/db";
import { requirePortalCustomer } from "@/lib/guards";
import { portalLogoutAction } from "@/app/actions/auth";

export default async function PortalHome() {
  const session = await requirePortalCustomer();

  const quotations = await db.quotation.findMany({
    where: { customerId: session.customerId, status: { not: "DRAFT" } },
    include: { lines: true },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-indigo-700 text-white">
        <div className="max-w-3xl mx-auto px-6 py-3 flex items-center justify-between">
          <span className="font-semibold">DealFlow360 Portal</span>
          <div className="flex items-center gap-3 text-sm">
            <span>{session.name}</span>
            <form action={portalLogoutAction}>
              <button className="underline">Sign out</button>
            </form>
          </div>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-6 py-8 space-y-3">
        <h1 className="text-lg font-semibold mb-4">Your Quotations</h1>
        {quotations.map((q) => (
          <Link key={q.id} href={`/portal/quotations/${q.id}`} className="block bg-white border rounded-lg p-4 hover:shadow">
            <div className="flex items-center justify-between">
              <span className="font-medium">Quotation #{q.id.slice(-6)}</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100">{q.status.replace("_", " ")}</span>
            </div>
            <p className="text-sm text-slate-500">{q.lines.length} line(s)</p>
          </Link>
        ))}
        {quotations.length === 0 && (
          <p className="text-sm text-slate-500">No quotations sent to you yet.</p>
        )}
      </main>
    </div>
  );
}
