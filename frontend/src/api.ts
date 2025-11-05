import axios from "axios";

const rawBase = (import.meta.env.VITE_API_BASE_URL as string) || "http://localhost:8002"
const API_BASE_URL = (rawBase.startsWith("http") ? rawBase : `https://${rawBase}`).replace(/\/+$/, "")

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
})

export async function getHealth() {
  const { data } = await apiClient.get("/health");
  return data as { status: string; timestamp: string };
}


