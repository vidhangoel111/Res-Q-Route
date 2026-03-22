import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import RoleSelect from "./pages/RoleSelect";
import Login from "./pages/Login";
import UserDashboard from "./pages/UserDashboard";
import HospitalDashboard from "./pages/HospitalDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import NotFound from "./pages/NotFound";

function ProtectedRoute({ role, children }: { role: string; children: React.ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/" replace />;
  if (user?.role !== role) return <Navigate to={`/dashboard/${user?.role}`} replace />;
  return <>{children}</>;
}

const App = () => (
  <AuthProvider>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<RoleSelect />} />
        <Route path="/login/:role" element={<Login />} />
        <Route path="/dashboard/user" element={<ProtectedRoute role="user"><UserDashboard /></ProtectedRoute>} />
        <Route path="/dashboard/hospital" element={<ProtectedRoute role="hospital"><HospitalDashboard /></ProtectedRoute>} />
        <Route path="/dashboard/admin" element={<ProtectedRoute role="admin"><AdminDashboard /></ProtectedRoute>} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  </AuthProvider>
);

export default App;
