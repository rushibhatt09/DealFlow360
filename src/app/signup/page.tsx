import Link from "next/link";
import { signupAction } from "@/app/actions/auth";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="w-full max-w-sm bg-white rounded-xl shadow p-8">
        <h1 className="text-2xl font-semibold mb-1">DealFlow360</h1>
        <p className="text-sm text-slate-500 mb-6">Create your sales rep account</p>

        {error === "exists" && (
          <p className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
            An account with that email already exists.
          </p>
        )}
        {error === "invalid" && (
          <p className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
            Please fill all fields (password min 6 characters).
          </p>
        )}

        <form action={signupAction} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Name</label>
            <input name="name" required className="w-full border rounded-md px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input name="email" type="email" required className="w-full border rounded-md px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Password</label>
            <input name="password" type="password" required className="w-full border rounded-md px-3 py-2 text-sm" />
          </div>
          <button
            type="submit"
            className="w-full bg-slate-900 text-white rounded-md py-2 text-sm font-medium hover:bg-slate-800"
          >
            Sign up
          </button>
        </form>

        <p className="mt-4 text-sm text-slate-500">
          Already have an account? <Link href="/login" className="text-slate-900 underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
