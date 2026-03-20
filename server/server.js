const express = require("express");
const fetch = require("node-fetch");
const fs = require("fs");

const app = express();
app.use(express.json());
app.use(require("cors")());

const PORT = process.env.PORT || 3000;
const DB_FILE = "./db.json";

// Load DB
let db = {};
if (fs.existsSync(DB_FILE)) {
  db = JSON.parse(fs.readFileSync(DB_FILE));
}

// Save DB
function saveDB() {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

// Dodge endpoint
function getDodgeURL(vin) {
  return `https://www.dodge.com/hostc/windowSticker.do?vin=${vin}`;
}

// Main route
app.get("/sticker/:vin", async (req, res) => {
  const vin = req.params.vin.toUpperCase();

  // Check cache first
  if (db[vin]) {
    return res.json({
      success: true,
      cached: true,
      url: db[vin]
    });
  }

  try {
    const url = getDodgeURL(vin);

    // 🔥 Updated fetch with headers
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        "Accept": "application/pdf"
      }
    });

    // If request succeeded, assume valid sticker
    if (response.status === 200) {
      db[vin] = url;
      saveDB();

      return res.json({
        success: true,
        cached: false,
        url
      });
    }

    return res.json({
      success: false,
      message: "No sticker found"
    });

  } catch (err) {
    console.error(err);
    return res.json({
      success: false,
      message: "Error fetching sticker"
    });
  }
});

// Upload route (future use)
app.post("/upload", (req, res) => {
  const { vin, url } = req.body;

  if (!vin || !url) {
    return res.json({ success: false });
  }

  db[vin.toUpperCase()] = url;
  saveDB();

  res.json({ success: true });
});

app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});
