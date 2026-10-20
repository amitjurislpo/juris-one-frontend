import { QueryClient } from "@tanstack/react-query";

/**
 * Server state lives here: every `useData(path)` is one cached query. After a successful write (`apiAction`) everything
 * is refetched, which is what `revalidatePath` / `router.refresh()` did in the Next.js app.
 */
export const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 0, gcTime: 5 * 60_000, retry: false, refetchOnWindowFocus: false } },
});

export const refreshData = () => queryClient.invalidateQueries();
