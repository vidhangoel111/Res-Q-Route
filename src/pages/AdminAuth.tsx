import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Activity,
  ArrowLeft,
  Shield,
  AlertTriangle,
  CheckCircle2,
  LogIn,
  UserPlus,
} from "lucide-react";
import { signInWithPopup, signOut } from "firebase/auth";
import { auth, googleProvider } from "@/lib/firebase";
import { isAdminEmail } from "@/lib/adminWhitelist";
import { useAuth } from "@/context/AuthContext";

type Tab = "login" | "register";

const AdminAuth = () => {
  const navigate = useNavigate();
  const { loginAsAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("login");
  const [status, setStatus] = useState<"idle" | "loading" | "denied" | "success">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const handleGoogleAuth = async () => {
    setStatus("loading");
    setErrorMsg("");

    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      const email = user.email ?? "";

      if (!isAdminEmail(email)) {
        // Not whitelisted — sign them out of Firebase immediately
        await signOut(auth);
        setStatus("denied");
        setErrorMsg(
          `Access denied. "${email}" is not an authorised admin account.`
        );
        return;
      }

      // Whitelisted — log them into the app context
      loginAsAdmin({
        id: user.uid,
        name: user.displayName ?? email.split("@")[0],
        email,
        photoURL: user.photoURL ?? undefined,
      });

      setStatus("success");
      setTimeout(() => navigate("/dashboard/admin"), 800);
    } catch (err: unknown) {
      // User closed the popup — not really an error
      if (
        err instanceof Error &&
        (err as { code?: string }).code === "auth/popup-closed-by-user"
      ) {
        setStatus("idle");
        return;
      }
      setStatus("idle");
      setErrorMsg(
        err instanceof Error
          ? err.message
          : "Authentication failed. Please try again."
      );
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden">
      {/* Grid background */}
      <div className="absolute inset-0 bg-[linear-gradient(hsl(var(--border)/0.3)_1px,transparent_1px),linear-gradient(90deg,hsl(var(--border)/0.3)_1px,transparent_1px)] bg-[size:60px_60px]" />

      {/* Glowing orb */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-emergency/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 w-full max-w-md mx-4 animate-fade-in">
        <Link
          to="/"
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Role Selection
        </Link>

        <div className="glass-card-strong p-8">
          {/* Header */}
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-6 h-6 text-emergency" />
            <span className="text-xl font-bold text-foreground">
              Res<span className="text-emergency">Q</span>Route
            </span>
          </div>

          <div className="flex items-center gap-2 mb-6">
            <Shield className="w-5 h-5 text-warning" />
            <span className="text-sm font-semibold text-warning">
              Admin Portal — Restricted Access
            </span>
          </div>

          {/* Tabs */}
          <div className="flex rounded-lg overflow-hidden border border-border mb-6">
            {(["login", "register"] as Tab[]).map((tab) => (
              <button
                key={tab}
                id={`admin-tab-${tab}`}
                onClick={() => {
                  setActiveTab(tab);
                  setStatus("idle");
                  setErrorMsg("");
                }}
                className={[
                  "flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium transition-all",
                  activeTab === tab
                    ? "bg-emergency text-white"
                    : "bg-card text-muted-foreground hover:text-foreground",
                ].join(" ")}
              >
                {tab === "login" ? (
                  <LogIn className="w-4 h-4" />
                ) : (
                  <UserPlus className="w-4 h-4" />
                )}
                {tab === "login" ? "Sign In" : "Register"}
              </button>
            ))}
          </div>

          {/* Tab content */}
          {activeTab === "login" && (
            <div className="space-y-4">
              <div>
                <h2 className="text-2xl font-bold text-foreground">Admin Sign In</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Sign in with your authorised Google account to access the admin dashboard.
                </p>
              </div>

              <GoogleSignInButton
                onClick={handleGoogleAuth}
                loading={status === "loading"}
                label="Sign in with Google"
              />

              {status === "denied" && <DeniedBanner message={errorMsg} />}
              {status === "success" && <SuccessBanner message="Access granted. Redirecting…" />}
              {status === "idle" && errorMsg && <ErrorBanner message={errorMsg} />}

              <p className="text-xs text-center text-muted-foreground pt-2">
                Only authorised admin accounts can sign in.
              </p>
            </div>
          )}

          {activeTab === "register" && (
            <div className="space-y-4">
              <div>
                <h2 className="text-2xl font-bold text-foreground">Admin Registration</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Register your Google account as an admin. Your email must be
                  on the approved list.
                </p>
              </div>

              <div className="rounded-lg border border-warning/40 bg-warning/10 p-4 text-sm text-warning space-y-1">
                <div className="flex items-center gap-2 font-semibold">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  Important
                </div>
                <p className="text-muted-foreground text-xs leading-relaxed">
                  Admin access is restricted to the ResQRoute development team. If your
                  Google account is on the approved list, clicking the button below will
                  register and sign you in automatically.
                </p>
              </div>

              <GoogleSignInButton
                onClick={handleGoogleAuth}
                loading={status === "loading"}
                label="Register / Sign up with Google"
              />

              {status === "denied" && <DeniedBanner message={errorMsg} />}
              {status === "success" && <SuccessBanner message="Registration successful! Redirecting…" />}
              {status === "idle" && errorMsg && <ErrorBanner message={errorMsg} />}

              <p className="text-xs text-center text-muted-foreground pt-2">
                Not on the approved list?{" "}
                <span className="text-foreground font-medium">
                  Contact the team lead to get access.
                </span>
              </p>
            </div>
          )}
        </div>

        <p className="text-center mt-6 text-xs text-muted-foreground">
          Developed by Team LifeLine · Admin access is logged and monitored
        </p>
      </div>
    </div>
  );
};

/* ── Sub-components ─────────────────────────────────────── */

function GoogleSignInButton({
  onClick,
  loading,
  label,
}: {
  onClick: () => void;
  loading: boolean;
  label: string;
}) {
  return (
    <button
      id="admin-google-signin-btn"
      onClick={onClick}
      disabled={loading}
      className="w-full flex items-center justify-center gap-3 rounded-lg border border-border bg-card hover:bg-card/70 px-4 py-3 text-sm font-semibold text-foreground transition-all hover:border-primary/50 hover:shadow-md disabled:opacity-60 disabled:cursor-not-allowed"
    >
      {loading ? (
        <span className="w-5 h-5 rounded-full border-2 border-foreground/30 border-t-foreground animate-spin" />
      ) : (
        <GoogleIcon />
      )}
      {loading ? "Connecting…" : label}
    </button>
  );
}

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}

function DeniedBanner({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-emergency/40 bg-emergency/10 p-3 text-sm text-emergency">
      <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
      <span>{message}</span>
    </div>
  );
}

function SuccessBanner({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-success/40 bg-success/10 p-3 text-sm text-success">
      <CheckCircle2 className="w-4 h-4 shrink-0" />
      <span>{message}</span>
    </div>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm text-warning">
      <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
      <span>{message}</span>
    </div>
  );
}

export default AdminAuth;
