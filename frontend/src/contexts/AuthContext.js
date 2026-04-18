import { createContext, useContext, useState, useEffect, useMemo } from "react";
import axios from "axios";

const API_URL = process.env.REACT_APP_BACKEND_URL;
const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(undefined);

  // Auth check on mount — deps intentionally empty (API_URL/axios are module-level constants)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    axios
      .get(`${API_URL}/api/auth/me`, { withCredentials: true })
      .then((res) => setUser(res.data))
      .catch(() => setUser(null));
  }, []);

  const login = async (email, password, institute_code) => {
    const res = await axios.post(
      `${API_URL}/api/auth/login`,
      { email, password, ...(institute_code ? { institute_code } : {}) },
      { withCredentials: true }
    );
    setUser(res.data);
    return res.data;
  };

  const logout = async () => {
    await axios.post(`${API_URL}/api/auth/logout`, {}, { withCredentials: true });
    setUser(null);
  };

  // Memoize context value so consumers only re-render when user changes
  const value = useMemo(
    () => ({ user, loading: user === undefined, login, logout, setUser }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
