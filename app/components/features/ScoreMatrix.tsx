import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/Card";
import { Input } from "../ui/Input";
import { Table, THead, TBody, Th, Td } from "../ui/Table";
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
          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
            <Table>
              <THead>
                <tr>
                  <Th className="min-w-[150px]">Alternatif</Th>
                  {criteria.map((c) => (
                    <Th key={c.id} className="min-w-[120px]">
                      {c.name} ({c.code})
                    </Th>
                  ))}
                </tr>
              </THead>
              <TBody>
                {alternatives.map((alt) => (
                  <tr key={alt.id} className="border-t border-slate-100 hover:bg-slate-50 transition-colors">
                    <Td className="font-medium">
                      {alt.name} <span className="text-muted-foreground text-xs">({alt.code})</span>
                    </Td>
                    {criteria.map((c) => {
                      const val = scores[alt.id]?.[c.id];
                      return (
                        <Td key={c.id} className="p-2">
                          <Input
                            type="number"
                            step="any"
                            className="w-full"
                            value={val ?? ""}
                            onChange={(e) => onScoreChange(alt.id, c.id, e.target.value)}
                            placeholder="0"
                          />
                        </Td>
                      );
                    })}
                  </tr>
                ))}
              </TBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
