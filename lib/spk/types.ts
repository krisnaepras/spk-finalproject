export type CriteriaType = "BENEFIT" | "COST";
export type WeightingMode = "AHP" | "CUSTOM";

export interface Alternative {
  id: string;
  code: string;
  name: string;
  description?: string;
}

export interface Criteria {
  id: string;
  code: string;
  name: string;
  description?: string;
  type: CriteriaType;
  weight?: number;
  position?: number;
}

export interface AlternativeScore {
  alternativeId: string;
  criteriaId: string;
  value: number | null;
}

export interface AhpComparisonMatrix {
  [criteriaId: string]: {
    [criteriaId: string]: number;
  };
}

export interface AhpResult {
  weights: Record<string, number>;
  lambdaMax: number;
  ci: number;
  cr: number;
  isConsistent: boolean;
}

export interface TopsisResult {
  alternativeId: string;
  alternativeCode: string;
  alternativeName: string;
  score: number;
  dPlus: number;
  dMinus: number;
  rank: number;
}

export interface TopsisDetail {
  alternatives: Alternative[];
  criteria: Criteria[];
  decisionMatrix: number[][];
  normalizedMatrix: number[][];
  weightedMatrix: number[][];
  idealPositive: number[];
  idealNegative: number[];
  distancesPlus: number[];
  distancesMinus: number[];
}

export interface ImportPreview {
  columns: string[];
  rows: Record<string, string | number | null>[];
  rowCount: number;
  source: "excel" | "csv" | "json" | "sql";
}

export interface ColumnRole {
  idColumn?: string;
  nameColumn?: string;
  descriptionColumn?: string;
}

export interface CriteriaSelection {
  column: string;
  name: string;
  type: CriteriaType;
}

export interface WorkflowStatus {
  alternativesReady: boolean;
  criteriaReady: boolean;
  scoresReady: boolean;
  ahpReady: boolean;
  weightingReady: boolean;
  topsisReady: boolean;
}

export interface WorkspaceState {
  projectName: string;
  alternatives: Alternative[];
  criteria: Criteria[];
  scores: Record<string, Record<string, number | null>>;
  pairwiseMatrix: AhpComparisonMatrix;
  ahpResult?: AhpResult;
  weightingMode: WeightingMode;
  customWeights: Record<string, number | null | undefined>;
  topsisResults?: TopsisResult[];
  topsisDetail?: TopsisDetail;
  lastImportSummary?: {
    source: string;
    importedAlternatives: number;
    importedCriteria: number;
    timestamp: string;
  };
}
