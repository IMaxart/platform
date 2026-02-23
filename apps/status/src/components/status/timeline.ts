import type { CheckState } from "~/server/types";

type CheckPoint = {
  atMs: number;
  ok: 0 | 1;
  degraded: 0 | 1;
};

const checkState = ({ point }: { point: CheckPoint }): CheckState => {
  if (point.ok === 0) return "DOWN";
  if (point.degraded === 1) return "DEGRADED";
  return "UP";
};

const pickWorse = ({ a, b }: { a: CheckState; b: CheckState }): CheckState => {
  const rank: Record<CheckState, number> = {
    DOWN: 0,
    DEGRADED: 1,
    UP: 2,
    UNKNOWN: 3,
  };

  return rank[a] <= rank[b] ? a : b;
};

export const bucketChecks = ({
  points,
  startMs,
  endMs,
  bucketMs,
}: {
  points: CheckPoint[];
  startMs: number;
  endMs: number;
  bucketMs: number;
}): CheckState[] => {
  const bucketCount = Math.max(0, Math.ceil((endMs - startMs) / bucketMs));
  const buckets = Array.from(
    { length: bucketCount },
    () => "UNKNOWN" as CheckState
  );

  for (const point of points) {
    if (point.atMs < startMs || point.atMs >= endMs) continue;

    const idx = Math.floor((point.atMs - startMs) / bucketMs);
    const prev = buckets[idx];
    const next = pickWorse({ a: prev, b: checkState({ point }) });
    buckets[idx] = next;
  }

  return buckets;
};
