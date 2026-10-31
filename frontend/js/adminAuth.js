import { apiFetch, setToken } from "./apiClient.js";

const emailEl = document.getElementById("email");
const passEl = document.getElementById("password");
const btn = document.getElementById("loginBtn");
const msg = document.getElementById("msg");

function showMessage(text) {
  msg.style.display = "block";
  msg.innerHTML = `<strong>Error:</strong> ${escapeHtml(text)}`;
  msg.style.borderColor = "#f8d7da";
  msg.style.backgroundColor = "#f8d7da";
  msg.style.color = "#721c24";
}

function clearMessage() {
  msg.style.display = "none";
  msg.innerHTML = "";
}

function escapeHtml(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

async function login() {
  btn.disabled = true;
  btn.textContent = "Logging in...";
  clearMessage();
  try {
    const data = await apiFetch("/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: emailEl.value.trim(),
        password: passEl.value,
      }),
    });

    if (data.role.toUpperCase() !== "ADMIN") {
      throw new Error("Access denied: You are not an administrator.");
    }

    setToken(data.accessToken);
    window.location.href = "./admin-dashboard.html";
  } catch (e) {
    showMessage(e.message);
  } finally {
    btn.disabled = false;
    btn.textContent = "Login to Dashboard";
  }
}

btn?.addEventListener("click", login);
