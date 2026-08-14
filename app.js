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

const statusContainer = document.querySelector("#load-status");
const statusTextElement = document.querySelector("#load-status-text");
const statusSpinner = document.querySelector("#load-spinner");
const familyCountElement = document.querySelector("#family-count");
const businessCountElement = document.querySelector("#business-count");
const totalPointsElement = document.querySelector("#total-points");
const toggleKotaCheckbox = document.querySelector("#toggle-kota");
const toggleKecamatanCheckbox = document.querySelector("#toggle-kecamatan");
const kecamatanLegendBar = document.querySelector("#kecamatan-legend-bar");
const bizFilterMenu = document.querySelector('#biz-filter-menu');
const bizFilterOptions = document.querySelector('#biz-filter-options');
const bizFilterSearch = document.querySelector('#biz-filter-search');
const bizFilterClearBtn = document.querySelector('#biz-filter-clear');

const map = L.map("map", {
  minZoom: LANGSA_MIN_ZOOM,
  maxBounds: LANGSA_MAX_BOUNDS,
  maxBoundsViscosity: 0.8,
  zoomSnap: 1,
}).setView(LANGSA_CENTER, 12);

// By default, disable interactive map dragging/zoom to allow page scrolling/viewport panning.
if (map.dragging) map.dragging.disable();
if (map.scrollWheelZoom) map.scrollWheelZoom.disable();
if (map.touchZoom) map.touchZoom.disable();

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

// Use marker clustering for better performance with many points
const familyLayer = L.markerClusterGroup ? L.markerClusterGroup({ chunkedLoading: true }) : L.layerGroup();
const businessLayer = L.markerClusterGroup ? L.markerClusterGroup({ chunkedLoading: true }) : L.layerGroup();
familyLayer.addTo(map);
businessLayer.addTo(map);

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

function setStatus(message, isError = false, showSpinner = false) {
  if (statusTextElement) statusTextElement.textContent = message;
  if (statusContainer) {
    statusContainer.classList.toggle("text-danger", isError);
    statusContainer.classList.toggle("text-secondary", !isError);
  }
  if (statusSpinner) {
    statusSpinner.style.display = showSpinner ? "inline-block" : "none";
  }
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

    const marker = L.circleMarker([point.lat, point.lng], {
      ...markerOptions[point.type],
      radius: 8,
      weight: 2,
      opacity: 1,
      fillOpacity: 0.85,
    }).bindPopup(createPopup(point), { className: "custom-popup" });

    // Add to cluster / layer group
    if (layer && layer.addLayer) {
      layer.addLayer(marker);
    } else {
      marker.addTo(map);
    }
  });

  familyCountElement.textContent = counts.keluarga;
  businessCountElement.textContent = counts.usaha;
  totalPointsElement.textContent = validPoints.length;

  return pointBounds;
}

async function loadDashboard() {
  try {
    setStatus("Memuat data peta dan titik...", false, true);
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
          opacity: 1,
          fillColor: palette.fill,
          fillOpacity: 0.2,
          lineJoin: "round",
          lineCap: "round",
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

        // Prevent the SVG path from receiving native browser focus outlines; set tabindex after add
        layer.on('add', () => {
          try {
            if (layer._path && layer._path.setAttribute) {
              layer._path.setAttribute('tabindex', '-1');
              // Prevent default focus behavior
              layer._path.style.outline = 'none';
            }
          } catch (err) {}
        });

        layer.on({
          mouseover: (e) => {
            const target = e.target;
            target.setStyle({
              color: palette.stroke,
              weight: 3.5,
              fillOpacity: 0.45,
              opacity: 1,
            });
            if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) {
              target.bringToFront();
            }
            // Open tooltip and auto-close after 2 seconds
            try {
              layer.openTooltip();
            } catch (err) {}
            if (layer._tooltipTimeout) clearTimeout(layer._tooltipTimeout);
            layer._tooltipTimeout = setTimeout(() => {
              try { layer.closeTooltip(); } catch (err) {}
            }, 2000);
          },
          mouseout: (e) => {
            kecamatanBoundaryLayer.resetStyle(e.target);
            if (e.target && e.target._tooltipTimeout) {
              clearTimeout(e.target._tooltipTimeout);
              e.target._tooltipTimeout = null;
            }
          },
          click: (e) => {
            const target = e.target;
            // Apply same visual as hover to avoid default black stroke being visible
            target.setStyle({
              color: palette.stroke,
              weight: 3.5,
              fillOpacity: 0.45,
              opacity: 1,
            });
            if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) {
              target.bringToFront();
            }
            // Open popup on click instead of tooltip to avoid overlapping tooltip+popup
            try {
              layer.openPopup();
            } catch (err) {}
            // ensure the svg element does not capture focus
            try { if (target._path && target._path.setAttribute) target._path.setAttribute('tabindex', '-1'); } catch (err) {}
          }
        });
      },
    }).addTo(map);

    // Normalize points once for filtering and rendering
    const normalizedPoints = points.map(normalizePoint).filter(Boolean);
    const pointBounds = renderPoints(normalizedPoints);
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
      "Titik Keluarga (Cluster)": familyLayer,
      "Titik Usaha (Cluster)": businessLayer,
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
        btn.setAttribute('aria-label', 'Reset Fokus Kota Langsa');
        btn.setAttribute('tabindex', '0');
        btn.innerHTML = `<i class="bi bi-compass"></i><span>Reset Fokus</span>`;
        btn.onclick = function (e) {
          e.stopPropagation();
          if (combinedBounds && combinedBounds.isValid()) {
            map.fitBounds(combinedBounds, { padding: [30, 30], maxZoom: 14 });
          }
        };

        // Keyboard support: Enter or Space triggers the button
        btn.addEventListener('keydown', function (ev) {
          if (ev.key === 'Enter' || ev.key === ' ') {
            ev.preventDefault();
            btn.click();
          }
        });
        return btn;
      },
    });
    map.addControl(new ResetControl());
    // Auto-close popups after 3 seconds when opened
    map.on('popupopen', (e) => {
      const popup = e.popup;
      if (popup && !popup._autoCloseTimer) {
        popup._autoCloseTimer = setTimeout(() => {
          try { map.closePopup(popup); } catch (err) {}
        }, 3000);
      }
    });
    map.on('popupclose', (e) => {
      const popup = e.popup;
      if (popup && popup._autoCloseTimer) {
        clearTimeout(popup._autoCloseTimer);
        popup._autoCloseTimer = null;
      }
    });

    // Add a custom interaction toggle control (top-left)
    const InteractionControl = L.Control.extend({
      options: { position: 'topleft' },
      onAdd: function () {
        const btn = L.DomUtil.create('button', 'leaflet-control-interaction');
        btn.type = 'button';
        btn.setAttribute('aria-pressed', 'false');
        btn.title = 'Aktifkan interaksi peta (klik untuk toggle)';
        btn.innerHTML = 'Aktifkan Interaksi';

        btn.onclick = function (e) {
          e.stopPropagation();
          const pressed = btn.getAttribute('aria-pressed') === 'true';
          if (pressed) {
            // disable interactions
            if (map.dragging) map.dragging.disable();
            if (map.scrollWheelZoom) map.scrollWheelZoom.disable();
            if (map.touchZoom) map.touchZoom.disable();
            btn.setAttribute('aria-pressed', 'false');
            btn.innerHTML = 'Aktifkan Interaksi';
          } else {
            // enable interactions
            if (map.dragging) map.dragging.enable();
            if (map.scrollWheelZoom) map.scrollWheelZoom.enable();
            if (map.touchZoom) map.touchZoom.enable();
            btn.setAttribute('aria-pressed', 'true');
            btn.innerHTML = 'Nonaktifkan Interaksi';
          }
        };

        // Prevent map dragging when interacting with the control
        L.DomEvent.disableClickPropagation(btn);
        return btn;
      }
    });
    map.addControl(new InteractionControl());

    refreshMapSize();
    setTimeout(refreshMapSize, 200);
    setTimeout(refreshMapSize, 600);

    setStatus(`Berhasil memuat ${pointBounds.length} titik sebaran dan batas wilayah Kota Langsa & 5 Kecamatan.`, false, false);
    // Build compact dropdown multi-select for business fields
    try {
      if (bizFilterOptions) {
        bizFilterOptions.innerHTML = '';
        const fields = Array.from(new Set(normalizedPoints.map(p => p.lapangan_usaha))).sort();
        fields.forEach((f, i) => {
          const id = `biz-filter-${i}`;
          const item = document.createElement('div');
          item.className = 'form-check';
          item.innerHTML = `<input class="form-check-input biz-filter" type="checkbox" id="${id}" data-value="${f}">
            <label class="form-check-label" for="${id}">${f}</label>`;
          bizFilterOptions.appendChild(item);
        });

        // Filter change
        bizFilterOptions.addEventListener('change', () => {
          const checked = Array.from(bizFilterOptions.querySelectorAll('input.biz-filter:checked')).map(i => i.dataset.value || i.value);
          const selected = new Set(checked);
          const filtered = normalizedPoints.filter(p => selected.size === 0 || selected.has(p.lapangan_usaha));
          const bounds = filtered.length ? L.latLngBounds(filtered.map(p => [p.lat, p.lng])) : null;
          renderPoints(filtered);
          if (bounds && bounds.isValid()) {
            map.fitBounds(bounds, { padding: [30, 30], maxZoom: 14 });
          } else if (combinedBounds && combinedBounds.isValid()) {
            map.fitBounds(combinedBounds, { padding: [30, 30], maxZoom: 14 });
          }
        });

        // Search inside dropdown
        if (bizFilterSearch) {
          bizFilterSearch.addEventListener('input', (e) => {
            const q = (e.target.value || '').toLowerCase().trim();
            Array.from(bizFilterOptions.children).forEach(item => {
              const label = item.textContent || '';
              item.style.display = q && !label.toLowerCase().includes(q) ? 'none' : '';
            });
          });
        }

        // Clear button
        if (bizFilterClearBtn) {
          bizFilterClearBtn.addEventListener('click', () => {
            Array.from(bizFilterOptions.querySelectorAll('input.biz-filter')).forEach(i => i.checked = false);
            renderPoints(normalizedPoints);
            if (combinedBounds && combinedBounds.isValid()) map.fitBounds(combinedBounds, { padding: [30, 30], maxZoom: 14 });
          });
        }
      }
    } catch (err) {
      console.warn('Filter UI build failed', err);
    }
  } catch (error) {
    setStatus(`${error.message}. Gagal memuat data peta.`, true, false);
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
