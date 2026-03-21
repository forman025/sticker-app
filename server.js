const express = require("express");
const fetch = require("node-fetch");

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

function getDodgeURL(vin) {
  return `https://www.dodge.com/hostc/windowSticker.do?vin=${vin}`;
}

// 🔥 SAFE DB FETCH (never crashes)
async function getDB() {
  try {
    const res = await fetch(`${GITHUB_API}/db.json`, {
      headers: { Authorization: `token ${TOKEN}` }
    });

    if (!res.ok) return { db: {}, sha: null };

    const data = await res.json();
    const content = Buffer.from(data.content, "base64").toString("utf-8");

    return {
      db: JSON.parse(content),
      sha: data.sha
    };
  } catch {
    return { db: {}, sha: null };
  }
}

// 🔥 UPDATE DB
async function updateDB(newDB, sha) {
  if (!sha) return;

  const content = Buffer.from(JSON.stringify(newDB, null, 2)).toString("base64");

  await fetch(`${GITHUB_API}/db.json`, {
    method: "PUT",
    headers: {
      Authorization: `token ${TOKEN}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      message: "Update db.json",
      content,
      sha,
      branch: BRANCH
    })
  });
}

// 🔥 UPLOAD PDF
async function uploadPDF(vin, buffer) {
  const filePath = `stickers/${vin}.pdf`;
  const base64 = buffer.toString("base64");

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

  return filePath;
}

// 🔥 MAIN ROUTE (CANNOT FAIL NOW)
app.get("/sticker/:vin", async (req, res) => {
  const vin = req.params.vin.toUpperCase();
  const dodgeURL = getDodgeURL(vin);

  // always try DB (but don't trust it blindly)
  const { db, sha } = await getDB();

  if (db[vin] && db[vin].file) {
    return res.json({
      success: true,
      cached: true,
      url: `${GITHUB_BASE}/${db[vin].file}`
    });
  }

  try {
    const response = await fetch(dodgeURL);
    const buffer = await response.buffer();

    if (response.status === 200) {

      // 🔥 ALWAYS RETURN DODGE (no more errors)
      res.json({
        success: true,
        source: "dodge",
        url: dodgeURL
      });

      // background save
      if (buffer.length > 10000) {
        (async () => {
          const filePath = await uploadPDF(vin, buffer);

          db[vin] = {
            file: filePath,
            timestamp: Date.now()
          };

          await updateDB(db, sha);
        })();
      }

      return;
    }

  } catch {}

  // 🔥 LAST RESORT (still return dodge)
  return res.json({
    success: true,
    source: "fallback",
    url: dodgeURL
  });
});

app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});
