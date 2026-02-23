import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Activity } from "lucide-react";

import { Button } from "~/components/ui/button";
import { fetchJson } from "~/lib/api-client";
import type { PublicPageResponse } from "~/shared/api-types";

const Header = () => {
  const contextQuery = useQuery({
    queryKey: ["publicPage"],
    enabled: typeof window !== "undefined",
    queryFn: async () => {
      return await fetchJson<PublicPageResponse>({ url: "/api/public/page" });
    },
    staleTime: 30_000,
  });

  const showAdminLink = (() => {
    if (!contextQuery.data) return false;
    return contextQuery.data.mode === "admin";
  })();

  return (
    <header className="bg-background/80 supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50 border-b backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2 font-semibold">
          <Activity className="text-primary h-5 w-5" aria-hidden />
          <span>Status</span>
        </Link>

        {showAdminLink ? (
          <Button asChild variant="ghost" size="sm">
            <Link to="/admin">Admin</Link>
          </Button>
        ) : null}
      </div>
    </header>
  );
};

export default Header;
