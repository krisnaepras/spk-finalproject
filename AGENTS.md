Instruksi Pembangunan Website Sistem Pendukung Keputusan (SPK) Kompleks
Metode: AHP + TOPSIS, Import Data Fleksibel (Excel / JSON / SQL)

---

## 1. Misi Agen

Kamu (agent/developer) bertugas membangun **website Sistem Pendukung Keputusan (SPK)** yang:

- Fleksibel terhadap **sumber data** (Excel/CSV, JSON, SQL).
- Mengizinkan pengguna **memilih sendiri kolom mana yang akan dipakai** untuk:
  - ID & nama alternatif
  - Kriteria (maksimal 5 kriteria)
- Menggunakan:
  - **AHP** untuk menghitung bobot kriteria
  - **TOPSIS** untuk perankingan alternatif
- Menyediakan **UI yang jelas, step-by-step**, sehingga user awam pun tahu:
  - Tahap mana yang sudah beres
  - Tahap mana yang masih belum

Jangan membuat SPK “hard-coded” untuk satu studi kasus saja. Sistem harus generik: bisa dipakai untuk berbagai kasus (mobil ramah lingkungan, pemilihan vendor, pemilihan lokasi, dll.) dengan mengganti data dan kriteria.

---

## 2. Konsep & Terminologi Inti

- **Alternatif**: pilihan yang akan dibandingkan (misal mobil A, mobil B, vendor X, dll.)
- **Kriteria**: aspek penilaian (misal harga, emisi, konsumsi BBM, dsb.), maksimal **5**.
- **Benefit / Cost**:
  - Benefit → makin besar makin bagus.
  - Cost → makin kecil makin bagus.
- **AHP (Analytic Hierarchy Process)**:
  - Digunakan untuk menghitung **bobot kriteria**.
  - Input berupa **matriks perbandingan berpasangan** kriteria.
  - Hanya bagian **atas diagonal** yang diisi user; diagonal selalu 1; bagian bawah otomatis 1/nilai atas.
- **TOPSIS**:
  - Menggunakan bobot dari AHP + nilai alternatif untuk menghasilkan **nilai preferensi V**.
  - Output akhir berupa **ranking alternatif**.

---

## 3. Peran User & Scope

Untuk versi awal, asumsikan satu role utama:

- **Admin/User utama**:
  - Mengimpor data
  - Mengatur mapping kolom
  - Mengatur kriteria
  - Mengisi matriks AHP
  - Menjalankan perhitungan TOPSIS
  - Melihat & mengunduh hasil

Multi-user / multi-role bisa ditambah nanti, tapi bukan fokus awal.

---

## 4. Fitur Utama (Ringkasan)

1. **Dashboard / Beranda**
2. **Manajemen Alternatif**
3. **Manajemen Kriteria (max 5)**
4. **Penilaian Alternatif (Matriks Keputusan)**
5. **Wizard Import Data (Excel/CSV, JSON, SQL) + Mapping Kolom**
6. **Modul AHP (perbandingan kriteria + bobot + CR)**
7. **Modul TOPSIS (normalisasi → bobot → ideal positif/negatif → V)**
8. **Halaman Hasil Pemeringkatan + Download**

Semua fitur harus terhubung dalam alur kerja yang logis.

---

## 5. Detail Fitur & Perilaku

### 5.1 Dashboard / Beranda

Tampilkan ringkasan:

- Jumlah alternatif
- Jumlah kriteria (misal: “3/5 kriteria terpakai”)
- Status tahapan:
  - Data alternatif: sudah/ belum
  - Kriteria: sudah/ belum
  - Bobot AHP: sudah/ belum
  - Perhitungan TOPSIS: sudah/ belum
- Shortcut:
  - Kelola Alternatif
  - Kelola Kriteria
  - Perhitungan AHP
  - Perhitungan TOPSIS
  - Hasil Pemeringkatan
  - Import Data

### 5.2 Manajemen Alternatif

Tabel:

- Kolom minimal:
  - ID Alternatif (misal A1, A2, atau dari data sumber)
  - Nama Alternatif
  - (Opsional) Deskripsi/kolom tambahan
- Aksi per baris:
  - Edit
  - Hapus
- Di atas tabel:
  - `+ Tambah Alternatif` (form manual)
  - `Import Data` → membuka wizard Import (lihat 5.5)

### 5.3 Manajemen Kriteria (Maksimal 5)

Tabel:

- Kode Kriteria (C1, C2, …)
- Nama Kriteria
- Tipe: Benefit / Cost
- (Opsional) Deskripsi

Aturan:

- Maksimal **5 kriteria aktif**.
- Tampilkan indikator: “Saat ini 3/5 kriteria terpakai”.
- Kriteria bisa:
  - Ditambah (jika < 5)
  - Diedit (nama, tipe, Benefit/Cost)
  - Dihapus (jika tidak dipakai di perhitungan)

Kriteria ini bisa terbentuk:

- Dari **mapping kolom hasil import**
- Dari input manual

### 5.4 Penilaian Alternatif (Matriks Keputusan)

Tujuan: menyimpan nilai X_ij (nilai alternatif i pada kriteria j).

UI:

- Tabel:
  - Baris: Alternatif
  - Kolom: Kriteria
  - Sel: nilai numerik (float / integer sesuai kebutuhan)
- Fitur:
  - Edit inline
  - Validasi agar tidak ada nilai kosong saat akan menghitung TOPSIS
- Opsional:
  - Import nilai dari file, selama mapping konsisten dengan alternatif & kriteria.

### 5.5 Wizard Import Data (Excel / JSON / SQL)

Wizard minimal 4 langkah:

#### Step 1 – Pilih Sumber Data

- Pilihan:
  - Excel / CSV
  - JSON
  - SQL

#### Step 2 – Input Sumber

**Excel/CSV:**

- Upload file .xlsx/.xls/.csv
- Jika multi-sheet → pilih sheet
- Tombol `Preview`

**JSON:**

- Opsi:
  - Upload file JSON
  - Atau paste JSON di textarea
- Sistem harus bisa mendeteksi array objek utama.

**SQL:**

- Koneksi ke Database:
  - DB Type (MySQL/PostgreSQL/…)
  - Host, Port, Database, Username, Password
  - Textarea `SQL Query` (SELECT …)
- Tombol:
  - `Test Connection`
  - `Preview` (jalankan query dan ambil beberapa row contoh)

Tidak perlu mendukung parsing file .sql penuh. Fokus pada SELECT hasil tabel.

#### Step 3 – Preview Data Mentah

Tampilkan tabel sampel:

- Baris: beberapa row pertama (misal 50 baris)
- Kolom: nama kolom sumber

Tampilkan info:

- “Terbaca: X kolom, Y baris (50 baris pertama ditampilkan).”

Tombol: `Lanjut ke Mapping Kolom`

#### Step 4 – Mapping Kolom & Pilih Kriteria

**a) Mapping Peran Kolom**

Tabel mapping:

- Kolom Sumber
- Dropdown “Peran di Sistem”:
  - ID Alternatif (wajib 1 kolom)
  - Nama Alternatif
  - Deskripsi (opsional)
  - Abaikan

Pastikan:

- Ada tepat satu kolom yang dipilih sebagai **ID Alternatif**.
- Nama Alternatif boleh tidak dipilih, tapi disarankan.

**b) Pilih Kolom yang Dijadikan Kriteria (Max 5)**

Tabel/daftar:

- Checkbox pilih kolom → “jadikan kriteria”
- Untuk tiap kolom yang dipilih:
  - Nama Kriteria di Sistem (editable, bisa rename)
  - Tipe data: numerik (asumsi awal)
  - Benefit/Cost (wajib dipilih)

Aturan:

- Maksimal 5 kolom boleh dipilih sebagai kriteria.
- Saat sudah 5, checkbox lain disable.

**c) Output Mapping**

Setelah klik `Simpan & Proses`:

- Insert/Update:
  - Tabel `alternatif`: ID, nama, deskripsi
  - Tabel `kriteria`: dari kolom-kolom terpilih (max 5)
  - Tabel `nilai_alternatif`: matriks X_ij berdasarkan data import

Setelah ini, semua modul (AHP & TOPSIS) menggunakan data internal tersebut.

---

## 6. Modul AHP (Bobot Kriteria)

### 6.1 UI Matriks Perbandingan Berpasangan

- Tabel NxN, N = jumlah kriteria aktif (≤ 5).
- Baris & Kolom = daftar kriteria (C1–C5).
- Aturan input:
  - Diagonal otomatis = 1
  - User hanya boleh input **bagian atas diagonal** (i < j).
  - Bagian bawah otomatis = 1 / nilai atas.
- Sediakan bantuan skala:
  - 1: sama penting
  - 3, 5, 7, 9: penting sampai sangat penting
  - 2,4,6,8: nilai di antara

Pastikan validasi:

- Hanya menerima nilai > 0
- Boleh float (misal 1.5, 2.5, dsb.)

### 6.2 Perhitungan AHP (di Backend)

- Hitung:
  - Bobot vektor eigen (bisa pakai pendekatan rata-rata baris / normalisasi + rata-rata)
  - λmax
  - CI = (λmax − n) / (n − 1)
  - CR = CI / RI (random index, sesuaikan nilai n)
- Simpan bobot kriteria ke tabel `kriteria` (field bobot).

### 6.3 UI Hasil AHP

Tampilkan:

- Tabel:
  - Kriteria | Bobot | Persentase
- Nilai:
  - λmax, CI, CR
- Notifikasi:
  - Jika CR ≤ 0,1 → “Konsistensi baik.”
  - Jika CR > 0,1 → “Konsistensi kurang baik, mohon cek kembali perbandingan.”

Tombol:

- `Gunakan Bobot Ini untuk TOPSIS` → menandai bobot sebagai “aktif”.

---

## 7. Modul TOPSIS

### 7.1 Prasyarat

Sebelum perhitungan TOPSIS:

- Nilai matriks keputusan X_ij lengkap (tidak ada null).
- Bobot kriteria dari AHP sudah tersedia.
- Tipe Benefit/Cost tiap kriteria sudah di-set.

### 7.2 Langkah Perhitungan (Backend)

1. **Matriks Keputusan X**: dari `nilai_alternatif`.
2. **Normalisasi R**:
   - \( r_{ij} = \dfrac{x_{ij}}{\sqrt{\sum_i x_{ij}^2}} \)
3. **Matriks Ternormalisasi Terbobot Y**:
   - \( y_{ij} = w_j \cdot r_{ij} \)
4. **Solusi Ideal Positif & Negatif**:
   - Untuk kriteria Benefit:
     - A+ = max(y_ij), A− = min(y_ij)
   - Untuk kriteria Cost:
     - A+ = min(y_ij), A− = max(y_ij)
5. **Jarak ke Solusi Ideal**:
   - \( D_i^+ = \sqrt{\sum_j (y_{ij} - A_j^+)^2} \)
   - \( D_i^- = \sqrt{\sum_j (y_{ij} - A_j^-)^2} \)
6. **Nilai Preferensi**:
   - \( V_i = \dfrac{D_i^-}{D_i^+ + D_i^-} \)

Simpan semua nilai penting, minimal:

- V_i per alternatif
- D+ dan D− (opsional tapi bagus untuk “detail perhitungan”).

### 7.3 UI Modul TOPSIS

Boleh dibuat ber-tab atau accordion:

- Tab 1: Matriks Keputusan (X)
- Tab 2: Normalisasi (R)
- Tab 3: Matriks Terbobot (Y)
- Tab 4: A+ dan A−
- Tab 5: D+ dan D−
- Tab 6: Nilai V_i

Setiap tab menampilkan tabel dengan struktur:

- Baris: Alternatif (kecuali tabel A+ & A−)
- Kolom: Kriteria

Tombol utama:

- `Hitung TOPSIS`
- `Lihat Hasil Pemeringkatan`

---

## 8. Halaman Hasil Pemeringkatan

Tabel:

- Ranking
- ID Alternatif
- Nama Alternatif
- Nilai V_i

Aturan:

- Urutkan descending berdasarkan V_i.
- Alternatif dengan V_i tertinggi = **peringkat 1**.

Highlight:

- Peringkat 1 diberi label “Rekomendasi Terbaik”.

Fitur:

- Cari/filter berdasarkan nama alternatif.
- Download:
  - CSV / Excel
  - (Opsional) PDF laporan singkat
- Untuk tiap baris:
  - Tombol “Detail” → menampilkan:
    - Nilai tiap kriteria
    - Bobot kriteria
    - D+, D−, V_i

---

## 9. Skema Data (Saran)

Agen boleh menyesuaikan, tapi berikut struktur dasar yang disarankan:

- `projects` (opsional, kalau mau multi-proyek)
  - id
  - name
  - description

- `alternatives`
  - id
  - project_id (opsional)
  - code (A1, A2, … atau dari import)
  - name
  - description

- `criteria`
  - id
  - project_id (opsional)
  - code (C1, C2, …)
  - name
  - type (benefit/cost)
  - weight (nullable sampai AHP selesai)
  - is_active (bool)

- `alternative_scores`
  - id
  - alternative_id
  - criteria_id
  - value (numeric)

- `ahp_comparisons` (opsional, untuk menyimpan matriks perbandingan)
  - id
  - project_id
  - criteria_i_id
  - criteria_j_id
  - value

- `topsis_results`
  - id
  - alternative_id
  - score_v
  - d_plus (optional)
  - d_minus (optional)
  - rank

---

## 10. Validasi & Edge Case Penting

- Jika kriteria > 5 → **tolak** (validasi UI & backend).
- Jika belum ada kriteria → AHP dan TOPSIS tidak boleh dijalankan.
- Jika bobot AHP belum dihitung → TOPSIS tidak boleh dijalankan.
- Jika ada nilai matrix keputusan yang kosong → TOPSIS tidak boleh dijalankan.
- Jika CR AHP terlalu besar (misal > 0,1):
  - Tetap boleh lanjut **hanya jika user mengkonfirmasi**, tapi harus tampil warning.
- Import data:
  - Wajib ada kolom yang dipilih sebagai ID Alternatif.
  - Jika ID duplikat → ditolak atau diberikan opsi merge/skip.

---

## 11. Gaya Implementasi yang Diutamakan

- Backend & frontend bebas (Golang, Node, Laravel, dsb.) **asalkan**:
  - Struktur modular
  - Logika matematika AHP & TOPSIS jelas dan bisa diuji terpisah (unit testable)
- Pisahkan:
  - Lapisan perhitungan (math/service)
  - Lapisan data (repository/ORM)
  - Lapisan presentasi (API/UI)

---

## 12. Tujuan Akhir

Hasil akhir yang diinginkan:

- Website SPK yang:
  - Bisa menerima data dari berbagai sumber (Excel/JSON/SQL)
  - Bisa melakukan mapping kolom secara fleksibel
  - Membatasi kriteria sampai 5, tapi tetap bebas ditentukan user
  - Menghitung bobot dengan AHP
  - Menghitung ranking dengan TOPSIS
  - Menyajikan hasil secara jelas dan bisa diekspor

Fokuskan implementasi pada **kejelasan alur**, **fleksibilitas sumber data**, dan **akurasi perhitungan AHP + TOPSIS**.
