"use client";

import { FormEvent, useMemo, useState } from "react";
import Papa from "papaparse";
import * as XLSX from "xlsx";

import { calculateAhpResult, updatePairwiseValue } from "@/lib/spk/ahp";
import { MAX_CRITERIA } from "@/lib/spk/constants";
import { calculateTopsis } from "@/lib/spk/topsis";
import {
  createInitialWorkspaceState,
  getWorkflowStatus,
  isScoreMatrixComplete,
  removeAlternativeFromScores,
  removeCriteriaFromMatrix,
  removeCriteriaFromScores,
  sanitizePairwiseMatrix,
  syncScoresStructure,
} from "@/lib/spk/workspace";
import type {
  Alternative,
  Criteria,
  CriteriaType,
  ImportPreview,
  TopsisDetail,
  TopsisResult,
  WorkspaceState,
} from "@/lib/spk/types";

const numberFormatter = new Intl.NumberFormat("id-ID", {
  maximumFractionDigits: 4,
});

const percentFormatter = new Intl.NumberFormat("id-ID", {
  style: "percent",
  minimumFractionDigits: 1,
  maximumFractionDigits: 2,
});

type AlternativeForm = {
  id: string;
  code: string;
  name: string;
  description?: string;
};

type CriteriaForm = {
  id: string;
  code: string;
  name: string;
  description?: string;
  type: CriteriaType;
};

type TopsisTab = "decision" | "normalized" | "weighted" | "ideal" | "distance" | "score";
type MainTab = "dashboard" | "alternatives" | "criteria" | "scores" | "ahp" | "topsis" | "results";

const defaultAlternativeForm = (code: string): AlternativeForm => ({
  id: "",
  code,
  name: "",
  description: "",
});

const defaultCriteriaForm = (code: string): CriteriaForm => ({
  id: "",
  code,
  name: "",
  description: "",
  type: "BENEFIT",
});

export default function Home() {
  const [workspace, setWorkspace] = useState<WorkspaceState>(() => createInitialWorkspaceState());
  const [mainTab, setMainTab] = useState<MainTab>("dashboard");
  const [alternativeForm, setAlternativeForm] = useState<AlternativeForm>(() =>
    defaultAlternativeForm("A1"),
  );
  const [criteriaForm, setCriteriaForm] = useState<CriteriaForm>(() => defaultCriteriaForm("C1"));
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [topsisTab, setTopsisTab] = useState<TopsisTab>("decision");
  const [ahpOverrideApproved, setAhpOverrideApproved] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);
  const workflowStatus = useMemo(() => getWorkflowStatus(workspace), [workspace]);

  const nextAlternativeCode = useMemo(
    () => `A${workspace.alternatives.length + 1}`,
    [workspace.alternatives.length],
  );

  const nextCriteriaCode = useMemo(
    () => `C${workspace.criteria.length + 1}`,
    [workspace.criteria.length],
  );

  const resetAlternativeForm = () => setAlternativeForm(defaultAlternativeForm(""));
  const resetCriteriaForm = () => setCriteriaForm(defaultCriteriaForm(""));

  const handleAlternativeSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!alternativeForm.name.trim()) {
      setNotification("Nama alternatif wajib diisi");
      return;
    }
    const editing = isAlternativeEdit(alternativeForm);

    setWorkspace((prev) => {
      const isEdit = Boolean(alternativeForm.id);
      const alternative: Alternative = {
        id: alternativeForm.id || crypto.randomUUID(),
        code: alternativeForm.code.trim() || nextAlternativeCode,
        name: alternativeForm.name.trim(),
        description: alternativeForm.description?.trim() || undefined,
      };

      const alternatives = isEdit
        ? prev.alternatives.map((item) => (item.id === alternative.id ? alternative : item))
        : [...prev.alternatives, alternative];

      const syncedScores = syncScoresStructure(alternatives, prev.criteria, prev.scores);

      return {
        ...prev,
        alternatives,
        scores: syncedScores,
        topsisResults: undefined,
        topsisDetail: undefined,
      };
    });

    resetAlternativeForm();
    setNotification(editing ? "Alternatif diperbarui" : "Alternatif ditambahkan");
  };

  const isAlternativeEdit = (form: AlternativeForm) => Boolean(form.id);
  const isCriteriaEdit = (form: CriteriaForm) => Boolean(form.id);

  const handleAlternativeDelete = (id: string) => {
    setWorkspace((prev) => {
      const alternatives = prev.alternatives.filter((item) => item.id !== id);
      const scores = removeAlternativeFromScores(prev.scores, id);
      return {
        ...prev,
        alternatives,
        scores,
        topsisResults: undefined,
        topsisDetail: undefined,
      };
    });
  };

  const handleCriteriaSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!criteriaForm.name.trim()) {
      setNotification("Nama kriteria wajib diisi");
      return;
    }
    const editing = isCriteriaEdit(criteriaForm);

    setWorkspace((prev) => {
      const isEdit = Boolean(criteriaForm.id);
      const criteria: Criteria = {
        id: criteriaForm.id || crypto.randomUUID(),
        code: criteriaForm.code.trim() || nextCriteriaCode,
        name: criteriaForm.name.trim(),
        description: criteriaForm.description?.trim() || undefined,
        type: criteriaForm.type,
        position: isEdit
          ? prev.criteria.find((item) => item.id === criteriaForm.id)?.position
          : prev.criteria.length,
        weight: isEdit
          ? prev.criteria.find((item) => item.id === criteriaForm.id)?.weight
          : undefined,
      };

      let criteriaCollection = isEdit
        ? prev.criteria.map((item) => (item.id === criteria.id ? criteria : item))
        : [...prev.criteria, criteria];

      if (criteriaCollection.length > MAX_CRITERIA) {
        criteriaCollection = criteriaCollection.slice(0, MAX_CRITERIA);
      }

      const reindexedCriteria = criteriaCollection.map((item, index) => ({ ...item, position: index }));
      const scores = syncScoresStructure(prev.alternatives, reindexedCriteria, prev.scores);
      const pairwiseMatrix = sanitizePairwiseMatrix(reindexedCriteria, prev.pairwiseMatrix);

      return {
        ...prev,
        criteria: reindexedCriteria,
        scores,
        pairwiseMatrix,
        ahpResult: undefined,
        topsisResults: undefined,
        topsisDetail: undefined,
      };
    });

    resetCriteriaForm();
    setNotification(editing ? "Kriteria diperbarui" : "Kriteria ditambahkan");
    setAhpOverrideApproved(false);
  };

  const handleCriteriaDelete = (id: string) => {
    setWorkspace((prev) => {
      const criteria = prev.criteria.filter((item) => item.id !== id);
      const reindexed = criteria.map((item, index) => ({ ...item, position: index }));
      const scores = removeCriteriaFromScores(prev.scores, id);
      const pairwiseMatrix = removeCriteriaFromMatrix(prev.pairwiseMatrix, id);

      return {
        ...prev,
        criteria: reindexed,
        scores,
        pairwiseMatrix,
        ahpResult: undefined,
        topsisResults: undefined,
        topsisDetail: undefined,
      };
    });
    setAhpOverrideApproved(false);
  };

  const handleScoreChange = (alternativeId: string, criteriaId: string, value: string) => {
    const parsedValue = value === "" ? null : Number(value);

    setWorkspace((prev) => ({
      ...prev,
      scores: {
        ...prev.scores,
        [alternativeId]: {
          ...(prev.scores[alternativeId] ?? {}),
          [criteriaId]: parsedValue,
        },
      },
      topsisResults: undefined,
      topsisDetail: undefined,
    }));
  };

  const handlePairwiseChange = (rowId: string, colId: string, value: number) => {
    if (!value || value <= 0) return;
    setWorkspace((prev) => ({
      ...prev,
      pairwiseMatrix: updatePairwiseValue(prev.pairwiseMatrix, rowId, colId, value),
      ahpResult: undefined,
      topsisResults: undefined,
      topsisDetail: undefined,
    }));
    setAhpOverrideApproved(false);
  };

  const handleCalculateAhp = () => {
    if (!workspace.criteria.length) {
      setNotification("Tambahkan kriteria terlebih dahulu");
      return;
    }

    try {
      const result = calculateAhpResult(workspace.criteria, workspace.pairwiseMatrix);
      setWorkspace((prev) => ({
        ...prev,
        ahpResult: result,
        criteria: prev.criteria.map((item) => ({
          ...item,
          weight: result.weights[item.id] ?? item.weight,
        })),
      }));
      setAhpOverrideApproved(result.isConsistent);
      setNotification("Bobot kriteria berhasil dihitung");
    } catch (error) {
      if (error instanceof Error) {
        setNotification(error.message);
      }
    }
  };

  const handleConfirmInconsistentAhp = () => {
    setAhpOverrideApproved(true);
    setNotification("Bobot dengan CR tinggi telah dikonfirmasi");
  };

  const handleCalculateTopsis = () => {
    if (!workspace.ahpResult) {
      setNotification("Hitung bobot AHP terlebih dahulu");
      return;
    }

    if (!workspace.ahpResult.isConsistent && !ahpOverrideApproved) {
      setNotification("Konfirmasi penggunaan bobot dengan CR > 0.1 terlebih dahulu");
      return;
    }

    if (!isScoreMatrixComplete(workspace)) {
      setNotification("Lengkapi matriks keputusan terlebih dahulu");
      return;
    }

    try {
      const { results, detail } = calculateTopsis(
        workspace.alternatives,
        workspace.criteria,
        workspace.scores,
        workspace.ahpResult.weights,
      );

      setWorkspace((prev) => ({
        ...prev,
        topsisResults: results,
        topsisDetail: detail,
      }));
      setNotification("Perhitungan TOPSIS selesai");
    } catch (error) {
      if (error instanceof Error) {
        setNotification(error.message);
      }
    }
  };

  const handleImportData = (
    payload: Pick<WorkspaceState, "alternatives" | "criteria" | "scores"> & {
      summary: WorkspaceState["lastImportSummary"];
    },
  ) => {
    const normalizedCriteria = payload.criteria.map((item, index) => ({
      ...item,
      position: index,
    }));
    setWorkspace((prev) => ({
      ...prev,
      alternatives: payload.alternatives,
      criteria: normalizedCriteria,
      scores: payload.scores,
      pairwiseMatrix: sanitizePairwiseMatrix(normalizedCriteria, {}),
      ahpResult: undefined,
      topsisResults: undefined,
      topsisDetail: undefined,
      lastImportSummary: payload.summary,
    }));
    setAhpOverrideApproved(false);
    setIsImportOpen(false);
    resetAlternativeForm();
    resetCriteriaForm();
    setNotification("Data berhasil diimpor");
  };

  const topsisTabs: { id: TopsisTab; label: string }[] = [
    { id: "decision", label: "Matriks Keputusan (X)" },
    { id: "normalized", label: "Normalisasi (R)" },
    { id: "weighted", label: "Bobot (Y)" },
    { id: "ideal", label: "A+ & A-" },
    { id: "distance", label: "D+ & D-" },
    { id: "score", label: "Nilai V" },
  ];

  const mainTabs: { id: MainTab; label: string }[] = [
    { id: "dashboard", label: "Ringkasan" },
    { id: "alternatives", label: "Kelola Alternatif" },
    { id: "criteria", label: "Kelola Kriteria" },
    { id: "scores", label: "Matriks Keputusan" },
    { id: "ahp", label: "Modul AHP" },
    { id: "topsis", label: "Modul TOPSIS" },
    { id: "results", label: "Hasil Pemeringkatan" },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-6">
          <p className="text-sm font-semibold uppercase tracking-wide text-emerald-600">
            Sistem Pendukung Keputusan Generik
          </p>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard SPK – AHP + TOPSIS</h1>
          <p className="max-w-3xl text-sm text-slate-600">
            Kelola data alternatif, tetapkan kriteria (maks. 5), hitung bobot AHP, jalankan TOPSIS, dan
            sajikan hasil pemeringkatan dalam satu alur terpadu. Import data fleksibel dari Excel/CSV, JSON,
            maupun SQL.
          </p>
          <div className="flex flex-wrap gap-3 text-sm">
            <button
              className="rounded-full bg-emerald-600 px-4 py-2 font-semibold text-white shadow hover:bg-emerald-500"
              onClick={() => setIsImportOpen(true)}
            >
              + Import Data
            </button>
            <div className="flex flex-wrap gap-2">
              {mainTabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setMainTab(tab.id)}
                  className={`rounded-full border px-3 py-2 text-sm font-semibold ${
                    mainTab === tab.id
                      ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                      : "border-slate-200 text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6">
        {notification && (
          <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-900">
            {notification}
          </div>
        )}

        {mainTab === "dashboard" && (
          <section id="dashboard" className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-4 flex flex-col gap-1.5">
              <h2 className="text-xl font-semibold text-slate-900">Ringkasan Proyek</h2>
              <p className="text-sm text-slate-600">
                Pantau status setiap tahap sebelum melanjutkan ke proses perhitungan keputusan.
              </p>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <DashboardCard label="Alternatif" value={`${workspace.alternatives.length} data`} />
              <DashboardCard label="Kriteria" value={`${workspace.criteria.length}/${MAX_CRITERIA} aktif`} />
              <DashboardCard
                label="Terakhir Import"
                value={
                  workspace.lastImportSummary
                    ? `${workspace.lastImportSummary.importedAlternatives} alternatif · ${workspace.lastImportSummary.importedCriteria} kriteria`
                    : "Belum ada"
                }
              />
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-4">
              <StepCard label="Data Alternatif" status={workflowStatus.alternativesReady} />
              <StepCard label="Kriteria" status={workflowStatus.criteriaReady} />
              <StepCard label="Bobot AHP" status={workflowStatus.ahpReady} />
              <StepCard label="TOPSIS" status={workflowStatus.topsisReady} />
            </div>
          </section>
        )}

        {mainTab === "alternatives" && (
        <section id="alternatives" className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <HeaderWithActions
            title="Manajemen Alternatif"
            subtitle="Kelola alternatif secara manual atau melalui import."
            actions={
              <button className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700" onClick={() => setIsImportOpen(true)}>
                Import Data
              </button>
            }
          />

          <div className="grid gap-4 lg:grid-cols-[320px,1fr]">
            <form className="rounded-lg border border-slate-200 p-3" onSubmit={handleAlternativeSubmit}>
              <h3 className="mb-3 text-base font-semibold text-slate-900">
                {isAlternativeEdit(alternativeForm) ? "Ubah Alternatif" : "Tambah Alternatif"}
              </h3>
              <label className="mb-3 block text-sm">
                <span className="text-slate-600">Kode Alternatif</span>
                <input
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  placeholder={nextAlternativeCode}
                  value={alternativeForm.code}
                  onChange={(event) =>
                    setAlternativeForm((prev) => ({ ...prev, code: event.target.value.toUpperCase() }))
                  }
                />
              </label>
              <label className="mb-3 block text-sm">
                <span className="text-slate-600">Nama Alternatif</span>
                <input
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  value={alternativeForm.name}
                  onChange={(event) => setAlternativeForm((prev) => ({ ...prev, name: event.target.value }))}
                  required
                />
              </label>
              <label className="mb-3 block text-sm">
                <span className="text-slate-600">Deskripsi (opsional)</span>
                <textarea
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  rows={2}
                  value={alternativeForm.description}
                  onChange={(event) =>
                    setAlternativeForm((prev) => ({ ...prev, description: event.target.value }))
                  }
                />
              </label>
              <div className="flex gap-2.5">
                <button type="submit" className="flex-1 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white">
                  {isAlternativeEdit(alternativeForm) ? "Simpan" : "Tambah"}
                </button>
                {isAlternativeEdit(alternativeForm) && (
                  <button
                    type="button"
                    className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700"
                    onClick={resetAlternativeForm}
                  >
                    Batal
                  </button>
                )}
              </div>
            </form>

            <div className="overflow-auto rounded-lg border border-slate-200">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-100 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                  <tr>
                    <th className="px-3 py-2">Kode</th>
                    <th className="px-3 py-2">Nama</th>
                    <th className="px-3 py-2">Deskripsi</th>
                    <th className="px-3 py-2">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {workspace.alternatives.map((alternative) => (
                    <tr key={alternative.id} className="border-t border-slate-100">
                      <td className="px-3 py-2 font-semibold">{alternative.code}</td>
                      <td className="px-3 py-2">{alternative.name}</td>
                      <td className="px-3 py-2 text-slate-600">{alternative.description || "-"}</td>
                      <td className="px-3 py-2">
                        <div className="flex gap-2">
                          <button
                            className="text-xs font-semibold text-emerald-600"
                            onClick={() => setAlternativeForm({ ...alternative })}
                          >
                            Edit
                          </button>
                          <button
                            className="text-xs font-semibold text-rose-600"
                            onClick={() => handleAlternativeDelete(alternative.id)}
                          >
                            Hapus
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!workspace.alternatives.length && (
                    <tr>
                      <td className="px-3 py-4 text-center text-slate-500" colSpan={4}>
                        Belum ada data alternatif. Import atau tambahkan manual.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
        )}

        {mainTab === "criteria" && (
        <section id="criteria" className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <HeaderWithActions
            title="Manajemen Kriteria"
            subtitle="Aktifkan hingga lima kriteria Benefit/Cost."
            badge={`Terpakai ${workspace.criteria.length}/${MAX_CRITERIA}`}
          />

          <div className="grid gap-4 lg:grid-cols-[320px,1fr]">
            <form className="rounded-lg border border-slate-200 p-3" onSubmit={handleCriteriaSubmit}>
              <h3 className="mb-3 text-base font-semibold text-slate-900">
                {isCriteriaEdit(criteriaForm) ? "Ubah Kriteria" : "Tambah Kriteria"}
              </h3>
              <label className="mb-3 block text-sm">
                <span className="text-slate-600">Kode Kriteria</span>
                <input
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  placeholder={nextCriteriaCode}
                  value={criteriaForm.code}
                  onChange={(event) => setCriteriaForm((prev) => ({ ...prev, code: event.target.value.toUpperCase() }))}
                />
              </label>
              <label className="mb-3 block text-sm">
                <span className="text-slate-600">Nama Kriteria</span>
                <input
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  value={criteriaForm.name}
                  onChange={(event) => setCriteriaForm((prev) => ({ ...prev, name: event.target.value }))}
                  required
                />
              </label>
              <label className="mb-3 block text-sm">
                <span className="text-slate-600">Tipe Penilaian</span>
                <select
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  value={criteriaForm.type}
                  onChange={(event) => setCriteriaForm((prev) => ({ ...prev, type: event.target.value as CriteriaType }))}
                >
                  <option value="BENEFIT">Benefit (semakin besar semakin baik)</option>
                  <option value="COST">Cost (semakin kecil semakin baik)</option>
                </select>
              </label>
              <label className="mb-4 block text-sm">
                <span className="text-slate-600">Deskripsi (opsional)</span>
                <textarea
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  rows={2}
                  value={criteriaForm.description}
                  onChange={(event) => setCriteriaForm((prev) => ({ ...prev, description: event.target.value }))}
                />
              </label>
              <div className="flex gap-3">
                <button type="submit" className="flex-1 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white">
                  {isCriteriaEdit(criteriaForm) ? "Simpan" : "Tambah"}
                </button>
                {isCriteriaEdit(criteriaForm) && (
                  <button
                    type="button"
                    className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700"
                    onClick={resetCriteriaForm}
                  >
                    Batal
                  </button>
                )}
              </div>
            </form>

            <div className="overflow-auto rounded-xl border border-slate-200">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-100 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                  <tr>
                    <th className="px-3 py-2">Kode</th>
                    <th className="px-3 py-2">Nama</th>
                    <th className="px-3 py-2">Tipe</th>
                    <th className="px-3 py-2">Bobot AHP</th>
                    <th className="px-3 py-2">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {workspace.criteria.map((criteria) => (
                    <tr key={criteria.id} className="border-t border-slate-100">
                      <td className="px-3 py-2 font-semibold">{criteria.code}</td>
                      <td className="px-3 py-2">{criteria.name}</td>
                      <td className="px-3 py-2">
                        <span className={`rounded-full px-2 py-1 text-xs font-semibold ${criteria.type === "BENEFIT" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                          {criteria.type === "BENEFIT" ? "Benefit" : "Cost"}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-slate-600">
                        {criteria.weight !== undefined ? percentFormatter.format(criteria.weight) : "-"}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex gap-2">
                          <button className="text-xs font-semibold text-emerald-600" onClick={() => setCriteriaForm({ ...criteria })}>
                            Edit
                          </button>
                          <button className="text-xs font-semibold text-rose-600" onClick={() => handleCriteriaDelete(criteria.id)}>
                            Hapus
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!workspace.criteria.length && (
                    <tr>
                      <td className="px-3 py-4 text-center text-slate-500" colSpan={5}>
                        Belum ada kriteria aktif.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
        )}

        {mainTab === "scores" && (
        <section id="scores" className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <HeaderWithActions
            title="Matriks Keputusan"
            subtitle="Isi nilai Xᵢⱼ untuk setiap alternatif dan kriteria."
            badge={isScoreMatrixComplete(workspace) ? "Lengkap" : "Belum lengkap"}
          />

          <div className="overflow-auto rounded-xl border border-slate-200">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-100">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                    Alternatif
                  </th>
                  {workspace.criteria.map((criteria) => (
                    <th key={criteria.id} className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                      {criteria.code}
                      <span className="block text-[11px] font-normal text-slate-500">{criteria.name}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {workspace.alternatives.map((alternative) => (
                  <tr key={alternative.id} className="border-t border-slate-100">
                    <td className="px-3 py-2 font-semibold">{alternative.name}</td>
                    {workspace.criteria.map((criteria) => (
                      <td key={criteria.id} className="px-3 py-2">
                        <input
                          type="number"
                          inputMode="decimal"
                          className="w-full rounded-lg border border-slate-200 px-2 py-1 text-sm"
                          value={workspace.scores[alternative.id]?.[criteria.id] ?? ""}
                          onChange={(event) => handleScoreChange(alternative.id, criteria.id, event.target.value)}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
                {!workspace.alternatives.length && (
                  <tr>
                    <td className="px-3 py-4 text-center text-slate-500" colSpan={workspace.criteria.length + 1}>
                      Tambahkan alternatif terlebih dahulu.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
        )}

        {mainTab === "ahp" && (
        <section id="ahp" className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <HeaderWithActions
            title="Modul AHP – Bobot Kriteria"
            subtitle="Isi matriks perbandingan berpasangan. Input hanya diperlukan pada bagian atas diagonal."
          />

          {workspace.criteria.length > 0 ? (
            <div className="space-y-4">
              <div className="overflow-auto rounded-xl border border-slate-200">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-100 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                    <tr>
                      <th className="px-3 py-2">Kriteria</th>
                      {workspace.criteria.map((criteria) => (
                        <th key={criteria.id} className="px-3 py-2">{criteria.code}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {workspace.criteria.map((rowCriteria, rowIndex) => (
                      <tr key={rowCriteria.id} className="border-t border-slate-100">
                        <td className="px-3 py-2 font-semibold">{rowCriteria.code}</td>
                        {workspace.criteria.map((columnCriteria, columnIndex) => {
                          const value =
                            rowCriteria.id === columnCriteria.id
                              ? 1
                              : workspace.pairwiseMatrix[rowCriteria.id]?.[columnCriteria.id] ?? 1;
                          const isEditable = columnIndex > rowIndex;
                          return (
                            <td key={columnCriteria.id} className="px-3 py-2">
                              {isEditable ? (
                                <input
                                  type="number"
                                  min="0.111"
                                  step="0.1"
                                  className="w-24 rounded-lg border border-slate-200 px-2 py-1 text-sm"
                                  value={value}
                                  onChange={(event) =>
                                    handlePairwiseChange(
                                      rowCriteria.id,
                                      columnCriteria.id,
                                      Number(event.target.value),
                                    )
                                  }
                                />
                              ) : (
                                <div className="text-center text-slate-700">{numberFormatter.format(value)}</div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  className="rounded-full bg-emerald-600 px-6 py-3 text-sm font-semibold text-white"
                  onClick={handleCalculateAhp}
                >
                  Hitung Bobot AHP
                </button>
                <div className="rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-600">
                  Skala acuan: 1 (sama penting) · 3 (lebih penting) · 5 (kuat) · 7 (sangat kuat) · 9 (mutlak)
                </div>
              </div>

              {workspace.ahpResult && (
                <div className="space-y-3 rounded-xl border border-slate-200 p-3">
                  <div className="flex flex-wrap items-center gap-4">
                    <h3 className="text-base font-semibold text-slate-900">Hasil Bobot</h3>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${workspace.ahpResult.isConsistent ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}
                    >
                      CR: {numberFormatter.format(workspace.ahpResult.cr)}
                    </span>
                  </div>
                  <div className="overflow-auto">
                    <table className="min-w-full text-sm">
                      <thead className="bg-slate-100 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                        <tr>
                          <th className="px-4 py-3">Kriteria</th>
                          <th className="px-4 py-3">Bobot</th>
                          <th className="px-4 py-3">Persentase</th>
                        </tr>
                      </thead>
                      <tbody>
                        {workspace.criteria.map((criteria) => (
                          <tr key={criteria.id} className="border-t border-slate-100">
                            <td className="px-4 py-3">{criteria.name}</td>
                            <td className="px-4 py-3">{numberFormatter.format(workspace.ahpResult?.weights[criteria.id] ?? 0)}</td>
                            <td className="px-4 py-3 text-slate-600">
                              {percentFormatter.format(workspace.ahpResult?.weights[criteria.id] ?? 0)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="flex flex-wrap gap-6 text-sm text-slate-600">
                    <div>λmax: {workspace.ahpResult.lambdaMax}</div>
                    <div>CI: {workspace.ahpResult.ci}</div>
                    <div>CR: {workspace.ahpResult.cr}</div>
                  </div>
                  {!workspace.ahpResult.isConsistent && !ahpOverrideApproved && (
                    <div className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900">
                      Konsistensi di atas batas (CR &gt; 0,1). Mohon periksa kembali perbandingan atau konfirmasi untuk
                      tetap menggunakan bobot ini.
                      <div className="mt-3">
                        <button
                          className="rounded-full bg-amber-600 px-4 py-2 text-xs font-semibold text-white"
                          onClick={handleConfirmInconsistentAhp}
                        >
                          Konfirmasi & Gunakan
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <p className="text-slate-500">Tambahkan kriteria terlebih dahulu untuk mengisi matriks perbandingan.</p>
          )}
        </section>
        )}

        {mainTab === "topsis" && (
        <section id="topsis" className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <HeaderWithActions
            title="Modul TOPSIS"
            subtitle="Normalisasi, pembobotan, solusi ideal, hingga nilai preferensi."
            actions={
              <button
                className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white"
                onClick={handleCalculateTopsis}
              >
                Hitung TOPSIS
              </button>
            }
          />

          {workspace.topsisDetail ? (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {topsisTabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setTopsisTab(tab.id)}
                    className={`rounded-full px-4 py-2 text-xs font-semibold ${tab.id === topsisTab ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"}`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              <TopsisTable detail={workspace.topsisDetail} tab={topsisTab} />
            </div>
          ) : (
            <p className="text-sm text-slate-500">Jalankan TOPSIS untuk melihat detail perhitungan.</p>
          )}
        </section>
        )}

        {mainTab === "results" && (
        <section id="results" className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <HeaderWithActions
            title="Hasil Pemeringkatan"
            subtitle="Urutan akhir berdasarkan nilai preferensi V."
          />

          {workspace.topsisResults?.length ? (
            <RankingTable results={workspace.topsisResults} />
          ) : (
            <p className="text-sm text-slate-500">Belum ada hasil. Jalankan TOPSIS terlebih dahulu.</p>
          )}
        </section>
        )}
      </main>

      {isImportOpen && (
        <ImportWizard
          onClose={() => setIsImportOpen(false)}
          onApply={handleImportData}
        />
      )}
    </div>
  );
}

function DashboardCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="text-xl font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function StepCard({ label, status }: { label: string; status: boolean }) {
  return (
    <div className="rounded-xl border border-slate-200 px-4 py-3">
      <p className="text-sm font-semibold text-slate-800">{label}</p>
      <p className={`text-xs font-semibold ${status ? "text-emerald-600" : "text-slate-400"}`}>
        {status ? "Selesai" : "Belum"}
      </p>
    </div>
  );
}

function HeaderWithActions({
  title,
  subtitle,
  actions,
  badge,
}: {
  title: string;
  subtitle: string;
  actions?: React.ReactNode;
  badge?: string;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div>
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
          {badge && <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">{badge}</span>}
        </div>
        <p className="text-sm text-slate-600">{subtitle}</p>
      </div>
      {actions}
    </div>
  );
}

function TopsisTable({ detail, tab }: { detail: TopsisDetail; tab: TopsisTab }) {
  const headers = detail.criteria.map((criteria) => criteria.code);

  if (tab === "decision" || tab === "normalized" || tab === "weighted") {
    const matrix = tab === "decision" ? detail.decisionMatrix : tab === "normalized" ? detail.normalizedMatrix : detail.weightedMatrix;
    return (
      <div className="overflow-auto rounded-xl border border-slate-200">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-100">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                Alternatif
              </th>
              {headers.map((header) => (
                <th key={header} className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {detail.alternatives.map((alternative, rowIndex) => (
              <tr key={alternative.id} className="border-t border-slate-100">
                <td className="px-3 py-2 font-semibold">{alternative.name}</td>
                {matrix[rowIndex]?.map((value, columnIndex) => (
                  <td key={`${alternative.id}-${columnIndex}`} className="px-3 py-2 text-slate-700">
                    {numberFormatter.format(value)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (tab === "ideal") {
    return (
      <div className="overflow-auto rounded-xl border border-slate-200">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-100">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Jenis</th>
              {headers.map((header) => (
                <th key={header} className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr className="border-t border-slate-100">
              <td className="px-3 py-2 font-semibold text-emerald-700">A⁺</td>
              {detail.idealPositive.map((value, index) => (
                <td key={`a-plus-${index}`} className="px-3 py-2">{numberFormatter.format(value)}</td>
              ))}
            </tr>
            <tr className="border-t border-slate-100">
              <td className="px-3 py-2 font-semibold text-rose-700">A⁻</td>
              {detail.idealNegative.map((value, index) => (
                <td key={`a-minus-${index}`} className="px-3 py-2">{numberFormatter.format(value)}</td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    );
  }

  if (tab === "distance") {
    return (
      <div className="overflow-auto rounded-xl border border-slate-200">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-100">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Alternatif</th>
              <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">D⁺</th>
              <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">D⁻</th>
            </tr>
          </thead>
          <tbody>
            {detail.alternatives.map((alternative, index) => (
              <tr key={alternative.id} className="border-t border-slate-100">
                <td className="px-3 py-2 font-semibold">{alternative.name}</td>
                <td className="px-3 py-2">{numberFormatter.format(detail.distancesPlus[index] ?? 0)}</td>
                <td className="px-3 py-2">{numberFormatter.format(detail.distancesMinus[index] ?? 0)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="overflow-auto rounded-xl border border-slate-200">
      <table className="min-w-full text-sm">
        <thead className="bg-slate-100">
          <tr>
            <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Alternatif</th>
            <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Nilai V</th>
          </tr>
        </thead>
        <tbody>
          {detail.alternatives.map((alternative, index) => {
            const dPlus = detail.distancesPlus[index] ?? 0;
            const dMinus = detail.distancesMinus[index] ?? 0;
            const denominator = dPlus + dMinus;
            const score = denominator === 0 ? 0 : dMinus / denominator;
            return (
              <tr key={alternative.id} className="border-t border-slate-100">
                <td className="px-3 py-2 font-semibold">{alternative.name}</td>
                <td className="px-3 py-2">{numberFormatter.format(score)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function RankingTable({ results }: { results: TopsisResult[] }) {
  const downloadCsv = () => {
    const headers = ["Ranking", "ID Alternatif", "Nama", "Nilai V", "Rekomendasi"];
    const rows = results.map((result) => [
      result.rank,
      result.alternativeCode,
      result.alternativeName,
      result.score,
      result.rank === 1 ? "Terbaik" : "",
    ]);
    const csv = [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "hasil-topsis.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  const downloadExcel = () => {
    const workbook = XLSX.utils.book_new();
    const sheet = XLSX.utils.json_to_sheet(
      results.map((result) => ({
        ranking: result.rank,
        alternatif: result.alternativeName,
        nilaiV: result.score,
        rekomendasi: result.rank === 1 ? "Terbaik" : "",
      })),
    );
    XLSX.utils.book_append_sheet(workbook, sheet, "Pemeringkatan");
    XLSX.writeFile(workbook, "hasil-topsis.xlsx");
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <button className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700" onClick={downloadCsv}>
          Download CSV
        </button>
        <button className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700" onClick={downloadExcel}>
          Download Excel
        </button>
      </div>
      <div className="overflow-auto rounded-xl border border-slate-200">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-100 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
            <tr>
              <th className="px-4 py-3">Ranking</th>
              <th className="px-4 py-3">Alternatif</th>
              <th className="px-4 py-3">Nilai V</th>
              <th className="px-4 py-3">Detail</th>
            </tr>
          </thead>
          <tbody>
            {results.map((result) => (
              <tr
                key={result.alternativeId}
                className={`border-t border-slate-100 ${result.rank === 1 ? "bg-emerald-50" : ""}`}
              >
                <td className="px-4 py-3 font-semibold">
                  #{result.rank}
                  {result.rank === 1 && (
                    <span className="ml-2 rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-800">
                      Rekomendasi Terbaik
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="font-semibold">{result.alternativeName}</div>
                  <div className="text-xs text-slate-500">{result.alternativeCode}</div>
                </td>
                <td className="px-4 py-3">{numberFormatter.format(result.score)}</td>
                <td className="px-4 py-3 text-xs text-slate-500">D⁺: {numberFormatter.format(result.dPlus)} · D⁻: {numberFormatter.format(result.dMinus)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ImportWizard({
  onClose,
  onApply,
}: {
  onClose: () => void;
  onApply: (
    payload: Pick<WorkspaceState, "alternatives" | "criteria" | "scores"> & {
      summary: WorkspaceState["lastImportSummary"];
    },
  ) => void;
}) {
  const [step, setStep] = useState(1);
  const [source, setSource] = useState<"excel" | "json" | "sql">("excel");
  const [file, setFile] = useState<File | null>(null);
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string>("");
  const [jsonText, setJsonText] = useState("");
  const [sqlConfig, setSqlConfig] = useState({
    dbType: "postgres",
    host: "localhost",
    port: "5432",
    database: "",
    username: "",
    password: "",
    query: "SELECT * FROM alternatives LIMIT 50",
  });
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [rawRows, setRawRows] = useState<Record<string, string | number | null>[]>([]);
  const [columnRoles, setColumnRoles] = useState<Record<string, "id" | "name" | "description" | "ignore">>({});
  const [criteriaSelections, setCriteriaSelections] = useState<Record<
    string,
    { selected: boolean; name: string; type: CriteriaType }
  >>({});
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const resetWizard = () => {
    setStep(1);
    setPreview(null);
    setRawRows([]);
    setColumnRoles({});
    setCriteriaSelections({});
    setFile(null);
    setSheetNames([]);
    setSelectedSheet("");
    setError(null);
    setFeedback(null);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = event.target.files?.[0];
    if (uploadedFile) {
      setFile(uploadedFile);
      setSheetNames([]);
      setSelectedSheet("");
    }
  };

  const parseCsv = async (content: string) => {
    return new Promise<Record<string, string | number | null>[]>((resolve, reject) => {
      Papa.parse<Record<string, string | number | null>>(content, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          resolve(results.data);
        },
        error: (error: Error) => reject(error),
      });
    });
  };

  const parseExcel = async () => {
    if (!file) throw new Error("Pilih file terlebih dahulu");
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer);
    setSheetNames(workbook.SheetNames);
    const sheetName = selectedSheet || workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) throw new Error("Sheet tidak ditemukan");
    return XLSX.utils.sheet_to_json<Record<string, string | number | null>>(sheet);
  };

  const parseJson = async () => {
    if (file) {
      const text = await file.text();
      return JSON.parse(text);
    }
    return JSON.parse(jsonText || "[]");
  };

  const requestSqlPreview = async (overrideQuery?: string) => {
    const response = await fetch("/api/import/sql", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...sqlConfig,
        port: Number(sqlConfig.port),
        query: overrideQuery ?? sqlConfig.query,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({ message: "Gagal memproses SQL" }));
      throw new Error(errorBody.message || "Gagal memproses SQL");
    }

    return response.json();
  };

  const handlePreview = async () => {
    try {
      let rows: Record<string, string | number | null>[] = [];
      if (source === "excel") {
        if (!file) {
          setError("Unggah file terlebih dahulu");
          return;
        }
        const fileExtension = file.name.toLowerCase().split(".").pop();
        if (fileExtension === "csv") {
          rows = await parseCsv(await file.text());
        } else {
          rows = (await parseExcel()) as Record<string, string | number | null>[];
        }
      } else if (source === "json") {
        rows = await parseJson();
      } else {
        const data = await requestSqlPreview();
        rows = data.rows;
      }

      if (!rows.length) {
        throw new Error("Data kosong");
      }

      const columns = Object.keys(rows[0]);
      setRawRows(rows);
      setPreview({
        columns,
        rows: rows.slice(0, 50),
        rowCount: rows.length,
        source,
      });
      setColumnRoles({});
      setCriteriaSelections({});
      setStep(3);
      setError(null);
      setFeedback(null);
    } catch (previewError) {
      if (previewError instanceof Error) {
        setError(previewError.message);
        setFeedback(null);
      }
    }
  };

  const handleTestConnection = async () => {
    if (source !== "sql") return;
    try {
      await requestSqlPreview("SELECT 1");
      setFeedback("Koneksi database berhasil diuji.");
      setError(null);
    } catch (connectionError) {
      if (connectionError instanceof Error) {
        setError(connectionError.message);
        setFeedback(null);
      }
    }
  };

  const handleApplyMapping = () => {
    if (!preview) {
      setError("Belum ada data untuk diproses");
      setFeedback(null);
      return;
    }
    if (!rawRows.length) {
      setError("Data mentah tidak ditemukan");
      setFeedback(null);
      return;
    }

    const idColumn = Object.entries(columnRoles).find(([, role]) => role === "id")?.[0];
    const nameColumn = Object.entries(columnRoles).find(([, role]) => role === "name")?.[0];
    const descriptionColumn = Object.entries(columnRoles).find(([, role]) => role === "description")?.[0];

    if (!idColumn) {
      setError("Pilih kolom ID alternatif");
      setFeedback(null);
      return;
    }

    const selectedCriteriaConfigs = Object.entries(criteriaSelections)
      .filter(([, config]) => config.selected)
      .slice(0, MAX_CRITERIA)
      .map(([column, config], index) => ({
        column,
        name: config.name || column,
        type: config.type,
        id: crypto.randomUUID(),
        code: `C${index + 1}`,
      }));

    if (!selectedCriteriaConfigs.length) {
      setError("Pilih minimal satu kolom sebagai kriteria");
      setFeedback(null);
      return;
    }

    const alternativeMap = new Map<string, Alternative>();
    const criteria: Criteria[] = selectedCriteriaConfigs.map((item, index) => ({
      id: item.id,
      code: item.code,
      name: item.name,
      type: item.type,
      position: index,
    }));
    const columnMap: Record<string, string> = {};
    selectedCriteriaConfigs.forEach((item) => {
      columnMap[item.id] = item.column;
    });

    const scores: WorkspaceState["scores"] = {};

    for (const row of rawRows) {
      const rawId = row[idColumn];
      if (rawId === undefined || rawId === null || rawId === "") {
        continue;
      }
      const code = String(rawId);
      if (alternativeMap.has(code)) {
        setError(`Duplikasi ID alternatif: ${code}`);
        setFeedback(null);
        return;
      }
      const alternative: Alternative = {
        id: crypto.randomUUID(),
        code,
        name: nameColumn ? String(row[nameColumn] ?? code) : code,
        description: descriptionColumn ? String(row[descriptionColumn] ?? "") : undefined,
      };
      alternativeMap.set(code, alternative);
      scores[alternative.id] = {};

      for (const criteriaItem of criteria) {
        const columnName = columnMap[criteriaItem.id];
        if (!columnName) {
          setError("Mapping kriteria tidak lengkap");
          setFeedback(null);
          return;
        }
        const rawValue = row[columnName];
        const value = Number(rawValue);
        if (Number.isNaN(value)) {
          setError(`Nilai tidak valid pada ${alternative.name} - ${criteriaItem.name}`);
          setFeedback(null);
          return;
        }
        scores[alternative.id]![criteriaItem.id] = value;
      }
    }

    const alternatives = Array.from(alternativeMap.values());
    if (!alternatives.length) {
      setError("Tidak ada alternatif valid dalam data");
      setFeedback(null);
      return;
    }

    onApply({
      alternatives,
      criteria,
      scores,
      summary: {
        source: preview.source,
        importedAlternatives: alternatives.length,
        importedCriteria: criteria.length,
        timestamp: new Date().toISOString(),
      },
    });
    resetWizard();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 px-4">
      <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-xl bg-white p-4 shadow-2xl">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">Wizard Import</p>
            <h3 className="text-xl font-semibold text-slate-900">Langkah {step} dari 4</h3>
          </div>
          <button className="text-sm font-semibold text-slate-500" onClick={() => { resetWizard(); onClose(); }}>
            Tutup
          </button>
        </div>

        <div className="mb-3 flex flex-wrap gap-2 text-xs font-semibold">
          {["Pilih Sumber", "Input Sumber", "Preview Data", "Mapping & Kriteria"].map((label, index) => (
            <span
              key={label}
              className={`rounded-full px-3 py-1 ${index + 1 <= step ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-500"}`}
            >
              {index + 1}. {label}
            </span>
          ))}
        </div>

        {error && <div className="mb-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800">{error}</div>}
        {!error && feedback && (
          <div className="mb-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{feedback}</div>
        )}

        {step === 1 && (
          <div className="space-y-3">
            <p className="text-sm text-slate-600">Pilih sumber data yang ingin digunakan.</p>
            <div className="grid gap-3 md:grid-cols-3">
              {(
                [
                  { id: "excel", label: "Excel / CSV" },
                  { id: "json", label: "JSON" },
                  { id: "sql", label: "SQL" },
                ] as const
              ).map((option) => (
                <button
                  key={option.id}
                  className={`rounded-lg border px-3 py-4 text-center text-sm font-semibold ${source === option.id ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-slate-200 text-slate-600"}`}
                  onClick={() => setSource(option.id)}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <div className="flex justify-end">
              <button className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white" onClick={() => setStep(2)}>
                Lanjut
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-3">
            {source === "excel" && (
              <div className="space-y-3">
                <label className="block text-sm text-slate-600">
                  Upload File (.xlsx/.xls/.csv)
                  <input type="file" accept=".xlsx,.xls,.csv" className="mt-2 w-full" onChange={handleFileChange} />
                </label>
                {sheetNames.length > 1 && (
                  <label className="block text-sm text-slate-600">
                    Pilih Sheet
                    <select
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                      value={selectedSheet}
                      onChange={(event) => setSelectedSheet(event.target.value)}
                    >
                      {sheetNames.map((sheet) => (
                        <option key={sheet} value={sheet}>
                          {sheet}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
              </div>
            )}
            {source === "json" && (
              <div className="space-y-4">
                <label className="block text-sm text-slate-600">
                  Upload File JSON (opsional)
                  <input type="file" accept=".json" className="mt-2 w-full" onChange={handleFileChange} />
                </label>
                <label className="block text-sm text-slate-600">
                  Atau paste JSON (array objek)
                  <textarea
                    className="mt-2 h-40 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    value={jsonText}
                    onChange={(event) => setJsonText(event.target.value)}
                  />
                </label>
              </div>
            )}
            {source === "sql" && (
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block text-sm text-slate-600">
                  Tipe Database
                  <select
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    value={sqlConfig.dbType}
                    onChange={(event) => setSqlConfig((prev) => ({ ...prev, dbType: event.target.value }))}
                  >
                    <option value="postgres">PostgreSQL</option>
                    <option value="mysql">MySQL/MariaDB</option>
                  </select>
                </label>
                <label className="block text-sm text-slate-600">
                  Host
                  <input
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    value={sqlConfig.host}
                    onChange={(event) => setSqlConfig((prev) => ({ ...prev, host: event.target.value }))}
                  />
                </label>
                <label className="block text-sm text-slate-600">
                  Port
                  <input
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    value={sqlConfig.port}
                    onChange={(event) => setSqlConfig((prev) => ({ ...prev, port: event.target.value }))}
                  />
                </label>
                <label className="block text-sm text-slate-600">
                  Database
                  <input
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    value={sqlConfig.database}
                    onChange={(event) => setSqlConfig((prev) => ({ ...prev, database: event.target.value }))}
                  />
                </label>
                <label className="block text-sm text-slate-600">
                  Username
                  <input
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    value={sqlConfig.username}
                    onChange={(event) => setSqlConfig((prev) => ({ ...prev, username: event.target.value }))}
                  />
                </label>
                <label className="block text-sm text-slate-600">
                  Password
                  <input
                    type="password"
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    value={sqlConfig.password}
                    onChange={(event) => setSqlConfig((prev) => ({ ...prev, password: event.target.value }))}
                  />
                </label>
                <label className="md:col-span-2">
                  <span className="text-sm text-slate-600">SQL Query (SELECT ...)</span>
                  <textarea
                    className="mt-2 h-32 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    value={sqlConfig.query}
                    onChange={(event) => setSqlConfig((prev) => ({ ...prev, query: event.target.value }))}
                  />
                </label>
              </div>
            )}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <button className="rounded-full border border-slate-200 px-5 py-2 text-sm font-semibold text-slate-700" onClick={() => setStep(1)}>
                Kembali
              </button>
              <div className="flex gap-3">
                {source === "sql" && (
                  <button
                    type="button"
                    className="rounded-full border border-slate-200 px-5 py-2 text-sm font-semibold text-slate-700"
                    onClick={handleTestConnection}
                  >
                    Test Connection
                  </button>
                )}
                <button className="rounded-full bg-emerald-600 px-5 py-2 text-sm font-semibold text-white" onClick={handlePreview}>
                  Preview Data
                </button>
              </div>
            </div>
          </div>
        )}

        {step === 3 && preview && (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Terbaca {preview.columns.length} kolom · {preview.rowCount} baris (menampilkan 50 baris pertama)
            </p>
            <div className="max-h-80 overflow-auto rounded-xl border border-slate-200">
              <table className="min-w-full text-xs">
                <thead className="bg-slate-100">
                  <tr>
                    {preview.columns.map((column) => (
                      <th key={column} className="px-3 py-2 text-left font-semibold text-slate-600">
                        {column}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.rows.map((row, index) => (
                    <tr key={index} className="border-t border-slate-100">
                      {preview.columns.map((column) => (
                        <td key={`${index}-${column}`} className="px-3 py-2 text-slate-600">
                          {String(row[column] ?? "")}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex justify-between">
              <button className="rounded-full border border-slate-200 px-5 py-2 text-sm font-semibold text-slate-700" onClick={() => setStep(2)}>
                Kembali
              </button>
              <button className="rounded-full bg-emerald-600 px-5 py-2 text-sm font-semibold text-white" onClick={() => setStep(4)}>
                Lanjut ke Mapping
              </button>
            </div>
          </div>
        )}

        {step === 4 && preview && (
          <div className="space-y-6">
            <div>
              <h4 className="text-base font-semibold text-slate-900">Mapping Kolom</h4>
              <p className="text-sm text-slate-600">Tentukan peran kolom sumber.</p>
            </div>
            <div className="overflow-auto rounded-xl border border-slate-200">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                      Kolom Sumber
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                      Peran di Sistem
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                      Jadikan Kriteria?
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {preview.columns.map((column) => (
                    <tr key={column} className="border-t border-slate-100">
                      <td className="px-4 py-3 font-semibold">{column}</td>
                      <td className="px-4 py-3">
                        <select
                          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                          value={columnRoles[column] ?? "ignore"}
                          onChange={(event) =>
                            setColumnRoles((prev) => {
                              const next = { ...prev };
                              const value = event.target.value as "id" | "name" | "description" | "ignore";
                              if (value === "id") {
                                Object.keys(next).forEach((key) => {
                                  if (next[key] === "id") next[key] = "ignore";
                                });
                              }
                              next[column] = value;
                              return next;
                            })
                          }
                        >
                          <option value="ignore">Abaikan</option>
                          <option value="id">ID Alternatif</option>
                          <option value="name">Nama Alternatif</option>
                          <option value="description">Deskripsi</option>
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={criteriaSelections[column]?.selected ?? false}
                            onChange={(event) =>
                              setCriteriaSelections((prev) => {
                                const selectedCount = Object.values(prev).filter((item) => item.selected).length;
                                if (!event.target.checked && prev[column]) {
                                  return { ...prev, [column]: { ...prev[column], selected: false } };
                                }
                                if (event.target.checked && selectedCount >= MAX_CRITERIA && !prev[column]?.selected) {
                                  return prev;
                                }
                                return {
                                  ...prev,
                                  [column]: {
                                    selected: event.target.checked,
                                    name: prev[column]?.name || column,
                                    type: prev[column]?.type || "BENEFIT",
                                  },
                                };
                              })
                            }
                          />
                          {criteriaSelections[column]?.selected && (
                            <div className="flex flex-col gap-2 md:flex-row">
                              <input
                                className="rounded-lg border border-slate-200 px-2 py-1 text-xs"
                                value={criteriaSelections[column]?.name ?? column}
                                onChange={(event) =>
                                  setCriteriaSelections((prev) => ({
                                    ...prev,
                                    [column]: {
                                      ...(prev[column] ?? { selected: true, name: column, type: "BENEFIT" }),
                                      name: event.target.value,
                                    },
                                  }))
                                }
                              />
                              <select
                                className="rounded-lg border border-slate-200 px-2 py-1 text-xs"
                                value={criteriaSelections[column]?.type ?? "BENEFIT"}
                                onChange={(event) =>
                                  setCriteriaSelections((prev) => ({
                                    ...prev,
                                    [column]: {
                                      ...(prev[column] ?? { selected: true, name: column, type: "BENEFIT" }),
                                      type: event.target.value as CriteriaType,
                                    },
                                  }))
                                }
                              >
                                <option value="BENEFIT">Benefit</option>
                                <option value="COST">Cost</option>
                              </select>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex justify-between">
              <button className="rounded-full border border-slate-200 px-5 py-2 text-sm font-semibold text-slate-700" onClick={() => setStep(3)}>
                Kembali
              </button>
              <button className="rounded-full bg-emerald-600 px-5 py-2 text-sm font-semibold text-white" onClick={handleApplyMapping}>
                Simpan & Proses
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
