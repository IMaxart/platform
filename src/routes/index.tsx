import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Navigate } from "@tanstack/react-router";

import { PublicStatusPage } from "~/components/public/public-status-page";
import { Card, CardContent } from "~/components/ui/card";
import { fetchJson } from "~/lib/api-client";
import type { PublicPageResponse } from "~/shared/api-types";

export const Route = createFileRoute("/")({
  component: IndexRoute,
});

const LoadingCard = ({ message }: { message: string }) => {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8">
      <Card>
        <CardContent className="text-muted-foreground p-6 text-sm">
          {message}
        </CardContent>
      </Card>
    </main>
  );
};

function IndexRoute() {
  const pageQuery = useQuery({
    queryKey: ["publicPage"],
    // Avoid server-side fetch for a relative URL during SSR. This route is CSR-only.
    enabled: typeof window !== "undefined",
    queryFn: async () => {
      return await fetchJson<PublicPageResponse>({ url: "/api/public/page" });
    },
    refetchInterval: 30_000,
  });

  if (pageQuery.isPending) return <LoadingCard message="Loading…" />;
  if (pageQuery.isError || !pageQuery.data) {
    return <LoadingCard message="Failed to load status page." />;
  }

  const data = pageQuery.data;
  if (data.mode === "public") return <PublicStatusPage data={data} />;
  if (data.mode === "admin") return <Navigate to="/admin" />;
  return (
    <LoadingCard message={`No service configured for host: ${data.host}`} />
  );
}
