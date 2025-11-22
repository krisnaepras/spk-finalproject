import { useMemo, useState } from "react";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { Button } from "../ui/Button";
import { Modal } from "../ui/Modal";
import { MAX_CRITERIA } from "@/lib/spk/constants";
import type { Alternative, Criteria, CriteriaType, WorkspaceState } from "@/lib/spk/types";

type ImportFormat = "json" | "excel" | "sql";
type ImportStep = "format" | "input" | "mapping" | "done";
type RawValue = string | number | boolean | null | undefined;
type RawRecord = Record<string, RawValue>;

type CriteriaSelection = {
  selected: boolean;
  name: string;
  type: CriteriaType;
};

type ImportSummary = {
  alternatives: number;
  criteria: number;
  rows: number;
  columns: number;
  format: ImportFormat;
  codeField: string;
  nameField?: string;
  descField?: string;
};

interface ImportAlternativesProps {
  isOpen?: boolean;
  inline?: boolean;
  onClose?: () => void;
  onImport: (data: {
    alternatives: Partial<Alternative>[];
    criteria?: Criteria[];
    scores?: WorkspaceState["scores"];
  }) => void;
}

const STEPS: Array<{ id: ImportStep; label: string; helper: string }> = [
  { id: "format", label: "Format", helper: "Pilih tipe sumber" },
  { id: "input", label: "Input Data", helper: "Tempel / upload" },
  { id: "mapping", label: "Mapping", helper: "ID + Kriteria" },
  { id: "done", label: "Selesai", helper: "Ringkasan import" },
];

const SAMPLE_JSON = `[
  {
    "alt_id": "A1",
    "alt_name": "Mobil A",
    "description": "Hatchback 1.2L",
    "harga": 180000000,
    "emisi_co2": 110,
    "konsumsi_bbm": 18.5,
    "biaya_servis_tahunan": 4500000
  },
  {
    "alt_id": "A2",
    "alt_name": "Mobil B",
    "description": "MPV 1.5L",
    "harga": 225000000,
    "emisi_co2": 125,
    "konsumsi_bbm": 15.2,
    "biaya_servis_tahunan": 5200000
  }
]`;

const MAX_PREVIEW_ROWS = 8;

const prettifyField = (value: string) =>
  value
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());

const guessIsCost = (field: string) => {
  const lower = field.toLowerCase();
  return (
    lower.includes("cost") ||
    lower.includes("harga") ||
    lower.includes("biaya") ||
    lower.includes("emisi")
  );
};

export const ImportAlternatives = ({ isOpen = false, inline = false, onClose, onImport }: ImportAlternativesProps) => {
  const [step, setStep] = useState<ImportStep>("format");
  const [format, setFormat] = useState<ImportFormat>("json");
  const [jsonText, setJsonText] = useState("");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState("");
  const [excelWorkbook, setExcelWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [excelSheets, setExcelSheets] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string>("");
  const [isParsing, setIsParsing] = useState(false);
  const [sqlConfig, setSqlConfig] = useState({
    dbType: "postgres" as "postgres" | "mysql",
    host: "",
    port: "",
    database: "",
    username: "",
    password: "",
    query: "SELECT * FROM your_table LIMIT 50",
  });
  const [isSqlPreviewing, setIsSqlPreviewing] = useState(false);
  const [sqlRowCount, setSqlRowCount] = useState<number | null>(null);
  const [rawData, setRawData] = useState<RawRecord[]>([]);
  const [availableFields, setAvailableFields] = useState<string[]>([]);
  const [fieldMapping, setFieldMapping] = useState({ codeField: "", nameField: "", descField: "" });
  const [criteriaSelections, setCriteriaSelections] = useState<Record<string, CriteriaSelection>>({});
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<ImportSummary | null>(null);

  const currentStepIndex = STEPS.findIndex((item) => item.id === step);
  const previewRows = useMemo(() => rawData.slice(0, MAX_PREVIEW_ROWS), [rawData]);

  const selectedCriteriaEntries = useMemo(
    () => Object.entries(criteriaSelections).filter(([, config]) => config.selected),
    [criteriaSelections],
  );
  const selectedCriteriaCount = selectedCriteriaEntries.length;
  const criteriaLimitReached = selectedCriteriaCount >= MAX_CRITERIA;
  const mappingReady = Boolean(fieldMapping.codeField);
  const canParse = useMemo(() => {
    if (format === "json") return Boolean(jsonText.trim());
    if (format === "excel") return Boolean(uploadedFile);
    if (format === "sql")
      return Boolean(
        sqlConfig.host.trim() &&
          sqlConfig.database.trim() &&
          sqlConfig.username.trim() &&
          sqlConfig.query.trim(),
      );
    return false;
  }, [format, jsonText, uploadedFile, sqlConfig]);

  const resetParsedData = () => {
    setRawData([]);
    setAvailableFields([]);
    setFieldMapping({ codeField: "", nameField: "", descField: "" });
    setCriteriaSelections({});
    setSummary(null);
    setError(null);
  };

  const resetWizard = () => {
    setStep("format");
    setFormat("json");
    setJsonText("");
    setUploadedFile(null);
    setUploadedFileName("");
    setExcelWorkbook(null);
    setExcelSheets([]);
    setSelectedSheet("");
    setIsParsing(false);
    setSqlConfig({
      dbType: "postgres",
      host: "",
      port: "",
      database: "",
      username: "",
      password: "",
      query: "SELECT * FROM your_table LIMIT 50",
    });
    setIsSqlPreviewing(false);
    setSqlRowCount(null);
    resetParsedData();
  };

  const handleClose = () => {
    resetWizard();
    onClose?.();
  };

  const handleFormatSelect = (nextFormat: ImportFormat) => {
    setFormat(nextFormat);
    setUploadedFile(null);
    setUploadedFileName("");
    setExcelWorkbook(null);
    setExcelSheets([]);
    setSelectedSheet("");
    if (nextFormat !== "json") {
      setJsonText("");
    }
    setSqlRowCount(null);
    resetParsedData();
  };

  const detectFields = (data: RawRecord[]) => {
    const fields = Object.keys(data[0] || {});
    if (!fields.length) {
      throw new Error("Tidak ada kolom yang terbaca pada data sumber.");
    }

    const codeField =
      fields.find(
        (f) =>
          f.toLowerCase().match(/^(id|code|kode)$/) ||
          f.toLowerCase().includes("id") ||
          f.toLowerCase().includes("code") ||
          f.toLowerCase().includes("kode"),
      ) || fields[0];

    const nameField =
      fields.find((f) => f.toLowerCase().includes("name") || f.toLowerCase().includes("nama")) || fields[1] || "";

    const descField =
      fields.find(
        (f) =>
          f.toLowerCase().includes("desc") ||
          f.toLowerCase().includes("deskripsi") ||
          f.toLowerCase() === "description",
      ) || "";

    const numericCandidates = fields.filter((field) => {
      if (field === codeField || field === nameField || field === descField) return false;
      const sample = data.find((row) => typeof row[field] === "number");
      return typeof sample?.[field] === "number";
    });

    const criteria: Record<string, CriteriaSelection> = {};
    const autoSelectCount = Math.min(2, MAX_CRITERIA);
    numericCandidates.forEach((field, index) => {
      criteria[field] = {
        selected: index < autoSelectCount,
        name: prettifyField(field),
        type: guessIsCost(field) ? "COST" : "BENEFIT",
      };
    });

    return { fields, codeField, nameField, descField, criteria };
  };

  const processParsedData = (data: RawRecord[]) => {
    if (!Array.isArray(data) || data.length === 0) {
      throw new Error("Data kosong atau tidak terbaca.");
    }
    const detection = detectFields(data);
    setRawData(data);
    setAvailableFields(detection.fields);
    setFieldMapping({
      codeField: detection.codeField,
      nameField: detection.nameField,
      descField: detection.descField,
    });
    setCriteriaSelections(detection.criteria);
    setSummary(null);
    setStep("mapping");
  };

  const parseCsvFile = (file: File): Promise<RawRecord[]> =>
    new Promise((resolve, reject) => {
      Papa.parse<RawRecord>(file, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
        complete: (result) => {
          if (result.errors && result.errors.length > 0) {
            reject(new Error(result.errors[0]?.message || "Gagal membaca file CSV."));
            return;
          }
          const data = (result.data as RawRecord[]).filter((row) =>
            Object.values(row).some((value) => value !== null && value !== undefined && value !== ""),
          );
          resolve(data);
        },
        error: (err) => reject(err),
      });
    });

  const parseExcelWorkbook = async (file: File, sheetName?: string) => {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "array" });
    const sheets = workbook.SheetNames;
    if (!sheets.length) {
      throw new Error("File tidak memiliki sheet.");
    }
    const activeSheet = sheetName && sheets.includes(sheetName) ? sheetName : sheets[0];
    const worksheet = workbook.Sheets[activeSheet];
    if (!worksheet) {
      throw new Error("Sheet tidak ditemukan.");
    }
    const rows = XLSX.utils.sheet_to_json<RawRecord>(worksheet, { defval: null }) as RawRecord[];
    return { workbook, sheets, sheetName: activeSheet, rows };
  };

  const handleSheetChange = (sheetName: string) => {
    if (!excelWorkbook) return;
    try {
      const worksheet = excelWorkbook.Sheets[sheetName];
      if (!worksheet) {
        throw new Error("Sheet tidak ditemukan.");
      }
      const rows = XLSX.utils.sheet_to_json<RawRecord>(worksheet, { defval: null }) as RawRecord[];
      setSelectedSheet(sheetName);
      processParsedData(rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memproses sheet terpilih.");
    }
  };

  const handleSqlPreview = async () => {
    try {
      setError(null);
      setSummary(null);
      setIsSqlPreviewing(true);

      const response = await fetch("/api/import/sql", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          dbType: sqlConfig.dbType,
          host: sqlConfig.host.trim(),
          port: sqlConfig.port ? Number(sqlConfig.port) : undefined,
          database: sqlConfig.database.trim(),
          username: sqlConfig.username.trim(),
          password: sqlConfig.password,
          query: sqlConfig.query.trim(),
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.message || "Gagal mengambil data dari sumber SQL.");
      }

      const result = await response.json();
      const rows = (result.rows || []) as RawRecord[];
      const rowCount = typeof result.rowCount === "number" ? result.rowCount : rows.length;

      if (!rows.length) {
        throw new Error("Query tidak menghasilkan data.");
      }

      setSqlRowCount(rowCount);
      setUploadedFile(null);
      setUploadedFileName("");
      setExcelWorkbook(null);
      setExcelSheets([]);
      setSelectedSheet("");
      processParsedData(rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memproses data SQL.");
      setRawData([]);
      setAvailableFields([]);
      setCriteriaSelections({});
    } finally {
      setIsSqlPreviewing(false);
    }
  };

  const handleParseData = async () => {
    if (format === "sql") {
      await handleSqlPreview();
      return;
    }

    setIsParsing(true);
    try {
      setError(null);
      setSummary(null);
      setSqlRowCount(null);

      if (format === "json") {
        const parsed = JSON.parse(jsonText) as unknown;

        if (!Array.isArray(parsed)) {
          throw new Error("Format JSON harus berupa array of objects.");
        }
        if (parsed.length === 0) {
          throw new Error("Array JSON kosong.");
        }

        const json = parsed as RawRecord[];
        processParsedData(json);
      } else if (format === "excel") {
        if (!uploadedFile) {
          throw new Error("Pilih file Excel atau CSV terlebih dahulu.");
        }

        const lowerName = uploadedFile.name.toLowerCase();
        setUploadedFileName(uploadedFile.name);

        if (lowerName.endsWith(".csv")) {
          const rows = await parseCsvFile(uploadedFile);
          processParsedData(rows);
          setExcelWorkbook(null);
          setExcelSheets([]);
          setSelectedSheet("");
        } else {
          const parsed = await parseExcelWorkbook(uploadedFile, selectedSheet);
          setExcelWorkbook(parsed.workbook);
          setExcelSheets(parsed.sheets);
          setSelectedSheet(parsed.sheetName);
          processParsedData(parsed.rows);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan saat import.");
      setRawData([]);
      setAvailableFields([]);
      setCriteriaSelections({});
    } finally {
      setIsParsing(false);
    }
  };

  const handleImportExecute = () => {
    try {
      setError(null);

      if (!rawData.length) {
        setError("Tidak ada data untuk diimpor.");
        return;
      }
      if (!fieldMapping.codeField) {
        setError("Field ID/Code wajib dipilih.");
        return;
      }

      const limitedCriteriaEntries = selectedCriteriaEntries.slice(0, MAX_CRITERIA);

      const mappedRows = rawData
        .map((item) => {
          const code = String(item[fieldMapping.codeField] ?? "").trim();
          const nameValue = fieldMapping.nameField ? String(item[fieldMapping.nameField] ?? "").trim() : "";
          const name = nameValue || code;
          const description = fieldMapping.descField ? String(item[fieldMapping.descField] ?? "").trim() : "";
          return { code, name, description: description || undefined, source: item };
        })
        .filter((row) => row.code);

      if (!mappedRows.length) {
        setError("Tidak ada baris valid (field ID kosong).");
        return;
      }

      const selectedCriteria: Array<Criteria & { sourceField: string }> = limitedCriteriaEntries.map(
        ([field, config], index) => ({
          id: crypto.randomUUID(),
          code: `C${index + 1}`,
          name: config.name?.trim() || prettifyField(field),
          type: config.type,
          position: index,
          sourceField: field,
        }),
      );

      const alternativesWithIds: Alternative[] = mappedRows.map((row) => ({
        id: crypto.randomUUID(),
        code: row.code,
        name: row.name || row.code,
        description: row.description,
      }));

      let scores: WorkspaceState["scores"] | undefined;
      if (selectedCriteria.length > 0) {
        scores = {};
        alternativesWithIds.forEach((alt, altIndex) => {
          scores![alt.id] = {};
          selectedCriteria.forEach((criteria) => {
            const value = Number(mappedRows[altIndex]?.source?.[criteria.sourceField]);
            scores![alt.id][criteria.id] = Number.isFinite(value) ? value : null;
          });
        });
      }

      onImport({
        alternatives: alternativesWithIds,
        criteria:
          selectedCriteria.length > 0
            ? selectedCriteria.map<Criteria>(({ sourceField, ...crit }) => {
                void sourceField;
                return crit;
              })
            : undefined,
        scores: selectedCriteria.length > 0 ? scores : undefined,
      });

      setSummary({
        alternatives: alternativesWithIds.length,
        criteria: selectedCriteria.length,
        rows: sqlRowCount ?? rawData.length,
        columns: availableFields.length,
        format,
        codeField: fieldMapping.codeField,
        nameField: fieldMapping.nameField,
        descField: fieldMapping.descField,
      });
      setStep("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan saat import.");
    }
  };


  const renderStepIndicator = () => (
    <div className="flex flex-wrap gap-2 text-xs font-semibold">
      {STEPS.map((item, idx) => {
        const active = idx === currentStepIndex;
        const done = idx < currentStepIndex;
        return (
          <button
            key={item.id}
            type="button"
            className={`rounded-md border px-3 py-1.5 transition-colors ${
              active ? "border-primary bg-cyan-50 text-primary" : done ? "border-slate-200 bg-slate-100" : "border-slate-200"
            }`}
            onClick={() => setStep(item.id)}
          >
            {idx + 1}. {item.label}
          </button>
        );
      })}
    </div>
  );

  const content = (
      <div className="space-y-4">
          {renderStepIndicator()}

          {error && (
              <div className="rounded-lg border border-rose-300 bg-rose-50 p-3 text-sm text-rose-700">
                  {error}
              </div>
          )}

          {step === "format" && (
              <div className="space-y-4">
                  <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-4 shadow-sm">
                      <p className="text-sm text-muted-foreground">
                          Pilih sumber data yang akan digunakan.
                      </p>
                      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                          {[
                              {
                                  id: "json",
                                  title: "JSON",
                                  desc: "Tempel array of objects"
                              },
                              {
                                  id: "excel",
                                  title: "Excel / CSV",
                                  desc: "Upload file, pilih sheet bila perlu"
                              },
                              {
                                  id: "sql",
                                  title: "SQL",
                                  desc: "Koneksi ke DB & jalankan query SELECT"
                              }
                          ].map((opt) => (
                              <button
                                  key={opt.id}
                                  onClick={() =>
                                      handleFormatSelect(opt.id as ImportFormat)
                                  }
                                  className={`w-full rounded-lg border px-4 py-4 text-left transition-all ${
                                      format === opt.id
                                          ? "border-primary bg-cyan-50 text-primary shadow-sm"
                                          : "border-slate-200 hover:border-primary/50"
                                  }`}
                              >
                                  <div className="flex items-center justify-between gap-2">
                                      <div className="font-semibold">
                                          {opt.title}
                                      </div>
                                      {opt.id !== "json" && (
                                          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                                              Baru
                                          </span>
                                      )}
                                  </div>
                                  <div className="mt-1 text-xs text-muted-foreground">
                                      {opt.desc}
                                  </div>
                              </button>
                          ))}
                      </div>
                  </div>

                  <div className="flex justify-end">
                      <Button onClick={() => setStep("input")}>Lanjut</Button>
                  </div>
              </div>
          )}

          {step === "input" && (
              <div className="space-y-4">
                  <div className="rounded-xl border border-slate-200 bg-white/80 p-4 shadow-sm">
                      <div className="flex items-start justify-between gap-3">
                          <div>
                              <p className="text-sm font-semibold">
                                  {format === "json"
                                      ? "Tempel data JSON"
                                      : format === "excel"
                                      ? "Upload file Excel/CSV"
                                      : "Koneksi database & preview SQL"}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                  {format === "json" &&
                                      `Format array of objects. Kolom ID wajib, kolom numerik bisa dijadikan kriteria (maks ${MAX_CRITERIA}).`}
                                  {format === "excel" &&
                                      "Unggah file .xlsx/.xls/.csv. Kolom numerik akan terdeteksi otomatis sebagai kandidat kriteria."}
                                  {format === "sql" &&
                                      "Isi detail koneksi database dan jalankan query SELECT untuk mengambil sample data (maks 100 baris)."}
                              </p>
                          </div>
                          <span className="rounded-full bg-primary/10 px-3 py-1 text-[11px] font-semibold text-primary">
                              Langkah 2 dari {STEPS.length}
                          </span>
                      </div>

                      {format === "json" && (
                          <div className="mt-3 space-y-2">
                              <div className="flex items-center justify-between">
                                  <label className="text-xs font-medium text-muted-foreground">
                                      Tempel JSON di sini
                                  </label>
                                  <Button
                                      variant="ghost"
                                      size="sm"
                                      className="text-xs"
                                      onClick={() =>
                                          setJsonText(SAMPLE_JSON.trim())
                                      }
                                  >
                                      Gunakan contoh data
                                  </Button>
                              </div>
                              <textarea
                                  className="flex min-h-[200px] w-full rounded-lg border border-border bg-white px-3 py-2 text-sm font-mono placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 shadow-sm"
                                  placeholder={
                                      '[\n  {\n    "alt_id": "A1",\n    "alt_name": "Mobil A",\n    "description": "Hatchback 1.2L",\n    "harga": 180000000,\n    "emisi_co2": 110,\n    ...\n  }\n]'
                                  }
                                  value={jsonText}
                                  onChange={(e) => setJsonText(e.target.value)}
                              />
                              <div className="flex flex-wrap items-center justify-between text-xs text-muted-foreground">
                                  <span>
                                      Tip: Nama kolom bebas, akan di-mapping
                                      pada langkah berikutnya.
                                  </span>
                                  <span>
                                      {jsonText.length.toLocaleString()} karakter
                                  </span>
                              </div>
                          </div>
                      )}

                      {format === "excel" && (
                          <div className="mt-3 space-y-3">
                              <label className="text-xs font-medium text-muted-foreground">
                                  Upload file Excel / CSV
                                  <input
                                      type="file"
                                      accept=".xlsx,.xls,.csv"
                                      className="mt-1 flex h-10 w-full rounded-md border border-border bg-white px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-primary/10 file:px-3 file:py-1 file:text-xs file:font-semibold file:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                                      onChange={(e) => {
                                          const file = e.target.files?.[0];
                                          setUploadedFile(file || null);
                                          setUploadedFileName(file?.name || "");
                                          setExcelWorkbook(null);
                                          setExcelSheets([]);
                                          setSelectedSheet("");
                                          resetParsedData();
                                      }}
                                  />
                              </label>

                              {uploadedFileName && (
                                  <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
                                      <div className="flex items-center justify-between">
                                          <span className="font-semibold">
                                              {uploadedFileName}
                                          </span>
                                          {uploadedFile?.size && (
                                              <span className="text-[11px] text-muted-foreground">
                                                  {(uploadedFile.size / 1024).toFixed(
                                                      1
                                                  )}{" "}
                                                  KB
                                              </span>
                                          )}
                                      </div>
                                      <div className="text-muted-foreground">
                                          Sheet pertama akan dibaca otomatis.
                                          Jika multi-sheet, pilih sheet saat
                                          preview.
                                      </div>
                                  </div>
                              )}

                              <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-xs text-muted-foreground space-y-1">
                                  <div>
                                      Gunakan header baris pertama untuk nama
                                      kolom.
                                  </div>
                                  <div>
                                      Kolom numerik akan ditandai sebagai
                                      kandidat kriteria (maks {MAX_CRITERIA}).
                                  </div>
                                  <div>
                                      File CSV didukung; pilih delimiter standar
                                      koma.
                                  </div>
                              </div>
                          </div>
                      )}

                      {format === "sql" && (
                          <div className="mt-3 space-y-3">
                              <div className="grid gap-3 sm:grid-cols-2">
                                  <label className="text-xs font-medium text-muted-foreground">
                                      Jenis database
                                      <select
                                          className="mt-1 flex h-9 w-full rounded-md border border-border bg-white px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                                          value={sqlConfig.dbType}
                                          onChange={(e) =>
                                              setSqlConfig((prev) => ({
                                                  ...prev,
                                                  dbType: e.target
                                                      .value as "postgres" | "mysql"
                                              }))
                                          }
                                      >
                                          <option value="postgres">PostgreSQL</option>
                                          <option value="mysql">MySQL</option>
                                      </select>
                                  </label>
                                  <label className="text-xs font-medium text-muted-foreground">
                                      Host / IP
                                      <input
                                          className="mt-1 flex h-9 w-full rounded-md border border-border bg-white px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                                          value={sqlConfig.host}
                                          onChange={(e) =>
                                              setSqlConfig((prev) => ({
                                                  ...prev,
                                                  host: e.target.value
                                              }))
                                          }
                                          placeholder="localhost"
                                      />
                                  </label>
                                  <label className="text-xs font-medium text-muted-foreground">
                                      Port
                                      <input
                                          className="mt-1 flex h-9 w-full rounded-md border border-border bg-white px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                                          value={sqlConfig.port}
                                          onChange={(e) =>
                                              setSqlConfig((prev) => ({
                                                  ...prev,
                                                  port: e.target.value
                                              }))
                                          }
                                          placeholder={
                                              sqlConfig.dbType === "postgres"
                                                  ? "5432"
                                                  : "3306"
                                          }
                                      />
                                  </label>
                                  <label className="text-xs font-medium text-muted-foreground">
                                      Database
                                      <input
                                          className="mt-1 flex h-9 w-full rounded-md border border-border bg-white px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                                          value={sqlConfig.database}
                                          onChange={(e) =>
                                              setSqlConfig((prev) => ({
                                                  ...prev,
                                                  database: e.target.value
                                              }))
                                          }
                                          placeholder="nama_database"
                                      />
                                  </label>
                                  <label className="text-xs font-medium text-muted-foreground">
                                      Username
                                      <input
                                          className="mt-1 flex h-9 w-full rounded-md border border-border bg-white px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                                          value={sqlConfig.username}
                                          onChange={(e) =>
                                              setSqlConfig((prev) => ({
                                                  ...prev,
                                                  username: e.target.value
                                              }))
                                          }
                                          placeholder="db_user"
                                      />
                                  </label>
                                  <label className="text-xs font-medium text-muted-foreground">
                                      Password
                                      <input
                                          type="password"
                                          className="mt-1 flex h-9 w-full rounded-md border border-border bg-white px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                                          value={sqlConfig.password}
                                          onChange={(e) =>
                                              setSqlConfig((prev) => ({
                                                  ...prev,
                                                  password: e.target.value
                                              }))
                                          }
                                          placeholder="••••••"
                                      />
                                  </label>
                              </div>

                              <label className="text-xs font-medium text-muted-foreground">
                                  SQL Query (hanya SELECT)
                                  <textarea
                                      className="mt-1 flex min-h-[120px] w-full rounded-lg border border-border bg-white px-3 py-2 text-sm font-mono placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 shadow-sm"
                                      value={sqlConfig.query}
                                      onChange={(e) =>
                                          setSqlConfig((prev) => ({
                                              ...prev,
                                              query: e.target.value
                                          }))
                                      }
                                      placeholder="SELECT * FROM alternatif LIMIT 50"
                                  />
                              </label>

                              <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-xs text-muted-foreground space-y-1">
                                  <div>
                                      Hanya perintah SELECT yang diizinkan untuk
                                      preview, data dibatasi 100 baris pertama.
                                  </div>
                                  <div>
                                      Kredensial tidak disimpan; hanya dipakai
                                      sekali untuk mengambil sample.
                                  </div>
                                  {typeof sqlRowCount === "number" && (
                                      <div className="text-emerald-700 font-semibold">
                                          Preview terakhir: {sqlRowCount} baris
                                          terdeteksi
                                      </div>
                                  )}
                              </div>
                          </div>
                      )}
                  </div>

                  <div className="flex justify-between">
                      <Button variant="ghost" onClick={() => setStep("format")}>
                          Kembali
                      </Button>
                      <Button
                          onClick={handleParseData}
                          disabled={!canParse || isParsing || isSqlPreviewing}
                      >
                          {format === "sql"
                              ? isSqlPreviewing
                                  ? "Mengambil data..."
                                  : "Preview SQL"
                              : isParsing
                              ? "Memproses..."
                              : "Parse & Preview"}
                      </Button>
                  </div>
              </div>
          )}

          {step === "mapping" && rawData.length > 0 && (
              <div className="space-y-4">
                  <div className="space-y-3">
                      <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
                          <div className="flex items-center justify-between text-xs">
                              <div>
                                  <div className="font-semibold">
                                      {rawData.length} baris
                                  </div>
                                  <div className="text-muted-foreground">
                                      {availableFields.length} kolom
                                  </div>
                              </div>
                              <div className="text-muted-foreground">
                                  Preview{" "}
                                  {Math.min(
                                      previewRows.length,
                                      MAX_PREVIEW_ROWS
                                  )}{" "}
                                  baris pertama.
                              </div>
                          </div>

                          <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                              <span className="rounded-full bg-slate-100 px-2 py-1 font-semibold text-slate-700">
                                  Sumber: {format.toUpperCase()}
                              </span>
                              {uploadedFileName && (
                                  <span className="rounded-full bg-slate-100 px-2 py-1 font-semibold text-slate-700">
                                      {uploadedFileName}
                                  </span>
                              )}
                              {format === "sql" &&
                                  typeof sqlRowCount === "number" && (
                                      <span>
                                          Hasil query: {sqlRowCount} baris
                                          (menampilkan {rawData.length})
                                      </span>
                                  )}
                          </div>

                          {excelSheets.length > 1 && (
                              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                                  <span className="text-muted-foreground">
                                      Pilih sheet:
                                  </span>
                                  <select
                                      value={selectedSheet}
                                      onChange={(e) =>
                                          handleSheetChange(e.target.value)
                                      }
                                      className="h-8 rounded-md border border-border bg-white px-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                                  >
                                      {excelSheets.map((sheet) => (
                                          <option key={sheet} value={sheet}>
                                              {sheet}
                                          </option>
                                      ))}
                                  </select>
                                  <span className="text-[11px] text-muted-foreground">
                                      Mengganti sheet akan memuat ulang preview.
                                  </span>
                              </div>
                          )}

                          <div className="mt-2 overflow-x-auto">
                              <table className="min-w-full text-xs">
                                  <thead className="bg-slate-50">
                                      <tr>
                                          {availableFields.map((field) => (
                                              <th
                                                  key={field}
                                                  className="px-2 py-2 text-left font-semibold text-slate-700"
                                              >
                                                  {field}
                                              </th>
                                          ))}
                                      </tr>
                                  </thead>
                                  <tbody>
                                      {previewRows.map((row, idx) => (
                                          <tr
                                              key={idx}
                                              className="odd:bg-white even:bg-slate-50"
                                          >
                                              {availableFields.map((field) => (
                                                  <td
                                                      key={field}
                                                      className="px-2 py-1.5 text-[11px] text-slate-700"
                                                  >
                                                      {row[field] === null ||
                                                      row[field] ===
                                                          undefined ||
                                                      row[field] === "" ? (
                                                          <span className="text-slate-400">
                                                              -
                                                          </span>
                                                      ) : (
                                                          String(row[field])
                                                      )}
                                                  </td>
                                              ))}
                                          </tr>
                                      ))}
                                  </tbody>
                              </table>
                          </div>
                      </div>

                      <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm space-y-3">
                          <div className="flex items-center justify-between">
                              <h4 className="text-sm font-semibold">
                                  Mapping Alternatif
                              </h4>
                              <span className="text-[11px] text-muted-foreground">
                                  {rawData.length} baris
                              </span>
                          </div>

                          <label className="text-xs font-medium text-muted-foreground">
                              Field untuk ID/Code{" "}
                              <span className="text-destructive">*</span>
                              <select
                                  className="mt-1 flex h-9 w-full rounded-md border border-border bg-white px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                                  value={fieldMapping.codeField}
                                  onChange={(e) =>
                                      setFieldMapping((prev) => ({
                                          ...prev,
                                          codeField: e.target.value
                                      }))
                                  }
                              >
                                  <option value="">-- Pilih Field --</option>
                                  {availableFields.map((field) => (
                                      <option key={field} value={field}>
                                          {field}
                                      </option>
                                  ))}
                              </select>
                          </label>

                          <label className="text-xs font-medium text-muted-foreground">
                              Field untuk Nama (opsional)
                              <select
                                  className="mt-1 flex h-9 w-full rounded-md border border-border bg-white px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                                  value={fieldMapping.nameField}
                                  onChange={(e) =>
                                      setFieldMapping((prev) => ({
                                          ...prev,
                                          nameField: e.target.value
                                      }))
                                  }
                              >
                                  <option value="">
                                      -- Gunakan ID sebagai Nama --
                                  </option>
                                  {availableFields.map((field) => (
                                      <option key={field} value={field}>
                                          {field}
                                      </option>
                                  ))}
                              </select>
                          </label>

                          <label className="text-xs font-medium text-muted-foreground">
                              Field untuk Deskripsi (opsional)
                              <select
                                  className="mt-1 flex h-9 w-full rounded-md border border-border bg-white px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                                  value={fieldMapping.descField}
                                  onChange={(e) =>
                                      setFieldMapping((prev) => ({
                                          ...prev,
                                          descField: e.target.value
                                      }))
                                  }
                              >
                                  <option value="">-- Tidak ada --</option>
                                  {availableFields.map((field) => (
                                      <option key={field} value={field}>
                                          {field}
                                      </option>
                                  ))}
                              </select>
                          </label>
                      </div>

                      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 shadow-sm space-y-2">
                          <div className="flex items-center justify-between">
                              <h4 className="text-sm font-semibold text-emerald-900">
                                  Pilih Field sebagai Kriteria
                              </h4>
                              <div className="text-[11px] text-emerald-700">
                                  {selectedCriteriaCount} dipilih • Maks{" "}
                                  {MAX_CRITERIA}
                              </div>
                          </div>

                          <div className="grid max-h-[340px] grid-cols-1 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
                              {Object.entries(criteriaSelections).map(
                                  ([field, config]) => {
                                      const isSelected = config.selected;
                                      const isCheckboxDisabled =
                                          !isSelected && criteriaLimitReached;

                                      return (
                                          <div
                                              key={field}
                                              className={`flex min-h-[44px] items-center gap-2 rounded border p-2 text-xs ${
                                                  isSelected
                                                      ? "border-emerald-300 bg-white"
                                                      : "border-emerald-100 bg-white/70"
                                              }`}
                                          >
                                              {/* Checkbox */}
                                              <input
                                                  type="checkbox"
                                                  checked={isSelected}
                                                  disabled={isCheckboxDisabled}
                                                  onChange={(e) => {
                                                      const nextSelected =
                                                          e.target.checked;

                                                      setCriteriaSelections(
                                                          (prev) => {
                                                              const currentSelected =
                                                                  Object.values(
                                                                      prev
                                                                  ).filter(
                                                                      (item) =>
                                                                          item.selected
                                                                  ).length;
                                                              if (
                                                                  !prev[field]
                                                                      ?.selected &&
                                                                  nextSelected &&
                                                                  currentSelected >=
                                                                      MAX_CRITERIA
                                                              ) {
                                                                  return prev;
                                                              }
                                                              return {
                                                                  ...prev,
                                                                  [field]: {
                                                                      ...prev[
                                                                          field
                                                                      ],
                                                                      selected:
                                                                          nextSelected
                                                                  }
                                                              };
                                                          }
                                                      );
                                                  }}
                                                  className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary/50 disabled:opacity-40"
                                              />

                                              {/* Input nama kriteria */}
                                              <input
                                                  type="text"
                                                  disabled={!isSelected}
                                                  value={config.name}
                                                  onChange={(e) =>
                                                      setCriteriaSelections(
                                                          (prev) => ({
                                                              ...prev,
                                                              [field]: {
                                                                  ...prev[
                                                                      field
                                                                  ],
                                                                  name: e.target
                                                                      .value
                                                              }
                                                          })
                                                      )
                                                  }
                                                  className="flex-1 rounded border border-slate-200 px-2 py-1 text-xs disabled:bg-slate-100 disabled:text-slate-500"
                                                  placeholder="Nama kriteria"
                                              />

                                              {/* Select tipe */}
                                              <select
                                                  disabled={!isSelected}
                                                  value={config.type}
                                                  onChange={(e) =>
                                                      setCriteriaSelections(
                                                          (prev) => ({
                                                              ...prev,
                                                              [field]: {
                                                                  ...prev[
                                                                      field
                                                                  ],
                                                                  type: e.target
                                                                      .value as CriteriaType
                                                              }
                                                          })
                                                      )
                                                  }
                                                  className="w-[90px] rounded border border-slate-200 px-1.5 py-1 text-xs disabled:bg-slate-100 disabled:text-slate-500"
                                              >
                                                  <option value="BENEFIT">
                                                      Benefit
                                                  </option>
                                                  <option value="COST">
                                                      Cost
                                                  </option>
                                              </select>
                                          </div>
                                      );
                                  }
                              )}
                          </div>

                          {selectedCriteriaCount === 0 && (
                              <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-[11px] text-amber-800">
                                  Pilih minimal 1 kriteria numerik agar TOPSIS
                                  bisa dijalankan. Anda masih bisa menambah
                                  kriteria manual setelah import.
                              </div>
                          )}
                      </div>
                  </div>

                  <div className="rounded-lg border border-slate-200 p-3 bg-white/70 shadow-sm">
                      <p className="text-xs font-medium text-muted-foreground mb-2">
                          Preview cepat (baris pertama):
                      </p>
                      <div className="bg-slate-50 p-3 rounded-lg text-xs space-y-1">
                          <div className="flex flex-wrap gap-3">
                              <div>
                                  <span className="text-muted-foreground">
                                      ID:
                                  </span>{" "}
                                  <span className="font-mono font-semibold">
                                      {rawData[0][fieldMapping.codeField] ||
                                          "-"}
                                  </span>
                              </div>
                              <div>
                                  <span className="text-muted-foreground">
                                      Nama:
                                  </span>{" "}
                                  <span className="font-semibold">
                                      {fieldMapping.nameField
                                          ? rawData[0][
                                                fieldMapping.nameField
                                            ] || "-"
                                          : rawData[0][
                                                fieldMapping.codeField
                                            ] || "-"}
                                  </span>
                              </div>
                              {fieldMapping.descField && (
                                  <div>
                                      <span className="text-muted-foreground">
                                          Deskripsi:
                                      </span>{" "}
                                      <span className="text-muted-foreground">
                                          {rawData[0][fieldMapping.descField] ||
                                              "-"}
                                      </span>
                                  </div>
                              )}
                          </div>
                          {selectedCriteriaCount > 0 && (
                              <div className="pt-2 mt-2 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-1">
                                  {selectedCriteriaEntries.map(
                                      ([field, config]) => (
                                          <div key={field}>
                                              <span className="text-muted-foreground">
                                                  {config.name}:
                                              </span>{" "}
                                              <span className="font-semibold">
                                                  {rawData[0][field]}
                                              </span>{" "}
                                              <span className="text-[11px] text-muted-foreground">
                                                  ({config.type})
                                              </span>
                                          </div>
                                      )
                                  )}
                              </div>
                          )}
                      </div>
                  </div>

                  <div className="flex justify-between">
                      <Button variant="ghost" onClick={() => setStep("input")}>
                          Kembali
                      </Button>
                      <Button
                          onClick={handleImportExecute}
                          disabled={!mappingReady}
                      >
                          Proses Import
                      </Button>
                  </div>
              </div>
          )}

          {step === "done" && summary && (
              <div className="space-y-4">
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm">
                      <div className="flex items-center gap-3">
                          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-emerald-600 shadow">
                              <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  className="h-6 w-6"
                              >
                                  <path d="M5 12l4 4 10-10" />
                              </svg>
                          </div>
                          <div>
                              <p className="text-sm font-semibold text-emerald-900">
                                  Import selesai
                              </p>
                              <p className="text-xs text-emerald-800">
                                  {summary.criteria > 0
                                      ? "Data alternatif, kriteria, dan matriks nilai sudah disimpan ke workspace."
                                      : "Alternatif berhasil disimpan. Tambahkan kriteria & nilai matriks sebelum menjalankan AHP/TOPSIS."}
                              </p>
                          </div>
                      </div>

                      <div className="mt-3 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                          <div className="rounded-md bg-white/70 px-3 py-2 border border-emerald-100">
                              <div className="text-xs text-muted-foreground">
                                  Alternatif
                              </div>
                              <div className="text-lg font-semibold text-emerald-900">
                                  {summary.alternatives.toLocaleString()} data
                              </div>
                          </div>
                          <div className="rounded-md bg-white/70 px-3 py-2 border border-emerald-100">
                              <div className="text-xs text-muted-foreground">
                                  Kriteria aktif
                              </div>
                              <div className="text-lg font-semibold text-emerald-900">
                                  {summary.criteria} dipilih (maks{" "}
                                  {MAX_CRITERIA})
                              </div>
                          </div>
                          <div className="rounded-md bg-white/70 px-3 py-2 border border-emerald-100">
                              <div className="text-xs text-muted-foreground">
                                  Kolom sumber
                              </div>
                              <div className="text-lg font-semibold text-emerald-900">
                                  {summary.columns} kolom • {summary.rows} baris
                              </div>
                          </div>
                          <div className="rounded-md bg-white/70 px-3 py-2 border border-emerald-100 text-xs text-emerald-800 space-y-1">
                              <div>
                                  Field ID:{" "}
                                  <span className="font-semibold text-emerald-900">
                                      {summary.codeField}
                                  </span>
                              </div>
                              <div>
                                  Nama:{" "}
                                  <span className="font-semibold text-emerald-900">
                                      {summary.nameField || "Mengikuti ID"}
                                  </span>
                              </div>
                              <div>
                                  Deskripsi:{" "}
                                  <span className="font-semibold text-emerald-900">
                                      {summary.descField || "-"}
                                  </span>
                              </div>
                              <div>
                                  Format:{" "}
                                  <span className="font-semibold text-emerald-900">
                                      {summary.format.toUpperCase()}
                                  </span>
                              </div>
                          </div>
                      </div>
                  </div>

                  <div className="flex justify-between">
                      <Button
                          variant="outline"
                          onClick={() => {
                              resetWizard();
                              setStep("format");
                          }}
                      >
                          Import lagi
                      </Button>
                      <Button onClick={handleClose}>Tutup</Button>
                  </div>
              </div>
          )}
      </div>
  );

  if (inline) {
    return (
      <div className="mt-6 space-y-4 rounded-xl border border-dashed border-slate-300 bg-white/70 p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-semibold text-foreground">Import Alternatif</h3>
            <p className="text-xs text-muted-foreground">Tempel JSON, mapping kolom, lalu proses.</p>
          </div>
          <Button variant="ghost" size="sm" onClick={resetWizard}>
            Reset Form
          </Button>
        </div>
        {content}
      </div>
    );
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Import Alternatif"
      description="Impor data alternatif dan kriteria dari file eksternal dengan field mapping fleksibel."
      maxWidthClass="max-w-3xl"
      scrollable
      contentClassName="space-y-4 p-4 sm:p-6"
    >
      {content}
    </Modal>
  );
};
