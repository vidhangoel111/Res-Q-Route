const db = require("../db");
const { AMBULANCE_STATUS } = require("../config/constants");
const { haversineDistance, classifySeverity, ensureSeverity } = require("../utils/geo");

const AVG_AMBULANCE_SPEED_KMPH = 40;
const CARDIAC_TYPES = ["cardiac", "heart", "stroke"];
const BURN_TYPES = ["burn"];

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function computeTravelSeconds(distanceKm, avgSpeedKmph = AVG_AMBULANCE_SPEED_KMPH) {
  if (distanceKm <= 0) return 0;
  const etaHours = distanceKm / Math.max(avgSpeedKmph, 1);
  return Math.round(etaHours * 3600);
}

function normalizeEmergencyType(type = "") {
  return type.trim().toLowerCase();
}

function getHospitalCapacity(hospital) {
  if (typeof hospital.capacity === "number") {
    return hospital.capacity;
  }

  return (hospital.icuBeds || 0) + (hospital.emergencyBeds || 0);
}

function getHospitalRequirements(type) {
  const normalizedType = normalizeEmergencyType(type);
  const requirements = [];

  if (CARDIAC_TYPES.some((token) => normalizedType.includes(token))) {
    requirements.push({
      key: "icu",
      description: "Cardiac emergency requires ICU availability",
      check: (hospital) => (hospital.icuBeds || 0) > 0,
    });
  }

  if (BURN_TYPES.some((token) => normalizedType.includes(token))) {
    requirements.push({
      key: "burnUnit",
      description: "Burn emergency requires burn unit support",
      check: (hospital) => hospital.burnUnit === true,
    });
  }

  return requirements;
}

function evaluateHospitalEligibility(hospital, emergencyType) {
  const requirements = getHospitalRequirements(emergencyType);
  const capacity = getHospitalCapacity(hospital);
  const failures = [];

  if (capacity <= 0) {
    failures.push("No remaining capacity");
  }

  for (const requirement of requirements) {
    if (!requirement.check(hospital)) {
      failures.push(requirement.description);
    }
  }

  return {
    isEligible: failures.length === 0,
    failures,
    capacity,
    requirements: requirements.map((item) => item.description),
  };
}

function buildDecisionExplanation({ emergencyType, severity, availableAmbulances, eligibleHospitals, rejectedHospitals, rankedPairs, selectedPair }) {
  const selected = selectedPair
    ? {
        ambulanceId: selectedPair.ambulance.id,
        ambulanceVehicleNo: selectedPair.ambulance.vehicleNo,
        hospitalId: selectedPair.hospital.id,
        hospitalName: selectedPair.hospital.name,
        ambulanceToUserDistanceKm: Number(selectedPair.ambulanceToUserDistanceKm.toFixed(2)),
        ambulanceToUserSeconds: selectedPair.ambulanceToUserSeconds,
        userToHospitalDistanceKm: Number(selectedPair.userToHospitalDistanceKm.toFixed(2)),
        userToHospitalSeconds: selectedPair.userToHospitalSeconds,
        totalDistanceKm: Number(selectedPair.totalDistanceKm.toFixed(2)),
        totalEtaSeconds: selectedPair.totalEtaSeconds,
      }
    : null;

  const rationale = [];
  if (!selectedPair) {
    rationale.push("No valid ambulance and hospital combination met the availability and treatment rules.");
  } else {
    rationale.push("Selected the ambulance-hospital pair with the minimum total travel time.");
    rationale.push(`Ambulance ${selectedPair.ambulance.vehicleNo} reaches the user in ${Math.max(1, Math.round(selectedPair.ambulanceToUserSeconds / 60))} min.`);
    rationale.push(`Hospital ${selectedPair.hospital.name} adds ${Math.max(1, Math.round(selectedPair.userToHospitalSeconds / 60))} min transport time and has capacity ${selectedPair.capacity}.`);
  }

  return {
    strategy: "minimum_total_time",
    averageSpeedKmph: AVG_AMBULANCE_SPEED_KMPH,
    emergencyType,
    severity,
    filtersApplied: {
      ambulanceStatus: [AMBULANCE_STATUS.FREE],
      hospitalRequirements: getHospitalRequirements(emergencyType).map((item) => item.description),
      requireCapacity: true,
    },
    consideredCounts: {
      availableAmbulances: availableAmbulances.length,
      eligibleHospitals: eligibleHospitals.length,
      rejectedHospitals: rejectedHospitals.length,
      combinationsEvaluated: rankedPairs.length,
    },
    selected,
    rationale,
    rejectedHospitals: rejectedHospitals.map((item) => ({
      id: item.hospital.id,
      name: item.hospital.name,
      reasons: item.failures,
    })),
    alternatives: rankedPairs.slice(0, 3).map((item) => ({
      ambulanceId: item.ambulance.id,
      ambulanceVehicleNo: item.ambulance.vehicleNo,
      hospitalId: item.hospital.id,
      hospitalName: item.hospital.name,
      totalEtaSeconds: item.totalEtaSeconds,
      totalDistanceKm: Number(item.totalDistanceKm.toFixed(2)),
    })),
  };
}

function buildAssignmentMeta({ severity, availableAmbulances, eligibleHospitals, rankedPairs, selectedPair, decisionExplanation }) {
  const totalTravelFactor = selectedPair ? clamp(1 - selectedPair.totalDistanceKm / 30, 0, 1) : 0;
  const capacityFactor = selectedPair ? clamp(selectedPair.capacity / 50, 0, 1) : 0;
  const severityFactor = severity === "critical" ? 1 : severity === "high" ? 0.85 : severity === "medium" ? 0.75 : 0.65;
  const confidence = Math.round((totalTravelFactor * 0.5 + capacityFactor * 0.25 + severityFactor * 0.25) * 100);

  const reasons = decisionExplanation.rationale;

  return {
    assignmentConfidence: confidence,
    assignmentReasons: reasons,
    ambulanceCandidates: availableAmbulances.slice(0, 3).map((item) => ({
      id: item.ambulance.id,
      vehicleNo: item.ambulance.vehicleNo,
      distanceKm: Number(item.ambulanceToUserDistanceKm.toFixed(2)),
      etaSeconds: item.ambulanceToUserSeconds,
      status: item.ambulance.status,
    })),
    hospitalCandidates: eligibleHospitals.slice(0, 3).map((item) => ({
      id: item.hospital.id,
      name: item.hospital.name,
      distanceKm: Number(item.userToHospitalDistanceKm.toFixed(2)),
      etaSeconds: item.userToHospitalSeconds,
      capacity: item.capacity,
      burnUnit: Boolean(item.hospital.burnUnit),
      icuBeds: item.hospital.icuBeds,
      emergencyBeds: item.hospital.emergencyBeds,
    })),
    combinationCandidates: rankedPairs.slice(0, 3).map((item) => ({
      ambulanceId: item.ambulance.id,
      hospitalId: item.hospital.id,
      totalEtaSeconds: item.totalEtaSeconds,
      totalDistanceKm: Number(item.totalDistanceKm.toFixed(2)),
    })),
  };
}

async function assignResources({ lat, lng, type, description, severity }) {
  const normalizedSeverity = ensureSeverity(severity || classifySeverity(type, description));
  const [ambulances, hospitals] = await Promise.all([db.listAmbulances(), db.listHospitals()]);

  const availableAmbulances = ambulances
    .filter((ambulance) => ambulance.status === AMBULANCE_STATUS.FREE)
    .map((ambulance) => {
      const ambulanceToUserDistanceKm = haversineDistance(ambulance.lat, ambulance.lng, lat, lng);
      return {
        ambulance,
        ambulanceToUserDistanceKm,
        ambulanceToUserSeconds: computeTravelSeconds(ambulanceToUserDistanceKm),
      };
    })
    .sort((a, b) => a.ambulanceToUserSeconds - b.ambulanceToUserSeconds || a.ambulanceToUserDistanceKm - b.ambulanceToUserDistanceKm);

  const evaluatedHospitals = hospitals.map((hospital) => {
    const eligibility = evaluateHospitalEligibility(hospital, type);
    const userToHospitalDistanceKm = haversineDistance(lat, lng, hospital.lat, hospital.lng);
    return {
      hospital,
      ...eligibility,
      userToHospitalDistanceKm,
      userToHospitalSeconds: computeTravelSeconds(userToHospitalDistanceKm),
    };
  });

  const eligibleHospitals = evaluatedHospitals
    .filter((item) => item.isEligible)
    .sort((a, b) => a.userToHospitalSeconds - b.userToHospitalSeconds || b.capacity - a.capacity);

  const rejectedHospitals = evaluatedHospitals.filter((item) => !item.isEligible);

  const rankedPairs = [];
  for (const ambulanceEntry of availableAmbulances) {
    for (const hospitalEntry of eligibleHospitals) {
      rankedPairs.push({
        ambulance: ambulanceEntry.ambulance,
        hospital: hospitalEntry.hospital,
        ambulanceToUserDistanceKm: ambulanceEntry.ambulanceToUserDistanceKm,
        ambulanceToUserSeconds: ambulanceEntry.ambulanceToUserSeconds,
        userToHospitalDistanceKm: hospitalEntry.userToHospitalDistanceKm,
        userToHospitalSeconds: hospitalEntry.userToHospitalSeconds,
        totalDistanceKm: ambulanceEntry.ambulanceToUserDistanceKm + hospitalEntry.userToHospitalDistanceKm,
        totalEtaSeconds: ambulanceEntry.ambulanceToUserSeconds + hospitalEntry.userToHospitalSeconds,
        capacity: hospitalEntry.capacity,
      });
    }
  }

  rankedPairs.sort((a, b) => {
    if (a.totalEtaSeconds !== b.totalEtaSeconds) return a.totalEtaSeconds - b.totalEtaSeconds;
    if (b.capacity !== a.capacity) return b.capacity - a.capacity;
    return a.totalDistanceKm - b.totalDistanceKm;
  });

  const selectedPair = rankedPairs[0] || null;
  const decisionExplanation = buildDecisionExplanation({
    emergencyType: type,
    severity: normalizedSeverity,
    availableAmbulances,
    eligibleHospitals,
    rejectedHospitals,
    rankedPairs,
    selectedPair,
  });
  const meta = buildAssignmentMeta({
    severity: normalizedSeverity,
    availableAmbulances,
    eligibleHospitals,
    rankedPairs,
    selectedPair,
    decisionExplanation,
  });

  return {
    severity: normalizedSeverity,
    assignedAmbulanceId: selectedPair ? selectedPair.ambulance.id : null,
    assignedHospitalId: selectedPair ? selectedPair.hospital.id : null,
    etaSeconds: selectedPair ? selectedPair.totalEtaSeconds : 0,
    selectedAmbulance: selectedPair ? selectedPair.ambulance : null,
    selectedHospital: selectedPair ? { ...selectedPair.hospital, capacity: selectedPair.capacity } : null,
    estimatedTotalTimeSeconds: selectedPair ? selectedPair.totalEtaSeconds : 0,
    assignmentConfidence: meta.assignmentConfidence,
    assignmentReasons: meta.assignmentReasons,
    ambulanceCandidates: meta.ambulanceCandidates,
    hospitalCandidates: meta.hospitalCandidates,
    combinationCandidates: meta.combinationCandidates,
    decisionExplanation,
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
