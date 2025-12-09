"use client";

import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle
} from "../ui/Card";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Table, THead, TBody, Th, Td } from "../ui/Table";
import { Criteria, WorkspaceState } from "@/lib/spk/types";
import { useMemo, useState } from "react";
import { Modal } from "../ui/Modal";
import { calculateAhpResult } from "@/lib/spk/ahp";

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
    isOverrideApproved
}: AhpModuleProps) => {
    const [isLoadingAi, setIsLoadingAi] = useState(false);
    const [aiRecommendations, setAiRecommendations] = useState<
        AiRecommendation[] | null
    >(null);
    const [aiNote, setAiNote] = useState<string>("");
    const [aiError, setAiError] = useState<string>("");
    const [isAiPromptOpen, setIsAiPromptOpen] = useState(false);
    const [aiPrompt, setAiPrompt] = useState(
        "Berikan saran perbandingan yang logis."
    );

    const liveAhp = useMemo(() => {
        if (criteria.length < 2) return null;
        try {
            return calculateAhpResult(criteria, pairwiseMatrix);
        } catch {
            return null;
        }
    }, [criteria, pairwiseMatrix]);

    const handleSave = () => {
        if (!liveAhp) return;
        // Simpan bobot AHP
        onCalculate();
    };

    const handleApproveInconsistent = () => {
        // Hanya approve/konfirmasi, tidak langsung simpan
        onConfirmInconsistent();
    };

    const percentFormatter = new Intl.NumberFormat("id-ID", {
        style: "percent",
        minimumFractionDigits: 1,
        maximumFractionDigits: 2
    });

    const handleGetAiRecommendation = async () => {
        setIsAiPromptOpen(false);
        setIsLoadingAi(true);
        setAiError("");
        setAiRecommendations(null);

        try {
            const response = await fetch("/api/ai/recommend-ahp", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    prompt: aiPrompt,
                    criteria: criteria.map((c) => ({
                        id: c.id,
                        code: c.code,
                        name: c.name,
                        description: c.description,
                        type: c.type
                    }))
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || "Gagal mendapatkan rekomendasi");
            }

            const result = await response.json();
            setAiRecommendations(result.data.recommendations || []);
            setAiNote(result.data.note || "");
        } catch (error) {
            setAiError(
                error instanceof Error ? error.message : "Terjadi kesalahan"
            );
        } finally {
            setIsLoadingAi(false);
        }
    };

    const applyRecommendation = (rec: AiRecommendation) => {
        const rowCriteria = criteria.find((c) => c.code === rec.row);
        const colCriteria = criteria.find((c) => c.code === rec.col);

        if (rowCriteria && colCriteria) {
            onPairwiseChange(rowCriteria.id, colCriteria.id, rec.value);
        }
    };

    const applyAllRecommendations = () => {
        if (!aiRecommendations) return;

        aiRecommendations.forEach((rec) => {
            applyRecommendation(rec);
        });
    };

    return (
        <div className="space-y-6">
            <Modal
                isOpen={isAiPromptOpen}
                onClose={() => setIsAiPromptOpen(false)}
                title="Masukkan arahan AI (opsional)"
                description="Tambahkan preferensi khusus, contoh: “Saya ingin condong ke review orang lain”."
                footer={
                    <>
                        <Button
                            variant="ghost"
                            onClick={() => setIsAiPromptOpen(false)}
                        >
                            Batal
                        </Button>
                        <Button
                            onClick={handleGetAiRecommendation}
                            disabled={isLoadingAi}
                        >
                            {isLoadingAi ? "Memuat..." : "Minta Rekomendasi"}
                        </Button>
                    </>
                }
            >
                <Input
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    placeholder="Masukkan arah preferensi AI..."
                />
            </Modal>

            <Card>
                <CardHeader>
                    <CardTitle>Matriks Perbandingan Berpasangan</CardTitle>
                    <CardDescription>
                        Isi nilai perbandingan antar kriteria (skala 1-9). Panel
                        kanan menampilkan bobot &amp; CR yang berubah otomatis
                        saat matriks diubah.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {criteria.length < 2 ? (
                        <div className="text-center text-muted-foreground py-4">
                            Minimal perlukan 2 kriteria untuk melakukan
                            perbandingan.
                        </div>
                    ) : (
                        <div className="grid gap-6 lg:grid-cols-[1.6fr_0.9fr]">
                            <div className="space-y-4">
                                {/* AI Recommendation Button */}
                                <div className="flex justify-end">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setIsAiPromptOpen(true)}
                                        disabled={isLoadingAi}
                                    >
                                        {isLoadingAi ? (
                                            <>
                                                <svg
                                                    className="animate-spin -ml-1 mr-2 h-4 w-4"
                                                    xmlns="http://www.w3.org/2000/svg"
                                                    fill="none"
                                                    viewBox="0 0 24 24"
                                                >
                                                    <circle
                                                        className="opacity-25"
                                                        cx="12"
                                                        cy="12"
                                                        r="10"
                                                        stroke="currentColor"
                                                        strokeWidth="4"
                                                    ></circle>
                                                    <path
                                                        className="opacity-75"
                                                        fill="currentColor"
                                                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                                    ></path>
                                                </svg>
                                                Memuat...
                                            </>
                                        ) : (
                                            <>
                                                <svg
                                                    className="mr-2 h-4 w-4"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    viewBox="0 0 24 24"
                                                >
                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        strokeWidth={2}
                                                        d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                                                    />
                                                </svg>
                                                Rekomendasi AI
                                            </>
                                        )}
                                    </Button>
                                </div>

                                {/* AI Error */}
                                {aiError && (
                                    <div className="rounded-lg border border-rose-300 bg-rose-50 p-4 text-rose-700">
                                        <p className="text-sm font-semibold">
                                            ⚠️ {aiError}
                                        </p>
                                        <p className="text-xs mt-1">
                                            Pastikan GEMINI_API_KEY sudah
                                            ditambahkan di file .env.local
                                        </p>
                                    </div>
                                )}

                                {/* AI Recommendations Display */}
                                {aiRecommendations &&
                                    aiRecommendations.length > 0 && (
                                        <div className="rounded-lg border border-cyan-200 bg-cyan-50 p-4">
                                            <div className="flex items-center justify-between mb-3">
                                                <h4 className="font-semibold text-cyan-900">
                                                    ✨ Rekomendasi AI
                                                </h4>
                                                <Button
                                                    variant="primary"
                                                    size="sm"
                                                    onClick={
                                                        applyAllRecommendations
                                                    }
                                                >
                                                    Terapkan Semua
                                                </Button>
                                            </div>

                                            {aiNote && (
                                                <p className="text-sm text-cyan-700 mb-3 italic">
                                                    {aiNote}
                                                </p>
                                            )}

                                            <div className="space-y-2">
                                                {aiRecommendations.map(
                                                    (rec, idx) => (
                                                        <div
                                                            key={idx}
                                                            className="flex items-start justify-between bg-white rounded-md p-3 text-sm"
                                                        >
                                                            <div className="flex-1">
                                                                <p className="font-semibold text-foreground">
                                                                    {rec.row} vs{" "}
                                                                    {rec.col}:{" "}
                                                                    <span className="text-primary">
                                                                        {
                                                                            rec.value
                                                                        }
                                                                    </span>
                                                                </p>
                                                                <p className="text-xs text-muted-foreground mt-1">
                                                                    {rec.reason}
                                                                </p>
                                                            </div>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() =>
                                                                    applyRecommendation(
                                                                        rec
                                                                    )
                                                                }
                                                                className="ml-2"
                                                            >
                                                                Terapkan
                                                            </Button>
                                                        </div>
                                                    )
                                                )}
                                            </div>
                                        </div>
                                    )}

                                <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
                                    <Table>
                                        <THead>
                                            <tr>
                                                <Th>Kriteria</Th>
                                                {criteria.map((c) => (
                                                    <Th
                                                        key={c.id}
                                                        className="min-w-[100px]"
                                                    >
                                                        {c.code}
                                                    </Th>
                                                ))}
                                            </tr>
                                        </THead>
                                        <TBody>
                                            {criteria.map((row, i) => (
                                                <tr
                                                    key={row.id}
                                                    className="border-t border-slate-100 hover:bg-slate-50 transition-colors"
                                                >
                                                    <Td className="font-medium">
                                                        {row.name} ({row.code})
                                                    </Td>
                                                    {criteria.map((col, j) => {
                                                        const isDiagonal =
                                                            i === j;
                                                        const isLowerTriangle =
                                                            i > j;
                                                        const value =
                                                            pairwiseMatrix[
                                                                row.id
                                                            ]?.[col.id] ??
                                                            (isDiagonal
                                                                ? 1
                                                                : 0);

                                                        return (
                                                            <Td
                                                                key={col.id}
                                                                className="p-2"
                                                            >
                                                                <Input
                                                                    type="number"
                                                                    min="0.1"
                                                                    max="9"
                                                                    step="any"
                                                                    disabled={
                                                                        isDiagonal ||
                                                                        isLowerTriangle
                                                                    }
                                                                    className={
                                                                        isDiagonal
                                                                            ? "bg-slate-100 text-muted-foreground"
                                                                            : ""
                                                                    }
                                                                    value={
                                                                        value
                                                                    }
                                                                    onFocus={(
                                                                        e
                                                                    ) =>
                                                                        e.target.select()
                                                                    }
                                                                    onChange={(
                                                                        e
                                                                    ) => {
                                                                        const parsed =
                                                                            parseFloat(
                                                                                e
                                                                                    .target
                                                                                    .value
                                                                            );
                                                                        if (
                                                                            Number.isNaN(
                                                                                parsed
                                                                            )
                                                                        )
                                                                            return;
                                                                        onPairwiseChange(
                                                                            row.id,
                                                                            col.id,
                                                                            parsed
                                                                        );
                                                                    }}
                                                                />
                                                            </Td>
                                                        );
                                                    })}
                                                </tr>
                                            ))}
                                        </TBody>
                                    </Table>
                                </div>

                                <div className="flex justify-end">
                                    <Button
                                        onClick={handleSave}
                                        disabled={
                                            criteria.length < 2 ||
                                            !liveAhp ||
                                            (liveAhp &&
                                                !liveAhp.isConsistent &&
                                                !isOverrideApproved)
                                        }
                                        className={
                                            liveAhp &&
                                            !liveAhp.isConsistent &&
                                            !isOverrideApproved
                                                ? "opacity-50 cursor-not-allowed bg-gray-400"
                                                : ""
                                        }
                                    >
                                        Konfirmasi
                                    </Button>
                                </div>
                            </div>

                            <div className="space-y-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-semibold text-emerald-900">
                                            Bobot Live
                                        </p>
                                        <p className="text-xs text-emerald-800">
                                            Update otomatis saat matriks diubah.
                                        </p>
                                    </div>
                                    <span className="text-[11px] rounded-full bg-white px-3 py-1 text-emerald-700 font-semibold uppercase tracking-wide">
                                        Preview
                                    </span>
                                </div>
                                {liveAhp ? (
                                    <>
                                        <div className="grid grid-cols-3 gap-2 text-xs text-emerald-800">
                                            <div className="rounded-md bg-white/80 p-2">
                                                <p className="text-[11px] uppercase tracking-wide text-emerald-600">
                                                    λmax
                                                </p>
                                                <p className="font-semibold text-emerald-900">
                                                    {liveAhp.lambdaMax.toFixed(
                                                        4
                                                    )}
                                                </p>
                                            </div>
                                            <div className="rounded-md bg-white/80 p-2">
                                                <p className="text-[11px] uppercase tracking-wide text-emerald-600">
                                                    CI
                                                </p>
                                                <p className="font-semibold text-emerald-900">
                                                    {liveAhp.ci.toFixed(4)}
                                                </p>
                                            </div>
                                            <div className="rounded-md bg-white/80 p-2">
                                                <p className="text-[11px] uppercase tracking-wide text-emerald-600">
                                                    CR
                                                </p>
                                                <p
                                                    className={`font-semibold ${
                                                        liveAhp.isConsistent
                                                            ? "text-emerald-700"
                                                            : "text-rose-700"
                                                    }`}
                                                >
                                                    {liveAhp.cr.toFixed(4)}{" "}
                                                    {liveAhp.isConsistent
                                                        ? "✓"
                                                        : "✗"}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="space-y-2 text-sm">
                                            {criteria.map((c) => {
                                                const weight =
                                                    liveAhp.weights[c.id] ?? 0;
                                                const percent =
                                                    percentFormatter.format(
                                                        weight
                                                    );
                                                return (
                                                    <div
                                                        key={c.id}
                                                        className="rounded-md bg-white/80 px-3 py-2"
                                                    >
                                                        <div className="flex items-center justify-between">
                                                            <span className="font-medium text-emerald-900">
                                                                {c.code} —{" "}
                                                                {c.name}
                                                            </span>
                                                            <span className="font-mono text-emerald-800">
                                                                {percent}
                                                            </span>
                                                        </div>
                                                        <div className="mt-2 h-2 w-full rounded-full bg-emerald-100">
                                                            <div
                                                                className="h-2 rounded-full bg-emerald-500 transition-all"
                                                                style={{
                                                                    width: `${Math.min(
                                                                        weight *
                                                                            100,
                                                                        100
                                                                    )}%`
                                                                }}
                                                                aria-label={`Bobot ${percent}`}
                                                            />
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                        {!liveAhp.isConsistent && (
                                            <div className="rounded-lg border border-rose-300 bg-rose-50 p-3 text-rose-700">
                                                <p className="text-sm font-semibold">
                                                    Nilai CR &gt; 0.1 (Tidak
                                                    Konsisten)
                                                </p>
                                                <p className="text-xs mt-2">
                                                    Disarankan meninjau kembali
                                                    matriks. Jika tetap ingin
                                                    menggunakan bobot ini, klik
                                                    tombol simpan di kiri
                                                    (tombol akan otomatis
                                                    melakukan konfirmasi).
                                                </p>
                                                <Button
                                                    onClick={
                                                        handleApproveInconsistent
                                                    }
                                                    className="mt-3 w-full bg-rose-600 hover:bg-rose-700 text-white"
                                                    size="sm"
                                                    disabled={
                                                        isOverrideApproved
                                                    }
                                                >
                                                    {isOverrideApproved
                                                        ? "✓ Sudah Dikonfirmasi"
                                                        : "Gunakan bobot ini"}
                                                </Button>
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <p className="text-sm text-emerald-800">
                                        Isi matriks di sebelah kiri untuk
                                        melihat bobot live.
                                    </p>
                                )}
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};
