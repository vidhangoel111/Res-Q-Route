const express = require("express");
const { randomUUID } = require("crypto");
const { z } = require("zod");
const db = require("../db");
const { USER_ROLES, EMERGENCY_STATUS, AMBULANCE_STATUS } = require("../config/constants");
const { authenticate, authorize } = require("../middleware/auth");
const { validate } = require("../middleware/validate");
const { asyncHandler } = require("../utils/asyncHandler");
const { assignResources, enrichEmergency } = require("../services/dispatchService");
const { haversineDistance } = require("../utils/geo");

const router = express.Router();

const createEmergencySchema = z.object({
  body: z.object({
    patientName: z.string().min(2),
    phone: z.string().min(8),
    type: z.string().min(2),
    description: z.string().min(5),
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
    severity: z.enum(["critical", "high", "medium", "low"]).optional(),
  }),
  params: z.object({}),
  query: z.object({}),
});

const updateStatusSchema = z.object({
  body: z.object({
    status: z.enum([
      EMERGENCY_STATUS.SUBMITTED,
      EMERGENCY_STATUS.CLASSIFIED,
      EMERGENCY_STATUS.ASSIGNED,
      EMERGENCY_STATUS.EN_ROUTE,
      EMERGENCY_STATUS.ARRIVED,
      EMERGENCY_STATUS.TRANSPORTING,
      EMERGENCY_STATUS.COMPLETED,
    ]),
  }),
  params: z.object({ id: z.string().min(1) }),
  query: z.object({}),
});

const simulateSchema = z.object({
  body: z.object({
    type: z.string().min(2),
    description: z.string().min(5),
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
    severity: z.enum(["critical", "high", "medium", "low"]).optional(),
  }),
  params: z.object({}),
  query: z.object({}),
});

function isLikelyDuplicate(existing, incoming) {
  const createdAt = new Date(existing.createdAt || existing.created_at || Date.now());
  const ageMs = Date.now() - createdAt.getTime();
  const withinCooldown = ageMs >= 0 && ageMs <= 120000;
  if (!withinCooldown) return false;

  const sameType = (existing.type || "").toLowerCase() === (incoming.type || "").toLowerCase();
  const samePhone = (existing.phone || "") === (incoming.phone || "");
  const distanceKm = haversineDistance(incoming.lat, incoming.lng, existing.lat, existing.lng);
  return sameType && samePhone && distanceKm <= 0.35;
}

router.post(
  "/simulate",
  authenticate,
  authorize(USER_ROLES.USER, USER_ROLES.HOSPITAL, USER_ROLES.ADMIN),
  validate(simulateSchema),
  asyncHandler(async (req, res) => {
    const payload = req.validated.body;
    const assignment = await assignResources(payload);

    res.json({
      mode: "simulation",
      input: payload,
      assignment,
      message: "Simulation completed. No emergency record was created.",
    });
  })
);

router.post(
  "/",
  authenticate,
  authorize(USER_ROLES.USER, USER_ROLES.HOSPITAL, USER_ROLES.ADMIN),
  validate(createEmergencySchema),
  asyncHandler(async (req, res) => {
    const payload = req.validated.body;

    const recentEmergencies = await db.listEmergencies({ createdByUserId: req.user.sub });
    const duplicate = recentEmergencies.find((item) => isLikelyDuplicate(item, payload));
    if (duplicate) {
      const existing = await enrichEmergency(duplicate);
      return res.status(202).json({
        ...existing,
        duplicate: true,
        message: "Similar emergency already created in the last 2 minutes. Reusing existing request.",
      });
    }

    const assignment = await assignResources(payload);

    const emergency = await db.createEmergency({
      id: `EMR-${randomUUID().slice(0, 8).toUpperCase()}`,
      patientName: payload.patientName,
      phone: payload.phone,
      type: payload.type,
      description: payload.description,
      lat: payload.lat,
      lng: payload.lng,
      severity: assignment.severity,
      status: assignment.assignedAmbulanceId ? EMERGENCY_STATUS.ASSIGNED : EMERGENCY_STATUS.CLASSIFIED,
      assignedAmbulanceId: assignment.assignedAmbulanceId,
      assignedHospitalId: assignment.assignedHospitalId,
      etaSeconds: assignment.etaSeconds,
      createdByUserId: req.user.sub,
    });

    if (assignment.assignedAmbulanceId) {
      await db.updateAmbulance(assignment.assignedAmbulanceId, { status: AMBULANCE_STATUS.BUSY });
    }

    if (assignment.assignedHospitalId) {
      const hospital = await db.getHospitalById(assignment.assignedHospitalId);
      await db.createHospitalHistory({
        hospitalId: assignment.assignedHospitalId,
        hospitalName: hospital?.name || null,
        action: "EMERGENCY_CREATED",
        details: `Emergency ${emergency.id} created for ${payload.patientName} with severity ${assignment.severity}.`,
        actorUserId: req.user.sub,
        actorName: req.user.name,
        source: "emergency",
        emergencyId: emergency.id,
      });
    }

    const enriched = await enrichEmergency(emergency);
    res.status(201).json({
      ...enriched,
      assignmentMeta: {
        confidence: assignment.assignmentConfidence,
        reasons: assignment.assignmentReasons,
        ambulanceCandidates: assignment.ambulanceCandidates,
        hospitalCandidates: assignment.hospitalCandidates,
      },
    });
  })
);

router.get(
  "/",
  authenticate,
  asyncHandler(async (req, res) => {
    const filters = {};

    if (req.user.role === USER_ROLES.USER) {
      filters.createdByUserId = req.user.sub;
    }

    if (req.user.role === USER_ROLES.HOSPITAL) {
      filters.assignedHospitalId = req.user.hospitalId;
    }

    const emergencies = await db.listEmergencies(filters);
    const enriched = await Promise.all(emergencies.map((emergency) => enrichEmergency(emergency)));
    res.json(enriched);
  })
);

router.get(
  "/:id",
  authenticate,
  asyncHandler(async (req, res) => {
    const emergency = await db.getEmergencyById(req.params.id);
    if (!emergency) {
      return res.status(404).json({ message: "Emergency not found" });
    }

    if (req.user.role === USER_ROLES.USER && emergency.createdByUserId !== req.user.sub) {
      return res.status(403).json({ message: "Forbidden" });
    }

    if (req.user.role === USER_ROLES.HOSPITAL && emergency.assignedHospitalId !== req.user.hospitalId) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const enriched = await enrichEmergency(emergency);
    res.json(enriched);
  })
);

router.patch(
  "/:id/status",
  authenticate,
  authorize(USER_ROLES.HOSPITAL, USER_ROLES.ADMIN),
  validate(updateStatusSchema),
  asyncHandler(async (req, res) => {
    const emergency = await db.getEmergencyById(req.validated.params.id);

    if (!emergency) {
      return res.status(404).json({ message: "Emergency not found" });
    }

    if (req.user.role === USER_ROLES.HOSPITAL && emergency.assignedHospitalId !== req.user.hospitalId) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const updates = { status: req.validated.body.status };

    if (req.validated.body.status === EMERGENCY_STATUS.COMPLETED) {
      updates.completedAt = new Date();

      if (emergency.assignedAmbulanceId) {
        await db.updateAmbulance(emergency.assignedAmbulanceId, { status: AMBULANCE_STATUS.AVAILABLE });
      }

      if (emergency.assignedHospitalId) {
        const hospital = await db.getHospitalById(emergency.assignedHospitalId);
        await db.createHospitalHistory({
          hospitalId: emergency.assignedHospitalId,
          hospitalName: hospital?.name || null,
          action: "EMERGENCY_COMPLETED",
          details: `Emergency ${emergency.id} marked completed for ${emergency.patientName}.`,
          actorUserId: req.user.sub,
          actorName: req.user.name,
          source: "emergency",
          emergencyId: emergency.id,
        });
      }
    }

    const updated = await db.updateEmergency(emergency.id, updates);
    const enriched = await enrichEmergency(updated);
    res.json(enriched);
  })
);

router.post(
  "/:id/assign",
  authenticate,
  authorize(USER_ROLES.HOSPITAL, USER_ROLES.ADMIN),
  asyncHandler(async (req, res) => {
    const emergency = await db.getEmergencyById(req.params.id);

    if (!emergency) {
      return res.status(404).json({ message: "Emergency not found" });
    }

    if (req.user.role === USER_ROLES.HOSPITAL && emergency.assignedHospitalId && emergency.assignedHospitalId !== req.user.hospitalId) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const assignment = await assignResources(emergency);
    const updated = await db.updateEmergency(emergency.id, {
      status: EMERGENCY_STATUS.ASSIGNED,
      assignedAmbulanceId: assignment.assignedAmbulanceId,
      assignedHospitalId: assignment.assignedHospitalId,
      etaSeconds: assignment.etaSeconds,
    });

    if (assignment.assignedAmbulanceId) {
      await db.updateAmbulance(assignment.assignedAmbulanceId, { status: AMBULANCE_STATUS.BUSY });
    }

    if (assignment.assignedHospitalId) {
      const hospital = await db.getHospitalById(assignment.assignedHospitalId);
      await db.createHospitalHistory({
        hospitalId: assignment.assignedHospitalId,
        hospitalName: hospital?.name || null,
        action: "EMERGENCY_ASSIGNED",
        details: `Emergency ${updated.id} assigned to ${hospital?.name || assignment.assignedHospitalId} with ETA ${assignment.etaSeconds ?? 0}s.`,
        actorUserId: req.user.sub,
        actorName: req.user.name,
        source: "emergency",
        emergencyId: updated.id,
      });
    }

    const enriched = await enrichEmergency(updated);
    res.json({
      ...enriched,
      assignmentMeta: {
        confidence: assignment.assignmentConfidence,
        reasons: assignment.assignmentReasons,
        ambulanceCandidates: assignment.ambulanceCandidates,
        hospitalCandidates: assignment.hospitalCandidates,
      },
    });
  })
);

module.exports = router;
