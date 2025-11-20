import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/Card";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Badge } from "../ui/Badge";
import { Criteria, WorkspaceState } from "@/lib/spk/types";

interface AhpModuleProps {
  criteria: Criteria[];
  pairwiseMatrix: WorkspaceState["pairwiseMatrix"];
  ahpResult: WorkspaceState["ahpResult"];
  onPairwiseChange: (rowId: string, colId: string, value: number) => void;
  onCalculate: () => void;
  onConfirmInconsistent: () => void;
  isOverrideApproved: boolean;
}

export const AhpModule = ({
  criteria,
  pairwiseMatrix,
  ahpResult,
  onPairwiseChange,
  onCalculate,
  onConfirmInconsistent,
  isOverrideApproved,
}: AhpModuleProps) => {
  const percentFormatter = new Intl.NumberFormat("id-ID", {
    style: "percent",
    minimumFractionDigits: 1,
    maximumFractionDigits: 2,
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Matriks Perbandingan Berpasangan</CardTitle>
          <CardDescription>
            Isi nilai perbandingan antar kriteria (skala 1-9).
          </CardDescription>
        </CardHeader>
        <CardContent>
          {criteria.length < 2 ? (
            <div className="text-center text-muted-foreground py-4">
              Minimal perlukan 2 kriteria untuk melakukan perbandingan.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-muted-foreground">
                  <tr>
                    <th className="h-12 px-4 align-middle font-medium">Kriteria</th>
                    {criteria.map((c) => (
                      <th key={c.id} className="h-12 px-4 align-middle font-medium min-w-[100px]">
                        {c.code}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {criteria.map((row, i) => (
                    <tr key={row.id} className="border-t border-slate-200 hover:bg-slate-50 transition-colors">
                      <td className="p-4 font-medium">
                        {row.name} ({row.code})
                      </td>
                      {criteria.map((col, j) => {
                        const isDiagonal = i === j;
                        const isLowerTriangle = i > j;
                        const value =
                          pairwiseMatrix[row.id]?.[col.id] ?? (isDiagonal ? 1 : 0);

                        return (
                          <td key={col.id} className="p-2">
                            <Input
                              type="number"
                              min="0.1"
                              max="9"
                              step="any"
                              disabled={isDiagonal || isLowerTriangle}
                              className={isDiagonal ? "bg-slate-100 text-muted-foreground" : ""}
                              value={value}
                              onChange={(e) =>
                                onPairwiseChange(row.id, col.id, parseFloat(e.target.value))
                              }
                            />
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="mt-4 flex justify-end">
            <Button onClick={onCalculate} disabled={criteria.length < 2}>
              Hitung Bobot AHP
            </Button>
          </div>
        </CardContent>
      </Card>

      {ahpResult && (
        <Card>
          <CardHeader>
            <CardTitle>Hasil Perhitungan AHP</CardTitle>
            <CardDescription>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-2">
                <div className="flex flex-col">
                  <span className="text-xs text-muted-foreground">Lambda Max (λmax)</span>
                  <span className="font-bold text-foreground">
                    {ahpResult.lambdaMax.toFixed(4)}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs text-muted-foreground">Consistency Index (CI)</span>
                  <span className="font-bold text-foreground">
                    {ahpResult.ci.toFixed(4)}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs text-muted-foreground">Consistency Ratio (CR)</span>
                  <span
                    className={`font-bold ${
                      ahpResult.isConsistent ? "text-emerald-600" : "text-rose-600"
                    }`}
                  >
                    {ahpResult.cr.toFixed(4)} {ahpResult.isConsistent ? "✓" : "✗"}
                  </span>
                </div>
              </div>
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!ahpResult.isConsistent && !isOverrideApproved && (
              <div className="mb-4 rounded-lg border border-rose-300 bg-rose-50 p-4 text-rose-700">
                <p className="mb-2 font-semibold">Nilai CR {">"} 0.1 (Tidak Konsisten)</p>
                <p className="text-sm mb-3">
                  Disarankan untuk meninjau kembali matriks perbandingan. Jika Anda yakin, Anda dapat
                  melanjutkan dengan bobot ini.
                </p>
                <Button variant="destructive" size="sm" onClick={onConfirmInconsistent}>
                  Gunakan Bobot Ini
                </Button>
              </div>
            )}

            <div className="rounded-md border">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-muted-foreground">
                  <tr>
                    <th className="h-12 px-4 align-middle font-medium">Kode</th>
                    <th className="h-12 px-4 align-middle font-medium">Kriteria</th>
                    <th className="h-12 px-4 align-middle font-medium">Bobot Prioritas</th>
                    <th className="h-12 px-4 align-middle font-medium">Persentase</th>
                  </tr>
                </thead>
                <tbody>
                  {criteria.map((c) => (
                    <tr key={c.id} className="border-t border-slate-200 hover:bg-slate-50 transition-colors">
                      <td className="p-4 font-medium">{c.code}</td>
                      <td className="p-4">{c.name}</td>
                      <td className="p-4 font-mono">
                        {(ahpResult.weights[c.id] ?? 0).toFixed(4)}
                      </td>
                      <td className="p-4 font-semibold text-primary">
                        {percentFormatter.format(ahpResult.weights[c.id] ?? 0)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
