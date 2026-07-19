import { cn } from "@/lib/utils";
import { getLoginUrl } from "@/const";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Component, ReactNode } from "react";

const SESSION_STORAGE_KEY = "app_session_token";
const UNAUTHED_SIGNALS = [
  "Please login (10001)",
  "UNAUTHORIZED",
  "Missing session cookie",
  "Session expired",
  "jwt expired",
  "invalid signature",
];

function isAuthError(error: Error | null): boolean {
  if (!error) return false;
  const msg = error.message || error.toString();
  return UNAUTHED_SIGNALS.some((s) => msg.includes(s));
}

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  isAuthError: boolean;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, isAuthError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    const authErr = isAuthError(error);
    if (authErr) {
      // Clear any stale stored token so the login page starts fresh
      try {
        localStorage.removeItem(SESSION_STORAGE_KEY);
      } catch (_) {}
    }
    return { hasError: true, error, isAuthError: authErr };
  }

  render() {
    if (this.state.hasError) {
      // Auth error → redirect to login immediately
      if (this.state.isAuthError) {
        window.location.href = getLoginUrl();
        return (
          <div className="flex items-center justify-center min-h-screen bg-background">
            <p className="text-muted-foreground text-sm">Redirecting to sign in…</p>
          </div>
        );
      }

      // Generic error → show the crash screen with a reload button
      return (
        <div className="flex items-center justify-center min-h-screen p-8 bg-background">
          <div className="flex flex-col items-center w-full max-w-2xl p-8">
            <AlertTriangle
              size={48}
              className="text-destructive mb-6 flex-shrink-0"
            />

            <h2 className="text-xl mb-4">An unexpected error occurred.</h2>

            <div className="p-4 w-full rounded bg-muted overflow-auto mb-6">
              <pre className="text-sm text-muted-foreground whitespace-break-spaces">
                {this.state.error?.stack}
              </pre>
            </div>

            <button
              onClick={() => window.location.reload()}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg",
                "bg-primary text-primary-foreground",
                "hover:opacity-90 cursor-pointer"
              )}
            >
              <RotateCcw size={16} />
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
