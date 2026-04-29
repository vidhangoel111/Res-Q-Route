const express = require("express");
const { z } = require("zod");
const db = require("../db");
const { USER_ROLES, AMBULANCE_STATUS } = require("../config/constants");
const { authenticate, authorize } = require("../middleware/auth");
const { validate } = require("../middleware/validate");
const { asyncHandler } = require("../utils/asyncHandler");
const { emitAmbulanceMoved } = require("../services/socketEvents.service");

const router = express.Router();

const updateStatusSchema = z.object({
  body: z.object({
    status: z.enum([AMBULANCE_STATUS.AVAILABLE, AMBULANCE_STATUS.BUSY, AMBULANCE_STATUS.MAINTENANCE]),
  }),
  params: z.object({ id: z.string().min(1) }),
  query: z.object({}),
});

const updateLocationSchema = z.object({
  body: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
  }),
  params: z.object({ id: z.string().min(1) }),
  query: z.object({}),
});

router.get(
  "/",
  authenticate,
  asyncHandler(async (req, res) => {
    const filters = {};

    if (req.query.status) {
      filters.status = req.query.status;
    }

    if (req.user.role === USER_ROLES.HOSPITAL) {
      filters.hospitalId = req.user.hospitalId;
    }

    const ambulances = await db.listAmbulances(filters);
    res.json(ambulances);
  })
);

router.patch(
  "/:id/status",
  authenticate,
  authorize(USER_ROLES.HOSPITAL, USER_ROLES.ADMIN),
  validate(updateStatusSchema),
  asyncHandler(async (req, res) => {
    const id = req.validated.params.id;
    const ambulance = await db.getAmbulanceById(id);

    if (!ambulance) {
      return res.status(404).json({ message: "Ambulance not found" });
    }

    if (req.user.role === USER_ROLES.HOSPITAL && req.user.hospitalId !== ambulance.hospitalId) {
      return res.status(403).json({ message: "Hospital users can update only their own ambulances" });
    }

    const updated = await db.updateAmbulance(id, { status: req.validated.body.status });
    res.json(updated);
  })
);

// Update ambulance location in real-time
router.patch(
  "/:id/location",
  authenticate,
  validate(updateLocationSchema),
  asyncHandler(async (req, res) => {
    const id = req.validated.params.id;
    const { lat, lng } = req.validated.body;

    const ambulance = await db.getAmbulanceById(id);
    if (!ambulance) {
      return res.status(404).json({ message: "Ambulance not found" });
    }

    const updated = await db.updateAmbulance(id, { lat, lng });
    
    // Broadcast location update to all connected clients
    emitAmbulanceMoved(id, lat, lng);

    res.json(updated);
  })
);

module.exports = router;
