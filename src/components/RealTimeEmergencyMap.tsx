// Example integration of Socket.io with EmergencyMap component
// This shows how to use the real-time ambulance data in your existing components

import { useEffect, useState } from "react";
import EmergencyMap from "@/components/EmergencyMap";
import { useSocket } from "@/hooks/use-socket";
import { useLocationTracking } from "@/hooks/use-location-tracking";
import { Ambulance, Hospital } from "@/data/types";

interface RealTimeMapProps {
  center: [number, number];
  userPos?: [number, number];
  selectedAmbulanceId?: string;
  selectedHospitalId?: string;
  allAmbulances?: Ambulance[];
  allHospitals?: Hospital[];
  isAmbulanceDriver?: boolean;
  currentAmbulanceId?: string;
}

/**
 * Enhanced Emergency Map with Real-Time Socket.io Integration
 * 
 * For Dispatchers/Viewers:
 * - Shows live ambulance locations from Socket.io
 * - Auto-updates as ambulances move
 * - Shows all hospital locations
 * 
 * For Ambulance Drivers:
 * - Tracks their own GPS location
 * - Sends location to backend every ~5 seconds
 * - Other users see their location in real-time
 */
export function RealTimeEmergencyMap({
  center,
  userPos,
  selectedAmbulanceId,
  selectedHospitalId,
  allAmbulances = [],
  allHospitals = [],
  isAmbulanceDriver = false,
  currentAmbulanceId,
}: RealTimeMapProps) {
  // For viewers/dispatchers: receive real-time ambulance locations
  const { ambulanceLocations, isConnected: socketConnected } = useSocket();

  // For ambulance drivers: send their GPS location (auto-enabled if currentAmbulanceId provided & isAmbulanceDriver true)
  const { position: driverLocation } = useLocationTracking(
    isAmbulanceDriver ? currentAmbulanceId : undefined
  );

  // Create ambulances with real-time locations
  const [realtimeAmbulances, setRealtimeAmbulances] = useState<Ambulance[]>(
    allAmbulances
  );

  useEffect(() => {
    // Update ambulances with real-time Socket.io data
    const updated = allAmbulances.map((ambulance) => {
      const realTimeLocation = ambulanceLocations[ambulance.id];
      if (realTimeLocation) {
        return {
          ...ambulance,
          lat: realTimeLocation.lat,
          lng: realTimeLocation.lng,
        };
      }
      return ambulance;
    });

    setRealtimeAmbulances(updated);
  }, [ambulanceLocations, allAmbulances]);

  // For ambulance driver: use their GPS location
  const selectedAmbulancePos =
    isAmbulanceDriver && driverLocation
      ? ([driverLocation.latitude, driverLocation.longitude] as [
          number,
          number
        ])
      : selectedAmbulanceId
        ? (() => {
            const ambulance = realtimeAmbulances.find(
              (a) => a.id === selectedAmbulanceId
            );
            return ambulance ? ([ambulance.lat, ambulance.lng] as [number, number]) : undefined;
          })()
        : undefined;

  return (
    <div className="relative w-full h-full">
      {/* Connection indicator */}
      {!isAmbulanceDriver && (
        <div className="absolute top-4 left-4 z-10 bg-white px-3 py-2 rounded-lg shadow-md text-sm">
          <div className="flex items-center gap-2">
            <div
              className={`w-2 h-2 rounded-full ${
                socketConnected ? "bg-green-500" : "bg-red-500"
              }`}
            />
            <span className="text-gray-700">
              {socketConnected ? "Live Tracking" : "Connecting..."}
            </span>
          </div>
        </div>
      )}

      {/* Driver location/status */}
      {isAmbulanceDriver && (
        <div className="absolute top-4 left-4 z-10 bg-white px-3 py-2 rounded-lg shadow-md text-sm">
          <div className="space-y-1">
            <p className="font-semibold text-gray-900">Your Location</p>
            {driverLocation ? (
              <>
                <p className="text-xs text-gray-600">
                  📍 {driverLocation.latitude.toFixed(4)}, 
                  {driverLocation.longitude.toFixed(4)}
                </p>
                <p className="text-xs text-gray-600">
                  ✓ Accuracy: {driverLocation.accuracy.toFixed(0)}m
                </p>
              </>
            ) : (
              <p className="text-xs text-gray-500">Requesting location...</p>
            )}
          </div>
        </div>
      )}

      {/* Main Map Component */}
      <EmergencyMap
        center={center}
        userPos={userPos}
        ambulancePos={selectedAmbulancePos}
        hospitalPos={
          selectedHospitalId
            ? (() => {
                const hospital = allHospitals.find(
                  (h) => h.id === selectedHospitalId
                );
                return hospital ? ([hospital.lat, hospital.lng] as [number, number]) : undefined;
              })()
            : undefined
        }
        allAmbulances={realtimeAmbulances}
        allHospitals={allHospitals}
        selectedAmbulanceId={selectedAmbulanceId}
        selectedHospitalId={selectedHospitalId}
      />

      {/* Debug info (optional - remove in production) */}
      {import.meta.env.DEV && (
        <div className="absolute bottom-4 right-4 z-10 bg-black bg-opacity-75 px-3 py-2 rounded text-xs text-white font-mono">
          <p>Socket: {socketConnected ? "✓" : "✗"}</p>
          <p>Tracked ambulances: {Object.keys(ambulanceLocations).length}</p>
          {isAmbulanceDriver && <p>Driver tracking: {driverLocation ? "✓" : "✗"}</p>}
        </div>
      )}
    </div>
  );
}

/**
 * Usage Examples:
 *
 * // In Dispatcher Dashboard:
 * <RealTimeEmergencyMap
 *   center={[28.6139, 77.2090]}
 *   userPos={userLocation}
 *   allAmbulances={ambulances}
 *   allHospitals={hospitals}
 *   selectedAmbulanceId={selectedId}
 * />
 *
 * // In Ambulance Driver Dashboard:
 * <RealTimeEmergencyMap
 *   center={userLocation}
 *   allAmbulances={ambulances}
 *   allHospitals={hospitals}
 *   isAmbulanceDriver={true}
 *   currentAmbulanceId={ambulanceId}
 * />
 *
 * // Features:
 * - Real-time ambulance position updates via Socket.io
 * - GPS tracking for ambulance drivers
 * - Connection status indicator
 * - Automatic fallback if Socket.io unavailable
 * - Performance optimized with debouncing
 */
