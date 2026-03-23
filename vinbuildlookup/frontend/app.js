function formatOptions(d) {
  if (!d.packages || !d.packages.length) return "None";

  return d.packages.map(p => `
    <div style="display:flex; justify-content:space-between;">
      <span>${p.name || "Package"}</span>
      <span>${p.msrp ? `$${p.msrp}` : ""}</span>
    </div>
  `).join("");
}

function formatFeatures(d) {
  if (!d.features || !d.features.length) return "N/A";

  return d.features.map(f => `• ${f}`).join("<br>");
}

async function lookupVIN() {
  const vin = document.getElementById("vinInput").value.trim();
  const resultDiv = document.getElementById("result");

  if (vin.length !== 17) {
    resultDiv.innerHTML = "Invalid VIN";
    return;
  }

  resultDiv.innerHTML = "Loading...";

  try {
    const res = await fetch(`http://localhost:3000/api/decode/${vin}`);
    const json = await res.json();

    if (!json || !json.data) {
      resultDiv.innerHTML = "No data found";
      return;
    }

    const d = json.data;

    // 🔥 CLEAN TITLE
    let title = `${d.model?.toUpperCase() || ""} ${d.trim || ""} ${d.version || ""}`;
    title = title.replace("GT GT", "GT").trim();

    const optionsHTML = formatOptions(d);
    const featuresHTML = formatFeatures(d);

    resultDiv.innerHTML = `
      <div class="sticker">

        <div class="header">
          <div class="brand">
            ${d.year || ""} ${d.make?.toUpperCase() || ""}
          </div>

          <div class="model">
            ${title}
          </div>

          <div class="base-box">
            Base Price: $${d.msrp || "N/A"}
          </div>
        </div>

        <div class="columns">

          <!-- LEFT -->
          <div class="left">

            <div class="section">
              <div class="section-title">VEHICLE INFO</div><br>
              Engine: ${d.engine || "N/A"}<br>
              Transmission: ${d.transmission || "N/A"}<br>
              Drivetrain: ${d.drivetrain || "N/A"}<br>
              Fuel: ${d.fuel_type || "N/A"}<br>
              Body: ${d.body_type || "N/A"}<br>
              Exterior: ${d.exterior_color || "N/A"}<br>
              Interior: ${d.interior_color || "N/A"}
            </div>

            <div class="section">
              <div class="section-title">STANDARD EQUIPMENT</div><br>
              ${featuresHTML}
            </div>

          </div>

          <!-- RIGHT -->
          <div class="right">

            <div class="section">
              <div class="section-title">OPTIONAL EQUIPMENT</div><br>
              ${optionsHTML}
            </div>

            <div style="margin-top:10px;">
              Destination Charge: $${d.delivery_charges || "1595"}
            </div>

            <div class="price-box">
              TOTAL PRICE: $${d.total_msrp || "N/A"}
            </div>

            <div style="margin-top:15px; font-size:12px;">
              WARRANTY COVERAGE<br>
              5-YEAR / 60,000-MILE POWERTRAIN WARRANTY
            </div>

          </div>

        </div>

      </div>
    `;
  } catch (err) {
    console.error(err);
    resultDiv.innerHTML = "Error fetching data";
  }
}
