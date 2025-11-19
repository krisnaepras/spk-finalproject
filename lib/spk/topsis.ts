import type {
  Alternative,
  Criteria,
  TopsisDetail,
  TopsisResult,
  WorkspaceState,
} from "./types";

function ensureMatrixCompleteness(
  alternatives: Alternative[],
  criteria: Criteria[],
  scores: WorkspaceState["scores"],
) {
  alternatives.forEach((alt) => {
    criteria.forEach((crit) => {
      const value = scores[alt.id]?.[crit.id];
      if (value === null || value === undefined || Number.isNaN(Number(value))) {
        throw new Error(
          `Nilai matriks keputusan untuk ${alt.name} - ${crit.name} belum lengkap`,
        );
      }
    });
  });
}

export function calculateTopsis(
  alternatives: Alternative[],
  criteria: Criteria[],
  scores: WorkspaceState["scores"],
  weightsMap: Record<string, number>,
): { results: TopsisResult[]; detail: TopsisDetail } {
  if (!alternatives.length) {
    throw new Error("Tidak ada alternatif untuk dihitung");
  }
  if (!criteria.length) {
    throw new Error("Tidak ada kriteria aktif");
  }

  ensureMatrixCompleteness(alternatives, criteria, scores);

  const orderedCriteria = [...criteria].sort(
    (a, b) => (a.position ?? 0) - (b.position ?? 0),
  );

  const matrix = alternatives.map((alt) =>
    orderedCriteria.map((crit) => Number(scores[alt.id]?.[crit.id] ?? 0)),
  );

  const columnDivisors = orderedCriteria.map((_, columnIndex) => {
    const sumSquares = matrix.reduce((sum, row) => sum + Math.pow(row[columnIndex], 2), 0);
    return Math.sqrt(sumSquares);
  });

  const normalizedMatrix = matrix.map((row) =>
    row.map((value, columnIndex) => value / (columnDivisors[columnIndex] || 1)),
  );

  const weightsArray = orderedCriteria.map((crit) => weightsMap[crit.id] ?? crit.weight ?? 0);
  const totalWeight = weightsArray.reduce((sum, weight) => sum + weight, 0);
  const normalizedWeights =
    totalWeight > 0 ? weightsArray.map((weight) => weight / totalWeight) : weightsArray;

  const weightedMatrix = normalizedMatrix.map((row) =>
    row.map((value, columnIndex) => value * normalizedWeights[columnIndex]),
  );

  const idealPositive: number[] = [];
  const idealNegative: number[] = [];

  orderedCriteria.forEach((criteriaItem, columnIndex) => {
    const columnValues = weightedMatrix.map((row) => row[columnIndex]);
    const maxValue = Math.max(...columnValues);
    const minValue = Math.min(...columnValues);

    if (criteriaItem.type === "BENEFIT") {
      idealPositive[columnIndex] = maxValue;
      idealNegative[columnIndex] = minValue;
    } else {
      idealPositive[columnIndex] = minValue;
      idealNegative[columnIndex] = maxValue;
    }
  });

  const distancesPlus = weightedMatrix.map((row) =>
    Math.sqrt(
      row.reduce((sum, value, columnIndex) => {
        const diff = value - idealPositive[columnIndex];
        return sum + diff * diff;
      }, 0),
    ),
  );

  const distancesMinus = weightedMatrix.map((row) =>
    Math.sqrt(
      row.reduce((sum, value, columnIndex) => {
        const diff = value - idealNegative[columnIndex];
        return sum + diff * diff;
      }, 0),
    ),
  );

  const rawResults = alternatives.map((alt, index) => {
    const dPlus = distancesPlus[index];
    const dMinus = distancesMinus[index];
    const score = dMinus / (dPlus + dMinus);

    return {
      alternativeId: alt.id,
      alternativeCode: alt.code,
      alternativeName: alt.name,
      score: Number(score.toFixed(6)),
      dPlus: Number(dPlus.toFixed(4)),
      dMinus: Number(dMinus.toFixed(4)),
      rank: 0,
    };
  });

  const sortedResults = [...rawResults].sort((a, b) => b.score - a.score);
  let currentRank = 0;
  let previousScore: number | null = null;

  sortedResults.forEach((result, index) => {
    if (previousScore === null || result.score < previousScore) {
      currentRank = index + 1;
    }
    result.rank = currentRank;
    previousScore = result.score;
  });

  const detail: TopsisDetail = {
    alternatives,
    criteria: orderedCriteria,
    decisionMatrix: matrix,
    normalizedMatrix,
    weightedMatrix,
    idealPositive,
    idealNegative,
    distancesPlus,
    distancesMinus,
  };

  return { results: sortedResults, detail };
}
