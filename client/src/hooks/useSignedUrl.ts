import { trpc } from "@/lib/trpc";

/**
 * Resolve an R2 key to a signed download URL.
 * Cached for the URL's lifetime via React Query — refreshed 60s before
 * the upstream signature expires.
 *
 * Usage:
 *   const { data, isLoading } = useSignedUrl("ember/dev/attendance/...");
 *   if (data) <img src={data.url} />
 */
export function useSignedUrl(key: string | null | undefined, opts?: { expiresIn?: number }) {
  return trpc.upload.getDownloadUrl.useQuery(
    { key: key ?? "", expiresIn: opts?.expiresIn },
    {
      enabled: Boolean(key),
      staleTime: ((opts?.expiresIn ?? 900) - 60) * 1000,
      retry: 1,
    }
  );
}
