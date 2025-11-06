import axios from "axios";

const rawBase = (import.meta.env.VITE_API_BASE_URL as string) || "http://localhost:8002"
const API_BASE_URL = (rawBase.startsWith("http") ? rawBase : `https://${rawBase}`).replace(/\/+$/, "")

const API_TOKEN = (import.meta.env.VITE_API_TOKEN as string) || ""

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: API_TOKEN ? { Authorization: `Bearer ${API_TOKEN}` } : undefined,
})

export async function getHealth() {
  const { data } = await apiClient.get("/health");
  return data as { status: string; timestamp: string };
}


