import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Activity, LogOut, AlertTriangle, Clock, Truck, Building2, BarChart3, FileText, Bed, Users } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { RealTimeEmergencyMap } from "@/components/RealTimeEmergencyMap";
import { apiFetch } from "@/lib/api";
import { Ambulance, EmergencyRequest, Hospital } from "@/data/types";

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
};

type LiveLog = {
  id: string;
  time: string;
  title: string;
  detail: string;
};

const COLORS = ["#22c55e", "#2563eb"];

const AdminDashboard = () => {
  const { user, logout } = useAuth();
  const [windowKey, setWindowKey] = useState<WindowKey>("today");
  const [summary, setSummary] = useState<AdminSummary | null>(null);
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [ambulances, setAmbulances] = useState<Ambulance[]>([]);
  const [emergencies, setEmergencies] = useState<EmergencyRequest[]>([]);
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
        const [summaryResponse, hospitalsResponse, ambulancesResponse, emergenciesResponse] = await Promise.all([
          apiFetch(`/admin/summary?window=${windowKey}`),
          apiFetch("/hospitals"),
          apiFetch("/ambulances"),
          apiFetch("/emergencies"),
        ]);

        if (!active) return;

        const [summaryData, hospitalsData, ambulancesData, emergenciesData] = await Promise.all([
          summaryResponse.ok ? summaryResponse.json() : Promise.resolve(null),
          hospitalsResponse.ok ? hospitalsResponse.json() : Promise.resolve([]),
          ambulancesResponse.ok ? ambulancesResponse.json() : Promise.resolve([]),
          emergenciesResponse.ok ? emergenciesResponse.json() : Promise.resolve([]),
        ]);

        setSummary(summaryData);
        setHospitals(Array.isArray(hospitalsData) ? hospitalsData : []);
        setAmbulances(Array.isArray(ambulancesData) ? ambulancesData : []);
        setEmergencies(Array.isArray(emergenciesData) ? emergenciesData : []);
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

  const activeEmergencies = useMemo(
    () => emergencies.filter((item) => item.status !== "COMPLETED"),
    [emergencies]
  );

  const availableAmbulances = useMemo(
    () => ambulances.filter((item) => String(item.status || "").toLowerCase() === "available").length,
    [ambulances]
  );

  const hospitalsReady = useMemo(
    () => hospitals.filter((item) => (item.icuBeds || 0) + (item.emergencyBeds || 0) > 0).length,
    [hospitals]
  );

  const avgResponseMinutes = Math.max(1, Math.round((summary?.avgEtaSeconds ?? 300) / 60));

  const mlcCases = useMemo(
    () => activeEmergencies.filter((item) => /mlc|medico|legal/i.test(item.type || "")).length,
    [activeEmergencies]
  );

  const normalCases = Math.max(0, activeEmergencies.length - mlcCases);

  const ratioData = [
    { name: "MLC", value: mlcCases },
    { name: "Normal", value: normalCases || 1 },
  ];

  const trendData = [
    { t: "9:00", v: Math.max(2, avgResponseMinutes - 1) },
    { t: "10:00", v: avgResponseMinutes },
    { t: "11:00", v: avgResponseMinutes + 2 },
    { t: "12:00", v: avgResponseMinutes - 1 },
    { t: "13:00", v: avgResponseMinutes },
    { t: "14:00", v: avgResponseMinutes + 2 },
    { t: "15:00", v: avgResponseMinutes - 1 },
  ];

  const liveLogs: LiveLog[] = useMemo(() => {
    if (activeEmergencies.length) {
      return activeEmergencies.slice(0, 6).map((item, idx) => ({
        id: item.id,
        time: new Date(item.createdAt || Date.now()).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false }),
        title:
          idx === 0
            ? "Emergency Created"
            : idx === 1
              ? "Ambulance Assigned"
              : idx === 2
                ? "Hospital Notified"
                : "MLC Flagged",
        detail:
          idx === 0
            ? `${item.id} reported near ${item.lat?.toFixed?.(3)}, ${item.lng?.toFixed?.(3)}.`
            : idx === 1
              ? `${item.assignedAmbulance?.vehicleNo || "Ambulance"} assigned to ${item.id}.`
              : idx === 2
                ? `${item.assignedHospital?.name || "Hospital"} alerted for intake.`
                : `${item.id} marked for legal tracking.`,
      }));
    }

    return [
      { id: "1", time: "12:01", title: "Emergency Created", detail: "EMR-7A21 reported near Connaught Place." },
      { id: "2", time: "12:02", title: "Ambulance Assigned", detail: "DL-03-EF-9012 assigned to EMR-7A21." },
      { id: "3", time: "12:03", title: "Hospital Notified", detail: "City General Hospital alerted for trauma intake." },
      { id: "4", time: "12:04", title: "MLC Flagged", detail: "Case forwarded to medico-legal queue." },
    ];
  }, [activeEmergencies]);

  const navItems = [
    { label: "Dashboard", icon: Activity, active: true },
    { label: "Emergencies", icon: AlertTriangle },
    { label: "Ambulances", icon: Truck },
    { label: "Hospitals", icon: Building2 },
    { label: "Medical-Legal Cases", icon: Bed, hasDot: true },
    { label: "Analytics", icon: BarChart3 },
    { label: "Settings", icon: Users },
  ];

  return (
    <div className="min-h-screen bg-background px-4 py-5 md:px-6">
      <div className="grid gap-5 lg:grid-cols-[270px_minmax(0,1fr)]">
        <aside className="glass-card-strong p-4 flex flex-col gap-4 h-fit lg:sticky lg:top-5">
          <div className="flex items-center gap-2">
            <Activity className="w-6 h-6 text-emergency" />
            <div>
              <p className="text-xl font-bold">Res<span className="text-emergency">Q</span>Route</p>
              <p className="text-xs text-muted-foreground">Admin Control Room</p>
            </div>
          </div>

          <div className="rounded-2xl border border-border/60 bg-card/50 p-3">
            <p className="text-sm font-semibold text-foreground">{user?.name || "Admin"}</p>
            <p className="text-xs text-muted-foreground break-all">{user?.email || "admin@resqroute.in"}</p>
          </div>

          <div className="space-y-1">
            {navItems.map((item) => (
              <button
                key={item.label}
                className={`w-full flex items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm transition-colors ${
                  item.active ? "bg-emergency text-white" : "text-muted-foreground hover:text-foreground hover:bg-card"
                }`}
                type="button"
              >
                <span className="flex items-center gap-2">
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </span>
                {item.hasDot ? <span className="w-2 h-2 rounded-full bg-emergency" /> : null}
              </button>
            ))}
          </div>

          <div className="mt-auto rounded-2xl border border-emergency/30 bg-emergency/10 p-4">
            <p className="text-emergency font-semibold">Restricted Access</p>
            <p className="text-xs text-muted-foreground mt-1">Medico-legal cases, routing changes, and completion overrides are monitored.</p>
          </div>

          <button
            onClick={handleLogout}
            className="w-full rounded-xl border border-border px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground flex items-center justify-center gap-2"
            type="button"
          >
            <LogOut className="w-4 h-4" /> Sign out
          </button>
        </aside>

        <main className="space-y-5">
          <section className="glass-card-strong p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Live Admin Dashboard</h1>
              <p className="text-sm text-muted-foreground">Realtime control room for dispatch, MLC handling, and operations tracking.</p>
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
                  className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${
                    windowKey === item.key ? "bg-emergency text-white border-emergency" : "border-border text-muted-foreground hover:text-foreground"
                  }`}
                  type="button"
                >
                  {item.label}
                </button>
              ))}
            </div>
          </section>

          <section className="grid grid-cols-2 xl:grid-cols-5 gap-4">
            {[
              { label: "Active Emergencies", value: activeEmergencies.length, icon: AlertTriangle, color: "text-emergency" },
              { label: "Available Ambulances", value: availableAmbulances, icon: Truck, color: "text-clinical" },
              { label: "Hospitals Ready", value: hospitalsReady, icon: Building2, color: "text-success" },
              { label: "Avg Response Time", value: `${avgResponseMinutes} min`, icon: Clock, color: "text-warning" },
              { label: "MLC Cases Today", value: mlcCases, icon: Bed, color: "text-emergency" },
            ].map((item) => (
              <div key={item.label} className="glass-card p-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                  <item.icon className={`w-4 h-4 ${item.color}`} />
                </div>
                <p className="text-4xl font-bold text-foreground mt-2">{loading ? "--" : item.value}</p>
              </div>
            ))}
          </section>

          <section className="grid xl:grid-cols-[minmax(0,1fr)_360px] gap-5">
            <div className="glass-card p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-3xl font-bold flex items-center gap-2"><Activity className="w-5 h-5 text-clinical" /> Live Map</h2>
                <span className="text-sm text-muted-foreground">{activeEmergencies.length} active markers</span>
              </div>
              <div className="map-panel-lg rounded-2xl overflow-hidden border border-border/60">
                <RealTimeEmergencyMap
                  center={[28.6139, 77.209]}
                  allAmbulances={ambulances}
                  allHospitals={hospitals}
                />
              </div>
            </div>

            <div className="glass-card p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-3xl font-bold flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-emergency" /> Active Cases</h2>
                <span className="text-sm text-muted-foreground">{activeEmergencies.length} ongoing</span>
              </div>
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                {activeEmergencies.length ? activeEmergencies.map((item) => (
                  <div key={item.id} className="rounded-2xl border border-border/70 bg-card/40 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold text-foreground">{item.id}</p>
                      <span className="text-xs px-2 py-0.5 rounded-full border border-border text-muted-foreground">{item.status}</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{item.type}</p>
                    <p className="text-xs text-muted-foreground mt-1">Ambulance: {item.assignedAmbulance?.vehicleNo || "Pending"}</p>
                    <p className="text-xs text-muted-foreground">Hospital: {item.assignedHospital?.name || "Pending"}</p>
                  </div>
                )) : <p className="text-sm text-muted-foreground">No ongoing cases right now.</p>}
              </div>
            </div>
          </section>

          <section className="grid xl:grid-cols-[minmax(0,1fr)_420px] gap-5">
            <div className="glass-card p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-3xl font-bold flex items-center gap-2"><BarChart3 className="w-5 h-5 text-clinical" /> Analytics</h2>
                <span className="text-sm text-muted-foreground">Realtime trends</span>
              </div>
              <div className="grid lg:grid-cols-2 gap-4">
                <div className="rounded-2xl border border-border/70 bg-card/40 p-4">
                  <h3 className="text-2xl font-bold mb-2">Response Time Trend</h3>
                  <ResponsiveContainer width="100%" height={260}>
                    <LineChart data={trendData}>
                      <XAxis dataKey="t" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                      <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} domain={[0, 10]} />
                      <Tooltip />
                      <Line type="monotone" dataKey="v" stroke="#3b82f6" strokeWidth={4} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <div className="rounded-2xl border border-border/70 bg-card/40 p-4">
                  <h3 className="text-2xl font-bold mb-2">MLC vs Normal Ratio</h3>
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie data={ratioData} dataKey="value" nameKey="name" innerRadius={0} outerRadius={95}>
                        {ratioData.map((entry, index) => (
                          <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <div className="glass-card p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-3xl font-bold flex items-center gap-2"><FileText className="w-5 h-5 text-warning" /> Live Logs</h2>
                <span className="text-sm text-muted-foreground">{liveLogs.length} entries</span>
              </div>
              <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                {liveLogs.map((log) => (
                  <div key={log.id} className="rounded-2xl border border-border/70 bg-card/40 p-4">
                    <p className="text-lg text-muted-foreground mb-1">[{log.time}]</p>
                    <p className="text-4xl font-bold text-foreground leading-tight">{log.title}</p>
                    <p className="text-lg text-muted-foreground mt-1">{log.detail}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
};

export default AdminDashboard;
