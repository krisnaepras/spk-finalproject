import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/Card";
import { Badge } from "../ui/Badge";
import { Table, THead, TBody, Th, Td } from "../ui/Table";
import { WorkspaceState } from "@/lib/spk/types";

interface ResultsViewProps {
  workspace: WorkspaceState;
}

export const ResultsView = ({ workspace }: ResultsViewProps) => {
  const results = workspace.topsisResults;

  if (!results || results.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-muted-foreground">
            Hasil pemeringkatan belum tersedia. Silakan jalankan perhitungan TOPSIS terlebih dahulu.
          </p>
        </CardContent>
      </Card>
    );
  }

  const winner = workspace.alternatives.find((a) => a.id === results[0].alternativeId);

  return (
    <div className="space-y-6">
      <Card className="bg-gradient-to-br from-cyan-500/10 to-blue-600/10 border-cyan-500/20 shadow-[0_0_30px_rgba(6,182,212,0.15)]">
        <CardHeader>
          <CardTitle className="text-primary">Rekomendasi Terbaik</CardTitle>
          <CardDescription>
            Berdasarkan perhitungan AHP dan TOPSIS, alternatif terbaik adalah:
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 text-2xl font-bold text-white shadow-[0_0_20px_rgba(6,182,212,0.5)]">
              1
            </div>
            <div>
              <h3 className="text-2xl font-bold text-foreground">{winner?.name}</h3>
              <p className="text-muted-foreground">{winner?.description || "Tidak ada deskripsi"}</p>
              <Badge variant="success" className="mt-2">
                Skor: {results[0].score.toFixed(4)}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Peringkat Lengkap</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
            <Table>
              <THead>
                <tr>
                  <Th>Peringkat</Th>
                  <Th>Kode</Th>
                  <Th>Alternatif</Th>
                  <Th>Skor Akhir</Th>
                </tr>
              </THead>
              <TBody>
                {results.map((res, idx) => {
                  const alt = workspace.alternatives.find((a) => a.id === res.alternativeId);
                  return (
                    <tr key={res.alternativeId} className="border-t border-slate-100 hover:bg-slate-50 transition-colors">
                      <Td className="font-bold">#{idx + 1}</Td>
                      <Td className="font-medium">{alt?.code}</Td>
                      <Td>{alt?.name}</Td>
                      <Td className="font-mono font-semibold">
                        {res.score.toFixed(4)}
                      </Td>
                    </tr>
                  );
                })}
              </TBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
