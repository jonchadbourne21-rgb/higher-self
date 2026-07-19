import { trpc } from "@/lib/trpc";
import { isDemoMode } from "@/lib/demo";
import { storage, STORAGE_KEYS, initStorage } from "@/lib/storage";
import { registerNativeAuthCallback } from "@/lib/nativeAuth";
import { redirectToLogin } from "@/lib/loginRedirect";
import { initPurchases } from "@/lib/purchases";
import { UNAUTHED_ERR_MSG } from '@shared/const';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink, TRPCClientError } from "@trpc/client";
import { createRoot } from "react-dom/client";
import superjson from "superjson";
import App from "./App";
import { getLoginUrl } from "./const";
import "./index.css";

const queryClient = new QueryClient();

const redirectToLoginIfUnauthorized = (error: unknown) => {
  if (isDemoMode()) return; // Don't redirect in demo mode
  if (!(error instanceof TRPCClientError)) return;
  if (typeof window === "undefined") return;

  const isUnauthorized =
    error.message === UNAUTHED_ERR_MSG ||
    error.data?.code === "UNAUTHORIZED";

  if (!isUnauthorized) return;

  // Clear any stale stored token so the login page starts fresh
  storage.removeItem(STORAGE_KEYS.sessionToken);

  redirectToLogin(getLoginUrl());
};

queryClient.getQueryCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.query.state.error;
    redirectToLoginIfUnauthorized(error);
    console.error("[API Query Error]", error);
  }
});

queryClient.getMutationCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.mutation.state.error;
    redirectToLoginIfUnauthorized(error);
    console.error("[API Mutation Error]", error);
  }
});

// ── Token-in-localStorage/native-storage auth ───────────────────────────────
// On custom domains (higherself.cloud), the Cloudflare proxy may strip
// Set-Cookie headers. As a fallback, the OAuth callback redirects to
// /?_t=JWT and we store the token via the storage abstraction, then send it
// as Authorization: Bearer on every tRPC request.

// Pick up token from URL if present (just after OAuth redirect on web)
const _urlParams = new URLSearchParams(window.location.search);
const _urlToken = _urlParams.get("_t");
if (_urlToken) {
  storage.setItem(STORAGE_KEYS.sessionToken, _urlToken);
  // Clean the token from the URL without a page reload
  const cleanUrl = window.location.pathname + window.location.hash;
  window.history.replaceState({}, "", cleanUrl);
}

function getStoredToken(): string | null {
  return storage.getItem(STORAGE_KEYS.sessionToken);
}

const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: "/api/trpc",
      transformer: superjson,
      headers() {
        const headers: Record<string, string> = {};
        const token = getStoredToken();
        if (token) headers["Authorization"] = `Bearer ${token}`;
        if (isDemoMode()) headers["x-demo-mode"] = "true";
        return headers;
      },
      fetch(input, init) {
        return globalThis.fetch(input, {
          ...(init ?? {}),
          credentials: "include",
        });
      },
    }),
  ],
});

async function bootstrap() {
  // On native, hydrate the storage cache before anything reads from it,
  // then wire up the deep-link OAuth callback and store IAP.
  await initStorage();
  await registerNativeAuthCallback();
  void initPurchases();

  createRoot(document.getElementById("root")!).render(
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </trpc.Provider>
  );
}

void bootstrap();
