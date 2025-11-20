import { FormEvent } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/Card";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Alternative } from "@/lib/spk/types";

interface AlternativesManagerProps {
  alternatives: Alternative[];
  form: {
    id: string;
    code: string;
    name: string;
    description?: string;
  };
  onFormChange: (form: any) => void;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
  onDelete: (id: string) => void;
  onReset: () => void;
  onImport: () => void;
}

export const AlternativesManager = ({
  alternatives,
  form,
  onFormChange,
  onSubmit,
  onDelete,
  onReset,
  onImport,
}: AlternativesManagerProps) => {
  const isEditing = Boolean(form.id);

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Card className="lg:col-span-1 h-fit">
        <CardHeader>
          <CardTitle>{isEditing ? "Edit Alternatif" : "Tambah Alternatif"}</CardTitle>
          <CardDescription>
            Masukkan data kandidat yang akan dinilai.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Kode
              </label>
              <Input
                value={form.code}
                onChange={(e) => onFormChange({ ...form, code: e.target.value })}
                placeholder="Contoh: A1"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Nama Alternatif
              </label>
              <Input
                value={form.name}
                onChange={(e) => onFormChange({ ...form, name: e.target.value })}
                placeholder="Contoh: Mobil Listrik A"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Deskripsi (Opsional)
              </label>
              <Input
                value={form.description || ""}
                onChange={(e) => onFormChange({ ...form, description: e.target.value })}
                placeholder="Keterangan tambahan..."
              />
            </div>
            <div className="flex gap-2 pt-2">
              <Button type="submit" className="w-full">
                {isEditing ? "Simpan Perubahan" : "Tambah"}
              </Button>
              {isEditing && (
                <Button type="button" variant="outline" onClick={onReset}>
                  Batal
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Daftar Alternatif</CardTitle>
            <CardDescription>
              Total: {alternatives.length} alternatif terdaftar
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={onImport}>
            Import Data
          </Button>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-muted-foreground">
                <tr>
                  <th className="h-12 px-4 align-middle font-medium">Kode</th>
                  <th className="h-12 px-4 align-middle font-medium">Nama</th>
                  <th className="h-12 px-4 align-middle font-medium">Deskripsi</th>
                  <th className="h-12 px-4 align-middle font-medium text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {alternatives.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-4 text-center text-muted-foreground">
                      Belum ada data alternatif.
                    </td>
                  </tr>
                ) : (
                  alternatives.map((alt) => (
                    <tr key={alt.id} className="border-t border-slate-200 hover:bg-slate-50 transition-colors">
                      <td className="p-4 font-medium">{alt.code}</td>
                      <td className="p-4">{alt.name}</td>
                      <td className="p-4 text-muted-foreground">{alt.description || "-"}</td>
                      <td className="p-4 text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              onFormChange({
                                id: alt.id,
                                code: alt.code,
                                name: alt.name,
                                description: alt.description,
                              })
                            }
                          >
                            Edit
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => onDelete(alt.id)}
                          >
                            Hapus
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
