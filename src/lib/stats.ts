/**
 * Statistics engine for A/B testing.
 * Real implementations: power analysis, two-proportion z-test,
 * normal-approx confidence intervals, and a simplified always-valid
 * sequential test (mixture SPRT) for early stopping.
 */

// Standard normal CDF via erf approximation (Abramowitz & Stegun 7.1.26)
export function normalCdf(z: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989422804014327 * Math.exp(-(z * z) / 2);
  const p =
    d *
    t *
    (0.31938153 +
      t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
  return z > 0 ? 1 - p : p;
}

export function normalPpf(p: number): number {
  // Inverse normal via rational approximation (Beasley-Springer-Moro)
  if (p <= 0) return -Infinity;
  if (p >= 1) return Infinity;
  const a = [
    -3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2,
    1.38357751867269e2, -3.066479806614716e1, 2.506628277459239,
  ];
  const b = [
    -5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2,
    6.680131188771972e1, -1.328068155288572e1,
  ];
  const q = p < 0.02425 ? p : 1 - p;
  let u: number;
  if (q < 0.02425) {
    // tail
    u = Math.sqrt(-2 * Math.log(q));
    u =
      (((((a[0] * u + a[1]) * u + a[2]) * u + a[3]) * u + a[4]) * u + a[5]) /
      ((((b[0] * u + b[1]) * u + b[2]) * u + b[3]) * u + b[4]) * u + 1;
  } else {
    // central — use p (not q) so the sign is correct for p > 0.5
    u = p - 0.5;
    const r = u * u;
    u =
      (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * u /
      (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
  }
  return p < 0.02425 ? -u : u;
}

const Z = {
  "0.90": 1.6448536269514722,
  "0.95": 1.959963984540054,
  "0.99": 2.5758293035489004,
};

export function zCritical(confidence: number): number {
  return Z[confidence.toFixed(2)] ?? normalPpf(1 - (1 - confidence) / 2);
}

/**
 * Minimum sample size per variant for a binary metric (eval pass rate).
 * n = 2 * (z_alpha/2 + z_beta)^2 * p*(1-p) / delta^2
 */
export function sampleSizeBinary(opts: {
  baselineRate: number; // p
  mde: number; // minimum detectable effect (absolute)
  confidenceLevel: number; // e.g. 0.95
  power?: number; // 1 - beta, default 0.8
}): number {
  const { baselineRate: p, mde: delta, confidenceLevel } = opts;
  const power = opts.power ?? 0.8;
  const zAlpha = zCritical(confidenceLevel);
  const zBeta = normalPpf(power);
  const n = (2 * Math.pow(zAlpha + zBeta, 2) * p * (1 - p)) / Math.pow(delta, 2);
  return Math.ceil(n);
}

/**
 * Minimum sample size for a continuous metric given baseline std.
 */
export function sampleSizeContinuous(opts: {
  baselineStd: number;
  mde: number; // absolute detectable difference in means
  confidenceLevel: number;
  power?: number;
}): number {
  const { baselineStd: sigma, mde: delta, confidenceLevel } = opts;
  const power = opts.power ?? 0.8;
  const zAlpha = zCritical(confidenceLevel);
  const zBeta = normalPpf(power);
  const n = (2 * Math.pow(zAlpha + zBeta, 2) * Math.pow(sigma, 2)) / Math.pow(delta, 2);
  return Math.ceil(n);
}

export interface VariantStats {
  name: string;
  n: number;
  mean: number;
  std: number;
  sum: number;
  // for binary
  successes?: number;
  rate?: number;
}

/** Compute stats from raw values. */
export function summarize(name: string, values: number[]): VariantStats {
  const n = values.length;
  if (n === 0) return { name, n: 0, mean: 0, std: 0, sum: 0 };
  const sum = values.reduce((a, b) => a + b, 0);
  const mean = sum / n;
  const variance =
    n > 1 ? values.reduce((a, b) => a + (b - mean) ** 2, 0) / (n - 1) : 0;
  const std = Math.sqrt(variance);
  return { name, n, mean, std, sum };
}

/** Two-proportion z-test. Returns z, two-tailed p-value, and CI for the difference. */
export function twoProportionTest(
  control: { n: number; successes: number },
  variant: { n: number; successes: number },
  confidenceLevel = 0.95
): {
  z: number;
  pValue: number;
  significant: boolean;
  ciLow: number;
  ciHigh: number;
  diff: number;
  uplift: number;
} {
  const p1 = control.successes / control.n;
  const p2 = variant.successes / variant.n;
  const pooled = (control.successes + variant.successes) / (control.n + variant.n);
  const se = Math.sqrt(pooled * (1 - pooled) * (1 / control.n + 1 / variant.n));
  const z = se === 0 ? 0 : (p2 - p1) / se;
  const pValue = 2 * (1 - normalCdf(Math.abs(z)));
  const zc = zCritical(confidenceLevel);
  const seUnpooled = Math.sqrt(
    (p1 * (1 - p1)) / control.n + (p2 * (1 - p2)) / variant.n
  );
  const diff = p2 - p1;
  const ciLow = diff - zc * seUnpooled;
  const ciHigh = diff + zc * seUnpooled;
  return {
    z,
    pValue,
    significant: pValue < 1 - confidenceLevel,
    ciLow,
    ciHigh,
    diff,
    uplift: p1 === 0 ? 0 : (p2 - p1) / p1,
  };
}

/** Welch's t-test for continuous metrics (unequal variances). */
export function welchTTest(
  control: VariantStats,
  variant: VariantStats,
  confidenceLevel = 0.95
): {
  t: number;
  df: number;
  pValue: number;
  significant: boolean;
  ciLow: number;
  ciHigh: number;
  diff: number;
  uplift: number;
} {
  const { mean: m1, std: s1, n: n1 } = control;
  const { mean: m2, std: s2, n: n2 } = variant;
  const se = Math.sqrt((s1 * s1) / n1 + (s2 * s2) / n2);
  const t = se === 0 ? 0 : (m2 - m1) / se;
  // Welch–Satterthwaite df
  const num = Math.pow(s1 * s1 / n1 + s2 * s2 / n2, 2);
  const den =
    Math.pow(s1 * s1 / n1, 2) / (n1 - 1) + Math.pow(s2 * s2 / n2, 2) / (n2 - 1);
  const df = den === 0 ? 1 : num / den;
  // Approximate p-value using normal for large df (good enough for dashboard)
  const pValue = 2 * (1 - normalCdf(Math.abs(t)));
  const zc = zCritical(confidenceLevel);
  const diff = m2 - m1;
  const ciLow = diff - zc * se;
  const ciHigh = diff + zc * se;
  return {
    t,
    df,
    pValue,
    significant: pValue < 1 - confidenceLevel,
    ciLow,
    ciHigh,
    diff,
    uplift: m1 === 0 ? 0 : (m2 - m1) / Math.abs(m1),
  };
}

/**
 * Simplified always-valid sequential test (mixture SPRT).
 * Uses a Gaussian mixture over the variance; statistic grows with evidence.
 * Returns a safe-to-stop flag when always-valid p-value < threshold.
 */
export function sequentialTest(opts: {
  observations: { variant: string; value: number }[];
  controlName: string;
  variancePrior: number;
  threshold?: number; // always-valid p-value threshold (default 0.01)
}): {
  stoppedVariant: string | null;
  alwaysValidP: number;
  evidence: { variant: string; llr: number }[];
} {
  const threshold = opts.threshold ?? 0.01;
  // Group by variant
  const groups: Record<string, number[]> = {};
  for (const o of opts.observations) {
    (groups[o.variant] ??= []).push(o.value);
  }
  const controlVals = groups[opts.controlName] ?? [];
  if (controlVals.length === 0) {
    return { stoppedVariant: null, alwaysValidP: 1, evidence: [] };
  }
  const controlMean = controlVals.reduce((a, b) => a + b, 0) / controlVals.length;
  const evidence: { variant: string; llr: number }[] = [];
  let minP = 1;
  let stopped: string | null = null;
  for (const [name, vals] of Object.entries(groups)) {
    if (name === opts.controlName) continue;
    const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
    // Log-likelihood ratio against null (no difference)
    const tau2 = opts.variancePrior;
    const n = vals.length;
    const delta = mean - controlMean;
    // mixture-normal mSPRT statistic
    const llr =
      0.5 *
      Math.log(1 + n * tau2) -
      (delta * delta) /
        (2 * (1 / n + 1 / (n * tau2)) * (1 + n * tau2));
    const alwaysP = Math.exp(-Math.max(0, llr));
    evidence.push({ variant: name, llr });
    if (alwaysP < minP) {
      minP = alwaysP;
      if (alwaysP < threshold) stopped = name;
    }
  }
  return { stoppedVariant: stopped, alwaysValidP: minP, evidence };
}

/** Format p-value with significance stars. */
export function formatP(p: number): string {
  if (p < 0.001) return "< 0.001";
  if (p < 0.01) return p.toFixed(4);
  return p.toFixed(3);
}

export function significanceStars(p: number): string {
  if (p < 0.001) return "***";
  if (p < 0.01) return "**";
  if (p < 0.05) return "*";
  return "";
}
