export default function RumusPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-6 px-4 py-8 text-slate-900">
      <header className="border-b border-slate-200 pb-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">
          Dokumentasi Perhitungan
        </p>
        <h1 className="mt-1 text-2xl font-bold">Rumus AHP &amp; TOPSIS</h1>
        <p className="mt-2 text-sm text-slate-600">
          Halaman ini merangkum rumus yang digunakan aplikasi untuk menghitung bobot AHP dan pemeringkatan
          TOPSIS, sehingga kamu bisa memverifikasi hasil menggunakan Excel atau perhitungan manual.
        </p>
      </header>

      <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">1. AHP – Bobot Kriteria</h2>
        <p className="text-sm text-slate-700">
          Misal ada <span className="font-mono">n</span> kriteria:{" "}
          <span className="font-mono">C₁, C₂, …, Cₙ</span>.
        </p>

        <h3 className="text-sm font-semibold text-slate-900">1.1 Matriks Perbandingan Berpasangan</h3>
        <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
          <li>
            Bentuk matriks:{" "}
            <span className="font-mono">A = (aᵢⱼ)</span>, dengan <span className="font-mono">i,j = 1..n</span>.
          </li>
          <li>
            Aturan:
            <ul className="list-disc pl-5">
              <li>
                <span className="font-mono">aᵢᵢ = 1</span> (diagonal utama).
              </li>
              <li>
                Jika kriteria <span className="font-mono">i</span> lebih penting dari{" "}
                <span className="font-mono">j</span> dengan skala <span className="font-mono">s</span>, maka{" "}
                <span className="font-mono">aᵢⱼ = s</span> dan <span className="font-mono">aⱼᵢ = 1/s</span>.
              </li>
              <li>
                Di aplikasi, kamu hanya mengisi bagian atas diagonal; bagian bawah otomatis diisi kebalikan.
              </li>
            </ul>
          </li>
        </ul>

        <h3 className="text-sm font-semibold text-slate-900">1.2 Normalisasi Kolom</h3>
        <ol className="list-decimal space-y-1 pl-5 text-sm text-slate-700">
          <li>
            Hitung jumlah tiap kolom:{" "}
            <span className="font-mono">Sⱼ = Σᵢ aᵢⱼ</span>.
          </li>
          <li>
            Normalisasi matriks:{" "}
            <span className="font-mono">
              nᵢⱼ = aᵢⱼ / Sⱼ
            </span>{" "}
            → membentuk matriks normalisasi <span className="font-mono">N = (nᵢⱼ)</span>.
          </li>
        </ol>

        <h3 className="text-sm font-semibold text-slate-900">1.3 Vektor Bobot</h3>
        <p className="text-sm text-slate-700">
          Bobot tiap kriteria adalah rata-rata baris dari matriks normalisasi:
        </p>
        <p className="rounded-md bg-slate-50 px-3 py-2 text-sm font-mono">
          wᵢ = (1 / n) × Σⱼ nᵢⱼ
        </p>
        <p className="text-xs text-slate-500">
          Di kode, setiap <span className="font-mono">wᵢ</span> disimpan dengan pembulatan sampai 6 digit
          desimal.
        </p>

        <h3 className="text-sm font-semibold text-slate-900">1.4 λmax, CI, dan CR</h3>
        <ol className="list-decimal space-y-1 pl-5 text-sm text-slate-700">
          <li>
            Hitung <span className="font-mono">λmax</span>:
            <div className="mt-1 rounded-md bg-slate-50 px-3 py-2 font-mono text-sm">
              λmax = Σⱼ (Sⱼ × wⱼ)
            </div>
          </li>
          <li>
            Consistency Index (CI):
            <div className="mt-1 rounded-md bg-slate-50 px-3 py-2 font-mono text-sm">
              CI = (λmax − n) / (n − 1)
            </div>
          </li>
          <li>
            Consistency Ratio (CR):
            <div className="mt-1 rounded-md bg-slate-50 px-3 py-2 font-mono text-sm">
              CR = CI / RIₙ
            </div>
            <p className="mt-1 text-xs text-slate-500">
              RIₙ adalah nilai Random Index untuk ukuran matriks n (mengikuti tabel Saaty, misalnya n=3 →
              RI=0.58, n=4 → RI=0.90, n=5 → RI=1.12).
            </p>
          </li>
          <li>
            Batas konsistensi:
            <ul className="list-disc pl-5">
              <li>
                Jika <span className="font-mono">CR ≤ 0.1</span> → konsistensi baik.
              </li>
              <li>
                Jika <span className="font-mono">CR &gt; 0.1</span> → konsistensi kurang baik; aplikasi
                menampilkan peringatan dan meminta konfirmasi user.
              </li>
            </ul>
          </li>
        </ol>
      </section>

      <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">2. TOPSIS – Nilai Preferensi</h2>
        <p className="text-sm text-slate-700">
          Misal ada <span className="font-mono">m</span> alternatif dan{" "}
          <span className="font-mono">n</span> kriteria.
        </p>

        <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
          <li>
            Matriks keputusan:{" "}
            <span className="font-mono">X = (xᵢⱼ)</span>, dengan{" "}
            <span className="font-mono">xᵢⱼ</span> = nilai alternatif ke-
            <span className="font-mono">i</span> pada kriteria ke-
            <span className="font-mono">j</span>.
          </li>
          <li>
            Bobot kriteria: <span className="font-mono">wⱼ</span> dari hasil AHP.
          </li>
          <li>
            Tipe kriteria:
            <span className="font-mono"> Benefit</span> (semakin besar semakin baik) dan{" "}
            <span className="font-mono">Cost</span> (semakin kecil semakin baik).
          </li>
        </ul>

        <h3 className="text-sm font-semibold text-slate-900">2.1 Normalisasi (R)</h3>
        <ol className="list-decimal space-y-1 pl-5 text-sm text-slate-700">
          <li>
            Untuk setiap kriteria (kolom) ke-<span className="font-mono">j</span>, hitung:
            <div className="mt-1 rounded-md bg-slate-50 px-3 py-2 font-mono text-sm">
              vⱼ = √(Σᵢ xᵢⱼ²)
            </div>
          </li>
          <li>
            Normalisasi:
            <div className="mt-1 rounded-md bg-slate-50 px-3 py-2 font-mono text-sm">
              rᵢⱼ = xᵢⱼ / vⱼ
            </div>
          </li>
        </ol>

        <h3 className="text-sm font-semibold text-slate-900">2.2 Matriks Terbobot (Y)</h3>
        <p className="text-sm text-slate-700">
          Kalikan setiap nilai normalisasi dengan bobot kriteria:
        </p>
        <p className="rounded-md bg-slate-50 px-3 py-2 font-mono text-sm">
          yᵢⱼ = wⱼ × rᵢⱼ
        </p>

        <h3 className="text-sm font-semibold text-slate-900">2.3 Solusi Ideal Positif &amp; Negatif</h3>
        <p className="text-sm text-slate-700">Untuk setiap kriteria ke-j:</p>
        <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
          <li>
            Jika <span className="font-mono">Benefit</span>:
            <div className="mt-1 grid gap-1 text-sm font-mono">
              <span>Aⱼ⁺ = maxᵢ (yᵢⱼ)</span>
              <span>Aⱼ⁻ = minᵢ (yᵢⱼ)</span>
            </div>
          </li>
          <li>
            Jika <span className="font-mono">Cost</span>:
            <div className="mt-1 grid gap-1 text-sm font-mono">
              <span>Aⱼ⁺ = minᵢ (yᵢⱼ)</span>
              <span>Aⱼ⁻ = maxᵢ (yᵢⱼ)</span>
            </div>
          </li>
        </ul>

        <h3 className="text-sm font-semibold text-slate-900">2.4 Jarak ke Solusi Ideal</h3>
        <p className="text-sm text-slate-700">Untuk setiap alternatif ke-i:</p>
        <div className="space-y-1 rounded-md bg-slate-50 px-3 py-2 font-mono text-sm">
          <div>Dᵢ⁺ = √( Σⱼ (yᵢⱼ − Aⱼ⁺)² )</div>
          <div>Dᵢ⁻ = √( Σⱼ (yᵢⱼ − Aⱼ⁻)² )</div>
        </div>

        <h3 className="text-sm font-semibold text-slate-900">2.5 Nilai Preferensi &amp; Peringkat</h3>
        <p className="text-sm text-slate-700">Nilai preferensi TOPSIS untuk alternatif ke-i:</p>
        <p className="rounded-md bg-slate-50 px-3 py-2 font-mono text-sm">
          Vᵢ = Dᵢ⁻ / (Dᵢ⁺ + Dᵢ⁻)
        </p>
        <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-slate-700">
          <li>
            <span className="font-mono">0 ≤ Vᵢ ≤ 1</span>; semakin besar Vᵢ, semakin baik alternatif tersebut.
          </li>
          <li>
            Peringkat ditentukan dengan mengurutkan Vᵢ dari terbesar ke terkecil (descending). Peringkat 1 =
            “Rekomendasi Terbaik”.
          </li>
        </ul>
      </section>

      <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">3. Tips Hitung Manual</h2>
        <ol className="list-decimal space-y-1 pl-5 text-sm text-slate-700">
          <li>Susun matriks perbandingan AHP untuk kriteria, lalu hitung wⱼ, λmax, CI, dan CR.</li>
          <li>Isi matriks keputusan X untuk semua alternatif dan kriteria.</li>
          <li>Hitung normalisasi R dan matriks terbobot Y.</li>
          <li>Tentukan A⁺ dan A⁻ untuk setiap kriteria sesuai tipe Benefit/Cost.</li>
          <li>Hitung Dᵢ⁺ dan Dᵢ⁻, lalu nilai preferensi Vᵢ untuk tiap alternatif.</li>
          <li>Bandingkan Vᵢ manual dengan tabel “Nilai V” di aplikasi.</li>
        </ol>
        <p className="text-xs text-slate-500">
          Untuk studi kasus <span className="font-semibold">mobil ramah lingkungan</span>, kamu bisa memilih
          kriteria misalnya: Harga (Cost), Emisi CO₂ (Cost), Konsumsi BBM (Benefit), dan Fitur Keamanan
          (Benefit), lalu mengikuti langkah-langkah di atas.
        </p>
      </section>
    </main>
  );
}

