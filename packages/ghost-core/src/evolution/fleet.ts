import { compareFingerprints } from "../fingerprint/compare.js";
import { embeddingDistance } from "../fingerprint/embedding.js";
import type {
  FleetCluster,
  FleetComparison,
  FleetMember,
  FleetPair,
} from "../types.js";

/**
 * Compare N fingerprints for an ecosystem-level view.
 * Computes pairwise distances, centroid, spread, and optional clusters.
 */
export function compareFleet(
  members: FleetMember[],
  options?: { cluster?: boolean },
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

  if (options?.cluster && members.length >= 3) {
    result.clusters = clusterMembers(members);
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
      const comparison = compareFingerprints(a.fingerprint, b.fingerprint);

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

  const dim = members[0].fingerprint.embedding.length;
  const centroid = new Array(dim).fill(0);

  for (const member of members) {
    for (let i = 0; i < dim; i++) {
      centroid[i] += member.fingerprint.embedding[i] ?? 0;
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
    totalDistance += embeddingDistance(member.fingerprint.embedding, centroid);
  }

  return totalDistance / members.length;
}

/**
 * Basic k-means-style clustering (k=2 for now).
 * Splits the fleet into two groups by finding the two most distant members
 * and assigning the rest to the nearest one.
 */
function clusterMembers(members: FleetMember[]): FleetCluster[] {
  if (members.length < 3) {
    return [
      {
        memberIds: members.map((m) => m.id),
        centroid: computeCentroid(members),
      },
    ];
  }

  // Find the two most distant members as initial centroids
  let maxDist = -1;
  let seedA = 0;
  let seedB = 1;

  for (let i = 0; i < members.length; i++) {
    for (let j = i + 1; j < members.length; j++) {
      const dist = embeddingDistance(
        members[i].fingerprint.embedding,
        members[j].fingerprint.embedding,
      );
      if (dist > maxDist) {
        maxDist = dist;
        seedA = i;
        seedB = j;
      }
    }
  }

  // Assign each member to the nearest seed
  const groupA: FleetMember[] = [];
  const groupB: FleetMember[] = [];

  for (let i = 0; i < members.length; i++) {
    const distToA = embeddingDistance(
      members[i].fingerprint.embedding,
      members[seedA].fingerprint.embedding,
    );
    const distToB = embeddingDistance(
      members[i].fingerprint.embedding,
      members[seedB].fingerprint.embedding,
    );

    if (distToA <= distToB) {
      groupA.push(members[i]);
    } else {
      groupB.push(members[i]);
    }
  }

  const clusters: FleetCluster[] = [];

  if (groupA.length > 0) {
    clusters.push({
      memberIds: groupA.map((m) => m.id),
      centroid: computeCentroid(groupA),
    });
  }

  if (groupB.length > 0) {
    clusters.push({
      memberIds: groupB.map((m) => m.id),
      centroid: computeCentroid(groupB),
    });
  }

  return clusters;
}
