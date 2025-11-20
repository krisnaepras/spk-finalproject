import { useState } from "react";
import { Button } from "../ui/Button";
import { Modal } from "../ui/Modal";
import type { Alternative, Criteria, CriteriaType, WorkspaceState } from "@/lib/spk/types";

interface ImportAlternativesProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (data: {
    alternatives: Partial<Alternative>[];
    criteria?: Criteria[];
    scores?: WorkspaceState["scores"];
  }) => void;
}

type ImportFormat = "json" | "excel" | "sql";

export const ImportAlternatives = ({
  isOpen,
  onClose,
  onImport,
}: ImportAlternativesProps) => {
  const [step, setStep] = useState(1);
  const [format, setFormat] = useState<ImportFormat>("json");
  const [jsonText, setJsonText] = useState("");
  const [rawData, setRawData] = useState<Record<string, any>[] | null>(null);
  const [availableFields, setAvailableFields] = useState<string[]>([]);
  const [fieldMapping, setFieldMapping] = useState<{
    codeField: string;
    nameField: string;
    descField: string;
  }>({ codeField: "", nameField: "", descField: "" });
  const [criteriaSelections, setCriteriaSelections] = useState<Record<
    string,
    { selected: boolean; name: string; type: CriteriaType }
  >>({});
  const [error, setError] = useState<string | null>(null);

  const resetWizard = () => {
    setStep(1);
    setJsonText("");
    setRawData(null);
    setAvailableFields([]);
    setFieldMapping({ codeField: "", nameField: "", descField: "" });
    setCriteriaSelections({});
    setError(null);
  };

  const handleParseData = () => {
    try {
      setError(null);
      const json = JSON.parse(jsonText);
      
      if (!Array.isArray(json)) {
        throw new Error("Format JSON harus berupa array");
      }
      if (json.length === 0) {
        throw new Error("Array JSON kosong");
      }

      setRawData(json);
      
      // Deteksi field yang tersedia
      const fields = Object.keys(json[0]);
      setAvailableFields(fields);

      // Auto-detect field mapping
      const codeField = fields.find(f => 
        f.toLowerCase().includes('id') || 
        f.toLowerCase().includes('code') || 
        f.toLowerCase().includes('kode') ||
        f.toLowerCase().match(/^(alt_)?id$/)
      ) || fields[0];

      const nameField = fields.find(f => 
        f.toLowerCase().includes('name') || 
        f.toLowerCase().includes('nama') ||
        f.toLowerCase().match(/^(alt_)?name$/)
      ) || (fields[1] || "");

      const descField = fields.find(f => 
        f.toLowerCase().includes('desc') || 
        f.toLowerCase().includes('deskripsi') ||
        f.toLowerCase() === 'description'
      ) || "";

      setFieldMapping({
        codeField,
        nameField,
        descField
      });

      // Auto-detect criteria (field numerik selain ID/Name/Desc)
      const numericFields = fields.filter(f => {
        const sample = json[0][f];
        return (
          typeof sample === 'number' && 
          f !== codeField && 
          f !== nameField && 
          f !== descField
        );
      });

      const initialCriteria: Record<string, { selected: boolean; name: string; type: CriteriaType }> = {};
      numericFields.forEach(field => {
        // Auto-detect COST or BENEFIT based on field name
        const isCost = field.toLowerCase().includes('cost') || 
                       field.toLowerCase().includes('biaya') ||
                       field.toLowerCase().includes('harga') ||
                       field.toLowerCase().includes('emisi');
        
        initialCriteria[field] = {
          selected: false,
          name: field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
          type: isCost ? "COST" : "BENEFIT"
        };
      });

      setCriteriaSelections(initialCriteria);
      setStep(3); // Langsung ke mapping
    } catch (err) {
      setError(err instanceof Error ? err.message : "Format JSON tidak valid");
      setRawData(null);
    }
  };

  const handleImportExecute = () => {
    try {
      if (!rawData || rawData.length === 0) {
        setError("Tidak ada data untuk diimpor");
        return;
      }

      if (!fieldMapping.codeField || !fieldMapping.nameField) {
        setError("Field ID dan Nama harus dipilih");
        return;
      }

      // Process alternatives
      const alternatives = rawData.map(item => ({
        code: String(item[fieldMapping.codeField] || ""),
        name: String(item[fieldMapping.nameField] || ""),
        description: fieldMapping.descField ? String(item[fieldMapping.descField] || "") : undefined,
      })).filter(a => a.code && a.name);

      if (alternatives.length === 0) {
        setError("Tidak ada data valid yang dapat diimpor");
        return;
      }

      // Process criteria (selected fields)
      const selectedCriteria = Object.entries(criteriaSelections)
        .filter(([, config]) => config.selected)
        .map(([field, config], index) => ({
          id: crypto.randomUUID(),
          code: `C${index + 1}`,
          name: config.name || field,
          type: config.type,
          position: index,
        }));

      // Process alternatives with IDs
      const alternativesWithIds: Alternative[] = alternatives.map(item => ({
        id: crypto.randomUUID(),
        code: item.code || "",
        name: item.name || "",
        description: item.description,
      }));

      // If criteria selected, also process scores
      let scores: WorkspaceState["scores"] | undefined;
      if (selectedCriteria.length > 0) {
        scores = {};
        
        alternativesWithIds.forEach((alt, altIndex) => {
          scores![alt.id] = {};
          
          selectedCriteria.forEach(criteria => {
            const fieldName = Object.entries(criteriaSelections)
              .find(([, config]) => config.name === criteria.name)?.[0];
            
            if (fieldName) {
              const value = Number(rawData[altIndex][fieldName]);
              if (!isNaN(value)) {
                scores![alt.id][criteria.id] = value;
              }
            }
          });
        });
      }


      onImport({
        alternatives: selectedCriteria.length > 0 ? alternativesWithIds : alternatives,
        criteria: selectedCriteria.length > 0 ? selectedCriteria : undefined,
        scores: selectedCriteria.length > 0 ? scores : undefined,
      });
      
      resetWizard();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan saat import");
    }
  };

  const selectedCriteriaCount = Object.values(criteriaSelections).filter(c => c.selected).length;

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        resetWizard();
        onClose();
      }}
      title="Import Alternatif"
      description="Impor data alternatif dan kriteria dari file eksternal dengan field mapping fleksibel."
    >
      <div className="space-y-4">
        {/* Progress Indicator */}
        <div className="flex gap-2 text-xs">
          {["Format", "Input Data", "Mapping", "Selesai"].map((label, idx) => (
            <div
              key={label}
              className={`flex-1 rounded-full px-3 py-1 text-center font-semibold ${
                idx + 1 <= step 
                  ? "bg-cyan-50 text-cyan-700 border border-cyan-200" 
                  : "bg-slate-100 text-slate-400"
              }`}
            >
              {idx + 1}. {label}
            </div>
          ))}
        </div>

        {/* Error Message */}
        {error && (
          <div className="rounded-lg border border-rose-300 bg-rose-50 p-3 text-sm text-rose-700">
            {error}
          </div>
        )}

        {/* Step 1: Pilih Format */}
        {step === 1 && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Pilih format file yang akan digunakan untuk import.
            </p>
            
            <div className="grid grid-cols-3 gap-3">
              {[
                { id: "json", label: "JSON", disabled: false },
                { id: "excel", label: "Excel", disabled: true },
                { id: "sql", label: "SQL", disabled: true },
              ].map((opt) => (
                <button
                  key={opt.id}
                  disabled={opt.disabled}
                  onClick={() => setFormat(opt.id as ImportFormat)}
                  className={`rounded-lg border px-4 py-6 text-sm font-semibold transition-all ${
                    format === opt.id
                      ? "border-primary bg-cyan-50 text-primary"
                      : opt.disabled
                      ? "border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed"
                      : "border-slate-200 text-foreground hover:border-primary/50"
                  }`}
                >
                  <div className="text-center">
                    <div className="text-base">{opt.label}</div>
                    {opt.disabled && (
                      <div className="text-xs text-muted-foreground mt-1">Segera hadir</div>
                    )}
                  </div>
                </button>
              ))}
            </div>

            <div className="flex justify-end pt-2">
              <Button onClick={() => setStep(2)}>
                Lanjut
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Input Data */}
        {step === 2 && (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">
                Paste JSON Text
              </label>
              <p className="text-xs text-muted-foreground mb-2">
                Format: array object dengan field ID, Nama, dan nilai kriteria
              </p>
              <textarea
                className="flex min-h-[180px] w-full rounded-lg border border-border bg-white px-3 py-2 text-sm font-mono placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 shadow-sm"
                placeholder={'[\n  {\n    "alt_id": "A1",\n    "alt_name": "Mobil A",\n    "description": "Hatchback 1.2L",\n    "harga": 180000000,\n    "emisi_co2": 110,\n    ...\n  }\n]'}
                value={jsonText}
                onChange={(e) => setJsonText(e.target.value)}
              />
            </div>

            <div className="flex justify-between pt-2">
              <Button variant="ghost" onClick={() => setStep(1)}>
                Kembali
              </Button>
              <Button onClick={handleParseData} disabled={!jsonText.trim()}>
                Parse & Lanjut
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Field Mapping + Criteria Selection */}
        {step === 3 && rawData && (
          <div className="space-y-4">
            <div className="rounded-lg bg-slate-50 p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold">Mapping Field Alternatif</h4>
                <span className="text-xs text-muted-foreground">
                  {rawData.length} data terdeteksi
                </span>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">
                    Field untuk ID/Code <span className="text-destructive">*</span>
                  </label>
                  <select
                    className="mt-1 flex h-9 w-full rounded-lg border border-border bg-white px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                    value={fieldMapping.codeField}
                    onChange={(e) => setFieldMapping(prev => ({ ...prev, codeField: e.target.value }))}
                  >
                    <option value="">-- Pilih Field --</option>
                    {availableFields.map(field => (
                      <option key={field} value={field}>{field}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground">
                    Field untuk Nama <span className="text-destructive">*</span>
                  </label>
                  <select
                    className="mt-1 flex h-9 w-full rounded-lg border border-border bg-white px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                    value={fieldMapping.nameField}
                    onChange={(e) => setFieldMapping(prev => ({ ...prev, nameField: e.target.value }))}
                  >
                    <option value="">-- Pilih Field --</option>
                    {availableFields.map(field => (
                      <option key={field} value={field}>{field}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground">
                    Field untuk Deskripsi (Opsional)
                  </label>
                  <select
                    className="mt-1 flex h-9 w-full rounded-lg border border-border bg-white px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                    value={fieldMapping.descField}
                    onChange={(e) => setFieldMapping(prev => ({ ...prev, descField: e.target.value }))}
                  >
                    <option value="">-- Tidak ada --</option>
                    {availableFields.map(field => (
                      <option key={field} value={field}>{field}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Criteria Selection */}
            {Object.keys(criteriaSelections).length > 0 && (
              <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-semibold text-emerald-900">
                    Pilih Field sebagai Kriteria
                  </h4>
                  <span className="text-xs text-emerald-700">
                    {selectedCriteriaCount} kriteria dipilih
                  </span>
                </div>

                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {Object.entries(criteriaSelections).map(([field, config]) => (
                    <div key={field} className="flex items-center gap-3 bg-white rounded-lg p-3 border border-emerald-100">
                      <input
                        type="checkbox"
                        checked={config.selected}
                        onChange={(e) => {
                          setCriteriaSelections(prev => ({
                            ...prev,
                            [field]: { ...prev[field], selected: e.target.checked }
                          }));
                        }}
                        className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary/50"
                      />
                      <div className="flex-1 grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          disabled={!config.selected}
                          value={config.name}
                          onChange={(e) => {
                            setCriteriaSelections(prev => ({
                              ...prev,
                              [field]: { ...prev[field], name: e.target.value }
                            }));
                          }}
                          className="px-2 py-1 text-xs border border-slate-200 rounded disabled:bg-slate-100 disabled:text-slate-500"
                          placeholder="Nama kriteria"
                        />
                        <select
                          disabled={!config.selected}
                          value={config.type}
                          onChange={(e) => {
                            setCriteriaSelections(prev => ({
                              ...prev,
                              [field]: { ...prev[field], type: e.target.value as CriteriaType }
                            }));
                          }}
                          className="px-2 py-1 text-xs border border-slate-200 rounded disabled:bg-slate-100 disabled:text-slate-500"
                        >
                          <option value="BENEFIT">Benefit</option>
                          <option value="COST">Cost</option>
                        </select>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {field}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Preview */}
            {rawData.length > 0 && fieldMapping.codeField && fieldMapping.nameField && (
              <div className="rounded-lg border border-slate-200 p-3">
                <p className="text-xs font-medium text-muted-foreground mb-2">
                  Preview (Data pertama):
                </p>
                <div className="bg-slate-50 p-3 rounded-lg text-xs space-y-1">
                  <div>
                    <span className="text-muted-foreground">ID:</span>{" "}
                    <span className="font-mono font-semibold">
                      {rawData[0][fieldMapping.codeField] || "-"}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Nama:</span>{" "}
                    <span className="font-semibold">
                      {rawData[0][fieldMapping.nameField] || "-"}
                    </span>
                  </div>
                  {fieldMapping.descField && (
                    <div>
                      <span className="text-muted-foreground">Deskripsi:</span>{" "}
                      <span className="text-muted-foreground">
                        {rawData[0][fieldMapping.descField] || "-"}
                      </span>
                    </div>
                  )}
                  {selectedCriteriaCount > 0 && (
                    <div className="pt-2 mt-2 border-t border-slate-200">
                      <span className="text-muted-foreground font-semibold">Kriteria:</span>
                      {Object.entries(criteriaSelections)
                        .filter(([, config]) => config.selected)
                        .map(([field, config]) => (
                          <div key={field} className="ml-2">
                            <span className="text-muted-foreground">{config.name}:</span>{" "}
                            <span className="font-semibold">{rawData[0][field]}</span>{" "}
                            <span className="text-xs text-muted-foreground">({config.type})</span>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="flex justify-between pt-2">
              <Button
                variant="ghost"
                onClick={() => {
                  setStep(2);
                  setRawData(null);
                  setAvailableFields([]);
                }}
              >
                Kembali
              </Button>
              <Button
                onClick={handleImportExecute}
                disabled={!fieldMapping.codeField || !fieldMapping.nameField}
              >
                Import Sekarang
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
