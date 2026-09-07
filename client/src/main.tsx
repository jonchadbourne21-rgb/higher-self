import { trpc } from "@/lib/trpc";
import { isDemoMode } from "@/lib/demo";
import { storage, STORAGE_KEYS, initStorage } from "@/lib/storage";
import { registerNativeAuthCallback } from "@/lib/nativeAuth";
import { redirectToLogin } from "@/lib/loginRedirect";
import { apiUrl } from "@/lib/apiBase";
import { initPurchases } from "@/lib/purchases";
import { UNAUTHED_ERR_MSG } from '@shared/const';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink, TRPCClientError } from "@trpc/client";
import { createRoot } from "react-dom/client";
import superjson from "superjson";
import App from "./App";
import "./index.css";

const queryClient = new QueryClient();

const redirectToLoginIfUnauthorized = (error: unknown) => {
  if (isDemoMode()) return;
  if (!(error instanceof TRPCClientError)) return;
  if (typeof window === "undefined") return;
  const isUnauthorized = error.message === UNAUTHED_ERR_MSG || error.data?.code === "UNAUTHORIZED";
  if (!isUnauthorized) return;
  storage.removeItem(STORAGE_KEYS.sessionToken);
  redirectToLogin("/");
};

queryClient.getQueryCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    redirectToLoginIfUnauthorized(event.query.state.error);
    console.error("[API Query Error]", event.query.state.error);
  }
});
queryClient.getMutationCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    redirectToLoginIfUnauthorized(event.mutation.state.error);
    console.error("[API Mutation Error]", event.mutation.state.error);
  }
});

// Generic JWT pickup remains for browser/session migration paths. Native Apple
// authentication stores the Mirrored JWT directly and does not use a callback.
const urlParams = new URLSearchParams(window.location.search);
const urlToken = urlParams.get("_t");
if (urlToken) {
  storage.setItem(STORAGE_KEYS.sessionToken, urlToken);
  window.history.replaceState({}, "", window.location.pathname + window.location.hash);
}

const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: apiUrl("/api/trpc"),
      transformer: superjson,
      headers() {
        const headers: Record<string, string> = {};
        const token = storage.getItem(STORAGE_KEYS.sessionToken);
        if (token) headers.Authorization = `Bearer ${token}`;
        if (isDemoMode()) headers["x-demo-mode"] = "true";
        return headers;
      },
      fetch(input, init) {
        return globalThis.fetch(input, { ...(init ?? {}), credentials: "include" });
      },
    }),
  ],
});

async function bootstrap() {
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
