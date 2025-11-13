require("dotenv").config();

const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const helmet = require("helmet");
const path = require("path");
const { globalLimiter } = require("./middleware/rateLimit");
const connectDB = require("./config/db");
const errorHandler = require("./middleware/errorHandling");
const authRoutes = require("./routes/authRoutes");
const eventRoutes = require("./routes/eventRoutes");
const categoryRoutes = require("./routes/categoryRoutes");
const locationRoutes = require("./routes/locationRoutes");
const userRoutes = require("./routes/userRouters");
const paymentRoutes = require("./routes/paymentRoutes");
dotenv.config();
connectDB();

const app = express();


app.use(helmet({
  crossOriginResourcePolicy: false, 
}));

app.use(
  cors({
      origin: [
    'https://nft-ticket-frontend-6pn6-deply.vercel.app',
    'https://ticketqq.online',  
    'http://localhost:5173'
  ],
    
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true, // nếu bạn dùng cookie/token
  })
);
app.use(globalLimiter);
app.use(express.json({ limit: "10mb" }));


app.use("/uploads", express.static(path.join(__dirname, "uploads")));


app.use("/api/auth", authRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/locations", locationRoutes);
app.use("/api/users", userRoutes);
app.use("/api/payments", paymentRoutes);
app.get("/", (req, res) => res.send("🎫 LuxGo Event Ticket Backend API is running"));


app.use(errorHandler);

const PORT = process.env.PORT || 5003;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
