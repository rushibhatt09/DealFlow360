import Link from "next/link";
import { portalLoginAction } from "@/app/actions/auth";
import { AuthLayout } from "@/components/auth-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default async function PortalLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <AuthLayout
      title="Customer Portal"
      subtitle="View and negotiate your quotations directly, no email back-and-forth"
      bullets={[
        "See your quotation status the moment it changes",
        "Ask line-level questions or request changes",
        "Counter a discount and confirm terms with one click",
        "No account setup needed beyond what your rep sent you",
      ]}
    >
      {error && (
        <p className="mb-4 rounded-md border border-danger/20 bg-danger-soft px-3 py-2 text-sm text-danger">
          Invalid email or password.
        </p>
      )}

      <form action={portalLoginAction} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" required placeholder="acme@example.com" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <Input id="password" name="password" type="password" required />
        </div>
        <Button type="submit" className="w-full">
          Sign in
        </Button>
      </form>

      <p className="mt-6 text-sm text-muted-foreground">
        Internal user?{" "}
        <Link href="/login" className="font-medium text-primary hover:underline">
          Sign in here
        </Link>
      </p>
    </AuthLayout>
  );
}
