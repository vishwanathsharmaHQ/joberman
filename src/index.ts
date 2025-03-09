import express from "express";
import path from "path";
import dotenv from "dotenv";
import resumeRoutes from "./routes/resumeRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import chatRoutes from "./routes/chatRoutes.js";
import jobRoutes from "./routes/jobRoutes.js";

// Load environment variables from .env file
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Enable JSON body parsing
app.use(express.json());

// Serve static files from public directory
app.use(express.static(path.join(process.cwd(), 'public')));

// Define routes
app.get("/", (req, res) => {
  res.send("Hello World");
});

app.get("/api/jobs", (req, res) => {
  res.send("Hello World");
});

app.get("/api/profile/optimise", (req, res) => {
  res.send("Hello World");
});

app.get("/api/job/fitcheck", (req, res) => {
  res.send("Hello World");
});

app.get("/api/job/reccomendations", (req, res) => {
  res.send("Hello World");
});

// Resume upload and parsing routes
app.use("/api/resume", resumeRoutes);

// Authentication routes
app.use("/api/auth", authRoutes);

// User routes
app.use("/api/user", userRoutes);

// Chat routes
app.use("/api/chat", chatRoutes);

// Job analysis routes
app.use("/api/jobs", jobRoutes);

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
