const db = require("../db");
const { AMBULANCE_STATUS } = require("../config/constants");
const { haversineDistance, classifySeverity, ensureSeverity } = require("../utils/geo");

const TRAFFIC_ZONES = [
  { bounds: [[28.628, 77.215], [28.637, 77.225]], multiplier: 1.6 },
  { bounds: [[28.61, 77.225], [28.618, 77.235]], multiplier: 1.3 },
  { bounds: [[28.645, 77.185], [28.655, 77.2]], multiplier: 1.6 },
];

function getTrafficMultiplier(lat, lng) {
  for (const zone of TRAFFIC_ZONES) {
    const [[minLat, minLng], [maxLat, maxLng]] = zone.bounds;
    if (lat >= minLat && lat <= maxLat && lng >= minLng && lng <= maxLng) {
      return zone.multiplier;
    }
  }
  return 1;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function computeEtaSeconds(distanceKm, severity, trafficMultiplier = 1) {
  const baseSpeedKmph = severity === "critical" ? 45 : 35;
  const trafficPenalty = Math.max(1, trafficMultiplier);
  const etaHours = (distanceKm * trafficPenalty) / Math.max(baseSpeedKmph, 10);
  return Math.max(Math.round(etaHours * 3600), 120);
}

async function pickBestAmbulance(lat, lng) {
  const ambulances = await db.listAmbulances({ status: AMBULANCE_STATUS.AVAILABLE });
  if (ambulances.length === 0) {
    return { best: null, ranked: [] };
  }

  const ranked = ambulances
    .map((ambulance) => ({
      ambulance,
      distanceKm: haversineDistance(lat, lng, ambulance.lat, ambulance.lng),
      trafficMultiplier: getTrafficMultiplier(ambulance.lat, ambulance.lng),
      score: 0,
    }))
    .map((item) => ({
      ...item,
      score: item.distanceKm * item.trafficMultiplier,
    }))
    .sort((a, b) => a.score - b.score || a.distanceKm - b.distanceKm);

  return { best: ranked[0], ranked };
}

async function pickBestHospital(lat, lng, severity) {
  const hospitals = await db.listHospitals();
  const eligible = hospitals.filter((hospital) => hospital.icuBeds > 0 || hospital.emergencyBeds > 0);

  if (eligible.length === 0) {
    return { best: null, ranked: [] };
  }

  const ranked = eligible
    .map((hospital) => {
      const distanceKm = haversineDistance(lat, lng, hospital.lat, hospital.lng);
      const icuBonus = severity === "critical" ? Math.min(hospital.icuBeds || 0, 5) * 0.1 : 0;
      const score = distanceKm + hospital.occupancy / 100 - icuBonus;
      return { hospital, distanceKm, score };
    })
    .sort((a, b) => a.score - b.score);

  return { best: ranked[0], ranked };
}

function buildAssignmentMeta({ severity, ambulanceBest, hospitalBest, ambulanceRanked, hospitalRanked }) {
  const ambulanceFactor = ambulanceBest ? clamp(1 - ambulanceBest.score / 25, 0, 1) : 0;
  const hospitalFactor = hospitalBest ? clamp(1 - hospitalBest.score / 20, 0, 1) : 0;
  const severityFactor = severity === "critical" ? 1 : severity === "high" ? 0.85 : severity === "medium" ? 0.75 : 0.65;
  const confidence = Math.round((ambulanceFactor * 0.45 + hospitalFactor * 0.35 + severityFactor * 0.2) * 100);

  const reasons = [];
  if (ambulanceBest) {
    reasons.push(
      `Nearest available ambulance at ${ambulanceBest.distanceKm.toFixed(2)} km with traffic factor x${ambulanceBest.trafficMultiplier.toFixed(1)}`
    );
  } else {
    reasons.push("No available ambulance found; assignment deferred");
  }

  if (hospitalBest) {
    reasons.push(
      `Hospital optimized by distance and occupancy (${hospitalBest.hospital.occupancy}% occupied)`
    );
    if (severity === "critical") {
      reasons.push("Critical severity gave extra priority to ICU bed availability");
    }
  } else {
    reasons.push("No eligible hospital with emergency/ICU bed available");
  }

  return {
    assignmentConfidence: confidence,
    assignmentReasons: reasons,
    ambulanceCandidates: ambulanceRanked.slice(0, 3).map((item) => ({
      id: item.ambulance.id,
      vehicleNo: item.ambulance.vehicleNo,
      distanceKm: Number(item.distanceKm.toFixed(2)),
      trafficMultiplier: Number(item.trafficMultiplier.toFixed(1)),
      score: Number(item.score.toFixed(2)),
    })),
    hospitalCandidates: hospitalRanked.slice(0, 3).map((item) => ({
      id: item.hospital.id,
      name: item.hospital.name,
      distanceKm: Number(item.distanceKm.toFixed(2)),
      occupancy: item.hospital.occupancy,
      score: Number(item.score.toFixed(2)),
      icuBeds: item.hospital.icuBeds,
      emergencyBeds: item.hospital.emergencyBeds,
    })),
  };
}

async function assignResources({ lat, lng, type, description, severity }) {
  const normalizedSeverity = ensureSeverity(severity || classifySeverity(type, description));
  const ambulanceDecision = await pickBestAmbulance(lat, lng);
  const hospitalDecision = await pickBestHospital(lat, lng, normalizedSeverity);

  const ambulanceChoice = ambulanceDecision.best;
  const hospitalChoice = hospitalDecision.best;

  const etaDistance = ambulanceChoice ? ambulanceChoice.distanceKm : 8;
  const etaTrafficMultiplier = ambulanceChoice ? ambulanceChoice.trafficMultiplier : 1;
  const etaSeconds = computeEtaSeconds(etaDistance, normalizedSeverity, etaTrafficMultiplier);
  const meta = buildAssignmentMeta({
    severity: normalizedSeverity,
    ambulanceBest: ambulanceChoice,
    hospitalBest: hospitalChoice,
    ambulanceRanked: ambulanceDecision.ranked,
    hospitalRanked: hospitalDecision.ranked,
  });

  return {
    severity: normalizedSeverity,
    assignedAmbulanceId: ambulanceChoice ? ambulanceChoice.ambulance.id : null,
    assignedHospitalId: hospitalChoice ? hospitalChoice.hospital.id : null,
    etaSeconds,
    assignmentConfidence: meta.assignmentConfidence,
    assignmentReasons: meta.assignmentReasons,
    ambulanceCandidates: meta.ambulanceCandidates,
    hospitalCandidates: meta.hospitalCandidates,
  };
}

async function enrichEmergency(emergency) {
  if (!emergency) return null;

  const [assignedAmbulance, assignedHospital] = await Promise.all([
    emergency.assignedAmbulanceId ? db.getAmbulanceById(emergency.assignedAmbulanceId) : Promise.resolve(null),
    emergency.assignedHospitalId ? db.getHospitalById(emergency.assignedHospitalId) : Promise.resolve(null),
  ]);

  return {
    ...emergency,
    assignedAmbulance,
    assignedHospital,
  };
}

module.exports = {
  assignResources,
  enrichEmergency,
};
