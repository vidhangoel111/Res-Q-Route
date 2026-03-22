const mysql = require("mysql2/promise");
const { randomUUID } = require("crypto");
const env = require("../config/env");

let pool;

function mapRow(row) {
  if (!row) return null;
  return {
    ...row,
    icuBeds: row.icuBeds ?? row.icu_beds,
    emergencyBeds: row.emergencyBeds ?? row.emergency_beds,
    totalBeds: row.totalBeds ?? row.total_beds,
    vehicleNo: row.vehicleNo ?? row.vehicle_no,
    driverName: row.driverName ?? row.driver_name,
    hospitalId: row.hospitalId ?? row.hospital_id,
    passwordHash: row.passwordHash ?? row.password_hash,
    assignedAmbulanceId: row.assignedAmbulanceId ?? row.assigned_ambulance_id,
    assignedHospitalId: row.assignedHospitalId ?? row.assigned_hospital_id,
    etaSeconds: row.etaSeconds ?? row.eta_seconds,
    createdByUserId: row.createdByUserId ?? row.created_by_user_id,
    patientName: row.patientName ?? row.patient_name,
  };
}

async function connect() {
  pool = mysql.createPool({
    host: env.MYSQL_HOST,
    port: env.MYSQL_PORT,
    user: env.MYSQL_USER,
    password: env.MYSQL_PASSWORD,
    database: env.MYSQL_DATABASE,
    waitForConnections: true,
    connectionLimit: 10,
  });

  await migrate();
}

async function migrate() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id VARCHAR(64) PRIMARY KEY,
      name VARCHAR(120) NOT NULL,
      email VARCHAR(160) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      role VARCHAR(20) NOT NULL,
      hospital_id VARCHAR(64) NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS hospitals (
      id VARCHAR(64) PRIMARY KEY,
      name VARCHAR(160) NOT NULL,
      lat DOUBLE NOT NULL,
      lng DOUBLE NOT NULL,
      icu_beds INT NOT NULL,
      emergency_beds INT NOT NULL,
      total_beds INT NOT NULL,
      occupancy INT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS ambulances (
      id VARCHAR(64) PRIMARY KEY,
      vehicle_no VARCHAR(64) NOT NULL,
      driver_name VARCHAR(120) NOT NULL,
      lat DOUBLE NOT NULL,
      lng DOUBLE NOT NULL,
      status VARCHAR(20) NOT NULL,
      hospital_id VARCHAR(64) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS emergencies (
      id VARCHAR(64) PRIMARY KEY,
      patient_name VARCHAR(120) NOT NULL,
      phone VARCHAR(30) NOT NULL,
      type VARCHAR(100) NOT NULL,
      description TEXT NOT NULL,
      lat DOUBLE NOT NULL,
      lng DOUBLE NOT NULL,
      severity VARCHAR(20) NOT NULL,
      status VARCHAR(30) NOT NULL,
      assigned_ambulance_id VARCHAR(64) NULL,
      assigned_hospital_id VARCHAR(64) NULL,
      eta_seconds INT NOT NULL,
      created_by_user_id VARCHAR(64) NOT NULL,
      completed_at TIMESTAMP NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);
}

async function disconnect() {
  if (pool) {
    await pool.end();
  }
}

async function seed(seedData) {
  const [rows] = await pool.query("SELECT COUNT(*) AS total FROM users");
  if (rows[0].total > 0) return;

  for (const user of seedData.users) {
    await pool.query(
      "INSERT INTO users (id, name, email, password_hash, role, hospital_id) VALUES (?, ?, ?, ?, ?, ?)",
      [user.id, user.name, user.email, user.passwordHash, user.role, user.hospitalId || null]
    );
  }

  for (const hospital of seedData.hospitals) {
    await pool.query(
      "INSERT INTO hospitals (id, name, lat, lng, icu_beds, emergency_beds, total_beds, occupancy) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [hospital.id, hospital.name, hospital.lat, hospital.lng, hospital.icuBeds, hospital.emergencyBeds, hospital.totalBeds, hospital.occupancy]
    );
  }

  for (const ambulance of seedData.ambulances) {
    await pool.query(
      "INSERT INTO ambulances (id, vehicle_no, driver_name, lat, lng, status, hospital_id) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [ambulance.id, ambulance.vehicleNo, ambulance.driverName, ambulance.lat, ambulance.lng, ambulance.status, ambulance.hospitalId]
    );
  }
}

async function findUserByEmail(email) {
  const [rows] = await pool.query("SELECT id, name, email, password_hash, role, hospital_id FROM users WHERE email = ? LIMIT 1", [email]);
  return mapRow(rows[0]);
}

async function findUserById(id) {
  const [rows] = await pool.query("SELECT id, name, email, password_hash, role, hospital_id FROM users WHERE id = ? LIMIT 1", [id]);
  return mapRow(rows[0]);
}

async function createUser(payload) {
  const user = {
    id: payload.id || randomUUID(),
    ...payload,
  };

  await pool.query(
    "INSERT INTO users (id, name, email, password_hash, role, hospital_id) VALUES (?, ?, ?, ?, ?, ?)",
    [user.id, user.name, user.email, user.passwordHash, user.role, user.hospitalId || null]
  );

  return user;
}

async function listHospitals() {
  const [rows] = await pool.query(
    "SELECT id, name, lat, lng, icu_beds, emergency_beds, total_beds, occupancy FROM hospitals ORDER BY name ASC"
  );
  return rows.map(mapRow);
}

async function getHospitalById(id) {
  const [rows] = await pool.query(
    "SELECT id, name, lat, lng, icu_beds, emergency_beds, total_beds, occupancy FROM hospitals WHERE id = ? LIMIT 1",
    [id]
  );
  return mapRow(rows[0]);
}

async function updateHospitalBeds(id, updates) {
  await pool.query(
    "UPDATE hospitals SET icu_beds = ?, emergency_beds = ?, occupancy = ? WHERE id = ?",
    [updates.icuBeds, updates.emergencyBeds, updates.occupancy, id]
  );
  return getHospitalById(id);
}

async function listAmbulances(filters = {}) {
  const clauses = [];
  const args = [];

  if (filters.status) {
    clauses.push("status = ?");
    args.push(filters.status);
  }

  if (filters.hospitalId) {
    clauses.push("hospital_id = ?");
    args.push(filters.hospitalId);
  }

  const whereClause = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const [rows] = await pool.query(
    `SELECT id, vehicle_no, driver_name, lat, lng, status, hospital_id FROM ambulances ${whereClause} ORDER BY vehicle_no ASC`,
    args
  );

  return rows.map(mapRow);
}

async function getAmbulanceById(id) {
  const [rows] = await pool.query(
    "SELECT id, vehicle_no, driver_name, lat, lng, status, hospital_id FROM ambulances WHERE id = ? LIMIT 1",
    [id]
  );
  return mapRow(rows[0]);
}

async function updateAmbulance(id, updates) {
  const current = await getAmbulanceById(id);
  if (!current) return null;

  await pool.query(
    "UPDATE ambulances SET status = ?, lat = ?, lng = ?, hospital_id = ? WHERE id = ?",
    [updates.status || current.status, updates.lat ?? current.lat, updates.lng ?? current.lng, updates.hospitalId || current.hospitalId, id]
  );

  return getAmbulanceById(id);
}

async function createEmergency(payload) {
  const emergency = {
    id: payload.id || randomUUID(),
    ...payload,
  };

  await pool.query(
    `INSERT INTO emergencies (
      id, patient_name, phone, type, description, lat, lng, severity, status,
      assigned_ambulance_id, assigned_hospital_id, eta_seconds, created_by_user_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      emergency.id,
      emergency.patientName,
      emergency.phone,
      emergency.type,
      emergency.description,
      emergency.lat,
      emergency.lng,
      emergency.severity,
      emergency.status,
      emergency.assignedAmbulanceId || null,
      emergency.assignedHospitalId || null,
      emergency.etaSeconds,
      emergency.createdByUserId,
    ]
  );

  return getEmergencyById(emergency.id);
}

async function getEmergencyById(id) {
  const [rows] = await pool.query(
    `SELECT id, patient_name, phone, type, description, lat, lng, severity, status,
      assigned_ambulance_id, assigned_hospital_id, eta_seconds, created_by_user_id,
      completed_at, created_at, updated_at
     FROM emergencies WHERE id = ? LIMIT 1`,
    [id]
  );

  return mapRow(rows[0]);
}

async function listEmergencies(filters = {}) {
  const clauses = [];
  const args = [];

  if (filters.createdByUserId) {
    clauses.push("created_by_user_id = ?");
    args.push(filters.createdByUserId);
  }

  if (filters.assignedHospitalId) {
    clauses.push("assigned_hospital_id = ?");
    args.push(filters.assignedHospitalId);
  }

  if (filters.status) {
    clauses.push("status = ?");
    args.push(filters.status);
  }

  const whereClause = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const [rows] = await pool.query(
    `SELECT id, patient_name, phone, type, description, lat, lng, severity, status,
      assigned_ambulance_id, assigned_hospital_id, eta_seconds, created_by_user_id,
      completed_at, created_at, updated_at
     FROM emergencies ${whereClause} ORDER BY created_at DESC`,
    args
  );

  return rows.map(mapRow);
}

async function updateEmergency(id, updates) {
  const current = await getEmergencyById(id);
  if (!current) return null;

  await pool.query(
    `UPDATE emergencies
     SET status = ?, assigned_ambulance_id = ?, assigned_hospital_id = ?, eta_seconds = ?, completed_at = ?
     WHERE id = ?`,
    [
      updates.status || current.status,
      updates.assignedAmbulanceId ?? current.assignedAmbulanceId,
      updates.assignedHospitalId ?? current.assignedHospitalId,
      updates.etaSeconds ?? current.etaSeconds,
      updates.completedAt ?? current.completedAt,
      id,
    ]
  );

  return getEmergencyById(id);
}

module.exports = {
  provider: "mysql",
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
