import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/Card";
import { Button } from "../ui/Button";
import { Table, THead, TBody, Th, Td } from "../ui/Table";
import { WorkspaceState, TopsisDetail, TopsisResult, Alternative, Criteria } from "@/lib/spk/types";

type TopsisTab = "decision" | "normalized" | "weighted" | "ideal" | "distance" | "score";

interface TopsisModuleProps {
  workspace: WorkspaceState;
  activeTab: TopsisTab;
  onTabChange: (tab: TopsisTab) => void;
  onCalculate: () => void;
}

export const TopsisModule = ({
  workspace,
  activeTab,
  onTabChange,
  onCalculate,
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
            Hasil TOPSIS belum tersedia. Pastikan bobot AHP sudah dihitung dan matriks keputusan lengkap.
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
          Detail langkah demi langkah metode TOPSIS.
        </CardDescription>
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
