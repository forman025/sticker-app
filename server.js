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
const REQUESTS_FILE = "./requests.json";

let searchCount = 0;

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

// 🔥 GET FILE SHA (if exists)
async function getFileSHA(path) {
  const res = await fetch(`${GITHUB_API}/${path}`, {
    headers: {
      Authorization: `token ${TOKEN}`
    }
  });

  if (res.status === 200) {
    const data = await res.json();
    return data.sha;
  }

  return null;
}

// 🔥 UPLOAD FILE (CREATE OR UPDATE)
async function uploadToGitHub(vin, buffer) {
  const filePath = `stickers/${vin}.pdf`;
  const base64 = buffer.toString("base64");

  const sha = await getFileSHA(filePath);

  const res = await fetch(`${GITHUB_API}/${filePath}`, {
    method: "PUT",
    headers: {
      Authorization: `token ${TOKEN}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      message: `Add/update sticker for ${vin}`,
      content: base64,
      branch: BRANCH,
      ...(sha && { sha })
    })
  });

  const data = await res.json();

  if (!res.ok) {
    console.log("GitHub upload error:", data);
    return null;
  }

  return filePath;
}

// 🔥 MAIN ROUTE
app.get("/sticker/:vin", async (req, res) => {
  searchCount++;

  const vin = req.params.vin.toUpperCase();

  // ✅ CHECK DB + VERIFY FILE EXISTS
  if (db[vin] && db[vin].file) {
    const githubURL = `${GITHUB_BASE}/${db[vin].file}`;

    try {
      const check = await fetch(githubURL, { method: "HEAD" });
      if (check.ok) {
        return res.json({
          success: true,
          cached: true,
          url: githubURL
        });
      }
    } catch {}
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

    if (response.status === 200 && buffer.length > 10000) {

      // 🔥 UPLOAD
      const filePath = await uploadToGitHub(vin, buffer);

      if (filePath) {
        db[vin] = {
          file: filePath,
          timestamp: Date.now()
        };

        saveDB();

        return res.json({
          success: true,
          cached: false,
          url: `${GITHUB_BASE}/${filePath}`
        });
      }
    }

  } catch (err) {
    console.log("Dodge fetch failed:", err);
  }

  return res.json({
    success: true,
    fallback: true,
    url: dodgeURL
  });
});

// REQUEST ROUTE
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

  requests.push({ vin, email, timestamp: Date.now() });

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
});const express = require("express");
const fetch = require("node-fetch");
const fs = require("fs");
const path = require("path");

const app = express();
app.use(express.json());
app.use(require("cors")());

const PORT = process.env.PORT || 3000;

const GITHUB_BASE = "https://raw.githubusercontent.com/forman025/sticker-app/main";
const GITHUB_API = "https://api.github.com/repos/forman025/sticker-app/contents";

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

const DB_FILE = "./db.json";
const REQUESTS_FILE = "./requests.json";

let searchCount = 0;

// load DB
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

// 🔥 MAIN ROUTE
app.get("/sticker/:vin", async (req, res) => {
  searchCount++;

  const vin = req.params.vin.toUpperCase();

  // ✅ STEP 1: CHECK DB + VERIFY GITHUB FILE
  if (db[vin] && db[vin].file) {
    const githubURL = `${GITHUB_BASE}/${db[vin].file}`;

    try {
      const check = await fetch(githubURL, { method: "HEAD" });

      if (check.ok) {
        return res.json({
          success: true,
          cached: true,
          url: githubURL
        });
      } else {
        console.log("Invalid DB entry, ignoring:", vin);
      }
    } catch (err) {
      console.log("GitHub check failed:", err);
    }
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

    // ✅ VALID PDF
    if (response.status === 200 && buffer.length > 10000) {

      const base64 = buffer.toString("base64");
      const filePath = `stickers/${vin}.pdf`;

      // 🔥 UPLOAD TO GITHUB
      const uploadRes = await fetch(`${GITHUB_API}/${filePath}`, {
        method: "PUT",
        headers: {
          Authorization: `token ${GITHUB_TOKEN}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          message: `Add sticker for ${vin}`,
          content: base64
        })
      });

      const uploadData = await uploadRes.json();

      if (uploadRes.ok) {
        // 🔥 SAVE TO DB
        db[vin] = {
          file: filePath,
          timestamp: Date.now()
        };

        saveDB();

        return res.json({
          success: true,
          cached: false,
          url: `${GITHUB_BASE}/${filePath}`
        });
      } else {
        console.log("GitHub upload failed:", uploadData);
      }
    }

  } catch (err) {
    console.log("Dodge fetch failed:", err);
  }

  // 🔥 FALLBACK
  return res.json({
    success: true,
    fallback: true,
    url: dodgeURL
  });
});

// 📩 REQUEST ROUTE
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

// 📊 STATS
app.get("/stats", (req, res) => {
  res.json({ searches: searchCount });
});

// ROOT
app.get("/", (req, res) => {
  res.send("Mopar Sticker API running");
});

app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});const express = require("express");
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
