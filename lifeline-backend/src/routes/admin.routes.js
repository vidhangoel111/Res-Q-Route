const express = require("express");
const db = require("../db");
const { USER_ROLES, EMERGENCY_STATUS } = require("../config/constants");
const { authenticate, authorize } = require("../middleware/auth");
const { asyncHandler } = require("../utils/asyncHandler");

const router = express.Router();

function getWindowStart(windowKey) {
  const now = new Date();
  if (windowKey === "1h") {
    return new Date(now.getTime() - 60 * 60 * 1000);
  }
  if (windowKey === "24h") {
    return new Date(now.getTime() - 24 * 60 * 60 * 1000);
  }
  if (windowKey === "today") {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    return start;
  }
  return null;
}

router.get(
  "/summary",
  authenticate,
  authorize(USER_ROLES.ADMIN),
  asyncHandler(async (req, res) => {
    const [emergencies, ambulances, hospitals, users, history] = await Promise.all([
      db.listEmergencies(),
      db.listAmbulances(),
      db.listHospitals(),
      db.listUsers(),
      db.listHospitalHistory(),
    ]);

    const selectedWindow = typeof req.query.window === "string" ? req.query.window : "today";
    const windowStart = getWindowStart(selectedWindow);
    const scopedEmergencies = windowStart
      ? emergencies.filter((item) => {
          const created = new Date(item.createdAt || item.created_at || Date.now());
          return created >= windowStart;
        })
      : emergencies;

    const totalEmergenciesToday = emergencies.filter((item) => {
      const created = new Date(item.createdAt || item.created_at || Date.now());
      const today = new Date();
      return created.toDateString() === today.toDateString();
    }).length;

    const completed = scopedEmergencies.filter((item) => item.status === EMERGENCY_STATUS.COMPLETED).length;
    const avgEtaSeconds = scopedEmergencies.length
      ? Math.round(scopedEmergencies.reduce((acc, item) => acc + (item.etaSeconds || 0), 0) / scopedEmergencies.length)
      : 0;

    const ambulanceUtilization = ambulances.length
      ? Math.round((ambulances.filter((item) => item.status !== "available").length / ambulances.length) * 100)
      : 0;

    const bedOccupancy = hospitals.length
      ? Math.round(hospitals.reduce((acc, item) => acc + (item.occupancy || 0), 0) / hospitals.length)
      : 0;

    const cleanUsers = users.map((user) => {
      const { passwordHash, ...rest } = user;
      return rest;
    });

    const userStats = cleanUsers.map((user) => {
      const userEmergencies = emergencies.filter((item) => item.createdByUserId === user.id);
      return {
        ...user,
        emergencyCount: userEmergencies.length,
        lastEmergencyAt: userEmergencies[0]?.createdAt || null,
      };
    });

    const hospitalStats = hospitals.map((hospital) => {
      const assignedEmergencies = emergencies.filter((item) => item.assignedHospitalId === hospital.id);
      const hospitalHistory = history.filter((item) => item.hospitalId === hospital.id);
      return {
        ...hospital,
        emergencyCount: assignedEmergencies.length,
        historyCount: hospitalHistory.length,
        lastHistoryAt: hospitalHistory[0]?.createdAt || null,
      };
    });

    const recentHistory = history.slice(0, 15);

    res.json({
      totalEmergenciesToday,
      totalEmergencies: scopedEmergencies.length,
      completedEmergencies: completed,
      avgEtaSeconds,
      ambulanceUtilization,
      bedOccupancy,
      hospitals: hospitals.length,
      ambulances: ambulances.length,
      users: cleanUsers.length,
      window: selectedWindow,
      userStats,
      hospitalStats,
      recentHistory,
    });
  })
);

module.exports = router;
