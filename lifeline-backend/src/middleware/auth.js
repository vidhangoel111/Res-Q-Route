const { verifyToken } = require("../services/tokenService");

function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    if (process.env.NODE_ENV !== "production" && req.headers["x-dev-user-id"] && req.headers["x-dev-role"]) {
      req.user = {
        sub: String(req.headers["x-dev-user-id"]),
        role: String(req.headers["x-dev-role"]),
        name: String(req.headers["x-dev-user-name"] || "Dev User"),
        email: String(req.headers["x-dev-user-email"] || "dev@resqroute.local"),
        hospitalId: req.headers["x-dev-hospital-id"] ? String(req.headers["x-dev-hospital-id"]) : null,
      };
      return next();
    }

    return res.status(401).json({ message: "Missing or invalid Authorization header" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const payload = verifyToken(token);
    req.user = payload;
    next();
  } catch (_error) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}

function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    next();
  };
}

module.exports = {
  authenticate,
  authorize,
};
