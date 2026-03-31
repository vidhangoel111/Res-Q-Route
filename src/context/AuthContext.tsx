import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";

export type UserRole = "user" | "hospital" | "admin";

interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  photoURL?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  login: (email: string, password: string, role: UserRole) => boolean;
  loginAsAdmin: (googleUser: { id: string; name: string; email: string; photoURL?: string }) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

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

  const loginAsAdmin = useCallback(
    (googleUser: { id: string; name: string; email: string; photoURL?: string }) => {
      const authUser: AuthUser = {
        id: googleUser.id,
        name: googleUser.name,
        email: googleUser.email,
        role: "admin",
        photoURL: googleUser.photoURL,
      };
      setUser(authUser);
      localStorage.setItem("resqroute_user", JSON.stringify(authUser));
    },
    []
  );

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem("resqroute_user");
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, loginAsAdmin, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be within AuthProvider");
  return ctx;
};
