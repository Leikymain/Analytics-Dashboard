import { useState, useEffect } from 'react'
import type { ChangeEvent } from 'react'
import { Upload, AlertCircle, BarChart3, CheckCircle, Loader } from 'lucide-react'
import DemoTokenModal from './components/DemoTokenModal'
import type { AnalysisResponse, DataSample } from './types'

export default function AnalyticsDashboard() {
    const [file, setFile] = useState<File | null>(null)
    const [loadingPreview, setLoadingPreview] = useState(false)
    const [loadingAnalysis, setLoadingAnalysis] = useState(false)
    const [analysis, setAnalysis] = useState<AnalysisResponse | null>(null)
    const [preview, setPreview] = useState<DataSample | null>(null)
    const [error, setError] = useState<string | null>(null)

    const [hasDemoToken, setHasDemoToken] = useState<boolean>(false)
    const [demoToken, setDemoToken] = useState<string>('')

    // Configurar URL base de API
    const rawBase = (import.meta.env.VITE_API_BASE_URL as string) || (import.meta.env.DEV ? 'http://localhost:8002' : '')
    const API_URL = (rawBase.startsWith('http') ? rawBase : `https://${rawBase}`).replace(/\/+$/, '')

    // Cargar token de localStorage
    useEffect(() => {
        const stored = localStorage.getItem('demo_token')
        if (stored && stored.trim()) {
            setDemoToken(stored)
            setHasDemoToken(true)
        }
    }, [])

    const handleTokenSubmit = (token: string) => {
        localStorage.setItem('demo_token', token)
        setDemoToken(token)
        setHasDemoToken(true)
        setError(null)
    }

    // Devuelve headers correctos para fetch
    const getAuthHeader = (): HeadersInit => demoToken ? { Authorization: `Bearer ${demoToken}` } : {}

    // Manejo de cambio de archivo
    const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
        setAnalysis(null)
        setPreview(null)
        setError(null)

        if (!hasDemoToken) {
            setError('Debes introducir un token de acceso primero')
            return
        }

        const selectedFile = e.target.files?.[0]
        if (!selectedFile) return
        if (!selectedFile.name.endsWith('.csv')) {
            setError('Solo se aceptan archivos CSV')
            return
        }

        setFile(selectedFile)

        // Preview CSV
        const formData = new FormData()
        formData.append('file', selectedFile)
        setLoadingPreview(true)

        try {
            const res = await fetch(`${API_URL}/preview/csv`, {
                method: 'POST',
                body: formData,
                headers: getAuthHeader()
            })

            if (!res.ok) {
                throw new Error(res.status === 401 ? 'No autorizado' : res.status === 429 ? 'Demasiadas peticiones, intenta más tarde' : 'Error al cargar preview')
            }

            const data: DataSample = await res.json()
            setPreview(data)
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Error al cargar preview'
            setError(msg)
        } finally {
            setLoadingPreview(false)
        }
    }

    const handleAnalyze = async () => {
        if (!file) return
        if (!hasDemoToken) {
            setError('Debes introducir un token de acceso primero')
            return
        }

        setLoadingAnalysis(true)
        setError(null)
        setAnalysis(null)

        const formData = new FormData()
        formData.append('file', file)

        try {
            const res = await fetch(`${API_URL}/analyze/csv`, {
                method: 'POST',
                body: formData,
                headers: getAuthHeader()
            })

            if (!res.ok) {
                throw new Error(res.status === 401 ? 'No autorizado' : res.status === 429 ? 'Demasiadas peticiones, intenta más tarde' : 'Error en el análisis')
            }

            const data: AnalysisResponse = await res.json()
            setAnalysis(data)
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Error en el análisis'
            setError(msg)
        } finally {
            setLoadingAnalysis(false)
        }
    }

    // Modal para token si no existe
    if (!hasDemoToken) return <DemoTokenModal onSubmit={handleTokenSubmit} />

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

                {/* Upload */}
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

                    {loadingPreview && (
                        <div className="mt-4 flex items-center justify-center text-blue-600">
                            <Loader className="w-5 h-5 animate-spin mr-2" />
                            Cargando preview...
                        </div>
                    )}

                    {preview && (
                        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                            <h3 className="font-semibold text-gray-700 mb-2">Vista Previa</h3>
                            <p><strong>Filas:</strong> {preview.total_rows}</p>
                            <p><strong>Columnas:</strong> {preview.columns.join(', ')}</p>
                        </div>
                    )}

                    {file && (
                        <button
                            onClick={handleAnalyze}
                            disabled={loadingAnalysis}
                            className="mt-6 w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-4 rounded-xl font-semibold text-lg hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                            {loadingAnalysis ? 'Analizando con IA...' : 'Analizar Datos'}
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

                {/* Analysis */}
                {analysis && (
                    <div className="space-y-6 bg-white p-6 rounded-xl shadow-lg">
                        <h2 className="text-xl font-bold text-gray-800 mb-4">Resumen</h2>
                        <p className="text-gray-700">{analysis.summary}</p>

                        <h3 className="mt-4 font-semibold text-gray-800">Insights</h3>
                        <ul className="list-disc list-inside text-gray-700">
                            {analysis.insights.map((i, idx) => <li key={idx}>{i}</li>)}
                        </ul>

                        <h3 className="mt-4 font-semibold text-gray-800">Recomendaciones</h3>
                        <ul className="list-disc list-inside text-gray-700">
                            {analysis.recommendations.map((r, idx) => <li key={idx}>{r}</li>)}
                        </ul>
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
