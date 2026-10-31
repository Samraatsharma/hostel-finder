import { apiFetch, clearToken } from "./apiClient.js";

const els = {
  hostelsList: document.getElementById("adminHostelsList"),
  message: document.getElementById("adminHostelsMessage"),
  logoutBtn: document.getElementById("logoutBtn"),
};

function escapeHtml(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function showMessage(text, type = "info") {
  if (!els.message) return;
  const styles = {
    info: { bg: "#eef4ff", border: "#b6cbff", color: "#1f3d7a" },
    success: { bg: "#e9f9ef", border: "#b7e4c7", color: "#1f6b3a" },
    error: { bg: "#fdecec", border: "#f5b5b5", color: "#8a1f1f" },
  };
  const style = styles[type] || styles.info;
  els.message.style.display = "block";
  els.message.style.background = style.bg;
  els.message.style.border = `1px solid ${style.border}`;
  els.message.style.color = style.color;
  els.message.textContent = text;
}

function clearMessage() {
  if (!els.message) return;
  els.message.style.display = "none";
  els.message.textContent = "";
}

function renderHostels(hostels) {
  if (!els.hostelsList) return;
  if (!hostels || hostels.length === 0) {
    els.hostelsList.innerHTML = `<div class="notice">No hostels found.</div>`;
    return;
  }

  const sorted = [...hostels].sort((a, b) => Number(b.id) - Number(a.id));

  els.hostelsList.innerHTML = `
    <table style="width:100%; border-collapse:collapse; margin-top:10px;">
      <thead>
        <tr style="border-bottom:2px solid #eee; text-align:left;">
          <th style="padding:10px;">Hostel</th>
          <th style="padding:10px;">Area</th>
          <th style="padding:10px;">Price</th>
          <th style="padding:10px;">Status</th>
          <th style="padding:10px;">Action</th>
        </tr>
      </thead>
      <tbody>
        ${sorted.map((h) => `
          <tr style="border-bottom:1px solid #eee;">
            <td style="padding:10px;">${escapeHtml(h.hostelName)}</td>
            <td style="padding:10px;">${escapeHtml(h.area?.name || h.areaName || "-")}</td>
            <td style="padding:10px;">Rs. ${Number(h.pricePerMonth || 0).toFixed(0)}</td>
            <td style="padding:10px;">${escapeHtml(h.status || "-")}</td>
            <td style="padding:10px;">
              <button class="btn btn-sm" onclick="deleteAdminHostel(${h.id})" style="background:#dc3545; color:#fff; border:none;">
                Delete
              </button>
            </td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
}

async function loadHostels() {
  if (els.hostelsList) {
    els.hostelsList.innerHTML = `<div class="notice">Loading hostels...</div>`;
  }
  clearMessage();
  try {
    const hostels = await apiFetch("/admin/hostels");
    renderHostels(hostels);
  } catch (err) {
    if (els.hostelsList) {
      els.hostelsList.innerHTML = `<div class="notice" style="color:#8a1f1f;">Error loading hostels: ${escapeHtml(err.message)}</div>`;
    }
  }
}

window.deleteAdminHostel = async (id) => {
  const confirmed = window.confirm("Delete this hostel? This will remove it from the admin dashboard and the public index page.");
  if (!confirmed) return;

  clearMessage();
  try {
    await apiFetch(`/admin/hostels/${id}`, { method: "DELETE" });
    showMessage("Hostel deleted successfully.", "success");
    await loadHostels();
  } catch (err) {
    showMessage(`Failed to delete hostel: ${err.message}`, "error");
  }
};

els.logoutBtn?.addEventListener("click", () => {
  clearToken();
  window.location.href = "./admin-login.html";
});

loadHostels();
