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

## Analisis Spasial & Titik Usaha di Luar Batas Wilayah

Berdasarkan analisis spasial (*point-in-polygon & distance calculation*) antara layer batas administratif (`data/kota_langsa.geojson` & `data/kecamatan_langsa.geojson`) dengan titik usaha (`data/points.json`):

| Kategori | Jumlah Titik | Persentase |
| :--- | :---: | :---: |
| **Titik di Dalam Batas Kota Langsa** | **2.540 Titik** | **94,88%** |
| **Titik di Luar Batas Kota Langsa (*Outliers*)** | **137 Titik** | **5,12%** |
| **Total Keseluruhan** | **2.677 Titik** | **100%** |

### Distribusi Jarak & Lokasi Titik di Luar Batas (137 Titik)
* **< 100 meter dari batas**: **54 titik** (sebagian besar hanya 2–15 meter di luar poligon).
* **100 – 500 meter**: **15 titik**.
* **500 m – 1 km**: **23 titik**.
* **1 – 3 km**: **42 titik** (terkonsentrasi di koridor perbatasan barat).
* **> 3 km**: **3 titik**.

Secara geografis, titik luar batas terkonsentrasi di:
1. **Perbatasan Sisi Barat (~56 titik)**: Berbatasan dengan **Kecamatan Birem Bayeun & Rantau Selamat, Kab. Aceh Timur**.
2. **Perbatasan Sisi Selatan/Tenggara (~4 titik)**: Berbatasan dengan **Kecamatan Manyak Payed, Kab. Aceh Tamiang**.
3. **Pesisir Pantai/Tambak (~3 titik)**: Area tambak muara pesisir timur/utara.
4. **Buffer Tepi Batas (~74 titik)**: Menempel di sepanjang garis batas luar administratif.

### Faktor Penyebab Titik Berada di Luar Batas
1. **Dominasi Sektor Pertanian & Tambak (Kategori A — 65,7%)**:
   Sebanyak 90 dari 137 titik di luar batas merupakan usaha pertanian, kebun, atau tambak perikanan. Pemilik/pengelola usaha terdata sebagai warga berdomisili di Kota Langsa, namun lokasi petak lahan/tambak fisiknya berada di wilayah pinggiran perbatasan kabupaten tetangga (Kab. Aceh Timur / Kab. Aceh Tamiang).
2. **Akurasi Perangkat GPS / Geotagging Lapangan**:
   Sebanyak 54 titik berada dalam radius < 100 meter dari garis batas. Hal ini wajar terjadi akibat deviasi akurasi alami perangkat GPS ponsel surveyor lapangan (margin of error 5–25 meter), terutama di area perumahan padat tepi batas atau perkebunan berkanopi lebat.
3. **Aglomerasi Koridor Jalan Lintas Perbatasan**:
   Kawasan permukiman dan perdagangan di Kecamatan Langsa Barat/Baro dan Kecamatan Birem Bayeun (Aceh Timur) telah menyatu secara fisik (*urban sprawl*) di sepanjang koridor Jalan Lintas Sumatera.
4. **Generalisasi Poligon Batas GIS**:
   Layer batas `kota_langsa.geojson` merupakan poligon makro digital yang memiliki toleransi generalisasi garis kartografi tertentu jika dibandingkan dengan patok definitif di lapangan.

## Catatan Penting

- Project ini bersifat statis, jadi GitHub Pages cocok untuk hostingnya.
- Karena data dimuat lewat `fetch()`, hindari memindahkan file `data/` atau mengganti nama file tanpa ikut mengubah referensinya di `app.js`.
- Filter kategori hanya aktif jika ada titik data dengan kategori yang berbeda-beda di `data/points.json`

## Roadmap
- ~~Kalau nanti kamu menambahkan routing khusus atau framework SPA, mungkin perlu penyesuaian tambahan. Untuk versi sekarang belum perlu.~~
- ~~Menambahkan layer batas desa/gampong menggunakan `data/batas_desa_langa.geojson` sebagai layer opsional pada dashboard.~~

