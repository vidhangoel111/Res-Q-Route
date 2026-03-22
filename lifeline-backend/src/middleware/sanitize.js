function sanitizeObject(value) {
  if (!value || typeof value !== "object") {
    return;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      sanitizeObject(item);
    }
    return;
  }

  for (const key of Object.keys(value)) {
    // Strip mongo operator and dotted keys to reduce NoSQL injection surface.
    if (key.startsWith("$") || key.includes(".")) {
      delete value[key];
      continue;
    }

    sanitizeObject(value[key]);
  }
}

function sanitizeRequest(req, _res, next) {
  sanitizeObject(req.body);
  sanitizeObject(req.params);
  sanitizeObject(req.query);
  next();
}

module.exports = {
  sanitizeRequest,
};
