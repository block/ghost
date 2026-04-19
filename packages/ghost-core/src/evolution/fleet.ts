import { compareExpressions } from "../embedding/compare.js";
import { embeddingDistance } from "../embedding/embedding.js";
import type {
  FleetCluster,
  FleetComparison,
  FleetMember,
  FleetPair,
} from "../types.js";

export interface FleetClusterOptions {
  cluster?: boolean | { maxK?: number };
}

/**
 * Compare N expressions for an ecosystem-level view.
 * Computes pairwise distances, centroid, spread, and optional clusters.
 */
export function compareFleet(
  members: FleetMember[],
  options?: FleetClusterOptions,
): FleetComparison {
  const pairwise = computePairwise(members);
  const centroid = computeCentroid(members);
  const spread = computeSpread(members, centroid);

  const result: FleetComparison = {
    members,
    pairwise,
    centroid,
    spread,
  };

  const shouldCluster =
    options?.cluster === true ||
    (typeof options?.cluster === "object" && options.cluster);
  if (shouldCluster && members.length >= 3) {
    const maxK =
      typeof options?.cluster === "object" ? options.cluster.maxK : undefined;
    result.clusters = clusterMembers(members, maxK);
  }

  return result;
}

/**
 * Compute pairwise distances between all fleet members.
 */
function computePairwise(members: FleetMember[]): FleetPair[] {
  const pairs: FleetPair[] = [];

  for (let i = 0; i < members.length; i++) {
    for (let j = i + 1; j < members.length; j++) {
      const a = members[i];
      const b = members[j];
      const comparison = compareExpressions(a.expression, b.expression);

      const dimensions: Record<string, number> = {};
      for (const [key, delta] of Object.entries(comparison.dimensions)) {
        dimensions[key] = delta.distance;
      }

      pairs.push({
        a: a.id,
        b: b.id,
        distance: comparison.distance,
        dimensions,
      });
    }
  }

  return pairs.sort((a, b) => a.distance - b.distance);
}

/**
 * Compute the centroid (average embedding) of all fleet members.
 */
function computeCentroid(members: FleetMember[]): number[] {
  if (members.length === 0) return [];

  const dim = members[0].expression.embedding.length;
  const centroid = new Array(dim).fill(0);

  for (const member of members) {
    for (let i = 0; i < dim; i++) {
      centroid[i] += member.expression.embedding[i] ?? 0;
    }
  }

  for (let i = 0; i < dim; i++) {
    centroid[i] /= members.length;
  }

  return centroid;
}

/**
 * Compute the spread (average embedding distance from centroid).
 */
function computeSpread(members: FleetMember[], centroid: number[]): number {
  if (members.length === 0) return 0;

  let totalDistance = 0;
  for (const member of members) {
    totalDistance += embeddingDistance(member.expression.embedding, centroid);
  }

  return totalDistance / members.length;
}

/**
 * K-means++ initialization: select initial centroids with probability
 * proportional to squared distance from nearest existing centroid.
 */
function kmeansppInit(embeddings: number[][], k: number): number[][] {
  const centroids: number[][] = [];

  // First centroid: pick randomly (deterministically use first for reproducibility)
  centroids.push([...embeddings[0]]);

  for (let c = 1; c < k; c++) {
    // Compute squared distances to nearest centroid for each point
    const distances = embeddings.map((emb) => {
      let minDist = Infinity;
      for (const centroid of centroids) {
        const dist = embeddingDistance(emb, centroid);
        minDist = Math.min(minDist, dist * dist);
      }
      return minDist;
    });

    // Pick the point with maximum distance (deterministic version of weighted random)
    let maxDist = -1;
    let maxIdx = 0;
    for (let i = 0; i < distances.length; i++) {
      if (distances[i] > maxDist) {
        maxDist = distances[i];
        maxIdx = i;
      }
    }
    centroids.push([...embeddings[maxIdx]]);
  }

  return centroids;
}

/**
 * Compute within-cluster sum of squared distances (WCSS).
 */
function computeWCSS(
  embeddings: number[][],
  assignments: number[],
  centroids: number[][],
): number {
  let wcss = 0;
  for (let i = 0; i < embeddings.length; i++) {
    const dist = embeddingDistance(embeddings[i], centroids[assignments[i]]);
    wcss += dist * dist;
  }
  return wcss;
}

/**
 * Run k-means with iterative refinement.
 * Returns cluster assignments and final centroids.
 */
function runKMeans(
  embeddings: number[][],
  k: number,
  maxIterations: number = 10,
): { assignments: number[]; centroids: number[][] } {
  const dim = embeddings[0].length;
  let centroids = kmeansppInit(embeddings, k);
  let assignments = new Array(embeddings.length).fill(0);

  for (let iter = 0; iter < maxIterations; iter++) {
    // Assignment step: assign each point to nearest centroid
    const newAssignments = embeddings.map((emb) => {
      let minDist = Infinity;
      let minIdx = 0;
      for (let c = 0; c < centroids.length; c++) {
        const dist = embeddingDistance(emb, centroids[c]);
        if (dist < minDist) {
          minDist = dist;
          minIdx = c;
        }
      }
      return minIdx;
    });

    // Check convergence
    const changed = newAssignments.some((a, i) => a !== assignments[i]);
    assignments = newAssignments;
    if (!changed) break;

    // Update step: recompute centroids
    const newCentroids: number[][] = Array.from({ length: k }, () =>
      new Array(dim).fill(0),
    );
    const counts = new Array(k).fill(0);

    for (let i = 0; i < embeddings.length; i++) {
      const c = assignments[i];
      counts[c]++;
      for (let d = 0; d < dim; d++) {
        newCentroids[c][d] += embeddings[i][d];
      }
    }

    for (let c = 0; c < k; c++) {
      if (counts[c] > 0) {
        for (let d = 0; d < dim; d++) {
          newCentroids[c][d] /= counts[c];
        }
      }
    }

    centroids = newCentroids;
  }

  return { assignments, centroids };
}

/**
 * Adaptive clustering using elbow method to select optimal K.
 * Falls back to K=2 if no clear elbow is found.
 */
function clusterMembers(members: FleetMember[], maxK?: number): FleetCluster[] {
  if (members.length < 3) {
    return [
      {
        memberIds: members.map((m) => m.id),
        centroid: computeCentroid(members),
      },
    ];
  }

  const embeddings = members.map((m) => m.expression.embedding);
  const kMax = Math.min(maxK ?? 6, members.length - 1);

  // Run k-means for K=1 through kMax, collect WCSS
  const results: {
    k: number;
    wcss: number;
    assignments: number[];
    centroids: number[][];
  }[] = [];

  for (let k = 1; k <= kMax; k++) {
    if (k === 1) {
      // K=1: everything in one cluster
      const centroid = computeCentroid(members);
      const assignments = new Array(members.length).fill(0);
      const wcss = computeWCSS(embeddings, assignments, [centroid]);
      results.push({ k, wcss, assignments, centroids: [centroid] });
    } else {
      const { assignments, centroids } = runKMeans(embeddings, k);
      const wcss = computeWCSS(embeddings, assignments, centroids);
      results.push({ k, wcss, assignments, centroids });
    }
  }

  // Elbow method: find K where marginal WCSS decrease drops below 20%
  let bestK = 2;
  if (results.length >= 3) {
    for (let i = 1; i < results.length - 1; i++) {
      const prevDecrease = results[i - 1].wcss - results[i].wcss;
      const nextDecrease = results[i].wcss - results[i + 1].wcss;
      if (prevDecrease > 0 && nextDecrease / prevDecrease < 0.2) {
        bestK = results[i].k;
        break;
      }
    }
    // If no elbow found, default to K=2
    if (bestK === 2 && results.length > 1) {
      bestK = 2;
    }
  }

  const chosen = results.find((r) => r.k === bestK) ?? results[1] ?? results[0];

  // Build clusters from assignments
  const clusterMap = new Map<number, FleetMember[]>();
  for (let i = 0; i < members.length; i++) {
    const cluster = chosen.assignments[i];
    if (!clusterMap.has(cluster)) clusterMap.set(cluster, []);
    clusterMap.get(cluster)?.push(members[i]);
  }

  return [...clusterMap.values()]
    .filter((group) => group.length > 0)
    .map((group) => ({
      memberIds: group.map((m) => m.id),
      centroid: computeCentroid(group),
    }));
}
