import { apiFetch, getToken } from "./apiClient.js";
import { getHostelDetailsAccessState } from "./hostelDetailsAccess.mjs";

const detailsEl = document.getElementById("details");
const sendBtn = document.getElementById("sendInquiryBtn");
const bookBtn = document.getElementById("bookingBtn");
const roomCountEl = document.getElementById("roomCount");
const messageEl = document.getElementById("message");
const inqMsg = document.getElementById("inqMsg");

let currentHostelData = null;

function applyAccessState() {
  const accessState = getHostelDetailsAccessState(getToken(), localStorage.getItem("userRole"));

  if (!inqMsg) return accessState;

  if (accessState.message) {
    inqMsg.style.display = "block";
    inqMsg.innerHTML = `<strong>Notice:</strong> ${escapeHtml(accessState.message)}`;
  } else {
    inqMsg.style.display = "none";
    inqMsg.innerHTML = "";
  }

  return accessState;
}

function escapeHtml(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function getHostelId() {
  const id = new URLSearchParams(window.location.search).get("id");
  return id ? Number(id) : null;
}

function renderDetails(h) {
  const mainImage = h.imageUrls && h.imageUrls.length > 0 ? h.imageUrls[0] : `../img/hostels/room${(h.id % 2) + 1}.png`;
  detailsEl.innerHTML = `
    <div style="width:100%; height:350px; background-image: url('${mainImage}'); background-size: cover; background-position: center; border-radius: 8px 8px 0 0; margin-top: -16px; margin-left: -16px; width: calc(100% + 32px);"></div>
    <div class="card-body">
      <div class="row" style="display:flex; justify-content:space-between; align-items:flex-start;">
        <div>
          <div style="font-size:28px; font-weight:800; margin-top:12px; color:#333;">${escapeHtml(h.hostelName)}</div>
          <div class="muted" style="font-size:16px; margin-bottom:15px;">${escapeHtml(h.addressLine)} • ${escapeHtml(h.areaName)}, ${escapeHtml(h.cityName)}</div>
        </div>
        <div class="chips" style="display:flex; gap:10px; flex-wrap:wrap; justify-content:flex-end;">
          <span class="chip" style="background:#5c2d91; color:white; padding:5px 15px; border-radius:20px; font-weight:bold;">₹${Number(h.pricePerMonth).toFixed(0)}/mo</span>
          <span class="chip" style="background:#eee; padding:5px 15px; border-radius:20px;">${escapeHtml(h.genderType)}</span>
          <span class="chip" style="background:#eee; padding:5px 15px; border-radius:20px;">${h.messAvailable ? "Mess available" : "No mess"}</span>
          <span class="chip" style="background:#d4edda; color:#155724; padding:5px 15px; border-radius:20px;"><strong>Available:</strong> ${h.availableRooms}</span>
        </div>
      </div>
      
      <div style="margin-top:20px;">
        <h3 style="border-bottom:1px solid #eee; padding-bottom:10px;">Description</h3>
        <p style="line-height:1.6; color:#555; white-space: pre-line;">${escapeHtml(h.description || "No description provided.")}</p>
      </div>

      <div style="margin-top:20px;">
        <h3 style="border-bottom:1px solid #eee; padding-bottom:10px;">Facilities</h3>
        <div style="display:flex; gap:10px; flex-wrap:wrap; margin-top:10px;">
          ${h.facilities.length ? h.facilities.map(f => `<span class="facility-tag" style="font-size:14px; padding:5px 12px;">${escapeHtml(f)}</span>`).join("") : "—"}
        </div>
      </div>

      ${h.imageUrls && h.imageUrls.length > 1 ? `
        <div style="margin-top:20px;">
          <h3 style="border-bottom:1px solid #eee; padding-bottom:10px;">More Images</h3>
          <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap:10px; margin-top:10px;">
            ${h.imageUrls.slice(1).map(img => `
              <img src="${img}" style="width:100%; height:120px; object-fit:cover; border-radius:4px; cursor:pointer;" onclick="window.open('${img}', '_blank')">
            `).join('')}
          </div>
        </div>
      ` : ''}
    </div>
  `;
}

async function load() {
  const hostelId = getHostelId();
  if (!hostelId) {
    detailsEl.innerHTML = `<div class="card-body"><div class="notice"><strong>Error:</strong> Missing hostel id.</div></div>`;
    return;
  }
  const data = await apiFetch(`/public/hostels/${hostelId}`);
  currentHostelData = data;
  renderDetails(data);
}

async function submitRequest(requestType, buttonEl, loadingText, idleText, successText) {
  inqMsg.style.display = "none";
  const token = getToken();
  const role = localStorage.getItem("userRole");
  if (!token) {
    inqMsg.style.display = "block";
    inqMsg.innerHTML = `<strong>Login required:</strong> Please login first, then come back and send inquiry.`;
    return;
  }
  if (role !== "STUDENT") {
    inqMsg.style.display = "block";
    inqMsg.innerHTML = `<strong>Student account required:</strong> Only students can send inquiries. Your current role is: ${escapeHtml(role || 'None')}`;
    return;
  }
  const hostelId = getHostelId();
  buttonEl.disabled = true;
  buttonEl.textContent = loadingText;
  try {
    await apiFetch(`/student/inquiries`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        hostelId,
        requestedRoomCount: Number(roomCountEl.value || "1"),
        message: messageEl.value || "",
        requestType,
      }),
    });
    inqMsg.style.display = "block";
    inqMsg.innerHTML = `<strong>Sent!</strong> ${escapeHtml(successText)}`;
    messageEl.value = "";
    
    if (requestType === "BOOKING" && currentHostelData) {
      showPaymentModal(currentHostelData, roomCountEl.value || "1");
    }
  } catch (e) {
    inqMsg.style.display = "block";
    inqMsg.innerHTML = `<strong>Error:</strong> ${escapeHtml(e.message)}`;
  } finally {
    buttonEl.disabled = false;
    buttonEl.textContent = idleText;
  }
}

async function sendInquiry() {
  await submitRequest("INQUIRY", sendBtn, "Sending...", "Send Inquiry", "Owner will respond in their dashboard.");
}

async function bookNow() {
  await submitRequest("BOOKING", bookBtn, "Booking...", "Book Now", "Booking request sent to the owner for approval.");
}

sendBtn?.addEventListener("click", sendInquiry);
bookBtn?.addEventListener("click", bookNow);

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
      <a class="btn" href="./index.html">Back to search</a>
      <a class="btn" href="${dashboardUrl}">Go to Dashboard</a>
      <button class="btn" onclick="localStorage.clear(); location.reload();">Logout</button>
    `;
  }
}

updateHeader();
applyAccessState();
await load();

function showPaymentModal(hostel, roomCount) {
  let modal = document.getElementById("dummyPaymentModal");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "dummyPaymentModal";
    modal.style.position = "fixed";
    modal.style.top = "0";
    modal.style.left = "0";
    modal.style.width = "100%";
    modal.style.height = "100%";
    modal.style.backgroundColor = "rgba(0,0,0,0.5)";
    modal.style.display = "flex";
    modal.style.justifyContent = "center";
    modal.style.alignItems = "center";
    modal.style.zIndex = "9999";
    document.body.appendChild(modal);
  }
  
  const price = Number(hostel.pricePerMonth) || 0;
  const totalAmount = price * Number(roomCount);
  
  modal.innerHTML = `
    <div style="background: white; padding: 24px; border-radius: 12px; width: 90%; max-width: 400px; box-shadow: 0 4px 15px rgba(0,0,0,0.2);">
      <h3 style="margin-top: 0; border-bottom: 1px solid #eee; padding-bottom: 10px;">Complete Payment</h3>
      <div style="margin-bottom: 15px;">
        <div style="color: #555; font-size: 14px;">Hostel</div>
        <div style="font-weight: bold; font-size: 16px;">${escapeHtml(hostel.hostelName)}</div>
      </div>
      <div style="margin-bottom: 15px; display: flex; justify-content: space-between;">
        <div>
          <div style="color: #555; font-size: 14px;">Room Type</div>
          <div style="font-weight: bold;">${escapeHtml(hostel.genderType)} / ${hostel.messAvailable ? "Mess" : "No Mess"}</div>
        </div>
        <div style="text-align: right;">
          <div style="color: #555; font-size: 14px;">Amount</div>
          <div style="font-weight: bold; font-size: 18px; color: #5c2d91;">₹${totalAmount}</div>
        </div>
      </div>
      <div style="margin-bottom: 20px;">
        <div style="color: #555; font-size: 14px; margin-bottom: 8px;">Payment Method</div>
        <select id="dummyPaymentMethod" style="width: 100%; padding: 10px; border: 1px solid #ccc; border-radius: 6px;">
          <option value="upi">UPI</option>
          <option value="card">Credit/Debit Card</option>
          <option value="cash">Cash on Arrival</option>
        </select>
      </div>
      <div id="paymentStatusMsg" style="display:none; padding: 10px; margin-bottom: 15px; border-radius: 6px; background: #d4edda; color: #155724; text-align: center;"></div>
      <div style="display: flex; gap: 10px;">
        <button id="skipPaymentBtn" class="btn" style="flex: 1; background: #eee; color: #333; border: 1px solid #ccc; cursor: pointer; border-radius: 6px; padding: 10px;">Skip Payment</button>
        <button id="payNowBtn" class="btn btn-primary" style="flex: 1; background: #5c2d91; color: white; border: none; cursor: pointer; border-radius: 6px; padding: 10px;">Pay Now</button>
      </div>
    </div>
  `;
  
  modal.style.display = "flex";
  
  document.getElementById("skipPaymentBtn").addEventListener("click", () => {
    modal.style.display = "none";
  });
  
  document.getElementById("payNowBtn").addEventListener("click", () => {
    const btn = document.getElementById("payNowBtn");
    btn.disabled = true;
    btn.textContent = "Processing...";
    
    setTimeout(() => {
      const msg = document.getElementById("paymentStatusMsg");
      msg.style.display = "block";
      msg.innerHTML = "<strong>Payment Successful!</strong><br>Status saved locally.";
      
      const dummyStatus = JSON.parse(localStorage.getItem("dummyPayments") || "{}");
      dummyStatus[hostel.id] = { status: "PAID", amount: totalAmount, method: document.getElementById("dummyPaymentMethod").value, date: new Date().toISOString() };
      localStorage.setItem("dummyPayments", JSON.stringify(dummyStatus));
      
      btn.style.display = "none";
      const skipBtn = document.getElementById("skipPaymentBtn");
      skipBtn.textContent = "Close";
      skipBtn.style.background = "#28a745";
      skipBtn.style.color = "white";
      skipBtn.style.border = "none";
    }, 1500);
  });
}
