# Socket.io Quickstart

Use this when you want the fastest path to a working real-time demo.

## 1) Start backend

From lifeline-backend:

```bash
npm run dev
```

Expected: backend starts on 3001.

## 2) Start frontend

From repo root:

```bash
npm run dev
```

Expected: frontend starts on 8000.

## 3) Verify env values

Frontend should resolve:

- VITE_BACKEND_URL=http://localhost:3001

Backend should allow frontend origin:

- FRONTEND_ORIGIN=http://localhost:8000,http://localhost:5173

## 4) Open dashboards

- Dispatcher/Admin dashboard for viewing live ambulances.
- Driver dashboard for GPS-origin location updates.

## 5) Confirm live flow

1. Driver grants browser location permission.
2. Driver location updates every few seconds.
3. Dispatcher map updates without refresh.

## If something is not updating

1. Check backend port 3001 is listening.
2. Check frontend is using VITE_BACKEND_URL=3001.
3. Check browser console for Socket connection errors.
4. Check location permission is allowed.
      isAmbulanceDriver={true}
      currentAmbulanceId="amb_001"
      allAmbulances={ambulances}
      allHospitals={hospitals}
      // This enables GPS tracking for this ambulance
    />
  );
}

// ==================== RUNNING IT ALL ====================
/*
Terminal 1 - Backend:
$ cd lifeline-backend
$ npm run dev
Output: "Backend running on port 3000 using memory"

Terminal 2 - Frontend:
$ npm run dev
Output: "VITE v... ready in ... ms"

Browser 1 - Dispatcher:
$ Open http://localhost:5173/admin
$ Dispatcher Dashboard loads
$ useSocket auto-connects to Socket.io
$ Shows "Live Tracking" indicator

Browser 2 - Ambulance Driver:
$ Open http://localhost:5173/ambulance-driver
$ Driver Dashboard loads
$ useLocationTracking requests GPS permission
$ Shows current coordinates
$ Auto-sends location updates every 5 seconds

Result:
- Driver's location updates in Browser 2
- Browser 1 sees the ambulance moving in real-time on the map
- Updates are instant via Socket.io (not HTTP polling)
- No page refresh needed
*/

// ==================== DATA FLOW ====================
/*
SEQUENCE:

1. Browser 2 (Driver) - User grants geolocation permission
2. useLocationTracking - Gets GPS coords from browser
3. Every 5 seconds - Sends PATCH /ambulances/:id/location
4. Backend - Updates database with new coords
5. Backend - Calls emitAmbulanceMoved(ambulanceId, lat, lng)
6. Socket.io Server - Broadcasts to 'dashboard' room
7. Browser 1 (Dispatcher) - Receives 'ambulance_moved' event
8. useSocket - Updates ambulanceLocations state
9. RealTimeEmergencyMap - Marker position refreshes
10. User sees 🚑 marker move on map in real-time

All of this happens automatically after you set it up!
*/

// ==================== TESTING CHECKLIST ====================
/*
□ Backend running? (Check: "Backend running on port 3000")
□ Frontend running? (Check: "ready in ... ms")
□ .env.local created with VITE_BACKEND_URL?
□ Browser 1 (Dispatcher): Do you see "Live Tracking" indicator?
□ Browser 2 (Driver): Did browser ask for location permission?
□ Browser 2: Is location displaying (latitude, longitude)?
□ Browser 1: Do ambulance markers move when you move in Browser 2?
□ Open DevTools (F12) -> Network -> WS (WebSocket)
□ Do you see Socket.io messages like "ambulance_moved"?

If all checked: ✓ You have real-time tracking working!
*/

// ==================== CUSTOMIZATION ====================
/*
To change location update frequency:
File: src/hooks/use-location-tracking.ts

Replace this line:
  // Send location update every 5 seconds
  
With custom logic in the watchPosition callback:
  if (timestamp - lastSent > 10000) { // 10 seconds
    sendLocationUpdate();
    lastSent = timestamp;
  }
*/

// ==================== PRODUCTION CHECKLIST ====================
/*
Before deploying to production:

□ Use HTTPS (required for Geolocation API on non-localhost)
□ Update FRONTEND_ORIGIN to your production domain
□ Update VITE_BACKEND_URL to your production backend
□ Use production database (not memory)
□ Enable JWT authentication validation
□ Consider adding Socket.io authentication
□ Test with multiple simultaneous ambulances
□ Monitor Socket.io connection overhead
□ Enable Redis adapter if multiple backend servers
□ Rate-limit location updates to prevent abuse
□ Add geofencing to reduce unnecessary updates
*/

// ==================== MONITORING ====================
/*
To see what's happening in development:

// Monitor Backend Socket.io Events:
Open: http://localhost:3000 (with Socket.io admin panel if installed)

// Monitor Frontend Connections:
Browser DevTools -> Network -> Messages -> Find 'ambulance_moved'

// Log Ambulance Locations in React:
const { ambulanceLocations } = useSocket();
useEffect(() => {
  console.log("Current ambulance positions:", ambulanceLocations);
}, [ambulanceLocations]);

// Check Socket Connection Status:
const { isConnected } = useSocket();
console.log("Socket.io connected:", isConnected);
*/

export default {
  title: "Socket.io Real-Time Ambulance Tracking - Quick Start",
  status: "READY TO USE",
  files: [
    "src/hooks/use-socket.ts",
    "src/hooks/use-location-tracking.ts", 
    "src/components/RealTimeEmergencyMap.tsx",
    "lifeline-backend/src/server.js (updated)",
    "lifeline-backend/src/routes/ambulance.routes.js (updated)",
  ],
  nextStep: "Start backend, start frontend, open two browser windows, test tracking!",
};
