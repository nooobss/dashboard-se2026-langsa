const DATA_POINTS_URL = "data/points.json";
const DATA_BOUNDARY_URL = "data/langsa.geojson";
const LANGSA_CENTER = [4.476, 97.968];
const LANGSA_MIN_ZOOM = 13;
const LANGSA_MAX_BOUNDS = L.latLngBounds(
  [4.42, 97.91],
  [4.53, 98.035]
);
const SUPPORTED_TYPES = new Set(["keluarga", "usaha"]);

const statusElement = document.querySelector("#load-status");
const familyCountElement = document.querySelector("#family-count");
const businessCountElement = document.querySelector("#business-count");
const totalPointsElement = document.querySelector("#total-points");

const map = L.map("map", {
  minZoom: LANGSA_MIN_ZOOM,
  maxBounds: LANGSA_MAX_BOUNDS,
  maxBoundsViscosity: 1,
  zoomSnap: 1,
}).setView(LANGSA_CENTER, LANGSA_MIN_ZOOM);

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
  map.setMinZoom(LANGSA_MIN_ZOOM);

  if (map.getZoom() < LANGSA_MIN_ZOOM) {
    map.setZoom(LANGSA_MIN_ZOOM);
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

function toFiniteNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function normalizePoint(point) {
  const type = normalizeType(point.type);
  const lat = toFiniteNumber(point.lat);
  const lng = toFiniteNumber(point.lng);
  const id = String(point.id || "").trim();
  const lapanganUsaha = String(point.lapangan_usaha || "").trim();

  if (!SUPPORTED_TYPES.has(type) || lat === null || lng === null || !id || !lapanganUsaha) {
    return null;
  }

  return {
    ...point,
    id,
    type,
    lat,
    lng,
    lapangan_usaha: lapanganUsaha,
  };
}

function createPopup(point) {
  const container = document.createElement("div");
  const title = document.createElement("strong");
  const details = [
    ["Kategori", point.type],
    ["Koordinat", `${point.lat}, ${point.lng}`],
    ["Lapangan usaha", point.lapangan_usaha],
  ];

  title.textContent = point.id;
  container.append(title);

  details.forEach(([label, value]) => {
    const labelElement = document.createElement("strong");
    labelElement.textContent = `${label}:`;
    container.append(document.createElement("br"), labelElement, ` ${value || "-"}`);
  });

  return container;
}

function renderPoints(points) {
  familyLayer.clearLayers();
  businessLayer.clearLayers();

  const validPoints = points.map(normalizePoint).filter(Boolean);
  const counts = { keluarga: 0, usaha: 0 };
  const pointBounds = [];

  validPoints.forEach((point) => {
    const layer = point.type === "keluarga" ? familyLayer : businessLayer;

    counts[point.type] += 1;
    pointBounds.push([point.lat, point.lng]);

    L.circleMarker([point.lat, point.lng], {
      ...markerOptions[point.type],
      radius: 8,
      weight: 2,
      opacity: 1,
      fillOpacity: 0.85,
    })
      .bindPopup(createPopup(point))
      .addTo(layer);
  });

  familyCountElement.textContent = counts.keluarga;
  businessCountElement.textContent = counts.usaha;
  totalPointsElement.textContent = validPoints.length;

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
        layer.bindPopup(document.createTextNode(name));
      },
    }).addTo(map);

    const pointBounds = renderPoints(points);
    const combinedBounds = L.latLngBounds(pointBounds);

    if (boundaryLayer.getBounds().isValid()) {
      combinedBounds.extend(boundaryLayer.getBounds());
    }

    if (combinedBounds.isValid()) {
      map.fitBounds(combinedBounds, { padding: [30, 30], maxZoom: LANGSA_MIN_ZOOM });
    }

    lockMapToLangsa(LANGSA_MAX_BOUNDS);

    map.on("drag", () => {
      map.panInsideBounds(LANGSA_MAX_BOUNDS, { animate: false });
    });

    map.on("zoomend", () => lockMapToLangsa(LANGSA_MAX_BOUNDS));

    L.control.layers(
      { OpenStreetMap: osmLayer },
      {
        "Batas Kota Langsa": boundaryLayer,
        "Titik Keluarga": familyLayer,
        "Titik Usaha": businessLayer,
      },
      { collapsed: false }
    ).addTo(map);

    setStatus(`Berhasil memuat ${pointBounds.length} titik valid dari ${points.length} baris data. Zoom-out dikunci pada level minimum Kota Langsa; zoom-in tetap bebas untuk melihat detail.`);
  } catch (error) {
    setStatus(`${error.message}. Jalankan melalui server statis, bukan langsung dari file HTML.`, true);
  }
}

loadDashboard();
