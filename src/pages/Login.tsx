import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Activity, ArrowLeft, LogIn } from "lucide-react";
import { useAuth, UserRole } from "@/context/AuthContext";

const roleLabels: Record<string, string> = { user: "User", hospital: "Hospital", admin: "Admin" };

const Login = () => {
  const { role } = useParams<{ role: string }>();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const validRole = (role && ["user", "hospital", "admin"].includes(role) ? role : "user") as UserRole;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { setError("Please enter email and password"); return; }
    const success = login(email, password, validRole);
    if (success) {
      window.location.href = `/dashboard/${validRole}`;
    } else {
      setError("Invalid credentials");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden">
      <div className="absolute inset-0 bg-[linear-gradient(hsl(var(--border)/0.3)_1px,transparent_1px),linear-gradient(90deg,hsl(var(--border)/0.3)_1px,transparent_1px)] bg-[size:60px_60px]" />

      <div className="relative z-10 w-full max-w-md mx-4 animate-fade-in">
        <Link to="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Role Selection
        </Link>

        <div className="glass-card-strong p-8">
          <div className="flex items-center gap-2 mb-6">
            <Activity className="w-6 h-6 text-emergency" />
            <span className="text-xl font-bold text-foreground">Res<span className="text-emergency">Q</span>Route</span>
          </div>

          <h2 className="text-2xl font-bold text-foreground mb-1">{roleLabels[validRole]} Login</h2>
          <p className="text-sm text-muted-foreground mb-6">Sign in to access your {validRole} dashboard</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="text-sm font-medium text-foreground">Email</label>
              <input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder={`${validRole}@resqroute.in`}
                className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div>
              <label htmlFor="password" className="text-sm font-medium text-foreground">Password</label>
              <input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••"
                className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            {error && <p className="text-sm text-emergency">{error}</p>}
            <button type="submit" className="w-full flex items-center justify-center gap-2 rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90 transition-colors">
              <LogIn className="w-4 h-4" /> Sign In
            </button>
            <p className="text-xs text-center text-muted-foreground">Demo: Enter any email & password</p>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
