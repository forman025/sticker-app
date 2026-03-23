async function lookupVIN() {
  const vin = document.getElementById("vinInput").value.trim();
  const result = document.getElementById("result");

  if (vin.length !== 17) {
    result.innerHTML = "Invalid VIN";
    return;
  }

  result.innerHTML = "Loading...";

  try {
    const res = await fetch(`http://localhost:3000/api/decode/${vin}`);
    const json = await res.json();

    if (!json.data) {
      result.innerHTML = "No data found";
      return;
    }

    const d = json.data;

    const exterior =
      typeof d.exterior_color === "object"
        ? d.exterior_color?.name
        : d.exterior_color || "N/A";

    const interior =
      typeof d.interior_color === "object"
        ? d.interior_color?.name
        : d.interior_color || "N/A";

    // STANDARD EQUIPMENT
    let standardHTML = "";
    if (d.high_value_features) {
      standardHTML = Object.entries(d.high_value_features)
        .map(([cat, items]) => `
          <div class="group">
            <div class="group-title">${cat}</div>
            ${items.map(f => `<div class="bullet">• ${f.description}</div>`).join("")}
          </div>
        `).join("");
    }

    // OPTIONAL EQUIPMENT
    let optionsHTML = "";
    if (d.installed_options_details?.length) {
      optionsHTML = d.installed_options_details.map(opt => `
        <div class="row">
          <span>${opt.name}</span>
          <span>${opt.msrp ? `$${opt.msrp}` : ""}</span>
        </div>
      `).join("");
    }

    result.innerHTML = `
      <div class="sticker">

        <div class="header">
          <div class="year">${d.year}</div>

          <div class="vehicle">
            <div class="make">${d.make}</div>
            <div class="model">${d.model} ${d.trim || ""}</div>
          </div>

          <div class="base">
            BASE PRICE<br>$${d.msrp || "N/A"}
          </div>
        </div>

        <div class="columns">

          <!-- LEFT -->
          <div class="left">

            <div class="section-title">STANDARD EQUIPMENT</div>
            ${standardHTML}

          </div>

          <!-- RIGHT -->
          <div class="right">

            <div class="section-title">OPTIONAL EQUIPMENT</div>
            ${optionsHTML}

            <div class="dest">
              Destination Charge: $${d.delivery_charges || 1595}
            </div>

            <div class="total">
              TOTAL PRICE<br>
              $${d.combined_msrp || "N/A"}
            </div>

            <div class="specs">
              Engine: ${d.engine}<br>
              Transmission: ${d.transmission}<br>
              Drivetrain: ${d.drivetrain}<br>
              Exterior: ${exterior}<br>
              Interior: ${interior}
            </div>

          </div>

        </div>

      </div>
    `;
  } catch (err) {
    console.error(err);
    result.innerHTML = "Error";
  }
}
