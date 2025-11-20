export default function RumusPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-50">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8">
        <header className="border-b border-slate-800 pb-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-400">
            Dokumentasi Perhitungan
          </p>
          <h1 className="mt-1 text-2xl font-bold text-emerald-100">Rumus AHP &amp; TOPSIS</h1>
          <p className="mt-2 text-sm text-slate-300">
            Halaman ini menjelaskan langkah-langkah dan rumus yang digunakan di aplikasi untuk menghitung bobot
            AHP dan pemeringkatan TOPSIS, sehingga kamu bisa menelusuri dan mengulang perhitungan secara manual
            (misalnya di Excel).
          </p>
          <div className="mt-4 flex flex-wrap gap-2 text-xs">
            <a
              href="/"
              className="rounded-full border border-slate-700 px-3 py-1 font-semibold text-slate-200 hover:bg-slate-800"
            >
              ← Kembali ke Dashboard
            </a>
            <span className="rounded-full border border-slate-800 px-3 py-1 text-[11px] text-slate-400">
              Urutan tab di aplikasi ≈ urutan langkah di dokumen ini
            </span>
          </div>
        </header>

        {/* AHP */}
        <section className="space-y-4 rounded-xl border border-slate-800 bg-slate-900/70 p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-emerald-200">1. AHP – Bobot Kriteria</h2>
          <p className="text-sm text-slate-200">
            Misal ada <span className="font-mono">n</span> kriteria:{' '}
            <span className="font-mono">C₁, C₂, …, Cₙ</span>. AHP mengubah penilaian berpasangan antar-kriteria
            menjadi bobot <span className="font-mono">wᵢ</span> yang jumlahnya = 1.
          </p>

          <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              1.0 Notasi yang dipakai
            </h3>
            <ul className="mt-2 grid gap-1 text-xs text-slate-300 sm:grid-cols-2">
              <li>
                <span className="font-mono">n</span>: jumlah kriteria.
              </li>
              <li>
                <span className="font-mono">aᵢⱼ</span>: perbandingan pentingnya kriteria <span className="font-mono">i</span>{' '}
                terhadap <span className="font-mono">j</span>.
              </li>
              <li>
                <span className="font-mono">Sⱼ</span>: jumlah kolom ke-<span className="font-mono">j</span> pada matriks A.
              </li>
              <li>
                <span className="font-mono">nᵢⱼ</span>: elemen matriks normalisasi (A dibagi Sⱼ).
              </li>
              <li>
                <span className="font-mono">wᵢ</span>: bobot kriteria ke-<span className="font-mono">i</span>.
              </li>
              <li>
                <span className="font-mono">λmax, CI, CR</span>: indikator konsistensi matriks AHP.
              </li>
            </ul>
          </div>

          <h3 className="text-sm font-semibold text-emerald-200">1.1 Matriks Perbandingan Berpasangan</h3>
          <ul className="list-disc space-y-1 pl-5 text-sm text-slate-200">
            <li>
              Bentuk matriks: <span className="font-mono">A = (aᵢⱼ)</span>, dengan{' '}
              <span className="font-mono">i,j = 1..n</span>.
            </li>
            <li>
              Aturan input:
              <ul className="list-disc pl-5">
                <li>
                  <span className="font-mono">aᵢᵢ = 1</span> (diagonal utama).
                </li>
                <li>
                  Jika kriteria <span className="font-mono">i</span> lebih penting dari{' '}
                  <span className="font-mono">j</span> dengan skala <span className="font-mono">s</span>, maka{' '}
                  <span className="font-mono">aᵢⱼ = s</span> dan <span className="font-mono">aⱼᵢ = 1/s</span>.
                </li>
                <li>Di UI, kamu hanya mengisi sel di atas diagonal; bagian bawah diisi otomatis sebagai 1/s.</li>
              </ul>
            </li>
          </ul>

          <h3 className="text-sm font-semibold text-emerald-200">1.2 Normalisasi Kolom</h3>
          <ol className="list-decimal space-y-1 pl-5 text-sm text-slate-200">
            <li>
              Hitung jumlah tiap kolom:{' '}
              <span className="font-mono">Sⱼ = Σᵢ aᵢⱼ</span>.
            </li>
            <li>
              Normalisasi matriks:{' '}
              <span className="font-mono">nᵢⱼ = aᵢⱼ / Sⱼ</span> → membentuk matriks normalisasi{' '}
              <span className="font-mono">N = (nᵢⱼ)</span>.
            </li>
          </ol>

          <h3 className="text-sm font-semibold text-emerald-200">1.3 Vektor Bobot</h3>
          <p className="text-sm text-slate-200">
            Bobot tiap kriteria adalah rata-rata baris dari matriks normalisasi:
          </p>
          <p className="rounded-md bg-slate-900 px-3 py-2 text-sm font-mono text-emerald-200">
            wᵢ = (1 / n) × Σⱼ nᵢⱼ
          </p>
          <p className="text-xs text-slate-400">
            Di kode, setiap <span className="font-mono">wᵢ</span> dibulatkan sampai 6 digit desimal sebelum
            disimpan.
          </p>

          <h3 className="text-sm font-semibold text-emerald-200">1.4 λmax, CI, dan CR</h3>
          <ol className="list-decimal space-y-1 pl-5 text-sm text-slate-200">
            <li>
              Hitung <span className="font-mono">λmax</span>:
              <div className="mt-1 rounded-md bg-slate-900 px-3 py-2 font-mono text-sm text-emerald-200">
                λmax = Σⱼ (Sⱼ × wⱼ)
              </div>
            </li>
            <li>
              Consistency Index (CI):
              <div className="mt-1 rounded-md bg-slate-900 px-3 py-2 font-mono text-sm text-emerald-200">
                CI = (λmax − n) / (n − 1)
              </div>
            </li>
            <li>
              Consistency Ratio (CR):
              <div className="mt-1 rounded-md bg-slate-900 px-3 py-2 font-mono text-sm text-emerald-200">
                CR = CI / RIₙ
              </div>
              <p className="mt-1 text-xs text-slate-400">
                RIₙ adalah nilai Random Index untuk ukuran matriks n (tabel Saaty: contoh n=3 → RI=0.58, n=4 →
                RI=0.90, n=5 → RI=1.12).
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

          <div className="mt-3 rounded-lg border border-slate-800 bg-slate-950/40 p-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              1.5 Contoh singkat AHP (3 kriteria)
            </h3>
            <p className="mt-1 text-xs text-slate-300">
              Misal ada 3 kriteria: Harga (C₁), Emisi (C₂), Konsumsi BBM (C₃) dengan penilaian:
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-slate-300">
              <li>C₁ vs C₂ = 3 → Harga sedikit lebih penting dari Emisi.</li>
              <li>C₁ vs C₃ = 5 → Harga jauh lebih penting dari Konsumsi BBM.</li>
              <li>C₂ vs C₃ = 2 → Emisi sedikit lebih penting dari Konsumsi BBM.</li>
            </ul>
            <p className="mt-2 text-xs text-slate-300">
              Langkah manual:
            </p>
            <ol className="mt-1 list-decimal space-y-1 pl-5 text-xs text-slate-300">
              <li>Susun matriks 3×3 lengkap (isi diagonal 1, bagian bawah = kebalikan).</li>
              <li>Hitung jumlah tiap kolom Sⱼ.</li>
              <li>Normalisasi tiap elemen dengan membagi ke Sⱼ → dapatkan nᵢⱼ.</li>
              <li>Ambil rata-rata baris → bobot w₁, w₂, w₃.</li>
              <li>Hitung λmax, CI, CR dengan rumus di atas untuk mengecek konsistensi.</li>
            </ol>
          </div>
        </section>

        {/* TOPSIS */}
        <section className="space-y-4 rounded-xl border border-slate-800 bg-slate-900/70 p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-emerald-200">2. TOPSIS – Nilai Preferensi</h2>
          <p className="text-sm text-slate-200">
            Misal ada <span className="font-mono">m</span> alternatif dan{' '}
            <span className="font-mono">n</span> kriteria. TOPSIS memilih alternatif terbaik berdasarkan jarak
            terhadap solusi ideal positif (A⁺) dan negatif (A⁻).
          </p>

          <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              2.0 Notasi utama
            </h3>
            <ul className="mt-2 grid gap-1 text-xs text-slate-300 sm:grid-cols-2">
              <li>
                <span className="font-mono">X = (xᵢⱼ)</span>: matriks keputusan.
              </li>
              <li>
                <span className="font-mono">R = (rᵢⱼ)</span>: matriks normalisasi.
              </li>
              <li>
                <span className="font-mono">Y = (yᵢⱼ)</span>: matriks ternormalisasi terbobot.
              </li>
              <li>
                <span className="font-mono">A⁺, A⁻</span>: solusi ideal positif &amp; negatif.
              </li>
              <li>
                <span className="font-mono">Dᵢ⁺, Dᵢ⁻</span>: jarak ke A⁺ dan A⁻.
              </li>
              <li>
                <span className="font-mono">Vᵢ</span>: nilai preferensi alternatif ke-i.
              </li>
            </ul>
          </div>

          <ul className="list-disc space-y-1 pl-5 text-sm text-slate-200">
            <li>
              Matriks keputusan: <span className="font-mono">X = (xᵢⱼ)</span>, dengan{' '}
              <span className="font-mono">xᵢⱼ</span> = nilai alternatif ke-
              <span className="font-mono">i</span> pada kriteria ke-
              <span className="font-mono">j</span>.
            </li>
            <li>
              Bobot kriteria: <span className="font-mono">wⱼ</span> dari hasil AHP.
            </li>
            <li>
              Tipe kriteria: <span className="font-mono">Benefit</span> (semakin besar semakin baik) dan{' '}
              <span className="font-mono">Cost</span> (semakin kecil semakin baik).
            </li>
          </ul>

          <h3 className="text-sm font-semibold text-emerald-200">2.1 Normalisasi (R)</h3>
          <ol className="list-decimal space-y-1 pl-5 text-sm text-slate-200">
            <li>
              Untuk setiap kriteria (kolom) ke-<span className="font-mono">j</span>, hitung:
              <div className="mt-1 rounded-md bg-slate-900 px-3 py-2 font-mono text-sm text-emerald-200">
                vⱼ = √(Σᵢ xᵢⱼ²)
              </div>
            </li>
            <li>
              Normalisasi:
              <div className="mt-1 rounded-md bg-slate-900 px-3 py-2 font-mono text-sm text-emerald-200">
                rᵢⱼ = xᵢⱼ / vⱼ
              </div>
            </li>
          </ol>

          <h3 className="text-sm font-semibold text-emerald-200">2.2 Matriks Terbobot (Y)</h3>
          <p className="text-sm text-slate-200">Kalikan setiap nilai normalisasi dengan bobot kriteria:</p>
          <p className="rounded-md bg-slate-900 px-3 py-2 text-sm font-mono text-emerald-200">
            yᵢⱼ = wⱼ × rᵢⱼ
          </p>

          <h3 className="text-sm font-semibold text-emerald-200">2.3 Solusi Ideal Positif &amp; Negatif</h3>
          <p className="text-sm text-slate-200">Untuk setiap kriteria ke-j:</p>
          <ul className="list-disc space-y-1 pl-5 text-sm text-slate-200">
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

          <h3 className="text-sm font-semibold text-emerald-200">2.4 Jarak ke Solusi Ideal</h3>
          <p className="text-sm text-slate-200">Untuk setiap alternatif ke-i:</p>
          <div className="space-y-1 rounded-md bg-slate-900 px-3 py-2 font-mono text-sm text-emerald-200">
            <div>Dᵢ⁺ = √( Σⱼ (yᵢⱼ − Aⱼ⁺)² )</div>
            <div>Dᵢ⁻ = √( Σⱼ (yᵢⱼ − Aⱼ⁻)² )</div>
          </div>

          <h3 className="text-sm font-semibold text-emerald-200">2.5 Nilai Preferensi &amp; Peringkat</h3>
          <p className="text-sm text-slate-200">Nilai preferensi TOPSIS untuk alternatif ke-i:</p>
          <p className="rounded-md bg-slate-900 px-3 py-2 text-sm font-mono text-emerald-200">
            Vᵢ = Dᵢ⁻ / (Dᵢ⁺ + Dᵢ⁻)
          </p>
          <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-slate-200">
            <li>
              <span className="font-mono">0 ≤ Vᵢ ≤ 1</span>; semakin besar Vᵢ, semakin baik alternatif tersebut.
            </li>
            <li>
              Peringkat ditentukan dengan mengurutkan Vᵢ dari terbesar ke terkecil (descending). Peringkat 1 =
              “Rekomendasi Terbaik”.
            </li>
          </ul>

          <div className="mt-3 rounded-lg border border-slate-800 bg-slate-950/40 p-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              2.6 Hubungan dengan tab di aplikasi
            </h3>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-slate-300">
              <li>
                Tab <span className="font-mono">Matriks Keputusan (X)</span> → sumber nilai{' '}
                <span className="font-mono">xᵢⱼ</span>.
              </li>
              <li>
                Tab <span className="font-mono">Normalisasi (R)</span> → menampilkan <span className="font-mono">rᵢⱼ</span>.
              </li>
              <li>
                Tab <span className="font-mono">Bobot (Y)</span> → menampilkan <span className="font-mono">yᵢⱼ</span>.
              </li>
              <li>
                Tab <span className="font-mono">A⁺ &amp; A⁻</span> → menampilkan vektor solusi ideal.
              </li>
              <li>
                Tab <span className="font-mono">D⁺ &amp; D⁻</span> → menampilkan jarak tiap alternatif ke A⁺ dan A⁻.
              </li>
              <li>
                Tab <span className="font-mono">Nilai V</span> → menampilkan nilai Vᵢ (dipakai untuk pemeringkatan).
              </li>
            </ul>
          </div>
        </section>

        {/* Tips praktis */}
        <section className="space-y-4 rounded-xl border border-slate-800 bg-slate-900/70 p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-emerald-200">3. Tips Hitung Manual</h2>
          <ol className="list-decimal space-y-1 pl-5 text-sm text-slate-200">
            <li>Susun matriks perbandingan AHP, lalu hitung wⱼ, λmax, CI, dan CR.</li>
            <li>Pastikan CR ≤ 0.1, atau sadar risiko jika tetap menggunakan bobot dengan CR &gt; 0.1.</li>
            <li>Isi matriks keputusan X untuk semua alternatif dan kriteria di aplikasi.</li>
            <li>Gunakan tab Normalisasi, Bobot, A⁺/A⁻, dan D⁺/D⁻ untuk menelusuri setiap tahap TOPSIS.</li>
            <li>Replikasi langkah-langkah yang sama di Excel untuk memverifikasi nilai Vᵢ.</li>
          </ol>
          <p className="text-xs text-slate-400">
            Untuk studi kasus <span className="font-semibold">mobil ramah lingkungan</span>, kamu bisa memilih
            kriteria misalnya: Harga (Cost), Emisi CO₂ (Cost), Konsumsi BBM (Benefit), dan Fitur Keamanan
            (Benefit), lalu mengikuti langkah di atas untuk membandingkan hasil manual dengan hasil aplikasi.
          </p>
        </section>
      </div>
    </main>
  );
}

