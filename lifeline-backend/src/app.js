const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const hpp = require("hpp");

const env = require("./config/env");
const healthRoutes = require("./routes/health.routes");
const authRoutes = require("./routes/auth.routes");
const emergencyRoutes = require("./routes/emergency.routes");
const hospitalRoutes = require("./routes/hospital.routes");
const ambulanceRoutes = require("./routes/ambulance.routes");
const adminRoutes = require("./routes/admin.routes");
const locationRoutes = require("./routes/location.routes");
const { sanitizeRequest } = require("./middleware/sanitize");
const { notFound, errorHandler } = require("./middleware/error");

const app = express();
const allowedOrigins = env.FRONTEND_ORIGIN.split(",").map((origin) => origin.trim()).filter(Boolean);

app.use(helmet());
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error("CORS: Origin not allowed"));
    },
    credentials: true,
  })
);
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: false }));
app.use(sanitizeRequest);
app.use(hpp());

if (env.NODE_ENV !== "production") {
  app.use(morgan("dev"));
}

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many authentication attempts. Try again later." },
});

app.use("/api", globalLimiter);
app.use("/api", healthRoutes);
app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/emergencies", emergencyRoutes);
app.use("/api/hospitals", hospitalRoutes);
app.use("/api/ambulances", ambulanceRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/location", locationRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
