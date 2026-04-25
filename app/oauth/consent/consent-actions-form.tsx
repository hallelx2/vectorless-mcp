"use client";

import { useState, useTransition } from "react";

import { approveConsent, denyConsent, type ConsentInput } from "./actions";

export function ConsentActions(input: ConsentInput) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleApprove() {
    setError(null);
    startTransition(async () => {
      const result = await approveConsent(input);
      window.location.href = result.redirectTo;
    });
  }

  function handleDeny() {
    setError(null);
    startTransition(async () => {
      const result = await denyConsent(input);
      window.location.href = result.redirectTo;
    });
  }

  return (
    <div className="space-y-3">
      {error && <p className="text-sm text-red-600 text-center">{error}</p>}

      <button
        type="button"
        disabled={isPending}
        onClick={handleApprove}
        className="w-full px-4 py-2.5 bg-foreground text-background rounded-lg font-medium hover:opacity-90 transition disabled:opacity-50"
      >
        {isPending ? "..." : "Approve"}
      </button>

      <button
        type="button"
        disabled={isPending}
        onClick={handleDeny}
        className="w-full px-4 py-2.5 border rounded-lg font-medium hover:bg-foreground/5 transition disabled:opacity-50"
      >
        Deny
      </button>
    </div>
  );
}
