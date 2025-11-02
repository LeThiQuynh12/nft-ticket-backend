require("dotenv").config();

const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const helmet = require("helmet");
const { globalLimiter } = require("./middleware/rateLimit");
const connectDB = require("./config/db");
const errorHandler = require("./middleware/errorHandling");
const authRoutes = require("./routes/authRoutes");
const eventRoutes = require("./routes/eventRoutes");
const categoryRoutes = require("./routes/categoryRoutes");
const locationRoutes = require("./routes/locationRoutes");
const userRoutes = require("./routes/userRouters");
dotenv.config();
connectDB();

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(globalLimiter);
app.use(express.json({ limit: "10mb" }));


// ⚡ Cho phép truy cập ảnh upload
app.use("/uploads", express.static("uploads"));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/categories", categoryRoutes);
app.use('/api/locations', locationRoutes);
app.use('/api/users', userRoutes);
app.get("/", (req, res) => res.send("🎫 LuxGo Event Ticket Backend API is running"));

// Error handler
app.use(errorHandler);

// Server
const PORT = process.env.PORT || 5003;
app.listen(PORT, () =>
  console.log(`🚀 Server running on http://localhost:${PORT}`)
);
