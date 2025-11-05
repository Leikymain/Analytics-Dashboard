import { useState, useEffect } from 'react'
import type { ChangeEvent } from 'react'
import { Upload, FileText, TrendingUp, AlertCircle, BarChart3, CheckCircle } from 'lucide-react'
import './App.css'

type AnalysisResponse = {
  summary: string
  insights: string[]
  recommendations: string[]
  key_metrics: Record<string, number | string>
  data_quality: {
    completitud?: string
    issues?: string[]
    calidad_general?: 'buena' | 'media' | 'baja' | string
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
  const [token, setToken] = useState<string>(() => (localStorage.getItem('API_TOKEN') || '').trim())

  // ✅ Normalización segura del backend URL
  const rawApiUrl = (import.meta.env.VITE_API_BASE_URL as string)?.trim() || 'http://localhost:8002'
  const API_URL = rawApiUrl.endsWith('/') ? rawApiUrl.slice(0, -1) : rawApiUrl

  useEffect(() => {
    localStorage.setItem('API_TOKEN', token)
  }, [token])

  // ✅ Subida de archivo + vista previa
  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return
    if (!selectedFile.name.endsWith('.csv')) {
      setError('Solo se aceptan archivos CSV')
      return
    }

    setFile(selectedFile)
    setError(null)
    setAnalysis(null)

    const formData = new FormData()
    formData.append('file', selectedFile)

    try {
      const response = await fetch(`${API_URL}/preview/csv`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token.trim()}` } : undefined,
        body: formData
      })

      if (!response.ok) throw new Error('Error al cargar preview')

      const data: DataSample = await response.json()
      setPreview(data)
    } catch (err) {
      console.error('Error preview:', err)
      setError('No se pudo obtener la vista previa del CSV.')
    }
  }

  // ✅ Análisis del CSV
  const handleAnalyze = async () => {
    if (!file) return
    setLoading(true)
    setError(null)

    const formData = new FormData()
    formData.append('file', file)

    try {
      const response = await fetch(`${API_URL}/analyze/csv`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token.trim()}` } : undefined,
        body: formData
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.detail || 'Error en el análisis')
      }

      const data: AnalysisResponse = await response.json()
      setAnalysis(data)
    } catch (err: unknown) {
      console.error('Error analyze:', err)
      const msg = err instanceof Error ? err.message : 'Error en el análisis'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <BarChart3 className="w-12 h-12 text-blue-600" />
            <h1 className="text-4xl font-bold text-gray-800">Analytics Dashboard AI</h1>
          </div>
          <p className="text-gray-600 text-lg">Sube tu CSV y obtén insights automáticos con Inteligencia Artificial</p>
        </div>

        {/* Token input */}
        <div className="bg-white rounded-2xl shadow p-4 mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">Token de API (Bearer)</label>
          <input
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="Pega tu API_TOKEN aquí"
            className="w-full border rounded-md px-3 py-2"
          />
          <p className="text-xs text-gray-500 mt-2">Se guarda localmente en tu navegador para las peticiones protegidas.</p>
        </div>

        {/* Upload Section */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
          <div className="border-3 border-dashed border-gray-300 rounded-xl p-12 text-center hover:border-blue-400 transition-colors">
            <Upload className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <input type="file" accept=".csv" onChange={handleFileChange} className="hidden" id="file-upload" />
            <label htmlFor="file-upload" className="cursor-pointer text-blue-600 hover:text-blue-700 font-semibold text-lg">
              Haz clic para subir archivo CSV
            </label>
            {file && (
              <div className="mt-4 flex items-center justify-center gap-2 text-green-600">
                <CheckCircle className="w-5 h-5" />
                <span className="font-medium">{file.name}</span>
              </div>
            )}
          </div>

          {preview && (
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="font-semibold text-gray-700 mb-2">Vista Previa</h3>
              <div className="text-sm text-gray-600 space-y-1">
                <p><strong>Filas:</strong> {preview.total_rows}</p>
                <p><strong>Columnas:</strong> {preview.columns.join(', ')}</p>
              </div>
            </div>
          )}

          {file && (
            <button
              onClick={handleAnalyze}
              disabled={loading}
              className="mt-6 w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-4 rounded-xl font-semibold text-lg hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {loading ? 'Analizando con IA...' : 'Analizar Datos'}
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

        {/* Analysis Results */}
        {analysis && (
          <div className="space-y-6">
            {/* Summary */}
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-2xl shadow-xl p-8">
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-3">
                <FileText className="w-7 h-7" />
                Resumen Ejecutivo
              </h2>
              <p className="text-lg leading-relaxed">{analysis.summary}</p>
              <div className="mt-4 text-sm opacity-90">
                <span>Tokens usados: {analysis.tokens_used}</span>
              </div>
            </div>

            {/* Key Metrics */}
            {Object.keys(analysis.key_metrics || {}).length > 0 && (
              <div className="bg-white rounded-2xl shadow-xl p-8">
                <h3 className="text-2xl font-bold text-gray-800 mb-6">Métricas Clave</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {Object.entries(analysis.key_metrics).map(([key, value]) => (
                    <div key={key} className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-6 text-center">
                      <div className="text-3xl font-bold text-blue-600 mb-2">
                        {typeof value === 'number' ? value.toFixed(2) : value}
                      </div>
                      <div className="text-sm text-gray-600 capitalize">{key.replace(/_/g, ' ')}</div>
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
                    <div className="bg-green-500 text-white rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0 font-bold">
                      {idx + 1}
                    </div>
                    <p className="text-gray-700 leading-relaxed">{insight}</p>
                  </li>
                ))}
              </ul>
            </div>

            {/* Recommendations */}
            {analysis.recommendations.length > 0 && (
              <div className="bg-white rounded-2xl shadow-xl p-8">
                <h3 className="text-2xl font-bold text-gray-800 mb-6">Recomendaciones</h3>
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
              <h3 className="text-2xl font-bold text-gray-800 mb-6">Calidad de Datos</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <span className="font-semibold text-gray-700">Calidad General:</span>
                  <span
                    className={`px-4 py-2 rounded-full font-semibold ${
                      analysis.data_quality.calidad_general === 'buena'
                        ? 'bg-green-100 text-green-700'
                        : analysis.data_quality.calidad_general === 'media'
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-red-100 text-red-700'
                    }`}
                  >
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

            {/* Visualizations Suggested */}
            {analysis.visualizations_suggested.length > 0 && (
              <div className="bg-white rounded-2xl shadow-xl p-8">
                <h3 className="text-2xl font-bold text-gray-800 mb-6">Visualizaciones Sugeridas</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  {analysis.visualizations_suggested.map((viz, idx) => (
                    <div key={idx} className="p-6 border-2 border-gray-200 rounded-xl hover:border-blue-400 transition-colors">
                      <div className="flex items-center gap-3 mb-3">
                        <BarChart3 className="w-6 h-6 text-blue-600" />
                        <h4 className="font-semibold text-gray-800">{viz.title}</h4>
                      </div>
                      <p className="text-sm text-gray-600">Tipo: {viz.type}</p>
                      <p className="text-sm text-gray-600">Columnas: {viz.columns.join(', ')}</p>
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
