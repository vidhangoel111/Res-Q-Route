import { useAuth } from "@/context/AuthContext";
import { Activity, LogOut, AlertTriangle, Clock, TrendingDown, BarChart3, Truck, Bed, FileText } from "lucide-react";
import { MOCK_ANALYTICS } from "@/data/mockData";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from "recharts";

const AdminDashboard = () => {
  const { logout } = useAuth();
  const handleLogout = () => { logout(); window.location.href = "/"; };
  const d = MOCK_ANALYTICS;

  const auditLogs = [
    { time: "14:32", action: "Severity override: EMR-AX3K → critical", actor: "Dr. Patel" },
    { time: "13:15", action: "Ambulance DL-03 marked maintenance", actor: "Fleet Manager" },
    { time: "12:48", action: "ICU beds updated at City General", actor: "Hospital Admin" },
    { time: "11:20", action: "New ambulance DL-06 registered", actor: "System" },
    { time: "10:05", action: "Emergency EMR-ZZ1B completed", actor: "System" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="glass-card-strong border-b border-border/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-6 h-6 text-emergency" />
            <span className="text-lg font-bold">Res<span className="text-emergency">Q</span>Route</span>
            <span className="text-xs bg-emergency/20 text-emergency px-2 py-0.5 rounded-full font-medium ml-2">Admin</span>
          </div>
          <button onClick={handleLogout} className="text-muted-foreground hover:text-foreground p-2"><LogOut className="w-4 h-4" /></button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Emergencies Today", value: d.totalEmergenciesToday, icon: AlertTriangle, color: "text-emergency" },
            { label: "Avg Response", value: `${d.avgResponseTime} min`, icon: Clock, color: "text-clinical" },
            { label: "Time Reduction", value: `${d.responseTimeReduction}%`, icon: TrendingDown, color: "text-success" },
            { label: "Ambulance Util.", value: `${d.ambulanceUtilization}%`, icon: Truck, color: "text-warning" },
          ].map((kpi, i) => (
            <div key={kpi.label} className="glass-card p-5 animate-fade-in" style={{ animationDelay: `${i * 100}ms` }}>
              <div className="flex items-center justify-between mb-2"><span className="text-xs text-muted-foreground">{kpi.label}</span><kpi.icon className={`w-4 h-4 ${kpi.color}`} /></div>
              <p className="text-2xl font-bold text-foreground">{kpi.value}</p>
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <div className="glass-card p-5">
            <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2"><BarChart3 className="w-4 h-4 text-clinical" /> Severity Distribution</h3>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart><Pie data={d.severityDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, value }) => `${name}: ${value}`}>{d.severityDistribution.map((entry, i) => <Cell key={i} fill={entry.fill} />)}</Pie><Tooltip /></PieChart>
            </ResponsiveContainer>
          </div>
          <div className="glass-card p-5">
            <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-emergency" /> Emergency Types</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={d.emergencyTypes}><XAxis dataKey="type" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} /><YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} /><Tooltip /><Bar dataKey="count" fill="hsl(210, 80%, 55%)" radius={[4, 4, 0, 0]} /></BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2"><Clock className="w-4 h-4 text-warning" /> Peak Hour Demand</h3>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={d.peakHours}><XAxis dataKey="hour" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} interval={3} /><YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} /><Tooltip /><Area type="monotone" dataKey="emergencies" fill="hsl(0, 85%, 55%)" fillOpacity={0.2} stroke="hsl(0, 85%, 55%)" strokeWidth={2} /></AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <div className="glass-card p-5">
            <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2"><Bed className="w-4 h-4 text-clinical" /> Bed Occupancy</h3>
            <div className="flex items-center gap-4">
              <div className="relative w-28 h-28">
                <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                  <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="hsl(var(--muted))" strokeWidth="3" />
                  <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="hsl(210, 80%, 55%)" strokeWidth="3" strokeDasharray={`${d.bedOccupancy}, 100`} />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-xl font-bold text-foreground">{d.bedOccupancy}%</span>
              </div>
              <div className="text-sm text-muted-foreground"><p>All hospitals</p><p className="text-foreground font-semibold">{Math.round(d.bedOccupancy * 8.5)} / 850 beds</p></div>
            </div>
          </div>
          <div className="glass-card p-5">
            <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2"><FileText className="w-4 h-4 text-accent" /> Audit Log</h3>
            <div className="space-y-3">
              {auditLogs.map((l, i) => (<div key={i} className="flex gap-3 text-sm"><span className="font-mono text-xs text-muted-foreground w-12 shrink-0">{l.time}</span><div><p className="text-foreground">{l.action}</p><p className="text-xs text-muted-foreground">{l.actor}</p></div></div>))}
            </div>
          </div>
        </div>
      </main>
      <footer className="text-center py-4 text-xs text-muted-foreground border-t border-border/50">Developed by Team LifeLine</footer>
    </div>
  );
};

export default AdminDashboard;
