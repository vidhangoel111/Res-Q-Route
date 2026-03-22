const db = require("../db");
const { AMBULANCE_STATUS } = require("../config/constants");
const { haversineDistance, classifySeverity, ensureSeverity } = require("../utils/geo");

function computeEtaSeconds(distanceKm, severity) {
  const baseSpeedKmph = severity === "critical" ? 45 : 35;
  const etaHours = distanceKm / Math.max(baseSpeedKmph, 10);
  return Math.max(Math.round(etaHours * 3600), 120);
}

async function pickBestAmbulance(lat, lng) {
  const ambulances = await db.listAmbulances({ status: AMBULANCE_STATUS.AVAILABLE });
  if (ambulances.length === 0) {
    return null;
  }

  const ranked = ambulances
    .map((ambulance) => ({
      ambulance,
      distanceKm: haversineDistance(lat, lng, ambulance.lat, ambulance.lng),
    }))
    .sort((a, b) => a.distanceKm - b.distanceKm);

  return ranked[0];
}

async function pickBestHospital(lat, lng) {
  const hospitals = await db.listHospitals();
  const eligible = hospitals.filter((hospital) => hospital.icuBeds > 0 || hospital.emergencyBeds > 0);

  if (eligible.length === 0) {
    return null;
  }

  const ranked = eligible
    .map((hospital) => {
      const distanceKm = haversineDistance(lat, lng, hospital.lat, hospital.lng);
      const score = distanceKm + hospital.occupancy / 100;
      return { hospital, distanceKm, score };
    })
    .sort((a, b) => a.score - b.score);

  return ranked[0];
}

async function assignResources({ lat, lng, type, description, severity }) {
  const normalizedSeverity = ensureSeverity(severity || classifySeverity(type, description));
  const ambulanceChoice = await pickBestAmbulance(lat, lng);
  const hospitalChoice = await pickBestHospital(lat, lng);

  const etaDistance = ambulanceChoice ? ambulanceChoice.distanceKm : 8;
  const etaSeconds = computeEtaSeconds(etaDistance, normalizedSeverity);

  return {
    severity: normalizedSeverity,
    assignedAmbulanceId: ambulanceChoice ? ambulanceChoice.ambulance.id : null,
    assignedHospitalId: hospitalChoice ? hospitalChoice.hospital.id : null,
    etaSeconds,
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
