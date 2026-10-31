import { apiFetch } from "./apiClient.js";

const CITY_ID = 1; // Seeded as "Indore" in backend migration

const els = {
  keywordInput: document.getElementById("keywordInput"),
  keywordSearchBtn: document.getElementById("keywordSearchBtn"),
  areaSelect: document.getElementById("areaSelect"),
  genderSelect: document.getElementById("genderSelect"),
  minPrice: document.getElementById("minPrice"),
  maxPrice: document.getElementById("maxPrice"),
  minPriceValue: document.getElementById("minPriceValue"),
  maxPriceValue: document.getElementById("maxPriceValue"),
  priceSliderFill: document.getElementById("priceSliderFill"),
  availableOnly: document.getElementById("availableOnly"),
  facilityChips: document.getElementById("facilityChips"),
  searchBtn: document.getElementById("searchBtn"),
  hostelList: document.getElementById("hostelList"),
};

let facilities = [];
let selectedFacilityIds = new Set();
const MIN_PRICE_GAP = 1000;
const DEFAULT_HOSTEL_PLACEHOLDER = "../img/hostels/room1.png";

function formatCurrency(value) {
  return `Rs ${Number(value).toLocaleString("en-IN")}`;
}

function syncPriceRange(source) {
  if (!els.minPrice || !els.maxPrice) return;

  let minValue = Number(els.minPrice.value);
  let maxValue = Number(els.maxPrice.value);

  if (maxValue - minValue < MIN_PRICE_GAP) {
    if (source === "min") {
      minValue = maxValue - MIN_PRICE_GAP;
      els.minPrice.value = String(minValue);
    } else {
      maxValue = minValue + MIN_PRICE_GAP;
      els.maxPrice.value = String(maxValue);
    }
  }

  if (els.minPriceValue) els.minPriceValue.textContent = formatCurrency(minValue);
  if (els.maxPriceValue) els.maxPriceValue.textContent = formatCurrency(maxValue);

  if (els.priceSliderFill) {
    const min = Number(els.minPrice.min);
    const max = Number(els.maxPrice.max);
    const left = ((minValue - min) / (max - min)) * 100;
    const right = ((maxValue - min) / (max - min)) * 100;
    els.priceSliderFill.style.left = `${left}%`;
    els.priceSliderFill.style.width = `${right - left}%`;
  }
}

function renderFacilities() {
  els.facilityChips.innerHTML = "";
  facilities.forEach((f) => {
    const label = document.createElement("label");
    label.className = "chip";
    label.innerHTML = `<input type="checkbox" data-id="${f.id}"> ${f.name}`;
    label.querySelector("input").addEventListener("change", (e) => {
      const id = Number(e.target.getAttribute("data-id"));
      if (e.target.checked) selectedFacilityIds.add(id);
      else selectedFacilityIds.delete(id);
    });
    els.facilityChips.appendChild(label);
  });
}

function renderHostels(items) {
  if (!items || items.length === 0) {
    els.hostelList.innerHTML = `<div class="notice"><strong>No results</strong> Try changing filters.</div>`;
    return;
  }

  els.hostelList.innerHTML = "";
  items.forEach((h) => {
    const card = document.createElement("a");
    card.className = "hostel-card";
    card.href = `./hostel-details.html?id=${h.id}`;
    const images = Array.isArray(h.imageUrls) && h.imageUrls.length > 0
      ? h.imageUrls
      : [h.coverImageUrl || h.imageUrl || `../img/hostels/room${(h.id % 2) + 1}.png` || DEFAULT_HOSTEL_PLACEHOLDER];
    card.innerHTML = `
      <div class="hostel-thumb">
        ${createCarouselMarkup(images, `card-${h.id}`, escapeHtml(h.hostelName))}
      </div>
      <div class="hostel-meta">
        <div class="row" style="display:flex; justify-content:space-between; align-items:center;">
          <div style="font-weight:700; font-size:16px;">${escapeHtml(h.hostelName)}</div>
          <span class="badge badge-primary" style="background:#5c2d91; color:white; padding:2px 8px; border-radius:4px;">₹${Number(h.pricePerMonth).toFixed(0)}</span>
        </div>
        <div class="row muted" style="font-size:14px; margin:5px 0;">
          <span>${escapeHtml(h.areaName)}, ${escapeHtml(h.cityName)}</span>
          <span class="badge badge-ok" style="color:green;">${h.availableRooms} Left</span>
        </div>
        <div class="row" style="display:flex; gap:5px; margin-top:8px; flex-wrap:wrap;">
          <span class="badge">${escapeHtml(h.genderType)}</span>
          <span class="badge">${h.messAvailable ? "Mess" : "No"}</span>
          ${h.facilities ? h.facilities.map(f => `<span class="facility-tag">${escapeHtml(f)}</span>`).join('') : ''}
        </div>
      </div>
    `;
    els.hostelList.appendChild(card);
  });
  initCarousels(els.hostelList);
}

function escapeHtml(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function buildQuery() {
  const params = new URLSearchParams();
  params.set("cityId", String(CITY_ID));

  const keyword = els.keywordInput?.value?.trim();
  if (keyword) params.set("keyword", keyword);
  if (els.areaSelect.value) params.set("areaId", els.areaSelect.value);
  if (els.genderSelect.value) params.set("genderType", els.genderSelect.value);
  if (els.minPrice.value) params.set("minPrice", els.minPrice.value);
  if (els.maxPrice.value) params.set("maxPrice", els.maxPrice.value);
  if (els.availableOnly.checked) params.set("availableOnly", "true");
  if (selectedFacilityIds.size > 0) params.set("facilityIds", Array.from(selectedFacilityIds).join(","));

  params.set("page", "0");
  params.set("size", "10");
  return params.toString();
}

async function loadFilters() {
  try {
    const [areas, facs] = await Promise.all([
      apiFetch(`/public/areas?cityId=${CITY_ID}`),
      apiFetch(`/public/facilities`),
    ]);

    areas.forEach((a) => {
      const opt = document.createElement("option");
      opt.value = a.id;
      opt.textContent = a.name;
      els.areaSelect.appendChild(opt);
    });

    facilities = facs;
    renderFacilities();
  } catch (err) {
    console.error("Failed to load filters:", err);
    // Show error but don't block the page
    els.facilityChips.innerHTML = `<span style="color:red">Error loading filters: ${escapeHtml(err.message)}</span>`;
  }
}

async function search() {
  els.searchBtn.disabled = true;
  if (els.keywordSearchBtn) els.keywordSearchBtn.disabled = true;
  els.searchBtn.textContent = "Loading...";
  if (els.keywordSearchBtn) els.keywordSearchBtn.textContent = "Searching...";
  els.hostelList.innerHTML = `<div class="notice">Loading hostels...</div>`;
  
  try {
    const q = buildQuery();
    const result = await apiFetch(`/public/hostels?${q}`);
    
    if (!result || !result.items) {
      renderHostels([]);
      return;
    }
    
    renderHostels(result.items);
  } catch (e) {
    console.error("Search error:", e);
    els.hostelList.innerHTML = `
      <div class="notice" style="color: #e74c3c;">
        <strong>⚠️ Cannot Connect to Backend</strong><br>
        <small style="color: #95a5a6;">
          Error: ${escapeHtml(e.message)}<br><br>
          💡 Try refreshing the page (F5) or wait a moment for the backend to fully start.<br>
          ☝️ Make sure both terminal windows are still open.
        </small>
      </div>
    `;
  } finally {
    els.searchBtn.disabled = false;
    if (els.keywordSearchBtn) els.keywordSearchBtn.disabled = false;
    els.searchBtn.textContent = "Search";
    if (els.keywordSearchBtn) els.keywordSearchBtn.textContent = "Search";
  }
}

function createCarouselMarkup(images, carouselId, altBase) {
  const slides = images.map((image, index) => `
    <div class="carousel-slide">
      <img class="carousel-image" src="${image}" alt="${altBase} photo ${index + 1}" loading="lazy">
    </div>
  `).join("");

  const controls = images.length > 1 ? `
    <button type="button" class="carousel-arrow carousel-arrow-prev" data-carousel-prev aria-label="Previous image">&#8249;</button>
    <button type="button" class="carousel-arrow carousel-arrow-next" data-carousel-next aria-label="Next image">&#8250;</button>
    <div class="carousel-dots">
      ${images.map((_, index) => `
        <button type="button" class="carousel-dot ${index === 0 ? "is-active" : ""}" data-carousel-dot="${index}" aria-label="Show image ${index + 1}"></button>
      `).join("")}
    </div>
  ` : "";

  return `
    <div class="carousel-shell" data-carousel-root="${carouselId}" data-carousel-count="${images.length}" data-carousel-index="0">
      <div class="carousel-track">${slides}</div>
      ${controls}
    </div>
  `;
}

function initCarousels(scope) {
  scope.querySelectorAll("[data-carousel-root]").forEach((root) => {
    if (root.dataset.bound === "true") return;
    root.dataset.bound = "true";

    const track = root.querySelector(".carousel-track");
    const dots = Array.from(root.querySelectorAll("[data-carousel-dot]"));
    const total = Number(root.dataset.carouselCount || "1");
    let touchStartX = 0;

    const update = (index) => {
      const normalized = ((index % total) + total) % total;
      root.dataset.carouselIndex = String(normalized);
      if (track) track.style.transform = `translateX(-${normalized * 100}%)`;
      dots.forEach((dot, dotIndex) => {
        dot.classList.toggle("is-active", dotIndex === normalized);
      });
    };

    root.querySelector("[data-carousel-prev]")?.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      update(Number(root.dataset.carouselIndex || "0") - 1);
    });

    root.querySelector("[data-carousel-next]")?.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      update(Number(root.dataset.carouselIndex || "0") + 1);
    });

    dots.forEach((dot) => {
      dot.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        update(Number(dot.dataset.carouselDot || "0"));
      });
    });

    root.addEventListener("touchstart", (event) => {
      touchStartX = event.changedTouches[0]?.clientX || 0;
    }, { passive: true });

    root.addEventListener("touchend", (event) => {
      const touchEndX = event.changedTouches[0]?.clientX || 0;
      const delta = touchEndX - touchStartX;
      if (Math.abs(delta) < 30) return;
      update(Number(root.dataset.carouselIndex || "0") + (delta < 0 ? 1 : -1));
    }, { passive: true });
  });
}

els.searchBtn.addEventListener("click", search);
if (els.keywordSearchBtn) els.keywordSearchBtn.addEventListener("click", search);
if (els.keywordInput) {
  els.keywordInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      search();
    }
  });
}

if (els.minPrice) {
  els.minPrice.addEventListener("input", () => syncPriceRange("min"));
}

if (els.maxPrice) {
  els.maxPrice.addEventListener("input", () => syncPriceRange("max"));
}

function updateHeader() {
  const token = localStorage.getItem("accessToken");
  const role = localStorage.getItem("userRole");
  const nav = document.querySelector(".nav");
  if (token && role && nav) {
    let dashboardUrl = "./login.html";
    if (role === "ADMIN") dashboardUrl = "./admin-dashboard.html";
    else if (role === "OWNER") dashboardUrl = "./owner-dashboard.html";
    else if (role === "STUDENT") dashboardUrl = "./student-dashboard.html";
    
    nav.innerHTML = `
      <a class="btn" href="${dashboardUrl}">Go to Dashboard</a>
      <button class="btn" onclick="localStorage.clear(); location.reload();">Logout</button>
    `;
  }
}

// Initialize page with better error handling
updateHeader();
syncPriceRange("max");

// Show loading message while fetching
els.hostelList.innerHTML = `<div class="notice">Starting up... Loading hostels...</div>`;

(async () => {
  try {
    await loadFilters();
    await search();
  } catch (err) {
    console.error("Initialization error:", err);
  }
})();

