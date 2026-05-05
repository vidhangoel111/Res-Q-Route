import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { Activity, Clock3, Truck } from "lucide-react";
import EmergencyMap from "@/components/EmergencyMap";
import { interpolateRoute } from "@/data/mockData";

const API_BASE = (import.meta.env.VITE_API_BASE_URL || "http://localhost:3001/api") as string;
const GUEST_STORAGE_PREFIX = "resqroute_guest_request:";

type TrackStatus = "REQUESTED" | "ASSIGNED" | "EN_ROUTE" | "ARRIVED";

interface TrackEmergency {
  id: string;
  userId?: string;
  status?: string;
  etaSeconds?: number;
  uiType?: string;
  lat: number;
  lng: number;
  assignedAmbulance?: {
    id: string;
    vehicleNo: string;
    driverName: string;
    lat: number;
    lng: number;
  } | null;
  assignedHospital?: {
    id: string;
    name: string;
    lat: number;
    lng: number;
    icuBeds?: number;
    emergencyBeds?: number;
    capacity?: number;
  } | null;
}

const flow: TrackStatus[] = ["REQUESTED", "ASSIGNED", "EN_ROUTE", "ARRIVED"];

const GuestEmergencyTracking = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();

  const navState = (location.state as { emergency?: TrackEmergency; demoMode?: boolean; forceEtaSeconds?: number } | null) || null;
  const storageEmergency = useMemo(() => {
    if (!id) return null;
    try {
      const raw = localStorage.getItem(`${GUEST_STORAGE_PREFIX}${id}`);
      return raw ? (JSON.parse(raw) as TrackEmergency) : null;
    } catch {
      return null;
    }
  }, [id]);
  const initialEmergency = navState?.emergency || storageEmergency || null;
  const forceEtaSeconds = navState?.forceEtaSeconds;
  const demoMode = Boolean(navState?.demoMode);
  const [emergency, setEmergency] = useState<TrackEmergency | null>(initialEmergency);
  const [status, setStatus] = useState<TrackStatus>((initialEmergency?.status as TrackStatus) || "REQUESTED");
  const [eta, setEta] = useState(0);
  const [ambulancePos, setAmbulancePos] = useState<[number, number] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (emergency) return;
    if (!id) return;

    let active = true;

    const fetchEmergency = async () => {
      try {
        const response = await fetch(`${API_BASE}/emergencies/guest/${id}`);
        if (!response.ok) throw new Error("Not found");
        const payload = (await response.json()) as TrackEmergency;
        if (!active) return;
        setEmergency(payload);
        try {
          localStorage.setItem(`${GUEST_STORAGE_PREFIX}${id}`, JSON.stringify(payload));
          localStorage.setItem("resqroute_guest_latest", id);
        } catch {
          // ignore storage errors
        }
      } catch {
        if (!active) return;
        if (storageEmergency) {
          setEmergency(storageEmergency);
          return;
        }
        setError("Tracking request not found.");
      }
    };

    fetchEmergency();
    return () => {
      active = false;
    };
  }, [emergency, id]);

  useEffect(() => {
    if (!emergency) return;

    const initialEta = forceEtaSeconds || Math.max(45, Math.min(180, emergency.etaSeconds || 90));
    setStatus((emergency.status as TrackStatus) || "REQUESTED");
    setEta(initialEta);
    if (emergency.assignedAmbulance) {
      setAmbulancePos([emergency.assignedAmbulance.lat, emergency.assignedAmbulance.lng]);
    }

    const toAssigned = window.setTimeout(() => setStatus((prev) => prev === "REQUESTED" ? "ASSIGNED" : prev), demoMode ? 400 : 1200);
    const toEnRoute = window.setTimeout(() => setStatus((prev) => prev === "REQUESTED" || prev === "ASSIGNED" ? "EN_ROUTE" : prev), demoMode ? 1400 : 3200);

    let routeTimer: number | null = null;
    if (emergency.assignedAmbulance) {
      const route = interpolateRoute([emergency.assignedAmbulance.lat, emergency.assignedAmbulance.lng], [emergency.lat, emergency.lng], initialEta);
      let step = 0;
      routeTimer = window.setInterval(() => {
        step += 1;
        if (step < route.length) {
          setAmbulancePos(route[step]);
        } else {
          setAmbulancePos([emergency.lat, emergency.lng]);
          setStatus("ARRIVED");
          if (routeTimer) window.clearInterval(routeTimer);
        }
      }, 1000);
    }

    const etaTimer = window.setInterval(() => {
      setEta((prev) => {
        const next = prev - 1;
        if (next <= 0) {
          setStatus("ARRIVED");
          return 0;
        }
        return next;
      });
    }, 1000);

    return () => {
      window.clearTimeout(toAssigned);
      window.clearTimeout(toEnRoute);
      window.clearInterval(etaTimer);
      if (routeTimer) window.clearInterval(routeTimer);
    };
  }, [demoMode, emergency, forceEtaSeconds]);

  const statusIndex = flow.indexOf(status);
  const etaText = useMemo(() => `${Math.floor(eta / 60).toString().padStart(2, "0")}:${(eta % 60).toString().padStart(2, "0")}`, [eta]);
  const liveDistanceKm = useMemo(() => {
    if (!ambulancePos || !emergency) return null;
    const [alat, alng] = ambulancePos;
    const dLat = (emergency.lat - alat) * (Math.PI / 180);
    const dLng = (emergency.lng - alng) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(alat * (Math.PI / 180)) * Math.cos(emergency.lat * (Math.PI / 180)) * Math.sin(dLng / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return 6371 * c;
  }, [ambulancePos, emergency]);

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="glass-card p-6 text-center">
          <p className="text-emergency text-sm">{error}</p>
          <button
            type="button"
            onClick={() => navigate("/guest/request")}
            className="mt-4 rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-medium"
          >
            Create New Request
          </button>
        </div>
      </div>
    );
  }

  if (!emergency) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading tracking...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-emergency" />
            <span className="text-base font-bold">Res<span className="text-emergency">Q</span>Route Tracking</span>
          </div>
          <span className="text-xs text-muted-foreground">{emergency.id}</span>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 grid lg:grid-cols-3 gap-4">
        <section className="lg:col-span-1 glass-card p-5 space-y-4">
          <div>
            <p className="text-xs text-muted-foreground">Guest ID</p>
            <p className="font-semibold text-foreground">{emergency.userId || "RESQ-GUEST-XXXX"}</p>
          </div>
          {emergency.uiType && (
            <div>
              <p className="text-xs text-muted-foreground">Emergency Type</p>
              <p className="font-semibold text-foreground">{emergency.uiType}</p>
            </div>
          )}

          <div>
            <p className="text-xs text-muted-foreground mb-2">Status</p>
            <div className="space-y-2">
              {flow.map((step, idx) => (
                <div
                  key={step}
                  className={`rounded-lg px-3 py-2 text-xs font-medium ${idx <= statusIndex ? "bg-primary/15 text-primary border border-primary/30" : "bg-muted text-muted-foreground border border-transparent"}`}
                >
                  {step}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-border p-3">
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock3 className="w-3 h-3" /> ETA
            </p>
            <p className="text-2xl font-bold mt-1">{etaText}</p>
          </div>

          <div className="rounded-lg border border-border p-3">
            <p className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
              <Truck className="w-3 h-3" /> Assigned Ambulance
            </p>
            <p className="font-semibold text-sm">{emergency.assignedAmbulance?.vehicleNo || "Assigning..."}</p>
            <p className="text-xs text-muted-foreground">{emergency.assignedAmbulance?.driverName || "Waiting for dispatch"}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Distance to user: {liveDistanceKm !== null ? `${liveDistanceKm.toFixed(2)} km` : "Calculating..."}
            </p>
          </div>

          <div className="rounded-lg border border-border p-3">
            <p className="text-xs text-muted-foreground mb-1">Assigned Hospital</p>
            <p className="font-semibold text-sm">{emergency.assignedHospital?.name || "Finding hospital..."}</p>
            <p className="text-xs text-muted-foreground">
              ICU: {emergency.assignedHospital?.icuBeds ?? "N/A"} | ER: {emergency.assignedHospital?.emergencyBeds ?? "N/A"}
            </p>
          </div>
        </section>

        <section className="lg:col-span-2 glass-card p-2 min-h-[460px]">
          <EmergencyMap
            center={[emergency.lat, emergency.lng]}
            userPos={[emergency.lat, emergency.lng]}
            ambulancePos={ambulancePos || undefined}
            hospitalPos={emergency.assignedHospital ? [emergency.assignedHospital.lat, emergency.assignedHospital.lng] : undefined}
            selectedAmbulanceId={emergency.assignedAmbulance?.id}
          />
        </section>
      </main>
    </div>
  );
};

export default GuestEmergencyTracking;
