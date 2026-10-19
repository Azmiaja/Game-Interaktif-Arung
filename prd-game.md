# PRD Pembuatan Game — Ekspedisi Bajak Laut Persahabatan

Dokumen ini khusus untuk **membangun game**, dari layar pembuka sampai layar selesai. Isinya berupa spesifikasi layar, perilaku, data, dan urutan pengerjaan yang bisa langsung dikerjakan atau diberikan ke AI coding.

**Judul:** Peta Perjalanan Konflik: Ekspedisi Bajak Laut Persahabatan
**Misi:** Berburu Harta Karun Solusi
**Target:** siswa SMP kelas IX, layanan BK, laptop dan tablet
**Jenis:** game web narasi-reflektif, satu pemain, tanpa server

---

## 1. Keputusan Teknis

| Hal | Keputusan | Alasan |
|---|---|---|
| Teknologi | HTML + CSS + JavaScript biasa (tanpa framework) | Ringan, mudah diuji, mudah dihosting |
| Struktur berkas | `index.html`, `style.css`, `app.js`, `content.js`, folder `assets/` | Sederhana, bisa dibuka dari ZIP |
| Konten teks | Objek JavaScript di `content.js` (bukan `.json`) | `fetch` berkas JSON gagal bila dibuka langsung dari folder (`file://`) |
| Navigasi | Satu halaman (SPA); setiap layar adalah `<section>` yang tampil/sembunyi | Transisi mulus, state tetap di memori |
| State | Satu objek `state` + simpan ke `localStorage` (dibungkus try/catch) | Jawaban bertahan saat kembali atau tutup tab |
| Peta | SVG atau gambar latar + elemen posisi absolut untuk pulau dan kapal | Kapal digerakkan dengan CSS transition |
| Visual awal | Placeholder (SVG/CSS sederhana) dahulu, aset akhir menyusul | Logika bisa diuji sebelum ilustrasi jadi |
| Layout | Lanskap; desain dasar 1280×720 diperluas pada ruang layar yang tersedia sambil mempertahankan rasio elemen | Memenuhi layar laptop dan tablet tanpa memotong sisi game |
| Suara | Opsional, ada tombol mute | Tidak mengganggu kelas |

**Aturan keras:**
- Tidak ada QR code, tidak ada input nama atau data pribadi, tidak ada pengiriman data keluar.
- Pertanyaan dan kolom jawaban tidak boleh tampil semua pada satu layar.
- Tombol harus benar-benar berfungsi, bukan gambar tombol.
- Jangan klaim fitur selesai sebelum diuji (lihat bagian 12).

---

## 2. Daftar Layar dan Alur

```
S01 Pelabuhan
 ├─ MULAI PETUALANGAN ──► S03 Peta (0/4)
 └─ CARA BERMAIN ──► Modal ──► kembali ke S01

S03 Peta ──(Pulau 1)──► S04 Cerita (adegan 1–4) ──► S05 Misi
S05 ──BERLAYAR KE PULAU 1──► L1

L1  L1-Intro ► L1-Q1 ► L1-Q2 ► L1-Q3 ► L1-Hadiah ► T1 Transisi
T1  ──► S03 Peta (1/4) ──(Pulau 2)──► L2
L2  L2-Intro ► Misi Salsa (3) ► Misi Rani (3) ► L2-Umpan balik ► L2-Hadiah ► T2 Transisi
T2  ──► TB Titik Balik ──► S03 Peta (2/4) ──(Pulau 3)──► L3
L3  L3-Intro ► Kartu A/B/C ► Pertimbangan Kapten ► L3-Hadiah ► T3 Transisi
T3  ──► S03 Peta (3/4) ──(Pulau 4)──► L4
L4  L4-Intro ► Q1 ► Q2 ► Q3 ► Q4 ► Rencana Aksi ► Evaluasi ► L4-Hadiah ► T4 Transisi
T4  ──► S99 Teluk Harta Karun (4/4)

S99 Selesai: Rangkuman keterampilan ► Refleksi 1–3 ► [LIHAT RANGKUMAN JAWABAN] / [ULANGI PETUALANGAN]
```

> Catatan alur: Titik Balik muncul setelah Level 2 dan sebelum Level 3. Setelah Titik Balik, pemain kembali ke peta dan kapal berlayar ke Pulau 3.

---

## 3. State Game

```js
const state = {
  version: 1,
  storyDone: false,
  unlocked: 1,                 // pulau tertinggi yang boleh dimasuki (1–4); 5 = teluk
  completed: [false, false, false, false],
  rewards: [],                 // "compass" | "heart" | "crystal" | "chest"
  turningPointDone: false,
  answers: {
    l1: ["", "", ""],
    l2: { salsa: ["", "", ""], rani: ["", "", ""] },
    turningPoint: { choice: null, reason: "" },     // "A" | "B" | "C"
    l3: { cards: { A: ["","","",""], B: ["","","",""], C: ["","","",""] },
          captainNote: "" },
    l4: { q: ["", "", "", ""], plan: { action: "", how: "", when: "" } },
    final: ["", "", ""]
  },
  ui: { screen: "S01", step: 0, muted: false }
};
```

**Aturan state:**
- `unlocked` hanya naik saat level selesai, tidak pernah turun kecuali "Ulangi Petualangan".
- Setiap perubahan isian memanggil `save()` (debounce ± 300 ms).
- Saat memuat, jika `localStorage` kosong, rusak, atau tidak tersedia, mulai dari state awal tanpa error.
- "Ulangi Petualangan" menampilkan konfirmasi, lalu mengosongkan state dan `localStorage`.

---

## 4. Komponen yang Dipakai Ulang

| Komponen | Fungsi |
|---|---|
| `Screen` | Menampilkan satu layar dan menyembunyikan yang lain |
| `ScrollPanel` | Panel perkamen berisi judul, teks, isian, dan tombol; dipakai di semua layar tantangan |
| `QuestionStep` | Satu pertanyaan + `textarea` + indikator (1/3) + tombol KEMBALI dan LANJUTKAN |
| `ProgressBadge` | Indikator N/4 di peta |
| `Island` | Pulau di peta: aktif, terkunci (gembok), selesai (centang) |
| `Ship` | Penanda kapal; berpindah posisi dengan transisi CSS |
| `RewardModal` | Peti/ikon hadiah + pesan + tombol klaim |
| `SailTransition` | Animasi pelayaran singkat (ombak, burung laut) dengan teks dan tombol |
| `Toast` | Pesan singkat (mis. pulau terkunci) |
| `ParrotHint` | Tombol Petunjuk Beo yang membuka contoh awal kalimat |
| `Modal` | Cara Bermain, konfirmasi ulang |

**Perilaku `QuestionStep`:**
- LANJUTKAN aktif hanya bila isian memenuhi batas minimal karakter (`MIN_CHARS = 10`, dapat diubah di `content.js`).
- Jika belum memenuhi, tampilkan pesan ramah: "Ceritakan sedikit lebih banyak, Kapten."
- KEMBALI menampilkan jawaban sebelumnya yang sudah tersimpan.
- Pada pertanyaan pertama, KEMBALI kembali ke layar pembuka level.

---

## 5. Spesifikasi Layar (Pembuka sampai Selesai)

### S01 — Pelabuhan Awal
- **Visual:** pelabuhan tropis, kapal siap berlayar, karakter kapten, peta tergulung.
- **Teks:** judul "EKSPEDISI BAJAK LAUT PERSAHABATAN"; subjudul "Berlayar, Pahami Konflik, Temukan Harta Karun Solusi!"
- **Tombol:**
  - MULAI PETUALANGAN → jika ada progres tersimpan, tanyakan "Lanjutkan perjalanan atau mulai baru?"; jika tidak, ke S03 (atau S04 bila cerita belum dibaca setelah memilih Pulau 1).
  - CARA BERMAIN → Modal (3–4 langkah bergambar).
- **Larangan:** tidak ada pertanyaan atau kolom jawaban.

### S03 — Peta Ekspedisi
- **Visual:** lautan dari atas; Pelabuhan, Pulau 1–4, Teluk Emas; jalur putus-putus antarpulau.
- **Elemen:** `ProgressBadge` (0/4), `Ship`, panel koleksi hadiah kecil (opsional), petunjuk misi satu baris.
- **Pulau:** 1 Dengarkan (hijau), 2 Pahami (oranye), 3 Pikirkan (ungu), 4 Temukan Solusi (biru). Setiap pulau memiliki angka dan ikon.
- **Perilaku:**
  - Pulau dengan nomor ≤ `unlocked` dapat diklik; lainnya bergembok.
  - Klik pulau terkunci → Toast: "Selesaikan tantangan sebelumnya agar kapalmu dapat berlayar lebih jauh!"
  - Klik Pulau 1 jika `storyDone = false` → S04; jika sudah → L1-Intro.
  - Klik pulau terbuka lain → intro level tersebut.
  - Pulau yang sudah selesai boleh dibuka lagi untuk meninjau jawaban.
  - `Ship` ditempatkan di pulau terbuka terakhir.
- **Larangan:** tidak menampilkan pertanyaan atau kolom jawaban.

### S04 — Gulungan Cerita
Empat adegan, masing-masing satu ilustrasi dan satu blok teks, tombol LANJUTKAN CERITA. Isi cerita tidak diubah.

| Adegan | Teks |
|---|---|
| 1 | "Salsa dan Rani bersahabat sejak kelas VII dan satu kelompok proyek IPS di kelas IX. Salsa mengerjakan hampir semua bagian karena Rani sering izin latihan ekskul dan belum mengumpulkan bagiannya." |
| 2 | "Saat presentasi, guru memuji kelompok mereka, dan Rani ikut menerima pujian." |
| 3 | "Setelah presentasi, di depan teman-teman, Salsa berkata, 'Enak ya, tinggal ikut nama.' Rani malu dan tersinggung. Sejak itu keduanya saling menghindar di kelas, padahal masih ada proyek kelompok berikutnya." |
| 4 | "Satu hari sebelum presentasi, Salsa sempat ingin menegur Rani, tetapi memilih diam supaya tidak ribut." |

- Ada penanda adegan (1/4–4/4) dan tombol "Sebelumnya".
- Setelah adegan 4 → S05. Set `storyDone = true` saat S05 tercapai.

### S05 — Misi
- **Teks:** "Kapten, persahabatan Salsa dan Rani sedang menghadapi badai konflik. Kumpulkan empat petunjuk dan temukan harta karun berupa solusi yang adil!"
- **Tombol:** BERLAYAR KE PULAU 1 → kapal bergerak ke Pulau 1 (animasi singkat) → L1-Intro.
- Tombol "Baca Ulang Cerita" tersedia di semua level (membuka S04 mode baca, lalu kembali ke layar asal).

---

### Level 1 — Pulau Dengarkan
- **Latar:** pulau hijau, mercusuar, teropong, jejak kaki di pasir.
- **L1-Intro:** "LEVEL 1 — DENGARKAN" / "Cari petunjuk untuk memahami apa yang sebenarnya terjadi." Tombol MULAI TANTANGAN.
- **Pertanyaan** (`QuestionStep`, indikator 1/3–3/3), disimpan di `answers.l1[0..2]`:
  1. Apa yang sebenarnya terjadi antara Salsa dan Rani?
  2. Apa pemicu utama konflik mereka?
  3. Apa dampak konflik terhadap persahabatan dan proyek berikutnya?
- **L1-Hadiah:** peti kecil berisi kompas. Pesan: "Hebat! Kamu telah menemukan Petunjuk Pertama: Mengenali Masalah." Tombol KLAIM PETUNJUK.
- **Saat klaim:** `completed[0] = true`, `unlocked = max(unlocked, 2)`, tambah `"compass"` ke `rewards`.
- **T1 Transisi:** kapal meninggalkan pulau; teks "Petunjuk pertama berhasil dikumpulkan! Kapalmu siap menuju Pulau Pahami." Tombol LANJUTKAN PELAYARAN → S03 (1/4), kapal bergerak ke Pulau 2.

### Level 2 — Pulau Pahami
- **Latar:** pulau oranye, dua mercusuar kecil, simbol hati, dua karakter.
- **L2-Intro:** "LEVEL 2 — PAHAMI" / "Untuk menemukan solusi, pahami perasaan kedua tokoh." Tombol MULAI TANTANGAN.
- **Misi Salsa** (kartu karakter Salsa; `answers.l2.salsa[0..2]`): 
  1. Apa yang mungkin dipikirkan Salsa?
  2. Apa yang mungkin dirasakan Salsa?
  3. Apa kebutuhan Salsa yang belum terpenuhi?
- **Misi Rani** (kartu karakter Rani; `answers.l2.rani[0..2]`): pertanyaan yang sama untuk Rani.
- Dua misi terpisah, satu pertanyaan per layar, indikator 1/3–3/3 per misi.
- **Pengingat tetap terlihat:** "Perasaan dan pikiran tokoh merupakan dugaan berdasarkan cerita, bukan fakta yang sudah pasti."
- **L2-Umpan balik:** "Kamu berhasil melihat dua sudut pandang. Memahami seseorang bukan berarti membenarkan semua tindakannya."
- **L2-Hadiah:** simbol hati emas, "Petunjuk Kedua: Empati". Tombol KLAIM PETUNJUK DAN BERLAYAR.
- **Saat klaim:** `completed[1] = true`, `unlocked = max(unlocked, 3)`, tambah `"heart"`.
- **T2 Transisi:** teks pelayaran singkat → TB.

### TB — Titik Balik (Persimpangan Badai)
- **Latar:** lautan dengan tiga jalur, papan kayu "TITIK BALIK".
- **Narasi:** "Badai menghadang perjalananmu! Sebelum melanjutkan, pikirkan arah tindakan yang akan membantu menyelesaikan konflik."
- **Kartu pilihan (pilih satu):**
  - A. Terus diam dan menghindar.
  - B. Membalas dengan sindiran.
  - C. Berbicara secara pribadi dan asertif.
- **Pertanyaan:** "Menurutmu, apa kemungkinan akibat dari setiap pilihan tersebut?" → kotak alasan (`answers.turningPoint.reason`).
- **Aturan:** tidak ada label benar/salah di layar ini.
- **Tombol:** LANJUT KE PULAU PIKIRKAN, aktif bila ada pilihan dan alasan terisi. Set `turningPointDone = true`, lalu ke S03 (2/4) dan kapal ke Pulau 3.

### Level 3 — Pulau Pikirkan
- **Latar:** pulau ungu, gua ide, lampu kristal, persimpangan jalan.
- **L3-Intro:** "LEVEL 3 — PIKIRKAN" / "Gunakan kebijaksanaan kapten untuk menilai setiap pilihan." Tombol MULAI TANTANGAN.
- **Tiga kartu tindakan:**
  - A. Salsa terus menghindari Rani dan mengerjakan proyek berikutnya sendiri.
  - B. Salsa membalas Rani dengan sindiran di depan teman-teman.
  - C. Salsa mengajak Rani berbicara secara pribadi, menyampaikan perasaannya dengan tenang, mendengarkan penjelasan Rani, dan menyepakati pembagian tugas.
- **Saat kartu dipilih**, panel membuka empat pertanyaan (`answers.l3.cards[X][0..3]`):
  1. Apa akibat yang mungkin muncul?
  2. Bagaimana perasaan kedua tokoh setelah tindakan tersebut?
  3. Apakah tindakan tersebut membantu proyek berikutnya?
  4. Apa alternatif tindakan lain yang mungkin lebih baik?
- Kartu yang sudah dijawab diberi tanda centang. Tahap berikutnya terbuka setelah ketiga kartu terisi.
- **Pertimbangan Kapten:** pemain membandingkan ketiga pilihan dan menentukan langkah paling tepat (`answers.l3.captainNote`).
- **L3-Hadiah:** kristal ungu, "Petunjuk Ketiga Ditemukan: Berpikir Sebelum Bertindak." Tombol KLAIM PETUNJUK DAN LANJUTKAN.
- **Saat klaim:** `completed[2] = true`, `unlocked = max(unlocked, 4)`, tambah `"crystal"`.
- **T3 Transisi:** pelayaran ke Pulau 4 → S03 (3/4).

### Level 4 — Pulau Temukan Solusi
- **Latar:** pulau biru, dermaga, bendera, peti harta karun terkunci.
- **L4-Intro:** "LEVEL 4 — TEMUKAN SOLUSI" / "Ini tantangan terakhir! Susun rencana untuk meredakan konflik dan memulihkan kerja sama." Tombol MULAI MISI FINAL.
- **Pertanyaan** (satu per satu, `answers.l4.q[0..3]`):
  1. Apa langkah pertama yang sebaiknya dilakukan Salsa?
  2. Bagaimana Rani dapat menyampaikan perasaannya sekaligus bertanggung jawab terhadap tugas?
  3. Bagaimana mereka dapat menyepakati pembagian tugas proyek berikutnya?
  4. Apa yang dapat dilakukan jika percakapan belum menghasilkan kesepakatan?
- **Rencana Aksi Kapten:** tiga isian — Tindakan yang akan dilakukan, Cara melaksanakan tindakan, Waktu pelaksanaan tindakan (`answers.l4.plan`).
- **Evaluasi (lima pertanyaan panduan):**
  1. Apakah solusinya aman?
  2. Apakah adil bagi kedua pihak?
  3. Apakah realistis dilakukan?
  4. Apakah mendukung komunikasi dan tanggung jawab?
  5. Apakah menghindari penghinaan dan mempermalukan siapa pun?
- **Umpan balik:** lihat bagian 6. Tidak ada skor benar/salah. Pemain boleh memperbaiki rencana lalu melanjutkan.
- **L4-Hadiah:** peti harta karun terbuka, "Petunjuk Keempat: Solusi Bijak". Tombol BUKA JALAN MENUJU HARTA KARUN.
- **Saat klaim:** `completed[3] = true`, `unlocked = 5`, tambah `"chest"`.
- **T4 Transisi:** kapal berlayar ke teluk → S99.

### S99 — Teluk Harta Karun Persahabatan
- **Visual:** kapal tiba di teluk berpasir emas, peti terbuka, koin berkilau, kapten merayakan, indikator 4/4.
- **Judul:** "MISI BERHASIL! HARTA KARUN PERSAHABATAN DITEMUKAN!"
- **Rangkuman keterampilan:**
  - Dengarkan: kenali masalah.
  - Pahami: lihat sudut pandang dan perasaan.
  - Pikirkan: pertimbangkan konsekuensi.
  - Temukan solusi: pilih tindakan yang aman, adil, dan realistis.
- **Refleksi akhir** (`answers.final[0..2]`, satu per satu):
  1. Apa pelajaran terpenting dari konflik Salsa dan Rani?
  2. Apa yang akan kamu lakukan jika menghadapi konflik serupa?
  3. Keterampilan apa yang ingin kamu tingkatkan?
- **Tombol:**
  - LIHAT RANGKUMAN JAWABAN → layar Rangkuman.
  - ULANGI PETUALANGAN → konfirmasi → reset state → S01.

### S100 — Rangkuman Jawaban
- Menampilkan semua jawaban sesuai urutan perjalanan: Level 1, Level 2 (Salsa lalu Rani), Titik Balik, Level 3, Level 4 (pertanyaan dan Rencana Aksi), Refleksi akhir.
- Bagian yang kosong ditulis "(belum diisi)".
- Tombol: CETAK / SIMPAN PDF (`window.print()` dengan `@media print`), KEMBALI.

---

## 6. Umpan Balik Berbasis Aturan

Umpan balik bersifat petunjuk, tidak memblokir progres, dan tidak menghakimi.

### 6.1 Validasi umum
| Kondisi | Pesan |
|---|---|
| Isian kosong atau < `MIN_CHARS` | "Ceritakan sedikit lebih banyak, Kapten." |
| Isian berisi satu kata berulang atau karakter acak | "Coba tulis dengan kalimatmu sendiri, ya." |

### 6.2 Umpan balik Rencana Aksi (Level 4)
Gabungkan teks tiga isian (huruf kecil) lalu periksa kata kunci berikut. Daftar kata dapat diubah di `content.js`.

| Kriteria | Sinyal terpenuhi (contoh kata) | Petunjuk jika belum |
|---|---|---|
| Aman | pribadi, berdua, tenang, baik-baik | "Bagaimana agar percakapan berlangsung dengan tenang dan aman?" |
| Adil | bagi, sama, adil, sepakat, kedua | "Apakah rencana ini adil bagi Salsa dan Rani?" |
| Realistis | istirahat, pulang sekolah, besok, minggu, setelah | "Apakah rencana ini bisa dilakukan dalam waktu dekat?" |
| Komunikasi dan tanggung jawab | bicara, dengar, jelaskan, tugas, tanggung jawab, minta maaf | "Bagian mana yang menunjukkan komunikasi dan tanggung jawab?" |
| Tanpa mempermalukan | (ketiadaan kata: sindir, ejek, permalukan, depan teman, marah-marah) | "Coba pikirkan lagi: adakah yang bisa membuat seseorang merasa malu?" |

- Isian **Waktu** kosong atau tanpa kata waktu → "Rencanamu belum menyebut waktu. Kapan kira-kira dilakukan?"
- Tampilkan lima kriteria dengan tanda bintang (terpenuhi) atau lampu kuning (perlu dipikirkan), plus satu kalimat penutup positif.
- Pemain boleh **Perbaiki Rencana** atau **Lanjutkan** meski ada lampu kuning (selama tiga isian terisi).

### 6.3 Level 2 dan Level 3
Tidak ada penilaian. Hanya pesan umpan balik tetap sesuai brief (lihat Level 2) dan validasi umum.

---

## 7. Petunjuk Beo (Sentence Starter)

Tombol opsional di setiap pertanyaan. Contoh (disimpan di `content.js`, boleh disesuaikan):

| Pertanyaan | Contoh awal kalimat |
|---|---|
| L1-Q1 | "Salsa dan Rani bermasalah karena ..." |
| L1-Q2 | "Pemicunya adalah saat ..." |
| L1-Q3 | "Akibatnya, hubungan mereka ... dan proyek berikutnya ..." |
| L2 (pikir) | "Mungkin Salsa/Rani berpikir bahwa ..." |
| L2 (rasa) | "Mungkin ia merasa ... karena ..." |
| L2 (kebutuhan) | "Ia membutuhkan ..." |
| L4 (rencana) | "Saat ... aku merasa ... karena ... aku berharap ..." |

---

## 8. Peta dan Animasi Kapal

- Posisi tiap pulau ditentukan di `content.js` sebagai koordinat persen: `{ port:[x,y], i1:[x,y], i2:[x,y], i3:[x,y], i4:[x,y], bay:[x,y] }`.
- `Ship` berpindah dengan `transition: left/top 1.8s ease-in-out` (atau `transform`).
- Saat level selesai dan pemain menekan LANJUTKAN PELAYARAN: tampilkan `SailTransition` ± 2–3 detik, lalu kembali ke S03 dengan kapal sudah di posisi baru.
- Tombol "Lewati" tersedia pada animasi.
- Hormati `prefers-reduced-motion`: ganti animasi dengan perpindahan langsung.
- Jalur pelayaran antarpulau digambar (SVG path putus-putus) dan bagian yang sudah dilalui diberi warna lebih tegas.

---

## 9. Daftar Aset

Gunakan nama berkas konsisten. Placeholder diganti aset akhir tanpa mengubah kode.

| Berkas | Isi |
|---|---|
| `harbor-home.png` | Latar pelabuhan (S01) |
| `map-sea.png` | Peta lautan (S03) |
| `wood-frame.png` | Bingkai panel |
| `ship.png` | Kapal pemain |
| `captain.png` | Karakter pemandu |
| `island1.png` … `island4.png` | Ikon pulau di peta |
| `story-1.png` … `story-4.png` | Ilustrasi adegan cerita |
| `reward-compass.png`, `reward-heart.png`, `reward-crystal.png`, `reward-chest.png` | Hadiah |

Semua aset gambar disimpan dalam format PNG. Total aset sebaiknya < 15 MB.

---

## 10. Gaya Visual dan UI

- **Gaya:** kartun berkualitas tinggi, bajak laut ramah, tidak menyeramkan, cocok untuk remaja SMP.
- **Palet:** biru laut `#0E7490`, toska `#2DD4BF`, hijau tropis `#22A06B`, kuning emas `#F5B83D`, aksen pastel.
- **Warna pulau:** hijau, oranye, ungu, biru (ditambah angka dan ikon).
- **Tipografi:** judul dekoratif ramah; teks isi sans-serif jelas ≥ 16 px.
- **Tombol:** ≥ 48×48 px, kontras tinggi, label huruf kapital untuk aksi utama.
- **Panel tantangan:** perkamen di atas latar pulau terkait, sehingga tema ekspedisi tetap terlihat.
- **Konsistensi:** KEMBALI dan LANJUTKAN selalu di posisi yang sama.
- **Kotak jawaban:** minimal 4 baris, dapat diperbesar.

---

## 11. Urutan Pengerjaan

Setiap tahap harus lolos uji sebelum lanjut.

| Tahap | Pekerjaan | Hasil yang diuji |
|---|---|---|
| 1 | Kerangka proyek, `Screen`, router, `state`, `save/load` | Berpindah layar; state bertahan setelah muat ulang |
| 2 | S01 Pelabuhan + Modal Cara Bermain | Tombol berfungsi |
| 3 | S03 Peta: pulau, gembok, `Ship`, `ProgressBadge`, Toast | Pulau terkunci menolak masuk; kapal bergerak |
| 4 | S04 Cerita + S05 Misi | Cerita harus selesai sebelum Level 1 |
| 5 | `QuestionStep` + Level 1 + hadiah + transisi | Level 1 selesai membuka Pulau 2, indikator 1/4 |
| 6 | Level 2 (dua misi) + pengingat + umpan balik | Jawaban tidak hilang saat KEMBALI |
| 7 | Titik Balik | Pilihan dan alasan tersimpan |
| 8 | Level 3 (kartu, pertanyaan, Pertimbangan Kapten) | Ketiga kartu harus terisi |
| 9 | Level 4 + Rencana Aksi + umpan balik aturan | Lima kriteria muncul sesuai isi jawaban |
| 10 | S99 Teluk + refleksi + Rangkuman + cetak | Rangkuman berurutan dan lengkap |
| 11 | Animasi pelayaran, suara opsional, polesan visual | Berjalan mulus di tablet |
| 12 | Ganti placeholder dengan aset akhir, uji menyeluruh | Semua kriteria penerimaan lolos |

**Untuk AI coding:** berikan dokumen ini dan minta dikerjakan **satu tahap per permintaan**. Minta kode dijalankan atau dijelaskan cara mengujinya setelah tiap tahap.

---

## 12. Kriteria Penerimaan (Uji Wajib)

| No | Uji | Lolos jika |
|---|---|---|
| 1 | Buka game dari awal | Hanya pelabuhan terlihat; tidak ada kolom jawaban |
| 2 | Klik MULAI lalu Pulau 1 | Cerita tampil bertahap; level tidak terbuka sebelum cerita selesai |
| 3 | Klik Pulau 2 di awal | Pesan gembok muncul; tidak berpindah |
| 4 | Selesaikan Level 1 | Hadiah kompas muncul; indikator 1/4; kapal bergerak ke Pulau 2 |
| 5 | KEMBALI dari pertanyaan 2 ke 1 | Jawaban pertama masih ada |
| 6 | Tutup dan buka lagi browser di tengah game | Progres dan jawaban terpulihkan (atau dimulai bersih tanpa error bila storage tidak tersedia) |
| 7 | Level 2 | Dua misi terpisah; pengingat "dugaan" terlihat |
| 8 | Titik Balik | Tiga kartu; tidak ada label benar/salah |
| 9 | Level 3 | Tiap kartu membuka 4 pertanyaan; lanjut hanya setelah ketiganya terisi |
| 10 | Level 4 dengan rencana tanpa waktu | Petunjuk waktu muncul; pemain tetap bisa memperbaiki |
| 11 | Layar akhir | Rangkuman 4 keterampilan dan 3 refleksi tampil satu per satu |
| 12 | LIHAT RANGKUMAN JAWABAN | Semua jawaban terurut sesuai perjalanan |
| 13 | ULANGI PETUALANGAN | Konfirmasi muncul; setelah ya, semua jawaban kosong dan kembali ke pelabuhan |
| 14 | Pencarian ke seluruh layar | Tidak ada QR code atau permintaan nama/data pribadi |
| 15 | Tablet (sentuh) | Semua tombol berfungsi tanpa hover; teks terbaca |
| 16 | Setiap level | Memiliki layar pembuka, tantangan, umpan balik, hadiah, dan transisi |
| 17 | Seluruh game | Tema bajak laut tetap terlihat di panel pertanyaan |

---

## 13. Batasan dan Catatan Penting

- Isi cerita, nama tokoh, judul, subjudul, dan teks tombol mengikuti brief asli secara persis.
- Umpan balik berbasis aturan hanyalah petunjuk; jangan menampilkannya sebagai nilai.
- Tampilkan catatan singkat di layar awal atau Cara Bermain: "Gunakan nama tokoh dalam ceritamu. Jika ada masalah nyata yang membuatmu tidak nyaman, ceritakan kepada guru BK."
- Jika dibangun sebagai prototipe tanpa semua fitur, tulis jelas fitur mana yang belum berfungsi dan jangan klaim selesai sebelum lolos uji di bagian 12.
