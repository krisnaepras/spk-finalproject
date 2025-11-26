import { RANDOM_INDEX } from "./constants";
import type { AhpComparisonMatrix, AhpResult, Criteria } from "./types";

export function normalizePairwiseMatrix(
  criteriaIds: string[],
  existing: AhpComparisonMatrix
): AhpComparisonMatrix {
  const matrix: AhpComparisonMatrix = {};

  criteriaIds.forEach((rowId) => {
    matrix[rowId] = matrix[rowId] ?? {};
    criteriaIds.forEach((colId) => {
      if (rowId === colId) {
        matrix[rowId]![colId] = 1;
        return;
      }

      const existingValue = existing[rowId]?.[colId];
      if (existingValue && existingValue > 0) {
        matrix[rowId]![colId] = existingValue;
        matrix[colId] = matrix[colId] ?? {};
        matrix[colId]![rowId] = 1 / existingValue;
      } else if (existing[colId]?.[rowId]) {
        const value = existing[colId]![rowId];
        matrix[rowId]![colId] = 1 / value;
        matrix[colId] = matrix[colId] ?? {};
        matrix[colId]![rowId] = value;
      } else {
        matrix[rowId]![colId] = 1;
        matrix[colId] = matrix[colId] ?? {};
        matrix[colId]![rowId] = 1;
      }
    });
  });

  return matrix;
}

export function updatePairwiseValue(
  matrix: AhpComparisonMatrix,
  rowId: string,
  colId: string,
  value: number
): AhpComparisonMatrix {
  const clone: AhpComparisonMatrix = {
    ...matrix,
    [rowId]: { ...(matrix[rowId] ?? {}) },
    [colId]: { ...(matrix[colId] ?? {}) },
  };

  clone[rowId]![colId] = value;
  clone[colId]![rowId] = 1 / value;
  return clone;
}

export function calculateAhpResult(
  criteria: Criteria[],
  matrix: AhpComparisonMatrix
): AhpResult {
  if (!criteria.length) {
    throw new Error("Kriteria belum tersedia");
  }

  const orderedCriteria = [...criteria].sort(
    (a, b) => (a.position ?? 0) - (b.position ?? 0)
  );
  const ids = orderedCriteria.map((c) => c.id);
  const normalizedMatrix = normalizePairwiseMatrix(ids, matrix);
  const n = ids.length;
  const rawMatrix = ids.map((row) =>
    ids.map((col) => normalizedMatrix[row]?.[col] ?? 1)
  );

  const columnSums = rawMatrix.reduce<number[]>((sums, row) => {
    row.forEach((value, index) => {
      sums[index] = (sums[index] ?? 0) + value;
    });
    return sums;
  }, new Array(n).fill(0));

  const normalized = rawMatrix.map((row) =>
    row.map((value, index) => value / (columnSums[index] || 1))
  );

  const weights = normalized.map(
    (row) => row.reduce((sum, value) => sum + value, 0) / n
  );

  const Aw = rawMatrix.map((row) =>
    row.reduce((sum, aij, j) => sum + aij * weights[j], 0)
  );

  const lambdaMax =
    Aw.reduce((sum, si, i) => sum + si / (weights[i] || 1e-12), 0) / n;

  const ci = n > 1 ? (lambdaMax - n) / (n - 1) : 0;
  const ri = RANDOM_INDEX[n] ?? RANDOM_INDEX[5];
  const cr = ri === 0 ? 0 : ci / ri;

  const weightMap: Record<string, number> = {};
  ids.forEach((id, index) => {
    weightMap[id] = Number(weights[index].toFixed(6));
  });

  return {
    weights: weightMap,
    lambdaMax: Number(lambdaMax.toFixed(4)),
    ci: Number(ci.toFixed(4)),
    cr: Number(cr.toFixed(4)),
    isConsistent: cr <= 0.1,
  };
}
