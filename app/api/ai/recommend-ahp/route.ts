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

const buildHeuristic = (criteria: CriteriaInput[], bias?: Record<string, number>): Recommendation[] => {
  const recs: Recommendation[] = [];
  for (let i = 0; i < criteria.length; i++) {
    for (let j = i + 1; j < criteria.length; j++) {
      const a = criteria[i];
      const b = criteria[j];
      const biasA = bias?.[a.id] || bias?.[a.code] || 0;
      const biasB = bias?.[b.id] || bias?.[b.code] || 0;

      // base heuristic: benefit beats cost, earlier item slightly preferred
      let value = 1;
      if (a.type === "BENEFIT" && b.type === "COST") value = 5;
      else if (a.type === "COST" && b.type === "BENEFIT") value = 1 / 5;
      else if (i < j) value = 3;
      else value = 1 / 3;

      // apply prompt bias: push higher value toward mentioned criterion
      const delta = biasA - biasB;
      if (delta > 0.5) value = Math.min(9, value * 2);
      else if (delta < -0.5) value = Math.max(1 / 9, value / 2);

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

const promptText = (criteria: CriteriaInput[], userPrompt?: string) => {
  const list = criteria
    .map((c, idx) => `${idx + 1}. ${c.code} - ${c.name} (${c.type.toLowerCase()})`)
    .join("\n");
  return `Berikan rekomendasi perbandingan berpasangan (skala 1-9, atau nilai pecahan 1/2, 1/3, dst) untuk kriteria berikut:
${list}

Preferensi pengguna (jika ada): ${userPrompt || "gunakan pertimbangan umum"}

Jelaskan alasan singkat dan keluarkan dalam format satu per baris: CODE_A | CODE_B | nilai | alasan singkat. Jangan beri teks lain.`;
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

const buildBiasScores = (criteria: CriteriaInput[], userPrompt: string) => {
  if (!userPrompt) return {};
  const promptLower = userPrompt.toLowerCase();
  const biasScores: Record<string, number> = {};
  criteria.forEach((c) => {
    const textPool = [c.code, c.name, c.description].filter(Boolean).map((t) => (t as string).toLowerCase());
    const hasHit = textPool.some((t) => promptLower.includes(t));
    if (hasHit) {
      // COST diberi bobot lebih jika disebut, agar dorong preferensi hemat/efisien
      const score = c.type === "COST" ? 3 : 2;
      biasScores[c.id] = score;
      biasScores[c.code] = score;
    }
  });
  return biasScores;
};

const adjustWithBias = (recs: Recommendation[], bias?: Record<string, number>) => {
  if (!bias) return recs;
  return recs.map((rec) => {
    const biasRow = bias[rec.row] || 0;
    const biasCol = bias[rec.col] || 0;
    let value = rec.value;
    const delta = biasRow - biasCol;
    if (delta > 0.5) value = Math.min(9, value * 2.5);
    else if (delta < -0.5) value = Math.max(1 / 9, value / 2.5);
    return { ...rec, value };
  });
};

export async function POST(req: Request) {
  try {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "Payload harus JSON valid." },
        { status: 400 },
      );
    }

    const payload = body as { criteria?: unknown; prompt?: unknown };
    const rawCriteria = payload?.criteria;
    const criteria: CriteriaInput[] = Array.isArray(rawCriteria) ? (rawCriteria as CriteriaInput[]) : [];
    const userPrompt = typeof payload?.prompt === "string" ? payload.prompt.trim() : "";

    if (!criteria.length) {
      return NextResponse.json(
        { error: "Kriteria tidak ditemukan. Lengkapi kriteria terlebih dahulu." },
        { status: 400 },
      );
    }

    const hasApiKey = Boolean(process.env.GEMINI_API_KEY);
    let note = "Heuristik otomatis berdasarkan tipe benefit/cost.";
    const biasScores = buildBiasScores(criteria, userPrompt);

    let recommendations: Recommendation[] = buildHeuristic(criteria, biasScores);

    if (hasApiKey) {
      try {
        const aiText = await generateGeminiText(promptText(criteria, userPrompt));
        const parsed = parseGemini(aiText || "");
        if (parsed.length) {
          recommendations = adjustWithBias(parsed, biasScores);
          note = userPrompt
            ? `Rekomendasi AI (dipandu prompt): "${userPrompt}"`
            : "Rekomendasi AI dari Gemini (bisa diedit sebelum diterapkan).";
        } else {
          note = "Gagal mem-parsing hasil AI, menggunakan heuristik bawaan.";
        }
      } catch (err) {
        console.error("AI recommend error:", err);
        note = "Gagal memanggil AI, menggunakan heuristik bawaan.";
      }
    } else {
      note = userPrompt
        ? `GEMINI_API_KEY belum tersedia, heuristik mengikuti preferensi: "${userPrompt}"`
        : "GEMINI_API_KEY belum tersedia, menggunakan heuristik bawaan.";
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
