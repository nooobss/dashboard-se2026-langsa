# Dashboard Peta Kota Langsa

Dashboard statis untuk menampilkan sebaran titik usaha di atas layer peta Kota Langsa. Stack dibuat minimal: HTML, CSS kecil, JavaScript, file JSON/GeoJSON, Bootstrap CSS, dan Leaflet JS.

## Fitur Utama

- **Peta Interaktif**: Menampilkan sebaran titik usaha di Kota Langsa dengan marker clustering
- **Filter Kategori**: Filter dinamis dengan opsi "Pilih Semua" untuk memilih/membatalkan semua kategori sekaligus
- **Layer Control**: Toggle batas kota dan batas kecamatan
- **Statistik**: Menampilkan total titik sebaran
- **Search Filter**: Pencarian kategori real-time di dalam dropdown filter
- **Mode Gelap**: Opsi untuk beralih antara mode terang (OpenStreetMap) dan mode gelap (Dark Matter)

## File Utama

- `index.html` memuat struktur halaman, Bootstrap CSS, Leaflet CSS/JS, dan `app.js`.
- `styles.css` berisi CSS tambahan untuk tinggi peta, bingkai peta, dan legenda.
- `app.js` memuat `data/points.json`, `data/kota_langsa.geojson`, dan `data/kecamatan_langsa.geojson`, lalu merender marker, popup, statistik, layer control, filter kategori, dan batas wilayah.
- `data/points.json` berisi contoh format data titik usaha.
- `data/kota_langsa.geojson` berisi batas luar Kota Langsa.
- `data/kecamatan_langsa.geojson` berisi batas 5 kecamatan di Kota Langsa.

## Format `data/points.json` dan `data/points.geojson`

Setiap titik memiliki field: `assignment_id` (ID unik), `latitude` (koordinat lintang), `longitude` (koordinat bujur), dan `kategori` (kategori usaha: A, C, G, H, R, S, dst).

Contoh untuk `points.json`:
```json
{
  "assignment_id": "082dd6d8-f6c3-4658-a165-34a5115642e2",
  "latitude": 4.4731141,
  "longitude": 97.9624672,
  "kategori": "H"
}
```

Format `points.geojson` menggunakan struktur GeoJSON standard dengan properties yang sama dan geometry type `Point`.

## Filter Kategori

- Dropdown **Filter Kategori** di toolbar header menampilkan semua kategori/lapangan usaha yang tersedia
- Checkbox individual untuk memilih kategori spesifik
- Opsi **"Pilih Semua"** untuk mencentang/membatalkan semua kategori sekaligus
- Input **pencarian** untuk menemukan kategori dengan cepat
- **Peta akan kosong** saat tidak ada kategori yang dipilih
- Tombol **"Bersihkan"** untuk menghapus semua filter
- Peta secara otomatis **fit bounds** ke area titik yang dipilih

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
- Filter kategori hanya aktif jika ada titik data dengan kategori yang berbeda-beda di `data/points.json`
- Kalau nanti kamu menambahkan routing khusus atau framework SPA, mungkin perlu penyesuaian tambahan. Untuk versi sekarang belum perlu.
