export async function decodeVin(vin) {
  const url = `https://api.marketcheck.com/v2/decode/car/neovin/${vin}/specs?api_key=${process.env.MARKETCHECK_KEY}`;

  const res = await fetch(url);

  if (!res.ok) {
  const text = await res.text();
  console.error("MARKETCHECK RESPONSE:", text);
  throw new Error(text);
}

  return res.json();
}
