import { normalizePairwiseMatrix } from "./ahp";
import { MAX_CRITERIA } from "./constants";
import type {
  AhpComparisonMatrix,
  Alternative,
  Criteria,
  WorkflowStatus,
  WorkspaceState,
} from "./types";

export const createInitialWorkspaceState = (): WorkspaceState => ({
  projectName: "Proyek SPK Generik",
  alternatives: [],
  criteria: [],
  scores: {},
  pairwiseMatrix: {},
});

export function syncScoresStructure(
  alternatives: Alternative[],
  criteria: Criteria[],
  previousScores: WorkspaceState["scores"],
): WorkspaceState["scores"] {
  const nextScores: WorkspaceState["scores"] = {};

  alternatives.forEach((alt) => {
    nextScores[alt.id] = nextScores[alt.id] ?? {};
    criteria.forEach((crit) => {
      const existing = previousScores[alt.id]?.[crit.id];
      nextScores[alt.id]![crit.id] = existing ?? null;
    });
  });

  return nextScores;
}

export function removeAlternativeFromScores(
  scores: WorkspaceState["scores"],
  alternativeId: string,
): WorkspaceState["scores"] {
  const clone = { ...scores };
  delete clone[alternativeId];
  return clone;
}

export function removeCriteriaFromScores(
  scores: WorkspaceState["scores"],
  criteriaId: string,
): WorkspaceState["scores"] {
  const clone: WorkspaceState["scores"] = {};
  Object.entries(scores).forEach(([altId, entries]) => {
    const nextEntries = { ...entries };
    delete nextEntries[criteriaId];
    clone[altId] = nextEntries;
  });
  return clone;
}

export function trimToMaxCriteria(criteria: Criteria[]): Criteria[] {
  return criteria.slice(0, MAX_CRITERIA);
}

export function sanitizePairwiseMatrix(
  criteria: Criteria[],
  matrix: AhpComparisonMatrix,
): AhpComparisonMatrix {
  const ids = criteria.map((item) => item.id);
  const normalized = normalizePairwiseMatrix(ids, matrix);

  const sanitized: AhpComparisonMatrix = {};
  ids.forEach((rowId) => {
    sanitized[rowId] = {};
    ids.forEach((colId) => {
      sanitized[rowId]![colId] = normalized[rowId]?.[colId] ?? 1;
    });
  });

  return sanitized;
}

export function removeCriteriaFromMatrix(
  matrix: AhpComparisonMatrix,
  criteriaId: string,
): AhpComparisonMatrix {
  const clone: AhpComparisonMatrix = {};
  Object.entries(matrix).forEach(([rowId, row]) => {
    if (rowId === criteriaId) {
      return;
    }
    const filteredRow: Record<string, number> = {};
    Object.entries(row).forEach(([colId, value]) => {
      if (colId !== criteriaId) {
        filteredRow[colId] = value;
      }
    });
    clone[rowId] = filteredRow;
  });
  return clone;
}

export function isScoreMatrixComplete(state: WorkspaceState): boolean {
  if (!state.alternatives.length || !state.criteria.length) {
    return false;
  }
  return state.alternatives.every((alt) =>
    state.criteria.every((crit) => state.scores[alt.id]?.[crit.id] !== null && state.scores[alt.id]?.[crit.id] !== undefined),
  );
}

export function getWorkflowStatus(state: WorkspaceState): WorkflowStatus {
  return {
    alternativesReady: state.alternatives.length > 0,
    criteriaReady: state.criteria.length > 0,
    scoresReady: isScoreMatrixComplete(state),
    ahpReady: Boolean(state.ahpResult && Object.keys(state.ahpResult.weights).length === state.criteria.length),
    topsisReady: Boolean(state.topsisResults?.length),
  };
}
