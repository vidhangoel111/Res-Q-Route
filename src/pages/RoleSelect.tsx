import { useNavigate } from "react-router-dom";
import { Shield, Building2, UserCircle, Activity } from "lucide-react";

const roles = [
  { key: "user" as const, label: "User", desc: "Request emergency assistance", icon: UserCircle, gradient: "from-clinical to-primary" },
  { key: "hospital" as const, label: "Hospital", desc: "Manage beds, ambulances & emergencies", icon: Building2, gradient: "from-accent to-success" },
  { key: "admin" as const, label: "Admin", desc: "System analytics & oversight", icon: Shield, gradient: "from-emergency to-warning" },
];

const RoleSelect = () => {
  const navigate = useNavigate();

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
      </div>

      <h2 className="relative z-10 text-2xl font-semibold text-foreground mb-8 animate-fade-in">
        Select Your Role
      </h2>

      <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl px-6">
        {roles.map((role, i) => (
          <button
            key={role.key}
            onClick={() => navigate(`/login/${role.key}`)}
            className="glass-card-strong p-8 flex flex-col items-center gap-4 cursor-pointer group transition-all hover:border-primary/40 hover:scale-[1.03] animate-fade-in"
            style={{ animationDelay: `${i * 150}ms` }}
          >
            <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${role.gradient} flex items-center justify-center shadow-lg`}>
              <role.icon className="w-8 h-8 text-primary-foreground" />
            </div>
            <h3 className="text-xl font-bold text-foreground">{role.label}</h3>
            <p className="text-sm text-muted-foreground text-center">{role.desc}</p>
          </button>
        ))}
      </div>

      <p className="relative z-10 mt-16 text-xs text-muted-foreground animate-fade-in">
        Developed by Team LifeLine
      </p>
    </div>
  );
};

export default RoleSelect;
