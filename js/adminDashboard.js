import { apiFetch } from "./apiClient.js";

const ownersList = document.getElementById("ownersList");

async function init() {
  loadPendingOwners();
}

async function loadPendingOwners() {
  try {
    const owners = await apiFetch("/admin/owners?status=PENDING_VERIFICATION");
    renderOwners(owners);
  } catch (err) {
    if (ownersList) ownersList.innerHTML = `<p style="color:red">Error: ${err.message}</p>`;
  }
}

function renderOwners(owners) {
  if (!ownersList) return;
  if (owners.length === 0) {
    ownersList.innerHTML = `<p>No pending owners for verification.</p>`;
    return;
  }

  ownersList.innerHTML = `
    <table style="width:100%; border-collapse:collapse; margin-top:10px;">
      <thead>
        <tr style="border-bottom:2px solid #eee; text-align:left;">
          <th style="padding:10px;">Name</th>
          <th style="padding:10px;">Email</th>
          <th style="padding:10px;">Phone</th>
          <th style="padding:10px;">Aadhaar</th>
          <th style="padding:10px;">Action</th>
        </tr>
      </thead>
      <tbody>
        ${owners.map(o => `
          <tr style="border-bottom:1px solid #eee;">
            <td style="padding:10px;">${o.name}</td>
            <td style="padding:10px;">${o.email}</td>
            <td style="padding:10px;">${o.phone}</td>
            <td style="padding:10px;">
              ${o.aadhaarUrl
                ? `<a href="${o.aadhaarUrl}" target="_blank" style="color:var(--primary); font-weight:bold;">📄 View Aadhaar</a>`
                : `<span style="color:#aaa;">Not uploaded</span>`}
            </td>
            <td style="padding:10px;">
              <button onclick="updateStatus(${o.ownerUserId}, 'approve')" style="background:#28a745; color:white; border:none; padding:5px 10px; border-radius:4px; cursor:pointer;">Approve</button>
              <button onclick="updateStatus(${o.ownerUserId}, 'reject')" style="background:#dc3545; color:white; border:none; padding:5px 10px; border-radius:4px; cursor:pointer;">Reject</button>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

window.updateStatus = async (id, action) => {
  try {
    await apiFetch(`/admin/owners/${id}/${action}`, { method: "POST" });
    alert(`Owner ${action}ed!`);
    loadPendingOwners();
  } catch (err) {
    alert("Failed: " + err.message);
  }
};

init();
