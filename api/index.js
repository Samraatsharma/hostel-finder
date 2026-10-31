const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { loadDb, saveDb } = require("./db");

const app = express();
const JWT_SECRET = process.env.JWT_SECRET || "CHANGE_ME_DEMO_SECRET_CHANGE_LATER_1234567890_CHANGE_ME_DEMO_SECRET_CHANGE_LATER";

// Uploads directory
const UPLOAD_DIR = process.env.NODE_ENV === "production"
  ? path.join("/tmp", "uploads")
  : path.join(__dirname, "..", "uploads");

if (!fs.existsSync(UPLOAD_DIR)) {
  try {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  } catch (e) {}
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || ".png";
    const name = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}${ext}`;
    cb(null, name);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }
});

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files
app.use("/uploads", express.static(UPLOAD_DIR));

// Helper: JWT verification middleware
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Missing or invalid authorization token" });
  }
  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const db = loadDb();
    const user = db.users.find(u => String(u.id) === String(decoded.sub || decoded.id));
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}

// Helper: create token
function createToken(user) {
  return jwt.sign(
    {
      sub: String(user.id),
      role: user.role
    },
    JWT_SECRET,
    { expiresIn: "60m" }
  );
}

// ----------------------------------------------------
// 1. PUBLIC ENDPOINTS
// ----------------------------------------------------

app.get("/api/public/cities", (req, res) => {
  const db = loadDb();
  const cities = db.cities.map(c => ({ id: c.city_id, name: c.name }));
  res.json(cities);
});

app.get("/api/public/areas", (req, res) => {
  const cityId = Number(req.query.cityId);
  const db = loadDb();
  let areas = db.areas;
  if (cityId) {
    areas = areas.filter(a => a.city_id === cityId);
  }
  areas = [...areas].sort((a, b) => a.name.localeCompare(b.name));
  res.json(areas.map(a => ({ id: a.area_id, name: a.name })));
});

app.get("/api/public/facilities", (req, res) => {
  const db = loadDb();
  const facs = [...db.facilities].sort((a, b) => a.name.localeCompare(b.name));
  res.json(facs.map(f => ({ id: f.facility_id, name: f.name })));
});

function mapHostelCard(h, db) {
  const city = db.cities.find(c => c.city_id === h.city_id);
  const area = db.areas.find(a => a.area_id === h.area_id);
  const facilities = (h.facilities || [])
    .map(fid => db.facilities.find(f => f.facility_id === fid)?.name)
    .filter(Boolean);

  const images = (h.images || []).map(img => img.image_url);
  const coverImageUrl = images.length > 0 ? images[0] : (h.image_url || "/img/hostel_image_1.png");

  const roomTypes = (h.room_types || []).map(rt => ({
    id: rt.room_type_id,
    roomType: rt.room_type,
    pricePerMonth: rt.price_per_month,
    totalRooms: rt.total_rooms,
    availableRooms: rt.available_rooms
  }));

  return {
    id: h.hostel_id,
    hostelName: h.hostel_name,
    cityName: city ? city.name : "Indore",
    areaName: area ? area.name : "",
    pricePerMonth: Number(h.price_per_month) || 0,
    genderType: h.gender_type,
    messAvailable: Boolean(h.mess_available),
    availableRooms: Number(h.available_rooms) || 0,
    totalRooms: Number(h.total_rooms) || 0,
    coverImageUrl,
    imageUrls: images.length > 0 ? images : [coverImageUrl],
    imageUrl: h.image_url || coverImageUrl,
    facilities,
    roomTypes
  };
}

function mapHostelDetails(h, db) {
  const card = mapHostelCard(h, db);
  return {
    ...card,
    cityId: h.city_id,
    areaId: h.area_id,
    addressLine: h.address_line,
    description: h.description,
    status: h.status,
    facilityIds: h.facilities || [],
    images: (h.images || []).map(img => ({
      id: img.image_id,
      imageUrl: img.image_url,
      displayOrder: img.display_order
    }))
  };
}

app.get("/api/public/hostels", (req, res) => {
  const { cityId, areaId, genderType, minPrice, maxPrice, availableOnly, facilityIds, keyword, page = 0, size = 10 } = req.query;
  if (!cityId) {
    return res.status(400).json({ message: "cityId parameter is required" });
  }

  const db = loadDb();
  let results = db.hostels.filter(h => h.status === "PUBLISHED" && Number(h.city_id) === Number(cityId));

  if (areaId) {
    results = results.filter(h => Number(h.area_id) === Number(areaId));
  }
  if (genderType) {
    results = results.filter(h => String(h.gender_type).toUpperCase() === String(genderType).toUpperCase());
  }
  if (minPrice) {
    results = results.filter(h => Number(h.price_per_month) >= Number(minPrice));
  }
  if (maxPrice) {
    results = results.filter(h => Number(h.price_per_month) <= Number(maxPrice));
  }
  if (availableOnly === "true" || availableOnly === true) {
    results = results.filter(h => Number(h.available_rooms) > 0);
  }
  if (facilityIds) {
    const fIds = String(facilityIds).split(",").map(Number).filter(Boolean);
    if (fIds.length > 0) {
      results = results.filter(h => {
        const hFacs = h.facilities || [];
        return fIds.every(fid => hFacs.includes(fid));
      });
    }
  }
  if (keyword) {
    const kw = String(keyword).trim().toLowerCase();
    results = results.filter(h => {
      const area = db.areas.find(a => a.area_id === h.area_id)?.name.toLowerCase() || "";
      const name = (h.hostel_name || "").toLowerCase();
      const desc = (h.description || "").toLowerCase();
      const address = (h.address_line || "").toLowerCase();
      return name.includes(kw) || desc.includes(kw) || area.includes(kw) || address.includes(kw);
    });
  }

  const p = Number(page) || 0;
  const s = Number(size) || 10;
  const paginated = results.slice(p * s, (p + 1) * s);
  const items = paginated.map(h => mapHostelCard(h, db));

  res.json({ items });
});

app.get("/api/public/hostels/:id", (req, res) => {
  const id = Number(req.params.id);
  const db = loadDb();
  const hostel = db.hostels.find(h => h.hostel_id === id);
  if (!hostel || hostel.status !== "PUBLISHED") {
    return res.status(404).json({ message: "Hostel not found" });
  }
  res.json(mapHostelDetails(hostel, db));
});

// ----------------------------------------------------
// 2. AUTH ENDPOINTS
// ----------------------------------------------------

app.post("/api/auth/send-otp", (req, res) => {
  const { identifier } = req.body || {};
  if (!identifier) {
    return res.status(400).json({ message: "identifier is required" });
  }
  const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
  const db = loadDb();
  db.otp_verifications.push({
    id: Date.now(),
    identifier: String(identifier).trim().toLowerCase(),
    otp_code: otpCode,
    expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    is_verified: false,
    created_at: new Date().toISOString()
  });
  saveDb();

  res.json({
    message: "OTP sent successfully",
    dev_otp: otpCode
  });
});

app.post("/api/auth/verify-otp", (req, res) => {
  const { identifier, otpCode } = req.body || {};
  if (!identifier || !otpCode) {
    return res.status(400).json({ message: "identifier and otpCode are required" });
  }
  const cleanId = String(identifier).trim().toLowerCase();
  const db = loadDb();
  const otpRecord = [...db.otp_verifications].reverse().find(o => o.identifier === cleanId && o.otp_code === String(otpCode));

  if (!otpRecord) {
    return res.status(400).json({ message: "Invalid or expired OTP" });
  }
  otpRecord.is_verified = true;
  saveDb();

  const user = db.users.find(u => u.email.toLowerCase() === cleanId || u.phone === identifier.trim());
  if (user) {
    if (user.status !== "ACTIVE") {
      return res.status(403).json({ message: "User is blocked" });
    }
    const token = createToken(user);
    return res.json({ accessToken: token, role: user.role });
  }

  res.json({
    message: "OTP Verified. Proceed to signup.",
    verified: true,
    requiresSignup: true
  });
});

app.post("/api/auth/login", (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ message: "Email and password required" });
  }
  const db = loadDb();
  const user = db.users.find(u => u.email.toLowerCase() === String(email).trim().toLowerCase());
  if (!user) {
    return res.status(401).json({ message: "Invalid email or password" });
  }
  if (user.status !== "ACTIVE") {
    return res.status(403).json({ message: "User is blocked" });
  }
  if (!bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ message: "Invalid email or password" });
  }

  const token = createToken(user);
  res.json({ accessToken: token, role: user.role });
});

app.post("/api/auth/register/student", (req, res) => {
  const { name, email, phone, password } = req.body || {};
  if (!name || !email || !phone || !password) {
    return res.status(400).json({ message: "All fields are required" });
  }
  const db = loadDb();
  const cleanEmail = String(email).trim().toLowerCase();
  if (db.users.some(u => u.email.toLowerCase() === cleanEmail)) {
    return res.status(400).json({ message: "Email already in use" });
  }

  const user = {
    id: db.users.length > 0 ? Math.max(...db.users.map(u => u.id)) + 1 : 1,
    role: "STUDENT",
    name: name.trim(),
    email: cleanEmail,
    phone: phone.trim(),
    password_hash: bcrypt.hashSync(password, 10),
    status: "ACTIVE",
    created_at: new Date().toISOString()
  };

  db.users.push(user);
  saveDb();

  const token = createToken(user);
  res.json({ accessToken: token, role: user.role });
});

app.post("/api/auth/register/owner", (req, res) => {
  const { name, email, phone, password } = req.body || {};
  if (!name || !email || !phone || !password) {
    return res.status(400).json({ message: "All fields are required" });
  }
  const db = loadDb();
  const cleanEmail = String(email).trim().toLowerCase();
  if (db.users.some(u => u.email.toLowerCase() === cleanEmail)) {
    return res.status(400).json({ message: "Email already in use" });
  }
  if (db.users.some(u => u.phone === phone.trim())) {
    return res.status(400).json({ message: "Phone number already registered" });
  }

  const user = {
    id: db.users.length > 0 ? Math.max(...db.users.map(u => u.id)) + 1 : 1,
    role: "OWNER",
    name: name.trim(),
    email: cleanEmail,
    phone: phone.trim(),
    password_hash: bcrypt.hashSync(password, 10),
    status: "ACTIVE",
    created_at: new Date().toISOString()
  };

  db.users.push(user);
  db.hostel_owners.push({
    user_id: user.id,
    owner_status: "PENDING_VERIFICATION",
    verified_at: null,
    rejection_reason: null,
    created_at: new Date().toISOString()
  });
  saveDb();

  const token = createToken(user);
  res.json({ accessToken: token, role: user.role });
});

app.get("/api/auth/me", authenticate, (req, res) => {
  const user = req.user;
  const db = loadDb();
  const resp = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role
  };
  if (user.role === "OWNER") {
    const ho = db.hostel_owners.find(h => h.user_id === user.id);
    resp.ownerStatus = ho ? ho.owner_status : "PENDING_VERIFICATION";
  }
  res.json(resp);
});

// ----------------------------------------------------
// 3. STUDENT INQUIRY ENDPOINTS
// ----------------------------------------------------

app.post("/api/student/inquiries", authenticate, (req, res) => {
  if (req.user.role !== "STUDENT") {
    return res.status(403).json({ message: "Only students can send inquiries" });
  }
  const { hostelId, requestedRoomCount, message, requestType } = req.body || {};
  const db = loadDb();
  const hostel = db.hostels.find(h => h.hostel_id === Number(hostelId));
  if (!hostel) {
    return res.status(404).json({ message: "Hostel not found" });
  }

  const inq = {
    inquiry_id: db.inquiries.length > 0 ? Math.max(...db.inquiries.map(i => i.inquiry_id)) + 1 : 1,
    hostel_id: hostel.hostel_id,
    student_user_id: req.user.id,
    requested_room_count: Number(requestedRoomCount) || 1,
    message: message || "",
    request_type: requestType ? String(requestType).toUpperCase() : "INQUIRY",
    status: "PENDING",
    owner_note: null,
    created_at: new Date().toISOString()
  };

  db.inquiries.push(inq);
  saveDb();
  res.status(200).json({ message: "Inquiry sent successfully" });
});

app.get("/api/student/inquiries", authenticate, (req, res) => {
  if (req.user.role !== "STUDENT") {
    return res.status(403).json({ message: "Only students can view this" });
  }
  const db = loadDb();
  const studentInqs = db.inquiries
    .filter(i => i.student_user_id === req.user.id)
    .sort((a, b) => b.inquiry_id - a.inquiry_id);

  const items = studentInqs.map(i => {
    const h = db.hostels.find(h => h.hostel_id === i.hostel_id);
    const area = h ? db.areas.find(a => a.area_id === h.area_id) : null;
    return {
      id: i.inquiry_id,
      hostelId: i.hostel_id,
      hostelName: h ? h.hostel_name : "Unknown Hostel",
      areaName: area ? area.name : "",
      requestType: i.request_type,
      status: i.status,
      requestedRoomCount: i.requested_room_count,
      message: i.message,
      studentName: req.user.name,
      studentPhone: req.user.phone,
      ownerNote: i.owner_note
    };
  });

  res.json(items);
});

// ----------------------------------------------------
// 4. OWNER HOSTEL ENDPOINTS
// ----------------------------------------------------

function calculateHostelTotals(roomTypes) {
  let minPrice = 0;
  let totalRooms = 0;
  let availableRooms = 0;
  if (Array.isArray(roomTypes) && roomTypes.length > 0) {
    minPrice = Math.min(...roomTypes.map(rt => Number(rt.pricePerMonth || rt.price_per_month) || 0));
    totalRooms = roomTypes.reduce((sum, rt) => sum + (Number(rt.totalRooms || rt.total_rooms) || 0), 0);
    availableRooms = roomTypes.reduce((sum, rt) => sum + (Number(rt.availableRooms || rt.available_rooms) || 0), 0);
  }
  return { minPrice, totalRooms, availableRooms };
}

app.get("/api/owner/hostels", authenticate, (req, res) => {
  if (req.user.role !== "OWNER") {
    return res.status(403).json({ message: "Only owners can view this" });
  }
  const db = loadDb();
  const myHostels = db.hostels.filter(h => h.owner_user_id === req.user.id);
  res.json(myHostels.map(h => mapHostelDetails(h, db)));
});

app.post("/api/owner/hostels", authenticate, (req, res) => {
  if (req.user.role !== "OWNER") {
    return res.status(403).json({ message: "Only owners can create hostels" });
  }
  const { hostelName, cityId, areaId, addressLine, description, imageUrl, genderType, messAvailable, roomTypes = [], facilityIds = [] } = req.body || {};
  if (!hostelName || !addressLine || !genderType) {
    return res.status(400).json({ message: "Hostel name, address, and gender type are required" });
  }

  const db = loadDb();
  const newId = db.hostels.length > 0 ? Math.max(...db.hostels.map(h => h.hostel_id)) + 1 : 1;
  const { minPrice, totalRooms, availableRooms } = calculateHostelTotals(roomTypes);

  const formattedRoomTypes = roomTypes.map((rt, idx) => ({
    room_type_id: rt.id || idx + 1,
    hostel_id: newId,
    room_type: rt.roomType || rt.room_type,
    price_per_month: Number(rt.pricePerMonth || rt.price_per_month) || 0,
    total_rooms: Number(rt.totalRooms || rt.total_rooms) || 0,
    available_rooms: Number(rt.availableRooms || rt.available_rooms) || 0
  }));

  const hostel = {
    hostel_id: newId,
    owner_user_id: req.user.id,
    city_id: Number(cityId) || 1,
    area_id: Number(areaId) || 1,
    hostel_name: hostelName.trim(),
    address_line: addressLine.trim(),
    description: description ? description.trim() : "",
    image_url: imageUrl || "/img/hostel_image_1.png",
    price_per_month: minPrice,
    gender_type: String(genderType).toUpperCase(),
    mess_available: Boolean(messAvailable),
    status: "DRAFT",
    total_rooms: totalRooms,
    available_rooms: availableRooms,
    facilities: (facilityIds || []).map(Number),
    room_types: formattedRoomTypes,
    images: imageUrl ? [{ image_id: 1, hostel_id: newId, image_url: imageUrl, display_order: 0, created_at: new Date().toISOString() }] : [],
    created_at: new Date().toISOString()
  };

  db.hostels.push(hostel);
  saveDb();
  res.status(201).json(mapHostelDetails(hostel, db));
});

app.put("/api/owner/hostels/:id", authenticate, (req, res) => {
  const id = Number(req.params.id);
  const db = loadDb();
  const hostel = db.hostels.find(h => h.hostel_id === id);
  if (!hostel) return res.status(404).json({ message: "Hostel not found" });
  if (hostel.owner_user_id !== req.user.id) return res.status(403).json({ message: "Not your hostel" });

  const { hostelName, addressLine, description, imageUrl, genderType, messAvailable, roomTypes = [], facilityIds = [] } = req.body || {};
  const { minPrice, totalRooms, availableRooms } = calculateHostelTotals(roomTypes);

  hostel.hostel_name = hostelName ? hostelName.trim() : hostel.hostel_name;
  hostel.address_line = addressLine ? addressLine.trim() : hostel.address_line;
  hostel.description = description !== undefined ? description.trim() : hostel.description;
  if (imageUrl) hostel.image_url = imageUrl;
  if (genderType) hostel.gender_type = String(genderType).toUpperCase();
  if (messAvailable !== undefined) hostel.mess_available = Boolean(messAvailable);

  hostel.room_types = roomTypes.map((rt, idx) => ({
    room_type_id: rt.id || idx + 1,
    hostel_id: id,
    room_type: rt.roomType || rt.room_type,
    price_per_month: Number(rt.pricePerMonth || rt.price_per_month) || 0,
    total_rooms: Number(rt.totalRooms || rt.total_rooms) || 0,
    available_rooms: Number(rt.availableRooms || rt.available_rooms) || 0
  }));

  hostel.price_per_month = minPrice;
  hostel.total_rooms = totalRooms;
  hostel.available_rooms = availableRooms;
  if (facilityIds) hostel.facilities = facilityIds.map(Number);

  saveDb();
  res.json(mapHostelDetails(hostel, db));
});

app.delete("/api/owner/hostels/:id", authenticate, (req, res) => {
  const id = Number(req.params.id);
  const db = loadDb();
  const idx = db.hostels.findIndex(h => h.hostel_id === id);
  if (idx === -1) return res.status(404).json({ message: "Hostel not found" });
  if (db.hostels[idx].owner_user_id !== req.user.id) return res.status(403).json({ message: "Not your hostel" });

  db.hostels.splice(idx, 1);
  saveDb();
  res.status(204).end();
});

app.patch("/api/owner/hostels/:id/publish", authenticate, (req, res) => {
  const id = Number(req.params.id);
  const db = loadDb();
  const hostel = db.hostels.find(h => h.hostel_id === id);
  if (!hostel) return res.status(404).json({ message: "Hostel not found" });
  if (hostel.owner_user_id !== req.user.id) return res.status(403).json({ message: "Not your hostel" });

  hostel.status = "PUBLISHED";
  saveDb();
  res.json(mapHostelDetails(hostel, db));
});

app.get("/api/owner/hostels/:id/images", authenticate, (req, res) => {
  const id = Number(req.params.id);
  const db = loadDb();
  const hostel = db.hostels.find(h => h.hostel_id === id);
  if (!hostel) return res.status(404).json({ message: "Hostel not found" });
  if (hostel.owner_user_id !== req.user.id) return res.status(403).json({ message: "Not your hostel" });

  const imgs = (hostel.images || []).map(img => ({
    id: img.image_id,
    imageUrl: img.image_url,
    displayOrder: img.display_order
  }));
  res.json(imgs);
});

app.post("/api/owner/hostels/:id/images", authenticate, upload.array("files", 10), (req, res) => {
  const id = Number(req.params.id);
  const db = loadDb();
  const hostel = db.hostels.find(h => h.hostel_id === id);
  if (!hostel) return res.status(404).json({ message: "Hostel not found" });
  if (hostel.owner_user_id !== req.user.id) return res.status(403).json({ message: "Not your hostel" });

  if (!hostel.images) hostel.images = [];
  const added = [];

  if (req.files && req.files.length > 0) {
    req.files.forEach(f => {
      const imgId = hostel.images.length > 0 ? Math.max(...hostel.images.map(i => i.image_id)) + 1 : 1;
      const imgObj = {
        image_id: imgId,
        hostel_id: id,
        image_url: `/uploads/${f.filename}`,
        display_order: hostel.images.length,
        created_at: new Date().toISOString()
      };
      hostel.images.push(imgObj);
      added.push(imgObj);
    });
  } else if (req.body.imageUrl) {
    const imgId = hostel.images.length > 0 ? Math.max(...hostel.images.map(i => i.image_id)) + 1 : 1;
    const imgObj = {
      image_id: imgId,
      hostel_id: id,
      image_url: req.body.imageUrl,
      display_order: hostel.images.length,
      created_at: new Date().toISOString()
    };
    hostel.images.push(imgObj);
    added.push(imgObj);
  }

  saveDb();
  res.json(added.map(img => ({ id: img.image_id, imageUrl: img.image_url, displayOrder: img.display_order })));
});

app.delete("/api/owner/hostels/:hostelId/images/:imageId", authenticate, (req, res) => {
  const hostelId = Number(req.params.hostelId);
  const imageId = Number(req.params.imageId);
  const db = loadDb();
  const hostel = db.hostels.find(h => h.hostel_id === hostelId);
  if (!hostel) return res.status(404).json({ message: "Hostel not found" });
  if (hostel.owner_user_id !== req.user.id) return res.status(403).json({ message: "Not your hostel" });

  if (hostel.images) {
    const idx = hostel.images.findIndex(img => img.image_id === imageId);
    if (idx !== -1) {
      hostel.images.splice(idx, 1);
      saveDb();
    }
  }
  res.status(204).end();
});

app.patch("/api/owner/hostels/:id/images/reorder", authenticate, (req, res) => {
  const id = Number(req.params.id);
  const db = loadDb();
  const hostel = db.hostels.find(h => h.hostel_id === id);
  if (!hostel) return res.status(404).json({ message: "Hostel not found" });
  if (hostel.owner_user_id !== req.user.id) return res.status(403).json({ message: "Not your hostel" });

  const { imageIds = [] } = req.body || {};
  if (hostel.images) {
    imageIds.forEach((imgId, order) => {
      const img = hostel.images.find(i => i.image_id === Number(imgId));
      if (img) img.display_order = order;
    });
    hostel.images.sort((a, b) => a.display_order - b.display_order);
    saveDb();
  }
  res.json(mapHostelDetails(hostel, db));
});

// ----------------------------------------------------
// 5. OWNER INQUIRY ENDPOINTS
// ----------------------------------------------------

app.get("/api/owner/inquiries", authenticate, (req, res) => {
  if (req.user.role !== "OWNER") {
    return res.status(403).json({ message: "Only owners can view this" });
  }
  const db = loadDb();
  const myHostelIds = db.hostels.filter(h => h.owner_user_id === req.user.id).map(h => h.hostel_id);
  const inquiries = db.inquiries
    .filter(i => myHostelIds.includes(i.hostel_id))
    .sort((a, b) => b.inquiry_id - a.inquiry_id);

  const items = inquiries.map(i => {
    const h = db.hostels.find(h => h.hostel_id === i.hostel_id);
    const area = h ? db.areas.find(a => a.area_id === h.area_id) : null;
    const student = db.users.find(u => u.id === i.student_user_id);
    return {
      id: i.inquiry_id,
      hostelId: i.hostel_id,
      hostelName: h ? h.hostel_name : "Unknown Hostel",
      areaName: area ? area.name : "",
      requestType: i.request_type,
      status: i.status,
      requestedRoomCount: i.requested_room_count,
      message: i.message,
      studentName: student ? student.name : "Student",
      studentPhone: student ? student.phone : "",
      ownerNote: i.owner_note
    };
  });

  res.json(items);
});

app.patch("/api/owner/inquiries/:id/status", authenticate, (req, res) => {
  if (req.user.role !== "OWNER") {
    return res.status(403).json({ message: "Only owners can update inquiries" });
  }
  const id = Number(req.params.id);
  const { status, ownerNote } = req.body || {};
  const db = loadDb();
  const inq = db.inquiries.find(i => i.inquiry_id === id);
  if (!inq) return res.status(404).json({ message: "Inquiry not found" });

  const hostel = db.hostels.find(h => h.hostel_id === inq.hostel_id);
  if (!hostel || hostel.owner_user_id !== req.user.id) {
    return res.status(403).json({ message: "Not your inquiry" });
  }

  inq.status = status;
  if (ownerNote !== undefined) inq.owner_note = ownerNote;
  saveDb();

  res.json({ message: "Status updated" });
});

// ----------------------------------------------------
// 6. ADMIN ENDPOINTS
// ----------------------------------------------------

app.get("/api/admin/hostels", (req, res) => {
  const db = loadDb();
  const items = db.hostels.map(h => {
    const area = db.areas.find(a => a.area_id === h.area_id);
    const city = db.cities.find(c => c.city_id === h.city_id);
    return {
      id: h.hostel_id,
      hostelName: h.hostel_name,
      areaName: area ? area.name : null,
      cityName: city ? city.name : null,
      pricePerMonth: Number(h.price_per_month) || 0,
      status: h.status
    };
  });
  res.json(items);
});

app.patch("/api/admin/hostels/:id/status", (req, res) => {
  const id = Number(req.params.id);
  const { status } = req.body || {};
  const db = loadDb();
  const hostel = db.hostels.find(h => h.hostel_id === id);
  if (!hostel) return res.status(404).json({ message: "Hostel not found" });

  hostel.status = status;
  saveDb();
  res.json({ message: "Hostel status updated" });
});

app.delete("/api/admin/hostels/:id", (req, res) => {
  const id = Number(req.params.id);
  const db = loadDb();
  const idx = db.hostels.findIndex(h => h.hostel_id === id);
  if (idx === -1) return res.status(404).json({ message: "Hostel not found" });

  db.hostels.splice(idx, 1);
  saveDb();
  res.status(204).end();
});

app.get("/api/admin/owners", authenticate, (req, res) => {
  if (req.user.role !== "ADMIN") return res.status(403).json({ message: "Admin only" });
  const status = req.query.status || "PENDING_VERIFICATION";
  const db = loadDb();

  const owners = db.hostel_owners
    .filter(ho => ho.owner_status === status)
    .map(ho => {
      const u = db.users.find(u => u.id === ho.user_id);
      const docs = db.owner_documents.filter(d => d.owner_user_id === ho.user_id && d.doc_type === "AADHAR");
      const latestDoc = docs.length > 0 ? docs[docs.length - 1] : null;
      return {
        ownerUserId: ho.user_id,
        name: u ? u.name : "Owner",
        email: u ? u.email : "",
        phone: u ? u.phone : "",
        ownerStatus: ho.owner_status,
        aadhaarUrl: latestDoc ? latestDoc.file_url : null
      };
    });

  res.json(owners);
});

app.post("/api/admin/owners/:id/approve", authenticate, (req, res) => {
  if (req.user.role !== "ADMIN") return res.status(403).json({ message: "Admin only" });
  const id = Number(req.params.id);
  const db = loadDb();
  const ho = db.hostel_owners.find(h => h.user_id === id);
  if (!ho) return res.status(404).json({ message: "Owner not found" });

  ho.owner_status = "VERIFIED";
  ho.verified_at = new Date().toISOString();
  saveDb();
  res.json({ message: "Owner approved" });
});

app.post("/api/admin/owners/:id/reject", authenticate, (req, res) => {
  if (req.user.role !== "ADMIN") return res.status(403).json({ message: "Admin only" });
  const id = Number(req.params.id);
  const db = loadDb();
  const ho = db.hostel_owners.find(h => h.user_id === id);
  if (!ho) return res.status(404).json({ message: "Owner not found" });

  ho.owner_status = "REJECTED";
  saveDb();
  res.json({ message: "Owner rejected" });
});

app.post("/api/admin/owners/:id/block", authenticate, (req, res) => {
  if (req.user.role !== "ADMIN") return res.status(403).json({ message: "Admin only" });
  const id = Number(req.params.id);
  const db = loadDb();
  const ho = db.hostel_owners.find(h => h.user_id === id);
  if (!ho) return res.status(404).json({ message: "Owner not found" });

  ho.owner_status = "BLOCKED";
  saveDb();
  res.json({ message: "Owner blocked" });
});

app.get("/api/admin/verifications", authenticate, (req, res) => {
  if (req.user.role !== "ADMIN") return res.status(403).json({ message: "Admin only" });
  const db = loadDb();
  const items = [...db.owner_documents].reverse().map(d => {
    const u = db.users.find(u => u.id === d.owner_user_id);
    return {
      documentId: d.document_id,
      ownerUserId: d.owner_user_id,
      ownerName: u ? u.name : "Owner",
      fileUrl: d.file_url,
      submittedAt: d.submitted_at,
      status: d.admin_status
    };
  });
  res.json(items);
});

app.put("/api/admin/verifications/:id", authenticate, (req, res) => {
  if (req.user.role !== "ADMIN") return res.status(403).json({ message: "Admin only" });
  const id = Number(req.params.id);
  const { action, note } = req.body || {};
  const db = loadDb();
  const doc = db.owner_documents.find(d => d.document_id === id);
  if (!doc) return res.status(404).json({ message: "Document not found" });

  const isApprove = String(action).toUpperCase() === "APPROVE";
  doc.admin_status = isApprove ? "APPROVED" : "REJECTED";
  doc.admin_note = note || "";

  const ho = db.hostel_owners.find(h => h.user_id === doc.owner_user_id);
  if (ho) {
    ho.owner_status = isApprove ? "VERIFIED" : "REJECTED";
    if (isApprove) ho.verified_at = new Date().toISOString();
    if (note) ho.rejection_reason = note;
  }

  saveDb();
  res.json({ message: "Verification updated successfully" });
});

// ----------------------------------------------------
// 7. VERIFICATION (DOCUMENT UPLOAD) ENDPOINTS
// ----------------------------------------------------

app.post("/api/verification/upload", authenticate, upload.single("file"), (req, res) => {
  if (req.user.role !== "OWNER") {
    return res.status(403).json({ message: "Only owners can upload verification documents" });
  }

  const db = loadDb();
  const fileUrl = req.file ? `/uploads/${req.file.filename}` : "/uploads/default_doc.pdf";

  const doc = {
    document_id: db.owner_documents.length > 0 ? Math.max(...db.owner_documents.map(d => d.document_id)) + 1 : 1,
    owner_user_id: req.user.id,
    doc_type: "AADHAR",
    file_url: fileUrl,
    file_mime: req.file ? req.file.mimetype : "application/pdf",
    file_size_bytes: req.file ? req.file.size : 1024,
    admin_status: "UPLOADED",
    admin_note: "",
    submitted_at: new Date().toISOString()
  };

  db.owner_documents.push(doc);
  saveDb();

  res.json({ message: "Document uploaded successfully", url: doc.file_url });
});

app.get("/api/verification/status", authenticate, (req, res) => {
  if (req.user.role !== "OWNER") {
    return res.status(403).json({ message: "Only owners can check status here" });
  }
  const db = loadDb();
  const docs = db.owner_documents.filter(d => d.owner_user_id === req.user.id);
  if (docs.length === 0) {
    return res.json({ status: "NO_DOCUMENT_UPLOADED" });
  }
  const latestDoc = docs[docs.length - 1];
  res.json({
    status: latestDoc.admin_status,
    note: latestDoc.admin_note || "",
    documentUrl: latestDoc.file_url
  });
});

module.exports = app;

