import { useEffect, useRef, useState, useCallback } from "react";
import io, { Socket } from "socket.io-client";

interface AmbulanceLocation {
  ambulanceId: string;
  lat: number;
  lng: number;
  timestamp: string;
}

export const useSocket = () => {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [ambulanceLocations, setAmbulanceLocations] = useState<Record<string, AmbulanceLocation>>({});

  useEffect(() => {
    const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:3001";

    // Initialize Socket.io connection
    socketRef.current = io(backendUrl, {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    });

    socketRef.current.on("connect", () => {
      console.log("Socket.io connected");
      setIsConnected(true);

      // Join the dashboard room to receive ambulance updates
      socketRef.current?.emit("join_dashboard");
    });

    socketRef.current.on("disconnect", () => {
      console.log("Socket.io disconnected");
      setIsConnected(false);
    });

    // Listen for ambulance location updates
    socketRef.current.on("ambulance_moved", (data: AmbulanceLocation) => {
      setAmbulanceLocations((prev) => ({
        ...prev,
        [data.ambulanceId]: data,
      }));
    });

    // Listen for new incidents
    socketRef.current.on("new_incident", (data) => {
      console.log("New incident:", data);
    });

    // Listen for incident status updates
    socketRef.current.on("incident_status_changed", (data) => {
      console.log("Incident status changed:", data);
    });

    // Listen for hospital updates
    socketRef.current.on("hospital_updated", (data) => {
      console.log("Hospital updated:", data);
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  const joinIncident = useCallback((incidentId: string) => {
    socketRef.current?.emit("join_incident", incidentId);
  }, []);

  const getAmbulanceLocation = useCallback(
    (ambulanceId: string): [number, number] | null => {
      const location = ambulanceLocations[ambulanceId];
      return location ? [location.lat, location.lng] : null;
    },
    [ambulanceLocations]
  );

  return {
    socket: socketRef.current,
    isConnected,
    ambulanceLocations,
    joinIncident,
    getAmbulanceLocation,
  };
};
