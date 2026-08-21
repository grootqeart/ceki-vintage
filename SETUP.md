# Menjalankan di komputer baru

## 1. Yang perlu terpasang

- **Node 18** (`package.json` mengunci `18.x`). Cek dengan `node -v`.
  Versi jauh lebih baru belum tentu cocok: `react-scripts` di sini memakai
  webpack 4 yang bermasalah dengan OpenSSL 3.
- **Git**

## 2. Ambil kodenya

```bash
git clone https://github.com/grootqeart/ceki-vintage.git
cd ceki-vintage
npm install
```

`npm install` yang pertama memakan waktu **beberapa menit** (sekitar 8 pada
mesin uji, ~400 paket) karena sekalian memasang dependency client. Prosesnya
lama tanpa menampilkan apa-apa; itu normal, bukan menggantung.

## 3. Siapkan konfigurasi

Dua file berisi konfigurasi lokal, dan **keduanya sengaja tidak ikut ke git**,
jadi di komputer baru file itu belum ada. Salin dari contohnya:

```bash
cp server/config/local.env.example server/config/local.env
cp client/.env.local.example client/.env.local
```

Yang **wajib** diisi hanya satu: `JWT_SECRET` di `server/config/local.env`.
Tanpa itu daftar dan login langsung gagal dengan
`secretOrPrivateKey must have a value`. Buat nilainya dengan:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

`MONGO_URI` boleh dikosongkan. Kalau kosong, server memakai database sementara
di memori — cukup untuk mencoba, tapi **semua akun hilang setiap server
dimatikan**. Isi dengan connection string MongoDB Atlas kalau mau datanya
bertahan.

`client/.env.local` seluruhnya opsional; aplikasi jalan tanpa satu pun nilainya
terisi.

## 4. Jalankan

Ada dua cara.

**Mode pengembangan** — dua proses, halaman langsung menyegarkan diri saat kode
diubah:

```bash
npm run dev
```

Buka http://localhost:3000

**Mode produksi lokal** — satu proses, persis seperti yang jalan di server:

```bash
npm run build
npm start
```

Buka http://localhost:5000

`npm run build` membangun client **dan** menyalinnya ke `server/public`, satu-
satunya folder yang disajikan Express. Melewatkan penyalinan itu tidak
memunculkan error apa pun — aplikasi tetap menyala, hanya menyajikan bundle
lama.

## 5. Main dari HP atau bareng teman

Server lokal hanya bisa dibuka dari komputer itu sendiri. Untuk membukanya ke
internet:

```bash
npm start        # terminal 1
npm run tunnel   # terminal 2
```

Perintah kedua mencetak alamat `*.trycloudflare.com` dan menyimpannya di
`.tunnel-url`. Alamat itu **berubah setiap tunnel dinyalakan ulang** — itu
sifat quick tunnel tanpa akun dan tidak bisa dikunci. Butuh `cloudflared`
terpasang.

Untuk alamat tetap, lihat [DEPLOY.md](DEPLOY.md).

## Kalau bermasalah

| Gejala | Sebabnya |
|---|---|
| `secretOrPrivateKey must have a value` | `JWT_SECRET` kosong |
| Akun hilang setiap restart | `MONGO_URI` kosong, jadi memakai database sementara |
| Perubahan tidak muncul di `npm start` | Belum `npm run build` |
| Tombol Google tidak muncul | Wajar tanpa client id; login email/password tetap jalan |
| Build gagal soal OpenSSL | Versi Node bukan 18 |

---

Langkah-langkah di atas dijalankan apa adanya pada clone bersih tanpa satu pun
file env, dengan `MONGO_URI` sengaja dikosongkan: install, build, server
menyala, lalu daftar dan login akun benar-benar berhasil.
