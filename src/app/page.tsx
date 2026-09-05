import Link from "next/link";
import {
  ArrowRight,
  ShieldCheck,
  Sparkles,
  Warehouse,
  Repeat,
  HeartPulse,
  MessageSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const FEATURES = [
  {
    icon: ShieldCheck,
    title: "Discount governance",
    description:
      "Blended risk scoring across every line item auto-routes quotes to the right approval chain — manager, then finance.",
  },
  {
    icon: Sparkles,
    title: "Live upsell & cross-sell",
    description:
      "Ranked, margin-aware suggestions surface while a rep is still building the quote, not after it's sent.",
  },
  {
    icon: Warehouse,
    title: "Multi-warehouse fulfillment",
    description:
      "Orders split automatically across warehouses by live stock, minimizing shipments with manual override.",
  },
  {
    icon: Repeat,
    title: "Hybrid billing",
    description:
      "One-time hardware and recurring subscriptions on a single order, with correct mid-cycle proration.",
  },
  {
    icon: MessageSquare,
    title: "Customer negotiation portal",
    description:
      "Customers view, comment, and counter-discount directly — no email back-and-forth, auto re-approval when needed.",
  },
  {
    icon: HeartPulse,
    title: "Deal health monitoring",
    description:
      "Stalled deals and discount anomalies surface in real time, before a deal quietly loses momentum.",
  },
];

export default function Home() {
  return (
    <div className="flex-1">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2 text-lg font-semibold text-foreground">
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-sm font-bold text-primary-foreground">
              D
            </span>
            DealFlow360
          </div>
          <nav className="flex items-center gap-3">
            <Link href="/portal/login" className="text-sm font-medium text-muted-foreground hover:text-foreground">
              Customer Portal
            </Link>
            <Link href="/login">
              <Button variant="outline" size="sm">Sign in</Button>
            </Link>
            <Link href="/signup">
              <Button size="sm">Get started</Button>
            </Link>
          </nav>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 py-20 text-center">
        <span className="inline-flex items-center rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
          An intelligent, self-governing sales operations platform
        </span>
        <h1 className="mx-auto mt-6 max-w-3xl text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
          Quotation to cash, without the spreadsheet chaos.
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg text-muted-foreground">
          DealFlow360 enforces pricing discipline, reacts to inventory reality
          in real time, and keeps subscriptions and one-time sales reconciled
          on a single order — with a living, negotiable quote instead of a
          static PDF.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <Link href="/login">
            <Button size="lg">
              Open Sales Workspace
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <Link href="/portal/login">
            <Button size="lg" variant="outline">
              Customer Portal
            </Button>
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-24">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <Card key={f.title} className="p-6">
              <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary-soft text-primary">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="text-sm font-semibold text-foreground">{f.title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{f.description}</p>
            </Card>
          ))}
        </div>
      </section>

      <footer className="border-t border-border py-6">
        <p className="text-center text-xs text-muted-foreground">
          DealFlow360 — built for hackathon demo purposes.
        </p>
      </footer>
    </div>
  );
}
