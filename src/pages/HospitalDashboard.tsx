import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Activity, LogOut, Bed, Truck, AlertTriangle, Plus, Minus, RefreshCw } from "lucide-react";
import { MOCK_HOSPITALS, MOCK_AMBULANCES } from "@/data/mockData";
import { Ambulance, Hospital } from "@/data/types";

const HospitalDashboard = () => {
  const { user, logout } = useAuth();
  const [hospital, setHospital] = useState<Hospital>({ ...MOCK_HOSPITALS[0] });
  const [ambulances, setAmbulances] = useState<Ambulance[]>(MOCK_AMBULANCES.filter(a => a.hospitalId === "h1"));
  const [auditLog, setAuditLog] = useState<{ action: string; time: string }[]>([]);

  const handleLogout = () => { logout(); window.location.href = "/"; };
  const log = (action: string) => setAuditLog(prev => [{ action, time: new Date().toLocaleTimeString() }, ...prev.slice(0, 19)]);

  const updateBeds = (field: "icuBeds" | "emergencyBeds", delta: number) => {
    setHospital(h => ({ ...h, [field]: Math.max(0, h[field] + delta) }));
    log(`${field} ${delta > 0 ? "+" : ""}${delta}`);
  };

  const toggleAmbulanceStatus = (id: string) => {
    setAmbulances(prev => prev.map(a => {
      if (a.id !== id) return a;
      const next = a.status === "available" ? "busy" : a.status === "busy" ? "maintenance" : "available";
      log(`${a.vehicleNo} → ${next}`);
      return { ...a, status: next };
    }));
  };

  const activeEmergencies = [
    { id: "EMR-AX3K", type: "Cardiac Arrest", severity: "critical", status: "EN_ROUTE", eta: "03:42" },
    { id: "EMR-BT7P", type: "Road Accident", severity: "high", status: "TRANSPORTING", eta: "—" },
  ];

  const statusColors: Record<string, string> = { available: "bg-success text-success-foreground", busy: "bg-emergency text-emergency-foreground", maintenance: "bg-warning text-warning-foreground" };

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
            <button onClick={handleLogout} className="text-muted-foreground hover:text-foreground p-2"><LogOut className="w-4 h-4" /></button>
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
                  <button onClick={() => updateBeds(item.field!, -1)} className="rounded-lg border border-border px-3 py-1 text-sm hover:bg-muted"><Minus className="w-3 h-3" /></button>
                  <button onClick={() => updateBeds(item.field!, 1)} className="rounded-lg border border-border px-3 py-1 text-sm hover:bg-muted"><Plus className="w-3 h-3" /></button>
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
