import { trpc, trpcClient } from "@/lib/trpc";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createRoot } from "react-dom/client";
import App from "./App";
import { AuthProvider } from "@/contexts/AuthContext";
import "./index.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error: any) => {
        if (error?.data?.code === "UNAUTHORIZED" || error?.data?.code === "FORBIDDEN") return false;
        return failureCount < 2;
      },
      staleTime: 30_000,
    },
  },
});

createRoot(document.getElementById("root")!).render(
  <AuthProvider>
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </trpc.Provider>
  </AuthProvider>
);
