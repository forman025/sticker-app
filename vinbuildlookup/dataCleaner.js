// ===============================
// CLEAN DATA TRANSFORM (DROP-IN)
// ===============================

function formatPrice(num) {
  return `$${Number(num).toLocaleString()}`;
}

function cleanVehicleData(data) {
  // --- HEADER ---
  const title = `${data.year} ${data.make} ${data.model} ${data.trim}`;

  // --- SPECS ---
  const specs = {
    engine: data.engine,
    transmission: data.transmission,
    drivetrain: data.drivetrain,
    fuel: data.fuel_type
  };

  // --- COLORS ---
  const colors = {
    exterior: data.exterior_color?.name || "",
    interior: (data.interior_color?.name || "").replace("Perfromance", "Performance")
  };

  // --- PRICING ---
  const pricing = {
    base: data.msrp,
    destination: data.delivery_charges,
    options: data.installed_options_msrp,
    total: data.combined_msrp
  };

  // --- OPTIONS (MAIN LOGIC) ---
  let options = (data.installed_options_details || []).map(opt => ({
    code: opt.code,
    name: opt.name.trim(),
    price: Number(opt.msrp)
  }));

  // Fix paint naming
  options = options.map(opt => {
    if (opt.code === "PP2" && data.exterior_color?.name) {
      return {
        ...opt,
        name: data.exterior_color.name
      };
    }
    return opt;
  });

  // Remove duplicates
  const seen = new Set();
  options = options.filter(opt => {
    if (seen.has(opt.code)) return false;
    seen.add(opt.code);
    return true;
  });

  // Sort by price (descending)
  options.sort((a, b) => b.price - a.price);

  // --- GROUPING (OEM STYLE START) ---
  const groupedOptions = {
    packages: [],
    exterior: [],
    other: []
  };

  options.forEach(opt => {
    if (opt.name.toLowerCase().includes("package") || opt.name.toLowerCase().includes("group")) {
      groupedOptions.packages.push(opt);
    } else if (opt.code.startsWith("P")) {
      groupedOptions.exterior.push(opt);
    } else {
      groupedOptions.other.push(opt);
    }
  });

  return {
    title,
    specs,
    colors,
    pricing,
    options: groupedOptions
  };
}

// ===============================
// RENDER EXAMPLE
// ===============================

function renderOptions(groupedOptions) {
  console.log("\nOPTIONAL EQUIPMENT");
  groupedOptions.packages.forEach(opt => {
    console.log(`${opt.name} .... ${formatPrice(opt.price)}`);
  });

  if (groupedOptions.exterior.length) {
    console.log("\nEXTERIOR");
    groupedOptions.exterior.forEach(opt => {
      console.log(`${opt.name} .... ${formatPrice(opt.price)}`);
    });
  }

  if (groupedOptions.other.length) {
    console.log("\nOTHER");
    groupedOptions.other.forEach(opt => {
      console.log(`${opt.name} .... ${formatPrice(opt.price)}`);
    });
  }
}

// ===============================
// USAGE
// ===============================

// const res = await fetch(`/api/decode/${vin}`);
// const json = await res.json();
// const vehicle = cleanVehicleData(json.data);
// renderOptions(vehicle.options);

// console.log(vehicle);

