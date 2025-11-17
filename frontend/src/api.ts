import axios from "axios";
import type { AnalysisResponse, DataSample } from "./types";
const rawBase = (import.meta.env.VITE_API_BASE_URL as string) || "http://localhost:8002";
const API_BASE_URL = (rawBase.startsWith("http") ? rawBase : `https://${rawBase}`).replace(/\/+$/, "");

const DEMO_TOKEN = localStorage.getItem("demo_token") || "";
const ENV_API_TOKEN = (import.meta.env.VITE_API_TOKEN as string) || "";

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    ...(DEMO_TOKEN ? { Authorization: `Bearer ${DEMO_TOKEN}` } : {}),
    ...(!DEMO_TOKEN && ENV_API_TOKEN ? { Authorization: `Bearer ${ENV_API_TOKEN}` } : {})
  }
});

export async function getHealth() {
  const { data } = await apiClient.get("/health");
  return data as { status: string; timestamp: string };
}

export async function previewCSV(file: File) {
  const formData = new FormData();
  formData.append("file", file);
  const { data } = await apiClient.post("/preview/csv", formData);
  return data as DataSample;
}

export async function analyzeCSV(file: File) {
  const formData = new FormData();
  formData.append("file", file);
  const { data } = await apiClient.post("/analyze/csv", formData);
  return data as AnalysisResponse;
}
