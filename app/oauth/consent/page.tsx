import { redirect } from "next/navigation";
import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import { getClient } from "@/lib/oauth/clients";
import { SCOPE_DESCRIPTIONS, parseScopes } from "@/lib/oauth/scopes";
import { ConsentActions } from "./consent-actions-form";

interface ConsentParams {
  client_id?: string;
  redirect_uri?: string;
  scope?: string;
  state?: string;
  code_challenge?: string;
  code_challenge_method?: string;
}

export default async function ConsentPage({
  searchParams,
}: {
  searchParams: Promise<ConsentParams>;
}) {
  const params = await searchParams;

  // Validate the request looks complete — protects against direct visits
  if (
    !params.client_id ||
    !params.redirect_uri ||
    !params.scope ||
    !params.code_challenge
  ) {
    return (
      <main className="flex min-h-screen items-center justify-center p-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Invalid authorization request</h1>
          <p className="mt-2 text-foreground/60">
            This page must be reached via the OAuth flow.
          </p>
        </div>
      </main>
    );
  }

  // Force login if not authenticated
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    const currentUrl = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v) currentUrl.set(k, v);
    });
    redirect(`/login?redirect=${encodeURIComponent(`/oauth/consent?${currentUrl}`)}`);
  }

  // Look up the registered client
  const client = await getClient(params.client_id);
  if (!client) {
    return errorView("Unknown client", "This OAuth client is not registered.");
  }

  let scopes: string[];
  try {
    scopes = parseScopes(params.scope);
  } catch {
    return errorView("Invalid scope", "The requested scopes are not supported.");
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-8">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold">{client.name}</h1>
          <p className="text-foreground/60">
            wants to access your Vectorless account
          </p>
        </div>

        <div className="rounded-lg border p-4 space-y-3">
          <p className="text-sm font-medium text-foreground/80">
            This will allow {client.name} to:
          </p>
          <ul className="space-y-3">
            {scopes.map((scope) => {
              const info = SCOPE_DESCRIPTIONS[scope];
              return (
                <li key={scope} className="flex gap-3">
                  <span className="text-foreground/40 mt-0.5">✓</span>
                  <div>
                    <p className="font-medium">{info?.label ?? scope}</p>
                    <p className="text-sm text-foreground/60">
                      {info?.description}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        <p className="text-xs text-foreground/50 text-center">
          Signed in as <strong>{session.user.email}</strong>
        </p>

        <ConsentActions
          clientId={params.client_id}
          redirectUri={params.redirect_uri}
          scopes={scopes}
          state={params.state ?? null}
          codeChallenge={params.code_challenge}
          codeChallengeMethod={params.code_challenge_method ?? "S256"}
        />
      </div>
    </main>
  );
}

function errorView(title: string, description: string) {
  return (
    <main className="flex min-h-screen items-center justify-center p-8">
      <div className="text-center max-w-md">
        <h1 className="text-2xl font-bold">{title}</h1>
        <p className="mt-2 text-foreground/60">{description}</p>
      </div>
    </main>
  );
}
