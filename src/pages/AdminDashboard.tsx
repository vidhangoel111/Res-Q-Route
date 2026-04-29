import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Activity, LogOut, AlertTriangle, Clock, TrendingDown, BarChart3, Truck, Bed, FileText, Building2, Users } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { RealTimeEmergencyMap } from "@/components/RealTimeEmergencyMap";
import { apiFetch } from "@/lib/api";
import { Ambulance, Hospital } from "@/data/types";

type WindowKey = "1h" | "24h" | "today";

type AdminSummary = {
  totalEmergenciesToday: number;
  totalEmergencies: number;
  completedEmergencies: number;
  avgEtaSeconds: number;
  ambulanceUtilization: number;
  bedOccupancy: number;
  hospitals: number;
  ambulances: number;
  users: number;
  window: string;
  userStats: Array<{ id: string; name: string; email: string; role: string; hospitalId?: string | null; emergencyCount: number; lastEmergencyAt?: string | null }>;
  hospitalStats: Array<{ id: string; name: string; occupancy: number; emergencyBeds: number; icuBeds: number; totalBeds: number; emergencyCount: number; historyCount: number; lastHistoryAt?: string | null }>;
  recentHistory: Array<{ id: string; hospitalName?: string | null; action: string; details: string; actorName?: string | null; createdAt?: string }>
};

const COLORS = ["hsl(0 85% 55%)", "hsl(210 80% 55%)", "hsl(160 70% 45%)", "hsl(36 100% 50%)"];

const AdminDashboard = () => {
  const { user, logout } = useAuth();
  const [windowKey, setWindowKey] = useState<WindowKey>("1h");
  const [summary, setSummary] = useState<AdminSummary | null>(null);
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [ambulances, setAmbulances] = useState<Ambulance[]>([]);
  const [loading, setLoading] = useState(true);

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch {
      // already signed out
    }
    logout();
    window.location.href = "/";
  };

  useEffect(() => {
    let active = true;

    const loadData = async () => {
      setLoading(true);
      try {
        const [summaryResponse, hospitalsResponse, ambulancesResponse] = await Promise.all([
          apiFetch(`/admin/summary?window=${windowKey}`),
          apiFetch("/hospitals"),
          apiFetch("/ambulances"),
        ]);

        if (!active) return;

        const [summaryData, hospitalsData, ambulancesData] = await Promise.all([
          summaryResponse.ok ? summaryResponse.json() : Promise.resolve(null),
          hospitalsResponse.ok ? hospitalsResponse.json() : Promise.resolve([]),
          ambulancesResponse.ok ? ambulancesResponse.json() : Promise.resolve([]),
        ]);

        setSummary(summaryData);
        setHospitals(Array.isArray(hospitalsData) ? hospitalsData : []);
        setAmbulances(Array.isArray(ambulancesData) ? ambulancesData : []);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadData();
    return () => {
      active = false;
    };
  }, [windowKey]);

  const emergencyKpiLabel = windowKey === "1h" ? "Emergencies (1h)" : windowKey === "24h" ? "Emergencies (24h)" : "Emergencies Today";
  const userPanel = summary?.userStats ?? [];
  const hospitalPanel = summary?.hospitalStats ?? [];
  const historyPanel = summary?.recentHistory ?? [];

  const userChartData = useMemo(
    () => userPanel.slice(0, 4).map((item, index) => ({ name: item.name.split(" ")[0], value: item.emergencyCount || 0, fill: COLORS[index % COLORS.length] })),
    [userPanel]
  );

  const hospitalChartData = useMemo(
    () => hospitalPanel.slice(0, 6).map((item) => ({ name: item.name.split(" ")[0], count: item.emergencyCount })),
    [hospitalPanel]
  );

  const topHospitals = hospitalPanel.slice(0, 5);
  const topUsers = userPanel.slice(0, 5);
  const recentLogs = historyPanel.slice(0, 6);

  return (
    <div className="min-h-screen bg-background">
      <header className="glass-card-strong border-b border-border/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-6 h-6 text-emergency" />
            <span className="text-lg font-bold">Res<span className="text-emergency">Q</span>Route</span>
            <span className="text-xs bg-emergency/20 text-emergency px-2 py-0.5 rounded-full font-medium ml-2">Admin</span>
          </div>
          <div className="flex items-center gap-3">
            {user?.photoURL ? (
              <img src={user.photoURL} alt={user.name} className="w-8 h-8 rounded-full border-2 border-emergency/40 object-cover" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-emergency/20 border-2 border-emergency/40 flex items-center justify-center text-emergency text-sm font-bold">
                {user?.name?.charAt(0).toUpperCase() ?? "A"}
              </div>
            )}
            <div className="hidden sm:block text-left">
              <p className="text-xs font-semibold text-foreground leading-tight">{user?.name ?? "Admin"}</p>
              <p className="text-xs text-muted-foreground leading-tight">{user?.email}</p>
            </div>
            <button onClick={handleLogout} className="text-muted-foreground hover:text-foreground p-2 ml-1" title="Sign out">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid lg:grid-cols-[320px_minmax(0,1fr)] gap-6">
          <aside className="space-y-4 lg:sticky lg:top-24 self-start">
            <div className="glass-card p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2"><Building2 className="w-4 h-4 text-clinical" /> Hospital Data</h3>
                <span className="text-xs text-muted-foreground">{hospitalPanel.length || hospitals.length} records</span>
              </div>
              <div className="space-y-3 max-h-[260px] overflow-y-auto pr-1">
                {(topHospitals.length ? topHospitals : hospitals).slice(0, 5).map((hospital) => (
                  <div key={hospital.id} className="rounded-xl border border-border bg-card p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-foreground">{hospital.name}</p>
                        <p className="text-xs text-muted-foreground">Beds: {hospital.icuBeds + hospital.emergencyBeds}/{hospital.totalBeds}</p>
                      </div>
                      <span className="text-xs font-semibold text-emergency">{hospital.emergencyCount ?? 0} cases</span>
                    </div>
                    <div className="mt-2 grid grid-cols-3 gap-2 text-[11px] text-muted-foreground">
                      <span>ICU {hospital.icuBeds}</span>
                      <span>ER {hospital.emergencyBeds}</span>
                      <span>{hospital.occupancy}% occ.</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="glass-card p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2"><Users className="w-4 h-4 text-success" /> User Data</h3>
                <span className="text-xs text-muted-foreground">{userPanel.length || summary?.users || 0} records</span>
              </div>
              <div className="space-y-3 max-h-[260px] overflow-y-auto pr-1">
                {(topUsers.length ? topUsers : userPanel).slice(0, 5).map((item) => (
                  <div key={item.id} className="rounded-xl border border-border bg-card p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-foreground">{item.name}</p>
                        <p className="text-xs text-muted-foreground">{item.email}</p>
                      </div>
                      <span className="text-xs uppercase text-clinical">{item.role}</span>
                    </div>
                    <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
                      <span>{item.emergencyCount || 0} emergencies</span>
                      <span>{item.hospitalId || "No hospital"}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </aside>

          <section className="space-y-6">
            <div className="glass-card p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-foreground">Live Analytics Window</p>
                <p className="text-xs text-muted-foreground">
                  {loading ? "Loading live hospital and user data..." : "Real backend data used for admin analysis and history."}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {([
                  { key: "1h", label: "1 Hour" },
                  { key: "24h", label: "24 Hours" },
                  { key: "today", label: "Today" },
                ] as { key: WindowKey; label: string }[]).map((item) => (
                  <button
                    key={item.key}
                    onClick={() => setWindowKey(item.key)}
                    className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
                      windowKey === item.key ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground border-border hover:text-foreground"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: emergencyKpiLabel, value: summary?.totalEmergenciesToday ?? 0, icon: AlertTriangle, color: "text-emergency" },
                { label: "Avg ETA", value: `${Math.max(1, Math.round((summary?.avgEtaSeconds ?? 0) / 60))} min`, icon: Clock, color: "text-clinical" },
                { label: "Hospital Occupancy", value: `${summary?.bedOccupancy ?? 0}%`, icon: TrendingDown, color: "text-success" },
                { label: "Ambulance Util.", value: `${summary?.ambulanceUtilization ?? 0}%`, icon: Truck, color: "text-warning" },
              ].map((kpi) => (
                <div key={kpi.label} className="glass-card p-5 animate-fade-in admin-kpi-card">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-muted-foreground">{kpi.label}</span>
                    <kpi.icon className={`w-4 h-4 ${kpi.color}`} />
                  </div>
                  <p className="text-2xl font-bold text-foreground">{kpi.value}</p>
                </div>
              ))}
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
              <div className="glass-card p-5">
                <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2"><BarChart3 className="w-4 h-4 text-clinical" /> Hospital Requests</h3>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={hospitalChartData}>
                    <XAxis dataKey="name" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                    <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="count" fill="hsl(210, 80%, 55%)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="glass-card p-5">
                <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2"><Users className="w-4 h-4 text-success" /> User Activity</h3>
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie data={userChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={82} label={({ name, value }) => `${name}: ${value}`}>
                      {userChartData.map((entry, index) => (
                        <Cell key={entry.name} fill={entry.fill || COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="glass-card p-5">
              <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2"><Truck className="w-4 h-4 text-emergency" /> Live Ambulance Dispatch Map</h3>
              <div className="map-panel-lg rounded-xl overflow-hidden">
                <RealTimeEmergencyMap center={[28.6139, 77.209]} allAmbulances={ambulances.length ? ambulances : []} allHospitals={hospitals.length ? hospitals : []} />
              </div>
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
              <div className="glass-card p-5">
                <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2"><Bed className="w-4 h-4 text-clinical" /> Bed Occupancy</h3>
                <div className="flex items-center gap-4">
                  <div className="relative w-28 h-28">
                    <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                      <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="hsl(var(--muted))" strokeWidth="3" />
                      <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="hsl(210, 80%, 55%)" strokeWidth="3" strokeDasharray={`${summary?.bedOccupancy ?? 0}, 100`} />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-xl font-bold text-foreground">{summary?.bedOccupancy ?? 0}%</span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    <p>All hospitals</p>
                    <p className="text-foreground font-semibold">{Math.round((summary?.bedOccupancy ?? 0) * 8.5)} / 850 beds</p>
                  </div>
                </div>
              </div>
              <div className="glass-card p-5">
                <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2"><FileText className="w-4 h-4 text-accent" /> Hospital History</h3>
                <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
                  {recentLogs.length ? recentLogs.map((log) => (
                    <div key={log.id} className="flex gap-3 text-sm">
                      <span className="font-mono text-xs text-muted-foreground w-28 shrink-0">{log.createdAt ? new Date(log.createdAt).toLocaleTimeString() : "--:--"}</span>
                      <div>
                        <p className="text-foreground">{log.action} {log.hospitalName ? `• ${log.hospitalName}` : ""}</p>
                        <p className="text-xs text-muted-foreground">{log.details}</p>
                      </div>
                    </div>
                  )) : <p className="text-sm text-muted-foreground">No hospital history yet.</p>}
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>
      <footer className="text-center py-4 text-xs text-muted-foreground border-t border-border/50">Developed by Team LifeLine</footer>
    </div>
  );
};

export default AdminDashboard;
