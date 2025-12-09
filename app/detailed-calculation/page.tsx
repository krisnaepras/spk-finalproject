"use client";

import { useEffect, useState } from "react";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle
} from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Table, THead, TBody, Th, Td } from "../components/ui/Table";
import { Badge } from "../components/ui/Badge";
import Link from "next/link";

interface Criteria {
    id: string;
    code: string;
    name: string;
    type: "BENEFIT" | "COST";
    weight: number;
}

interface Alternative {
    id: string;
    code: string;
    name: string;
}

interface ScoreData {
    [alternativeId: string]: {
        [criteriaId: string]: number | null;
    };
}

interface AhpResult {
    weights: Record<string, number>;
    lambdaMax: number;
    ci: number;
    cr: number;
    isConsistent: boolean;
}

interface TopsisResult {
    alternativeId: string;
    score: number;
    rank: number;
    dPlus?: number;
    dMinus?: number;
}

interface TopsisDetail {
    alternatives: Alternative[];
    criteria: Criteria[];
    decisionMatrix: number[][];
    normalizedMatrix: number[][];
    weightedMatrix: number[][];
    idealPositive: number[];
    idealNegative: number[];
    distancesPlus: number[];
    distancesMinus: number[];
}

export default function DetailedCalculationPage() {
    const [criteria, setCriteria] = useState<Criteria[]>([]);
    const [alternatives, setAlternatives] = useState<Alternative[]>([]);
    const [scores, setScores] = useState<ScoreData>({});
    const [ahpResult, setAhpResult] = useState<AhpResult | null>(null);
    const [topsisResults, setTopsisResults] = useState<TopsisResult[]>([]);
    const [topsisDetail, setTopsisDetail] = useState<TopsisDetail | null>(null);
    const [pairwiseMatrix, setPairwiseMatrix] = useState<
        Record<string, Record<string, number>>
    >({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = () => {
        try {
            // Load from localStorage
            const stored = localStorage.getItem("spk-workspace");
            if (stored) {
                const workspace = JSON.parse(stored);
                console.log("Loaded workspace:", workspace); // Debug
                setCriteria(workspace.criteria || []);
                setAlternatives(workspace.alternatives || []);
                setScores(workspace.scores || {});
                setAhpResult(workspace.ahpResult || null);
                setTopsisResults(workspace.topsisResults || []);
                setTopsisDetail(workspace.topsisDetail || null);
                setPairwiseMatrix(workspace.pairwiseMatrix || {});
            }
        } catch (error) {
            console.error("Error loading data:", error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="container mx-auto p-6">
                <div className="flex items-center justify-center py-12">
                    <div className="text-lg text-muted-foreground">
                        Memuat data...
                    </div>
                </div>
            </div>
        );
    }

    if (criteria.length === 0 || alternatives.length === 0) {
        return (
            <div className="container mx-auto p-6">
                <Card>
                    <CardContent className="py-12">
                        <div className="text-center">
                            <p className="text-lg text-muted-foreground mb-4">
                                Belum ada data perhitungan
                            </p>
                            <p className="text-sm text-muted-foreground mb-4">
                                Silakan lakukan perhitungan AHP dan TOPSIS
                                terlebih dahulu di dashboard.
                            </p>
                            <Link href="/">
                                <Button>Kembali ke Dashboard</Button>
                            </Link>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Use topsisDetail if available, otherwise calculate manually
    const decisionMatrix =
        topsisDetail?.decisionMatrix ||
        alternatives.map((alt) =>
            criteria.map((crit) => scores[alt.id]?.[crit.id] ?? 0)
        );

    const normalizedMatrix =
        topsisDetail?.normalizedMatrix ||
        (() => {
            const normalized: number[][] = [];
            for (let j = 0; j < criteria.length; j++) {
                const sumSquares = alternatives.reduce((sum, alt, i) => {
                    return sum + Math.pow(decisionMatrix[i][j], 2);
                }, 0);
                const sqrtSum = Math.sqrt(sumSquares);

                alternatives.forEach((alt, i) => {
                    if (!normalized[i]) normalized[i] = [];
                    normalized[i][j] =
                        sqrtSum !== 0 ? decisionMatrix[i][j] / sqrtSum : 0;
                });
            }
            return normalized;
        })();

    const weightedMatrix =
        topsisDetail?.weightedMatrix ||
        normalizedMatrix.map((row, i) =>
            row.map((val, j) => val * criteria[j].weight)
        );

    const aPlus =
        topsisDetail?.idealPositive ||
        (() => {
            const ideal: number[] = [];
            criteria.forEach((crit, j) => {
                const values = weightedMatrix.map((row) => row[j]);
                ideal[j] =
                    crit.type === "BENEFIT"
                        ? Math.max(...values)
                        : Math.min(...values);
            });
            return ideal;
        })();

    const aMinus =
        topsisDetail?.idealNegative ||
        (() => {
            const ideal: number[] = [];
            criteria.forEach((crit, j) => {
                const values = weightedMatrix.map((row) => row[j]);
                ideal[j] =
                    crit.type === "BENEFIT"
                        ? Math.min(...values)
                        : Math.max(...values);
            });
            return ideal;
        })();

    const distancesPlus =
        topsisDetail?.distancesPlus ||
        weightedMatrix.map((row) =>
            Math.sqrt(
                row.reduce(
                    (sum, val, j) => sum + Math.pow(val - aPlus[j], 2),
                    0
                )
            )
        );

    const distancesMinus =
        topsisDetail?.distancesMinus ||
        weightedMatrix.map((row) =>
            Math.sqrt(
                row.reduce(
                    (sum, val, j) => sum + Math.pow(val - aMinus[j], 2),
                    0
                )
            )
        );

    const preferences = alternatives.map((alt, i) => {
        const sum = distancesPlus[i] + distancesMinus[i];
        return sum !== 0 ? distancesMinus[i] / sum : 0;
    });

    const distances = alternatives.map((alt, i) => ({
        dPlus: distancesPlus[i],
        dMinus: distancesMinus[i],
        calculations: {
            dPlusSquares: weightedMatrix[i].map((val, j) => ({
                value: val,
                ideal: aPlus[j],
                diff: val - aPlus[j],
                square: Math.pow(val - aPlus[j], 2)
            })),
            dMinusSquares: weightedMatrix[i].map((val, j) => ({
                value: val,
                ideal: aMinus[j],
                diff: val - aMinus[j],
                square: Math.pow(val - aMinus[j], 2)
            }))
        }
    }));

    // Calculate normalization details for display
    const normCalculations = criteria.map((crit, j) => {
        const sumSquares = alternatives.reduce((sum, alt, i) => {
            return sum + Math.pow(decisionMatrix[i][j], 2);
        }, 0);
        return {
            criteriaId: crit.id,
            sumSquares,
            sqrtSum: Math.sqrt(sumSquares)
        };
    });

    // Calculate AHP normalized column sums
    const calculateAhpNormalization = () => {
        const columnSums: number[] = criteria.map(() => 0);

        criteria.forEach((row, i) => {
            criteria.forEach((col, j) => {
                const value =
                    pairwiseMatrix[row.id]?.[col.id] ||
                    (i === j ? 1 : 1 / (pairwiseMatrix[col.id]?.[row.id] || 1));
                columnSums[j] += value;
            });
        });

        return columnSums;
    };

    const ahpColumnSums = calculateAhpNormalization();

    return (
        <div className="container mx-auto p-6 space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">
                        Detail Perhitungan SPK
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Step-by-step perhitungan AHP dan TOPSIS
                    </p>
                </div>
                <Link href="/">
                    <Button variant="outline">← Kembali</Button>
                </Link>
            </div>

            {/* AHP Section */}
            <Card>
                <CardHeader>
                    <CardTitle>1. Perhitungan Bobot Kriteria (AHP)</CardTitle>
                    <CardDescription>
                        Analytic Hierarchy Process untuk menghitung bobot
                        kriteria
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Pairwise Matrix */}
                    <div>
                        <h3 className="font-semibold text-lg mb-3">
                            1.1. Matriks Perbandingan Berpasangan
                        </h3>
                        <div className="overflow-x-auto">
                            <Table>
                                <THead>
                                    <tr>
                                        <Th>Kriteria</Th>
                                        {criteria.map((c) => (
                                            <Th key={c.id}>{c.code}</Th>
                                        ))}
                                    </tr>
                                </THead>
                                <TBody>
                                    {criteria.map((row, i) => (
                                        <tr key={row.id}>
                                            <Td className="font-medium">
                                                {row.code}
                                            </Td>
                                            {criteria.map((col, j) => {
                                                const value =
                                                    i === j
                                                        ? 1
                                                        : pairwiseMatrix[
                                                              row.id
                                                          ]?.[col.id] ||
                                                          1 /
                                                              (pairwiseMatrix[
                                                                  col.id
                                                              ]?.[row.id] || 1);
                                                return (
                                                    <Td key={col.id}>
                                                        {value.toFixed(4)}
                                                    </Td>
                                                );
                                            })}
                                        </tr>
                                    ))}
                                </TBody>
                            </Table>
                        </div>
                    </div>

                    {/* Column Sums */}
                    <div>
                        <h3 className="font-semibold text-lg mb-3">
                            1.2. Jumlah Kolom
                        </h3>
                        <div className="bg-slate-50 p-4 rounded-lg space-y-2">
                            {criteria.map((crit, j) => {
                                const colSum = ahpColumnSums[j];
                                const values = criteria.map((row, i) => {
                                    const value =
                                        i === j
                                            ? 1
                                            : pairwiseMatrix[row.id]?.[
                                                  crit.id
                                              ] ||
                                              1 /
                                                  (pairwiseMatrix[crit.id]?.[
                                                      row.id
                                                  ] || 1);
                                    return value.toFixed(4);
                                });

                                return (
                                    <div key={crit.id} className="text-sm">
                                        <span className="font-mono font-semibold text-primary">
                                            Σ{crit.code}
                                        </span>{" "}
                                        = {values.join(" + ")} ={" "}
                                        <span className="font-semibold">
                                            {colSum.toFixed(4)}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Normalized Matrix */}
                    <div>
                        <h3 className="font-semibold text-lg mb-3">
                            1.3. Matriks Ternormalisasi
                        </h3>
                        <p className="text-sm text-muted-foreground mb-3">
                            Setiap elemen dibagi dengan jumlah kolomnya
                        </p>
                        <div className="overflow-x-auto">
                            <Table>
                                <THead>
                                    <tr>
                                        <Th>Kriteria</Th>
                                        {criteria.map((c) => (
                                            <Th key={c.id}>{c.code}</Th>
                                        ))}
                                        <Th>Rata-rata (Bobot)</Th>
                                    </tr>
                                </THead>
                                <TBody>
                                    {criteria.map((row, i) => {
                                        const rowValues = criteria.map(
                                            (col, j) => {
                                                const value =
                                                    i === j
                                                        ? 1
                                                        : pairwiseMatrix[
                                                              row.id
                                                          ]?.[col.id] ||
                                                          1 /
                                                              (pairwiseMatrix[
                                                                  col.id
                                                              ]?.[row.id] || 1);
                                                return value / ahpColumnSums[j];
                                            }
                                        );
                                        const average =
                                            rowValues.reduce(
                                                (sum, v) => sum + v,
                                                0
                                            ) / criteria.length;

                                        return (
                                            <tr key={row.id}>
                                                <Td className="font-medium">
                                                    {row.code}
                                                </Td>
                                                {rowValues.map((val, j) => (
                                                    <Td key={j}>
                                                        {val.toFixed(4)}
                                                    </Td>
                                                ))}
                                                <Td className="font-semibold text-primary">
                                                    {average.toFixed(4)}
                                                </Td>
                                            </tr>
                                        );
                                    })}
                                </TBody>
                            </Table>
                        </div>
                    </div>

                    {/* Weight Calculation Example */}
                    <div>
                        <h3 className="font-semibold text-lg mb-3">
                            1.4. Contoh Perhitungan Bobot
                        </h3>
                        <div className="bg-blue-50 p-4 rounded-lg space-y-2">
                            {criteria.slice(0, 2).map((crit, i) => {
                                const rowValues = criteria.map((col, j) => {
                                    const value =
                                        i === j
                                            ? 1
                                            : pairwiseMatrix[crit.id]?.[
                                                  col.id
                                              ] ||
                                              1 /
                                                  (pairwiseMatrix[col.id]?.[
                                                      crit.id
                                                  ] || 1);
                                    return value / ahpColumnSums[j];
                                });
                                const sum = rowValues.reduce(
                                    (s, v) => s + v,
                                    0
                                );
                                const average = sum / criteria.length;

                                return (
                                    <div
                                        key={crit.id}
                                        className="text-sm font-mono"
                                    >
                                        <span className="font-semibold text-blue-900">
                                            W{crit.code}
                                        </span>{" "}
                                        = (
                                        {rowValues
                                            .map((v) => v.toFixed(4))
                                            .join(" + ")}
                                        ) / {criteria.length} = {sum.toFixed(4)}{" "}
                                        / {criteria.length} ={" "}
                                        <span className="font-bold text-blue-700">
                                            {average.toFixed(4)}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Consistency */}
                    {ahpResult && (
                        <div>
                            <h3 className="font-semibold text-lg mb-3">
                                1.5. Uji Konsistensi
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <div className="bg-slate-100 p-4 rounded-lg">
                                    <p className="text-xs text-muted-foreground mb-1">
                                        λmax (Lambda Max)
                                    </p>
                                    <p className="text-2xl font-bold">
                                        {ahpResult.lambdaMax.toFixed(4)}
                                    </p>
                                </div>
                                <div className="bg-slate-100 p-4 rounded-lg">
                                    <p className="text-xs text-muted-foreground mb-1">
                                        CI (Consistency Index)
                                    </p>
                                    <p className="text-2xl font-bold">
                                        {ahpResult.ci.toFixed(4)}
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        CI = (λmax - n) / (n - 1)
                                    </p>
                                    <p className="text-xs font-mono mt-1">
                                        = ({ahpResult.lambdaMax.toFixed(4)} -{" "}
                                        {criteria.length}) / ({criteria.length}{" "}
                                        - 1)
                                    </p>
                                </div>
                                <div className="bg-slate-100 p-4 rounded-lg">
                                    <p className="text-xs text-muted-foreground mb-1">
                                        CR (Consistency Ratio)
                                    </p>
                                    <p className="text-2xl font-bold">
                                        {ahpResult.cr.toFixed(4)}
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        CR = CI / RI
                                    </p>
                                </div>
                                <div className="bg-slate-100 p-4 rounded-lg">
                                    <p className="text-xs text-muted-foreground mb-1">
                                        Status
                                    </p>
                                    <Badge
                                        variant={
                                            ahpResult.isConsistent
                                                ? "success"
                                                : "destructive"
                                        }
                                    >
                                        {ahpResult.isConsistent
                                            ? "✓ Konsisten"
                                            : "✗ Tidak Konsisten"}
                                    </Badge>
                                    <p className="text-xs text-muted-foreground mt-2">
                                        {ahpResult.isConsistent
                                            ? "CR ≤ 0.1"
                                            : "CR > 0.1"}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Final Weights */}
                    <div>
                        <h3 className="font-semibold text-lg mb-3">
                            1.6. Bobot Kriteria Final
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            {criteria.map((crit) => (
                                <div
                                    key={crit.id}
                                    className="bg-emerald-50 p-4 rounded-lg border border-emerald-200"
                                >
                                    <p className="text-sm font-semibold text-emerald-900">
                                        {crit.code} - {crit.name}
                                    </p>
                                    <p className="text-2xl font-bold text-emerald-700 mt-1">
                                        {(crit.weight * 100).toFixed(2)}%
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        W = {crit.weight.toFixed(4)}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* TOPSIS Section */}
            <Card>
                <CardHeader>
                    <CardTitle>2. Perhitungan Perankingan (TOPSIS)</CardTitle>
                    <CardDescription>
                        Technique for Order Preference by Similarity to Ideal
                        Solution
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Decision Matrix */}
                    <div>
                        <h3 className="font-semibold text-lg mb-3">
                            2.1. Matriks Keputusan (X)
                        </h3>
                        <div className="overflow-x-auto">
                            <Table>
                                <THead>
                                    <tr>
                                        <Th>Alternatif</Th>
                                        {criteria.map((c) => (
                                            <Th key={c.id}>
                                                {c.code}
                                                <Badge
                                                    variant={
                                                        c.type === "BENEFIT"
                                                            ? "success"
                                                            : "destructive"
                                                    }
                                                    className="ml-2 text-[10px]"
                                                >
                                                    {c.type}
                                                </Badge>
                                            </Th>
                                        ))}
                                    </tr>
                                </THead>
                                <TBody>
                                    {alternatives.map((alt, i) => (
                                        <tr key={alt.id}>
                                            <Td className="font-medium">
                                                {alt.code}
                                            </Td>
                                            {criteria.map((crit, j) => (
                                                <Td key={crit.id}>
                                                    {decisionMatrix[i][
                                                        j
                                                    ].toFixed(2)}
                                                </Td>
                                            ))}
                                        </tr>
                                    ))}
                                </TBody>
                            </Table>
                        </div>
                    </div>

                    {/* Normalization */}
                    <div>
                        <h3 className="font-semibold text-lg mb-3">
                            2.2. Normalisasi (R)
                        </h3>
                        <p className="text-sm text-muted-foreground mb-3">
                            Rumus: r<sub>ij</sub> = x<sub>ij</sub> / √(Σx
                            <sub>ij</sub>²)
                        </p>

                        {/* Show calculation for first criteria */}
                        <div className="bg-purple-50 p-4 rounded-lg mb-4">
                            <h4 className="font-semibold text-sm mb-2">
                                Contoh Detail Perhitungan Normalisasi {criteria[0]?.code}:
                            </h4>
                            <div className="space-y-2 text-sm font-mono">
                                {normCalculations[0] && (
                                    <>
                                        <div className="bg-white/60 p-3 rounded">
                                            <p className="font-semibold text-purple-900 mb-2">Langkah 1: Kuadratkan setiap nilai</p>
                                            {alternatives.slice(0, 3).map((alt, i) => (
                                                <p key={alt.id} className="ml-4">
                                                    {alt.code}: {decisionMatrix[i][0].toFixed(2)}² = {Math.pow(decisionMatrix[i][0], 2).toFixed(4)}
                                                </p>
                                            ))}
                                            {alternatives.length > 3 && <p className="ml-4 text-muted-foreground">... ({alternatives.length - 3} data lainnya)</p>}
                                        </div>

                                        <div className="bg-white/60 p-3 rounded">
                                            <p className="font-semibold text-purple-900 mb-2">Langkah 2: Jumlahkan semua kuadrat</p>
                                            <p className="ml-4">
                                                Σ({criteria[0].code})² = {alternatives.slice(0, 3).map((alt, i) => 
                                                    Math.pow(decisionMatrix[i][0], 2).toFixed(4)
                                                ).join(" + ")}
                                                {alternatives.length > 3 && " + ..."}
                                            </p>
                                            <p className="ml-4 mt-1">
                                                = <span className="font-bold">{normCalculations[0].sumSquares.toFixed(4)}</span>
                                            </p>
                                        </div>

                                        <div className="bg-white/60 p-3 rounded">
                                            <p className="font-semibold text-purple-900 mb-2">Langkah 3: Akar kuadrat dari jumlah</p>
                                            <p className="ml-4">
                                                √{normCalculations[0].sumSquares.toFixed(4)} = <span className="font-bold text-purple-700">{normCalculations[0].sqrtSum.toFixed(4)}</span>
                                            </p>
                                        </div>

                                        <div className="bg-white/60 p-3 rounded">
                                            <p className="font-semibold text-purple-900 mb-2">Langkah 4: Bagi setiap nilai dengan akar</p>
                                            {alternatives.slice(0, 3).map((alt, i) => (
                                                <p key={alt.id} className="ml-4">
                                                    r<sub>{alt.code},{criteria[0].code}</sub> = {decisionMatrix[i][0].toFixed(2)} / {normCalculations[0].sqrtSum.toFixed(4)} = <span className="font-bold text-purple-700">{normalizedMatrix[i][0].toFixed(4)}</span>
                                                </p>
                                            ))}
                                            {alternatives.length > 3 && <p className="ml-4 text-muted-foreground">... ({alternatives.length - 3} data lainnya)</p>}
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>

                        <div className="overflow-x-auto">
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
                                    {alternatives.map((alt, i) => (
                                        <tr key={alt.id}>
                                            <Td className="font-medium">
                                                {alt.code}
                                            </Td>
                                            {criteria.map((crit, j) => (
                                                <Td key={crit.id}>
                                                    {normalizedMatrix[i][
                                                        j
                                                    ].toFixed(4)}
                                                </Td>
                                            ))}
                                        </tr>
                                    ))}
                                </TBody>
                            </Table>
                        </div>
                    </div>

                    {/* Weighted Normalized Matrix */}
                    <div>
                        <h3 className="font-semibold text-lg mb-3">
                            2.3. Matriks Ternormalisasi Terbobot (Y)
                        </h3>
                        <p className="text-sm text-muted-foreground mb-3">
                            Rumus: y<sub>ij</sub> = w<sub>j</sub> × r
                            <sub>ij</sub>
                        </p>

                        {/* Show calculation steps */}
                        <div className="bg-cyan-50 p-4 rounded-lg mb-4 border border-cyan-200">
                            <h4 className="font-semibold text-sm mb-3">
                                Detail Perhitungan Pembobotan:
                            </h4>
                            
                            <div className="space-y-3">
                                {/* Step 1 */}
                                <div className="bg-white/60 p-3 rounded">
                                    <p className="text-sm font-semibold text-cyan-800 mb-1">
                                        Langkah 1: Ambil bobot kriteria dari AHP
                                    </p>
                                    <div className="text-sm font-mono">
                                        {criteria.map((c) => (
                                            <p key={c.id}>
                                                w<sub>{c.code}</sub> = {c.weight.toFixed(4)}
                                            </p>
                                        ))}
                                    </div>
                                </div>

                                {/* Step 2 */}
                                <div className="bg-white/60 p-3 rounded">
                                    <p className="text-sm font-semibold text-cyan-800 mb-1">
                                        Langkah 2: Kalikan bobot dengan nilai ternormalisasi
                                    </p>
                                    <div className="text-sm font-mono space-y-1">
                                        {alternatives.slice(0, 2).map((alt, i) => (
                                            <p key={alt.id}>
                                                y<sub>{alt.code},{criteria[0].code}</sub> = 
                                                {" "}{criteria[0].weight.toFixed(4)} × {normalizedMatrix[i][0].toFixed(4)} = 
                                                <span className="font-bold text-cyan-700">
                                                    {" "}{weightedMatrix[i][0].toFixed(4)}
                                                </span>
                                            </p>
                                        ))}
                                    </div>
                                </div>

                                {/* Step 3 */}
                                <div className="bg-white/60 p-3 rounded">
                                    <p className="text-sm font-semibold text-cyan-800 mb-1">
                                        Langkah 3: Ulangi untuk semua alternatif dan kriteria
                                    </p>
                                    <p className="text-sm text-gray-600">
                                        Hasil lengkap ada di tabel di bawah
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
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
                                    {alternatives.map((alt, i) => (
                                        <tr key={alt.id}>
                                            <Td className="font-medium">
                                                {alt.code}
                                            </Td>
                                            {criteria.map((crit, j) => (
                                                <Td key={crit.id}>
                                                    {weightedMatrix[i][
                                                        j
                                                    ].toFixed(4)}
                                                </Td>
                                            ))}
                                        </tr>
                                    ))}
                                </TBody>
                            </Table>
                        </div>
                    </div>

                    {/* Ideal Solutions */}
                    <div>
                        <h3 className="font-semibold text-lg mb-3">
                            2.4. Solusi Ideal Positif (A+) dan Negatif (A−)
                        </h3>
                        
                        {/* Explanation Box */}
                        <div className="bg-blue-50 p-4 rounded-lg mb-4 border border-blue-200">
                            <h4 className="font-semibold text-sm mb-2 text-blue-900">
                                Logika Penentuan Solusi Ideal:
                            </h4>
                            <ul className="text-sm space-y-2 text-gray-700">
                                <li>
                                    <span className="font-semibold text-green-700">Kriteria BENEFIT:</span> 
                                    {" "}A+ = nilai <strong>maksimal</strong>, A− = nilai <strong>minimal</strong>
                                    <br/>
                                    <span className="text-xs text-gray-600">(Semakin besar semakin baik)</span>
                                </li>
                                <li>
                                    <span className="font-semibold text-red-700">Kriteria COST:</span> 
                                    {" "}A+ = nilai <strong>minimal</strong>, A− = nilai <strong>maksimal</strong>
                                    <br/>
                                    <span className="text-xs text-gray-600">(Semakin kecil semakin baik)</span>
                                </li>
                            </ul>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                                <h4 className="font-semibold text-green-900 mb-3">
                                    A+ (Solusi Ideal Positif)
                                </h4>
                                <div className="space-y-2 text-sm">
                                    {criteria.map((crit, j) => {
                                        const values = weightedMatrix.map(
                                            (row) => row[j]
                                        );
                                        const isMax = crit.type === "BENEFIT";
                                        return (
                                            <div
                                                key={crit.id}
                                                className="font-mono"
                                            >
                                                <p className="text-green-800 mb-1">
                                                    A+<sub>{crit.code}</sub> = {isMax ? "max" : "min"}
                                                </p>
                                                <p className="text-xs text-gray-600 mb-1">
                                                    = {isMax ? "max" : "min"}(
                                                    {values.map((v) => v.toFixed(4)).join(", ")}
                                                    )
                                                </p>
                                                <p className="font-bold text-green-700">
                                                    = {idealPositive[j].toFixed(4)}
                                                </p>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                                <h4 className="font-semibold text-red-900 mb-3">
                                    A− (Solusi Ideal Negatif)
                                </h4>
                                <div className="space-y-2 text-sm">
                                    {criteria.map((crit, j) => {
                                        const values = weightedMatrix.map(
                                            (row) => row[j]
                                        );
                                        const isMax = crit.type === "BENEFIT";
                                        return (
                                            <div
                                                key={crit.id}
                                                className="font-mono"
                                            >
                                                <p className="text-red-800 mb-1">
                                                    A−<sub>{crit.code}</sub> = {isMax ? "min" : "max"}
                                                </p>
                                                <p className="text-xs text-gray-600 mb-1">
                                                    = {isMax ? "min" : "max"}(
                                                    {values.map((v) => v.toFixed(4)).join(", ")}
                                                    )
                                                </p>
                                                <p className="font-bold text-red-700">
                                                    = {idealNegative[j].toFixed(4)}
                                                </p>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Distance Calculations */}
                    <div>
                        <h3 className="font-semibold text-lg mb-3">
                            2.5. Jarak ke Solusi Ideal
                        </h3>
                        <p className="text-sm text-muted-foreground mb-3">
                            D+ = √(Σ(y<sub>ij</sub> - A+<sub>j</sub>)²) dan D− =
                            √(Σ(y<sub>ij</sub> - A−<sub>j</sub>)²)
                        </p>

                        {/* Show detailed calculation for first alternative */}
                        <div className="bg-orange-50 p-4 rounded-lg mb-4 border border-orange-200">
                            <h4 className="font-semibold text-sm mb-3">
                                Detail Perhitungan untuk {alternatives[0]?.code}:
                            </h4>
                            
                            <div className="space-y-3">
                                {/* D+ Calculation Steps */}
                                <div className="bg-white/60 p-3 rounded">
                                    <p className="text-sm font-semibold text-orange-800 mb-2">
                                        Langkah 1: Hitung D+ (Jarak ke Ideal Positif)
                                    </p>
                                    
                                    <div className="text-sm font-mono space-y-1">
                                        <p className="font-semibold">a) Hitung selisih dan kuadrat untuk tiap kriteria:</p>
                                        {distances[0].calculations.dPlusSquares.map((calc, j) => (
                                            <p key={j} className="ml-4">
                                                (y<sub>{j+1}</sub> - A+<sub>{j+1}</sub>)² = 
                                                ({calc.value.toFixed(4)} - {calc.ideal.toFixed(4)})² = 
                                                ({(calc.value - calc.ideal).toFixed(4)})² = 
                                                <span className="text-orange-700 font-semibold">
                                                    {" "}{calc.square.toFixed(6)}
                                                </span>
                                            </p>
                                        ))}
                                        
                                        <p className="font-semibold mt-2">b) Jumlahkan semua kuadrat:</p>
                                        <p className="ml-4">
                                            Σ = {distances[0].calculations.dPlusSquares
                                                .map((calc) => calc.square.toFixed(6))
                                                .join(" + ")}
                                        </p>
                                        <p className="ml-4">
                                            = <span className="text-orange-700 font-semibold">
                                                {distances[0].calculations.dPlusSquares
                                                    .reduce((sum, calc) => sum + calc.square, 0)
                                                    .toFixed(6)}
                                            </span>
                                        </p>
                                        
                                        <p className="font-semibold mt-2">c) Akar kuadrat dari jumlah:</p>
                                        <p className="ml-4">
                                            D+ = √{distances[0].calculations.dPlusSquares
                                                .reduce((sum, calc) => sum + calc.square, 0)
                                                .toFixed(6)} = 
                                            <span className="text-orange-700 font-bold text-base">
                                                {" "}{distances[0].dPlus.toFixed(4)}
                                            </span>
                                        </p>
                                    </div>
                                </div>

                                {/* D- Calculation Steps */}
                                <div className="bg-white/60 p-3 rounded">
                                    <p className="text-sm font-semibold text-orange-800 mb-2">
                                        Langkah 2: Hitung D− (Jarak ke Ideal Negatif)
                                    </p>
                                    
                                    <div className="text-sm font-mono space-y-1">
                                        <p className="font-semibold">a) Hitung selisih dan kuadrat untuk tiap kriteria:</p>
                                        {distances[0].calculations.dMinusSquares.map((calc, j) => (
                                            <p key={j} className="ml-4">
                                                (y<sub>{j+1}</sub> - A−<sub>{j+1}</sub>)² = 
                                                ({calc.value.toFixed(4)} - {calc.ideal.toFixed(4)})² = 
                                                ({(calc.value - calc.ideal).toFixed(4)})² = 
                                                <span className="text-orange-700 font-semibold">
                                                    {" "}{calc.square.toFixed(6)}
                                                </span>
                                            </p>
                                        ))}
                                        
                                        <p className="font-semibold mt-2">b) Jumlahkan semua kuadrat:</p>
                                        <p className="ml-4">
                                            Σ = {distances[0].calculations.dMinusSquares
                                                .map((calc) => calc.square.toFixed(6))
                                                .join(" + ")}
                                        </p>
                                        <p className="ml-4">
                                            = <span className="text-orange-700 font-semibold">
                                                {distances[0].calculations.dMinusSquares
                                                    .reduce((sum, calc) => sum + calc.square, 0)
                                                    .toFixed(6)}
                                            </span>
                                        </p>
                                        
                                        <p className="font-semibold mt-2">c) Akar kuadrat dari jumlah:</p>
                                        <p className="ml-4">
                                            D− = √{distances[0].calculations.dMinusSquares
                                                .reduce((sum, calc) => sum + calc.square, 0)
                                                .toFixed(6)} = 
                                            <span className="text-orange-700 font-bold text-base">
                                                {" "}{distances[0].dMinus.toFixed(4)}
                                            </span>
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <Table>
                                <THead>
                                    <tr>
                                        <Th>Alternatif</Th>
                                        <Th>D+ (Jarak ke Ideal Positif)</Th>
                                        <Th>D− (Jarak ke Ideal Negatif)</Th>
                                    </tr>
                                </THead>
                                <TBody>
                                    {alternatives.map((alt, i) => (
                                        <tr key={alt.id}>
                                            <Td className="font-medium">
                                                {alt.code}
                                            </Td>
                                            <Td>
                                                {distances[i].dPlus.toFixed(4)}
                                            </Td>
                                            <Td>
                                                {distances[i].dMinus.toFixed(4)}
                                            </Td>
                                        </tr>
                                    ))}
                                </TBody>
                            </Table>
                        </div>
                    </div>

                    {/* Preference Values */}
                    <div>
                        <h3 className="font-semibold text-lg mb-3">
                            2.6. Nilai Preferensi (V)
                        </h3>
                        <p className="text-sm text-muted-foreground mb-3">
                            Rumus: V<sub>i</sub> = D−<sub>i</sub> / (D+
                            <sub>i</sub> + D−<sub>i</sub>)
                        </p>

                        {/* Show calculation examples */}
                        <div className="bg-indigo-50 p-4 rounded-lg mb-4 border border-indigo-200">
                            <h4 className="font-semibold text-sm mb-3">
                                Detail Perhitungan untuk {alternatives[0]?.code}:
                            </h4>
                            
                            <div className="space-y-3">
                                {/* Step 1 */}
                                <div className="bg-white/60 p-3 rounded">
                                    <p className="text-sm font-semibold text-indigo-800 mb-1">
                                        Langkah 1: Ambil nilai D+ dan D−
                                    </p>
                                    <div className="text-sm font-mono">
                                        <p>D+ = {distances[0].dPlus.toFixed(4)}</p>
                                        <p>D− = {distances[0].dMinus.toFixed(4)}</p>
                                    </div>
                                </div>

                                {/* Step 2 */}
                                <div className="bg-white/60 p-3 rounded">
                                    <p className="text-sm font-semibold text-indigo-800 mb-1">
                                        Langkah 2: Hitung penjumlahan D+ + D−
                                    </p>
                                    <div className="text-sm font-mono">
                                        <p>
                                            D+ + D− = {distances[0].dPlus.toFixed(4)} + {distances[0].dMinus.toFixed(4)}
                                        </p>
                                        <p className="ml-12">
                                            = <span className="text-indigo-700 font-semibold">
                                                {(distances[0].dPlus + distances[0].dMinus).toFixed(4)}
                                            </span>
                                        </p>
                                    </div>
                                </div>

                                {/* Step 3 */}
                                <div className="bg-white/60 p-3 rounded">
                                    <p className="text-sm font-semibold text-indigo-800 mb-1">
                                        Langkah 3: Bagi D− dengan hasil penjumlahan
                                    </p>
                                    <div className="text-sm font-mono">
                                        <p>
                                            V = D− / (D+ + D−)
                                        </p>
                                        <p className="ml-4">
                                            = {distances[0].dMinus.toFixed(4)} / {(distances[0].dPlus + distances[0].dMinus).toFixed(4)}
                                        </p>
                                        <p className="ml-4">
                                            = <span className="text-indigo-700 font-bold text-base">
                                                {distances[0].preferenceValue.toFixed(4)}
                                            </span>
                                        </p>
                                    </div>
                                </div>

                                {/* Interpretation */}
                                <div className="bg-blue-100 p-3 rounded border border-blue-300">
                                    <p className="text-sm font-semibold text-blue-900 mb-1">
                                        💡 Interpretasi:
                                    </p>
                                    <p className="text-sm text-gray-700">
                                        Nilai V berkisar 0-1. Semakin <strong>mendekati 1</strong>, 
                                        semakin dekat alternatif ini dengan solusi ideal positif (A+) 
                                        dan semakin baik kualitasnya.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Show brief calculations for other alternatives */}
                        <div className="bg-gray-50 p-4 rounded-lg mb-4 border border-gray-200">
                            <h4 className="font-semibold text-sm mb-2">
                                Perhitungan Semua Alternatif:
                            </h4>
                            <div className="space-y-1 text-sm font-mono">
                                {alternatives.slice(0, 2).map((alt, i) => (
                                    <p key={alt.id}>
                                        V<sub>{alt.code}</sub> ={" "}
                                        {distances[i].dMinus.toFixed(4)} / (
                                        {distances[i].dPlus.toFixed(4)} +{" "}
                                        {distances[i].dMinus.toFixed(4)}) ={" "}
                                        {distances[i].dMinus.toFixed(4)} /{" "}
                                        {(
                                            distances[i].dPlus +
                                            distances[i].dMinus
                                        ).toFixed(4)}
                                        ={" "}
                                        <span className="font-bold text-indigo-700">
                                            {preferences[i].toFixed(4)}
                                        </span>
                                    </p>
                                ))}
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <Table>
                                <THead>
                                    <tr>
                                        <Th>Rank</Th>
                                        <Th>Alternatif</Th>
                                        <Th>D+</Th>
                                        <Th>D−</Th>
                                        <Th>Nilai V</Th>
                                    </tr>
                                </THead>
                                <TBody>
                                    {alternatives
                                        .map((alt, i) => ({
                                            alt,
                                            i,
                                            v: preferences[i]
                                        }))
                                        .sort((a, b) => b.v - a.v)
                                        .map((item, rank) => (
                                            <tr
                                                key={item.alt.id}
                                                className={
                                                    rank === 0
                                                        ? "bg-yellow-50 font-semibold"
                                                        : ""
                                                }
                                            >
                                                <Td>{rank + 1}</Td>
                                                <Td>
                                                    {item.alt.code} -{" "}
                                                    {item.alt.name}
                                                </Td>
                                                <Td>
                                                    {distances[
                                                        item.i
                                                    ].dPlus.toFixed(4)}
                                                </Td>
                                                <Td>
                                                    {distances[
                                                        item.i
                                                    ].dMinus.toFixed(4)}
                                                </Td>
                                                <Td className="font-bold text-primary">
                                                    {item.v.toFixed(4)}
                                                </Td>
                                            </tr>
                                        ))}
                                </TBody>
                            </Table>
                        </div>
                    </div>

                    {/* Final Ranking */}
                    <div>
                        <h3 className="font-semibold text-lg mb-3">
                            2.7. Hasil Pemeringkatan Final
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {alternatives
                                .map((alt, i) => ({
                                    alt,
                                    i,
                                    v: preferences[i]
                                }))
                                .sort((a, b) => b.v - a.v)
                                .slice(0, 3)
                                .map((item, rank) => (
                                    <div
                                        key={item.alt.id}
                                        className={`p-4 rounded-lg border-2 ${
                                            rank === 0
                                                ? "bg-yellow-50 border-yellow-400"
                                                : rank === 1
                                                ? "bg-slate-50 border-slate-400"
                                                : "bg-orange-50 border-orange-400"
                                        }`}
                                    >
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-2xl font-bold">
                                                #{rank + 1}
                                            </span>
                                            {rank === 0 && (
                                                <span className="text-2xl">
                                                    🏆
                                                </span>
                                            )}
                                            {rank === 1 && (
                                                <span className="text-2xl">
                                                    🥈
                                                </span>
                                            )}
                                            {rank === 2 && (
                                                <span className="text-2xl">
                                                    🥉
                                                </span>
                                            )}
                                        </div>
                                        <p className="font-semibold text-lg">
                                            {item.alt.name}
                                        </p>
                                        <p className="text-sm text-muted-foreground">
                                            {item.alt.code}
                                        </p>
                                        <p className="text-2xl font-bold mt-2 text-primary">
                                            {item.v.toFixed(4)}
                                        </p>
                                    </div>
                                ))}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Download Section */}
            <Card>
                <CardContent className="py-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="font-semibold text-lg">
                                Unduh Laporan
                            </h3>
                            <p className="text-sm text-muted-foreground">
                                Simpan hasil perhitungan untuk dokumentasi
                            </p>
                        </div>
                        <Button onClick={() => window.print()}>
                            <svg
                                className="w-4 h-4 mr-2"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
                                />
                            </svg>
                            Print / PDF
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
