"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { AuthShell } from "@/components/auth/AuthShell";
import { EmailConfirmationCard } from "@/components/OnboardingModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { data, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name },
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/home`,
      },
    });
    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    if (data.user?.identities?.length === 0) {
      setError("An account with this email already exists. Try signing in.");
      setLoading(false);
      return;
    }

    if (data.session) {
      router.push("/home");
      router.refresh();
      return;
    }

    setPendingEmail(email);
    setLoading(false);
  }

  if (pendingEmail) {
    return (
      <AuthShell>
        <EmailConfirmationCard email={pendingEmail} />
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already confirmed?{" "}
          <Link href="/login" className="font-medium text-indigo hover:underline">
            Sign in
          </Link>
        </p>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <div className="rounded-xl border border-border bg-white p-8 shadow-card">
        <h1 className="text-xl font-semibold text-foreground">Create your free account</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Unlock unlimited practice, AI explanations, and progress tracking
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Optional"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <Button type="submit" className="h-12 w-full" disabled={loading}>
            {loading ? "Creating account..." : "Sign up free"}
          </Button>
        </form>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          By signing up, you agree to our{" "}
          <Link href="/terms" className="underline hover:text-foreground">
            Terms
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="underline hover:text-foreground">
            Privacy Policy
          </Link>
          .
        </p>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-indigo hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}
