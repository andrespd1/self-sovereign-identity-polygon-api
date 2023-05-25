import express from "express";
import auth from "./routes/authRouting";

const app = express();
const cors = require("cors");

app.use(express.json());

const corsOptions = {
  origin: "*",
  methods: ["GET", "POST"], // Add other HTTP methods as needed
  preflightContinue: false,
  optionsSuccessStatus: 204,
};

app.options("/api/auth/*", cors(corsOptions)); // Enable CORS preflight for /api/auth routes

app.use(cors(corsOptions)); // Enable CORS for other routes

const PORT = 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

app.use("/api/auth", auth);
