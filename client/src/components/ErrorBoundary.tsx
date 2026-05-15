import { cn } from "@/lib/utils";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Component, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  reloading: boolean;
}

// After a deploy the cached SPA shell still references the previous
// build's chunk hashes; clicking a lazy route then throws "Failed to
// fetch dynamically imported module". Detect that specific shape and
// auto-reload — but only once per tab session so a genuinely broken
// chunk doesn't trap the user in a refresh loop.
const STALE_CHUNK_FLAG = "ember.staleChunkReloaded";
function isStaleChunkError(error: Error | null): boolean {
  if (!error) return false;
  const msg = `${error.name}: ${error.message}`;
  return /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module/i.test(msg);
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, reloading: false };
  }

  static getDerivedStateFromError(error: Error): State {
    const alreadyTried = (() => {
      try { return !!sessionStorage.getItem(STALE_CHUNK_FLAG); } catch { return false; }
    })();
    const willReload = isStaleChunkError(error) && !alreadyTried;
    return { hasError: true, error, reloading: willReload };
  }

  componentDidCatch(error: Error) {
    if (isStaleChunkError(error) && !sessionStorage.getItem(STALE_CHUNK_FLAG)) {
      try { sessionStorage.setItem(STALE_CHUNK_FLAG, "1"); } catch { /* private mode */ }
      window.location.reload();
    }
  }

  render() {
    if (this.state.reloading) {
      return (
        <div className="flex items-center justify-center min-h-screen p-8 bg-background">
          <div className="flex flex-col items-center gap-3 text-muted-foreground">
            <RotateCcw size={20} className="animate-spin" />
            <p className="text-sm">App was updated, reloading…</p>
          </div>
        </div>
      );
    }
    if (this.state.hasError) {
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
