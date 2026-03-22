const bcrypt = require("bcryptjs");
const db = require("../db");
const { USER_ROLES, AMBULANCE_STATUS } = require("../config/constants");

async function buildSeedData() {
  const passwordHash = await bcrypt.hash("Password@123", 10);

  return {
    users: [
      {
        id: "u1",
        name: "Rahul Sharma",
        email: "user@resqroute.in",
        passwordHash,
        role: USER_ROLES.USER,
        hospitalId: null,
      },
      {
        id: "h-user-1",
        name: "City General Hospital",
        email: "hospital@resqroute.in",
        passwordHash,
        role: USER_ROLES.HOSPITAL,
        hospitalId: "h1",
      },
      {
        id: "a1",
        name: "Admin Control",
        email: "admin@resqroute.in",
        passwordHash,
        role: USER_ROLES.ADMIN,
        hospitalId: null,
      },
    ],
    hospitals: [
      { id: "h1", name: "City General Hospital", lat: 28.6139, lng: 77.209, icuBeds: 12, emergencyBeds: 24, totalBeds: 200, occupancy: 72 },
      { id: "h2", name: "Apollo Emergency Center", lat: 28.5672, lng: 77.21, icuBeds: 8, emergencyBeds: 16, totalBeds: 150, occupancy: 65 },
      { id: "h3", name: "AIIMS Trauma Centre", lat: 28.5672, lng: 77.2099, icuBeds: 20, emergencyBeds: 40, totalBeds: 500, occupancy: 85 },
      { id: "h4", name: "Max Super Speciality", lat: 28.6304, lng: 77.2177, icuBeds: 15, emergencyBeds: 30, totalBeds: 300, occupancy: 58 },
    ],
    ambulances: [
      { id: "a1", vehicleNo: "DL-01-AB-1234", driverName: "Suresh Kumar", lat: 28.62, lng: 77.215, status: AMBULANCE_STATUS.AVAILABLE, hospitalId: "h1" },
      { id: "a2", vehicleNo: "DL-02-CD-5678", driverName: "Rajesh Singh", lat: 28.58, lng: 77.2, status: AMBULANCE_STATUS.AVAILABLE, hospitalId: "h2" },
      { id: "a3", vehicleNo: "DL-03-EF-9012", driverName: "Amit Verma", lat: 28.6, lng: 77.23, status: AMBULANCE_STATUS.BUSY, hospitalId: "h1" },
      { id: "a4", vehicleNo: "DL-04-GH-3456", driverName: "Pradeep Yadav", lat: 28.635, lng: 77.205, status: AMBULANCE_STATUS.AVAILABLE, hospitalId: "h3" },
      { id: "a5", vehicleNo: "DL-05-IJ-7890", driverName: "Vikram Chauhan", lat: 28.59, lng: 77.225, status: AMBULANCE_STATUS.MAINTENANCE, hospitalId: "h4" },
    ],
  };
}

async function seedDatabase() {
  const seedData = await buildSeedData();
  await db.seed(seedData);
}

module.exports = {
  seedDatabase,
};
