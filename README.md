# Dashboard Peta Kota Langsa

Dashboard statis untuk menampilkan sebaran titik keluarga dan usaha di atas layer peta Kota Langsa. Stack dibuat minimal: HTML, CSS kecil, JavaScript, file JSON/GeoJSON, Bootstrap CSS, dan Leaflet JS.

## File Utama

- `index.html` memuat struktur halaman, Bootstrap CSS, Leaflet CSS/JS, dan `app.js`.
- `styles.css` berisi CSS tambahan untuk tinggi peta, bingkai peta, dan legenda.
- `app.js` memuat `data/points.json`, `data/kota_langsa.geojson`, dan `data/kecamatan_langsa.geojson`, lalu merender marker, popup, statistik, layer control, dan batas wilayah.
- `data/points.json` berisi contoh format data titik keluarga/usaha.
- `data/kota_langsa.geojson` berisi batas luar Kota Langsa.
- `data/kecamatan_langsa.geojson` berisi batas 5 kecamatan di Kota Langsa.

## Format `data/points.json`

Setiap titik minimal memiliki `id`, `type`, `lat`, `lng`, dan `lapangan_usaha`. Nilai `type` yang didukung adalah `keluarga` dan `usaha`.

```json
{
  "id": "KEL-001",
  "type": "keluarga",
  "lat": 4.4752,
  "lng": 97.9684,
  "lapangan_usaha": "Perdagangan eceran"
}
```

## Menjalankan Lokal

File JSON/GeoJSON dimuat dengan `fetch()`, jadi jalankan melalui server statis:

```bash
python3 -m http.server 8000
```

Kemudian buka `http://localhost:8000`.

## Deploy GitHub Pages

1. Pastikan semua file berikut ikut ter-push ke repo:
   - `index.html`
   - `app.js`
   - `styles.css`
   - folder `data/`
   - file `server.js` boleh tetap ada, tapi tidak dipakai di Pages
2. Push repository ke GitHub.
3. Buka repository di GitHub, lalu masuk ke **Settings > Pages**.
4. Pada bagian **Build and deployment**, pilih:
   - **Source**: `Deploy from a branch`
   - **Branch**: branch utama, misalnya `main`
   - **Folder**: `/ (root)`
5. Simpan, lalu tunggu GitHub selesai build dan memberi URL Pages.
6. Buka URL tersebut dan cek apakah peta, data JSON, dan layer GeoJSON tampil normal.

## Catatan Penting

- Project ini bersifat statis, jadi GitHub Pages cocok untuk hostingnya.
- Karena data dimuat lewat `fetch()`, hindari memindahkan file `data/` atau mengganti nama file tanpa ikut mengubah referensinya di `app.js`.
- Kalau nanti kamu menambahkan routing khusus atau framework SPA, mungkin perlu penyesuaian tambahan. Untuk versi sekarang belum perlu.
