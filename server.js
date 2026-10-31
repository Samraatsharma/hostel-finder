const express = require("express");
const path = require("path");
const apiApp = require("./api/index");

const app = express();
const PORT = process.env.PORT || 3000;

// Mount API
app.use(apiApp);

// Serve static frontend assets from root and frontend folder
app.use("/pages", express.static(path.join(__dirname, "pages")));
app.use("/css", express.static(path.join(__dirname, "css")));
app.use("/js", express.static(path.join(__dirname, "js")));
app.use("/img", express.static(path.join(__dirname, "img")));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Also support paths prefixed with /frontend/...
app.use("/frontend", express.static(path.join(__dirname, "frontend")));

// Root redirect to /pages/index.html
app.get("/", (req, res) => {
  res.redirect("/pages/index.html");
});

app.listen(PORT, () => {
  console.log(`===============================================`);
  console.log(`🏠 Hostel Finder Fullstack Server running!`);
  console.log(`   Frontend: http://localhost:${PORT}/pages/index.html`);
  console.log(`   API Base: http://localhost:${PORT}/api`);
  console.log(`===============================================`);
});

