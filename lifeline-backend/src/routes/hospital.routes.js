const express = require("express");
const { z } = require("zod");
const db = require("../db");
const { USER_ROLES } = require("../config/constants");
const { authenticate, authorize } = require("../middleware/auth");
const { validate } = require("../middleware/validate");
const { asyncHandler } = require("../utils/asyncHandler");

const router = express.Router();

const updateBedsSchema = z.object({
  body: z.object({
    icuBeds: z.number().int().min(0),
    emergencyBeds: z.number().int().min(0),
    occupancy: z.number().int().min(0).max(100),
  }),
  params: z.object({ id: z.string().min(1) }),
  query: z.object({}),
});

router.get(
  "/",
  authenticate,
  asyncHandler(async (_req, res) => {
    const hospitals = await db.listHospitals();
    res.json(hospitals);
  })
);

router.patch(
  "/:id/beds",
  authenticate,
  authorize(USER_ROLES.HOSPITAL, USER_ROLES.ADMIN),
  validate(updateBedsSchema),
  asyncHandler(async (req, res) => {
    const hospitalId = req.validated.params.id;

    if (req.user.role === USER_ROLES.HOSPITAL && req.user.hospitalId !== hospitalId) {
      return res.status(403).json({ message: "Hospital users can update only their own hospital" });
    }

    const existing = await db.getHospitalById(hospitalId);
    if (!existing) {
      return res.status(404).json({ message: "Hospital not found" });
    }

    const updated = await db.updateHospitalBeds(hospitalId, req.validated.body);
    res.json(updated);
  })
);

module.exports = router;
