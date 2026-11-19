// Shared fast-check settings. Tests must not need network or keys.
export const FC_RUNS = 100;
export const FC_RUNS_CHEAP = 300;

export const fcConfig = { numRuns: FC_RUNS } as const;
export const fcCheapConfig = { numRuns: FC_RUNS_CHEAP } as const;
