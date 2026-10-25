import { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import api from "../api"; // sua instância centralizada

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Função para buscar/atualizar os dados do usuário logado
  const refreshUser = useCallback(async () => {
    try {
      const res = await api.get("/api/auth/me");
      setUser(res.data);
      return res.data;
    } catch (error) {
      console.error("Erro ao buscar dados do usuário:", error);
      // Se a requisição falhar (ex: token expirado), limpa o estado e o token
      if (error.response?.status === 401) {
        localStorage.removeItem("token");
        setUser(null);
      }
      throw error;
    }
  }, []);

  // Persistência: ao iniciar a aplicação, verifica se há token e busca o perfil
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      // Reutiliza o refreshUser para não duplicar código
      refreshUser()
        .catch(() => {
          // O erro já é tratado dentro do refreshUser, aqui apenas evitamos crash na Promise
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [refreshUser]);

  const login = useCallback(async (email, password) => {
    const form = new FormData();
    form.append("email", email);
    form.append("password", password);
    
    const res = await api.post("/api/auth/login", form);
    const { access_token, user } = res.data;
    
    localStorage.setItem("token", access_token);
    setUser(user);
    return user;
  }, []);

  const signup = useCallback(async (username, email, password, fullName) => {
    const form = new FormData();
    form.append("username", username);
    form.append("email", email);
    form.append("password", password);
    form.append("full_name", fullName);
    
    const res = await api.post("/api/auth/signup", form);
    const { access_token, user } = res.data;
    
    localStorage.setItem("token", access_token);
    setUser(user);
    return user;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("token");
    setUser(null);
  }, []);

  // useMemo evita que os componentes filhos re-renderizem desnecessariamente
  // a menos que user ou loading sejam alterados.
  const contextValue = useMemo(() => ({
    user,
    loading,
    login,
    signup,
    logout,
    refreshUser,
    api
  }), [user, loading, login, signup, logout, refreshUser]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

// Hook customizado com verificação de segurança
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth deve ser usado dentro de um AuthProvider");
  }
  return context;
};