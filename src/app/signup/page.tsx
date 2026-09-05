import Link from "next/link";
import { signupAction } from "@/app/actions/auth";
import { AuthLayout } from "@/components/auth-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Set up sales rep access to DealFlow360"
      bullets={[
        "Deal health monitoring with anomaly alerts",
        "Customer-facing negotiation portal, no email back-and-forth",
        "Configurable approval chains by discount tier and category",
        "One platform from quotation to fulfillment to billing",
      ]}
    >
      {error === "exists" && (
        <p className="mb-4 rounded-md border border-danger/20 bg-danger-soft px-3 py-2 text-sm text-danger">
          An account with that email already exists.
        </p>
      )}
      {error === "invalid" && (
        <p className="mb-4 rounded-md border border-danger/20 bg-danger-soft px-3 py-2 text-sm text-danger">
          Please fill all fields (password min 6 characters).
        </p>
      )}

      <form action={signupAction} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="name">Name</Label>
          <Input id="name" name="name" required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <Input id="password" name="password" type="password" required />
        </div>
        <Button type="submit" className="w-full">
          Sign up
        </Button>
      </form>

      <p className="mt-6 text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </AuthLayout>
  );
}
