const test = require("node:test");
const assert = require("node:assert/strict");

process.env.DB_PROVIDER = "memory";

const db = require("../db");
const { seedDatabase } = require("./seedService");
const { assignResources } = require("./dispatchService");

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

function etaSeconds(distanceKm) {
  return Math.round((distanceKm / 40) * 3600);
}

async function expectedBest(type, lat, lng) {
  const ambulances = (await db.listAmbulances()).filter((ambulance) => ambulance.status === "FREE");
  const hospitals = await db.listHospitals();

  const eligibleHospitals = hospitals.filter((hospital) => {
    if ((hospital.capacity || 0) <= 0) return false;
    if (type.toLowerCase().includes("cardiac") && (hospital.icuBeds || 0) <= 0) return false;
    if (type.toLowerCase().includes("burn") && hospital.burnUnit !== true) return false;
    return (hospital.icuBeds || 0) > 0 || (hospital.emergencyBeds || 0) > 0;
  });

  const ranked = [];
  for (const ambulance of ambulances) {
    for (const hospital of eligibleHospitals) {
      const totalEtaSeconds =
        etaSeconds(haversineDistance(ambulance.lat, ambulance.lng, lat, lng)) +
        etaSeconds(haversineDistance(lat, lng, hospital.lat, hospital.lng));

      ranked.push({
        ambulanceId: ambulance.id,
        hospitalId: hospital.id,
        totalEtaSeconds,
      });
    }
  }

  ranked.sort((a, b) => a.totalEtaSeconds - b.totalEtaSeconds);
  return ranked[0];
}

test("assignResources selects the minimum-ETA cardiac combination with ICU support", async () => {
  await seedDatabase();

  const input = {
    lat: 28.611,
    lng: 77.221,
    type: "Cardiac Arrest",
    description: "Chest pain and collapse",
  };

  const result = await assignResources(input);
  const expected = await expectedBest(input.type, input.lat, input.lng);

  assert.ok(result.selectedAmbulance);
  assert.ok(result.selectedHospital);
  assert.equal(result.selectedHospital.icuBeds > 0, true);
  assert.equal(result.assignedAmbulanceId, expected.ambulanceId);
  assert.equal(result.assignedHospitalId, expected.hospitalId);
  assert.equal(result.etaSeconds, expected.totalEtaSeconds);
  assert.equal(result.decisionExplanation.selected.totalEtaSeconds, expected.totalEtaSeconds);
});

test("assignResources restricts burn cases to hospitals with burn unit support", async () => {
  await seedDatabase();

  const input = {
    lat: 28.605,
    lng: 77.229,
    type: "Burn Injury",
    description: "Severe thermal burns",
  };

  const result = await assignResources(input);
  const expected = await expectedBest(input.type, input.lat, input.lng);

  assert.ok(result.selectedHospital);
  assert.equal(result.selectedHospital.burnUnit, true);
  assert.equal(result.assignedAmbulanceId, expected.ambulanceId);
  assert.equal(result.assignedHospitalId, expected.hospitalId);
  assert.equal(result.etaSeconds, expected.totalEtaSeconds);
});
