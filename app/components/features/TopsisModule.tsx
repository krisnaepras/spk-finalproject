import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/Card";
import { Button } from "../ui/Button";
import { Table, THead, TBody, Th, Td } from "../ui/Table";
import { Input } from "../ui/Input";
import { WorkspaceState, TopsisDetail, TopsisResult, Alternative, Criteria } from "@/lib/spk/types";

type TopsisTab = "decision" | "normalized" | "weighted" | "ideal" | "distance" | "score";

interface TopsisModuleProps {
  workspace: WorkspaceState;
  activeTab: TopsisTab;
  onTabChange: (tab: TopsisTab) => void;
  onCalculate: () => void;
  weightingMode: WorkspaceState["weightingMode"];
  customWeights: WorkspaceState["customWeights"];
  onWeightingModeChange: (mode: WorkspaceState["weightingMode"]) => void;
  onCustomWeightChange: (criteriaId: string, value: string) => void;
}

export const TopsisModule = ({
  workspace,
  activeTab,
  onTabChange,
  onCalculate,
  weightingMode,
  customWeights,
  onWeightingModeChange,
  onCustomWeightChange,
}: TopsisModuleProps) => {
  const tabs: { id: TopsisTab; label: string }[] = [
    { id: "decision", label: "Matriks Keputusan (X)" },
    { id: "normalized", label: "Normalisasi (R)" },
    { id: "weighted", label: "Bobot (Y)" },
    { id: "ideal", label: "A+ & A-" },
    { id: "distance", label: "D+ & D-" },
    { id: "score", label: "Nilai V" },
  ];

  const renderContent = () => {
    if (!workspace.topsisDetail || !workspace.topsisResults) {
      return (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-muted-foreground mb-4">
            Hasil TOPSIS belum tersedia. Pastikan sumber bobot dipilih
            ({weightingMode === "CUSTOM" ? "isi bobot custom" : "hitung bobot AHP"}) dan matriks keputusan lengkap.
          </p>
          <Button onClick={onCalculate}>Jalankan Perhitungan TOPSIS</Button>
        </div>
      );
    }

    const detail: TopsisDetail = workspace.topsisDetail;
    const results: TopsisResult[] = workspace.topsisResults;

    // Use the alternatives and criteria from the detail to ensure index alignment
    const alternatives = detail.alternatives;
    const criteria = detail.criteria;

    switch (activeTab) {
      case "decision":
        return <MatrixTable data={detail.decisionMatrix} criteria={criteria} alternatives={alternatives} />;
      case "normalized":
        return <MatrixTable data={detail.normalizedMatrix} criteria={criteria} alternatives={alternatives} />;
      case "weighted":
        return <MatrixTable data={detail.weightedMatrix} criteria={criteria} alternatives={alternatives} />;
      case "ideal":
        return <IdealSolutionTable idealPositive={detail.idealPositive} idealNegative={detail.idealNegative} criteria={criteria} />;
      case "distance":
        return <DistanceTable distancePositive={detail.distancesPlus} distanceNegative={detail.distancesMinus} alternatives={alternatives} />;
      case "score":
        return <ScoreTable results={results} alternatives={alternatives} />;
      default:
        return null;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Perhitungan TOPSIS</CardTitle>
        <CardDescription>
          Detail langkah demi langkah metode TOPSIS. Pilih skenario bobot sebelum menjalankan perhitungan.
        </CardDescription>
        <div className="mt-4 space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-900">Skenario Bobot</p>
              <p className="text-xs text-slate-600">
                Pilih sumber bobot kriteria: hasil AHP atau isi manual (custom).
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant={weightingMode === "AHP" ? "primary" : "outline"}
                size="sm"
                onClick={() => onWeightingModeChange("AHP")}
              >
                Pakai Bobot AHP
              </Button>
              <Button
                variant={weightingMode === "CUSTOM" ? "primary" : "outline"}
                size="sm"
                onClick={() => onWeightingModeChange("CUSTOM")}
              >
                Bobot Custom
              </Button>
            </div>
          </div>

          {weightingMode === "AHP" ? (
            <div className="rounded-lg border border-emerald-100 bg-white p-3 text-sm text-emerald-900">
              {workspace.ahpResult ? (
                <div className="flex flex-wrap items-center gap-3">
                  <p className="font-semibold">Bobot AHP siap</p>
                  <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                    CR: {workspace.ahpResult.cr.toFixed(4)}
                  </span>
                  {!workspace.ahpResult.isConsistent && (
                    <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
                      CR &gt; 0.1 (perlu konfirmasi)
                    </span>
                  )}
                </div>
              ) : (
                <p className="text-sm text-emerald-900">
                  Hitung dulu bobot AHP pada tab AHP. Bobot terbaru akan otomatis dipakai di TOPSIS.
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-slate-600">
                Isi bobot custom per kriteria. Nilai akan dinormalisasi otomatis sebelum perhitungan TOPSIS.
              </p>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {workspace.criteria.map((crit) => (
                  <label key={crit.id} className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-slate-900">
                        {crit.code} – {crit.name}
                      </span>
                      <span className="text-[11px] uppercase tracking-wide text-slate-500">{crit.type}</span>
                    </div>
                    <Input
                      className="mt-2"
                      type="number"
                      min="0"
                      step="0.01"
                      value={customWeights?.[crit.id] ?? ""}
                      onChange={(e) => onCustomWeightChange(crit.id, e.target.value)}
                      placeholder="contoh: 1.5"
                    />
                  </label>
                ))}
              </div>
              <p className="text-xs text-slate-600">
                Tips: gunakan angka proporsional (mis. 3 berarti 3× lebih penting daripada bobot 1). Kami akan
                normalisasi agar total = 1.
              </p>
            </div>
          )}
        </div>
        <div className="flex flex-wrap gap-2 mt-4">
          {tabs.map((tab) => (
            <Button
              key={tab.id}
              variant={activeTab === tab.id ? "primary" : "outline"}
              size="sm"
              onClick={() => onTabChange(tab.id)}
            >
              {tab.label}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        {renderContent()}
      </CardContent>
    </Card>
  );
};

// Helper Components for Tables

type MatrixTableProps = {
  data: number[][];
  criteria: Criteria[];
  alternatives: Alternative[];
};

const MatrixTable = ({ data, criteria, alternatives }: MatrixTableProps) => (
  <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
    <Table>
      <THead>
        <tr>
          <Th>Alternatif</Th>
          {criteria.map((c) => (
            <Th key={c.id}>{c.code}</Th>
          ))}
        </tr>
      </THead>
      <TBody>
        {alternatives.map((alt, rowIndex) => (
          <tr key={alt.id} className="border-t border-slate-100 hover:bg-slate-50 transition-colors">
            <Td className="font-medium">{alt.code}</Td>
            {criteria.map((c, colIndex) => (
              <Td key={c.id}>{data[rowIndex]?.[colIndex]?.toFixed(4) ?? "-"}</Td>
            ))}
          </tr>
        ))}
      </TBody>
    </Table>
  </div>
);

type IdealProps = { idealPositive: number[]; idealNegative: number[]; criteria: Criteria[] };
const IdealSolutionTable = ({ idealPositive, idealNegative, criteria }: IdealProps) => (
  <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
    <Table>
      <THead>
        <tr>
          <Th>Solusi Ideal</Th>
          {criteria.map((c) => (
            <Th key={c.id}>{c.code}</Th>
          ))}
        </tr>
      </THead>
      <TBody>
        <tr className="border-t border-slate-100 hover:bg-slate-50 transition-colors">
          <Td className="font-medium text-emerald-600">Positif (A+)</Td>
          {criteria.map((c, index) => (
            <Td key={c.id} className="font-mono">{idealPositive[index]?.toFixed(4)}</Td>
          ))}
        </tr>
        <tr className="border-t border-slate-100 hover:bg-slate-50 transition-colors">
          <Td className="font-medium text-rose-600">Negatif (A-)</Td>
          {criteria.map((c, index) => (
            <Td key={c.id} className="font-mono">{idealNegative[index]?.toFixed(4)}</Td>
          ))}
        </tr>
      </TBody>
    </Table>
  </div>
);

type DistanceProps = { distancePositive: number[]; distanceNegative: number[]; alternatives: Alternative[] };
const DistanceTable = ({ distancePositive, distanceNegative, alternatives }: DistanceProps) => (
  <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
    <Table>
      <THead>
        <tr>
          <Th>Alternatif</Th>
          <Th>Jarak ke A+ (D+)</Th>
          <Th>Jarak ke A- (D-)</Th>
        </tr>
      </THead>
      <TBody>
        {alternatives.map((alt, index) => (
          <tr key={alt.id} className="border-t border-slate-100 hover:bg-slate-50 transition-colors">
            <Td className="font-medium">{alt.name} ({alt.code})</Td>
            <Td className="font-mono">{distancePositive[index]?.toFixed(4)}</Td>
            <Td className="font-mono">{distanceNegative[index]?.toFixed(4)}</Td>
          </tr>
        ))}
      </TBody>
    </Table>
  </div>
);

type ScoreProps = { results: TopsisResult[]; alternatives: Alternative[] };
const ScoreTable = ({ results, alternatives }: ScoreProps) => (
  <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
    <Table>
      <THead>
        <tr>
          <Th>Peringkat</Th>
          <Th>Alternatif</Th>
          <Th>Nilai Preferensi (V)</Th>
        </tr>
      </THead>
      <TBody>
        {results.map((res, idx) => {
          const alt = alternatives.find((a) => a.id === res.alternativeId);
          return (
            <tr key={res.alternativeId} className="border-t border-slate-100 hover:bg-slate-50 transition-colors">
              <Td className="font-bold">#{idx + 1}</Td>
              <Td>{alt?.name} ({alt?.code})</Td>
              <Td className="font-mono font-semibold text-primary">{res.score.toFixed(4)}</Td>
            </tr>
          );
        })}
      </TBody>
    </Table>
  </div>
);
