import { useState, useRef } from "react";
import { Button } from "../ui/Button";
import { Modal } from "../ui/Modal";
import { Input } from "../ui/Input";
import * as XLSX from "xlsx";
import { Alternative } from "@/lib/spk/types";

interface ImportAlternativesProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (alternatives: Partial<Alternative>[]) => void;
}

type ImportType = "excel" | "json" | "sql";

export const ImportAlternatives = ({
  isOpen,
  onClose,
  onImport,
}: ImportAlternativesProps) => {
  const [importType, setImportType] = useState<ImportType>("excel");
  const [file, setFile] = useState<File | null>(null);
  const [jsonText, setJsonText] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError(null);
    }
  };

  const parseExcel = async (file: File): Promise<Partial<Alternative>[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          const workbook = XLSX.read(data, { type: "binary" });
          const sheetName = workbook.SheetNames[0];
          const sheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(sheet) as any[];
          
          const alternatives = jsonData.map((row) => ({
            code: row.code || row.Kode || row.KODE,
            name: row.name || row.Nama || row.NAMA,
            description: row.description || row.Deskripsi || row.DESKRIPSI || "",
          })).filter(a => a.code && a.name);

          resolve(alternatives);
        } catch (err) {
          reject(new Error("Gagal memproses file Excel. Pastikan format benar."));
        }
      };
      reader.onerror = () => reject(new Error("Gagal membaca file."));
      reader.readAsBinaryString(file);
    });
  };

  const parseJsonContent = (text: string): Partial<Alternative>[] => {
    const json = JSON.parse(text);
    if (!Array.isArray(json)) throw new Error("Format JSON harus berupa array.");
    
    return json.map((item: any) => ({
      code: item.code || item.kode,
      name: item.name || item.nama,
      description: item.description || item.deskripsi || "",
    })).filter((a: any) => a.code && a.name);
  };

  const parseJson = async (file: File): Promise<Partial<Alternative>[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const text = e.target?.result as string;
          const alternatives = parseJsonContent(text);
          resolve(alternatives);
        } catch (err) {
          reject(new Error("Gagal memproses file JSON."));
        }
      };
      reader.onerror = () => reject(new Error("Gagal membaca file."));
      reader.readAsText(file);
    });
  };

  const parseSql = async (file: File): Promise<Partial<Alternative>[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const text = e.target?.result as string;
          // Simple regex to find INSERT INTO ... VALUES (...)
          // This is a basic parser and assumes a standard structure
          const alternatives: Partial<Alternative>[] = [];
          const lines = text.split('\n');
          
          // Regex to capture values inside parentheses
          // Matches: ('A1', 'Name', 'Desc')
          const valueRegex = /\((?:'([^']*)'|NULL|[\d.]+)(?:\s*,\s*(?:'([^']*)'|NULL|[\d.]+))+(?:\s*,\s*(?:'([^']*)'|NULL|[\d.]+))?\)/gi;

          let match;
          while ((match = valueRegex.exec(text)) !== null) {
             // This is a very naive SQL parser, assuming order Code, Name, Description
             // Adjusting to capture groups. 
             // Since SQL values can be complex, this is a "best effort" for simple dumps
             // A more robust way is to look for specific patterns if we knew the table structure
             
             // Let's try a simpler line-by-line approach if the bulk regex fails or is too complex
             // But for now, let's assume the user provides a clean INSERT dump.
             
             // Actually, let's just look for the values.
             // We expect 3 strings: code, name, description
             
             const raw = match[0];
             const parts = raw.replace(/[()']/g, '').split(',').map(s => s.trim());
             
             if (parts.length >= 2) {
                 alternatives.push({
                     code: parts[0],
                     name: parts[1],
                     description: parts[2] || ""
                 });
             }
          }
          
          if (alternatives.length === 0) {
              // Fallback: try parsing line by line for simple CSV-like structure in SQL
              // or just warn
              throw new Error("Tidak ditemukan data valid dalam file SQL.");
          }

          resolve(alternatives);
        } catch (err) {
          reject(new Error("Gagal memproses file SQL."));
        }
      };
      reader.onerror = () => reject(new Error("Gagal membaca file."));
      reader.readAsText(file);
    });
  };

  const handleImport = async () => {
    if (!file && !jsonText) {
      setError("Silakan pilih file atau masukkan text JSON terlebih dahulu.");
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      let data: Partial<Alternative>[] = [];
      
      if (importType === "json" && jsonText.trim()) {
        try {
          data = parseJsonContent(jsonText);
        } catch (e) {
           throw new Error("Format JSON text tidak valid.");
        }
      } else if (file) {
        if (importType === "excel") {
          data = await parseExcel(file);
        } else if (importType === "json") {
          data = await parseJson(file);
        } else if (importType === "sql") {
          data = await parseSql(file);
        }
      }

      if (data.length === 0) {
        throw new Error("Tidak ada data alternatif yang valid ditemukan.");
      }

      onImport(data);
      onClose();
      setFile(null);
      setJsonText("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan saat import.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Import Alternatif"
      description="Tambahkan data alternatif dari file eksternal."
    >
      <div className="space-y-4">
        <div className="flex space-x-2 border-b border-border pb-2">
          <button
            onClick={() => { setImportType("excel"); setJsonText(""); setFile(null); }}
            className={`px-3 py-1 text-sm font-medium transition-colors ${
              importType === "excel"
                ? "text-primary border-b-2 border-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Excel
          </button>
          <button
            onClick={() => { setImportType("json"); setJsonText(""); setFile(null); }}
            className={`px-3 py-1 text-sm font-medium transition-colors ${
              importType === "json"
                ? "text-primary border-b-2 border-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            JSON
          </button>
          <button
            onClick={() => { setImportType("sql"); setJsonText(""); setFile(null); }}
            className={`px-3 py-1 text-sm font-medium transition-colors ${
              importType === "sql"
                ? "text-primary border-b-2 border-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            SQL
          </button>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">
            Pilih File {importType.toUpperCase()}
          </label>
          <Input
            ref={fileInputRef}
            type="file"
            accept={
              importType === "excel"
                ? ".xlsx, .xls"
                : importType === "json"
                ? ".json"
                : ".sql"
            }
            onChange={handleFileChange}
          />
          
          {importType === "json" && (
            <>
              <div className="relative flex items-center py-2">
                <div className="flex-grow border-t border-border"></div>
                <span className="flex-shrink-0 mx-4 text-muted-foreground text-xs">ATAU</span>
                <div className="flex-grow border-t border-border"></div>
              </div>
              
              <label className="text-sm font-medium">
                Paste JSON Text
              </label>
              <textarea
                className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder='[{"code": "A1", "name": "Contoh", "description": "..."}]'
                value={jsonText}
                onChange={(e) => setJsonText(e.target.value)}
              />
            </>
          )}

          <p className="text-xs text-muted-foreground">
            {importType === "excel" && "Format kolom: Kode, Nama, Deskripsi"}
            {importType === "json" && "Format array object: [{ code, name, description }]"}
            {importType === "sql" && "Format INSERT INTO ... VALUES ('Kode', 'Nama', 'Deskripsi')"}
          </p>
        </div>

        {error && (
          <div className="text-sm text-destructive bg-destructive/10 p-2 rounded">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose} disabled={isProcessing}>
            Batal
          </Button>
          <Button onClick={handleImport} disabled={(!file && !jsonText) || isProcessing}>
            {isProcessing ? "Memproses..." : "Import Sekarang"}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
