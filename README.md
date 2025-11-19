## Sistem Pendukung Keputusan (SPK) – Ringkasan Proyek

Aplikasi ini adalah fondasi untuk website SPK generik dengan metode AHP + TOPSIS. Fokus utama:

- Import data alternatif dari berbagai sumber (Excel/CSV, JSON, SQL).
- Pemilihan kriteria fleksibel (maks. 5) dengan tipe Benefit/Cost.
- Modul AHP untuk bobot kriteria dan TOPSIS untuk pemeringkatan alternatif.

## Menjalankan Aplikasi

```bash
# Install dependencies
npm install

# Jalankan server pengembangan
npm run dev
```

Server pengembangan tersedia di [http://localhost:3000](http://localhost:3000).

## Prisma & Database

1.  Sesuaikan `DATABASE_URL` di `.env` atau `.env.local`. Contoh standar:
    ```
    postgresql://postgres:postgres@localhost:5432/spk_mrl?schema=public
    ```
    Gunakan kredensial sesuai lingkungan Anda (PostgreSQL disarankan).
2.  Setelah memperbarui skema Prisma, jalankan:
    ```bash
    npm run prisma:generate   # generate client
    npm run prisma:migrate    # apply migrations (membutuhkan DB aktif)
    npm run prisma:studio     # UI untuk melihat/edit data
    npm run prisma:format     # format schema.prisma
    ```
3.  Untuk pengembangan sehari-hari cukup jalankan `npm run dev`; Prisma Client otomatis menggunakan konfigurasi dari `lib/prisma.ts`.

## Ringkasan Skema Prisma

- `Project` – container opsional untuk memisahkan studi kasus SPK.
- `Alternative` – daftar alternatif (code, nama, deskripsi) per proyek.
- `Criteria` – hingga 5 kriteria aktif, tipe Benefit/Cost, bobot AHP, dan posisi tampilan.
- `AlternativeScore` – nilai matriks keputusan (X_ij) per alternatif x kriteria.
- `AhpComparison` – matriks perbandingan berpasangan untuk perhitungan bobot.
- `TopsisResult` – menyimpan V_i, D⁺, D⁻, dan peringkat terakhir.

Skema lengkap berada di `prisma/schema.prisma`.

## Struktur Projek

- `app/` – Next.js App Router + UI.
- `lib/prisma.ts` – helper Prisma Client berbasis singleton untuk mencegah multiple instans di dev.
- `prisma/` – skema Prisma dan migrasi (ketika sudah dibuat).

Silakan sesuaikan README ini apabila ada perubahan arsitektur besar atau proses baru.
