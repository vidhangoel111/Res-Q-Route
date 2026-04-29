# Socket.io Guide (Master)

This is the single source of truth for real-time ambulance tracking.

## Purpose

Socket.io is used to push live ambulance location updates to dashboards without page refresh.

## Current Runtime Ports

- Frontend: http://localhost:8000
- Backend API + Socket.io: http://localhost:3001

## Core Flow

1. Driver browser gets GPS from Geolocation API.
2. Frontend sends location to backend endpoint.
3. Backend stores new location and emits Socket.io event.
4. All connected dashboards receive and render updated marker positions.

## Main Files

### Backend

- lifeline-backend/src/server.js
  - Initializes HTTP server + Socket.io.
- lifeline-backend/src/config/socket.js
  - Socket.io server setup, rooms, CORS.
- lifeline-backend/src/services/socketEvents.service.js
  - Event emit helpers.
- lifeline-backend/src/routes/ambulance.routes.js
  - PATCH location endpoint and broadcast trigger.

### Frontend

- src/hooks/use-socket.ts
  - Socket.io client connection and event listeners.
- src/hooks/use-location-tracking.ts
  - Auto GPS tracking and periodic location updates.
- src/components/RealTimeEmergencyMap.tsx
  - Real-time map wrapper for dashboards.
- src/components/EmergencyMap.tsx
  - Underlying Leaflet map renderer.

## Event Contract

### Event: ambulance_moved

- Emitted when location is updated.
- Payload shape:

```json
{
  "ambulanceId": "amb_001",
  "lat": 28.6139,
  "lng": 77.2090,
  "timestamp": "2026-04-13T10:00:00.000Z"
}
```

## API Contract

### Update Ambulance Location

- Method: PATCH
- Path: /ambulances/:id/location
- Auth: Bearer token
- Body:

```json
{
  "lat": 28.6139,
  "lng": 77.2090
}
```

## Environment Variables

### Frontend

- VITE_BACKEND_URL=http://localhost:3001

### Backend

- PORT=3001
- FRONTEND_ORIGIN=http://localhost:8000,http://localhost:5173
- DB_PROVIDER=memory (or mongo/mysql)

## Integration Notes

- useLocationTracking is auto-enabled when ambulanceId is present.
- useSocket keeps a live ambulanceLocations object keyed by ambulance ID.
- RealTimeEmergencyMap merges static ambulance list with live positions.

## Troubleshooting

1. No live updates:
   - Confirm backend is running on 3001.
   - Confirm frontend VITE_BACKEND_URL points to 3001.
   - Check browser console for Socket connection errors.

2. GPS not updating:
   - Browser location permission must be allowed.
   - In production, GPS usually requires HTTPS.

3. CORS issues:
   - Ensure FRONTEND_ORIGIN includes current frontend URL.

## Related Docs

- SOCKET_IO_QUICKSTART.md for fast startup
- IMPLEMENTATION_CHECKLIST.md for validation checklist

Response:
{
  "id": "amb_001",
  "vehicleNo": "KA-01-1234",
  "lat": 28.6139,
  "lng": 77.2090,
  "status": "BUSY",
  "timestamp": "2025-04-10T12:34:56Z"
}
```

## How It Works

### Flow for Real-Time Ambulance Tracking

1. **Ambulance Driver**
   - Uses `useLocationTracking` hook which access GPS via browser's Geolocation API
   - Sends location updates to backend every ~5 seconds
   - Location is updated in the database

2. **Backend**
   - Receives location update via `/ambulances/:id/location` endpoint
   - Updates database
   - Emits `ambulance_moved` event to all dashboard viewers via Socket.io

3. **Dispatchers/Users Viewing Map**
   - Connected via `useSocket` hook
   - Subscribe to `ambulance_moved` events
   - Update ambulance marker positions in real-time on the map

### Socket.io Rooms

- **dashboard**: All viewers who need real-time data (dispatchers, emergency responders)
- **incident_{incidentId}**: Specific viewers tracking a particular incident

## Testing Real-Time Features

### Test with Multiple Simulators
1. Open ambulance driver dashboard in one browser
2. Open dispatcher dashboard in another browser
3. Start location tracking on driver side
4. Watch location update in real-time on dispatcher side

### Using Browser DevTools
1. Open DevTools Network tab
2. Filter for "WS" (WebSocket) protocol
3. See messages like `ambulance_moved` in real-time

## Performance Considerations

1. **Location Update Frequency**: Currently set to ~5 seconds
   - Adjust in `use-location-tracking.ts` if needed
   - Too frequent: High network usage
   - Too infrequent: Jerky motion on map

2. **Accuracy**: Set to `enableHighAccuracy: true`
   - More battery drain on mobile devices
   - Can be toggled based on device capability

3. **Scalability**: Socket.io automatically handles:
   - Connection pooling
   - Message queuing
   - Graceful degradation (fallback to polling)

## Troubleshooting

### Socket Connection Issues
- Verify `VITE_BACKEND_URL` env variable is set correctly
- Check CORS settings in backend `config/socket.js`
- Ensure backend Socket.io server is running

### Location Not Updating
- Check browser permissions for Geolocation
- Verify `useLocationTracking` is enabled
- Check network requests in DevTools for `/ambulances/:id/location` calls

### Map Not Showing Updated Positions
- Verify `useSocket` hook is properly integrated in map component
- Check console for Socket.io connection messages
- Ensure ambulance IDs match between backend and frontend

## Next Steps (Optional Enhancements)

1. **Location History**: Store path trails for ambulances
2. **Route Optimization**: Use location updates to optimize routes in real-time
3. **ETA Calculation**: Calculate real-time ETA based on ambulance location and traffic
4. **Geofencing**: Alert when ambulance enters/exits hospital zones
5. **Location Sharing**: Share live links so others can track ambulance without dashboard login
6. **Performance Metrics**: Track average response time, distance traveled, etc.

## File Modifications Summary

### Backend
- ✅ `src/server.js` - Updated to use HTTP server with Socket.io
- ✅ `src/routes/ambulance.routes.js` - Added location update endpoint
- ✅ `src/config/socket.js` - Already configured
- ✅ `src/services/socketEvents.service.js` - Already configured

### Frontend
- ✅ `src/hooks/use-socket.ts` - NEW: Socket.io client hook
- ✅ `src/hooks/use-location-tracking.ts` - NEW: GPS tracking hook
- 📝 `src/components/EmergencyMap.tsx` - Should integrate useSocket for live updates
- 📝 Dashboard components - Should use these hooks

## Quick Start

1. Start backend: `npm run dev` (in lifeline-backend)
2. Start frontend: `npm run dev` (in root)
3. Open dispatcher dashboard - it automatically connects via Socket.io
4. Start ambulance tracking in driver dashboard
5. See real-time location updates on the map! 🚑📍
