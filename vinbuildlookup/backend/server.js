import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import decodeRoute from "./routes/decode.js";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/decode", decodeRoute);

app.get("/", (req, res) => {
  res.send("API running");
});

app.listen(3000, () => {
  console.log("Server running on 3000");
});
