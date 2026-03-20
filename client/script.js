const API = "http://localhost:3000";

async function lookup() {
  const vin = document.getElementById("vin").value.trim();
  const status = document.getElementById("status");
  const actions = document.getElementById("actions");

  status.innerText = "Fetching...";
  actions.innerHTML = "";

  const res = await fetch(`${API}/sticker/${vin}`);
  const data = await res.json();

  if (data.success) {
    status.innerText = data.cached ? "Loaded from cache" : "Sticker found";
    window.open(data.url, "_blank");
  } else {
    status.innerText = "No sticker found (common for SRT models)";

    actions.innerHTML = `
      <button onclick="searchGoogle('${vin}')">Search Google</button>
      <button onclick="uploadPrompt('${vin}')">Upload Sticker</button>
    `;
  }
}

function searchGoogle(vin) {
  window.open(`https://www.google.com/search?q=${vin}+window+sticker`);
}

function uploadPrompt(vin) {
  const url = prompt("Paste sticker URL:");
  if (!url) return;

  fetch(`${API}/upload`, {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({ vin, url })
  });

  alert("Saved!");
}
