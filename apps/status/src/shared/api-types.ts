import type { CheckState, EndpointRow, ServiceRow } from "~/server/types";

export type DokployRefType = "application" | "compose";

export type PublicPageResponse =
  | {
      mode: "admin";
      host: string;
      adminHost: string;
    }
  | {
      mode: "public";
      host: string;
      nowMs: number;
      deploy: { lastDeployedAtMs: number | null } | null;
      service: ServiceRow;
      endpoints: (EndpointRow & {
        latest: {
          atMs: number;
          state: CheckState;
          statusCode: number | null;
          latencyMs: number | null;
          errorKind: string | null;
        } | null;
        uptime: {
          last24h: number | null;
          last90d: number | null;
          last365d: number | null;
        };
      })[];
      serviceState: CheckState;
      serviceUptime: {
        last24h: number | null;
        last90d: number | null;
        last365d: number | null;
      };
      checks24hByEndpointId: Record<
        string,
        { atMs: number; ok: 0 | 1; degraded: 0 | 1; latencyMs: number | null }[]
      >;
    }
  | {
      mode: "notFound";
      host: string;
      adminHost: string;
    };

export type AdminServicesResponse = {
  services: (ServiceRow & {
    deploy: {
      type: DokployRefType;
      refId: string;
      lastDeployedAtMs: number | null;
      lastSyncAtMs: number;
    } | null;
    endpoints: (EndpointRow & {
      latest: {
        atMs: number;
        state: CheckState;
        statusCode: number | null;
        latencyMs: number | null;
        errorKind: string | null;
      } | null;
    })[];
  })[];
};
