import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";

export type UserRole = "user" | "hospital" | "admin";

interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

interface AuthContextType {
  user: AuthUser | null;
  login: (email: string, password: string, role: UserRole) => boolean;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

const DEMO_USERS: Record<UserRole, AuthUser> = {
  user: { id: "u1", name: "Rahul Sharma", email: "user@resqroute.in", role: "user" },
  hospital: { id: "h1", name: "City General Hospital", email: "hospital@resqroute.in", role: "hospital" },
  admin: { id: "a1", name: "Admin Control", email: "admin@resqroute.in", role: "admin" },
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(() => {
    try {
      const stored = localStorage.getItem("resqroute_user");
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const login = useCallback((email: string, _password: string, role: UserRole) => {
    const namePart = email.split("@")[0].replace(/[._]/g, " ");
    const displayName = namePart.split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
    const authUser: AuthUser = { id: `${role[0]}1`, name: displayName, email, role };
    setUser(authUser);
    localStorage.setItem("resqroute_user", JSON.stringify(authUser));
    return true;
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem("resqroute_user");
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be within AuthProvider");
  return ctx;
};
