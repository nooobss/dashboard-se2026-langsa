# Dashboard Peta Kota Langsa

Dashboard statis untuk menampilkan sebaran titik keluarga dan usaha di atas layer peta Kota Langsa. Stack dibuat minimal: HTML, CSS kecil, JavaScript, file JSON/GeoJSON, Bootstrap CSS, dan Leaflet JS.

## File Utama

- `index.html` memuat struktur halaman, Bootstrap CSS, Leaflet CSS/JS, dan `app.js`.
- `styles.css` berisi CSS tambahan untuk tinggi peta, bingkai peta, dan legenda.
- `app.js` memuat `data/points.json` dan `data/langsa.geojson`, lalu merender marker, popup, statistik, layer control, dan batas wilayah.
- `data/points.json` berisi contoh format data titik keluarga/usaha.
- `data/langsa.geojson` berisi contoh layer batas indikatif Kota Langsa.

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

1. Push repository ke GitHub.
2. Buka **Settings > Pages**.
3. Pilih branch dan folder root repository.
4. Simpan konfigurasi, lalu buka URL GitHub Pages yang diberikan.
