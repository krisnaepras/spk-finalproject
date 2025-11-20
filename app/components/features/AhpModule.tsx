"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/Card";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Criteria, WorkspaceState } from "@/lib/spk/types";
import { useState } from "react";

interface AhpModuleProps {
  criteria: Criteria[];
  pairwiseMatrix: WorkspaceState["pairwiseMatrix"];
  ahpResult: WorkspaceState["ahpResult"];
  onPairwiseChange: (rowId: string, colId: string, value: number) => void;
  onCalculate: () => void;
  onConfirmInconsistent: () => void;
  isOverrideApproved: boolean;
}

interface AiRecommendation {
  row: string;
  col: string;
  value: number;
  reason: string;
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
  const [isLoadingAi, setIsLoadingAi] = useState(false);
  const [aiRecommendations, setAiRecommendations] = useState<AiRecommendation[] | null>(null);
  const [aiNote, setAiNote] = useState<string>("");
  const [aiError, setAiError] = useState<string>("");

  const percentFormatter = new Intl.NumberFormat("id-ID", {
    style: "percent",
    minimumFractionDigits: 1,
    maximumFractionDigits: 2,
  });

  const handleGetAiRecommendation = async () => {
    setIsLoadingAi(true);
    setAiError("");
    setAiRecommendations(null);

    try {
      const response = await fetch("/api/ai/recommend-ahp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          criteria: criteria.map(c => ({
            id: c.id,
            code: c.code,
            name: c.name,
            description: c.description,
            type: c.type,
          })),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Gagal mendapatkan rekomendasi");
      }

      const result = await response.json();
      setAiRecommendations(result.data.recommendations || []);
      setAiNote(result.data.note || "");
    } catch (error) {
      setAiError(error instanceof Error ? error.message : "Terjadi kesalahan");
    } finally {
      setIsLoadingAi(false);
    }
  };

  const applyRecommendation = (rec: AiRecommendation) => {
    const rowCriteria = criteria.find(c => c.code === rec.row);
    const colCriteria = criteria.find(c => c.code === rec.col);
    
    if (rowCriteria && colCriteria) {
      onPairwiseChange(rowCriteria.id, colCriteria.id, rec.value);
    }
  };

  const applyAllRecommendations = () => {
    if (!aiRecommendations) return;
    
    aiRecommendations.forEach(rec => {
      applyRecommendation(rec);
    });
  };

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
            <>
              {/* AI Recommendation Button */}
              <div className="mb-4 flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleGetAiRecommendation}
                  disabled={isLoadingAi}
                >
                  {isLoadingAi ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Memuat...
                    </>
                  ) : (
                    <>
                      <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                      Rekomendasi AI
                    </>
                  )}
                </Button>
              </div>

              {/* AI Error */}
              {aiError && (
                <div className="mb-4 rounded-lg border border-rose-300 bg-rose-50 p-4 text-rose-700">
                  <p className="text-sm font-semibold">⚠️ {aiError}</p>
                  <p className="text-xs mt-1">
                    Pastikan GEMINI_API_KEY sudah ditambahkan di file .env.local
                  </p>
                </div>
              )}

              {/* AI Recommendations Display */}
              {aiRecommendations && aiRecommendations.length > 0 && (
                <div className="mb-4 rounded-lg border border-cyan-200 bg-cyan-50 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold text-cyan-900">✨ Rekomendasi AI</h4>
                    <Button variant="primary" size="sm" onClick={applyAllRecommendations}>
                      Terapkan Semua
                    </Button>
                  </div>
                  
                  {aiNote && (
                    <p className="text-sm text-cyan-700 mb-3 italic">{aiNote}</p>
                  )}
                  
                  <div className="space-y-2">
                    {aiRecommendations.map((rec, idx) => (
                      <div key={idx} className="flex items-start justify-between bg-white rounded-md p-3 text-sm">
                        <div className="flex-1">
                          <p className="font-semibold text-foreground">
                            {rec.row} vs {rec.col}: <span className="text-primary">{rec.value}</span>
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">{rec.reason}</p>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => applyRecommendation(rec)}
                          className="ml-2"
                        >
                          Terapkan
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

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
            </>
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
                <p className="mb-2 font-semibold">Nilai CR {"> "} 0.1 (Tidak Konsisten)</p>
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
