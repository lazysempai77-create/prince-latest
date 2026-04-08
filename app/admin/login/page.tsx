// =============================================================================
// /admin/login — admin password login page
// Posts { password } to /api/admin/login. On success the server sets the
// admin_token cookie and we redirect to the originally requested path
// (or /admin by default).
// =============================================================================

"use client";

import { useState, FormEvent, Suspense } from "react";
import { useRouter, useSearchParams }     from "next/navigation";

function LoginForm() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const returnTo     = searchParams.get("returnTo") || "/admin";

  const [password, setPassword] = useState("");
  const [error, setError]       = useState<string | null>(null);
  const [loading, setLoading]   = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/admin/login", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ password }),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error || "Login failed");
        setLoading(false);
        return;
      }

      router.push(returnTo);
      router.refresh();
    } catch {
      setError("Network error — please try again");
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-black text-white px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm space-y-6 rounded-lg border border-white/10 bg-neutral-900 p-8"
      >
        <div>
          <h1 className="text-2xl font-semibold">Admin Login</h1>
          <p className="mt-1 text-sm text-neutral-400">
            Enter your password to continue.
          </p>
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium">
            Password
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-2 w-full rounded-md border border-white/10 bg-black px-3 py-2 text-white placeholder-neutral-500 focus:border-white focus:outline-none"
          />
        </div>

        {error && (
          <p className="text-sm text-red-400" role="alert">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading || password.length === 0}
          className="w-full rounded-md bg-white px-4 py-2 font-medium text-black disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </main>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
