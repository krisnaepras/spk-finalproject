import { NextRequest, NextResponse } from "next/server";

interface CriteriaInput {
  id: string;
  code: string;
  name: string;
  description?: string;
  type: "BENEFIT" | "COST";
}

interface RequestBody {
  criteria: CriteriaInput[];
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as RequestBody;
    const { criteria } = body;

    if (!criteria || criteria.length < 2) {
      return NextResponse.json(
        { error: "Minimal 2 kriteria diperlukan" },
        { status: 400 }
      );
    }

    // Menggunakan Google Gemini API (gratis)
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    
    if (!GEMINI_API_KEY) {
      return NextResponse.json(
        { error: "API Key tidak ditemukan. Silakan tambahkan GEMINI_API_KEY di .env.local" },
        { status: 500 }
      );
    }

    // Format kriteria untuk prompt
    const criteriaText = criteria
      .map((c, i) => `${i + 1}. ${c.name} (${c.code})${c.description ? `: ${c.description}` : ""} - Tipe: ${c.type}`)
      .join("\n");

    const prompt = `Sebagai ahli dalam metode AHP (Analytical Hierarchy Process), berikan rekomendasi nilai perbandingan berpasangan untuk kriteria berikut dalam skala 1-9:

${criteriaText}

Skala perbandingan AHP:
- 1: Sama penting
- 3: Sedikit lebih penting
- 5: Lebih penting
- 7: Sangat lebih penting
- 9: Mutlak lebih penting
- 2,4,6,8: Nilai antara

Berikan rekomendasi dalam format JSON dengan struktur berikut:
{
  "recommendations": [
    {
      "row": "kode_kriteria_baris",
      "col": "kode_kriteria_kolom", 
      "value": nilai_numerik,
      "reason": "penjelasan singkat"
    }
  ],
  "note": "catatan umum tentang perbandingan"
}

Hanya berikan pasangan matriks segitiga atas (row < col). Pertimbangkan tipe kriteria (BENEFIT/COST) dan deskripsi dalam memberikan rekomendasi.`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 2048,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.text();
      console.error("Gemini API Error:", errorData);
      return NextResponse.json(
        { error: "Gagal mendapatkan rekomendasi dari AI" },
        { status: 500 }
      );
    }

    const data = await response.json();
    const aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

    // Parse JSON dari response AI
    let parsedResponse;
    try {
      // Ekstrak JSON dari markdown code block jika ada
      const jsonMatch = aiResponse.match(/```json\n?([\s\S]*?)\n?```/) || 
                       aiResponse.match(/\{[\s\S]*\}/);
      const jsonText = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : aiResponse;
      parsedResponse = JSON.parse(jsonText);
    } catch (parseError) {
      console.error("Failed to parse AI response:", aiResponse);
      return NextResponse.json(
        { error: "Gagal memproses response AI", rawResponse: aiResponse },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: parsedResponse,
    });
  } catch (error) {
    console.error("Error in AI recommendation:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
