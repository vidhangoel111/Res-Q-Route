const express = require("express");
const { z } = require("zod");
const { asyncHandler } = require("../utils/asyncHandler");

const router = express.Router();
const cache = new Map();
const CACHE_TTL_MS = 60 * 1000;

function getCached(key) {
  const item = cache.get(key);
  if (!item) return null;
  if (Date.now() > item.expiresAt) {
    cache.delete(key);
    return null;
  }
  return item.value;
}

function setCached(key, value) {
  cache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS });
}

const geocodeQuerySchema = z.object({
  q: z.string().trim().min(3),
});

const reverseQuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
});

router.get(
  "/geocode",
  asyncHandler(async (req, res) => {
    const parsed = geocodeQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ message: "Query parameter 'q' is required and must be at least 3 characters" });
    }

    const q = parsed.data.q;
    const cacheKey = `geocode:${q.toLowerCase()}`;
    const cached = getCached(cacheKey);
    if (cached) {
      return res.json({ source: "cache", results: cached });
    }

    const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=5&q=${encodeURIComponent(q)}`;
    const response = await fetch(url, {
      headers: {
        "User-Agent": "LifeLineResponse/1.0 (Emergency Dispatch)",
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      return res.status(502).json({ message: "Failed to geocode location" });
    }

    const data = await response.json();
    const results = (Array.isArray(data) ? data : []).map((item) => ({
      displayName: item.display_name,
      lat: Number(item.lat),
      lng: Number(item.lon),
      importance: item.importance ?? 0,
    }));

    setCached(cacheKey, results);
    return res.json({ source: "live", results });
  })
);

router.get(
  "/reverse",
  asyncHandler(async (req, res) => {
    const parsed = reverseQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ message: "Valid lat and lng query params are required" });
    }

    const { lat, lng } = parsed.data;
    const cacheKey = `reverse:${lat.toFixed(5)},${lng.toFixed(5)}`;
    const cached = getCached(cacheKey);
    if (cached) {
      return res.json({ source: "cache", result: cached });
    }

    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}`;
    const response = await fetch(url, {
      headers: {
        "User-Agent": "LifeLineResponse/1.0 (Emergency Dispatch)",
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      return res.status(502).json({ message: "Failed to reverse geocode coordinates" });
    }

    const data = await response.json();
    const result = {
      displayName: data.display_name || "Unknown location",
      lat: Number(data.lat || lat),
      lng: Number(data.lon || lng),
    };

    setCached(cacheKey, result);
    return res.json({ source: "live", result });
  })
);

module.exports = router;
