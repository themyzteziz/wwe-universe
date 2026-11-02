// US-110 — Many matches produce no event
export interface ManyMatchesProduceSettings {
  enabled: boolean;
}

const DEFAULTS: ManyMatchesProduceSettings = { enabled: true };

export function loadManyMatchesProduceSettings(env: Record<string, string | undefined> = process.env): ManyMatchesProduceSettings {
  const raw = env.MANY_MATCHES_PRODUCE_ENABLED;
  if (raw === undefined) return DEFAULTS;
  if (raw !== "true" && raw !== "false") throw new Error("MANY_MATCHES_PRODUCE_ENABLED must be true or false.");
  return { enabled: raw === "true" };
}
