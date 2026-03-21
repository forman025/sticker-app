console.log("FORCE NEW DEPLOY");

console.log("NEW CODE RUNNING");

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

// GET DB
async function getDB() {
  try {
    const res = await fetch(`${GITHUB_API}/db.json`, {
      headers: { Authorization: `token ${TOKEN}` }
    });

    if (!res.ok) {
      console.log("DB FETCH FAILED:", res.status);
      return {};
    }

    const data = await res.json();
    const content = Buffer.from(data.content, "base64").toString("utf-8");

    return JSON.parse(content);
  } catch (err) {
    console.log("DB ERROR:", err);
    return {};
  }
}

// UPDATE DB
async function updateDB(newDB) {
  try {
    const res = await fetch(`${GITHUB_API}/db.json`, {
      headers: { Authorization: `token ${TOKEN}` }
    });

    const data = await res.json();

    const content = Buffer
      .from(JSON.stringify(newDB, null, 2))
      .toString("base64");

    const update = await fetch(`${GITHUB_API}/db.json`, {
      method: "PUT",
      headers: {
        Authorization: `token ${TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        message: "Update db.json",
        content,
        sha: data.sha,
        branch: BRANCH
      })
    });

    console.log("DB UPDATE STATUS:", update.status);
    console.log(await update.text());

  } catch (err) {
    console.log("DB UPDATE ERROR:", err);
  }
}

// UPLOAD PDF
async function uploadPDF(vin, buffer) {
  console.log("TOKEN:", TOKEN ? "exists" : "missing");

  const filePath = `stickers/${vin}.pdf`;
  const base64 = buffer.toString("base64");

  try {
    const res = await fetch(`${GITHUB_API}/${filePath}`, {
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

    console.log("UPLOAD STATUS:", res.status);
    console.log(await res.text());

    if (!res.ok) return null;

    return filePath;

  } catch (err) {
    console.log("UPLOAD ERROR:", err);
    return null;
  }
}

// MAIN ROUTE
app.get("/sticker/:vin", async (req, res) => {
  const vin = req.params.vin.toUpperCase();
  const dodgeURL = getDodgeURL(vin);

  const db = await getDB();

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

    if (response.status === 200 && buffer.length > 10000) {

      const filePath = await uploadPDF(vin, buffer);

      if (filePath) {
        db[vin] = {
          file: filePath,
          timestamp: Date.now()
        };

        await updateDB(db);
      }

      return res.json({
        success: true,
        url: dodgeURL
      });
    }

  } catch (err) {
    console.log("DODGE ERROR:", err);
  }

  return res.json({
    success: true,
    url: dodgeURL
  });
});

app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});
