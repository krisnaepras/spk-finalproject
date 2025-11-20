export default function RumusPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-950 text-slate-50">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-12 top-6 h-64 w-64 rounded-full bg-emerald-500/20 blur-[110px]" />
        <div className="absolute bottom-0 right-0 h-72 w-72 rounded-full bg-cyan-500/15 blur-[120px]" />
      </div>

      <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-9 px-4 py-12 lg:py-16">
        <header className="rounded-2xl border border-slate-800/80 bg-slate-900/80 p-6 shadow-2xl shadow-emerald-900/20 ring-1 ring-emerald-500/10 sm:p-8">
          <div className="flex flex-wrap items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-200">
            <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-emerald-200">Dokumentasi Rumus</span>
            <span className="rounded-full bg-slate-800 px-3 py-1 text-cyan-200">AHP + TOPSIS</span>
          </div>
          <div className="mt-5 flex flex-col gap-6">
            <div className="space-y-4">
              <h1 className="text-3xl font-bold leading-tight text-emerald-50 sm:text-4xl">
                Kanvas Rumus &amp; Alur Perhitungan
              </h1>
              <p className="max-w-2xl text-base text-slate-200 sm:text-lg">
                Lihat langkah lengkap yang kami pakai untuk menghitung bobot AHP dan pemeringkatan TOPSIS.
                Semua dirancang agar mudah ditelusuri, divalidasi manual di Excel, dan bebas untuk berbagai kasus
                (vendor, mobil, lokasi, dll).
              </p>
              <div className="flex flex-wrap gap-3 text-xs">
                <a
                  href="/"
                  className="rounded-full border border-emerald-500/50 bg-emerald-500/10 px-4 py-2 font-semibold text-emerald-100 transition hover:-translate-y-[1px] hover:bg-emerald-500/20"
                >
                  ← Kembali ke Dashboard
                </a>
                <span className="rounded-full border border-slate-800 bg-slate-900 px-4 py-2 text-[11px] text-slate-300">
                  Urutan tab di aplikasi ≈ urutan langkah di bawah
                </span>
              </div>
            </div>
            <div className="flex flex-col gap-3">
              <div className="rounded-xl border border-emerald-500/20 bg-slate-900/80 p-4 shadow-lg shadow-emerald-900/30">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-200">Fleksibel</p>
                <p className="mt-1 text-base text-slate-200">Import Excel / JSON / SQL, lalu mapping ID &amp; kriteria.</p>
              </div>
              <div className="rounded-xl border border-cyan-500/20 bg-slate-900/80 p-4 shadow-lg shadow-cyan-900/30">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-cyan-200">Step-by-step</p>
                <p className="mt-1 text-base text-slate-200">Wizard → AHP → TOPSIS → Ranking dengan kontrol konsistensi.</p>
              </div>
              <div className="rounded-xl border border-slate-700/60 bg-slate-900/70 p-4 shadow-lg shadow-slate-900/40">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-200">Verifikasi Manual</p>
                <p className="mt-1 text-base text-slate-200">
                  Rumus dibuat eksplisit supaya kamu bisa mengecek ulang hasil dengan spreadsheet.
                </p>
              </div>
            </div>
          </div>
        </header>

        <section className="flex flex-col gap-3 rounded-2xl border border-slate-800/80 bg-slate-900/70 p-5 shadow-xl shadow-emerald-900/15 ring-1 ring-emerald-500/10">
          {[
            { step: "01", title: "Import & Mapping", desc: "Pilih sumber data, tetapkan ID/Nama, aktifkan ≤5 kriteria." },
            { step: "02", title: "AHP", desc: "Isi matriks perbandingan, dapatkan bobot & cek CR." },
            { step: "03", title: "TOPSIS", desc: "Normalisasi, bobot, solusi ideal, jarak D⁺/D⁻." },
            { step: "04", title: "Ranking", desc: "Urutkan Vᵢ, unduh laporan, lihat detail per kriteria." },
          ].map((item) => (
            <div
              key={item.step}
              className="flex gap-4 rounded-xl border border-slate-800/60 bg-slate-950/50 p-4 transition hover:-translate-y-[2px] hover:border-emerald-500/40"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-sm font-semibold text-emerald-100">
                {item.step}
              </span>
              <div className="space-y-1">
                <p className="text-base font-semibold text-emerald-50">{item.title}</p>
                <p className="text-sm text-slate-200">{item.desc}</p>
              </div>
            </div>
          ))}
        </section>

        {/* AHP */}
        <section className="flex flex-col gap-6 rounded-2xl border border-slate-800/80 bg-slate-900/80 p-6 shadow-xl shadow-emerald-900/20 ring-1 ring-emerald-500/10 lg:p-8">
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/15 text-sm font-semibold text-emerald-100 ring-1 ring-emerald-500/30">
                AHP
              </span>
              <div>
                <h2 className="text-xl font-semibold text-emerald-100">1. AHP – Bobot Kriteria</h2>
                <p className="text-base text-slate-200">
                  Misal ada <span className="font-mono">n</span> kriteria <span className="font-mono">C₁, …, Cₙ</span>.
                  AHP mengubah perbandingan berpasangan menjadi bobot <span className="font-mono">wᵢ</span> (Σwᵢ = 1).
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <div className="rounded-xl border border-emerald-500/20 bg-slate-950/50 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-200">Langkah Inti</p>
                <ul className="mt-2 space-y-2 text-base text-slate-200">
                  <li>1) Isi matriks perbandingan <span className="font-mono">A = (aᵢⱼ)</span> (bagian atas saja).</li>
                  <li>2) Normalisasi kolom → matriks <span className="font-mono">N = (nᵢⱼ)</span>.</li>
                  <li>3) Rata-rata baris N → bobot <span className="font-mono">wᵢ</span>.</li>
                  <li>4) Hitung <span className="font-mono">λmax</span>, <span className="font-mono">CI</span>, <span className="font-mono">CR</span> untuk cek konsistensi.</li>
                </ul>
              </div>
              <div className="rounded-xl border border-slate-800/70 bg-slate-950/50 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-300">Aturan Input</p>
                <ul className="mt-2 space-y-2 text-base text-slate-200">
                  <li><span className="font-mono">aᵢᵢ = 1</span> (diagonal).</li>
                  <li>Jika kriteria i lebih penting dari j dengan skala s → <span className="font-mono">aᵢⱼ = s</span> dan <span className="font-mono">aⱼᵢ = 1/s</span>.</li>
                  <li>Skala 1–9 (angka genap sebagai nilai tengah) sesuai tabel Saaty.</li>
                </ul>
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <div className="rounded-xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 via-slate-950/70 to-slate-900/80 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-200">Notasi</p>
                <dl className="mt-2 grid grid-cols-1 gap-2 text-base text-slate-200">
                  <div className="rounded-lg border border-emerald-500/20 bg-slate-950/40 p-3">
                    <dt className="text-sm text-slate-400">n</dt>
                    <dd className="text-base">Jumlah kriteria.</dd>
                  </div>
                  <div className="rounded-lg border border-emerald-500/20 bg-slate-950/40 p-3">
                    <dt className="text-sm text-slate-400">aᵢⱼ</dt>
                    <dd className="text-base">Perbandingan pentingnya Cᵢ terhadap Cⱼ.</dd>
                  </div>
                  <div className="rounded-lg border border-emerald-500/20 bg-slate-950/40 p-3">
                    <dt className="text-sm text-slate-400">Sⱼ</dt>
                    <dd className="text-base">Jumlah kolom ke-j pada matriks A.</dd>
                  </div>
                  <div className="rounded-lg border border-emerald-500/20 bg-slate-950/40 p-3">
                    <dt className="text-sm text-slate-400">nᵢⱼ</dt>
                    <dd className="text-base">Elemen matriks normalisasi (A / Sⱼ).</dd>
                  </div>
                  <div className="rounded-lg border border-emerald-500/20 bg-slate-950/40 p-3">
                    <dt className="text-sm text-slate-400">wᵢ</dt>
                    <dd className="text-base">Bobot kriteria ke-i.</dd>
                  </div>
                  <div className="rounded-lg border border-emerald-500/20 bg-slate-950/40 p-3">
                    <dt className="text-sm text-slate-400">λmax, CI, CR</dt>
                    <dd className="text-base">Indikator konsistensi matriks AHP.</dd>
                  </div>
                </dl>
              </div>
              <div className="rounded-xl border border-slate-800/70 bg-slate-950/60 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-300">Rumus Cepat</p>
                <div className="mt-3 space-y-3 text-base text-slate-200">
                  <div>
                    <p className="font-semibold text-emerald-100">1) Normalisasi kolom</p>
                    <p className="mt-1 rounded-lg bg-slate-900 px-3 py-2 font-mono text-sm text-emerald-200">Sⱼ = Σᵢ aᵢⱼ</p>
                    <p className="mt-1 rounded-lg bg-slate-900 px-3 py-2 font-mono text-sm text-emerald-200">nᵢⱼ = aᵢⱼ / Sⱼ</p>
                  </div>
                  <div>
                    <p className="font-semibold text-emerald-100">2) Bobot</p>
                    <p className="mt-1 rounded-lg bg-slate-900 px-3 py-2 font-mono text-sm text-emerald-200">wᵢ = (1 / n) × Σⱼ nᵢⱼ</p>
                    <p className="mt-1 text-xs text-slate-400">Di kode, bobot dibulatkan ke 6 digit desimal.</p>
                  </div>
                  <div>
                    <p className="font-semibold text-emerald-100">3) Konsistensi</p>
                    <div className="mt-1 space-y-2 rounded-lg bg-slate-900 px-3 py-2 font-mono text-sm text-emerald-200">
                      <p>λmax = Σⱼ (Sⱼ × wⱼ)</p>
                      <p>CI = (λmax − n) / (n − 1)</p>
                      <p>CR = CI / RIₙ</p>
                    </div>
                    <p className="mt-1 text-sm text-slate-400">
                      RIₙ: tabel Saaty (contoh n=3 → 0.58, n=4 → 0.90, n=5 → 1.12). CR ≤ 0.1 = konsistensi baik.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-emerald-500/25 bg-gradient-to-r from-emerald-500/10 via-slate-950/70 to-cyan-500/10 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-200">Contoh singkat (3 kriteria)</p>
              <p className="mt-2 text-sm text-slate-200">
                Kriteria: Harga (C₁), Emisi (C₂), Konsumsi BBM (C₃).
              </p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-200">
                <li>C₁ vs C₂ = 3 → Harga sedikit lebih penting dari Emisi.</li>
                <li>C₁ vs C₃ = 5 → Harga jauh lebih penting dari Konsumsi BBM.</li>
                <li>C₂ vs C₃ = 2 → Emisi sedikit lebih penting dari Konsumsi BBM.</li>
              </ul>
              <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-slate-200">
                <li>Susun matriks 3×3 lengkap (diagonal 1, bawah = kebalikan).</li>
                <li>Hitung jumlah kolom Sⱼ.</li>
                <li>Normalisasi ke nᵢⱼ, lalu rata-rata baris → w₁, w₂, w₃.</li>
                <li>Hitung λmax, CI, CR untuk cek konsistensi.</li>
              </ol>
            </div>
          </div>
        </section>

        {/* TOPSIS */}
        <section className="flex flex-col gap-6 rounded-2xl border border-slate-800/80 bg-slate-900/80 p-6 shadow-xl shadow-cyan-900/20 ring-1 ring-cyan-500/10 lg:p-8">
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-500/15 text-sm font-semibold text-cyan-100 ring-1 ring-cyan-500/30">
                TOPSIS
              </span>
              <div>
                <h2 className="text-xl font-semibold text-cyan-50">2. TOPSIS – Nilai Preferensi</h2>
                <p className="text-base text-slate-200">
                  Dengan <span className="font-mono">m</span> alternatif dan <span className="font-mono">n</span>{' '}
                  kriteria, TOPSIS memilih alternatif terdekat dengan solusi ideal positif (A⁺) dan terjauh dari
                  solusi ideal negatif (A⁻).
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <div className="rounded-xl border border-cyan-500/20 bg-slate-950/50 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-cyan-200">Notasi Utama</p>
                <ul className="mt-2 grid grid-cols-1 gap-2 text-base text-slate-200">
                  <li><span className="font-mono">X = (xᵢⱼ)</span>: matriks keputusan.</li>
                  <li><span className="font-mono">R = (rᵢⱼ)</span>: matriks normalisasi.</li>
                  <li><span className="font-mono">Y = (yᵢⱼ)</span>: matriks ternormalisasi terbobot.</li>
                  <li><span className="font-mono">A⁺, A⁻</span>: solusi ideal positif &amp; negatif.</li>
                  <li><span className="font-mono">Dᵢ⁺, Dᵢ⁻</span>: jarak ke A⁺ &amp; A⁻.</li>
                  <li><span className="font-mono">Vᵢ</span>: nilai preferensi alternatif ke-i.</li>
                </ul>
              </div>
              <div className="rounded-xl border border-slate-800/70 bg-slate-950/50 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-300">Pra-syarat</p>
                <ul className="mt-2 space-y-2 text-base text-slate-200">
                  <li>Tidak ada nilai kosong di matriks keputusan.</li>
                  <li>Bobot kriteria dari AHP tersedia.</li>
                  <li>Tiap kriteria diberi tipe <span className="font-mono">Benefit</span> atau <span className="font-mono">Cost</span>.</li>
                </ul>
              </div>
            </div>

            <div className="rounded-xl border border-cyan-500/25 bg-gradient-to-br from-cyan-500/10 via-slate-950/70 to-slate-900/70 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-cyan-200">Alur Perhitungan</p>
              <ol className="mt-2 list-decimal space-y-2 pl-5 text-base text-slate-200">
                <li>
                  Normalisasi (R):<div className="mt-1 rounded-lg bg-slate-900 px-3 py-2 font-mono text-sm text-cyan-200">vⱼ = √(Σᵢ xᵢⱼ²) <br /> rᵢⱼ = xᵢⱼ / vⱼ</div>
                </li>
                <li>
                  Matriks terbobot (Y):<div className="mt-1 rounded-lg bg-slate-900 px-3 py-2 font-mono text-sm text-cyan-200">yᵢⱼ = wⱼ × rᵢⱼ</div>
                </li>
                <li>
                  Solusi ideal per kriteria:
                  <div className="mt-1 grid gap-2 text-base">
                    <div className="rounded-lg bg-slate-900 px-3 py-2 font-mono text-cyan-200">
                      Benefit → Aⱼ⁺ = maxᵢ(yᵢⱼ), Aⱼ⁻ = minᵢ(yᵢⱼ)
                    </div>
                    <div className="rounded-lg bg-slate-900 px-3 py-2 font-mono text-cyan-200">
                      Cost → Aⱼ⁺ = minᵢ(yᵢⱼ), Aⱼ⁻ = maxᵢ(yᵢⱼ)
                    </div>
                  </div>
                </li>
                <li>
                  Jarak ke solusi ideal:
                  <div className="mt-1 space-y-2 rounded-lg bg-slate-900 px-3 py-2 font-mono text-sm text-cyan-200">
                    <p>Dᵢ⁺ = √( Σⱼ (yᵢⱼ − Aⱼ⁺)² )</p>
                    <p>Dᵢ⁻ = √( Σⱼ (yᵢⱼ − Aⱼ⁻)² )</p>
                  </div>
                </li>
                <li>
                  Nilai preferensi &amp; peringkat:
                  <div className="mt-1 rounded-lg bg-slate-900 px-3 py-2 font-mono text-sm text-cyan-200">
                    Vᵢ = Dᵢ⁻ / (Dᵢ⁺ + Dᵢ⁻)
                  </div>
                  <p className="mt-1 text-sm text-slate-400">
                    0 ≤ Vᵢ ≤ 1; semakin besar Vᵢ, semakin tinggi peringkat. Urutkan descending → peringkat 1 =
                    “Rekomendasi Terbaik”.
                  </p>
                </li>
              </ol>
            </div>

            <div className="rounded-xl border border-slate-800/70 bg-slate-950/60 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-300">Hubungan Dengan Tab Aplikasi</p>
              <ul className="mt-2 list-disc space-y-2 pl-5 text-base text-slate-200">
                <li>Tab <span className="font-mono">Matriks Keputusan (X)</span> → sumber <span className="font-mono">xᵢⱼ</span>.</li>
                <li>Tab <span className="font-mono">Normalisasi (R)</span> → menampilkan <span className="font-mono">rᵢⱼ</span>.</li>
                <li>Tab <span className="font-mono">Bobot (Y)</span> → menampilkan <span className="font-mono">yᵢⱼ</span>.</li>
                <li>Tab <span className="font-mono">A⁺ &amp; A⁻</span> → solusi ideal positif/negatif.</li>
                <li>Tab <span className="font-mono">D⁺ &amp; D⁻</span> → jarak tiap alternatif.</li>
                <li>Tab <span className="font-mono">Nilai V</span> → nilai preferensi Vᵢ dan ranking.</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Tips praktis */}
        <section className="rounded-2xl border border-slate-800/80 bg-slate-900/70 p-6 shadow-xl shadow-slate-900/20 ring-1 ring-slate-700/50 lg:p-8">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-800 text-sm font-semibold text-slate-100 ring-1 ring-slate-700">
              Tips
            </span>
            <div>
              <h2 className="text-xl font-semibold text-emerald-100">3. Tips Hitung Manual</h2>
              <p className="text-base text-slate-300">Checkpoint singkat sebelum dan sesudah kamu replikasi di Excel.</p>
            </div>
          </div>
          <ol className="mt-4 flex flex-col gap-3 text-base text-slate-200">
            <li className="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
              1) Susun matriks perbandingan AHP, lalu hitung wⱼ, λmax, CI, dan CR.
            </li>
            <li className="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
              2) Pastikan CR ≤ 0.1, atau lanjutkan dengan sadar risiko jika lebih tinggi.
            </li>
            <li className="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
              3) Isi matriks keputusan X untuk semua alternatif dan kriteria di aplikasi.
            </li>
            <li className="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
              4) Gunakan tab Normalisasi, Bobot, A⁺/A⁻, D⁺/D⁻ untuk menelusuri setiap tahap TOPSIS.
            </li>
            <li className="rounded-lg border border-slate-800 bg-slate-950/60 p-3 lg:col-span-2">
              5) Replikasi langkah yang sama di Excel untuk memverifikasi nilai Vᵢ &amp; ranking.
            </li>
          </ol>
          <p className="mt-3 text-sm text-slate-400">
            Contoh studi kasus: <span className="font-semibold text-emerald-200">mobil ramah lingkungan</span> dengan kriteria
            Harga (Cost), Emisi CO₂ (Cost), Konsumsi BBM (Benefit), dan Fitur Keamanan (Benefit). Jalankan alur di atas
            lalu bandingkan hasil manual dengan hasil aplikasi.
          </p>
        </section>
      </div>
    </main>
  );
}
