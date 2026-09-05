import Link from "next/link";
import { CheckCircle2 } from "lucide-react";

export function AuthLayout({
  title,
  subtitle,
  bullets,
  children,
}: {
  title: string;
  subtitle: string;
  bullets: string[];
  children: React.ReactNode;
}) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-indigo-700 via-indigo-600 to-violet-600 p-10 text-white lg:flex">
        <div
          className="pointer-events-none absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
            backgroundSize: "24px 24px",
          }}
        />
        <Link href="/" className="relative z-10 flex items-center gap-2 text-lg font-semibold">
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-white/15 text-sm font-bold backdrop-blur">
            D
          </span>
          DealFlow360
        </Link>

        <div className="relative z-10">
          <h2 className="text-3xl font-semibold leading-tight">
            The self-governing sales
            <br /> operations platform.
          </h2>
          <p className="mt-3 max-w-sm text-indigo-100">
            Quotation to cash, with pricing discipline and inventory reality
            built in — not bolted on.
          </p>
          <ul className="mt-8 space-y-3">
            {bullets.map((b) => (
              <li key={b} className="flex items-start gap-2 text-sm text-indigo-50">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-white" />
                {b}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative z-10 text-xs text-indigo-200">
          © 2026 DealFlow360. Built for hackathon demo purposes.
        </p>
      </div>

      <div className="flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <Link href="/" className="flex items-center gap-2 text-lg font-semibold text-foreground">
              <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-sm font-bold text-primary-foreground">
                D
              </span>
              DealFlow360
            </Link>
          </div>
          <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
          <p className="mt-1 mb-6 text-sm text-muted-foreground">{subtitle}</p>
          {children}
        </div>
      </div>
    </div>
  );
}
