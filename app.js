const DATA_POINTS_URL = "data/points.json";
const DATA_BOUNDARY_URL = "data/langsa.geojson";
const LANGSA_CENTER = [4.476, 97.968];
const LANGSA_LOCK_ZOOM = 13;
const LANGSA_MAX_BOUNDS = L.latLngBounds(
  [4.42, 97.91],
  [4.53, 98.035]
);

const statusElement = document.querySelector("#load-status");
const map = L.map("map", {
  minZoom: LANGSA_LOCK_ZOOM,
  maxBounds: LANGSA_MAX_BOUNDS,
  maxBoundsViscosity: 1,
  zoomSnap: 1,
}).setView(LANGSA_CENTER, LANGSA_LOCK_ZOOM);

const osmLayer = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  noWrap: true,
}).addTo(map);

const familyLayer = L.layerGroup().addTo(map);
const businessLayer = L.layerGroup().addTo(map);

const markerOptions = {
  keluarga: { color: "#198754", fillColor: "#198754" },
  usaha: { color: "#cc7a00", fillColor: "#ffc107" },
};


function lockMapToLangsa(bounds) {
  map.setMaxBounds(bounds);
  map.setMinZoom(LANGSA_LOCK_ZOOM);

  if (map.getZoom() < LANGSA_LOCK_ZOOM) {
    map.setZoom(LANGSA_LOCK_ZOOM);
  }

  if (!bounds.contains(map.getCenter())) {
    map.panInsideBounds(bounds, { animate: false });
  }
}

function setStatus(message, isError = false) {
  statusElement.textContent = message;
  statusElement.classList.toggle("text-danger", isError);
  statusElement.classList.toggle("text-secondary", !isError);
}

async function fetchJson(url) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Gagal memuat ${url}: ${response.status}`);
  }

  return response.json();
}

function normalizeType(type) {
  return String(type || "").trim().toLowerCase();
}

function isValidPoint(point) {
  const type = normalizeType(point.type);
  return ["keluarga", "usaha"].includes(type)
    && Number.isFinite(point.lat)
    && Number.isFinite(point.lng)
    && Boolean(point.id)
    && Boolean(point.lapangan_usaha);
}

function createPopup(point) {
  const type = normalizeType(point.type);

  return `
    <strong>${point.id}</strong><br>
    <strong>Kategori:</strong> ${type}<br>
    <strong>Koordinat:</strong> ${point.lat}, ${point.lng}<br>
    <strong>Lapangan usaha:</strong> ${point.lapangan_usaha ?? "-"}
  `;
}

function renderPoints(points) {
  const validPoints = points.filter(isValidPoint);
  const counts = { keluarga: 0, usaha: 0 };
  const pointBounds = [];

  validPoints.forEach((point) => {
    const type = normalizeType(point.type);
    const layer = type === "keluarga" ? familyLayer : businessLayer;

    counts[type] += 1;
    pointBounds.push([point.lat, point.lng]);

    L.circleMarker([point.lat, point.lng], {
      ...markerOptions[type],
      radius: 8,
      weight: 2,
      opacity: 1,
      fillOpacity: 0.85,
    })
      .bindPopup(createPopup(point))
      .addTo(layer);
  });

  document.querySelector("#family-count").textContent = counts.keluarga;
  document.querySelector("#business-count").textContent = counts.usaha;
  document.querySelector("#total-points").textContent = validPoints.length;

  return pointBounds;
}

async function loadDashboard() {
  try {
    const [boundary, points] = await Promise.all([
      fetchJson(DATA_BOUNDARY_URL),
      fetchJson(DATA_POINTS_URL),
    ]);

    const boundaryLayer = L.geoJSON(boundary, {
      style: {
        color: "#0d6efd",
        fillColor: "#0d6efd",
        fillOpacity: 0.12,
        weight: 2,
      },
      onEachFeature: (feature, layer) => {
        const name = feature.properties?.name ?? "Batas wilayah";
        layer.bindPopup(`<strong>${name}</strong>`);
      },
    }).addTo(map);

    const pointBounds = renderPoints(points);
    const combinedBounds = L.latLngBounds(pointBounds);

    if (boundaryLayer.getBounds().isValid()) {
      combinedBounds.extend(boundaryLayer.getBounds());
    }

    if (combinedBounds.isValid()) {
      map.fitBounds(combinedBounds, { padding: [30, 30], maxZoom: LANGSA_LOCK_ZOOM });
    }

    lockMapToLangsa(LANGSA_MAX_BOUNDS);

    map.on("drag", () => {
      map.panInsideBounds(LANGSA_MAX_BOUNDS, { animate: false });
    });

    map.on("zoomend", () => {
      lockMapToLangsa(LANGSA_MAX_BOUNDS);
    });

    L.control.layers(
      { OpenStreetMap: osmLayer },
      {
        "Batas Kota Langsa": boundaryLayer,
        "Titik Keluarga": familyLayer,
        "Titik Usaha": businessLayer,
      },
      { collapsed: false }
    ).addTo(map);

    setStatus(`Berhasil memuat ${pointBounds.length} titik valid dari ${DATA_POINTS_URL}. Zoom-out dikunci pada level Kota Langsa; gunakan zoom-in untuk melihat detail.`);
    setStatus(`Berhasil memuat ${points.length} baris data dari ${DATA_POINTS_URL}.`);
  } catch (error) {
    setStatus(`${error.message}. Jalankan melalui server statis, bukan langsung dari file HTML.`, true);
  }
}

loadDashboard();
