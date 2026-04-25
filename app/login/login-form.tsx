"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";

export function LoginForm({ redirectTo }: { redirectTo: string }) {
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasGoogle =
    typeof window !== "undefined" &&
    document.documentElement.getAttribute("data-google-enabled") !== "false";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === "sign-up") {
        const { error: err } = await authClient.signUp.email({
          email,
          password,
          name,
        });
        if (err) throw new Error(err.message ?? "Sign up failed");
      } else {
        const { error: err } = await authClient.signIn.email({
          email,
          password,
        });
        if (err) throw new Error(err.message ?? "Sign in failed");
      }
      window.location.href = redirectTo;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Authentication failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    await authClient.signIn.social({
      provider: "google",
      callbackURL: redirectTo,
    });
  }

  return (
    <div className="space-y-4">
      {hasGoogle && (
        <button
          type="button"
          onClick={handleGoogle}
          className="w-full px-4 py-2.5 border rounded-lg font-medium hover:bg-foreground/5 transition flex items-center justify-center gap-2"
        >
          Continue with Google
        </button>
      )}

      <div className="relative py-2">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="bg-background px-2 text-foreground/50">or</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        {mode === "sign-up" && (
          <input
            type="text"
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full px-3 py-2 border rounded-lg bg-background"
          />
        )}
        <input
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full px-3 py-2 border rounded-lg bg-background"
        />
        <input
          type="password"
          placeholder="Password (8+ characters)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
          className="w-full px-3 py-2 border rounded-lg bg-background"
        />
        {error && (
          <p className="text-sm text-red-600">{error}</p>
        )}
        <button
          type="submit"
          disabled={loading}
          className="w-full px-4 py-2.5 bg-foreground text-background rounded-lg font-medium hover:opacity-90 transition disabled:opacity-50"
        >
          {loading ? "..." : mode === "sign-in" ? "Sign in" : "Create account"}
        </button>
      </form>

      <button
        type="button"
        onClick={() => setMode(mode === "sign-in" ? "sign-up" : "sign-in")}
        className="w-full text-center text-sm text-foreground/60 hover:text-foreground"
      >
        {mode === "sign-in"
          ? "Don't have an account? Sign up"
          : "Already have an account? Sign in"}
      </button>
    </div>
  );
}
