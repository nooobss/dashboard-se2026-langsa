# Dashboard Peta Kota Langsa

Dashboard static untuk menampilkan sebaran titik keluarga dan usaha di atas layer peta Kota Langsa. Stack dibuat minimal: HTML, CSS kecil, JavaScript, file JSON/GeoJSON, Bootstrap CSS, dan Leaflet JS.

## File Utama

- `index.html` memuat struktur halaman, Bootstrap CSS, Leaflet CSS/JS, dan `app.js`.
- `styles.css` hanya berisi CSS tambahan kecil untuk tinggi peta dan legenda.
- `app.js` memuat `data/points.json` dan `data/langsa.geojson`, lalu merender marker, popup, statistik, layer control, dan batas wilayah.
- `data/points.json` berisi contoh format data titik keluarga/usaha.
- `data/langsa.geojson` berisi contoh layer batas indikatif Kota Langsa.

## Format `data/points.json`

Setiap titik minimal memiliki `type`, `lat`, dan `lng`. Nilai `type` yang didukung adalah `keluarga` dan `usaha`.

```json
{
  "id": "K-001",
  "type": "keluarga",
  "name": "Nama Keluarga",
  "district": "Langsa Kota",
  "lat": 4.4752,
  "lng": 97.9684,
  "members": 5
}
```

## Menjalankan Lokal

File JSON/GeoJSON dimuat dengan `fetch()`, jadi jalankan melalui server statis:

```bash
python3 -m http.server 8000
```

Kemudian buka `http://localhost:8000`.

## Deploy GitHub Pages

1. Push repository ke GitHub.
2. Buka **Settings > Pages**.
3. Pilih branch dan folder root repository.
4. Simpan konfigurasi, lalu buka URL GitHub Pages yang diberikan.
