import { FormEvent } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/Card";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Badge } from "../ui/Badge";
import { Table, THead, TBody, Th, Td } from "../ui/Table";
import { Criteria, CriteriaType } from "@/lib/spk/types";

interface CriteriaManagerProps {
  criteria: Criteria[];
  form: {
    id: string;
    code: string;
    name: string;
    description?: string;
    type: CriteriaType;
  };
  onFormChange: (form: CriteriaManagerProps["form"]) => void;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
  onDelete: (id: string) => void;
  onReset: () => void;
}

export const CriteriaManager = ({
  criteria,
  form,
  onFormChange,
  onSubmit,
  onDelete,
  onReset,
}: CriteriaManagerProps) => {
  const isEditing = Boolean(form.id);

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Card className="lg:col-span-1 h-fit">
        <CardHeader>
          <CardTitle>{isEditing ? "Edit Kriteria" : "Tambah Kriteria"}</CardTitle>
          <CardDescription>
            Tentukan faktor-faktor penilaian (maks. 5).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none">Kode</label>
              <Input
                value={form.code}
                onChange={(e) => onFormChange({ ...form, code: e.target.value })}
                placeholder="Contoh: C1"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none">Nama Kriteria</label>
              <Input
                value={form.name}
                onChange={(e) => onFormChange({ ...form, name: e.target.value })}
                placeholder="Contoh: Harga"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none">Tipe Atribut</label>
              <select
                className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                value={form.type}
                onChange={(e) => onFormChange({ ...form, type: e.target.value as CriteriaType })}
              >
                <option value="BENEFIT">Benefit (Makin tinggi makin baik)</option>
                <option value="COST">Cost (Makin rendah makin baik)</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none">Deskripsi (Opsional)</label>
              <Input
                value={form.description || ""}
                onChange={(e) => onFormChange({ ...form, description: e.target.value })}
                placeholder="Keterangan tambahan..."
              />
            </div>
            <div className="flex gap-2 pt-2">
              <Button type="submit" className="w-full">
                {isEditing ? "Simpan" : "Tambah"}
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
        <CardHeader>
          <CardTitle>Daftar Kriteria</CardTitle>
          <CardDescription>
            Total: {criteria.length} kriteria terdaftar
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
            <Table>
              <THead>
                <tr>
                  <Th>Kode</Th>
                  <Th>Nama</Th>
                  <Th>Tipe</Th>
                  <Th>Bobot (AHP)</Th>
                  <Th className="text-right">Aksi</Th>
                </tr>
              </THead>
              <TBody>
                {criteria.length === 0 ? (
                  <tr>
                    <Td colSpan={5} className="p-6 text-center text-muted-foreground">
                      Belum ada data kriteria.
                    </Td>
                  </tr>
                ) : (
                  criteria.map((item) => (
                    <tr key={item.id} className="border-t border-slate-100 hover:bg-slate-50 transition-colors">
                      <Td className="font-medium">{item.code}</Td>
                      <Td>{item.name}</Td>
                      <Td>
                        <Badge variant={item.type === "BENEFIT" ? "success" : "destructive"}>
                          {item.type}
                        </Badge>
                      </Td>
                      <Td>{item.weight ? (item.weight * 100).toFixed(2) + "%" : "-"}</Td>
                      <Td className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              onFormChange({
                                id: item.id,
                                code: item.code,
                                name: item.name,
                                description: item.description,
                                type: item.type,
                              })
                            }
                          >
                            Edit
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => onDelete(item.id)}
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
