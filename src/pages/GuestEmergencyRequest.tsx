import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Activity, AlertTriangle, LocateFixed, ShieldAlert } from "lucide-react";
import EmergencyMap from "@/components/EmergencyMap";
import { findNearestAmbulance, findBestHospital, generateEmergencyId, MOCK_AMBULANCES, MOCK_HOSPITALS } from "@/data/mockData";

const API_BASE = (import.meta.env.VITE_API_BASE_URL || "http://localhost:3001/api") as string;
const GUEST_STORAGE_PREFIX = "resqroute_guest_request:";

type UiEmergencyType = "Cardiac" | "Accident" | "Burn" | "Poison" | "Severe/Other";
type ApiEmergencyType = "Accident" | "Cardiac" | "Other";
type Step = "idle" | "confirm" | "type";

type GuestEmergencyState = {
  id: string;
  userId: string;
  phone?: string;
  uiType: UiEmergencyType;
  type: ApiEmergencyType;
  status: "REQUESTED" | "ASSIGNED" | "EN_ROUTE" | "ARRIVED";
  lat: number;
  lng: number;
  etaSeconds: number;
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
  } | null;
};

const emergencyTypes: UiEmergencyType[] = ["Cardiac", "Accident", "Burn", "Poison", "Severe/Other"];

const GuestEmergencyRequest = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("idle");
  const [type, setType] = useState<UiEmergencyType>("Cardiac");
  const [position, setPosition] = useState<[number, number]>([28.6139, 77.209]);
  const [locating, setLocating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [autoConfirmEnabled, setAutoConfirmEnabled] = useState(true);
  const [demoMode, setDemoMode] = useState(true);
  const [countdown, setCountdown] = useState(3);
  const [error, setError] = useState("");

  const detectLocation = (nextStep: Step = "confirm") => {
    if (!navigator.geolocation) {
      setLocating(false);
      setError("Geolocation is not supported in this browser.");
      return;
    }

    setLocating(true);
    setError("");

    navigator.geolocation.getCurrentPosition(
      (coords) => {
        setPosition([coords.coords.latitude, coords.coords.longitude]);
        setLocating(false);
        setStep(nextStep);
      },
      (geoError) => {
        setLocating(false);
        setError(geoError.message || "Unable to fetch current location.");
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 5000 }
    );
  };

  useEffect(() => {
    if (step !== "confirm" || !autoConfirmEnabled) return;
    setCountdown(3);
    const interval = window.setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          window.clearInterval(interval);
          setStep("type");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => window.clearInterval(interval);
  }, [step, autoConfirmEnabled]);

  const mapTypeToApiType = (value: UiEmergencyType): ApiEmergencyType => {
    if (value === "Cardiac") return "Cardiac";
    if (value === "Accident") return "Accident";
    return "Other";
  };

  const demoEtaSeconds = useMemo(() => (demoMode ? 45 : 120), [demoMode]);

  const buildGuestEmergency = (): GuestEmergencyState => {
    const ambulance = findNearestAmbulance(position[0], position[1], MOCK_AMBULANCES);
    const hospital = findBestHospital(position[0], position[1], MOCK_HOSPITALS);
    const etaSeconds = demoEtaSeconds;
    const userId = `RESQ-GUEST-${generateEmergencyId().slice(-4)}`;

    return {
      id: generateEmergencyId(),
      userId,
      uiType: type,
      type: mapTypeToApiType(type),
      status: "REQUESTED",
      lat: position[0],
      lng: position[1],
      etaSeconds,
      assignedAmbulance: ambulance ? {
        id: ambulance.id,
        vehicleNo: ambulance.vehicleNo,
        driverName: ambulance.driverName,
        lat: ambulance.lat,
        lng: ambulance.lng,
      } : null,
      assignedHospital: hospital ? {
        id: hospital.id,
        name: hospital.name,
        lat: hospital.lat,
        lng: hospital.lng,
        icuBeds: hospital.icuBeds,
        emergencyBeds: hospital.emergencyBeds,
      } : null,
    };
  };

  const submit = async () => {
    setSubmitting(true);
    setError("");

    const optimisticEmergency = buildGuestEmergency();
    localStorage.setItem(`${GUEST_STORAGE_PREFIX}${optimisticEmergency.id}`, JSON.stringify(optimisticEmergency));
    localStorage.setItem("resqroute_guest_latest", optimisticEmergency.id);

    navigate(`/guest/track/${optimisticEmergency.id}`, {
      replace: true,
      state: {
        emergency: optimisticEmergency,
        sourceLocation: position,
        demoMode,
        forceEtaSeconds: demoEtaSeconds,
      },
    });

    try {
      const response = await fetch(`${API_BASE}/emergencies/guest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: mapTypeToApiType(type),
          lat: position[0],
          lng: position[1],
          userId: optimisticEmergency.userId,
        }),
      });

      if (!response.ok) {
        const bodyText = await response.text();
        throw new Error(bodyText || "Failed to create emergency request");
      }

      const payload = await response.json();
      const serverEmergency = { ...optimisticEmergency, ...payload, uiType: type, status: "REQUESTED" as const };
      localStorage.setItem(`${GUEST_STORAGE_PREFIX}${serverEmergency.id}`, JSON.stringify(serverEmergency));
      localStorage.setItem("resqroute_guest_latest", serverEmergency.id);
      navigate(`/guest/track/${serverEmergency.id}`, {
        replace: true,
        state: {
          emergency: serverEmergency,
          sourceLocation: position,
          demoMode,
          forceEtaSeconds: demoEtaSeconds,
        },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not submit request. Please try again.";
      setError(`${message.slice(0, 180)}. The tracking page is still open with your local request.`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-2">
          <Activity className="w-5 h-5 text-emergency" />
          <span className="text-base font-bold">Res<span className="text-emergency">Q</span>Route Guest</span>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 grid lg:grid-cols-2 gap-4">
        <section className="glass-card p-5">
          <h1 className="text-lg font-semibold flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-emergency" /> Request Emergency
          </h1>
          <p className="text-xs text-muted-foreground mt-1">Fast trigger flow for urgent scenarios. No login needed.</p>

          <div className="space-y-3 mt-4">
            {step === "idle" && (
              <button
                type="button"
                onClick={() => detectLocation("confirm")}
                disabled={locating}
                className="w-full rounded-xl gradient-emergency text-emergency-foreground px-5 py-6 text-lg font-bold hover:opacity-90 disabled:opacity-60"
              >
                {locating ? "Detecting location..." : "REQUEST EMERGENCY"}
              </button>
            )}

            {step === "confirm" && (
              <div className="space-y-3 rounded-lg border border-border p-3">
                <p className="text-sm font-semibold flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-warning" /> Confirm emergency request
                </p>
                <p className="text-xs text-muted-foreground">
                  Detected location: {position[0].toFixed(5)}, {position[1].toFixed(5)}
                </p>
                {autoConfirmEnabled && (
                  <p className="text-xs text-warning">Auto-confirming in {countdown}s unless cancelled.</p>
                )}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setStep("type")}
                    className="rounded-lg bg-primary text-primary-foreground px-3 py-2 text-sm font-semibold"
                  >
                    YES, SEND HELP
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setStep("idle");
                      setError("");
                    }}
                    className="rounded-lg border border-border bg-card px-3 py-2 text-sm font-semibold"
                  >
                    CANCEL
                  </button>
                </div>
              </div>
            )}

            {step === "type" && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">Select emergency type</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {emergencyTypes.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setType(item)}
                      className={`rounded-lg px-3 py-2 text-sm border ${type === item ? "border-primary bg-primary/10 text-primary font-semibold" : "border-border bg-card"}`}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={() => detectLocation(step === "idle" ? "confirm" : step)}
              disabled={locating}
              className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium hover:bg-accent disabled:opacity-60"
            >
              <LocateFixed className="w-4 h-4" /> {locating ? "Fetching location..." : "Refresh current location"}
            </button>

            <p className="text-xs text-muted-foreground">
              Location: {position[0].toFixed(5)}, {position[1].toFixed(5)}
            </p>

            <div className="grid grid-cols-2 gap-2">
              <label className="rounded-lg border border-border bg-card px-3 py-2 text-xs flex items-center justify-between">
                Auto-confirm (3s)
                <input type="checkbox" checked={autoConfirmEnabled} onChange={(e) => setAutoConfirmEnabled(e.target.checked)} />
              </label>
              <label className="rounded-lg border border-border bg-card px-3 py-2 text-xs flex items-center justify-between">
                Demo mode ETA
                <input type="checkbox" checked={demoMode} onChange={(e) => setDemoMode(e.target.checked)} />
              </label>
            </div>

            {error && <p className="text-xs text-emergency">{error}</p>}

            <button
              type="button"
              onClick={submit}
              disabled={submitting || locating || step !== "type"}
              className="w-full rounded-lg gradient-emergency text-emergency-foreground px-4 py-2.5 text-sm font-medium hover:opacity-90 disabled:opacity-60"
            >
              {submitting ? "Assigning ambulance..." : "Confirm Type & Track"}
            </button>
          </div>
        </section>

        <section className="glass-card p-2 min-h-[400px]">
          <EmergencyMap center={position} userPos={position} />
        </section>
      </main>
    </div>
  );
};

export default GuestEmergencyRequest;
