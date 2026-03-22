const mongoose = require("mongoose");
const { randomUUID } = require("crypto");
const env = require("../config/env");

const userSchema = new mongoose.Schema(
  {
    id: { type: String, unique: true, index: true },
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, index: true },
    passwordHash: { type: String, required: true },
    role: { type: String, required: true },
    hospitalId: { type: String, default: null },
  },
  { timestamps: true, versionKey: false }
);

const hospitalSchema = new mongoose.Schema(
  {
    id: { type: String, unique: true, index: true },
    name: { type: String, required: true },
    lat: Number,
    lng: Number,
    icuBeds: Number,
    emergencyBeds: Number,
    totalBeds: Number,
    occupancy: Number,
  },
  { timestamps: true, versionKey: false }
);

const ambulanceSchema = new mongoose.Schema(
  {
    id: { type: String, unique: true, index: true },
    vehicleNo: String,
    driverName: String,
    lat: Number,
    lng: Number,
    status: String,
    hospitalId: String,
  },
  { timestamps: true, versionKey: false }
);

const emergencySchema = new mongoose.Schema(
  {
    id: { type: String, unique: true, index: true },
    patientName: String,
    phone: String,
    type: String,
    description: String,
    lat: Number,
    lng: Number,
    severity: String,
    status: String,
    assignedAmbulanceId: { type: String, default: null },
    assignedHospitalId: { type: String, default: null },
    etaSeconds: Number,
    createdByUserId: String,
    completedAt: { type: Date, default: null },
  },
  { timestamps: true, versionKey: false }
);

const User = mongoose.model("User", userSchema);
const Hospital = mongoose.model("Hospital", hospitalSchema);
const Ambulance = mongoose.model("Ambulance", ambulanceSchema);
const Emergency = mongoose.model("Emergency", emergencySchema);

function normalize(doc) {
  if (!doc) return null;
  const plain = doc.toObject ? doc.toObject() : doc;
  delete plain._id;
  return plain;
}

async function connect() {
  if (!env.MONGO_URI) {
    throw new Error("MONGO_URI is required when DB_PROVIDER=mongo");
  }

  await mongoose.connect(env.MONGO_URI);
}

async function disconnect() {
  await mongoose.disconnect();
}

async function seed(seedData) {
  const usersCount = await User.countDocuments();
  if (usersCount > 0) return;

  await User.insertMany(seedData.users);
  await Hospital.insertMany(seedData.hospitals);
  await Ambulance.insertMany(seedData.ambulances);
}

async function findUserByEmail(email) {
  return normalize(await User.findOne({ email }));
}

async function findUserById(id) {
  return normalize(await User.findOne({ id }));
}

async function createUser(payload) {
  const user = await User.create({ id: payload.id || randomUUID(), ...payload });
  return normalize(user);
}

async function listHospitals() {
  const docs = await Hospital.find().sort({ name: 1 });
  return docs.map(normalize);
}

async function getHospitalById(id) {
  return normalize(await Hospital.findOne({ id }));
}

async function updateHospitalBeds(id, updates) {
  const hospital = await Hospital.findOneAndUpdate({ id }, { $set: updates }, { new: true });
  return normalize(hospital);
}

async function listAmbulances(filters = {}) {
  const docs = await Ambulance.find(filters).sort({ vehicleNo: 1 });
  return docs.map(normalize);
}

async function getAmbulanceById(id) {
  return normalize(await Ambulance.findOne({ id }));
}

async function updateAmbulance(id, updates) {
  const ambulance = await Ambulance.findOneAndUpdate({ id }, { $set: updates }, { new: true });
  return normalize(ambulance);
}

async function createEmergency(payload) {
  const emergency = await Emergency.create({ id: payload.id || randomUUID(), ...payload });
  return normalize(emergency);
}

async function getEmergencyById(id) {
  return normalize(await Emergency.findOne({ id }));
}

async function listEmergencies(filters = {}) {
  const docs = await Emergency.find(filters).sort({ createdAt: -1 });
  return docs.map(normalize);
}

async function updateEmergency(id, updates) {
  const emergency = await Emergency.findOneAndUpdate({ id }, { $set: updates }, { new: true });
  return normalize(emergency);
}

module.exports = {
  provider: "mongo",
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
