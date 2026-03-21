const express = require("express");
const fetch = require("node-fetch");
const fs = require("fs");

const app = express();
app.use(express.json());
app.use(require("cors")());

const PORT = process.env.PORT || 3000;

const OWNER = "forman025";
const REPO = "sticker-app";
const BRANCH = "main";

const GITHUB_BASE = `https://raw.githubusercontent.com/${OWNER}/${REPO}/${BRANCH}`;
const GITHUB_API = `https://api.github.com/repos/${OWNER}/${REPO}/contents`;

const TOKEN = process.env.GITHUB_TOKEN;

const DB_FILE = "./db.json";

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

function getDodgeURL(vin) {
  return `https://www.dodge.com/hostc/windowSticker.do?vin=${vin}`;
}

// 🔥 upload helper (background)
async function uploadToGitHub(vin, buffer) {
  const filePath = `stickers/${vin}.pdf`;
  const base64 = buffer.toString("base64");

  try {
    await fetch(`${GITHUB_API}/${filePath}`, {
      method: "PUT",
      headers: {
        Authorization: `token ${TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        message: `Add ${vin}`,
        content: base64,
        branch: BRANCH
      })
    });

    db[vin] = {
      file: filePath,
      timestamp: Date.now()
    };

    saveDB();

    console.log("Uploaded:", vin);
  } catch (err) {
    console.log("Upload failed:", err);
  }
}

// 🔥 MAIN ROUTE
app.get("/sticker/:vin", async (req, res) => {
  const vin = req.params.vin.toUpperCase();
  const dodgeURL = getDodgeURL(vin);

  try {
    const response = await fetch(dodgeURL, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        "Accept": "application/pdf"
      }
    });

    const buffer = await response.buffer();

    // ✅ VALID PDF FROM DODGE
    if (response.status === 200 && buffer.length > 10000) {

      // 🔥 RETURN DODGE IMMEDIATELY (NO 404 EVER)
      res.json({
        success: true,
        source: "dodge",
        url: dodgeURL
      });

      // 🔥 BACKGROUND: upload + save
      if (!db[vin]) {
        uploadToGitHub(vin, buffer);
      }

      return;
    }

  } catch (err) {
    console.log("Dodge fetch failed:", err);
  }

  // ❌ Dodge failed → fallback to GitHub if exists
  if (db[vin] && db[vin].file) {
    return res.json({
      success: true,
      source: "cache",
      url: `${GITHUB_BASE}/${db[vin].file}`
    });
  }

  return res.json({
    success: false
  });
});

app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});
