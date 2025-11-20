import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/Card";
import { Button } from "../ui/Button";
import { WorkspaceState, TopsisDetail, TopsisResult } from "@/lib/spk/types";

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

    const { detail, results } = { detail: workspace.topsisDetail, results: workspace.topsisResults };

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

const MatrixTable = ({ data, criteria, alternatives }: any) => (
  <div className="overflow-x-auto rounded-md border">
    <table className="w-full text-sm text-left">
      <thead className="bg-slate-50 text-muted-foreground">
        <tr>
          <th className="h-12 px-4 align-middle font-medium">Alternatif</th>
          {criteria.map((c: any) => (
            <th key={c.id} className="h-12 px-4 align-middle font-medium">{c.code}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {alternatives.map((alt: any, rowIndex: number) => (
          <tr key={alt.id} className="border-t border-slate-200 hover:bg-slate-50 transition-colors">
            <td className="p-4 font-medium">{alt.code}</td>
            {criteria.map((c: any, colIndex: number) => (
              <td key={c.id} className="p-4">
                {data[rowIndex]?.[colIndex]?.toFixed(4) ?? "-"}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const IdealSolutionTable = ({ idealPositive, idealNegative, criteria }: any) => (
  <div className="overflow-x-auto rounded-md border">
    <table className="w-full text-sm text-left">
      <thead className="bg-slate-50 text-muted-foreground">
        <tr>
          <th className="h-12 px-4 align-middle font-medium">Solusi Ideal</th>
          {criteria.map((c: any) => (
            <th key={c.id} className="h-12 px-4 align-middle font-medium">{c.code}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        <tr className="border-t border-slate-200 hover:bg-slate-50 transition-colors">
          <td className="p-4 font-medium text-emerald-600">Positif (A+)</td>
          {criteria.map((c: any, index: number) => (
            <td key={c.id} className="p-4 font-mono">{idealPositive[index]?.toFixed(4)}</td>
          ))}
        </tr>
        <tr className="border-t border-slate-200 hover:bg-slate-50 transition-colors">
          <td className="p-4 font-medium text-rose-600">Negatif (A-)</td>
          {criteria.map((c: any, index: number) => (
            <td key={c.id} className="p-4 font-mono">{idealNegative[index]?.toFixed(4)}</td>
          ))}
        </tr>
      </tbody>
    </table>
  </div>
);

const DistanceTable = ({ distancePositive, distanceNegative, alternatives }: any) => (
  <div className="overflow-x-auto rounded-md border">
    <table className="w-full text-sm text-left">
      <thead className="bg-slate-50 text-muted-foreground">
        <tr>
          <th className="h-12 px-4 align-middle font-medium">Alternatif</th>
          <th className="h-12 px-4 align-middle font-medium">Jarak ke A+ (D+)</th>
          <th className="h-12 px-4 align-middle font-medium">Jarak ke A- (D-)</th>
        </tr>
      </thead>
      <tbody>
        {alternatives.map((alt: any, index: number) => (
          <tr key={alt.id} className="border-t border-slate-200 hover:bg-slate-50 transition-colors">
            <td className="p-4 font-medium">{alt.name} ({alt.code})</td>
            <td className="p-4 font-mono">{distancePositive[index]?.toFixed(4)}</td>
            <td className="p-4 font-mono">{distanceNegative[index]?.toFixed(4)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const ScoreTable = ({ results, alternatives }: any) => (
  <div className="overflow-x-auto rounded-md border">
    <table className="w-full text-sm text-left">
      <thead className="bg-slate-50 text-muted-foreground">
        <tr>
          <th className="h-12 px-4 align-middle font-medium">Peringkat</th>
          <th className="h-12 px-4 align-middle font-medium">Alternatif</th>
          <th className="h-12 px-4 align-middle font-medium">Nilai Preferensi (V)</th>
        </tr>
      </thead>
      <tbody>
        {results.map((res: any, idx: number) => {
          const alt = alternatives.find((a: any) => a.id === res.alternativeId);
          return (
            <tr key={res.alternativeId} className="border-t border-slate-200 hover:bg-slate-50 transition-colors">
              <td className="p-4 font-bold">#{idx + 1}</td>
              <td className="p-4">{alt?.name} ({alt?.code})</td>
              <td className="p-4 font-mono font-semibold text-primary">{res.score.toFixed(4)}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  </div>
);
