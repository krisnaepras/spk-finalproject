import { GoogleGenAI } from "@google/genai";

/**
 * Client Gemini menggunakan kunci `GEMINI_API_KEY` dari environment.
 * Simpan lokasinya di satu tempat agar bisa dipakai lintas modul.
 */
export const ai = new GoogleGenAI({});

const DEFAULT_MODEL = "gemini-2.5-flash";

/**
 * Contoh pemanggilan sederhana yang meniru snippet permintaan user.
 * Gunakan untuk uji koneksi cepat: await runGeminiSample();
 */
export async function runGeminiSample() {
  const response = await ai.models.generateContent({
    model: DEFAULT_MODEL,
    contents: "Explain how AI works in a few words",
  });
  return response.text ?? "";
}

/**
 * Helper umum untuk mendapatkan teks rekomendasi dari prompt kustom.
 */
export async function generateGeminiText(prompt: string, model: string = DEFAULT_MODEL) {
  const response = await ai.models.generateContent({
    model,
    contents: prompt,
  });
  return response.text ?? "";
}
