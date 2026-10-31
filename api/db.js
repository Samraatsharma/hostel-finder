const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");

const DB_FILE = process.env.NODE_ENV === "production"
  ? path.join("/tmp", "hostel_finder_db.json")
  : path.join(__dirname, "..", "data", "hostel_finder_db.json");

const HASHED_DEMO_PASSWORD = bcrypt.hashSync("Demo@123", 10);

function getInitialData() {
  const areasList = [
    "Bhanwarkuan", "Vishnupuri", "Indrapuri", "Rau", "Khandwa Naka",
    "Geeta Bhawan", "Navlakha", "Bengali Square", "Pipliyahana", "Silicon City",
    "Vijay Nagar", "Scheme 54", "Scheme 78", "New Palasia", "Old Palasia",
    "Saket Nagar", "Nipania", "Super Corridor", "Musakhedi", "Pardeshipura",
    "Malwa Mill", "Azad Nagar", "Sudama Nagar", "Gumasta Nagar", "Chhawani",
    "Tukoganj", "Race Course Road", "MG Road", "Rajwada", "Siyaganj", "YN Road"
  ];

  const areas = areasList.map((name, index) => ({
    area_id: index + 1,
    city_id: 1,
    name
  }));

  const facilities = [
    { facility_id: 1, name: "WiFi" },
    { facility_id: 2, name: "AC" },
    { facility_id: 3, name: "Laundry" },
    { facility_id: 4, name: "Parking" },
    { facility_id: 5, name: "Water Purifier" },
    { facility_id: 6, name: "Power Backup" }
  ];

  const users = [
    {
      id: 1,
      role: "ADMIN",
      name: "Demo Admin",
      email: "admin@demo.com",
      phone: "9999990000",
      password_hash: HASHED_DEMO_PASSWORD,
      status: "ACTIVE",
      created_at: new Date().toISOString()
    },
    {
      id: 2,
      role: "OWNER",
      name: "Demo Owner",
      email: "owner@demo.com",
      phone: "9999990001",
      password_hash: HASHED_DEMO_PASSWORD,
      status: "ACTIVE",
      created_at: new Date().toISOString()
    },
    {
      id: 3,
      role: "STUDENT",
      name: "Demo Student",
      email: "student@demo.com",
      phone: "9999990002",
      password_hash: HASHED_DEMO_PASSWORD,
      status: "ACTIVE",
      created_at: new Date().toISOString()
    }
  ];

  const hostel_owners = [
    {
      user_id: 2,
      owner_status: "VERIFIED",
      verified_at: new Date().toISOString(),
      rejection_reason: null,
      created_at: new Date().toISOString()
    }
  ];

  const hostels = [
    {
      hostel_id: 1,
      owner_user_id: 2,
      city_id: 1,
      area_id: 1, // Bhanwarkuan
      hostel_name: "Shree Boys Hostel",
      address_line: "Near DAVV, Bhanwarkuan",
      description: "Well-maintained boys hostel with all basic amenities near coaching hub.",
      image_url: "/img/hostel_image_1.png",
      price_per_month: 6500.00,
      gender_type: "BOYS",
      mess_available: true,
      status: "PUBLISHED",
      total_rooms: 20,
      available_rooms: 6,
      facilities: [1, 3, 6],
      room_types: [
        {
          room_type_id: 1,
          hostel_id: 1,
          room_type: "Standard 2 Bed",
          price_per_month: 6500.00,
          total_rooms: 20,
          available_rooms: 6
        }
      ],
      images: [
        {
          image_id: 1,
          hostel_id: 1,
          image_url: "/img/hostel_image_1.png",
          display_order: 0,
          created_at: new Date().toISOString()
        }
      ],
      created_at: new Date().toISOString()
    },
    {
      hostel_id: 2,
      owner_user_id: 2,
      city_id: 1,
      area_id: 11, // Vijay Nagar
      hostel_name: "Galaxy Girls PG",
      address_line: "Scheme 54, Vijay Nagar",
      description: "Premium girls accommodation near C21 Mall with 24/7 security.",
      image_url: "/img/hostel_image_2.png",
      price_per_month: 8000.00,
      gender_type: "GIRLS",
      mess_available: true,
      status: "PUBLISHED",
      total_rooms: 15,
      available_rooms: 2,
      facilities: [1, 2, 5],
      room_types: [
        {
          room_type_id: 2,
          hostel_id: 2,
          room_type: "Deluxe 1 Bed",
          price_per_month: 8000.00,
          total_rooms: 15,
          available_rooms: 2
        }
      ],
      images: [
        {
          image_id: 2,
          hostel_id: 2,
          image_url: "/img/hostel_image_2.png",
          display_order: 0,
          created_at: new Date().toISOString()
        }
      ],
      created_at: new Date().toISOString()
    },
    {
      hostel_id: 3,
      owner_user_id: 2,
      city_id: 1,
      area_id: 15, // Old Palasia
      hostel_name: "Central Co-ed Hostel",
      address_line: "Palasia Square",
      description: "Modern co-ed hostel with excellent connectivity.",
      image_url: "/img/hostel_image_3.png",
      price_per_month: 9000.00,
      gender_type: "COED",
      mess_available: false,
      status: "PUBLISHED",
      total_rooms: 12,
      available_rooms: 0,
      facilities: [4],
      room_types: [
        {
          room_type_id: 3,
          hostel_id: 3,
          room_type: "Single Studio",
          price_per_month: 9000.00,
          total_rooms: 12,
          available_rooms: 0
        }
      ],
      images: [
        {
          image_id: 3,
          hostel_id: 3,
          image_url: "/img/hostel_image_3.png",
          display_order: 0,
          created_at: new Date().toISOString()
        }
      ],
      created_at: new Date().toISOString()
    }
  ];

  return {
    users,
    hostel_owners,
    owner_documents: [],
    cities: [{ city_id: 1, name: "Indore" }],
    areas,
    facilities,
    hostels,
    inquiries: [],
    otp_verifications: []
  };
}

let db = null;

function loadDb() {
  if (db) return db;
  try {
    if (fs.existsSync(DB_FILE)) {
      const content = fs.readFileSync(DB_FILE, "utf-8");
      db = JSON.parse(content);
      return db;
    }
  } catch (err) {
    console.warn("Could not read db file, initializing default:", err.message);
  }
  db = getInitialData();
  saveDb();
  return db;
}

function saveDb() {
  if (!db) return;
  try {
    const dir = path.dirname(DB_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
  } catch (err) {
    // Non-fatal if filesystem is read-only
  }
}

module.exports = {
  loadDb,
  saveDb,
  getInitialData
};

