import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_URL; // ex: http://localhost:5000

const api = axios.create({
  baseURL: API_BASE_URL,
});

// Interceptor: adiciona token automaticamente se existir no localStorage
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;