import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";

import { StatusBadge } from "~/components/status/status-badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { fetchJson } from "~/lib/api-client";
import type { AdminServicesResponse, DokployRefType } from "~/shared/api-types";

const ADMIN_TOKEN_STORAGE_KEY = "status.adminToken";

const getTokenFromStorage = () => {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(ADMIN_TOKEN_STORAGE_KEY);
};

const setTokenInStorage = ({ token }: { token: string }) => {
  window.localStorage.setItem(ADMIN_TOKEN_STORAGE_KEY, token);
};

const clearTokenInStorage = () => {
  window.localStorage.removeItem(ADMIN_TOKEN_STORAGE_KEY);
};

const useAdminToken = () => {
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    setToken(getTokenFromStorage());
  }, []);

  const tokenValue = token ?? "";

  return {
    token: {
      value: tokenValue,
      isSet: tokenValue.length > 0,
      set: (next: string) => {
        setToken(next.length === 0 ? null : next);
        if (next.length === 0) {
          clearTokenInStorage();
          return;
        }
        setTokenInStorage({ token: next });
      },
      clear: () => {
        setToken(null);
        clearTokenInStorage();
      },
    },
  };
};

const adminHeaders = ({ token }: { token: string }) => {
  return {
    "x-admin-token": token,
  };
};

type NewServiceForm = {
  slug: string;
  name: string;
  primaryDomain: string;
  publicStatusHost: string;
};

type NewEndpointForm = {
  key: string;
  displayName: string;
  internalMode: "directUrl" | "traefikHost";
  internalUrl: string;
  internalHost: string;
  internalPath: string;
  publicUrl: string;
  intervalSec: string;
  timeoutMs: string;
  degradedMs: string;
};

const DokployConfigForm = ({
  serviceId,
  token,
  initial,
}: {
  serviceId: string;
  token: string;
  initial: {
    type: DokployRefType;
    refId: string;
    lastDeployedAtMs: number | null;
    lastSyncAtMs: number;
  } | null;
}) => {
  const queryClient = useQueryClient();
  const [type, setType] = useState<DokployRefType>(
    initial?.type ?? "application"
  );
  const [refId, setRefId] = useState<string>(initial?.refId ?? "");

  useEffect(() => {
    if (!initial) return;
    setType(initial.type);
    setRefId(initial.refId);
  }, [initial]);

  const canSave = refId.trim().length > 0;

  const save = useMutation({
    mutationFn: async () => {
      return await fetchJson({
        url: `/api/admin/services/${serviceId}/dokploy`,
        init: {
          method: "PATCH",
          headers: {
            ...adminHeaders({ token }),
            "content-type": "application/json",
          },
          body: JSON.stringify({
            type,
            refId: refId.trim(),
          }),
        },
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["adminServices"] });
    },
  });

  const lastDeployed = initial?.lastDeployedAtMs
    ? new Date(initial.lastDeployedAtMs).toLocaleString()
    : "—";
  const lastSync = initial?.lastSyncAtMs
    ? new Date(initial.lastSyncAtMs).toLocaleString()
    : "—";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Dokploy (optional)</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2">
        <select
          className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
          value={type}
          onChange={(e) =>
            setType(e.target.value === "compose" ? "compose" : "application")
          }
        >
          <option value="application">application</option>
          <option value="compose">compose</option>
        </select>

        <Input
          placeholder="applicationId / composeId"
          value={refId}
          onChange={(e) => setRefId(e.target.value)}
        />

        <div className="text-muted-foreground text-xs sm:col-span-2">
          lastDeployedAt: {lastDeployed} • lastSyncAt: {lastSync}
        </div>

        <div className="flex justify-end sm:col-span-2">
          <Button
            disabled={!canSave || save.isPending}
            onClick={() => save.mutate()}
          >
            Save Dokploy mapping
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

const AddEndpointForm = ({
  serviceId,
  token,
}: {
  serviceId: string;
  token: string;
}) => {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<NewEndpointForm>({
    key: "frontend",
    displayName: "Frontend",
    internalMode: "traefikHost",
    internalUrl: "",
    internalHost: "",
    internalPath: "/",
    publicUrl: "",
    intervalSec: "60",
    timeoutMs: "5000",
    degradedMs: "2000",
  });

  const canSubmit = useMemo(() => {
    if (form.key.trim().length === 0) return false;
    if (form.displayName.trim().length === 0) return false;
    if (form.internalPath.trim().length === 0) return false;
    if (form.internalMode === "directUrl")
      return form.internalUrl.trim().length > 0;
    return form.internalHost.trim().length > 0;
  }, [form]);

  const mutation = useMutation({
    mutationFn: async () => {
      const intervalSec = Number.parseInt(form.intervalSec, 10);
      const timeoutMs = Number.parseInt(form.timeoutMs, 10);
      const degradedMs = Number.parseInt(form.degradedMs, 10);

      return await fetchJson({
        url: "/api/admin/endpoints",
        init: {
          method: "POST",
          headers: {
            ...adminHeaders({ token }),
            "content-type": "application/json",
          },
          body: JSON.stringify({
            serviceId,
            key: form.key.trim(),
            displayName: form.displayName.trim(),
            internalMode: form.internalMode,
            internalUrl:
              form.internalUrl.trim().length > 0
                ? form.internalUrl.trim()
                : null,
            internalHost:
              form.internalHost.trim().length > 0
                ? form.internalHost.trim()
                : null,
            internalPath: form.internalPath.trim(),
            publicUrl:
              form.publicUrl.trim().length > 0 ? form.publicUrl.trim() : null,
            intervalSec: Number.isFinite(intervalSec) ? intervalSec : 60,
            timeoutMs: Number.isFinite(timeoutMs) ? timeoutMs : 5000,
            degradedMs: Number.isFinite(degradedMs) ? degradedMs : 2000,
          }),
        },
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["adminServices"] });
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Add endpoint</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2">
        <Input
          placeholder="key (frontend/api)"
          value={form.key}
          onChange={(e) => setForm({ ...form, key: e.target.value })}
        />
        <Input
          placeholder="display name"
          value={form.displayName}
          onChange={(e) => setForm({ ...form, displayName: e.target.value })}
        />

        <select
          className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
          value={form.internalMode}
          onChange={(e) =>
            setForm({
              ...form,
              internalMode:
                e.target.value === "directUrl" ? "directUrl" : "traefikHost",
            })
          }
        >
          <option value="traefikHost">traefikHost</option>
          <option value="directUrl">directUrl</option>
        </select>
        <Input
          placeholder="internal path (e.g. /health or /)"
          value={form.internalPath}
          onChange={(e) => setForm({ ...form, internalPath: e.target.value })}
        />

        {form.internalMode === "directUrl" ? (
          <Input
            className="sm:col-span-2"
            placeholder="internal URL (e.g. http://service:3000/health)"
            value={form.internalUrl}
            onChange={(e) => setForm({ ...form, internalUrl: e.target.value })}
          />
        ) : (
          <Input
            className="sm:col-span-2"
            placeholder="internal host (e.g. ingramkalina.pl)"
            value={form.internalHost}
            onChange={(e) => setForm({ ...form, internalHost: e.target.value })}
          />
        )}

        <Input
          className="sm:col-span-2"
          placeholder="public URL (optional)"
          value={form.publicUrl}
          onChange={(e) => setForm({ ...form, publicUrl: e.target.value })}
        />

        <Input
          placeholder="intervalSec"
          value={form.intervalSec}
          onChange={(e) => setForm({ ...form, intervalSec: e.target.value })}
        />
        <Input
          placeholder="timeoutMs"
          value={form.timeoutMs}
          onChange={(e) => setForm({ ...form, timeoutMs: e.target.value })}
        />

        <Input
          placeholder="degradedMs"
          value={form.degradedMs}
          onChange={(e) => setForm({ ...form, degradedMs: e.target.value })}
        />
        <div className="flex items-center justify-end">
          <Button
            disabled={!canSubmit || mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            Create
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export const AdminPage = () => {
  const queryClient = useQueryClient();
  const admin = useAdminToken();
  const token = admin.token.value;

  const servicesQuery = useQuery({
    queryKey: ["adminServices"],
    enabled: admin.token.isSet,
    queryFn: async () => {
      return await fetchJson<AdminServicesResponse>({
        url: "/api/admin/services",
        init: {
          headers: adminHeaders({ token }),
        },
      });
    },
    refetchInterval: 10_000,
  });

  const [newService, setNewService] = useState<NewServiceForm>({
    slug: "",
    name: "",
    primaryDomain: "",
    publicStatusHost: "",
  });

  const canCreateService = useMemo(() => {
    if (!admin.token.isSet) return false;
    if (newService.slug.trim().length === 0) return false;
    if (newService.name.trim().length === 0) return false;
    if (newService.publicStatusHost.trim().length === 0) return false;
    return true;
  }, [admin.token.isSet, newService]);

  const createService = useMutation({
    mutationFn: async () => {
      return await fetchJson({
        url: "/api/admin/services",
        init: {
          method: "POST",
          headers: {
            ...adminHeaders({ token }),
            "content-type": "application/json",
          },
          body: JSON.stringify({
            slug: newService.slug.trim(),
            name: newService.name.trim(),
            primaryDomain:
              newService.primaryDomain.trim().length > 0
                ? newService.primaryDomain.trim()
                : null,
            publicStatusHost: newService.publicStatusHost.trim(),
          }),
        },
      });
    },
    onSuccess: async () => {
      setNewService({
        slug: "",
        name: "",
        primaryDomain: "",
        publicStatusHost: "",
      });
      await queryClient.invalidateQueries({ queryKey: ["adminServices"] });
    },
  });

  const servicesContent = (() => {
    if (!admin.token.isSet) {
      return (
        <Card>
          <CardContent className="text-muted-foreground p-6 text-sm">
            Set your token to load services.
          </CardContent>
        </Card>
      );
    }

    if (servicesQuery.isPending) {
      return (
        <Card>
          <CardContent className="text-muted-foreground p-6 text-sm">
            Loading…
          </CardContent>
        </Card>
      );
    }

    if (servicesQuery.isError || !servicesQuery.data) {
      return (
        <Card>
          <CardContent className="p-6 text-sm">
            Failed to load admin services.
          </CardContent>
        </Card>
      );
    }

    return (
      <div className="grid gap-4">
        {servicesQuery.data.services.map((service) => {
          return (
            <Card key={service.id}>
              <CardHeader className="space-y-1">
                <CardTitle>{service.name}</CardTitle>
                <div className="text-muted-foreground text-sm">
                  {service.publicStatusHost}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-2">
                  {service.endpoints.length === 0 ? (
                    <div className="text-muted-foreground text-sm">
                      No endpoints yet.
                    </div>
                  ) : (
                    service.endpoints.map((endpoint) => {
                      const state = endpoint.latest?.state ?? "UNKNOWN";
                      const latency =
                        endpoint.latest?.latencyMs === null ||
                        endpoint.latest?.latencyMs === undefined
                          ? "—"
                          : `${endpoint.latest.latencyMs}ms`;

                      return (
                        <div
                          key={endpoint.id}
                          className="flex items-center justify-between rounded-md border px-3 py-2"
                        >
                          <div>
                            <div className="font-medium">
                              {endpoint.displayName} ({endpoint.key})
                            </div>
                            <div className="text-muted-foreground text-xs">
                              latency: {latency}
                            </div>
                          </div>
                          <StatusBadge state={state} />
                        </div>
                      );
                    })
                  )}
                </div>

                <AddEndpointForm serviceId={service.id} token={token} />
                <DokployConfigForm
                  serviceId={service.id}
                  token={token}
                  initial={service.deploy}
                />
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  })();

  return (
    <main className="mx-auto w-full max-w-6xl space-y-6 px-4 py-8">
      <section className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Admin</h1>
        <div className="text-muted-foreground text-sm">
          Write operations require `ADMIN_WRITE_TOKEN` (stored only in your
          browser).
        </div>
      </section>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Admin token</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Input
            placeholder="x-admin-token"
            value={admin.token.value}
            onChange={(e) => admin.token.set(e.target.value)}
          />
          <Button variant="secondary" onClick={() => servicesQuery.refetch()}>
            Refresh
          </Button>
          <Button variant="ghost" onClick={() => admin.token.clear()}>
            Clear
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Add service</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <Input
            placeholder="slug (e.g. ingramkalina)"
            value={newService.slug}
            onChange={(e) =>
              setNewService({ ...newService, slug: e.target.value })
            }
          />
          <Input
            placeholder="name (e.g. ingramkalina.pl)"
            value={newService.name}
            onChange={(e) =>
              setNewService({ ...newService, name: e.target.value })
            }
          />
          <Input
            placeholder="primaryDomain (optional)"
            value={newService.primaryDomain}
            onChange={(e) =>
              setNewService({ ...newService, primaryDomain: e.target.value })
            }
          />
          <Input
            placeholder="publicStatusHost (e.g. status.ingramkalina.pl)"
            value={newService.publicStatusHost}
            onChange={(e) =>
              setNewService({ ...newService, publicStatusHost: e.target.value })
            }
          />

          <div className="flex justify-end sm:col-span-2">
            <Button
              disabled={!canCreateService || createService.isPending}
              onClick={() => createService.mutate()}
            >
              Create service
            </Button>
          </div>
        </CardContent>
      </Card>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Services</h2>
        {servicesContent}
      </section>
    </main>
  );
};
