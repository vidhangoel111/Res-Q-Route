const USER_ROLES = {
  USER: "user",
  HOSPITAL: "hospital",
  ADMIN: "admin",
};

const AMBULANCE_STATUS = {
  AVAILABLE: "available",
  BUSY: "busy",
  MAINTENANCE: "maintenance",
};

const EMERGENCY_STATUS = {
  SUBMITTED: "SUBMITTED",
  CLASSIFIED: "CLASSIFIED",
  ASSIGNED: "ASSIGNED",
  EN_ROUTE: "EN_ROUTE",
  ARRIVED: "ARRIVED",
  TRANSPORTING: "TRANSPORTING",
  COMPLETED: "COMPLETED",
};

const SEVERITY_LEVELS = ["critical", "high", "medium", "low"];

module.exports = {
  USER_ROLES,
  AMBULANCE_STATUS,
  EMERGENCY_STATUS,
  SEVERITY_LEVELS,
};
