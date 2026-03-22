const { SEVERITY_LEVELS } = require("../config/constants");

function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;

  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function classifySeverity(type, description) {
  const text = `${type} ${description}`.toLowerCase();

  if (text.includes("cardiac") || text.includes("stroke") || text.includes("drowning") || text.includes("not breathing")) {
    return "critical";
  }

  if (text.includes("accident") || text.includes("burn") || text.includes("poison") || text.includes("pregnancy")) {
    return "high";
  }

  if (text.includes("breathing") || text.includes("fall") || text.includes("fracture")) {
    return "medium";
  }

  return "low";
}

function ensureSeverity(value) {
  return SEVERITY_LEVELS.includes(value) ? value : "low";
}

module.exports = {
  haversineDistance,
  classifySeverity,
  ensureSeverity,
};
