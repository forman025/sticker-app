export function formatVehicleData(data) {
  return {
    vin: data.vin,
    year: data.year,
    make: data.make,
    model: data.model,
    trim: data.trim,
    version: data.version,

    engine: data.engine,
    drivetrain: data.drivetrain,
    transmission: data.transmission,

    fuel_type: data.fuel_type,
    body_type: data.body_type,

    exterior_color: data.exterior_color?.name || null,
    interior_color: data.interior_color?.name || null,

    msrp: data.msrp,
    total_msrp: data.combined_msrp,

    mpg_city: data.city_mpg,
    mpg_highway: data.highway_mpg
  };
}
