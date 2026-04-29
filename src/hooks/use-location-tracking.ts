import { useEffect, useState, useRef } from "react";
import { useSocket } from "./use-socket";

interface GeolocationCoordinates {
  latitude: number;
  longitude: number;
  accuracy: number;
}

/**
 * Auto GPS Tracking Hook
 * Automatically tracks ambulance location and sends to server every ~5 seconds
 * No manual enable needed - just pass ambulanceId and it works!
 */
export const useLocationTracking = (ambulanceId?: string) => {
  const { isConnected } = useSocket();
  const [position, setPosition] = useState<GeolocationCoordinates | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const watchIdRef = useRef<number | null>(null);
  const lastSentRef = useRef<number>(0);

  useEffect(() => {
    // Auto-start tracking if ambulanceId provided and socket connected
    if (!ambulanceId || !isConnected) {
      return;
    }

    // Check if geolocation is available
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by this browser");
      return;
    }

    setIsTracking(true);
    console.log(`🚑 GPS tracking started for ambulance: ${ambulanceId}`);

    // Watch position with high accuracy and fast updates
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const coords = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        };

        setPosition(coords);
        setError(null);

        // Send location update every 5 seconds (throttled)
        const now = Date.now();
        if (now - lastSentRef.current > 5000) {
          lastSentRef.current = now;

          fetch(`${import.meta.env.VITE_BACKEND_URL || "http://localhost:3001"}/ambulances/${ambulanceId}/location`, {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
            },
            body: JSON.stringify({
              lat: coords.latitude,
              lng: coords.longitude,
            }),
          }).catch((err) => console.error("❌ Failed to update location:", err));
        }
      },
      (err) => {
        console.error("❌ Geolocation error:", err);
        setError(err.message);
        setIsTracking(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );

    // Cleanup on unmount
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      setIsTracking(false);
    };
  }, [ambulanceId, isConnected]);

  return {
    position,
    error,
    isTracking,
  };
};
