import Link from "next/link";
import { requireRole } from "@/lib/guards";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireRole(["ADMIN", "SALES_MANAGER"]);

  const links = [
    ["/admin/products", "Products"],
    ["/admin/discount-tiers", "Discount Tiers & Approval"],
    ["/admin/warehouses", "Warehouses & Stock"],
    ["/admin/subscription-plans", "Subscription Plans"],
    ["/admin/upsell-rules", "Upsell Rules"],
    ["/admin/reports", "Reports"],
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-slate-900 text-white">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-6 flex-wrap">
            <span className="font-semibold">DealFlow360 · Back-end</span>
            <nav className="flex gap-4 text-sm text-slate-300 flex-wrap">
              {links.map(([href, label]) => (
                <Link key={href} href={href} className="hover:text-white">{label}</Link>
              ))}
            </nav>
          </div>
          <Link href="/workspace" className="text-sm underline hover:text-white">Back to Workspace</Link>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-6 py-8">{children}</main>
    </div>
  );
}
