import { describe, it, expect } from "bun:test";
import {
  computeScore,
  computeRankingScore,
  inheritedPriorMean,
  decayWeight,
  clusterDiscount,
  DEFAULT_SCORING_CONFIG,
  type ScoringStamp,
} from "./score";

// Builds an independent, full-weight, fresh "worked" stamp. Each call gets a
// unique clusterId so stamps are treated as independent unless told otherwise.
let seq = 0;
function stamp(overrides: Partial<ScoringStamp> = {}): ScoringStamp {
  seq += 1;
  return {
    outcome: "worked",
    baseWeight: 1,
    personWeight: 1,
    competenceWeight: 1,
    ageDays: 0,
    clusterId: `ind-${seq.toString()}`,
    ...overrides,
  };
}

function manyIndependent(n: number, overrides: Partial<ScoringStamp> = {}): ScoringStamp[] {
  return Array.from({ length: n }, () => stamp(overrides));
}

describe("decayWeight", () => {
  it("is 1 at age 0 and halves every half-life", () => {
    expect(decayWeight(0, 182)).toBe(1);
    expect(decayWeight(182, 182)).toBeCloseTo(0.5, 10);
    expect(decayWeight(364, 182)).toBeCloseTo(0.25, 10);
  });
});

describe("clusterDiscount", () => {
  it("leaves independent stamps untouched", () => {
    expect(clusterDiscount(1, 0.9)).toBe(1);
    expect(clusterDiscount(50, 0)).toBe(1);
  });

  it("collapses a correlated cluster via effective sample size", () => {
    // n_eff = 50 / (1 + 49 * 0.9) = 1.109; per-stamp fraction = n_eff / 50.
    expect(clusterDiscount(50, 0.9)).toBeCloseTo(1.108 / 50, 3);
  });
});

describe("computeScore gating", () => {
  it("is unverified with no stamps", () => {
    expect(computeScore([])).toEqual({ status: "unverified", effectiveWeight: 0 });
  });

  it("is unverified below the minimum effective weight", () => {
    // Two full-weight stamps = W 2, below the gate of 3.
    const result = computeScore(manyIndependent(2));
    expect(result.status).toBe("unverified");
  });
});

describe("computeScore confidence (3 cannot outrank 300)", () => {
  it("shrinks a sparse all-worked guide toward the prior", () => {
    // W = 3, S = 3 -> (3 + 8*0.7) / (3 + 8) = 0.7818 -> 782.
    const result = computeScore(manyIndependent(3));
    expect(result).toEqual({ status: "verified", score: 782, effectiveWeight: 3 });
  });

  it("ranks a 300-worked guide above a 3-worked guide", () => {
    const few = computeScore(manyIndependent(3));
    const many = computeScore(manyIndependent(300));
    if (few.status !== "verified" || many.status !== "verified")
      throw new Error("expected verified");
    expect(many.score).toBeGreaterThan(few.score);
    expect(many.score).toBe(992); // (300 + 5.6) / 308 -> 0.9922
  });
});

describe("computeScore outcomes", () => {
  it("drags the score down when failures match successes (symmetric)", () => {
    const allWorked = computeScore(manyIndependent(10, { outcome: "worked" }));
    const mixed = computeScore([
      ...manyIndependent(10, { outcome: "worked" }),
      ...manyIndependent(10, { outcome: "didnt_work" }),
    ]);
    if (allWorked.status !== "verified" || mixed.status !== "verified") {
      throw new Error("expected verified");
    }
    // 10 worked -> 867; 10 worked + 10 didn't -> (10 + 5.6)/28 = 0.557 -> 557.
    expect(allWorked.score).toBe(867);
    expect(mixed.score).toBe(557);
    expect(mixed.score).toBeLessThan(allWorked.score);
  });

  it("places worked-with-caveats between worked and didn't-work", () => {
    const caveats = computeScore(manyIndependent(10, { outcome: "worked_with_caveats" }));
    const worked = computeScore(manyIndependent(10, { outcome: "worked" }));
    const failed = computeScore(manyIndependent(10, { outcome: "didnt_work" }));
    if (
      caveats.status !== "verified" ||
      worked.status !== "verified" ||
      failed.status !== "verified"
    ) {
      throw new Error("expected verified");
    }
    expect(caveats.score).toBeLessThan(worked.score);
    expect(caveats.score).toBeGreaterThan(failed.score);
  });
});

describe("computeScore Sybil resistance", () => {
  it("collapses a lockstep burst so it cannot clear the gate, while independent stamps do", () => {
    const burst = manyIndependent(50, { outcome: "worked" }).map((s) => ({
      ...s,
      clusterId: "burst",
    }));
    const rho = new Map([["burst", 0.9]]);

    const clustered = computeScore(burst, rho);
    const independent = computeScore(manyIndependent(50, { outcome: "worked" }));

    // 50 lockstep accounts collapse to ~1.1 effective weight, below the gate of 3.
    expect(clustered.status).toBe("unverified");
    expect(clustered.effectiveWeight).toBeCloseTo(1.108, 2);
    // 50 genuinely independent stamps clear it comfortably.
    expect(independent.status).toBe("verified");
    expect(independent.effectiveWeight).toBe(50);
  });
});

describe("computeScore freshness", () => {
  it("counts an old stamp for less than a fresh one", () => {
    const fresh = computeScore(manyIndependent(10, { ageDays: 0 }));
    const stale = computeScore(
      manyIndependent(10, { ageDays: DEFAULT_SCORING_CONFIG.halfLifeDays }),
    );
    if (fresh.status !== "verified" || stale.status !== "verified") {
      throw new Error("expected verified");
    }
    // Stale stamps weigh half as much, so the same 10 worked shrink further to the prior.
    expect(stale.effectiveWeight).toBeCloseTo(fresh.effectiveWeight / 2, 6);
    expect(stale.score).toBeLessThan(fresh.score);
  });
});

describe("inheritedPriorMean", () => {
  it("is the global prior for a first version (no predecessor)", () => {
    expect(inheritedPriorMean(null)).toBe(DEFAULT_SCORING_CONFIG.priorMean);
  });

  it("regresses a strong lineage toward the mean but keeps it above the prior", () => {
    // 0.7 + 0.7 * (0.9 - 0.7) = 0.84, above the 0.7 global prior.
    expect(inheritedPriorMean(900)).toBeCloseTo(0.84, 10);
    expect(inheritedPriorMean(900)).toBeGreaterThan(DEFAULT_SCORING_CONFIG.priorMean);
  });

  it("pulls a weak lineage below the prior, never to zero", () => {
    // 0.7 + 0.7 * (0.5 - 0.7) = 0.56; even a 0 lineage lands at 0.21, not 0.
    expect(inheritedPriorMean(500)).toBeCloseTo(0.56, 10);
    expect(inheritedPriorMean(0)).toBeCloseTo(0.21, 10);
  });

  it("leaves a prior already at the mean unchanged", () => {
    expect(inheritedPriorMean(700)).toBeCloseTo(0.7, 10);
  });
});

describe("computeRankingScore", () => {
  it("is always present (ungated), unlike the gated display score", () => {
    // Two stamps are below the display gate, so computeScore is unverified, but
    // the ranking estimate still returns a number search can sort on.
    expect(computeScore(manyIndependent(2)).status).toBe("unverified");
    expect(computeRankingScore(manyIndependent(2), 0.7)).toBeGreaterThan(0);
  });

  it("equals the scaled prior when there are no stamps", () => {
    expect(computeRankingScore([], 0.84)).toBe(840);
    expect(computeRankingScore([], DEFAULT_SCORING_CONFIG.priorMean)).toBe(700);
  });

  it("starts a fresh cut of a strong guide above a brand-new guide", () => {
    const freshCutOfStrong = computeRankingScore([], inheritedPriorMean(900));
    const brandNew = computeRankingScore([], inheritedPriorMean(null));
    expect(freshCutOfStrong).toBe(840);
    expect(brandNew).toBe(700);
    expect(freshCutOfStrong).toBeGreaterThan(brandNew);
  });

  it("lets the version's own stamps move it off the inherited prior", () => {
    const weakPrior = inheritedPriorMean(500); // 0.56
    const withWorked = computeRankingScore(manyIndependent(3, { outcome: "worked" }), weakPrior);
    const withFailures = computeRankingScore(
      manyIndependent(3, { outcome: "didnt_work" }),
      weakPrior,
    );
    expect(withWorked).toBeGreaterThan(560);
    expect(withFailures).toBeLessThan(560);
  });

  it("converges toward the global mean over repeated unstamped republishes", () => {
    const v1 = computeRankingScore([], inheritedPriorMean(900)); // 840
    const v2 = computeRankingScore([], inheritedPriorMean(v1)); // 798
    const v3 = computeRankingScore([], inheritedPriorMean(v2)); // ~769
    expect(v1).toBeGreaterThan(v2);
    expect(v2).toBeGreaterThan(v3);
    expect(v3).toBeGreaterThan(700); // approaching the mean, still above it
  });
});
