"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { calculateAhpResult, updatePairwiseValue } from "@/lib/spk/ahp";
import { MAX_CRITERIA } from "@/lib/spk/constants";
import { calculateTopsis } from "@/lib/spk/topsis";
import {
  createInitialWorkspaceState,
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
  WorkspaceState,
} from "@/lib/spk/types";

// UI Components
import { Button } from "./components/ui/Button";
import { Card, CardContent } from "./components/ui/Card";
import { Modal } from "./components/ui/Modal";
import { Input } from "./components/ui/Input";

// Feature Components
import { DashboardView } from "./components/features/DashboardView";
import { AlternativesManager } from "./components/features/AlternativesManager";
import { ImportAlternatives } from "./components/features/ImportAlternatives";
import { CriteriaManager } from "./components/features/CriteriaManager";
import { ScoreMatrix } from "./components/features/ScoreMatrix";
import { AhpModule } from "./components/features/AhpModule";
import { TopsisModule } from "./components/features/TopsisModule";
import { ResultsView } from "./components/features/ResultsView";

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

type MainTab = "dashboard" | "alternatives" | "criteria" | "scores" | "ahp" | "topsis" | "results";
type TopsisTab = "decision" | "normalized" | "weighted" | "ideal" | "distance" | "score";
type WorkspaceHistoryItem = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  workspace: WorkspaceState;
};

type AuthUser = {
  id: string;
  username: string;
  name?: string | null;
};

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
  // --- State Management ---
  const [workspace, setWorkspace] = useState<WorkspaceState>(() => createInitialWorkspaceState());
  const [mainTab, setMainTab] = useState<MainTab>("dashboard");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authForm, setAuthForm] = useState({ username: "", password: "" });
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [history, setHistory] = useState<WorkspaceHistoryItem[]>([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
  const [historyNameInput, setHistoryNameInput] = useState("");
  const [isNewCalcConfirmOpen, setIsNewCalcConfirmOpen] = useState(false);
  const [isHistoryListOpen, setIsHistoryListOpen] = useState(false);
  const [alternativeForm, setAlternativeForm] = useState<AlternativeForm>(() =>
    defaultAlternativeForm("A1"),
  );
  const [criteriaForm, setCriteriaForm] = useState<CriteriaForm>(() => defaultCriteriaForm("C1"));
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [topsisTab, setTopsisTab] = useState<TopsisTab>("decision");
  const [ahpOverrideApproved, setAhpOverrideApproved] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  // --- Derived State ---
  const nextAlternativeCode = useMemo(
    () => `A${workspace.alternatives.length + 1}`,
    [workspace.alternatives.length],
  );

  const nextCriteriaCode = useMemo(
    () => `C${workspace.criteria.length + 1}`,
    [workspace.criteria.length],
  );

  // --- Effects ---
  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem("spk_auth");
    if (stored === "true") {
      setIsAuthenticated(true);
    }
    const userRaw = window.localStorage.getItem("spk_user");
    if (userRaw) {
      try {
        const parsed = JSON.parse(userRaw) as AuthUser;
        if (parsed && parsed.id && parsed.username) {
          setCurrentUser(parsed);
        }
      } catch {
        // ignore
      }
    }
    const historyRaw = window.localStorage.getItem("spk_history");
    if (historyRaw) {
      try {
        const parsed = JSON.parse(historyRaw) as WorkspaceHistoryItem[];
        if (Array.isArray(parsed)) {
          setHistory(parsed);
        }
      } catch {
        // ignore
      }
    }
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    (async () => {
      try {
        const response = await fetch(
          `/api/history?userId=${encodeURIComponent(currentUser.id)}`,
        );
        if (!response.ok) return;
        const data = (await response.json()) as { items?: WorkspaceHistoryItem[] };
        if (Array.isArray(data.items)) {
          setHistory(data.items);
          persistHistory(data.items);
        }
      } catch {
        // ignore
      }
    })();
  }, [currentUser]);

  // --- Helpers ---
  const persistHistory = (items: WorkspaceHistoryItem[]) => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("spk_history", JSON.stringify(items));
  };

  const resetAlternativeForm = () => setAlternativeForm(defaultAlternativeForm(""));
  const resetCriteriaForm = () => setCriteriaForm(defaultCriteriaForm(""));
  const isAlternativeEdit = (form: AlternativeForm) => Boolean(form.id);
  const isCriteriaEdit = (form: CriteriaForm) => Boolean(form.id);

  // --- Handlers ---
  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAuthError(null);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(authForm),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok || !body) {
        setAuthError(body?.message || "Login gagal.");
        return;
      }
      const user = body.user as AuthUser | undefined;
      if (!user || !user.id || !user.username) {
        setAuthError("Respon login tidak valid.");
        return;
      }
      setIsAuthenticated(true);
      setCurrentUser(user);
      if (typeof window !== "undefined") {
        window.localStorage.setItem("spk_auth", "true");
        window.localStorage.setItem("spk_user", JSON.stringify(user));
      }
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Login gagal.");
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setCurrentUser(null);
    setHistory([]);
    if (typeof window !== "undefined") {
      window.localStorage.removeItem("spk_auth");
      window.localStorage.removeItem("spk_user");
      window.localStorage.removeItem("spk_history");
    }
  };

  const handleNewCalculation = () => {
    setWorkspace(createInitialWorkspaceState());
    setAlternativeForm(defaultAlternativeForm("A1"));
    setCriteriaForm(defaultCriteriaForm("C1"));
    setAhpOverrideApproved(false);
    setNotification(null);
    setTopsisTab("decision");
    setMainTab("dashboard");
    setIsImportOpen(false);
    setIsNewCalcConfirmOpen(false);
  };

  const performSaveHistory = (name: string) => {
    const now = new Date().toISOString();
    const item: WorkspaceHistoryItem = {
      id: crypto.randomUUID(),
      name,
      createdAt: now,
      updatedAt: now,
      workspace,
    };
    setHistory((prev) => {
      const next = [item, ...prev];
      persistHistory(next);
      return next;
    });
    if (currentUser) {
      void (async () => {
        try {
          await fetch("/api/history", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: item.id, userId: currentUser.id, name, workspace }),
          });
        } catch {
          // ignore
        }
      })();
    }
    setHasUnsavedChanges(false);
    setNotification(`Perhitungan "${name}" disimpan ke riwayat`);
  };

  const handleSaveHistorySubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = historyNameInput.trim();
    const name = trimmed || workspace.projectName || `Perhitungan ${history.length + 1}`;
    performSaveHistory(name);
    setIsSaveDialogOpen(false);
  };

  const handleLoadHistory = (id: string) => {
    const item = history.find((entry) => entry.id === id);
    if (!item) return;
    setWorkspace(item.workspace);
    setAlternativeForm(defaultAlternativeForm(`A${item.workspace.alternatives.length + 1}`));
    setCriteriaForm(defaultCriteriaForm(`C${item.workspace.criteria.length + 1}`));
    setAhpOverrideApproved(false);
    setTopsisTab("decision");
    setMainTab("dashboard");
    setIsImportOpen(false);
    setNotification(`Perhitungan "${item.name}" dimuat dari riwayat`);
    setHasUnsavedChanges(false);
    setIsHistoryListOpen(false);
  };

  const handleDeleteHistory = (id: string) => {
    setHistory((prev) => {
      const next = prev.filter((item) => item.id !== id);
      persistHistory(next);
      return next;
    });
    if (currentUser) {
      void (async () => {
        try {
          await fetch("/api/history", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id, userId: currentUser.id }),
          });
        } catch {
          // ignore
        }
      })();
    }
  };

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
    setHasUnsavedChanges(true);
  };

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
    setHasUnsavedChanges(true);
  };

  const handleImportAlternatives = (importedData: {
    alternatives: Partial<Alternative>[];
    criteria?: Criteria[];
    scores?: WorkspaceState["scores"];
  }) => {
    setWorkspace((prev) => {
      const newAlternatives: Alternative[] = importedData.alternatives.map((item, index) => ({
        id: item.id || crypto.randomUUID(),
        code: item.code || `A${prev.alternatives.length + index + 1}`,
        name: item.name || `Alternatif ${prev.alternatives.length + index + 1}`,
        description: item.description || "",
      }));

      const combinedAlternatives = [...prev.alternatives, ...newAlternatives];

      let criteriaToUse =
        importedData.criteria && importedData.criteria.length > 0
          ? importedData.criteria.slice(0, MAX_CRITERIA)
          : prev.criteria;

      criteriaToUse = criteriaToUse.map((item, index) => ({
        ...item,
        position: index,
      }));

      const mergedScores = importedData.scores ? { ...prev.scores, ...importedData.scores } : prev.scores;
      const scoresToUse = syncScoresStructure(combinedAlternatives, criteriaToUse, mergedScores);

      return {
        ...prev,
        alternatives: combinedAlternatives,
        criteria: criteriaToUse,
        scores: scoresToUse,
        pairwiseMatrix: importedData.criteria ? sanitizePairwiseMatrix(criteriaToUse, {}) : prev.pairwiseMatrix,
        ahpResult: importedData.criteria ? undefined : prev.ahpResult,
        topsisResults: undefined,
        topsisDetail: undefined,
      };
    });
    setIsImportOpen(false);
    setNotification(`${importedData.alternatives.length} alternatif berhasil diimport`);
    setHasUnsavedChanges(true);
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
    setHasUnsavedChanges(true);
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
    setHasUnsavedChanges(true);
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
    setHasUnsavedChanges(true);
  };

  const handlePairwiseChange = (rowId: string, colId: string, value: number) => {
    if (Number.isNaN(value) || value < 0) return;
    setWorkspace((prev) => ({
      ...prev,
      pairwiseMatrix: updatePairwiseValue(prev.pairwiseMatrix, rowId, colId, value),
      ahpResult: undefined,
      topsisResults: undefined,
      topsisDetail: undefined,
    }));
    setAhpOverrideApproved(false);
    setHasUnsavedChanges(true);
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
      setHasUnsavedChanges(true);
    } catch (error) {
      if (error instanceof Error) setNotification(error.message);
    }
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
      setHasUnsavedChanges(true);
    } catch (error) {
      if (error instanceof Error) setNotification(error.message);
    }
  };

  // --- Render ---
  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
        <Card className="w-full max-w-sm shadow-lg">
          <CardContent className="p-6">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-primary">
              Sistem Pendukung Keputusan
            </p>
            <h1 className="mb-4 text-xl font-semibold">Masuk ke Dashboard SPK</h1>
            <p className="mb-4 text-xs text-muted-foreground">
              Gunakan akun sementara <span className="font-mono font-semibold">user1234 / user1234</span>.
            </p>
            {authError && (
              <div className="mb-3 rounded-md border border-destructive/20 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                {authError}
              </div>
            )}
            <form className="space-y-3" onSubmit={handleLogin}>
              <label className="block text-sm">
                <span className="text-muted-foreground">Username</span>
                <Input
                  className="mt-1"
                  autoComplete="username"
                  value={authForm.username}
                  onChange={(e) => setAuthForm((prev) => ({ ...prev, username: e.target.value }))}
                />
              </label>
              <label className="block text-sm">
                <span className="text-muted-foreground">Password</span>
                <Input
                  type="password"
                  className="mt-1"
                  autoComplete="current-password"
                  value={authForm.password}
                  onChange={(e) => setAuthForm((prev) => ({ ...prev, password: e.target.value }))}
                />
              </label>
              <Button type="submit" className="mt-2 w-full">
                Masuk
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  const mainTabs: { id: MainTab; label: string }[] = [
    { id: "dashboard", label: "Ringkasan" },
    { id: "alternatives", label: "Alternatif" },
    { id: "criteria", label: "Kriteria" },
    { id: "scores", label: "Matriks" },
    { id: "ahp", label: "AHP" },
    { id: "topsis", label: "TOPSIS" },
    { id: "results", label: "Hasil" },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      <header className="sticky top-0 z-40 w-full border-b border-border bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold">
              SPK
            </div>
            <h1 className="text-lg font-bold tracking-tight hidden sm:block">SPK D – AHP + TOPSIS</h1>
          </div>
          
          <div className="flex items-center gap-2">
             <Button
                variant="outline"
                size="sm"
                onClick={() => setIsNewCalcConfirmOpen(true)}
              >
                Baru
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsSaveDialogOpen(true)}
              >
                Simpan
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsHistoryListOpen(true)}
              >
                Riwayat
              </Button>
            <div className="h-6 w-px bg-border mx-2" />
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              Keluar
            </Button>
          </div>
        </div>
        <div className="border-t border-border bg-muted/30">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex space-x-1 overflow-x-auto py-2 scrollbar-hide">
              {mainTabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setMainTab(tab.id)}
                  className={`whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                    mainTab === tab.id
                      ? "bg-white text-primary shadow-sm"
                      : "text-muted-foreground hover:bg-white/50 hover:text-foreground"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {notification && (
          <div className="mb-6 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-900 shadow-sm animate-in fade-in slide-in-from-top-2">
            {notification}
          </div>
        )}

        <div className="animate-in fade-in duration-500">
          {mainTab === "dashboard" && (
            <DashboardView workspace={workspace} onNavigate={(tab) => setMainTab(tab as MainTab)} />
          )}

          {mainTab === "alternatives" && (
            <AlternativesManager
              alternatives={workspace.alternatives}
              form={alternativeForm}
              onFormChange={setAlternativeForm}
              onSubmit={handleAlternativeSubmit}
              onDelete={handleAlternativeDelete}
              onReset={resetAlternativeForm}
              onImport={() => setIsImportOpen(true)}
            />
          )}

          <ImportAlternatives
            isOpen={isImportOpen}
            onClose={() => setIsImportOpen(false)}
            onImport={handleImportAlternatives}
          />

          {mainTab === "criteria" && (
            <CriteriaManager
              criteria={workspace.criteria}
              form={criteriaForm}
              onFormChange={setCriteriaForm}
              onSubmit={handleCriteriaSubmit}
              onDelete={handleCriteriaDelete}
              onReset={resetCriteriaForm}
            />
          )}

          {mainTab === "scores" && (
            <ScoreMatrix
              alternatives={workspace.alternatives}
              criteria={workspace.criteria}
              scores={workspace.scores}
              onScoreChange={handleScoreChange}
            />
          )}

          {mainTab === "ahp" && (
            <AhpModule
              criteria={workspace.criteria}
              pairwiseMatrix={workspace.pairwiseMatrix}
              ahpResult={workspace.ahpResult}
              onPairwiseChange={handlePairwiseChange}
              onCalculate={handleCalculateAhp}
              onConfirmInconsistent={() => setAhpOverrideApproved(true)}
              isOverrideApproved={ahpOverrideApproved}
            />
          )}

          {mainTab === "topsis" && (
            <TopsisModule
              workspace={workspace}
              activeTab={topsisTab}
              onTabChange={setTopsisTab}
              onCalculate={handleCalculateTopsis}
            />
          )}

          {mainTab === "results" && <ResultsView workspace={workspace} />}
        </div>
      </main>

      {/* Modals */}
      <Modal
        isOpen={isNewCalcConfirmOpen}
        onClose={() => setIsNewCalcConfirmOpen(false)}
        title="Mulai Perhitungan Baru?"
        description="Semua data yang belum disimpan akan hilang."
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsNewCalcConfirmOpen(false)}>
              Batal
            </Button>
            <Button variant="destructive" onClick={handleNewCalculation}>
              Ya, Mulai Baru
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted-foreground">
          Pastikan Anda telah menyimpan pekerjaan Anda saat ini jika masih diperlukan.
        </p>
      </Modal>

      <Modal
        isOpen={isSaveDialogOpen}
        onClose={() => setIsSaveDialogOpen(false)}
        title="Simpan ke Riwayat"
        description="Simpan progres perhitungan Anda saat ini."
      >
        <form onSubmit={handleSaveHistorySubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium leading-none">Nama Perhitungan</label>
            <Input
              value={historyNameInput}
              onChange={(e) => setHistoryNameInput(e.target.value)}
              placeholder="Contoh: Pemilihan Mobil 2024"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setIsSaveDialogOpen(false)}>
              Batal
            </Button>
            <Button type="submit">Simpan</Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={isHistoryListOpen}
        onClose={() => setIsHistoryListOpen(false)}
        title="Riwayat Perhitungan"
        description="Daftar perhitungan yang tersimpan."
      >
        <div className="max-h-[300px] overflow-y-auto space-y-2 pr-2">
          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Belum ada riwayat tersimpan.</p>
          ) : (
            history.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/50 transition-colors"
              >
                <div className="overflow-hidden">
                  <p className="font-medium truncate">{item.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(item.updatedAt).toLocaleDateString("id-ID")}
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button variant="outline" size="sm" onClick={() => handleLoadHistory(item.id)}>
                    Muat
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => handleDeleteHistory(item.id)}>
                    Hapus
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </Modal>
    </div>
  );
}
