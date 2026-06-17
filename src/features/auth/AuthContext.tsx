import React, { createContext, useContext, useState, useEffect } from "react";
import { jwtDecode } from "jwt-decode";

interface User {
  id: string;
  email: string;
  fullName: string;
  avatarUrl?: string;
}

interface DecodedToken {
  userId: string;
  email: string;
  jti: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  jti: string | null;
  refreshToken: string | null;
  login: (token: string, refreshToken: string, user: User) => void;
  logout: () => void;
  isLoading: boolean;
  refresh: () => Promise<string>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [jti, setJti] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const refreshPromiseRef = React.useRef<Promise<string> | null>(null);

  const login = (newToken: string, newRefreshToken: string, newUser: User) => {
    try {
      const decoded = jwtDecode<DecodedToken>(newToken);
      setJti(decoded.jti);
      setToken(newToken);
      setRefreshToken(newRefreshToken);
      setUser(newUser);
      localStorage.setItem("aurelia_user", JSON.stringify(newUser));
      if (newRefreshToken) {
        localStorage.setItem("aurelia_refresh_token", newRefreshToken);
      }
    } catch (err) {
      console.error("Invalid token on login", err);
    }
  };

  const logout = () => {
    setToken(null);
    setRefreshToken(null);
    setUser(null);
    setJti(null);
    localStorage.removeItem("aurelia_user");
    localStorage.removeItem("aurelia_refresh_token");
    // Direct call to let server clear HTTP-Only cookies
    fetch("/api/auth/logout", { method: "POST", credentials: "include" }).catch(() => {});
  };

  const refresh = async () => {
    if (refreshPromiseRef.current) {
      return refreshPromiseRef.current;
    }

    const performRefresh = async () => {
      try {
        const currentRefreshToken = token ? refreshToken : (localStorage.getItem("aurelia_refresh_token") || refreshToken);
        const response = await fetch("/api/auth/refresh", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: currentRefreshToken ? JSON.stringify({ refreshToken: currentRefreshToken }) : undefined,
          credentials: "include"
        });
        if (!response.ok) {
          throw new Error("Failed to refresh token");
        }
        const data = await response.json();
        const decoded = jwtDecode<DecodedToken>(data.accessToken);
        setJti(decoded.jti);
        setToken(data.accessToken);
        setRefreshToken(data.refreshToken);
        setUser(data.user);
        localStorage.setItem("aurelia_user", JSON.stringify(data.user));
        if (data.refreshToken) {
          localStorage.setItem("aurelia_refresh_token", data.refreshToken);
        }
        return data.accessToken;
      } catch (err) {
        logout();
        throw err;
      } finally {
        refreshPromiseRef.current = null;
      }
    };

    refreshPromiseRef.current = performRefresh();
    return refreshPromiseRef.current;
  };

  useEffect(() => {
    const checkAuthStatus = async () => {
      const savedUser = localStorage.getItem("aurelia_user");
      const savedRefreshToken = localStorage.getItem("aurelia_refresh_token");
      if (savedUser && savedRefreshToken) {
        try {
          // Attempt to deduplicated refresh the tokens on mount
          await refresh();
        } catch (err) {
          localStorage.removeItem("aurelia_user");
          localStorage.removeItem("aurelia_refresh_token");
        }
      }
      setIsLoading(false);
    };

    checkAuthStatus();
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, jti, refreshToken, login, logout, isLoading, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
