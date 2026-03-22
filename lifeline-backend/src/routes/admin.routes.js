const express = require("express");
const db = require("../db");
const { USER_ROLES, EMERGENCY_STATUS } = require("../config/constants");
const { authenticate, authorize } = require("../middleware/auth");
const { asyncHandler } = require("../utils/asyncHandler");

const router = express.Router();

router.get(
  "/summary",
  authenticate,
  authorize(USER_ROLES.ADMIN),
  asyncHandler(async (_req, res) => {
    const [emergencies, ambulances, hospitals] = await Promise.all([
      db.listEmergencies(),
      db.listAmbulances(),
      db.listHospitals(),
    ]);

    const totalEmergenciesToday = emergencies.filter((item) => {
      const created = new Date(item.createdAt || item.created_at || Date.now());
      const today = new Date();
      return created.toDateString() === today.toDateString();
    }).length;

    const completed = emergencies.filter((item) => item.status === EMERGENCY_STATUS.COMPLETED).length;
    const avgEtaSeconds = emergencies.length
      ? Math.round(emergencies.reduce((acc, item) => acc + (item.etaSeconds || 0), 0) / emergencies.length)
      : 0;

    const ambulanceUtilization = ambulances.length
      ? Math.round((ambulances.filter((item) => item.status !== "available").length / ambulances.length) * 100)
      : 0;

    const bedOccupancy = hospitals.length
      ? Math.round(hospitals.reduce((acc, item) => acc + (item.occupancy || 0), 0) / hospitals.length)
      : 0;

    res.json({
      totalEmergenciesToday,
      totalEmergencies: emergencies.length,
      completedEmergencies: completed,
      avgEtaSeconds,
      ambulanceUtilization,
      bedOccupancy,
      hospitals: hospitals.length,
      ambulances: ambulances.length,
    });
  })
);

module.exports = router;
