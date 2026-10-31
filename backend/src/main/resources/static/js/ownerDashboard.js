import { apiFetch, getToken, API_BASE } from "./apiClient.js";

const els = {
  hostelList: document.getElementById("hostelList"),
  inquiryList: document.getElementById("inquiryList"),
  addHostelBtn: document.getElementById("addHostelBtn"),
  hostelModal: document.getElementById("hostelModal"),
  closeModal: document.getElementById("closeModal"),
  hostelForm: document.getElementById("hostelForm"),
  citySelect: document.getElementById("citySelect"),
  areaSelect: document.getElementById("areaSelect"),
  tabHostels: document.getElementById("tabHostels"),
  tabInquiries: document.getElementById("tabInquiries"),
  sectionHostels: document.getElementById("sectionHostels"),
  sectionInquiries: document.getElementById("sectionInquiries"),
  logoutBtn: document.getElementById("logoutBtn"),
  imageDropZone: document.getElementById("imageDropZone"),
  imageFiles: document.getElementById("imageFiles"),
  pendingImagePreview: document.getElementById("pendingImagePreview"),
  existingImageManager: document.getElementById("existingImageManager"),
  imageUploadProgress: document.getElementById("imageUploadProgress"),
  imageUploadProgressBar: document.getElementById("imageUploadProgressBar"),
  imageValidationMsg: document.getElementById("imageValidationMsg"),
  roomTypeList: document.getElementById("roomTypeList"),
  addRoomTypeBtn: document.getElementById("addRoomTypeBtn"),
};

let editingHostelId = null;
let pendingImageFiles = [];
let existingImages = [];
let roomTypeDrafts = [];

const IMAGE_MAX_COUNT = 8;
const IMAGE_MAX_SIZE = 5 * 1024 * 1024;
const IMAGE_ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const DEFAULT_ROOM_TYPE_OPTIONS = ["1 Bed Room", "2 Bed Room", "3 Bed Room", "4 Bed Room"];

async function init() {
  loadMyHostels();
  loadCities();
  await loadFacilities();
  bindImageUploader();

  els.tabHostels.onclick = () => showSection("hostels");
  els.tabInquiries.onclick = () => showSection("inquiries");

  els.addHostelBtn.onclick = () => {
    editingHostelId = null;
    resetHostelForm();
    document.getElementById("modalTitle").textContent = "Add New Hostel";
    els.hostelModal.style.display = "flex";
  };

  els.closeModal.onclick = () => {
    els.hostelModal.style.display = "none";
  };

  els.citySelect.onchange = (e) => {
    loadAreas(e.target.value);
  };

  els.addRoomTypeBtn.onclick = () => {
    addRoomTypeDraft();
  };

  els.hostelForm.onsubmit = async (e) => {
    e.preventDefault();
    await saveHostel();
  };

  els.logoutBtn.onclick = () => {
    localStorage.clear();
    window.location.href = "./index.html";
  };

  resetRoomTypes();
}

function bindImageUploader() {
  if (!els.imageDropZone || !els.imageFiles) return;

  els.imageDropZone.addEventListener("click", () => els.imageFiles.click());
  els.imageDropZone.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      els.imageFiles.click();
    }
  });

  ["dragenter", "dragover"].forEach((name) => {
    els.imageDropZone.addEventListener(name, (event) => {
      event.preventDefault();
      els.imageDropZone.classList.add("is-dragover");
    });
  });

  ["dragleave", "drop"].forEach((name) => {
    els.imageDropZone.addEventListener(name, (event) => {
      event.preventDefault();
      els.imageDropZone.classList.remove("is-dragover");
    });
  });

  els.imageDropZone.addEventListener("drop", (event) => {
    queueFiles(Array.from(event.dataTransfer?.files || []));
  });

  els.imageFiles.addEventListener("change", (event) => {
    queueFiles(Array.from(event.target.files || []));
    event.target.value = "";
  });
}

function resetHostelForm() {
  els.hostelForm.reset();
  resetImageState();
  resetRoomTypes();
  clearFacilitySelections();
  if (els.citySelect.options.length > 0) {
    els.citySelect.value = "";
  }
  els.areaSelect.innerHTML = "";
}

function resetImageState() {
  pendingImageFiles.forEach((item) => URL.revokeObjectURL(item.previewUrl));
  pendingImageFiles = [];
  existingImages = [];
  setUploadProgress(0, false);
  setImageValidation("");
  renderPendingImages();
  renderExistingImages();
}

function resetRoomTypes(roomTypes = [createRoomTypeDraft(0)]) {
  roomTypeDrafts = roomTypes.map((roomType, index) => ({
    roomType: roomType.roomType || DEFAULT_ROOM_TYPE_OPTIONS[Math.min(index, DEFAULT_ROOM_TYPE_OPTIONS.length - 1)],
    pricePerMonth: roomType.pricePerMonth ?? "",
    totalRooms: roomType.totalRooms ?? 1,
    availableRooms: roomType.availableRooms ?? 0,
  }));
  renderRoomTypes();
}

function createRoomTypeDraft(index) {
  return {
    roomType: DEFAULT_ROOM_TYPE_OPTIONS[Math.min(index, DEFAULT_ROOM_TYPE_OPTIONS.length - 1)],
    pricePerMonth: "",
    totalRooms: 1,
    availableRooms: 0,
  };
}

function addRoomTypeDraft() {
  roomTypeDrafts.push(createRoomTypeDraft(roomTypeDrafts.length));
  renderRoomTypes();
}

function renderRoomTypes() {
  if (!els.roomTypeList) return;

  els.roomTypeList.innerHTML = roomTypeDrafts.map((roomType, index) => {
    const selectOptions = DEFAULT_ROOM_TYPE_OPTIONS
      .map((option) => `<option value="${escapeHtml(option)}" ${option === roomType.roomType ? "selected" : ""}>${escapeHtml(option)}</option>`)
      .join("");

    return `
      <div class="card" style="padding:16px; border:1px solid var(--border); background:rgba(255,255,255,0.03);">
        <div style="display:flex; justify-content:space-between; align-items:center; gap:12px; margin-bottom:14px;">
          <strong>Room Type ${index + 1}</strong>
          <button
            type="button"
            class="btn"
            onclick="removeRoomType(${index})"
            ${roomTypeDrafts.length === 1 ? "disabled" : ""}
            style="color:#dc3545; border-color:#dc3545;"
          >
            Remove
          </button>
        </div>
        <div style="display:grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap:12px;">
          <div class="field">
            <label class="label">Room Type</label>
            <select class="select" onchange="updateRoomTypeField(${index}, 'roomType', this.value)">
              ${selectOptions}
            </select>
          </div>
          <div class="field">
            <label class="label">Price Per Month (₹)</label>
            <input
              type="number"
              min="1"
              class="input"
              value="${escapeHtml(roomType.pricePerMonth)}"
              placeholder="7000"
              oninput="updateRoomTypeField(${index}, 'pricePerMonth', this.value)"
            >
          </div>
          <div class="field">
            <label class="label">Total Rooms</label>
            <input
              type="number"
              min="1"
              class="input"
              value="${escapeHtml(roomType.totalRooms)}"
              oninput="updateRoomTypeField(${index}, 'totalRooms', this.value)"
            >
          </div>
          <div class="field">
            <label class="label">Available Rooms</label>
            <input
              type="number"
              min="0"
              class="input"
              value="${escapeHtml(roomType.availableRooms)}"
              oninput="updateRoomTypeField(${index}, 'availableRooms', this.value)"
            >
          </div>
        </div>
      </div>
    `;
  }).join("");
}

window.updateRoomTypeField = (index, field, value) => {
  if (!roomTypeDrafts[index]) return;
  roomTypeDrafts[index][field] = value;
};

window.removeRoomType = (index) => {
  if (roomTypeDrafts.length === 1) return;
  roomTypeDrafts.splice(index, 1);
  renderRoomTypes();
};

function clearFacilitySelections() {
  document.querySelectorAll(".fac-check").forEach((checkbox) => {
    checkbox.checked = false;
  });
}

function setImageValidation(message, isError = false) {
  if (!els.imageValidationMsg) return;
  els.imageValidationMsg.textContent = message;
  els.imageValidationMsg.style.color = isError ? "#dc3545" : "";
}

function setUploadProgress(percent, visible = true) {
  if (!els.imageUploadProgress || !els.imageUploadProgressBar) return;
  els.imageUploadProgress.style.display = visible ? "block" : "none";
  els.imageUploadProgressBar.style.width = `${Math.max(0, Math.min(percent, 100))}%`;
}

function queueFiles(files) {
  if (!files.length) return;

  const totalCount = existingImages.length + pendingImageFiles.length + files.length;
  if (totalCount > IMAGE_MAX_COUNT) {
    setImageValidation(`You can upload a maximum of ${IMAGE_MAX_COUNT} images.`, true);
    return;
  }

  for (const file of files) {
    if (!IMAGE_ALLOWED_TYPES.includes(file.type)) {
      setImageValidation("Unsupported image format. Use JPG, JPEG, PNG, or WEBP.", true);
      return;
    }
    if (file.size > IMAGE_MAX_SIZE) {
      setImageValidation("Each image must be 5 MB or smaller.", true);
      return;
    }
  }

  setImageValidation(`${totalCount}/${IMAGE_MAX_COUNT} images selected`);

  files.forEach((file) => {
    pendingImageFiles.push({
      file,
      previewUrl: URL.createObjectURL(file),
    });
  });
  renderPendingImages();
}

function renderPendingImages() {
  if (!els.pendingImagePreview) return;
  if (!pendingImageFiles.length) {
    els.pendingImagePreview.innerHTML = "";
    return;
  }

  els.pendingImagePreview.innerHTML = pendingImageFiles.map((item, index) => `
    <div class="image-manager-item">
      ${existingImages.length === 0 && index === 0 ? `<span class="image-cover-badge">Cover</span>` : ""}
      <img class="image-manager-thumb" src="${item.previewUrl}" alt="Selected image preview ${index + 1}">
      <div class="image-manager-meta">
        <div class="image-manager-title">${escapeHtml(item.file.name)}</div>
        <div class="image-manager-actions">
          <button type="button" class="btn" onclick="movePendingImage(${index}, -1)">Up</button>
          <button type="button" class="btn" onclick="movePendingImage(${index}, 1)">Down</button>
          <button type="button" class="btn" onclick="removePendingImage(${index})">Remove</button>
        </div>
      </div>
    </div>
  `).join("");
}

function renderExistingImages() {
  if (!els.existingImageManager) return;
  if (!existingImages.length) {
    els.existingImageManager.innerHTML = `
      <div class="image-placeholder-card">
        No saved hostel photos yet. The first uploaded photo will become the cover image.
      </div>
    `;
    return;
  }

  els.existingImageManager.innerHTML = existingImages.map((image, index) => `
    <div class="image-manager-item">
      ${index === 0 ? `<span class="image-cover-badge">Cover</span>` : ""}
      <img class="image-manager-thumb" src="${image.imageUrl}" alt="Hostel image ${index + 1}">
      <div class="image-manager-meta">
        <div class="image-manager-title">Saved image ${index + 1}</div>
        <div class="image-manager-actions">
          <button type="button" class="btn" onclick="moveExistingImage(${index}, -1)">Up</button>
          <button type="button" class="btn" onclick="moveExistingImage(${index}, 1)">Down</button>
          <button type="button" class="btn" onclick="deleteExistingImage(${image.id})">Delete</button>
        </div>
      </div>
    </div>
  `).join("");
}

window.removePendingImage = (index) => {
  const [removed] = pendingImageFiles.splice(index, 1);
  if (removed) URL.revokeObjectURL(removed.previewUrl);
  setImageValidation(`${existingImages.length + pendingImageFiles.length}/${IMAGE_MAX_COUNT} images selected`);
  renderPendingImages();
};

window.movePendingImage = (index, delta) => {
  const target = index + delta;
  if (target < 0 || target >= pendingImageFiles.length) return;
  [pendingImageFiles[index], pendingImageFiles[target]] = [pendingImageFiles[target], pendingImageFiles[index]];
  renderPendingImages();
};

window.moveExistingImage = async (index, delta) => {
  const target = index + delta;
  if (target < 0 || target >= existingImages.length) return;
  [existingImages[index], existingImages[target]] = [existingImages[target], existingImages[index]];
  renderExistingImages();
  if (editingHostelId) {
    await persistExistingImageOrder(editingHostelId);
  }
};

window.deleteExistingImage = async (imageId) => {
  if (!editingHostelId) return;
  if (!confirm("Delete this hostel photo?")) return;
  try {
    await apiFetch(`/owner/hostels/${editingHostelId}/images/${imageId}`, { method: "DELETE" });
    existingImages = existingImages.filter((image) => image.id !== imageId);
    renderExistingImages();
  } catch (err) {
    alert(`Failed to delete image: ${err.message}`);
  }
};

async function persistExistingImageOrder(hostelId) {
  try {
    existingImages = await apiFetch(`/owner/hostels/${hostelId}/images/reorder`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageIds: existingImages.map((image) => image.id) })
    });
    renderExistingImages();
  } catch (err) {
    alert(`Failed to reorder images: ${err.message}`);
  }
}

function uploadImages(hostelId, files) {
  return new Promise((resolve, reject) => {
    if (!files.length) {
      resolve([]);
      return;
    }

    const formData = new FormData();
    files.forEach((item) => formData.append("files", item.file));

    const request = new XMLHttpRequest();
    request.open("POST", `${API_BASE}/owner/hostels/${hostelId}/images`);
    const token = getToken();
    if (token) request.setRequestHeader("Authorization", `Bearer ${token}`);

    request.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable) {
        setUploadProgress((event.loaded / event.total) * 100, true);
      }
    });

    request.onreadystatechange = () => {
      if (request.readyState !== XMLHttpRequest.DONE) return;
      if (request.status >= 200 && request.status < 300) {
        try {
          const response = JSON.parse(request.responseText || "[]");
          setUploadProgress(100, true);
          resolve(response);
        } catch (error) {
          reject(new Error("Image upload response was invalid"));
        }
        return;
      }

      try {
        const error = JSON.parse(request.responseText || "{}");
        reject(new Error(error.message || `Image upload failed (${request.status})`));
      } catch (parseError) {
        reject(new Error(`Image upload failed (${request.status})`));
      }
    };

    request.onerror = () => reject(new Error("Image upload failed"));
    request.send(formData);
  });
}

function showSection(name) {
  if (name === "hostels") {
    els.sectionHostels.style.display = "block";
    els.sectionInquiries.style.display = "none";
    els.tabHostels.classList.add("btn-primary");
    els.tabInquiries.classList.remove("btn-primary");
    loadMyHostels();
  } else {
    els.sectionHostels.style.display = "none";
    els.sectionInquiries.style.display = "block";
    els.tabInquiries.classList.add("btn-primary");
    els.tabHostels.classList.remove("btn-primary");
    loadInquiries();
  }
}

async function loadMyHostels() {
  try {
    const hostels = await apiFetch("/owner/hostels");
    renderHostels(hostels);
  } catch (err) {
    els.hostelList.innerHTML = `<p style="color:red">Error: ${err.message}</p>`;
  }
}

function renderHostels(items) {
  if (!items || items.length === 0) {
    els.hostelList.innerHTML = `<div class="card" style="grid-column: 1/-1; text-align:center;"><div class="card-body">You haven't added any hostels yet.</div></div>`;
    return;
  }

  const statusMap = {
    DRAFT: { label: "Draft - Not Published", color: "#95a5a6" },
    PENDING_APPROVAL: { label: "Pending Admin Approval", color: "#ff9800" },
    PUBLISHED: { label: "Live on Site", color: "#28dc8c" },
    BLOCKED: { label: "Blocked", color: "#dc3545" }
  };

  els.hostelList.innerHTML = "";
  items.forEach((h) => {
    const s = statusMap[h.status] || { label: h.status, color: "#999" };
    const mainImage = h.imageUrls && h.imageUrls[0] ? h.imageUrls[0] : `../img/hostels/room${(h.id % 2) + 1}.png`;
    const roomTypeSummary = Array.isArray(h.roomTypes) && h.roomTypes.length
      ? h.roomTypes.map((roomType) => `${escapeHtml(roomType.roomType)}: ₹${formatAmount(roomType.pricePerMonth)}`).join(" • ")
      : "No room types added";
    const card = document.createElement("div");
    card.className = "card";

    let actionButtons = `
      <button class="btn btn-sm btn-primary" onclick="editHostel(${h.id})" style="flex:1;">Edit All</button>
      <button class="btn btn-sm" onclick="confirmDeleteHostel(${h.id})" style="flex:1; color:#dc3545; border-color:#dc3545;">Delete</button>
    `;

    if (h.status === "DRAFT") {
      actionButtons = `
        <button class="btn btn-sm btn-primary" onclick="publishHostel(${h.id})" style="flex:1; background:#27ae60;">Publish</button>
        <button class="btn btn-sm" onclick="editHostel(${h.id})" style="flex:1;">Edit</button>
        <button class="btn btn-sm" onclick="confirmDeleteHostel(${h.id})" style="flex:1; color:#dc3545; border-color:#dc3545;">Delete</button>
      `;
    }

    card.innerHTML = `
      <div class="hostel-thumb" style="height:140px; background-image: url('${mainImage}'); background-size:cover; background-position:center; position:relative; border-radius:12px 12px 0 0;">
        <span style="position:absolute; top:10px; right:10px; background:${s.color}; color:white; padding:2px 8px; border-radius:4px; font-size:10px; font-weight:bold;">${s.label}</span>
      </div>
      <div class="card-body">
        <h3 style="margin:0 0 10px 0;">${escapeHtml(h.hostelName)}</h3>
        <p style="font-size:14px; opacity:0.8; margin-bottom:10px;">${escapeHtml(h.areaName)}, ${escapeHtml(h.cityName)}</p>
        <div style="display:flex; justify-content:space-between; margin-bottom:10px; font-size:13px;">
          <span><strong>From ₹${formatAmount(h.pricePerMonth)}</strong>/mo</span>
          <span>${h.availableRooms}/${h.totalRooms} Rooms</span>
        </div>
        <p style="font-size:12px; opacity:0.78; margin:0 0 14px 0;">${roomTypeSummary}</p>
        <div style="display:flex; gap:8px;">
          ${actionButtons}
        </div>
      </div>
    `;
    els.hostelList.appendChild(card);
  });
}

async function loadInquiries() {
  try {
    const inquiries = await apiFetch("/owner/inquiries");
    renderInquiries(inquiries);
  } catch (err) {
    els.inquiryList.innerHTML = `<p style="color:red">Error: ${err.message}</p>`;
  }
}

function renderInquiries(inquiries) {
  if (inquiries.length === 0) {
    els.inquiryList.innerHTML = `<div class="card" style="grid-column: 1/-1; text-align:center;"><div class="card-body">No student inquiries received yet.</div></div>`;
    return;
  }

  els.inquiryList.innerHTML = inquiries.map(i => `
    <div class="card">
      <div class="card-body">
        <div style="display:flex; justify-content:space-between; align-items:flex-start;">
          <h4 style="margin:0;">${escapeHtml(i.studentName)}</h4>
          <span class="badge" style="background:${i.status === "PENDING" ? "#ffc107" : (i.status === "ACCEPTED" ? "#28a745" : "#dc3545")}; color:#fff; border:none;">${i.status}</span>
        </div>
        <p style="font-size:13px; margin:8px 0;">Hostel: <strong>${escapeHtml(i.hostelName)}</strong></p>
        <p style="font-size:13px; margin:4px 0;">Request Type: <strong>${escapeHtml(formatRequestType(i.requestType))}</strong></p>
        <p style="font-size:13px; margin:4px 0;">Rooms: <strong>${i.requestedRoomCount}</strong></p>
        <p style="font-size:13px; margin:4px 0;">Contact: <strong>${escapeHtml(i.studentPhone)}</strong></p>
        <div style="background:rgba(255,255,255,0.05); padding:10px; border-radius:4px; font-size:13px; margin:12px 0;">
          "${escapeHtml(i.message || "No message")}"
        </div>
        ${i.status === "PENDING" ? `
          <div style="display:flex; gap:8px;">
            <button class="btn btn-sm badge-ok" onclick="updateInquiryStatus(${i.id}, 'ACCEPTED')" style="flex:1; color:#fff;">Accept</button>
            <button class="btn btn-sm" onclick="updateInquiryStatus(${i.id}, 'REJECTED')" style="flex:1; background:#dc3545; color:#fff; border:none;">Reject</button>
          </div>
        ` : ""}
      </div>
    </div>
  `).join("");
}

async function updateInquiryStatus(id, status) {
  const note = prompt(`Enter a note for the student (optional) - Status will be ${status}:`, "");
  if (note === null) return;

  try {
    await apiFetch(`/owner/inquiries/${id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, ownerNote: note })
    });
    loadInquiries();
  } catch (err) {
    alert("Update failed: " + err.message);
  }
}

async function confirmDeleteHostel(id) {
  if (confirm("Are you sure you want to delete this hostel? This action cannot be undone.")) {
    try {
      await apiFetch(`/owner/hostels/${id}`, { method: "DELETE" });
      loadMyHostels();
    } catch (err) {
      alert("Delete failed: " + err.message);
    }
  }
}

async function loadCities() {
  try {
    const cities = await apiFetch("/public/cities");
    els.citySelect.innerHTML = "<option value=''>Select City</option>" +
      cities.map(c => `<option value="${c.id}">${c.name}</option>`).join("");
  } catch (err) {
    console.error("Failed to load cities", err);
  }
}

async function loadFacilities() {
  const container = document.getElementById("facilityCheckboxes");
  try {
    const facilities = await apiFetch("/public/facilities");
    container.innerHTML = facilities.map(f => `
      <div style="display:flex; align-items:center; gap:5px; font-size:13px;">
        <input type="checkbox" class="fac-check" value="${f.id}" id="fac-${f.id}">
        <label for="fac-${f.id}">${f.name}</label>
      </div>
    `).join("");
  } catch (err) {
    container.innerHTML = `<span style="color:red">Error: ${err.message}</span>`;
  }
}

async function loadAreas(cityId, preSelectAreaId = null) {
  if (!cityId) {
    els.areaSelect.innerHTML = "";
    return;
  }
  try {
    const areas = await apiFetch(`/public/areas?cityId=${cityId}`);
    els.areaSelect.innerHTML = areas.map(a => `<option value="${a.id}" ${a.id == preSelectAreaId ? "selected" : ""}>${a.name}</option>`).join("");
  } catch (err) {
    console.error(err);
  }
}

function collectRoomTypes() {
  const roomTypes = roomTypeDrafts.map((roomType) => ({
    roomType: String(roomType.roomType ?? "").trim(),
    pricePerMonth: Number(roomType.pricePerMonth),
    totalRooms: Number(roomType.totalRooms),
    availableRooms: Number(roomType.availableRooms),
  }));

  if (!roomTypes.length) {
    throw new Error("Add at least one room type.");
  }

  const seen = new Set();
  roomTypes.forEach((roomType) => {
    if (!roomType.roomType) {
      throw new Error("Each room type needs a name.");
    }
    if (!Number.isFinite(roomType.pricePerMonth) || roomType.pricePerMonth <= 0) {
      throw new Error(`Enter a valid price for ${roomType.roomType}.`);
    }
    if (!Number.isInteger(roomType.totalRooms) || roomType.totalRooms <= 0) {
      throw new Error(`Enter a valid total room count for ${roomType.roomType}.`);
    }
    if (!Number.isInteger(roomType.availableRooms) || roomType.availableRooms < 0) {
      throw new Error(`Enter a valid available room count for ${roomType.roomType}.`);
    }
    if (roomType.availableRooms > roomType.totalRooms) {
      throw new Error(`Available rooms cannot exceed total rooms for ${roomType.roomType}.`);
    }

    const normalized = roomType.roomType.toLowerCase();
    if (seen.has(normalized)) {
      throw new Error("Each room type must be unique.");
    }
    seen.add(normalized);
  });

  return roomTypes;
}

async function saveHostel() {
  const submitButton = els.hostelForm.querySelector("button[type='submit']");
  const facChecks = document.querySelectorAll(".fac-check:checked");
  const facilityIds = Array.from(facChecks).map(c => parseInt(c.value, 10));

  let roomTypes;
  try {
    roomTypes = collectRoomTypes();
  } catch (validationError) {
    alert(validationError.message);
    return;
  }

  const payload = {
    hostelName: document.getElementById("hostelName").value,
    cityId: parseInt(document.getElementById("citySelect").value, 10),
    areaId: parseInt(document.getElementById("areaSelect").value, 10),
    addressLine: document.getElementById("addressLine").value,
    description: document.getElementById("description").value,
    imageUrl: existingImages[0]?.imageUrl || "",
    genderType: document.getElementById("genderType").value,
    messAvailable: document.getElementById("messAvailable").checked,
    roomTypes,
    facilityIds
  };

  try {
    submitButton.disabled = true;
    submitButton.textContent = editingHostelId ? "Saving..." : "Creating...";

    let savedHostel;
    if (editingHostelId) {
      savedHostel = await apiFetch(`/owner/hostels/${editingHostelId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
    } else {
      savedHostel = await apiFetch("/owner/hostels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
    }

    if (pendingImageFiles.length) {
      setImageValidation("Uploading hostel images...");
      existingImages = await uploadImages(savedHostel.id, pendingImageFiles);
    }

    els.hostelModal.style.display = "none";
    resetHostelForm();
    loadMyHostels();
  } catch (err) {
    alert("Failed to save: " + err.message);
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "Save Hostel";
    setUploadProgress(0, false);
  }
}

window.editHostel = async (id) => {
  editingHostelId = id;
  try {
    resetHostelForm();
    const hostels = await apiFetch("/owner/hostels");
    const hostel = hostels.find(x => x.id == id);
    if (!hostel) return;

    document.getElementById("modalTitle").textContent = "Edit Hostel";
    document.getElementById("hostelName").value = hostel.hostelName;
    document.getElementById("citySelect").value = "1";
    await loadAreas(1);
    const areaOption = Array.from(els.areaSelect.options).find((option) => option.textContent === hostel.areaName);
    if (areaOption) {
      els.areaSelect.value = areaOption.value;
    }

    document.getElementById("addressLine").value = hostel.addressLine;
    document.getElementById("description").value = hostel.description || "";
    document.getElementById("genderType").value = hostel.genderType;
    document.getElementById("messAvailable").checked = hostel.messAvailable;
    existingImages = Array.isArray(hostel.images) ? [...hostel.images] : (hostel.imageUrls || []).map((url, index) => ({
      id: index + 1,
      imageUrl: url,
      displayOrder: index,
    }));
    renderExistingImages();
    setImageValidation(`${existingImages.length}/${IMAGE_MAX_COUNT} images selected`);

    resetRoomTypes(
      Array.isArray(hostel.roomTypes) && hostel.roomTypes.length
        ? hostel.roomTypes
        : [{
            roomType: DEFAULT_ROOM_TYPE_OPTIONS[0],
            pricePerMonth: hostel.pricePerMonth ?? "",
            totalRooms: hostel.totalRooms ?? 1,
            availableRooms: hostel.availableRooms ?? 0,
          }]
    );

    clearFacilitySelections();
    (hostel.facilities || []).forEach((facilityName) => {
      const label = Array.from(document.querySelectorAll("#facilityCheckboxes label"))
        .find((item) => item.textContent === facilityName);
      if (!label) return;
      const checkbox = document.getElementById(label.getAttribute("for"));
      if (checkbox) checkbox.checked = true;
    });

    els.hostelModal.style.display = "flex";
  } catch (err) {
    alert("Failed to load hostel data: " + err.message);
  }
};

function escapeHtml(s) {
  return String(s ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}

function formatAmount(value) {
  if (value == null || value === "") return "";
  const number = Number(value);
  return Number.isFinite(number) ? number.toLocaleString("en-IN") : String(value);
}

function formatRequestType(requestType) {
  return requestType === "BOOKING" ? "Booking" : "Inquiry";
}

window.publishHostel = async (id) => {
  if (confirm("Publish this hostel? It will be visible to all students on the platform.")) {
    try {
      await apiFetch(`/owner/hostels/${id}/publish`, { method: "PATCH" });
      loadMyHostels();
    } catch (err) {
      alert("Failed to publish: " + err.message);
    }
  }
};

window.updateInquiryStatus = updateInquiryStatus;
window.confirmDeleteHostel = confirmDeleteHostel;

init();
