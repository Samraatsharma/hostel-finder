import { apiFetch, setToken } from "./apiClient.js";

const nameEl = document.getElementById("name");
const emailEl = document.getElementById("email");
const phoneEl = document.getElementById("phone");
const passEl = document.getElementById("password");
const aadhaarFileEl = document.getElementById("aadhaarFile");
const btn = document.getElementById("regBtn");
const msg = document.getElementById("msg");

const regSendOtpBtn = document.getElementById("regSendOtpBtn");
const regOtpField = document.getElementById("regOtpField");
const regOtpCode = document.getElementById("regOtpCode");
const regVerifyOtpBtn = document.getElementById("regVerifyOtpBtn");
const regOtpStatus = document.getElementById("regOtpStatus");

let emailVerified = false;

function showMessage(text, isError = true) {
  msg.style.display = "block";
  msg.innerHTML = isError ? `<strong>Error:</strong> ${escapeHtml(text)}` : text;
  msg.style.borderColor = isError ? "#f8d7da" : "#d1e7dd";
  msg.style.backgroundColor = isError ? "#f8d7da" : "#d1e7dd";
  msg.style.color = isError ? "#721c24" : "#0f5132";
}

function clearMessage() {
    msg.style.display = "none";
}

function escapeHtml(s) {
  return String(s ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}

// ==== OTP LOGIC ==== //
async function handleSendOtp(e) {
    if(e) e.preventDefault();
    const identifier = emailEl.value.trim();
    if (!identifier) return showMessage("Please enter email before verifying");
    
    regSendOtpBtn.style.pointerEvents = "none";
    regSendOtpBtn.style.opacity = "0.5";
    clearMessage();
    try {
        const res = await apiFetch("/auth/send-otp", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ identifier })
        });
        
        let sentMsg = "OTP Sent to Registration Email!";
        if (res.dev_otp) {
             sentMsg += ` (Dev OTP: ${res.dev_otp})`;
             regOtpCode.value = res.dev_otp; // Auto-fill for convenience
        }
        
        showMessage(sentMsg, false);
        regOtpField.style.display = "block";
    } catch (err) {
        showMessage(err.message);
    } finally {
        regSendOtpBtn.style.pointerEvents = "auto";
        regSendOtpBtn.style.opacity = "1";
    }
}

async function handleVerifyOtp() {
    const identifier = emailEl.value.trim();
    const code = regOtpCode.value.trim();
    
    if (!identifier || !code) return showMessage("Please enter identifier and OTP");
    
    regVerifyOtpBtn.disabled = true;
    clearMessage();
    try {
        const data = await apiFetch("/auth/verify-otp", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ identifier, otpCode: code })
        });
        
        if (!data.requiresSignup) {
            // Already registered - Logged in
            setToken(data.accessToken);
            localStorage.setItem("userRole", data.role);
            showMessage("You already have an account! Redirecting...", false);
            setTimeout(() => { window.location.href = "./owner-dashboard.html"; }, 1500);
        } else {
            emailVerified = true;
            regVerifyOtpBtn.style.display = "none";
            regOtpCode.style.display = "none";
            regOtpStatus.style.display = "block";
            regSendOtpBtn.style.display = "none";
            showMessage("Email verified successfully!", false);
        }
    } catch (err) {
        showMessage(err.message);
    } finally {
        regVerifyOtpBtn.disabled = false;
    }
}

regSendOtpBtn?.addEventListener("click", handleSendOtp);
regVerifyOtpBtn?.addEventListener("click", handleVerifyOtp);

// ==== REGISTRATION LOGIC ==== //
async function register() {
  if (!emailVerified) return showMessage("Please verify your email via OTP first!");
  if (!aadhaarFileEl.files[0]) return showMessage("Please select your Aadhaar card photo/PDF");

  const payload = {
    name: nameEl.value.trim(),
    email: emailEl.value.trim(),
    phone: phoneEl.value.trim(),
    password: passEl.value,
  };

  if(!payload.name || !payload.email || !payload.phone || !payload.password) {
    showMessage("Please fill in all registration fields.");
    return;
  }

  btn.disabled = true;
  btn.textContent = "Processing...";
  clearMessage();

  try {
    // 1. Register Account
    const data = await apiFetch("/auth/register/owner", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setToken(data.accessToken);
    localStorage.setItem("userRole", "OWNER");

    // 2. Upload Aadhaar immediately
    showMessage("Account created! Uploading Aadhaar...", false);
    const formData = new FormData();
    formData.append("file", aadhaarFileEl.files[0]);

    await apiFetch("/verification/upload", {
        method: "POST",
        body: formData
    });
    
    showMessage("Registration and upload successful! Redirecting...", false);
    setTimeout(() => {
      window.location.href = "./owner-dashboard.html";
    }, 1500);
  } catch (err) {
    showMessage(err.message || "Registration failed. Please check details.");
    btn.disabled = false;
    btn.textContent = "Create Owner Account";
  }
}

btn?.addEventListener("click", register);
