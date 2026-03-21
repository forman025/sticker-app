const express = require("express");
const fetch = require("node-fetch");
const fs = require("fs");
const path = require("path");

const app = express();
app.use(express.json());
app.use(require("cors")());

const PORT = process.env.PORT || 3000;

const DB_FILE = "./db.json";
const REQUESTS_FILE = "./requests.json";
const STICKER_DIR = path.join(__dirname, "stickers");

let searchCount = 0;

if (!fs.existsSync(STICKER_DIR)) {
  fs.mkdirSync(STICKER_DIR);
}

let db = {};
if (fs.existsSync(DB_FILE)) {
  db = JSON.parse(fs.readFileSync(DB_FILE));
}

function saveDB() {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

// serve PDFs
app.use("/stickers", express.static(STICKER_DIR));

function getDodgeURL(vin) {
  return `https://www.dodge.com/hostc/windowSticker.do?vin=${vin}`;
}

app.get("/sticker/:vin", async (req, res) => {
  searchCount++;

  const vin = req.params.vin.toUpperCase();

  // CACHE
  if (db[vin] && db[vin].file) {
    return res.json({
      success: true,
      cached: true,
      url: `http://localhost:${PORT}/${db[vin].file}`
    });
  }

  try {
    const url = getDodgeURL(vin);

    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        "Accept": "application/pdf"
      }
    });

    const buffer = await response.buffer();

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
        url: `http://localhost:${PORT}/stickers/${filename}`
      });
    }

  } catch (err) {
    console.log(err);
  }

  return res.json({
    success: false,
    fallback: {
      google: `https://www.google.com/search?q=${vin}+window+sticker`,
      iseecars: `https://www.iseecars.com/vin?vin=${vin}`
    }
  });
});

app.post("/request", (req, res) => {
  const { vin, email } = req.body;

  let requests = [];
  if (fs.existsSync(REQUESTS_FILE)) {
    requests = JSON.parse(fs.readFileSync(REQUESTS_FILE));
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

app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});
