# Deploy Ceki Online

## Cara build

```bash
npm run build
```

Satu perintah ini menjalankan tiga hal: install dependency client, build React-nya,
lalu **menyalin hasilnya ke `server/public`**.

Langkah penyalinan itu wajib dan gampang terlupa. Express hanya menyajikan
`server/public` (lihat `server/server.js`). Kalau kamu cuma menjalankan
`react-scripts build`, bundle baru berhenti di `client/build` sementara server
tetap menyajikan bundle lama — aplikasi tetap jalan normal, tidak ada error, jadi
deploy basi itu tidak kelihatan dan terasa seperti "perubahanku tidak ngefek".

## Environment variables

| Variable | Wajib | Keterangan |
|---|---|---|
| `MONGO_URI` | **Ya** | Connection string MongoDB Atlas |
| `JWT_SECRET` | **Ya** | String acak panjang, penanda tangan token login |
| `NODE_ENV` | Ya | Isi `production` |
| `PORT` | Tidak | Diisi otomatis oleh hosting; default 5000 |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PW` | Tidak | Hanya untuk email lupa password |

`REACT_APP_SERVER_URI` tidak perlu diisi — server menyajikan client dari origin
yang sama, jadi socket otomatis menyambung ke dirinya sendiri.

### Soal `MONGO_URI`

Kalau kosong, `server/config/db.js` **diam-diam** memakai database in-memory.
Aplikasi boot normal, login jalan, tidak ada peringatan apa pun — tapi semua akun
hilang setiap kali server restart. Pastikan variabel ini terisi.

## Batasan arsitektur

Room dan state permainan disimpan di memori (`server/pokergame/RoomManager.js`),
bukan database. Konsekuensinya:

- **Harus tepat satu instance.** Jangan aktifkan replica atau autoscaling —
  pemain akan tersebar ke instance berbeda dan tidak saling melihat.
- **Restart atau redeploy memutus game yang sedang berjalan.** Deploy sebaiknya
  saat tidak ada yang main.
- Di free tier yang tidur saat idle (mis. Render), tidur juga menghapus semua room.

## Langkah di Render

1. Push repo ini ke GitHub.
2. Di Render: **New → Blueprint**, arahkan ke repo — `render.yaml` akan terbaca.
   (Atau **New → Web Service** manual: build command `npm install && npm run build`,
   start command `npm start`.)
3. Isi `MONGO_URI` dengan connection string dari MongoDB Atlas.
   `JWT_SECRET` dibuat otomatis oleh Render.
4. Deploy.

## MongoDB Atlas (gratis)

1. Buat cluster **M0** (gratis permanen), region **Singapore**.
2. Database Access: buat user + password.
3. Network Access: izinkan `0.0.0.0/0` — IP Render tidak tetap, jadi tidak bisa
   di-whitelist satu per satu.
4. Salin connection string-nya ke `MONGO_URI`, ganti `<password>` dengan password
   user tadi.

## Catatan versi Node

`package.json` mengunci Node 18 (`engines`). `react-scripts` 3.x memakai webpack 4
yang butuh flag `--openssl-legacy-provider` di Node 17+ — flag itu sudah dipasang
otomatis oleh `scripts/build.js`, tapi versi Node yang jauh lebih baru belum tentu
kompatibel.
