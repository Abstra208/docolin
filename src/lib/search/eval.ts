// Search-quality metrics for offline evaluation. With no query logging
// (privacy-first), a hand-built judgment set (query -> relevant guides) scored
// by these functions is the only instrument for tuning the ranking weights and
// for deciding whether a reranker is worth its cost. These are the pure metrics;
// the judgment set is populated as real content lands, then run against the
// retrieval core (searchGuides) to produce recall@k and nDCG@k.

/** A relevance judgment: a guide and how relevant it is to a query (0 = not). */
export interface Judgment {
  docoId: string;
  /** Graded relevance: 0 none, 1 marginal, 2 relevant, 3 ideal (any scale works). */
  grade: number;
}

export interface JudgedQuery {
  query: string;
  judgments: Judgment[];
}

/**
 * Fraction of a query's relevant guides that appear in the top-k retrieved. The
 * retrieval-stage metric: is the right guide even in the candidate pool? A high
 * recall@50 with low nDCG@5 means ordering, not retrieval, is the bottleneck,
 * which is the signal to add a reranker (search spec 11).
 */
export function recallAtK(retrievedDocoIds: string[], judgments: Judgment[], k: number): number {
  const relevant = new Set(judgments.filter((j) => j.grade > 0).map((j) => j.docoId));
  if (relevant.size === 0) return 0;
  let found = 0;
  for (const id of retrievedDocoIds.slice(0, k)) {
    if (relevant.has(id)) found += 1;
  }
  return found / relevant.size;
}

// Discounted cumulative gain with exponential gain (2^grade - 1) and log2 rank
// discount, the standard formulation.
function dcg(grades: number[]): number {
  let sum = 0;
  for (let i = 0; i < grades.length; i += 1) {
    sum += (Math.pow(2, grades[i]) - 1) / Math.log2(i + 2);
  }
  return sum;
}

/**
 * Normalized discounted cumulative gain over the top-k. The ordering-quality
 * metric: are the most relevant guides ranked highest? 1.0 is the ideal order,
 * 0 when there is nothing relevant to find.
 */
export function ndcgAtK(retrievedDocoIds: string[], judgments: Judgment[], k: number): number {
  const gradeById = new Map(judgments.map((j) => [j.docoId, j.grade]));
  const retrievedGrades = retrievedDocoIds.slice(0, k).map((id) => gradeById.get(id) ?? 0);
  const idealGrades = judgments
    .map((j) => j.grade)
    .filter((grade) => grade > 0)
    .sort((a, b) => b - a)
    .slice(0, k);
  const idealDcg = dcg(idealGrades);
  if (idealDcg === 0) return 0;
  return dcg(retrievedGrades) / idealDcg;
}
