const DATA_POINTS_URL = "data/points.json";
const DATA_KOTA_BOUNDARY_URL = "data/kota_langsa.geojson";
const DATA_KECAMATAN_BOUNDARY_URL = "data/kecamatan_langsa.geojson";

const LANGSA_CENTER = [4.476, 97.968];
const LANGSA_MIN_ZOOM = 11;
const LANGSA_MAX_BOUNDS = L.latLngBounds(
  [4.35, 97.80],
  [4.60, 98.15]
);
const SUPPORTED_TYPES = new Set(["keluarga", "usaha"]);

const KECAMATAN_COLORS = {
  "Langsa Barat": { stroke: "#0284c7", fill: "#38bdf8" },
  "Langsa Baro": { stroke: "#7c3aed", fill: "#a78bfa" },
  "Langsa Kota": { stroke: "#db2777", fill: "#f472b6" },
  "Langsa Lama": { stroke: "#059669", fill: "#34d399" },
  "Langsa Timur": { stroke: "#d97706", fill: "#fbbf24" }
};

const statusElement = document.querySelector("#load-status");
const familyCountElement = document.querySelector("#family-count");
const businessCountElement = document.querySelector("#business-count");
const totalPointsElement = document.querySelector("#total-points");
const toggleKotaCheckbox = document.querySelector("#toggle-kota");
const toggleKecamatanCheckbox = document.querySelector("#toggle-kecamatan");
const kecamatanLegendBar = document.querySelector("#kecamatan-legend-bar");

const map = L.map("map", {
  minZoom: LANGSA_MIN_ZOOM,
  maxBounds: LANGSA_MAX_BOUNDS,
  maxBoundsViscosity: 0.8,
  zoomSnap: 1,
}).setView(LANGSA_CENTER, 12);

// Standard OpenStreetMap Layer
const osmLayer = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  noWrap: true,
}).addTo(map);

// Dark Mode Layer (CartoDB Dark Matter)
const darkLayer = L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
  maxZoom: 19,
  attribution: '&copy; <a href="https://carto.com/">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  noWrap: true,
});

const familyLayer = L.layerGroup().addTo(map);
const businessLayer = L.layerGroup().addTo(map);

let kotaBoundaryLayer = null;
let kecamatanBoundaryLayer = null;

const markerOptions = {
  keluarga: { color: "#198754", fillColor: "#198754" },
  usaha: { color: "#cc7a00", fillColor: "#ffc107" },
};

let combinedBounds = null;
let activeFilter = "all";

function refreshMapSize() {
  if (map) {
    map.invalidateSize();
  }
}

const mapContainer = document.getElementById("map");
if (mapContainer && typeof ResizeObserver !== "undefined") {
  const observer = new ResizeObserver(() => {
    refreshMapSize();
  });
  observer.observe(mapContainer);
}

window.addEventListener("resize", refreshMapSize);

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
  container.className = "popup-body";

  const header = document.createElement("div");
  header.className = "popup-header d-flex justify-content-between align-items-center gap-2";

  const title = document.createElement("span");
  title.textContent = point.id;
  header.appendChild(title);

  const badge = document.createElement("span");
  if (point.type === "keluarga") {
    badge.className = "badge bg-success";
    badge.textContent = "Keluarga";
  } else {
    badge.className = "badge bg-warning text-dark";
    badge.textContent = "Usaha";
  }
  header.appendChild(badge);

  container.appendChild(header);

  const content = document.createElement("div");
  content.className = "small mt-2";
  content.innerHTML = `
    <div class="mb-1"><strong>Lapangan Usaha:</strong> ${point.lapangan_usaha || "-"}</div>
    <div class="text-secondary"><i class="bi bi-geo-alt-fill me-1 text-danger"></i>${point.lat}, ${point.lng}</div>
  `;
  container.appendChild(content);

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
      .bindPopup(createPopup(point), { className: "custom-popup" })
      .addTo(layer);
  });

  familyCountElement.textContent = counts.keluarga;
  businessCountElement.textContent = counts.usaha;
  totalPointsElement.textContent = validPoints.length;

  return pointBounds;
}

async function loadDashboard() {
  try {
    const [kotaGeojson, kecamatanGeojson, points] = await Promise.all([
      fetchJson(DATA_KOTA_BOUNDARY_URL),
      fetchJson(DATA_KECAMATAN_BOUNDARY_URL),
      fetchJson(DATA_POINTS_URL),
    ]);

    // 1. Batas Kota Langsa Layer (Red Crimson Dash Border)
    kotaBoundaryLayer = L.geoJSON(kotaGeojson, {
      style: {
        color: "#dc3545",
        weight: 3.5,
        dashArray: "7, 5",
        fillColor: "#dc3545",
        fillOpacity: 0.03,
        opacity: 0.95,
      },
      onEachFeature: (feature, layer) => {
        layer.bindPopup(`
          <div class="p-1">
            <h6 class="mb-1 fw-bold text-danger"><i class="bi bi-building me-1"></i>Kota Langsa</h6>
            <p class="mb-0 small text-secondary">Batas Luar Wilayah Administratif Kota Langsa, Aceh.</p>
          </div>
        `, { className: "custom-popup" });
      },
    }).addTo(map);

    // 2. Batas Kecamatan Layer (Multi-color District Polygons)
    kecamatanBoundaryLayer = L.geoJSON(kecamatanGeojson, {
      style: (feature) => {
        const districtName = feature.properties?.district || "Lainnya";
        const palette = KECAMATAN_COLORS[districtName] || { stroke: "#0d6efd", fill: "#0d6efd" };
        return {
          color: palette.stroke,
          weight: 2,
          fillColor: palette.fill,
          fillOpacity: 0.2,
          opacity: 0.9,
        };
      },
      onEachFeature: (feature, layer) => {
        const distName = feature.properties?.district || "Kecamatan";
        const palette = KECAMATAN_COLORS[distName] || { stroke: "#0d6efd" };

        layer.bindTooltip(`Kecamatan ${distName}`, {
          className: "kecamatan-tooltip",
          direction: "center",
          permanent: false,
          sticky: true,
        });

        layer.bindPopup(`
          <div class="p-1">
            <h6 class="mb-1 fw-bold" style="color: ${palette.stroke};">
              <i class="bi bi-geo-alt-fill me-1"></i>Kecamatan ${distName}
            </h6>
            <div class="small text-secondary mb-1">Kab/Kota: <strong>Kota Langsa</strong></div>
            <div class="small text-secondary">Provinsi: <strong>Aceh</strong></div>
          </div>
        `, { className: "custom-popup" });

        layer.on({
          mouseover: (e) => {
            const target = e.target;
            target.setStyle({
              weight: 3.5,
              fillOpacity: 0.45,
            });
            if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) {
              target.bringToFront();
            }
          },
          mouseout: (e) => {
            kecamatanBoundaryLayer.resetStyle(e.target);
          },
        });
      },
    }).addTo(map);

    const pointBounds = renderPoints(points);
    combinedBounds = L.latLngBounds(pointBounds);

    if (kotaBoundaryLayer.getBounds().isValid()) {
      combinedBounds.extend(kotaBoundaryLayer.getBounds());
    }

    if (combinedBounds.isValid()) {
      map.fitBounds(combinedBounds, { padding: [30, 30], maxZoom: 14 });
    }

    // Base layers & Overlay selection
    const baseLayers = {
      "Terang (OpenStreetMap)": osmLayer,
      "Mode Gelap (Dark Matter)": darkLayer,
    };

    const overlayLayers = {
      "<span style='color: #dc3545; font-weight: 600;'>Batas Kota Langsa</span>": kotaBoundaryLayer,
      "<span style='color: #0284c7; font-weight: 600;'>Batas Kecamatan</span>": kecamatanBoundaryLayer,
      "Titik Keluarga": familyLayer,
      "Titik Usaha": businessLayer,
    };

    L.control.layers(baseLayers, overlayLayers, { collapsed: false }).addTo(map);

    // Setup Boundary Toggles Synchronization
    setupBoundaryToggles();

    // Custom Reset Focus Control
    const ResetControl = L.Control.extend({
      options: { position: "topleft" },
      onAdd: function () {
        const btn = L.DomUtil.create("button", "leaflet-control-reset");
        btn.type = "button";
        btn.title = "Kembalikan tampilan fokus Kota Langsa";
        btn.innerHTML = `<i class="bi bi-compass"></i><span>Reset Fokus</span>`;
        btn.onclick = function (e) {
          e.stopPropagation();
          if (combinedBounds && combinedBounds.isValid()) {
            map.fitBounds(combinedBounds, { padding: [30, 30], maxZoom: 14 });
          }
        };
        return btn;
      },
    });
    map.addControl(new ResetControl());

    refreshMapSize();
    setTimeout(refreshMapSize, 200);
    setTimeout(refreshMapSize, 600);

    setStatus(`Berhasil memuat ${pointBounds.length} titik sebaran dan batas wilayah Kota Langsa & 5 Kecamatan.`);
  } catch (error) {
    setStatus(`${error.message}. Gagal memuat data peta.`, true);
  }
}

function setupBoundaryToggles() {
  if (toggleKotaCheckbox) {
    toggleKotaCheckbox.addEventListener("change", (e) => {
      if (e.target.checked) {
        if (kotaBoundaryLayer && !map.hasLayer(kotaBoundaryLayer)) {
          map.addLayer(kotaBoundaryLayer);
        }
      } else {
        if (kotaBoundaryLayer && map.hasLayer(kotaBoundaryLayer)) {
          map.removeLayer(kotaBoundaryLayer);
        }
      }
    });
  }

  if (toggleKecamatanCheckbox) {
    toggleKecamatanCheckbox.addEventListener("change", (e) => {
      if (e.target.checked) {
        if (kecamatanBoundaryLayer && !map.hasLayer(kecamatanBoundaryLayer)) {
          map.addLayer(kecamatanBoundaryLayer);
        }
        if (kecamatanLegendBar) {
          kecamatanLegendBar.style.display = "flex";
        }
      } else {
        if (kecamatanBoundaryLayer && map.hasLayer(kecamatanBoundaryLayer)) {
          map.removeLayer(kecamatanBoundaryLayer);
        }
        if (kecamatanLegendBar) {
          kecamatanLegendBar.style.display = "none";
        }
      }
    });
  }

  // Bidirectional sync with Leaflet Layer Control
  map.on("overlayadd", (e) => {
    if (e.layer === kotaBoundaryLayer && toggleKotaCheckbox) {
      toggleKotaCheckbox.checked = true;
    }
    if (e.layer === kecamatanBoundaryLayer) {
      if (toggleKecamatanCheckbox) toggleKecamatanCheckbox.checked = true;
      if (kecamatanLegendBar) kecamatanLegendBar.style.display = "flex";
    }
  });

  map.on("overlayremove", (e) => {
    if (e.layer === kotaBoundaryLayer && toggleKotaCheckbox) {
      toggleKotaCheckbox.checked = false;
    }
    if (e.layer === kecamatanBoundaryLayer) {
      if (toggleKecamatanCheckbox) toggleKecamatanCheckbox.checked = false;
      if (kecamatanLegendBar) kecamatanLegendBar.style.display = "none";
    }
  });
}

loadDashboard();
