// src/services/socketEvents.service.js
const { getIO } = require('../config/socket')

// Call this when a new incident is created
const emitNewIncident = (incident, ambulance, hospital) => {
  const io = getIO()
  io.to('dashboard').emit('new_incident', {
    incident,
    ambulance,
    hospital,
    message: `New ${incident.severity} incident at ${incident.location}`
  })
}

// Call this when ambulance location updates
const emitAmbulanceMoved = (ambulanceId, lat, lng) => {
  const io = getIO()
  io.to('dashboard').emit('ambulance_moved', {
    ambulanceId, lat, lng,
    timestamp: new Date().toISOString()
  })
}

// Call this when incident status changes
const emitIncidentStatusUpdate = (incidentId, status, message) => {
  const io = getIO()
  // Emit to dashboard AND to anyone tracking this specific incident
  io.to('dashboard').emit('incident_status_changed', { incidentId, status, message })
  io.to(`incident_${incidentId}`).emit('incident_update', { status, message })
}

// Call this when hospital beds update
const emitHospitalUpdate = (hospitalId, bedsAvailable, icuAvailable) => {
  const io = getIO()
  io.to('dashboard').emit('hospital_updated', {
    hospitalId, bedsAvailable, icuAvailable
  })
}

module.exports = {
  emitNewIncident,
  emitAmbulanceMoved,
  emitIncidentStatusUpdate,
  emitHospitalUpdate
}