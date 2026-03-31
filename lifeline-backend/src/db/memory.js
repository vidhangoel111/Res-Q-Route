const { randomUUID } = require("crypto");

const store = {
  users: [],
  hospitals: [],
  ambulances: [],
  emergencies: [],
};

function now() {
  return new Date();
}

function withSeedTimestamps(record) {
  const timestamp = now();
  return {
    ...record,
    createdAt: record.createdAt || timestamp,
    updatedAt: record.updatedAt || timestamp,
  };
}

function clone(record) {
  if (!record) return null;
  return { ...record };
}

function cloneList(records) {
  return records.map((record) => ({ ...record }));
}

async function connect() {
  return Promise.resolve();
}

async function disconnect() {
  return Promise.resolve();
}

async function seed(seedData) {
  if (store.users.length > 0) return;

  store.users = seedData.users.map(withSeedTimestamps);
  store.hospitals = seedData.hospitals.map(withSeedTimestamps);
  store.ambulances = seedData.ambulances.map(withSeedTimestamps);
}

async function findUserByEmail(email) {
  return clone(store.users.find((user) => user.email === email));
}

async function findUserById(id) {
  return clone(store.users.find((user) => user.id === id));
}

async function createUser(payload) {
  const timestamp = now();
  const user = {
    id: payload.id || randomUUID(),
    hospitalId: null,
    ...payload,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  store.users.push(user);
  return clone(user);
}

async function listHospitals() {
  const hospitals = [...store.hospitals].sort((a, b) => a.name.localeCompare(b.name));
  return cloneList(hospitals);
}

async function getHospitalById(id) {
  return clone(store.hospitals.find((hospital) => hospital.id === id));
}

async function updateHospitalBeds(id, updates) {
  const hospital = store.hospitals.find((item) => item.id === id);
  if (!hospital) return null;

  Object.assign(hospital, updates, { updatedAt: now() });
  return clone(hospital);
}

async function listAmbulances(filters = {}) {
  const ambulances = store.ambulances
    .filter((ambulance) => {
      if (filters.status && ambulance.status !== filters.status) return false;
      if (filters.hospitalId && ambulance.hospitalId !== filters.hospitalId) return false;
      return true;
    })
    .sort((a, b) => a.vehicleNo.localeCompare(b.vehicleNo));

  return cloneList(ambulances);
}

async function getAmbulanceById(id) {
  return clone(store.ambulances.find((ambulance) => ambulance.id === id));
}

async function updateAmbulance(id, updates) {
  const ambulance = store.ambulances.find((item) => item.id === id);
  if (!ambulance) return null;

  Object.assign(ambulance, updates, { updatedAt: now() });
  return clone(ambulance);
}

async function createEmergency(payload) {
  const timestamp = now();
  const emergency = {
    id: payload.id || randomUUID(),
    assignedAmbulanceId: null,
    assignedHospitalId: null,
    completedAt: null,
    ...payload,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  store.emergencies.push(emergency);
  return clone(emergency);
}

async function getEmergencyById(id) {
  return clone(store.emergencies.find((emergency) => emergency.id === id));
}

async function listEmergencies(filters = {}) {
  const emergencies = store.emergencies
    .filter((emergency) => {
      if (filters.createdByUserId && emergency.createdByUserId !== filters.createdByUserId) return false;
      if (filters.assignedHospitalId && emergency.assignedHospitalId !== filters.assignedHospitalId) return false;
      if (filters.status && emergency.status !== filters.status) return false;
      return true;
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return cloneList(emergencies);
}

async function updateEmergency(id, updates) {
  const emergency = store.emergencies.find((item) => item.id === id);
  if (!emergency) return null;

  Object.assign(emergency, updates, { updatedAt: now() });
  return clone(emergency);
}

module.exports = {
  provider: "memory",
  connect,
  disconnect,
  seed,
  findUserByEmail,
  findUserById,
  createUser,
  listHospitals,
  getHospitalById,
  updateHospitalBeds,
  listAmbulances,
  getAmbulanceById,
  updateAmbulance,
  createEmergency,
  getEmergencyById,
  listEmergencies,
  updateEmergency,
};
