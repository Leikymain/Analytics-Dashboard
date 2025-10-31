import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8002";

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
});

export async function getHealth() {
  const { data } = await apiClient.get("/health");
  return data as { status: string; timestamp: string };
}


