import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { authApi } from "../lib/api.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(undefined); // undefined = loading, null = not auth'd
  const [loading, setLoading] = useState(true);

  const fetchMe = useCallback(async () => {
    try {
      const data = await authApi.me();
      setUser(data.user);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchMe(); }, [fetchMe]);

  const signin = async (email, password) => {
    const data = await authApi.signin({ email, password });
    setUser(data.user);
    return data.user;
  };

  const signup = async (email, password, displayName) => {
    const data = await authApi.signup({ email, password, displayName });
    setUser(data.user);
    return data.user;
  };

  const signout = async () => {
    await authApi.signout();
    setUser(null);
  };

  const updateUser = (updates) => setUser(u => u ? { ...u, ...updates } : u);

  return (
    <AuthContext.Provider value={{ user, loading, signin, signup, signout, updateUser, refetchUser: fetchMe }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
