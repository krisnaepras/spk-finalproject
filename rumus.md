# Rumus Perhitungan SPK (AHP + TOPSIS)

Dokumen ini merangkum rumus-rumus yang digunakan di aplikasi untuk perhitungan bobot AHP dan pemeringkatan TOPSIS, supaya mudah dicek dan diuji manual dengan Excel / kalkulator.

---

## 1. AHP – Perhitungan Bobot Kriteria

Misal ada \(n\) kriteria \(C_1, C_2, \dots, C_n\).

### 1.1 Matriks Perbandingan Berpasangan

- Bentuk matriks perbandingan:

  \[
  A = (a_{ij}),\quad i,j = 1,\dots,n
  \]

- Aturan:
  - \(a_{ii} = 1\)
  - Jika kriteria \(i\) lebih penting daripada \(j\) dengan skala \(s\), maka \(a_{ij} = s\) dan \(a_{jj} = 1\), \(a_{ji} = \frac{1}{s}\).
  - Di aplikasi, user hanya mengisi bagian atas diagonal (\(i < j\)), bagian bawah diisi otomatis dengan kebalikan.

### 1.2 Normalisasi Kolom

1. Hitung jumlah tiap kolom:

   \[
   S_j = \sum_{i=1}^{n} a_{ij},\quad j = 1,\dots,n
   \]

2. Normalisasi matriks dengan membagi setiap elemen terhadap jumlah kolomnya:

   \[
   n_{ij} = \frac{a_{ij}}{S_j}
   \]

   Matriks \(N = (n_{ij})\) disebut matriks ter-normalisasi.

### 1.3 Vektor Bobot (Prioritas Kriteria)

- Bobot tiap kriteria dihitung sebagai rata-rata baris dari matriks normalisasi:

  \[
  w_i = \frac{1}{n} \sum_{j=1}^{n} n_{ij},\quad i = 1,\dots,n
  \]

- Di kode, bobot disimpan dengan pembulatan 6 digit desimal:

  \[
  w_i^{(\text{simpen})} = \text{round}(w_i, 6)
  \]

### 1.4 Nilai \(\lambda_{\max}\), CI, dan CR

1. Hitung \(\lambda_{\max}\) menggunakan jumlah kolom dan bobot:

   \[
   \lambda_{\max} = \sum_{j=1}^{n} S_j \cdot w_j
   \]

2. Consistency Index (CI):

   \[
   CI = \frac{\lambda_{\max} - n}{n - 1}
   \]

3. Consistency Ratio (CR):

   \[
   CR = \frac{CI}{RI_n}
   \]

   - \(RI_n\) adalah *Random Index* untuk ukuran matriks \(n\).
   - Nilai \(RI_n\) mengikuti tabel standar (Saaty), misalnya:
     - \(n = 1,2 \Rightarrow RI = 0\)
     - \(n = 3 \Rightarrow RI = 0{,}58\)
     - \(n = 4 \Rightarrow RI = 0{,}90\)
     - \(n = 5 \Rightarrow RI = 1{,}12\)
   - Di kode, jika \(RI_n = 0\) maka \(CR\) dianggap 0.

4. Batas konsistensi:
   - Jika \(CR \le 0{,}1\) → matriks dianggap konsisten (baik).
   - Jika \(CR > 0{,}1\) → konsistensi kurang baik; di aplikasi user diminta konfirmasi jika tetap ingin memakai bobot tersebut.

---

## 2. TOPSIS – Perhitungan Nilai Preferensi

Misal ada \(m\) alternatif dan \(n\) kriteria.

- \(X = (x_{ij})\) = matriks keputusan:
  - \(x_{ij}\) = nilai alternatif ke-\(i\) pada kriteria ke-\(j\).
- \(w_j\) = bobot kriteria ke-\(j\) dari AHP.
- Tipe kriteria:
  - **Benefit**: semakin besar semakin baik.
  - **Cost**: semakin kecil semakin baik.

### 2.1 Matriks Keputusan

Matriks keputusan \(X\):

\[
X =
\begin{bmatrix}
 x_{11} & x_{12} & \dots & x_{1n} \\
 x_{21} & x_{22} & \dots & x_{2n} \\
 \vdots & \vdots & \ddots & \vdots \\
 x_{m1} & x_{m2} & \dots & x_{mn}
\end{bmatrix}
\]

Di aplikasi, ini adalah tabel “Matriks Keputusan (X)” yang diisi user.

### 2.2 Normalisasi (R)

Untuk setiap kolom (kriteria) ke-\(j\), hitung akar jumlah kuadrat:

\[
v_j = \sqrt{\sum_{i=1}^{m} x_{ij}^2}
\]

Lalu normalisasi:

\[
r_{ij} = \frac{x_{ij}}{v_j}
\]

Matriks \(R = (r_{ij})\) adalah “Normalisasi (R)” di UI.

### 2.3 Matriks Terbobot (Y)

Kalikan setiap kolom dengan bobot kriteria dari AHP:

\[
y_{ij} = w_j \cdot r_{ij}
\]

Matriks \(Y = (y_{ij})\) adalah “Bobot (Y)” di UI.

### 2.4 Solusi Ideal Positif dan Negatif

Untuk setiap kriteria \(j\):

- Jika **Benefit**:

  \[
  A_j^+ = \max_i y_{ij},\qquad
  A_j^- = \min_i y_{ij}
  \]

- Jika **Cost**:

  \[
  A_j^+ = \min_i y_{ij},\qquad
  A_j^- = \max_i y_{ij}
  \]

Vektor \(A^+ = (A_1^+, \dots, A_n^+)\) dan \(A^- = (A_1^-, \dots, A_n^-)\) tampil sebagai “A+ & A−” di UI.

### 2.5 Jarak ke Solusi Ideal

Untuk setiap alternatif \(i\):

- Jarak ke solusi ideal positif:

  \[
  D_i^+ = \sqrt{\sum_{j=1}^{n} (y_{ij} - A_j^+)^2}
  \]

- Jarak ke solusi ideal negatif:

  \[
  D_i^- = \sqrt{\sum_{j=1}^{n} (y_{ij} - A_j^-)^2}
  \]

Ini adalah tabel “D+ & D−” di UI.

### 2.6 Nilai Preferensi dan Peringkat

- Nilai preferensi TOPSIS untuk alternatif \(i\):

  \[
  V_i = \frac{D_i^-}{D_i^+ + D_i^-}
  \]

  - \(0 \le V_i \le 1\).
  - Semakin besar \(V_i\), semakin baik alternatif tersebut.

- Peringkat:
  - Urutkan alternatif berdasarkan \(V_i\) secara menurun (descending).
  - Peringkat 1 = alternatif dengan \(V_i\) terbesar → “Rekomendasi Terbaik” di UI.

---

## 3. Tips Menghitung Manual

- **Langkah manual yang disarankan:**
  1. Susun matriks perbandingan AHP untuk kriteria → hitung bobot \(w_j\), \(\lambda_{\max}\), CI, CR.
  2. Isi matriks keputusan \(X\) untuk alternatif vs kriteria.
  3. Hitung normalisasi \(R\) dan matriks terbobot \(Y\).
  4. Tentukan \(A^+\) dan \(A^-\) sesuai tipe Benefit/Cost.
  5. Hitung \(D_i^+\), \(D_i^-\), lalu \(V_i\).
  6. Bandingkan hasil manual \(V_i\) dengan tabel “Nilai V” di aplikasi.

- Untuk uji studi kasus “mobil ramah lingkungan”:
  - Jadikan kriteria misalnya:
    - \(C_1\): Harga (Cost)
    - \(C_2\): Emisi CO₂ (Cost)
    - \(C_3\): Konsumsi BBM (Benefit)
    - \(C_4\): Fitur keamanan / faktor pendukung (Benefit)
  - Ikuti urutan di atas, gunakan bobot dari AHP dan data nilai dari tabel alternatif.

