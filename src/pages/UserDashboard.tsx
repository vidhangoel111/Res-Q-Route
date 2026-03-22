import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { Activity, LogOut, AlertTriangle, Clock, CheckCircle2, Truck, Building2, Star, Send, Cpu, Search, Hospital, Zap, BarChart3, LocateFixed, Navigation, MapPin } from "lucide-react";
import { EmergencyRequest, EmergencyStatus, SeverityLevel, Ambulance, Hospital as HospitalType } from "@/data/types";
import { EMERGENCY_TYPES, classifySeverity, generateEmergencyId, findNearestAmbulance, findBestHospital, MOCK_AMBULANCES, MOCK_HOSPITALS, interpolateRoute, haversineDistance, TRAFFIC_ZONES } from "@/data/mockData";
import { Progress } from "@/components/ui/progress";

const STATUS_FLOW: EmergencyStatus[] = ["SUBMITTED", "CLASSIFIED", "ASSIGNED", "EN_ROUTE", "ARRIVED", "TRANSPORTING", "COMPLETED"];
const API_BASE = (import.meta.env.VITE_API_BASE_URL || "http://localhost:3001/api") as string;

const SEVERITY_COLORS: Record<SeverityLevel, string> = {
  critical: "bg-emergency text-emergency-foreground",
  high: "bg-warning text-warning-foreground",
  medium: "bg-clinical text-clinical-foreground",
  low: "bg-success text-success-foreground",
};

const SEVERITY_DETAILS: Record<SeverityLevel, { title: string; note: string }> = {
  critical: {
    title: "Critical Risk",
    note: "Life-threatening indicators detected. Keep airway clear and stay on call.",
  },
  high: {
    title: "High Risk",
    note: "Urgent care needed. Avoid movement unless safety requires relocation.",
  },
  medium: {
    title: "Moderate Risk",
    note: "Monitor symptoms continuously and prepare documents/medication details.",
  },
  low: {
    title: "Stabilized Risk",
    note: "Condition appears stable but still requires clinical evaluation.",
  },
};

const DRIVER_PROFILES: Record<string, { phone: string; experience: string; certification: string }> = {
  a1: { phone: "+91 98XXXX1201", experience: "8 years emergency response", certification: "BLS + Trauma Transport" },
  a2: { phone: "+91 98XXXX2202", experience: "6 years emergency response", certification: "BLS + ACLS Support" },
  a3: { phone: "+91 98XXXX3203", experience: "9 years emergency response", certification: "BLS + Critical Care Transfer" },
  a4: { phone: "+91 98XXXX4204", experience: "7 years emergency response", certification: "BLS + Trauma Transport" },
  a5: { phone: "+91 98XXXX5205", experience: "5 years emergency response", certification: "BLS" },
};

function getExpertAdvice(type: string, severity: SeverityLevel): string[] {
  const t = type.toLowerCase();
  const base = [
    "Keep the patient calm, warm, and in a safe open area for quick access.",
    "Share allergies, ongoing medicines, and existing conditions with the responder.",
    "Do not give food or drink unless specifically advised by a clinician.",
  ];

  if (severity === "critical") {
    base.unshift("Call out to confirm responsiveness every 30-60 seconds and monitor breathing.");
  }

  if (t.includes("cardiac") || t.includes("stroke")) {
    base.push("Keep the patient seated or lying with head elevated slightly; note symptom start time.");
  } else if (t.includes("burn")) {
    base.push("Cool the burn with clean running water for 20 minutes; do not apply ice or ointment.");
  } else if (t.includes("drowning")) {
    base.push("If unresponsive and not breathing, begin CPR if trained and continue until help arrives.");
  } else if (t.includes("accident") || t.includes("fall") || t.includes("fracture")) {
    base.push("Avoid moving neck/spine; immobilize injured limbs with makeshift support if possible.");
  } else if (t.includes("poison")) {
    base.push("Keep any medicine bottle/chemical container ready and do not induce vomiting.");
  } else if (t.includes("pregnancy")) {
    base.push("Position on the left side, track contraction timing, and keep clean towels ready.");
  }

  return base.slice(0, 5);
}

interface DecisionStep {
  id: string;
  icon: React.ReactNode;
  message: string;
  status: "pending" | "active" | "done";
  detail?: string;
}

interface EmergencyMapProps {
  center: [number, number];
  userPos?: [number, number];
  ambulancePos?: [number, number];
  hospitalPos?: [number, number];
  allAmbulances?: Ambulance[];
  allHospitals?: HospitalType[];
  selectedAmbulanceId?: string;
  selectedHospitalId?: string;
  onMapClick?: (lat: number, lng: number) => void;
}

const DECISION_STEPS: Omit<DecisionStep, "status" | "detail">[] = [
  { id: "scan", icon: <Cpu className="w-4 h-4" />, message: "Analyzing live ambulance data…" },
  { id: "ambulance", icon: <Search className="w-4 h-4" />, message: "Finding nearest available ambulance…" },
  { id: "hospital_eval", icon: <Hospital className="w-4 h-4" />, message: "Evaluating hospital availability…" },
  { id: "hospital_select", icon: <BarChart3 className="w-4 h-4" />, message: "Selecting best hospital with available beds…" },
  { id: "traffic", icon: <Activity className="w-4 h-4" />, message: "Applying traffic-aware route optimization…" },
  { id: "done", icon: <Zap className="w-4 h-4" />, message: "Optimized emergency response generated." },
];

const UserDashboard = () => {
  const { user, logout } = useAuth();
  const [emergency, setEmergency] = useState<EmergencyRequest | null>(null);
  const [form, setForm] = useState({ patientName: "", phone: "", type: "", description: "", lat: 28.6100, lng: 77.2200 });
  const [eta, setEta] = useState(0);
  const [rating, setRating] = useState(0);
  const [MapComp, setMapComp] = useState<React.ComponentType<EmergencyMapProps> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [ambulancePos, setAmbulancePos] = useState<[number, number] | null>(null);
  const [locationQuery, setLocationQuery] = useState("");
  const [locationSuggestions, setLocationSuggestions] = useState<{ displayName: string; lat: number; lng: number }[]>([]);
  const [selectedLocationLabel, setSelectedLocationLabel] = useState("");
  const [locationError, setLocationError] = useState("");
  const [isLocating, setIsLocating] = useState(false);
  const [isSearchingLocation, setIsSearchingLocation] = useState(false);
  const [liveTrackingEnabled, setLiveTrackingEnabled] = useState(false);
  const locationWatchRef = useRef<number | null>(null);

  // AI Decision engine state
  const [isDeciding, setIsDeciding] = useState(false);
  const [decisionSteps, setDecisionSteps] = useState<DecisionStep[]>([]);
  const [decisionProgress, setDecisionProgress] = useState(0);
  const [ambulanceScores, setAmbulanceScores] = useState<{ amb: Ambulance; dist: number; trafficMult: number; score: number }[]>([]);
  const [hospitalScores, setHospitalScores] = useState<{ hosp: HospitalType; dist: number; occupancy: number; score: number }[]>([]);

  const handleLogout = () => { logout(); window.location.href = "/"; };

  useEffect(() => {
    import("@/components/EmergencyMap").then(mod => setMapComp(() => mod.default)).catch(() => {});
  }, []);

  const getTrafficMultiplier = (lat: number, lng: number) => {
    for (const zone of TRAFFIC_ZONES) {
      const [[minLat, minLng], [maxLat, maxLng]] = zone.bounds;
      if (lat >= minLat && lat <= maxLat && lng >= minLng && lng <= maxLng) return zone.multiplier;
    }
    return 1.0;
  };

  const runDecisionEngine = (severity: SeverityLevel) => {
    setIsDeciding(true);
    setDecisionSteps(DECISION_STEPS.map(s => ({ ...s, status: "pending" as const })));
    setDecisionProgress(0);
    setAmbulanceScores([]);
    setHospitalScores([]);

    const stepDelay = 800;

    // Step 1: Scan ambulances
    setTimeout(() => {
      setDecisionSteps(prev => prev.map(s => s.id === "scan" ? { ...s, status: "active", detail: `Scanning ${MOCK_AMBULANCES.length} ambulances across the network…` } : s));
      setDecisionProgress(10);
    }, stepDelay * 0);

    // Step 2: Find nearest ambulance
    setTimeout(() => {
      setDecisionSteps(prev => prev.map(s => s.id === "scan" ? { ...s, status: "done" } : s.id === "ambulance" ? { ...s, status: "active" } : s));
      setDecisionProgress(25);

      const available = MOCK_AMBULANCES.filter(a => a.status === "available");
      const scored = available.map(amb => {
        const dist = haversineDistance(form.lat, form.lng, amb.lat, amb.lng);
        const trafficMult = getTrafficMultiplier(amb.lat, amb.lng);
        return { amb, dist, trafficMult, score: dist * trafficMult };
      }).sort((a, b) => a.score - b.score);
      setAmbulanceScores(scored);

      const bestAmb = scored[0];
      setDecisionSteps(prev => prev.map(s => s.id === "ambulance" ? {
        ...s, status: "done",
        detail: `Selected ${bestAmb.amb.vehicleNo} (${bestAmb.amb.driverName}) — ${bestAmb.dist.toFixed(2)} km, traffic ×${bestAmb.trafficMult}`
      } : s));
    }, stepDelay * 2);

    // Step 3: Evaluate hospitals
    setTimeout(() => {
      setDecisionSteps(prev => prev.map(s => s.id === "hospital_eval" ? { ...s, status: "active", detail: `Checking ${MOCK_HOSPITALS.length} hospitals for bed availability & distance…` } : s));
      setDecisionProgress(45);
    }, stepDelay * 3.5);

    // Step 4: Select best hospital
    setTimeout(() => {
      setDecisionSteps(prev => prev.map(s => s.id === "hospital_eval" ? { ...s, status: "done" } : s));
      setDecisionProgress(60);

      const scored = MOCK_HOSPITALS.filter(h => h.emergencyBeds > 0 || h.icuBeds > 0).map(hosp => {
        const dist = haversineDistance(form.lat, form.lng, hosp.lat, hosp.lng);
        return { hosp, dist, occupancy: hosp.occupancy, score: dist + (hosp.occupancy / 100) };
      }).sort((a, b) => a.score - b.score);
      setHospitalScores(scored);

      const bestHosp = scored[0];
      setDecisionSteps(prev => prev.map(s => s.id === "hospital_select" ? {
        ...s, status: "done",
        detail: `Selected ${bestHosp.hosp.name} — ${bestHosp.dist.toFixed(2)} km, ${bestHosp.occupancy}% occupancy, ICU: ${bestHosp.hosp.icuBeds}, ER: ${bestHosp.hosp.emergencyBeds}`
      } : s));
      setDecisionProgress(75);
    }, stepDelay * 5);

    // Step 5: Traffic optimization
    setTimeout(() => {
      setDecisionSteps(prev => prev.map(s => s.id === "traffic" ? { ...s, status: "active", detail: `Checking ${TRAFFIC_ZONES.length} traffic zones for route optimization…` } : s));
      setDecisionProgress(88);
    }, stepDelay * 6.5);

    // Step 6: Done
    setTimeout(() => {
      setDecisionSteps(prev => prev.map(s =>
        s.id === "traffic" ? { ...s, status: "done", detail: "Route optimized with real-time traffic data." } :
        s.id === "done" ? { ...s, status: "done", detail: "All parameters analyzed. Dispatching now." } : s
      ));
      setDecisionProgress(100);
    }, stepDelay * 8);

    // Complete: create the emergency
    setTimeout(() => {
      setIsDeciding(false);
      createEmergency(severity);
    }, stepDelay * 9);
  };

  const applyDetectedCoordinates = async (lat: number, lng: number) => {
    setForm((prev) => ({ ...prev, lat, lng }));
    setLocationError("");

    try {
      const response = await fetch(`${API_BASE}/location/reverse?lat=${encodeURIComponent(lat)}&lng=${encodeURIComponent(lng)}`);
      if (!response.ok) {
        return;
      }

      const data = await response.json();
      if (data?.result?.displayName) {
        setSelectedLocationLabel(data.result.displayName);
      }
    } catch {
      // Skip reverse-geocode label if the network is unavailable.
    }
  };

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported in this browser.");
      return;
    }

    setIsLocating(true);
    setLocationError("");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setIsLocating(false);
        applyDetectedCoordinates(position.coords.latitude, position.coords.longitude);
      },
      (error) => {
        setIsLocating(false);
        setLocationError(error.message || "Unable to detect current location.");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
    );
  };

  const toggleLiveTracking = () => {
    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported in this browser.");
      return;
    }

    if (liveTrackingEnabled) {
      if (locationWatchRef.current !== null) {
        navigator.geolocation.clearWatch(locationWatchRef.current);
        locationWatchRef.current = null;
      }
      setLiveTrackingEnabled(false);
      return;
    }

    setLocationError("");
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        setForm((prev) => ({
          ...prev,
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        }));
      },
      (error) => {
        setLocationError(error.message || "Live tracking failed.");
        setLiveTrackingEnabled(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 3000 }
    );

    locationWatchRef.current = watchId;
    setLiveTrackingEnabled(true);
  };

  const searchTypedLocation = async () => {
    const q = locationQuery.trim();
    if (q.length < 3) {
      setLocationError("Type at least 3 characters to search an address.");
      setLocationSuggestions([]);
      return;
    }

    setIsSearchingLocation(true);
    setLocationError("");

    try {
      const response = await fetch(`${API_BASE}/location/geocode?q=${encodeURIComponent(q)}`);
      if (!response.ok) {
        throw new Error("Geocoding request failed");
      }

      const data = await response.json();
      const results = Array.isArray(data?.results) ? data.results : [];
      setLocationSuggestions(results);

      if (!results.length) {
        setLocationError("No matching real location found. Try a fuller address.");
      }
    } catch {
      setLocationError("Failed to fetch location data from server.");
      setLocationSuggestions([]);
    } finally {
      setIsSearchingLocation(false);
    }
  };

  const chooseSuggestedLocation = (item: { displayName: string; lat: number; lng: number }) => {
    setForm((prev) => ({ ...prev, lat: item.lat, lng: item.lng }));
    setSelectedLocationLabel(item.displayName);
    setLocationSuggestions([]);
    setLocationError("");
  };

  const createEmergency = (severity: SeverityLevel) => {
    const amb = findNearestAmbulance(form.lat, form.lng, MOCK_AMBULANCES);
    const hosp = findBestHospital(form.lat, form.lng, MOCK_HOSPITALS);
    const dist = amb ? haversineDistance(form.lat, form.lng, amb.lat, amb.lng) : 5;
    const etaSec = Math.min(Math.round(dist * 120 + Math.random() * 60), 30);
    const baseline = Math.round(dist * 200);

    const req: EmergencyRequest = {
      id: generateEmergencyId(), patientName: form.patientName, phone: form.phone,
      type: form.type, description: form.description, lat: form.lat, lng: form.lng,
      severity, status: "SUBMITTED", assignedAmbulance: amb || undefined,
      assignedHospital: hosp || undefined, etaSeconds: etaSec, createdAt: new Date(),
      baselineTime: baseline, optimizedTime: etaSec,
    };
    setEmergency(req);
    setEta(etaSec);
    if (amb) setAmbulancePos([amb.lat, amb.lng]);

    setTimeout(() => setEmergency(p => p ? { ...p, status: "CLASSIFIED" } : null), 1500);
    setTimeout(() => setEmergency(p => p ? { ...p, status: "ASSIGNED" } : null), 3000);
    setTimeout(() => {
      setEmergency(p => p ? { ...p, status: "EN_ROUTE" } : null);
      if (amb) {
        const route = interpolateRoute([amb.lat, amb.lng], [form.lat, form.lng], etaSec);
        let step = 0;
        timerRef.current = setInterval(() => {
          step++;
          if (step < route.length) setAmbulancePos(route[step]);
          setEta(prev => {
            const next = prev - 1;
            if (next <= 0) {
              if (timerRef.current) clearInterval(timerRef.current);
              setEmergency(p => p ? { ...p, status: "ARRIVED" } : null);
              setTimeout(() => {
                setEmergency(p => p ? { ...p, status: "TRANSPORTING" } : null);
                // Animate ambulance from user location to hospital
                if (hosp) {
                  const hospRoute = interpolateRoute([form.lat, form.lng], [hosp.lat, hosp.lng], 8);
                  let hospStep = 0;
                  const hospTimer = setInterval(() => {
                    hospStep++;
                    if (hospStep < hospRoute.length) {
                      setAmbulancePos(hospRoute[hospStep]);
                    } else {
                      clearInterval(hospTimer);
                      setAmbulancePos([hosp.lat, hosp.lng]);
                      setEmergency(p => p ? { ...p, status: "COMPLETED", completedAt: new Date() } : null);
                    }
                  }, 600);
                } else {
                  setTimeout(() => setEmergency(p => p ? { ...p, status: "COMPLETED", completedAt: new Date() } : null), 5000);
                }
              }, 3000);
              return 0;
            }
            return next;
          });
        }, 1000);
      }
    }, 4500);
  };

  const submitEmergency = () => {
    if (!form.patientName || !form.type) return;
    const severity = classifySeverity(form.type, form.description);
    runDecisionEngine(severity);
  };

  useEffect(() => () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (locationWatchRef.current !== null) navigator.geolocation.clearWatch(locationWatchRef.current);
  }, []);

  const formatEta = (s: number) => `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;
  const statusIdx = emergency ? STATUS_FLOW.indexOf(emergency.status) : -1;
  const EMap = MapComp;
  const currentAmbulancePosition = emergency?.assignedAmbulance
    ? (ambulancePos || [emergency.assignedAmbulance.lat, emergency.assignedAmbulance.lng] as [number, number])
    : null;
  const liveDistanceKm = emergency && currentAmbulancePosition
    ? haversineDistance(currentAmbulancePosition[0], currentAmbulancePosition[1], emergency.lat, emergency.lng)
    : null;
  const assignedDriverProfile = emergency?.assignedAmbulance ? DRIVER_PROFILES[emergency.assignedAmbulance.id] : null;
  const assignedHospitalDistanceKm = emergency?.assignedHospital
    ? haversineDistance(emergency.lat, emergency.lng, emergency.assignedHospital.lat, emergency.assignedHospital.lng)
    : null;
  const adviceList = emergency ? getExpertAdvice(emergency.type, emergency.severity) : [];

  return (
    <div className="min-h-screen bg-background">
      <header className="glass-card-strong border-b border-border/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-6 h-6 text-emergency" />
            <span className="text-lg font-bold">Res<span className="text-emergency">Q</span>Route</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground hidden sm:block">Welcome, {user?.name}</span>
            <button aria-label="Log out" title="Log out" onClick={handleLogout} className="text-muted-foreground hover:text-foreground p-2"><LogOut className="w-4 h-4" /></button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* AI Decision Engine Overlay */}
        {isDeciding && (
          <div className="fixed inset-0 z-[100] bg-background/80 backdrop-blur-sm flex items-center justify-center">
            <div className="glass-card-strong p-8 max-w-lg w-full mx-4 animate-scale-in">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-full gradient-clinical flex items-center justify-center">
                  <Cpu className="w-5 h-5 text-clinical-foreground" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground">AI Decision Engine</h3>
                  <p className="text-xs text-muted-foreground">Optimizing emergency response in real-time</p>
                </div>
              </div>
              <Progress value={decisionProgress} className="mb-6 h-2" />
              <div className="space-y-3">
                {decisionSteps.map((step) => (
                  <div key={step.id} className={`flex items-start gap-3 p-3 rounded-lg transition-all duration-300 ${
                    step.status === "active" ? "bg-clinical/10 border border-clinical/30" :
                    step.status === "done" ? "bg-success/10 border border-success/30" :
                    "bg-muted/50 border border-transparent"
                  }`}>
                    <div className={`mt-0.5 ${
                      step.status === "active" ? "text-clinical animate-pulse" :
                      step.status === "done" ? "text-success" :
                      "text-muted-foreground"
                    }`}>
                      {step.status === "done" ? <CheckCircle2 className="w-4 h-4" /> : step.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${
                        step.status === "active" ? "text-clinical" :
                        step.status === "done" ? "text-success" :
                        "text-muted-foreground"
                      }`}>{step.message}</p>
                      {step.detail && (
                        <p className="text-xs text-muted-foreground mt-1 animate-fade-in">{step.detail}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Ambulance ranking table */}
              {ambulanceScores.length > 0 && (
                <div className="mt-4 animate-fade-in">
                  <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Ambulance Ranking</p>
                  <div className="space-y-1.5">
                    {ambulanceScores.map((s, i) => (
                      <div key={s.amb.id} className={`flex items-center justify-between text-xs px-3 py-2 rounded-lg ${i === 0 ? "bg-success/15 border border-success/30 font-semibold text-foreground" : "bg-muted/50 text-muted-foreground"}`}>
                        <span>{i === 0 ? "✓ " : ""}{s.amb.vehicleNo} — {s.amb.driverName}</span>
                        <span>{s.dist.toFixed(2)} km • ×{s.trafficMult}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Hospital ranking table */}
              {hospitalScores.length > 0 && (
                <div className="mt-4 animate-fade-in">
                  <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Hospital Ranking</p>
                  <div className="space-y-1.5">
                    {hospitalScores.map((s, i) => (
                      <div key={s.hosp.id} className={`flex items-center justify-between text-xs px-3 py-2 rounded-lg ${i === 0 ? "bg-success/15 border border-success/30 font-semibold text-foreground" : "bg-muted/50 text-muted-foreground"}`}>
                        <span>{i === 0 ? "✓ " : ""}{s.hosp.name}</span>
                        <span>{s.dist.toFixed(2)} km • {s.occupancy}% occ</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {!emergency && !isDeciding ? (
          <div className="grid lg:grid-cols-2 gap-6 animate-fade-in">
            <div className="glass-card p-6">
              <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-emergency" /> Request Emergency
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-foreground">Patient Name</label>
                  <input value={form.patientName} onChange={e => setForm(f => ({ ...f, patientName: e.target.value }))} placeholder="Full name"
                    className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground">Phone</label>
                  <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+91 XXXXX XXXXX"
                    className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground">Emergency Type</label>
                  <select aria-label="Emergency type" title="Emergency type" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
                    <option value="">Select type</option>
                    {EMERGENCY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground">Description</label>
                  <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Describe the emergency..." rows={3}
                    className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none" />
                </div>
                <div className="space-y-2 rounded-lg border border-border/70 bg-muted/20 p-3">
                  <label className="text-sm font-medium text-foreground">Real Location</label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <button
                      type="button"
                      onClick={useCurrentLocation}
                      disabled={isLocating}
                      className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium hover:bg-accent disabled:opacity-60"
                    >
                      <LocateFixed className="w-4 h-4" /> {isLocating ? "Detecting..." : "Use Current Location"}
                    </button>
                    <button
                      type="button"
                      onClick={toggleLiveTracking}
                      className={`inline-flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium ${liveTrackingEnabled ? "border-clinical bg-clinical/15 text-clinical" : "border-border bg-card hover:bg-accent"}`}
                    >
                      <Navigation className="w-4 h-4" /> {liveTrackingEnabled ? "Stop Live Tracking" : "Start Live Tracking"}
                    </button>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      value={locationQuery}
                      onChange={(e) => setLocationQuery(e.target.value)}
                      placeholder="Type address, landmark, or area"
                      className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                    <button
                      type="button"
                      onClick={searchTypedLocation}
                      disabled={isSearchingLocation}
                      className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium hover:bg-accent disabled:opacity-60"
                    >
                      <MapPin className="w-4 h-4" /> {isSearchingLocation ? "Searching..." : "Find Address"}
                    </button>
                  </div>

                  {selectedLocationLabel && (
                    <p className="text-xs text-muted-foreground">Selected: {selectedLocationLabel}</p>
                  )}

                  {locationSuggestions.length > 0 && (
                    <div className="space-y-1 max-h-44 overflow-auto rounded-lg border border-border bg-card p-1">
                      {locationSuggestions.map((item, index) => (
                        <button
                          key={`${item.displayName}-${index}`}
                          type="button"
                          onClick={() => chooseSuggestedLocation(item)}
                          className="w-full text-left rounded-md px-2 py-2 text-xs hover:bg-accent"
                        >
                          {item.displayName}
                        </button>
                      ))}
                    </div>
                  )}

                  {locationError && <p className="text-xs text-emergency">{locationError}</p>}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium text-foreground">Latitude</label>
                    <input type="number" step="0.0001" title="Latitude" placeholder="28.6139" value={form.lat} onChange={e => setForm(f => ({ ...f, lat: +e.target.value }))}
                      className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground">Longitude</label>
                    <input type="number" step="0.0001" title="Longitude" placeholder="77.2090" value={form.lng} onChange={e => setForm(f => ({ ...f, lng: +e.target.value }))}
                      className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
                  </div>
                </div>
                <button onClick={submitEmergency} className="w-full flex items-center justify-center gap-2 rounded-lg gradient-emergency text-emergency-foreground px-4 py-2.5 text-sm font-medium hover:opacity-90 transition-opacity">
                  <Send className="w-4 h-4" /> Submit Emergency Request
                </button>
              </div>
            </div>
            <div className="glass-card p-2 min-h-[400px]">
              {EMap ? (
                <EMap
                  center={[form.lat, form.lng]}
                  userPos={[form.lat, form.lng]}
                  allAmbulances={MOCK_AMBULANCES}
                  allHospitals={MOCK_HOSPITALS}
                  onMapClick={(lat: number, lng: number) => setForm(f => ({ ...f, lat, lng }))}
                />
              ) : (
                <div className="flex items-center justify-center h-full min-h-[400px] bg-muted rounded-xl"><p className="text-muted-foreground">Loading map...</p></div>
              )}
            </div>
          </div>
        ) : emergency ? (
          <div className="space-y-6 animate-fade-in">
            <div className="glass-card-strong p-6">
              <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                <div>
                  <p className="text-xs text-muted-foreground font-mono">{emergency.id}</p>
                  <h2 className="text-xl font-bold text-foreground">{emergency.type}</h2>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`status-badge ${SEVERITY_COLORS[emergency.severity]}`}>{emergency.severity}</span>
                  {emergency.status === "EN_ROUTE" && eta > 0 && (
                    <div className="flex items-center gap-2"><Clock className="w-5 h-5 text-clinical animate-pulse" /><span className="text-2xl font-mono font-bold text-foreground">{formatEta(eta)}</span></div>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap gap-1">
                {STATUS_FLOW.map((s, i) => (
                  <div key={s} className={`flex-1 min-w-[80px] text-center py-2 px-1 rounded-lg text-xs font-semibold transition-all ${i <= statusIdx ? (i === statusIdx ? "bg-primary text-primary-foreground" : "bg-primary/20 text-primary") : "bg-muted text-muted-foreground"}`}>{s.replace("_", " ")}</div>
                ))}
              </div>
              <div className="mt-4 grid sm:grid-cols-3 gap-3">
                <div className="rounded-lg bg-muted/60 p-3">
                  <p className="text-xs text-muted-foreground">Injury Severity</p>
                  <p className="font-semibold text-foreground mt-1">{SEVERITY_DETAILS[emergency.severity].title}</p>
                  <p className="text-xs text-muted-foreground mt-1">{SEVERITY_DETAILS[emergency.severity].note}</p>
                </div>
                <div className="rounded-lg bg-muted/60 p-3">
                  <p className="text-xs text-muted-foreground">Live Distance</p>
                  <p className="font-semibold text-foreground mt-1">{liveDistanceKm !== null ? `${liveDistanceKm.toFixed(2)} km` : "Calculating..."}</p>
                  <p className="text-xs text-muted-foreground mt-1">Ambulance to patient</p>
                </div>
                <div className="rounded-lg bg-muted/60 p-3">
                  <p className="text-xs text-muted-foreground">Live ETA</p>
                  <p className="font-semibold text-foreground mt-1">{formatEta(emergency.status === "EN_ROUTE" ? eta : emergency.etaSeconds)}</p>
                  <p className="text-xs text-muted-foreground mt-1">Updated in real time</p>
                </div>
              </div>
            </div>
            <div className="grid lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 glass-card p-2 min-h-[400px]">
                {EMap ? (
                  <EMap
                    center={[emergency.lat, emergency.lng]}
                    userPos={[emergency.lat, emergency.lng]}
                    ambulancePos={ambulancePos || undefined}
                    allAmbulances={MOCK_AMBULANCES}
                    allHospitals={MOCK_HOSPITALS}
                    selectedAmbulanceId={emergency.assignedAmbulance?.id}
                    selectedHospitalId={emergency.assignedHospital?.id}
                  />
                ) : (
                  <div className="flex items-center justify-center h-full min-h-[400px] bg-muted rounded-xl"><p className="text-muted-foreground">Loading map...</p></div>
                )}
              </div>
              <div className="space-y-4">
                {emergency.assignedAmbulance && (
                  <div className="glass-card p-4">
                    <h3 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-2"><Truck className="w-4 h-4" /> Assigned Ambulance</h3>
                    <p className="font-bold text-foreground">{emergency.assignedAmbulance.vehicleNo}</p>
                    <p className="text-sm text-muted-foreground">Driver: {emergency.assignedAmbulance.driverName}</p>
                    {assignedDriverProfile && (
                      <div className="mt-2 text-xs text-muted-foreground space-y-1">
                        <p>Driver Contact: <span className="text-foreground font-medium">{assignedDriverProfile.phone}</span></p>
                        <p>Experience: <span className="text-foreground font-medium">{assignedDriverProfile.experience}</span></p>
                        <p>Certification: <span className="text-foreground font-medium">{assignedDriverProfile.certification}</span></p>
                      </div>
                    )}
                  </div>
                )}
                {emergency.assignedHospital && (
                  <div className="glass-card p-4">
                    <h3 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-2"><Building2 className="w-4 h-4" /> Assigned Hospital</h3>
                    <p className="font-bold text-foreground">{emergency.assignedHospital.name}</p>
                    <p className="text-xs text-muted-foreground mt-1">Distance from incident: {assignedHospitalDistanceKm ? `${assignedHospitalDistanceKm.toFixed(2)} km` : "N/A"}</p>
                    <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-muted rounded-lg p-2 text-center"><p className="text-muted-foreground">ICU</p><p className="font-bold text-foreground">{emergency.assignedHospital.icuBeds}</p></div>
                      <div className="bg-muted rounded-lg p-2 text-center"><p className="text-muted-foreground">ER</p><p className="font-bold text-foreground">{emergency.assignedHospital.emergencyBeds}</p></div>
                      <div className="col-span-2 bg-muted rounded-lg p-2 text-center"><p className="text-muted-foreground">Occupancy</p><p className="font-bold text-foreground">{emergency.assignedHospital.occupancy}%</p></div>
                    </div>
                  </div>
                )}

                <div className="glass-card p-4">
                  <h3 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> Expert Advice While Waiting</h3>
                  <div className="space-y-2">
                    {adviceList.map((tip, index) => (
                      <div key={`${tip}-${index}`} className="text-xs text-foreground bg-muted/60 rounded-lg p-2">
                        {index + 1}. {tip}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Other ambulances status */}
                <div className="glass-card p-4">
                  <h3 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-2"><Truck className="w-4 h-4" /> Fleet Status</h3>
                  <div className="space-y-2">
                    {MOCK_AMBULANCES.map(a => (
                      <div key={a.id} className={`flex items-center justify-between text-xs px-2 py-1.5 rounded-lg ${a.id === emergency.assignedAmbulance?.id ? "bg-success/15 border border-success/30" : "bg-muted/50"}`}>
                        <span className="text-foreground font-medium">{a.vehicleNo}</span>
                        <span className={`status-badge text-[10px] px-2 py-0.5 ${
                          a.id === emergency.assignedAmbulance?.id ? "bg-success text-success-foreground" :
                          a.status === "available" ? "bg-success/20 text-success" :
                          a.status === "busy" ? "bg-emergency/20 text-emergency" :
                          "bg-warning/20 text-warning"
                        }`}>
                          {a.id === emergency.assignedAmbulance?.id ? "ASSIGNED" : a.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            {emergency.status === "COMPLETED" && (
              <div className="glass-card-strong p-6 glow-success animate-fade-in">
                <div className="flex items-center gap-3 mb-4">
                  <CheckCircle2 className="w-8 h-8 text-success" />
                  <div><h3 className="text-xl font-bold text-foreground">Emergency Resolved</h3><p className="text-sm text-muted-foreground">Case closed</p></div>
                </div>
                <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-muted rounded-xl p-4 text-center"><p className="text-xs text-muted-foreground">Optimized</p><p className="text-2xl font-bold text-foreground">{formatEta(emergency.optimizedTime || 0)}</p></div>
                  <div className="bg-muted rounded-xl p-4 text-center"><p className="text-xs text-muted-foreground">Baseline</p><p className="text-2xl font-bold text-foreground">{formatEta(emergency.baselineTime || 0)}</p></div>
                  <div className="bg-muted rounded-xl p-4 text-center"><p className="text-xs text-muted-foreground">Efficiency</p><p className="text-2xl font-bold text-success">{emergency.baselineTime && emergency.optimizedTime ? Math.round(((emergency.baselineTime - emergency.optimizedTime) / emergency.baselineTime) * 100) : 0}%</p></div>
                  <div className="bg-muted rounded-xl p-4 text-center"><p className="text-xs text-muted-foreground">Severity</p><p className="text-lg font-bold capitalize text-foreground">{emergency.severity}</p></div>
                </div>
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-sm text-muted-foreground">Rate:</span>
                  {[1,2,3,4,5].map(s => <button key={s} aria-label={`Rate ${s} star`} title={`Rate ${s} star`} onClick={() => setRating(s)}><Star className={`w-6 h-6 ${s <= rating ? "text-warning fill-warning" : "text-muted-foreground"}`} /></button>)}
                </div>
                <button onClick={() => { setEmergency(null); setRating(0); setAmbulanceScores([]); setHospitalScores([]); }} className="rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90">New Emergency</button>
              </div>
            )}
          </div>
        ) : null}
      </main>
      <footer className="text-center py-4 text-xs text-muted-foreground border-t border-border/50">Developed by Team LifeLine</footer>
    </div>
  );
};

export default UserDashboard;
