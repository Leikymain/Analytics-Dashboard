import { useState, useEffect } from 'react'
import type { ChangeEvent } from 'react'
import {
  Upload, FileText, TrendingUp, AlertCircle,
  BarChart3, CheckCircle
} from 'lucide-react'
import './App.css'

import DemoTokenModal from "./components/DemoTokenModal"
import { getDemoToken } from "./services/demoToken"

type AnalysisResponse = {
  summary: string
  insights: string[]
  recommendations: string[]
  key_metrics: Record<string, number | string>
  data_quality: {
    completitud?: string
    issues?: string[]
    calidad_general?: string
  }
  visualizations_suggested: Array<{ type: string; columns: string[]; title: string }>
  tokens_used: number
  timestamp: string
}

type DataSample = {
  columns: string[]
  sample_rows: Array<Record<string, unknown>>
  total_rows: number
  data_types: Record<string, string>
}

export default function AnalyticsDashboard() {
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [analysis, setAnalysis] = useState<AnalysisResponse | null>(null)
  const [preview, setPreview] = useState<DataSample | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [token, setToken] = useState<string | null>(getDemoToken())
  const [showTokenModal, setShowTokenModal] = useState<boolean>(!getDemoToken())

  // ========================
  //  BASE URL normalizada
  // ========================
  const rawBase =
    (import.meta.env.VITE_API_BASE_URL as string) ||
    (import.meta.env.DEV ? 'http://localhost:8002' : '')

  const API_URL = (rawBase.startsWith("http") ? rawBase : `https://${rawBase}`).replace(/\/+$/, "")

  // ========================
  // Manejo del Token
  // ========================
  const handleTokenSubmit = (t: string) => {
    localStorage.setItem("demo_token", t)
    setToken(t)
    setShowTokenModal(false)
  }

  useEffect(() => {
    if (!token) {
      setShowTokenModal(true)
    }
  }, [token])

  // ========================
  //      SUBIR ARCHIVO
  // ========================
  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]

    if (!selectedFile) return
    if (!selectedFile.name.endsWith(".csv")) {
      setError("Solo se aceptan archivos CSV")
      return
    }

    setFile(selectedFile)
    setError(null)
    setAnalysis(null)

    const formData = new FormData()
    formData.append("file", selectedFile)

    try {
      const response = await fetch(`${API_URL}/preview/csv`, {
        method: "POST",
        body: formData,
        headers: token ? { Authorization: `Bearer ${token}` } : undefined
      })

      if (!response.ok) {
        let msg =
          response.status === 401 ? "Token inválido o expirado" :
          response.status === 429 ? "Demasiadas peticiones, intenta más tarde" :
          "Error al cargar preview"

        throw new Error(msg)
      }

      const data: DataSample = await response.json()
      setPreview(data)

    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error al cargar preview"
      setError(msg)
    }
  }

  // ========================
  //      ANALIZAR CSV
  // ========================
  const handleAnalyze = async () => {
    if (!file) return

    setLoading(true)
    setError(null)

    const formData = new FormData()
    formData.append("file", file)

    try {
      const response = await fetch(`${API_URL}/analyze/csv`, {
        method: "POST",
        body: formData,
        headers: token ? { Authorization: `Bearer ${token}` } : undefined
      })

      if (!response.ok) {
        let msg =
          response.status === 401 ? "Token inválido o expirado" :
          response.status === 429 ? "Demasiadas peticiones, intenta más tarde" :
          "Error procesando el análisis"
        throw new Error(msg)
      }

      const data: AnalysisResponse = await response.json()
      setAnalysis(data)

    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error en el análisis"
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-8">

      {/* Modal de Token */}
      {showTokenModal && (
        <DemoTokenModal onSubmit={handleTokenSubmit} />
      )}

      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <BarChart3 className="w-12 h-12 text-blue-600" />
            <h1 className="text-4xl font-bold text-gray-800">
              Analytics Dashboard AI
            </h1>
          </div>
          <p className="text-gray-600 text-lg">
            Sube tu CSV y obtén insights automáticos con Inteligencia Artificial
          </p>
        </div>

        {/* UPLOAD */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
          <div className="border-3 border-dashed border-gray-300 rounded-xl p-12 text-center hover:border-blue-400 transition-colors">
            <Upload className="w-16 h-16 text-gray-400 mx-auto mb-4" />

            <label htmlFor="file-upload" className="cursor-pointer text-blue-600 hover:text-blue-700 font-semibold text-lg">
              Haz clic para subir archivo CSV
            </label>

            <input type="file" accept=".csv" onChange={handleFileChange} className="hidden" id="file-upload" />

            {file && (
              <div className="mt-4 flex items-center justify-center gap-2 text-green-600">
                <CheckCircle className="w-5 h-5" />
                <span className="font-medium">{file.name}</span>
              </div>
            )}
          </div>

          {/* Preview */}
          {preview && (
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="font-semibold text-gray-700 mb-2">Vista Previa</h3>
              <div className="text-sm text-gray-600">
                <p><strong>Filas:</strong> {preview.total_rows}</p>
                <p><strong>Columnas:</strong> {preview.columns.join(", ")}</p>
              </div>
            </div>
          )}

          {file && (
            <button
              onClick={handleAnalyze}
              disabled={loading}
              className="mt-6 w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-4 rounded-xl font-semibold text-lg hover:from-blue-700 hover:to-purple-700 disabled:opacity-50"
            >
              {loading ? "Analizando..." : "Analizar Datos"}
            </button>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-8 rounded-r-lg">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-6 h-6 text-red-500" />
              <p className="text-red-700">{error}</p>
            </div>
          </div>
        )}

        {/* Resultados */}
        {analysis && (
          <div className="space-y-6">

            {/* Summary */}
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-2xl shadow-xl p-8">
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-3">
                <FileText className="w-7 h-7" /> Resumen Ejecutivo
              </h2>
              <p className="text-lg leading-relaxed">{analysis.summary}</p>

              <div className="mt-4 text-sm opacity-90">
                <span>Tokens usados: {analysis.tokens_used}</span>
              </div>
            </div>

            {/* Metrics */}
            {Object.keys(analysis.key_metrics || {}).length > 0 && (
              <div className="bg-white rounded-2xl shadow-xl p-8">
                <h3 className="text-2xl font-bold text-gray-800 mb-6">
                  Métricas Clave
                </h3>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {Object.entries(analysis.key_metrics).map(([key, value]) => (
                    <div key={key} className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-6 text-center">
                      <div className="text-3xl font-bold text-blue-600 mb-2">
                        {typeof value === "number" ? value.toFixed(2) : value}
                      </div>
                      <div className="text-sm text-gray-600 capitalize">
                        {key.replace(/_/g, " ")}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Insights */}
            <div className="bg-white rounded-2xl shadow-xl p-8">
              <h3 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-3">
                <TrendingUp className="w-7 h-7 text-green-600" />
                Insights Principales
              </h3>

              <ul className="space-y-4">
                {analysis.insights.map((insight, idx) => (
                  <li key={idx} className="flex items-start gap-3 p-4 bg-green-50 rounded-lg">
                    <div className="bg-green-500 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold">
                      {idx + 1}
                    </div>
                    <p className="text-gray-700">{insight}</p>
                  </li>
                ))}
              </ul>
            </div>

            {/* Recommendations */}
            {analysis.recommendations.length > 0 && (
              <div className="bg-white rounded-2xl shadow-xl p-8">
                <h3 className="text-2xl font-bold text-gray-800 mb-6">
                  Recomendaciones
                </h3>
                <ul className="space-y-3">
                  {analysis.recommendations.map((rec, idx) => (
                    <li key={idx} className="flex items-start gap-3 p-4 bg-yellow-50 rounded-lg border-l-4 border-yellow-400">
                      <span className="text-yellow-600 font-bold">→</span>
                      <p className="text-gray-700">{rec}</p>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Data Quality */}
            <div className="bg-white rounded-2xl shadow-xl p-8">
              <h3 className="text-2xl font-bold text-gray-800 mb-6">
                Calidad de Datos
              </h3>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <span className="font-semibold text-gray-700">Calidad General:</span>
                  <span className="px-4 py-2 rounded-full font-semibold bg-blue-100 text-blue-700">
                    {analysis.data_quality.calidad_general?.toUpperCase()}
                  </span>
                </div>

                {analysis.data_quality.issues && analysis.data_quality.issues.length > 0 && (
                  <div className="p-4 bg-orange-50 rounded-lg">
                    <p className="font-semibold text-orange-800 mb-2">Issues detectados:</p>
                    <ul className="list-disc list-inside text-orange-700 space-y-1">
                      {analysis.data_quality.issues.map((issue, idx) => (
                        <li key={idx}>{issue}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>

            {/* Visualizations */}
            {analysis.visualizations_suggested.length > 0 && (
              <div className="bg-white rounded-2xl shadow-xl p-8">
                <h3 className="text-2xl font-bold text-gray-800 mb-6">
                  Visualizaciones Sugeridas
                </h3>

                <div className="grid md:grid-cols-2 gap-4">
                  {analysis.visualizations_suggested.map((viz, idx) => (
                    <div key={idx} className="p-6 border-2 border-gray-200 rounded-xl hover:border-blue-400 transition-colors">
                      <div className="flex items-center gap-3 mb-3">
                        <BarChart3 className="w-6 h-6 text-blue-600" />
                        <h4 className="font-semibold text-gray-800">{viz.title}</h4>
                      </div>
                      <p className="text-sm text-gray-600">Tipo: {viz.type}</p>
                      <p className="text-sm text-gray-600">
                        Columnas: {viz.columns.join(", ")}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="mt-12 text-center text-gray-500 text-sm">
          <p>Desarrollado por Jorge Lago Campos</p>
          <p className="mt-2">Powered by Claude AI</p>
        </div>
      </div>
    </div>
  )
}
