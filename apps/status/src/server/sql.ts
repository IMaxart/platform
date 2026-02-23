export type SqlValue =
  | string
  | bigint
  | NodeJS.TypedArray
  | number
  | boolean
  | null;

export type SqlBindings = Record<string, SqlValue>;

export const named = (params: SqlBindings): SqlBindings => {
  const out: SqlBindings = {};

  for (const [key, value] of Object.entries(params)) {
    const safeKey = key.startsWith("$") ? key : `$${key}`;
    out[safeKey] = value;
  }

  return out;
};
