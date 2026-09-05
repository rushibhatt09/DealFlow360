import Link from "next/link";
import { loginAction } from "@/app/actions/auth";
import { AuthLayout } from "@/components/auth-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to your sales workspace"
      bullets={[
        "Blended discount risk scoring with automatic approval routing",
        "Live upsell suggestions with real-time margin impact",
        "Multi-warehouse fulfillment, split automatically",
        "Hybrid one-time + subscription billing, correctly prorated",
      ]}
    >
      {error && (
        <p className="mb-4 rounded-md border border-danger/20 bg-danger-soft px-3 py-2 text-sm text-danger">
          Invalid email or password.
        </p>
      )}

      <form action={loginAction} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" required placeholder="rep@dealflow360.com" />
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
        No account?{" "}
        <Link href="/signup" className="font-medium text-primary hover:underline">
          Sign up
        </Link>
      </p>
      <p className="mt-2 text-sm text-muted-foreground">
        Customer?{" "}
        <Link href="/portal/login" className="font-medium text-primary hover:underline">
          Portal login
        </Link>
      </p>
    </AuthLayout>
  );
}
