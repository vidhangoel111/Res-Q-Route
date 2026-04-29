import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Activity, LogOut, Bed, Truck, AlertTriangle, Plus, Minus, RefreshCw } from "lucide-react";
import { RealTimeEmergencyMap } from "@/components/RealTimeEmergencyMap";
import { apiFetch } from "@/lib/api";
import { Ambulance, Hospital } from "@/data/types";

const statusColors: Record<string, string> = {
  available: "bg-success text-success-foreground",
  busy: "bg-emergency text-emergency-foreground",
  maintenance: "bg-warning text-warning-foreground",
};

const HospitalDashboard = () => {
  const { user, logout } = useAuth();
  const [hospital, setHospital] = useState<Hospital | null>(null);
  const [ambulances, setAmbulances] = useState<Ambulance[]>([]);
  const [auditLog, setAuditLog] = useState<{ action: string; time: string }[]>([]);
  const [emergencies, setEmergencies] = useState<Array<{ id: string; type: string; severity: string; status: string; eta: string }>>([]);

  const handleLogout = () => {
    logout();
    window.location.href = "/";
  };

  const refreshData = async () => {
    const [hospitalsResponse, ambulancesResponse, emergenciesResponse] = await Promise.all([
      apiFetch("/hospitals"),
      apiFetch("/ambulances"),
      apiFetch("/emergencies"),
    ]);

    const [hospitalRows, ambulanceRows, emergencyRows] = await Promise.all([
      hospitalsResponse.ok ? hospitalsResponse.json() : Promise.resolve([]),
      ambulancesResponse.ok ? ambulancesResponse.json() : Promise.resolve([]),
      emergenciesResponse.ok ? emergenciesResponse.json() : Promise.resolve([]),
    ]);

    const currentHospital = Array.isArray(hospitalRows)
      ? hospitalRows.find((item: Hospital) => item.id === user?.hospitalId) || hospitalRows[0] || null
      : null;

    setHospital(currentHospital);
    setAmbulances(Array.isArray(ambulanceRows) ? ambulanceRows.filter((item: Ambulance) => item.hospitalId === currentHospital?.id) : []);
    setEmergencies(
      Array.isArray(emergencyRows)
        ? emergencyRows
            .filter((item: { assignedHospitalId?: string }) => item.assignedHospitalId === currentHospital?.id)
            .slice(0, 8)
            .map((item: { id: string; type: string; severity: string; status: string; etaSeconds: number }) => ({
              id: item.id,
              type: item.type,
              severity: item.severity,
              status: item.status,
              eta: item.etaSeconds ? `${Math.max(1, Math.round(item.etaSeconds / 60))} min` : "—",
            }))
        : []
    );

    setAuditLog(
      Array.isArray(emergencyRows)
        ? emergencyRows
            .filter((item: { assignedHospitalId?: string; createdAt?: string; status: string }) => item.assignedHospitalId === currentHospital?.id)
            .slice(0, 10)
            .map((item: { status: string; createdAt?: string; id: string }) => ({
              action: `${item.id} → ${item.status}`,
              time: item.createdAt ? new Date(item.createdAt).toLocaleTimeString() : new Date().toLocaleTimeString(),
            }))
        : []
    );
  };

  useEffect(() => {
    refreshData();
  }, [user?.hospitalId]);

  const updateBeds = async (field: "icuBeds" | "emergencyBeds", delta: number) => {
    if (!hospital) return;
    const nextValue = Math.max(0, hospital[field] + delta);
    const payload = {
      icuBeds: field === "icuBeds" ? nextValue : hospital.icuBeds,
      emergencyBeds: field === "emergencyBeds" ? nextValue : hospital.emergencyBeds,
      occupancy: hospital.occupancy,
    };

    await apiFetch(`/hospitals/${hospital.id}/beds`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    refreshData();
  };

  const toggleAmbulanceStatus = async (id: string) => {
    const ambulance = ambulances.find((item) => item.id === id);
    if (!ambulance) return;

    const next = ambulance.status === "available" ? "busy" : ambulance.status === "busy" ? "maintenance" : "available";

    await apiFetch(`/ambulances/${id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });

    refreshData();
  };

  const activeEmergencies = useMemo(() => emergencies, [emergencies]);

  if (!hospital) {
    return <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">Loading hospital dashboard...</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="glass-card-strong border-b border-border/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-6 h-6 text-emergency" />
            <span className="text-lg font-bold">Res<span className="text-emergency">Q</span>Route</span>
            <span className="text-xs bg-clinical/20 text-clinical px-2 py-0.5 rounded-full font-medium ml-2">Hospital</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground hidden sm:block">{hospital.name}</span>
            <button onClick={handleLogout} className="text-muted-foreground hover:text-foreground p-2" title="Sign out" aria-label="Sign out"><LogOut className="w-4 h-4" /></button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in">
          {[
            { label: "ICU Beds", value: hospital.icuBeds, field: "icuBeds" as const, icon: Bed, color: "text-emergency" },
            { label: "ER Beds", value: hospital.emergencyBeds, field: "emergencyBeds" as const, icon: Bed, color: "text-clinical" },
            { label: "Occupancy", value: `${hospital.occupancy}%`, field: null, icon: Activity, color: "text-warning" },
            { label: "Total Beds", value: hospital.totalBeds, field: null, icon: Bed, color: "text-success" },
          ].map((item) => (
            <div key={item.label} className="glass-card p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">{item.label}</span>
                <item.icon className={`w-5 h-5 ${item.color}`} />
              </div>
              <p className="text-3xl font-bold text-foreground">{item.value}</p>
              {item.field && (
                <div className="flex gap-2 mt-3">
                  <button onClick={() => updateBeds(item.field!, -1)} className="rounded-lg border border-border px-3 py-1 text-sm hover:bg-muted" title={`Decrease ${item.label}`} aria-label={`Decrease ${item.label}`}><Minus className="w-3 h-3" /></button>
                  <button onClick={() => updateBeds(item.field!, 1)} className="rounded-lg border border-border px-3 py-1 text-sm hover:bg-muted" title={`Increase ${item.label}`} aria-label={`Increase ${item.label}`}><Plus className="w-3 h-3" /></button>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <div className="glass-card p-5 animate-fade-in">
            <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2"><Truck className="w-5 h-5 text-clinical" /> Ambulance Fleet</h3>
            <div className="space-y-3">
              {ambulances.map(a => (
                <div key={a.id} className="flex items-center justify-between bg-muted rounded-xl p-3">
                  <div><p className="font-semibold text-foreground text-sm">{a.vehicleNo}</p><p className="text-xs text-muted-foreground">{a.driverName}</p></div>
                  <button onClick={() => toggleAmbulanceStatus(a.id)} className={`status-badge ${statusColors[a.status]} cursor-pointer`}>{a.status}</button>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-card p-5 animate-fade-in">
            <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-emergency" /> Active Emergencies</h3>
            <div className="space-y-3">
              {activeEmergencies.map(e => (
                <div key={e.id} className="flex items-center justify-between bg-muted rounded-xl p-3">
                  <div><p className="font-mono text-xs text-muted-foreground">{e.id}</p><p className="font-semibold text-foreground text-sm">{e.type}</p></div>
                  <div className="text-right">
                    <span className={`status-badge ${e.severity === "critical" ? "bg-emergency text-emergency-foreground" : "bg-warning text-warning-foreground"}`}>{e.severity}</span>
                    <p className="text-xs text-muted-foreground mt-1">{e.status} • ETA {e.eta}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Real-Time Ambulance Tracking Map */}
        <div className="glass-card p-5 animate-fade-in">
          <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2"><Truck className="w-5 h-5 text-clinical" /> 🚑 Live Ambulance Positions</h3>
          <div className="map-panel-md rounded-xl overflow-hidden">
            <RealTimeEmergencyMap
              center={[hospital.lat || 28.6139, hospital.lng || 77.2090]}
              allAmbulances={ambulances}
              allHospitals={[hospital]}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            📍 Your hospital location | 🚑 All associated ambulances | 🔄 Real-time updates
          </p>
        </div>

        <div className="glass-card p-5 animate-fade-in">
          <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2"><RefreshCw className="w-5 h-5 text-accent" /> Audit Log</h3>
          {auditLog.length === 0 ? <p className="text-sm text-muted-foreground">No actions recorded yet.</p> : (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {auditLog.map((l, i) => (<div key={i} className="flex items-center gap-3 text-sm"><span className="text-xs text-muted-foreground font-mono w-20 shrink-0">{l.time}</span><span className="text-foreground">{l.action}</span></div>))}
            </div>
          )}
        </div>
      </main>
      <footer className="text-center py-4 text-xs text-muted-foreground border-t border-border/50">Developed by Team LifeLine</footer>
    </div>
  );
};

export default HospitalDashboard;
