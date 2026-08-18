const DATA_POINTS_URLS = ["data/points.geojson", "data/points.json"];
const DATA_KOTA_BOUNDARY_URL = "data/kota_langsa.geojson";
const DATA_KECAMATAN_BOUNDARY_URL = "data/kecamatan_langsa.geojson";

const LANGSA_CENTER = [4.476, 97.968];
const LANGSA_MIN_ZOOM = 11;
const LANGSA_MAX_BOUNDS = L.latLngBounds(
  [4.35, 97.80],
  [4.60, 98.15]
);
const SUPPORTED_TYPES = new Set(["keluarga", "usaha", "a", "c", "g", "h", "r", "s"]);

const CATEGORY_LABELS = {
  A: "Kategori A - Pertanian, Kehutanan, dan Perikanan",
  B: "Kategori B - Pertambangan dan Penggalian",
  C: "Kategori C - Industri",
  D: "Kategori D - Penyediaan Listrik, Gas, Uap/Air Panas dan Udara Dingin",
  E: "Kategori E - Pengadaan Air, Pengelolaan Air Limbah, Pengelolaan Limbah, dan Remediasi",
  F: "Kategori F - Konstruksi",
  G: "Kategori G - Perdagangan Besar dan Eceran",
  H: "Kategori H - Transportasi dan Penyimpanan",
  I: "Kategori I - Aktivitas Penyediaan Akomodasi dan Makan Minum",
  J: "Kategori J - Aktivitas Penerbitan, Penyiaran, serta Produksi dan Distribusi Konten",
  K: "Kategori K - Aktivitas Telekomunikasi, Pemrograman Komputer, Konsultansi, Infrastuktur Komputasi, dan Jasa Informasi Lainnya",
  L: "Kategori L - Aktivitas Keuangan dan Asuransi",
  M: "Kategori M - Aktivitas Real Estate",
  N: "Kategori N - Aktivitas Profesional, Ilmiah, dan Teknis",
  O: "Kategori O - Aktivitas Administratif dan Penunjang Usaha",
  P: "Kategori P - Administrasi Pemerintahan, Pertahanan, dan Asuransi Sosial Wajib",
  Q: "Kategori Q - Pendidikan",
  R: "Kategori R - Aktivitas Kesehatan Manusia dan Aktivitas Sosial",
  S: "Kategori S - Kesenian, Olahraga, dan Rekreasi",
  T: "Kategori T - Aktivitas Jasa Lainnya",
  U: "Kategori U - Aktivitas Rumah Tangga sebagai Pemberi Kerja; Pembuatan Barang dan Jasa Undifferentiated",
  V: "Kategori V - Aktivitas Badan Internasional dan Badan Ekstra Internasional Lainnya",
  KELUARGA: "Keluarga",
  USAHA: "Usaha",
};

const CATEGORY_COLORS = {
  A: { color: "#16a34a", fillColor: "#22c55e" },
  C: { color: "#2563eb", fillColor: "#60a5fa" },
  G: { color: "#7c3aed", fillColor: "#a78bfa" },
  H: { color: "#f59e0b", fillColor: "#fbbf24" },
  R: { color: "#ef4444", fillColor: "#f87171" },
  S: { color: "#0f766e", fillColor: "#2dd4bf" },
  KELUARGA: { color: "#198754", fillColor: "#198754" },
  USAHA: { color: "#cc7a00", fillColor: "#ffc107" },
};

const KECAMATAN_COLORS = {
  "Langsa Barat": { stroke: "#0284c7", fill: "#38bdf8" },
  "Langsa Baro": { stroke: "#0d9488", fill: "#5eead4" },
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
const categoryLayer = L.markerClusterGroup ? L.markerClusterGroup({ chunkedLoading: true }) : L.layerGroup();
familyLayer.addTo(map);
businessLayer.addTo(map);
categoryLayer.addTo(map);

let kotaBoundaryLayer = null;
let kecamatanBoundaryLayer = null;

const markerOptions = {
  keluarga: { color: "#198754", fillColor: "#198754" },
  usaha: { color: "#cc7a00", fillColor: "#ffc107" },
  A: { color: "#16a34a", fillColor: "#22c55e" },
  C: { color: "#2563eb", fillColor: "#60a5fa" },
  G: { color: "#7c3aed", fillColor: "#a78bfa" },
  H: { color: "#f59e0b", fillColor: "#fbbf24" },
  R: { color: "#ef4444", fillColor: "#f87171" },
  S: { color: "#0f766e", fillColor: "#2dd4bf" },
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

async function fetchPointsData() {
  let lastError = null;
  for (const url of DATA_POINTS_URLS) {
    try {
      return await fetchJson(url);
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError || new Error("Gagal memuat data titik peta.");
}

function normalizeType(type) {
  return String(type || "").trim().toLowerCase();
}

function toFiniteNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function getCategoryKey(point) {
  const rawCategory = String(point.kategori ?? point.category ?? point.type ?? "").trim().toUpperCase();
  return rawCategory || "";
}

function isUsahaPoint(point) {
  const rawType = normalizeType(point?.type ?? point?.kategori ?? point?.category ?? "");
  const category = String(point?.kategori ?? point?.category ?? "").trim().toUpperCase();
  const type = rawType || category;

  if (type === "keluarga") return false;
  if (type === "usaha" || type === "business") return true;
  return true;
}

function normalizePoint(point, index = 0) {
  const raw = point && point.properties ? point.properties : point;
  const geometry = point && point.geometry ? point.geometry : null;
  const legacyType = normalizeType(raw.type);
  const categoryKey = getCategoryKey(raw);
  const latValue = raw.lat ?? raw.latitude ?? (geometry && geometry.type === "Point" ? geometry.coordinates[1] : null);
  const lngValue = raw.lng ?? raw.longitude ?? (geometry && geometry.type === "Point" ? geometry.coordinates[0] : null);
  const lat = toFiniteNumber(latValue);
  const lng = toFiniteNumber(lngValue);
  const id = String(raw.assignment_id ?? raw.id ?? `${categoryKey || legacyType || "POINT"}-${index + 1}`).trim();
  const lapanganUsaha = String(raw.lapangan_usaha ?? raw.nama_usaha ?? raw.kategori ?? raw.category ?? raw.type ?? "").trim();
  const normalizedCategory = categoryKey && SUPPORTED_TYPES.has(categoryKey.toLowerCase()) ? categoryKey.toUpperCase() : categoryKey.toUpperCase();

  if ((legacyType === "keluarga" || legacyType === "usaha") && lat !== null && lng !== null && id && lapanganUsaha) {
    return {
      ...raw,
      id,
      type: legacyType,
      lat,
      lng,
      lapangan_usaha: lapanganUsaha,
      kategori: raw.kategori || legacyType.toUpperCase(),
      categoryLabel: CATEGORY_LABELS[legacyType.toUpperCase()] || "Kategori",
    };
  }

  if (!normalizedCategory || lat === null || lng === null || !id) {
    return null;
  }

  return {
    ...raw,
    id,
    type: normalizedCategory.toLowerCase(),
    lat,
    lng,
    lapangan_usaha: lapanganUsaha || CATEGORY_LABELS[normalizedCategory] || `Kategori ${normalizedCategory}`,
    kategori: normalizedCategory,
    categoryLabel: CATEGORY_LABELS[normalizedCategory] || `Kategori ${normalizedCategory}`,
  };
}

function escapeHtml(value) {
  const div = document.createElement("div");
  div.textContent = String(value ?? "");
  return div.innerHTML;
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
  const badgeKey = String(point.kategori || point.type || "").toUpperCase();
  const badgeLabel = point.categoryLabel || CATEGORY_LABELS[badgeKey] || "Kategori";
  const badgeStyle = CATEGORY_COLORS[badgeKey] || CATEGORY_COLORS[point.type] || { color: "#0d6efd", fillColor: "#0d6efd" };
  badge.className = "badge rounded-pill";
  badge.style.backgroundColor = badgeStyle.fillColor || badgeStyle.color || "#0d6efd";
  badge.style.color = "#fff";
  badge.textContent = badgeLabel;
  header.appendChild(badge);

  container.appendChild(header);

  const content = document.createElement("div");
  content.className = "small mt-2";
  content.innerHTML = `
    <div class="mb-1"><strong>Kategori:</strong> ${badgeLabel}</div>
    <div class="mb-1"><strong>Label:</strong> ${point.lapangan_usaha || "-"}</div>
    <div class="text-secondary"><i class="bi bi-geo-alt-fill me-1 text-danger"></i>${point.lat}, ${point.lng}</div>
  `;
  container.appendChild(content);

  return container;
}

function getRenderLayer(point) {
  if (point.type === "keluarga") return familyLayer;
  if (point.type === "usaha") return businessLayer;
  return categoryLayer;
}

function normalizePointList(rawPoints) {
  if (!rawPoints) return [];

  if (Array.isArray(rawPoints)) {
    return rawPoints.map((point, index) => normalizePoint(point, index)).filter(Boolean);
  }

  if (rawPoints.type === "FeatureCollection" && Array.isArray(rawPoints.features)) {
    return rawPoints.features
      .map((feature, index) => normalizePoint(feature, index))
      .filter(Boolean);
  }

  return [];
}

function renderPoints(points, districtFeatures = []) {
  familyLayer.clearLayers();
  businessLayer.clearLayers();
  categoryLayer.clearLayers();

  const validPoints = normalizePointList(points).filter(isUsahaPoint);
  const counts = { usaha: 0 };
  const pointBounds = [];

  validPoints.forEach((point) => {
    const layer = businessLayer;
    counts.usaha += 1;
    pointBounds.push([point.lat, point.lng]);

    const categoryValue = String(point.kategori || point.type || "").toUpperCase();
    const markerOptionsForPoint = markerOptions[categoryValue] || markerOptions[point.type] || { color: "#cc7a00", fillColor: "#ffc107" };
    const marker = L.circleMarker([point.lat, point.lng], {
      ...markerOptionsForPoint,
      radius: 8,
      weight: 2,
      opacity: 1,
      fillOpacity: 0.85,
    }).bindPopup(createPopup(point), { className: "custom-popup" });

    if (layer && layer.addLayer) {
      layer.addLayer(marker);
    } else {
      marker.addTo(map);
    }
  });

  if (totalPointsElement) {
    totalPointsElement.textContent = validPoints.length;
  }

  [familyCountElement, businessCountElement, totalPointsElement].forEach((el) => {
    if (el && el.classList.contains("is-loading")) el.classList.remove("is-loading");
  });

  return pointBounds;
}

async function loadDashboard() {
  try {
    setStatus("Memuat data peta dan titik...", false, true);
    const [kotaGeojson, kecamatanGeojson, points] = await Promise.all([
      fetchJson(DATA_KOTA_BOUNDARY_URL),
      fetchJson(DATA_KECAMATAN_BOUNDARY_URL),
      fetchPointsData(),
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
        const palette = KECAMATAN_COLORS[districtName] || { stroke: "#2563eb", fill: "#2563eb" };
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
        const palette = KECAMATAN_COLORS[distName] || { stroke: "#2563eb" };

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
    const normalizedPoints = normalizePointList(points);
    const pointBounds = renderPoints(normalizedPoints, kecamatanGeojson?.features || []);
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

    const overlayLayers = {};

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
    // Auto-close popups after 6 seconds when opened (memberi waktu baca yang cukup)
    map.on('popupopen', (e) => {
      const popup = e.popup;
      if (popup && !popup._autoCloseTimer) {
        popup._autoCloseTimer = setTimeout(() => {
          try { map.closePopup(popup); } catch (err) {}
        }, 6000);
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
        
        // Extract unique categories that actually exist in the data
        const availableCategories = Array.from(
          new Set(normalizedPoints.map(p => p.kategori).filter(Boolean))
        ).sort();
        
        // Create "Select All" checkbox
        const selectAllId = 'biz-filter-select-all';
        const selectAllDiv = document.createElement('div');
        selectAllDiv.className = 'form-check mb-2 pb-2 border-bottom';
        selectAllDiv.style.borderColor = '#dee2e6';
        const selectAllInput = document.createElement('input');
        selectAllInput.className = 'form-check-input';
        selectAllInput.type = 'checkbox';
        selectAllInput.id = selectAllId;
        selectAllInput.dataset.selectAll = 'true';
        const selectAllLabel = document.createElement('label');
        selectAllLabel.className = 'form-check-label fw-semibold';
        selectAllLabel.htmlFor = selectAllId;
        selectAllLabel.textContent = 'Pilih Semua';
        selectAllDiv.appendChild(selectAllInput);
        selectAllDiv.appendChild(selectAllLabel);
        bizFilterOptions.appendChild(selectAllDiv);
        
        // Create checkbox for each available category
        availableCategories.forEach((category, i) => {
          const id = `biz-filter-${i}`;
          const item = document.createElement('div');
          item.className = 'form-check';
          const input = document.createElement('input');
          input.className = 'form-check-input biz-filter';
          input.type = 'checkbox';
          input.id = id;
          input.dataset.value = category;
          
          // Get label from CATEGORY_LABELS or use default format
          const displayLabel = CATEGORY_LABELS[category] || `Kategori ${category}`;
          
          const label = document.createElement('label');
          label.className = 'form-check-label';
          label.htmlFor = id;
          label.textContent = displayLabel;
          label.title = displayLabel; // Add tooltip for long labels
          
          item.appendChild(input);
          item.appendChild(label);
          bizFilterOptions.appendChild(item);
        });

        // Handle "Select All" checkbox
        selectAllInput.addEventListener('change', (e) => {
          const isChecked = e.target.checked;
          Array.from(bizFilterOptions.querySelectorAll('input.biz-filter')).forEach(checkbox => {
            checkbox.checked = isChecked;
          });
          // Trigger filter update
          bizFilterOptions.dispatchEvent(new Event('change', { bubbles: true }));
        });

        // Filter change
        bizFilterOptions.addEventListener('change', () => {
          const allCheckboxes = Array.from(bizFilterOptions.querySelectorAll('input.biz-filter'));
          const checkedCheckboxes = allCheckboxes.filter(cb => cb.checked);
          
          // Update "Select All" checkbox state
          selectAllInput.checked = allCheckboxes.length > 0 && allCheckboxes.length === checkedCheckboxes.length;
          selectAllInput.indeterminate = checkedCheckboxes.length > 0 && checkedCheckboxes.length < allCheckboxes.length;
          
          // Get selected categories
          const selectedCategories = new Set(checkedCheckboxes.map(cb => cb.dataset.value));
          
          // Filter points by selected categories
          const filtered = normalizedPoints.filter(p => selectedCategories.size > 0 && selectedCategories.has(p.kategori));
          const bounds = filtered.length ? L.latLngBounds(filtered.map(p => [p.lat, p.lng])) : null;
          renderPoints(filtered, kecamatanGeojson?.features || []);
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
            selectAllInput.checked = false;
            selectAllInput.indeterminate = false;
            renderPoints(normalizedPoints, kecamatanGeojson?.features || []);
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
