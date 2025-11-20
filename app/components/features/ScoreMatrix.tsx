import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/Card";
import { Input } from "../ui/Input";
import { Alternative, Criteria, WorkspaceState } from "@/lib/spk/types";

interface ScoreMatrixProps {
  alternatives: Alternative[];
  criteria: Criteria[];
  scores: WorkspaceState["scores"];
  onScoreChange: (altId: string, critId: string, value: string) => void;
}

export const ScoreMatrix = ({
  alternatives,
  criteria,
  scores,
  onScoreChange,
}: ScoreMatrixProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Matriks Keputusan</CardTitle>
        <CardDescription>
          Input nilai untuk setiap alternatif berdasarkan kriteria yang ada.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {alternatives.length === 0 || criteria.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            Harap lengkapi data alternatif dan kriteria terlebih dahulu.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-muted-foreground">
                <tr>
                  <th className="h-12 px-4 align-middle font-medium min-w-[150px]">Alternatif</th>
                  {criteria.map((c) => (
                    <th key={c.id} className="h-12 px-4 align-middle font-medium min-w-[120px]">
                      {c.name} ({c.code})
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {alternatives.map((alt) => (
                  <tr key={alt.id} className="border-t border-slate-200 hover:bg-slate-50 transition-colors">
                    <td className="p-4 font-medium">
                      {alt.name} <span className="text-muted-foreground text-xs">({alt.code})</span>
                    </td>
                    {criteria.map((c) => {
                      const val = scores[alt.id]?.[c.id];
                      return (
                        <td key={c.id} className="p-2">
                          <Input
                            type="number"
                            step="any"
                            className="w-full"
                            value={val ?? ""}
                            onChange={(e) => onScoreChange(alt.id, c.id, e.target.value)}
                            placeholder="0"
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
      </CardContent>
    </Card>
  );
};
