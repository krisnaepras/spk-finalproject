import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/Card";
import { Badge } from "../ui/Badge";
import { WorkspaceState } from "@/lib/spk/types";
import { getWorkflowStatus } from "@/lib/spk/workspace";

interface DashboardViewProps {
  workspace: WorkspaceState;
  onNavigate: (tab: string) => void;
}

export const DashboardView = ({ workspace, onNavigate }: DashboardViewProps) => {
  const status = getWorkflowStatus(workspace);

  const steps = [
    {
      id: "alternatives",
      label: "Alternatif",
      desc: "Data kandidat keputusan",
      count: workspace.alternatives.length,
      valid: status.alternativesReady,
    },
    {
      id: "criteria",
      label: "Kriteria",
      desc: "Faktor penentu keputusan",
      count: workspace.criteria.length,
      valid: status.criteriaReady,
    },
    {
      id: "scores",
      label: "Matriks Keputusan",
      desc: "Nilai alternatif per kriteria",
      valid: status.scoresReady,
    },
    {
      id: "ahp",
      label: "Bobot AHP",
      desc: "Perhitungan prioritas kriteria",
      valid: status.ahpReady,
    },
    {
      id: "topsis",
      label: "Hasil TOPSIS",
      desc: "Perankingan akhir",
      valid: status.topsisReady,
    },
  ];

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      <Card className="col-span-full">
        <CardHeader>
          <CardTitle>Ringkasan Proyek</CardTitle>
          <CardDescription>
            Pantau status setiap tahap sebelum melanjutkan ke proses perhitungan keputusan.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {steps.map((step) => (
              <div
                key={step.id}
                className={`relative overflow-hidden rounded-lg border p-4 transition-all hover:shadow-[0_0_20px_rgba(6,182,212,0.3)] cursor-pointer ${
                  step.valid
                    ? "border-emerald-500/30 bg-emerald-500/10"
                    : "border-slate-200 bg-slate-50 hover:bg-slate-100"
                }`}
                onClick={() => onNavigate(step.id)}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-foreground">{step.label}</p>
                    <p className="text-xs text-muted-foreground">{step.desc}</p>
                  </div>
                  {step.valid ? (
                    <Badge variant="success">OK</Badge>
                  ) : (
                    <Badge variant="secondary">Pending</Badge>
                  )}
                </div>
                {step.count !== undefined && (
                  <p className="mt-3 text-2xl font-bold text-foreground">{step.count}</p>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="col-span-full lg:col-span-2">
        <CardHeader>
          <CardTitle>Informasi Proyek</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Nama Proyek</dt>
              <dd className="text-sm font-semibold text-foreground">
                {workspace.projectName || "Proyek Tanpa Nama"}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Terakhir Diubah</dt>
              <dd className="text-sm font-semibold text-foreground">
                {new Date().toLocaleDateString("id-ID", {
                  dateStyle: "full",
                })}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>
    </div>
  );
};
