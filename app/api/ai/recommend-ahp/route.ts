import { NextResponse } from "next/server";
import { generateGeminiText } from "@/lib/ai/gemini";

type CriteriaInput = {
  id: string;
  code: string;
  name: string;
  description?: string;
  type: "BENEFIT" | "COST";
};

type Recommendation = {
  row: string;
  col: string;
  value: number;
  reason: string;
};

const buildHeuristic = (criteria: CriteriaInput[]): Recommendation[] => {
  const recs: Recommendation[] = [];
  for (let i = 0; i < criteria.length; i++) {
    for (let j = i + 1; j < criteria.length; j++) {
      const a = criteria[i];
      const b = criteria[j];
      // simple heuristic: benefit beats cost, earlier item slightly preferred
      let value = 1;
      if (a.type === "BENEFIT" && b.type === "COST") value = 5;
      else if (a.type === "COST" && b.type === "BENEFIT") value = 1 / 5;
      else if (i < j) value = 3;
      else value = 1 / 3;
      recs.push({
        row: a.code,
        col: b.code,
        value,
        reason: "Heuristik cepat (Benefit vs Cost & urutan input).",
      });
    }
  }
  return recs;
};

const promptText = (criteria: CriteriaInput[]) => {
  const list = criteria
    .map((c, idx) => `${idx + 1}. ${c.code} - ${c.name} (${c.type.toLowerCase()})`)
    .join("\n");
  return `Berikan rekomendasi perbandingan berpasangan (skala 1-9, atau nilai pecahan 1/2, 1/3, dst) untuk kriteria berikut:
${list}

Keluarkan dalam format satu per baris: CODE_A | CODE_B | nilai | alasan singkat. Jangan beri teks lain.`;
};

const parseGemini = (text: string): Recommendation[] => {
  if (!text) return [];
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split("|").map((p) => p.trim());
      if (parts.length < 3) return null;
      const [row, col, rawValue, reasonRaw] = parts;
      const value = Number(rawValue.replace(",", "."));
      if (!Number.isFinite(value)) return null;
      return {
        row,
        col,
        value,
        reason: reasonRaw || "Rekomendasi AI",
      };
    })
    .filter((item): item is Recommendation => Boolean(item));
};

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const criteria: CriteriaInput[] = Array.isArray(body?.criteria) ? body.criteria : [];

    if (!criteria.length) {
      return NextResponse.json(
        { error: "Kriteria tidak ditemukan. Lengkapi kriteria terlebih dahulu." },
        { status: 400 },
      );
    }

    const hasApiKey = Boolean(process.env.GEMINI_API_KEY);
    let note = "Heuristik otomatis berdasarkan tipe benefit/cost.";
    let recommendations: Recommendation[] = buildHeuristic(criteria);

    if (hasApiKey) {
      try {
        const aiText = await generateGeminiText(promptText(criteria));
        const parsed = parseGemini(aiText);
        if (parsed.length) {
          recommendations = parsed;
          note = "Rekomendasi AI dari Gemini (bisa diedit sebelum diterapkan).";
        } else {
          note = "Gagal mem-parsing hasil AI, menggunakan heuristik bawaan.";
        }
      } catch (err) {
        console.error("AI recommend error:", err);
        note = "Gagal memanggil AI, menggunakan heuristik bawaan.";
      }
    } else {
      note = "GEMINI_API_KEY belum tersedia, menggunakan heuristik bawaan.";
    }

    return NextResponse.json({
      data: {
        recommendations,
        note,
      },
    });
  } catch (error) {
    console.error("recommend-ahp error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan memproses rekomendasi." },
      { status: 500 },
    );
  }
}
