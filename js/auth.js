import { apiFetch, setToken } from "./apiClient.js";

const els = {
  loginSection: document.getElementById("loginSection"),
  registerSection: document.getElementById("registerSection"),
  toggleLoginBtn: document.getElementById("toggleLoginBtn"),
  toggleRegisterBtn: document.getElementById("toggleRegisterBtn"),
  
  // Login Tab
  loginEmail: document.getElementById("loginEmail"),
  loginPassword: document.getElementById("loginPassword"),
  loginSubmitBtn: document.getElementById("loginSubmitBtn"),
  useOtpLoginBtn: document.getElementById("useOtpLoginBtn"),
  usePasswordLoginBtn: document.getElementById("usePasswordLoginBtn"),
  passwordLoginBlock: document.getElementById("passwordLoginBlock"),
  otpLoginBlock: document.getElementById("otpLoginBlock"),
  loginSendOtpBtn: document.getElementById("loginSendOtpBtn"),
  loginOtpField: document.getElementById("loginOtpField"),
  loginOtpCode: document.getElementById("loginOtpCode"),
  loginVerifyOtpBtn: document.getElementById("loginVerifyOtpBtn"),
  loginResendOtpBtn: document.getElementById("loginResendOtpBtn"),
  
  // Register Tab
  regName: document.getElementById("regName"),
  regEmail: document.getElementById("regEmail"),
  regPhone: document.getElementById("regPhone"),
  regPassword: document.getElementById("regPassword"),
  regGender: document.getElementById("regGender"),
  regAge: document.getElementById("regAge"),
  registerSubmitBtn: document.getElementById("registerSubmitBtn"),
  regSendOtpBtn: document.getElementById("regSendOtpBtn"),
  regOtpField: document.getElementById("regOtpField"),
  regOtpCode: document.getElementById("regOtpCode"),
  regVerifyOtpBtn: document.getElementById("regVerifyOtpBtn"),
  regOtpStatus: document.getElementById("regOtpStatus"),
  
  msg: document.getElementById("msg"),
};

function showMessage(text, isError = true) {
  els.msg.style.display = "block";
  els.msg.innerHTML = `<strong>${isError ? 'Error:' : 'Message:'}</strong> ${escapeHtml(text)}`;
  els.msg.style.borderColor = isError ? "#f8d7da" : "#d4edda";
  els.msg.style.backgroundColor = isError ? "#f8d7da" : "#d4edda";
  els.msg.style.color = isError ? "#721c24" : "#155724";
}

function clearMessage() {
  els.msg.style.display = "none";
  els.msg.innerHTML = "";
}

function escapeHtml(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function showSection(section) {
  if (section === 'login') {
    els.loginSection.style.display = "block";
    els.registerSection.style.display = "none";
    els.toggleLoginBtn.classList.add("btn-primary");
    els.toggleRegisterBtn.classList.remove("btn-primary");
  } else {
    els.loginSection.style.display = "none";
    els.registerSection.style.display = "block";
    els.toggleRegisterBtn.classList.add("btn-primary");
    els.toggleLoginBtn.classList.remove("btn-primary");
  }
  clearMessage();
}

els.toggleLoginBtn?.addEventListener("click", () => showSection('login'));
els.toggleRegisterBtn?.addEventListener("click", () => showSection('register'));

// -- Switch between Login Modes --
els.useOtpLoginBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    els.passwordLoginBlock.style.display = "none";
    els.otpLoginBlock.style.display = "block";
});
els.usePasswordLoginBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    els.otpLoginBlock.style.display = "none";
    els.passwordLoginBlock.style.display = "block";
});

// -- OTP Utility --
function startResendCountdown(btn) {
    let seconds = 30;
    btn.disabled = true;
    let timer = setInterval(() => {
        seconds--;
        btn.textContent = `Resend (${seconds}s)`;
        if (seconds <= 0) {
            clearInterval(timer);
            btn.disabled = false;
            btn.textContent = "Resend OTP";
        }
    }, 1000);
}

// ==== LOGIN OTP FLOW ==== //
async function handleLoginSendOtp() {
    const identifier = els.loginEmail.value.trim();
    if (!identifier) return showMessage("Please enter email before sending OTP");
    
    els.loginSendOtpBtn.disabled = true;
    clearMessage();
    try {
        const res = await apiFetch("/auth/send-otp", { 
            method: "POST", 
            headers: { "Content-Type": "application/json" }, 
            body: JSON.stringify({ identifier }) 
        });
        let msg = "OTP Sent!";
        if(res.dev_otp) { 
            msg += ` (Dev OTP: ${res.dev_otp})`; 
            els.loginOtpCode.value = res.dev_otp; 
        }
        showMessage(msg, false);
        els.loginOtpField.style.display = "block";
        startResendCountdown(els.loginResendOtpBtn);
    } catch (e) {
        showMessage(e.message);
    } finally { els.loginSendOtpBtn.disabled = false; }
}

async function handleLoginVerifyOtp() {
    const identifier = els.loginEmail.value.trim();
    const otpCode = els.loginOtpCode.value.trim();
    if (!identifier || !otpCode) return showMessage("Provide email and OTP");
    
    els.loginVerifyOtpBtn.disabled = true;
    clearMessage();
    try {
        const data = await apiFetch("/auth/verify-otp", { 
            method: "POST", 
            headers: { "Content-Type": "application/json" }, 
            body: JSON.stringify({ identifier, otpCode }) 
        });
        if (data.requiresSignup) {
            showMessage("Email verified, but no account found! Please register.", true);
            showSection("register");
            els.regEmail.value = identifier;
        } else {
            setToken(data.accessToken);
            localStorage.setItem("userRole", data.role);
            redirectUser(data.role);
        }
    } catch (e) { showMessage(e.message); } 
      finally { els.loginVerifyOtpBtn.disabled = false; }
}

els.loginSendOtpBtn?.addEventListener("click", handleLoginSendOtp);
els.loginResendOtpBtn?.addEventListener("click", handleLoginSendOtp);
els.loginVerifyOtpBtn?.addEventListener("click", handleLoginVerifyOtp);


// ==== REGISTRATION OTP FLOW ==== //
let registrationEmailVerified = false;

async function handleRegSendOtp(e) {
    if(e) e.preventDefault();
    const identifier = els.regEmail.value.trim();
    if (!identifier) return showMessage("Please enter email before verifying");
    
    els.regSendOtpBtn.style.pointerEvents = "none";
    els.regSendOtpBtn.style.opacity = "0.5";
    clearMessage();
    try {
        const res = await apiFetch("/auth/send-otp", { 
            method: "POST", 
            headers: { "Content-Type": "application/json" }, 
            body: JSON.stringify({ identifier }) 
        });
        let msg = "OTP Sent to Registration Email!";
        if(res.dev_otp) { 
            msg += ` (Dev OTP: ${res.dev_otp})`; 
            els.regOtpCode.value = res.dev_otp; 
        }
        showMessage(msg, false);
        els.regOtpField.style.display = "block";
    } catch (e) {
        showMessage(e.message);
    } finally {
        els.regSendOtpBtn.style.pointerEvents = "auto";
        els.regSendOtpBtn.style.opacity = "1";
    }
}

async function handleRegVerifyOtp() {
    const identifier = els.regEmail.value.trim();
    const otpCode = els.regOtpCode.value.trim();
    if (!identifier || !otpCode) return showMessage("Provide email and OTP");
    
    els.regVerifyOtpBtn.disabled = true;
    clearMessage();
    try {
        const data = await apiFetch("/auth/verify-otp", { 
            method: "POST", 
            headers: { "Content-Type": "application/json" }, 
            body: JSON.stringify({ identifier, otpCode }) 
        });
        if (!data.requiresSignup) {
            setToken(data.accessToken);
            localStorage.setItem("userRole", data.role);
            redirectUser(data.role);
        } else {
            registrationEmailVerified = true;
            els.regVerifyOtpBtn.style.display = "none";
            els.regOtpCode.style.display = "none";
            els.regOtpStatus.style.display = "block";
            els.regSendOtpBtn.style.display = "none";
            showMessage("Email verified successfully!", false);
        }
    } catch (e) { showMessage(e.message); } 
      finally { els.regVerifyOtpBtn.disabled = false; }
}

els.regSendOtpBtn?.addEventListener("click", handleRegSendOtp);
els.regVerifyOtpBtn?.addEventListener("click", handleRegVerifyOtp);

function redirectUser(role) {
    const pendingUrl = sessionStorage.getItem("pendingRedirectUrl");
    if (pendingUrl) {
        sessionStorage.removeItem("pendingRedirectUrl");
        window.location.href = pendingUrl;
        return;
    }
    if (role === "ADMIN") window.location.href = "./admin-dashboard.html";
    else if (role === "OWNER") window.location.href = "./owner-dashboard.html";
    else if (role === "STUDENT") window.location.href = "./student-dashboard.html";
    else window.location.href = "./index.html";
}

// ==== TRADITIONAL LOGIN ====
async function performLogin() {
  els.loginSubmitBtn.disabled = true;
  els.loginSubmitBtn.textContent = "Logging in...";
  clearMessage();
  try {
    const data = await apiFetch("/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: els.loginEmail.value.trim(),
        password: els.loginPassword.value,
      }),
    });
    setToken(data.accessToken);
    localStorage.setItem("userRole", data.role);
    redirectUser(data.role);
  } catch (e) {
    showMessage(e.message);
  } finally {
    els.loginSubmitBtn.disabled = false;
    els.loginSubmitBtn.textContent = "Login";
  }
}

async function performRegister() {
  if(!registrationEmailVerified) return showMessage("Please verify your email via OTP first!");

  const payload = {
    name: els.regName.value.trim(),
    email: els.regEmail.value.trim(),
    phone: els.regPhone.value.trim(),
    password: els.regPassword.value,
    gender: els.regGender.value,
    age: parseInt(els.regAge.value) || 0,
  };

  if (!payload.name || !payload.email || !payload.phone || !payload.password) {
    showMessage("Please fill all required fields");
    return;
  }

  els.registerSubmitBtn.disabled = true;
  els.registerSubmitBtn.textContent = "Registering...";
  clearMessage();

  try {
    const data = await apiFetch("/auth/register/student", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setToken(data.accessToken);
    localStorage.setItem("userRole", "STUDENT");
    showMessage("Registration successful! Redirecting...", false);
    setTimeout(() => { redirectUser("STUDENT"); }, 1500);
  } catch (e) {
    showMessage(`Registration failed: ${e.message}`);
  } finally {
    els.registerSubmitBtn.disabled = false;
    els.registerSubmitBtn.textContent = "Create Account";
  }
}

els.loginSubmitBtn?.addEventListener("click", performLogin);
els.registerSubmitBtn?.addEventListener("click", performRegister);
