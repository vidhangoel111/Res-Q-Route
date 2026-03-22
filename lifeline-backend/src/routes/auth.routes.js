const express = require("express");
const bcrypt = require("bcryptjs");
const { z } = require("zod");
const db = require("../db");
const { USER_ROLES } = require("../config/constants");
const { signAccessToken } = require("../services/tokenService");
const { validate } = require("../middleware/validate");
const { asyncHandler } = require("../utils/asyncHandler");

const router = express.Router();

const registerSchema = z.object({
  body: z.object({
    name: z.string().min(2),
    email: z.string().email(),
    password: z.string().min(8),
    role: z.enum([USER_ROLES.USER, USER_ROLES.HOSPITAL]).default(USER_ROLES.USER),
    hospitalId: z.string().optional(),
  }),
  params: z.object({}),
  query: z.object({}),
});

const loginSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(1),
  }),
  params: z.object({}),
  query: z.object({}),
});

router.post(
  "/register",
  validate(registerSchema),
  asyncHandler(async (req, res) => {
    const payload = req.validated.body;

    const existing = await db.findUserByEmail(payload.email);
    if (existing) {
      return res.status(409).json({ message: "Email already registered" });
    }

    if (payload.role === USER_ROLES.HOSPITAL && !payload.hospitalId) {
      return res.status(400).json({ message: "hospitalId is required for hospital role" });
    }

    const passwordHash = await bcrypt.hash(payload.password, 10);
    const user = await db.createUser({
      name: payload.name,
      email: payload.email,
      passwordHash,
      role: payload.role,
      hospitalId: payload.hospitalId || null,
    });

    const token = signAccessToken({
      sub: user.id,
      email: user.email,
      role: user.role,
      hospitalId: user.hospitalId,
      name: user.name,
    });

    return res.status(201).json({
      message: "Registration successful",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        hospitalId: user.hospitalId,
      },
    });
  })
);

router.post(
  "/login",
  validate(loginSchema),
  asyncHandler(async (req, res) => {
    const { email, password } = req.validated.body;

    const user = await db.findUserByEmail(email);
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const token = signAccessToken({
      sub: user.id,
      email: user.email,
      role: user.role,
      hospitalId: user.hospitalId,
      name: user.name,
    });

    return res.json({
      message: "Login successful",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        hospitalId: user.hospitalId,
      },
    });
  })
);

module.exports = router;
