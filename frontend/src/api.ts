import axios from "axios";
import { getDemoToken } from "./services/demoToken.ts";

const rawBase =
  (import.meta.env.VITE_API_BASE_URL as string) ||
  "http://localhost:8002";

const API_BASE_URL = (rawBase.startsWith("http") ? rawBase : `https://${rawBase}`)
  .replace(/\/+$/, "");

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
});

// Interceptor: añadir token si existe
apiClient.interceptors.request.use((config) => {
  const token = getDemoToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export async function getHealth() {
  const { data } = await apiClient.get("/health");
  return data as { status: string; timestamp: string };
}
