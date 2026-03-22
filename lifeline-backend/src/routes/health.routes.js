const express = require("express");
const db = require("../db");

const router = express.Router();

router.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "lifeline-backend",
    database: db.provider,
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;
