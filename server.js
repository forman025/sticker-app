const express = require("express");
const fetch = require("node-fetch");
const fs = require("fs");
const path = require("path");

const app = express();
app.use(express.json());
app.use(require("cors")());

const PORT = process.env.PORT || 3000;

const GITHUB_BASE = "https://raw.githubusercontent.com/forman025/sticker-app/main";

const DB_FILE = "./db.json";
const REQUESTS_FILE = "./requests.json";
const STICKER_DIR = path.join(__dirname, "stickers");

let searchCount = 0;

if (!fs.existsSync(STICKER_DIR)) {
  fs.mkdirSync(STICKER_DIR);
}

let db = {};
if (fs.existsSync(DB_FILE)) {
  try {
    db = JSON.parse(fs.readFileSync(DB_FILE));
  } catch {
    db = {};
  }
}

function saveDB() {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

app.use("/stickers", express.static(STICKER_DIR));

function getDodgeURL(vin) {
  return `https://www.dodge.com/hostc/windowSticker.do?vin=${vin}`;
}

app.get("/sticker/:vin", async (req, res) => {
  searchCount++;

  const vin = req.params.vin.toUpperCase();

  // ✅ CACHE
  if (db[vin] && db[vin].file) {
    return res.json({
      success: true,
      cached: true,
      url: `${GITHUB_BASE}/${db[vin].file}`
    });
  }

  const dodgeURL = getDodgeURL(vin);

  try {
    const response = await fetch(dodgeURL, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        "Accept": "application/pdf"
      }
    });

    const buffer = await response.buffer();

    // ✅ ONLY SAVE REAL PDFs
    if (response.status === 200 && buffer.length > 10000) {
      const filename = `${vin}.pdf`;
      const fullPath = path.join(STICKER_DIR, filename);

      fs.writeFileSync(fullPath, buffer);

      db[vin] = {
        file: `stickers/${filename}`,
        timestamp: Date.now()
      };

      saveDB();

      return res.json({
        success: true,
        cached: false,
        url: `${GITHUB_BASE}/stickers/${filename}`
      });
    }

  } catch (err) {
    console.log(err);
  }

  // ❌ DO NOT SAVE — JUST FALLBACK
  return res.json({
    success: true,
    cached: false,
    fallback: true,
    url: dodgeURL
  });
});

app.post("/request", (req, res) => {
  const { vin, email } = req.body;

  let requests = [];
  if (fs.existsSync(REQUESTS_FILE)) {
    try {
      requests = JSON.parse(fs.readFileSync(REQUESTS_FILE));
    } catch {
      requests = [];
    }
  }

  requests.push({
    vin,
    email,
    timestamp: Date.now()
  });

  fs.writeFileSync(REQUESTS_FILE, JSON.stringify(requests, null, 2));

  res.json({ success: true });
});

app.get("/stats", (req, res) => {
  res.json({ searches: searchCount });
});

app.get("/", (req, res) => {
  res.send("Mopar Sticker API running");
});

app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});
