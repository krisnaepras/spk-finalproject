import { FormEvent } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/Card";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Table, THead, TBody, Th, Td } from "../ui/Table";
import { Alternative } from "@/lib/spk/types";

interface AlternativesManagerProps {
  alternatives: Alternative[];
  form: {
    id: string;
    code: string;
    name: string;
    description?: string;
  };
  onFormChange: (form: AlternativesManagerProps["form"]) => void;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
  onDelete: (id: string) => void;
  onReset: () => void;
}

export const AlternativesManager = ({
  alternatives,
  form,
  onFormChange,
  onSubmit,
  onDelete,
  onReset,
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
            <div className="flex flex-wrap gap-2 pt-2">
              <Button type="submit" className="w-full sm:w-auto flex-1">
                {isEditing ? "Simpan Perubahan" : "Tambah"}
              </Button>
              {isEditing && (
                <Button type="button" variant="outline" onClick={onReset} className="w-full sm:w-auto">
                  Batal
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Daftar Alternatif</CardTitle>
          <CardDescription>
            Total: {alternatives.length} alternatif terdaftar
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
            <Table>
              <THead>
                <tr>
                  <Th>Kode</Th>
                  <Th>Nama</Th>
                  <Th>Deskripsi</Th>
                  <Th className="text-right">Aksi</Th>
                </tr>
              </THead>
              <TBody>
                {alternatives.length === 0 ? (
                  <tr>
                    <Td colSpan={4} className="p-6 text-center text-muted-foreground">
                      Belum ada data alternatif.
                    </Td>
                  </tr>
                ) : (
                  alternatives.map((alt) => (
                    <tr
                      key={alt.id}
                      className="border-t border-slate-100 hover:bg-slate-50 transition-colors"
                    >
                      <Td className="font-medium">{alt.code}</Td>
                      <Td>{alt.name}</Td>
                      <Td className="text-muted-foreground">{alt.description || "-"}</Td>
                      <Td className="text-right">
                        <div className="flex flex-wrap justify-end gap-2">
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
                      </Td>
                    </tr>
                  ))
                )}
              </TBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
