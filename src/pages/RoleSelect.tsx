import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Shield, Building2, UserCircle, Activity, Truck, Crosshair, Building } from "lucide-react";
import { MOCK_AMBULANCES, MOCK_HOSPITALS, findNearestAmbulance, findBestHospital, haversineDistance } from "@/data/mockData";

const roles = [
  { key: "user" as const, label: "User", desc: "Request emergency assistance", icon: UserCircle, gradient: "from-clinical to-primary" },
  { key: "hospital" as const, label: "Hospital", desc: "Manage beds, ambulances & emergencies", icon: Building2, gradient: "from-accent to-success" },
  { key: "admin" as const, label: "Admin", desc: "System analytics & oversight", icon: Shield, gradient: "from-emergency to-warning" },
];

const demoIncidents: [number, number][] = [
  [28.611, 77.221],
  [28.618, 77.213],
  [28.605, 77.229],
  [28.624, 77.204],
];

const RoleSelect = () => {
  const navigate = useNavigate();
  const [incidentIndex, setIncidentIndex] = useState(0);
  const [animationRunId, setAnimationRunId] = useState(0);

  const [incidentLat, incidentLng] = demoIncidents[incidentIndex];

  const assignedAmbulance = useMemo(
    () => findNearestAmbulance(incidentLat, incidentLng, MOCK_AMBULANCES),
    [incidentLat, incidentLng]
  );

  const assignedHospital = useMemo(
    () => findBestHospital(incidentLat, incidentLng, MOCK_HOSPITALS),
    [incidentLat, incidentLng]
  );

  const etaMinutes = useMemo(() => {
    if (!assignedAmbulance) return 0;
    const km = haversineDistance(incidentLat, incidentLng, assignedAmbulance.lat, assignedAmbulance.lng);
    return Math.max(2, Math.round((km / 40) * 60));
  }, [assignedAmbulance, incidentLat, incidentLng]);

  const cycleIncident = () => {
    setIncidentIndex((prev) => (prev + 1) % demoIncidents.length);
    setAnimationRunId((prev) => prev + 1);
  };

  const replayAnimation = () => {
    setAnimationRunId((prev) => prev + 1);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background relative overflow-hidden">
      <div className="absolute inset-0 bg-[linear-gradient(hsl(var(--border)/0.3)_1px,transparent_1px),linear-gradient(90deg,hsl(var(--border)/0.3)_1px,transparent_1px)] bg-[size:60px_60px]" />

      <div className="relative z-10 text-center mb-12 animate-fade-in">
        <div className="flex items-center justify-center gap-3 mb-4">
          <Activity className="w-10 h-10 text-emergency" />
          <h1 className="text-5xl font-bold tracking-tight text-foreground">
            Res<span className="text-emergency">Q</span>Route
          </h1>
        </div>
        <p className="text-muted-foreground text-lg max-w-md mx-auto">
          AI-Powered Intelligent Emergency Response Optimization Platform
        </p>
        <p className="text-xs text-muted-foreground mt-3 tracking-wide uppercase">
          Faster dispatch. Smarter routing. Better outcomes.
        </p>
      </div>

      <h2 className="relative z-10 text-2xl font-semibold text-foreground mb-8 animate-fade-in">
        Select Your Role
      </h2>

      <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl px-6">
        {roles.map((role, i) => (
          <button
            key={role.key}
            onClick={() => navigate(role.key === "admin" ? "/admin-auth" : `/login/${role.key}`)}
            className="glass-card-strong p-8 flex flex-col items-center gap-4 cursor-pointer group transition-all hover:border-primary/40 hover:scale-[1.03] animate-fade-in role-card"
          >
            <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${role.gradient} flex items-center justify-center shadow-lg`}>
              <role.icon className="w-8 h-8 text-primary-foreground" />
            </div>
            <h3 className="text-xl font-bold text-foreground">{role.label}</h3>
            <p className="text-sm text-muted-foreground text-center">{role.desc}</p>
          </button>
        ))}
      </div>

      <div className="relative z-10 w-full max-w-5xl px-6 mt-10 animate-fade-in">
        <div className="glass-card-strong p-5">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-4">
            <div>
              <p className="text-sm font-semibold text-foreground">Rescue Animation Demo</p>
              <p className="text-xs text-muted-foreground">
                Nearest ambulance and hospital are selected using dispatch logic, then animated end-to-end.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={replayAnimation} className="px-3 py-1.5 text-xs rounded-full border border-border bg-card hover:text-foreground text-muted-foreground">
                Replay
              </button>
              <button onClick={cycleIncident} className="px-3 py-1.5 text-xs rounded-full border border-primary bg-primary text-primary-foreground">
                Next Incident
              </button>
            </div>
          </div>

          <div className="rescue-video-shell">
            <div className="rescue-stage-track" />
            <div className="rescue-stage-point rescue-stage-base">
              <span className="rescue-stage-dot" />
              <p className="rescue-stage-title">Station</p>
            </div>
            <div className="rescue-stage-point rescue-stage-user">
              <span className="rescue-stage-dot rescue-stage-dot-alert" />
              <p className="rescue-stage-title">You</p>
            </div>
            <div className="rescue-stage-point rescue-stage-hospital">
              <span className="rescue-stage-dot rescue-stage-dot-hospital" />
              <p className="rescue-stage-title">Hospital</p>
            </div>

            <div key={animationRunId} className="rescue-ambulance-runner">
              <Truck className="w-5 h-5" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
            <div className="flow-step-card">
              <Crosshair className="w-4 h-4 text-emergency" />
              <div>
                <p className="text-xs text-muted-foreground">Incident</p>
                <p className="text-sm font-semibold text-foreground">{incidentLat.toFixed(3)}, {incidentLng.toFixed(3)}</p>
              </div>
            </div>
            <div className="flow-step-card">
              <Truck className="w-4 h-4 text-clinical" />
              <div>
                <p className="text-xs text-muted-foreground">Nearest Ambulance</p>
                <p className="text-sm font-semibold text-foreground">{assignedAmbulance?.vehicleNo ?? "Not available"}</p>
                <p className="text-xs text-muted-foreground">ETA approx {etaMinutes} min</p>
              </div>
            </div>
            <div className="flow-step-card">
              <Building className="w-4 h-4 text-success" />
              <div>
                <p className="text-xs text-muted-foreground">Backend-selected Hospital</p>
                <p className="text-sm font-semibold text-foreground">{assignedHospital?.name ?? "Not available"}</p>
                <p className="text-xs text-muted-foreground">Based on distance + occupancy</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <p className="relative z-10 mt-16 text-xs text-muted-foreground animate-fade-in">
        Developed by Team LifeLine
      </p>
    </div>
  );
};

export default RoleSelect;
