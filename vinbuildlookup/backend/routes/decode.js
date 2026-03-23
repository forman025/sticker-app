import express from "express";

const router = express.Router();

router.get("/:vin", async (req, res) => {
  const vin = req.params.vin.toUpperCase();
  const API_KEY = process.env.MARKETCHECK_API_KEY;

  try {
    const response = await fetch(
      `https://api.marketcheck.com/v2/decode/car/neovin/${vin}/specs?api_key=${API_KEY}&include_available_options=true&include_generic=true`
    );

    const data = await response.json();

    if (!data || data.message) {
      return res.json({ data: null });
    }

    return res.json({ data });

  } catch (err) {
    console.error(err);
    return res.json({ data: null });
  }
});

export default router;
