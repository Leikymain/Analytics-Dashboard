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
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4 md:p-8">
            <div className="w-full max-w-6xl mx-auto">
                {/* Header */}
                <div className="text-center mb-10 md:mb-12">
                    <div className="flex items-center justify-center gap-3 mb-4">
                        <div className="bg-gradient-to-br from-blue-600 to-purple-600 p-3 rounded-2xl shadow-lg">
                            <BarChart3 className="w-8 h-8 md:w-10 md:h-10 text-white" />
                        </div>
                        <h1 className="text-3xl md:text-4xl font-bold text-gray-800">Analytics Dashboard AI</h1>
                    </div>
                    <p className="text-gray-600 text-base md:text-lg max-w-2xl mx-auto">
                        Sube tu CSV y obtén insights automáticos con Inteligencia Artificial
                    </p>
                </div>

                {/* Upload */}
                <div className="bg-white rounded-3xl shadow-2xl p-6 md:p-8 mb-6 md:mb-8">
                    <div className="border-2 border-dashed border-gray-300 rounded-2xl p-8 md:p-12 text-center hover:border-blue-400 hover:bg-blue-50/50 transition-all duration-300">
                        <Upload className="w-14 h-14 md:w-16 md:h-16 text-gray-400 mx-auto mb-4" />
                        <label htmlFor="file-upload" className="cursor-pointer text-blue-600 hover:text-blue-700 font-semibold text-base md:text-lg inline-block">
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
                        <div className="mt-6 flex items-center justify-center text-blue-600">
                            <Loader className="w-5 h-5 animate-spin mr-2" />
                            <span className="font-medium">Cargando preview...</span>
                        </div>
                    )}

                    {preview && (
                        <div className="mt-6 p-5 bg-gradient-to-br from-gray-50 to-blue-50 rounded-xl border border-gray-200">
                            <h3 className="font-bold text-gray-800 mb-3 text-lg">Vista Previa</h3>
                            <div className="space-y-2 text-gray-700">
                                <p><strong className="text-gray-800">Filas:</strong> {preview.total_rows}</p>
                                <p><strong className="text-gray-800">Columnas:</strong> {preview.columns.join(', ')}</p>
                            </div>
                        </div>
                    )}

                    {file && (
                        <button
                            onClick={handleAnalyze}
                            disabled={loadingAnalysis}
                            className="mt-6 w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-4 rounded-xl font-semibold text-lg hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:transform-none"
                        >
                            {loadingAnalysis ? (
                                <span className="flex items-center justify-center gap-2">
                                    <Loader className="w-5 h-5 animate-spin" />
                                    Analizando con IA...
                                </span>
                            ) : (
                                'Analizar Datos'
                            )}
                        </button>
                    )}
                </div>

                {/* Error */}
                {error && (
                    <div className="bg-red-50 border-l-4 border-red-500 p-5 mb-6 md:mb-8 rounded-r-xl shadow-md">
                        <div className="flex items-start gap-3">
                            <AlertCircle className="w-6 h-6 text-red-500 flex-shrink-0 mt-0.5" />
                            <p className="text-red-700 font-medium">{error}</p>
                        </div>
                    </div>
                )}

                {/* Analysis */}
                {analysis && (
                    <div className="space-y-6 bg-white p-6 md:p-8 rounded-3xl shadow-2xl">
                        <div className="border-b border-gray-200 pb-4">
                            <h2 className="text-2xl font-bold text-gray-800">Resumen del Análisis</h2>
                        </div>
                        <div className="bg-gradient-to-br from-blue-50 to-purple-50 p-5 rounded-xl border border-gray-200">
                            <p className="text-gray-700 leading-relaxed">{analysis.summary}</p>
                        </div>

                        <div className="border-t border-gray-200 pt-4">
                            <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                                <BarChart3 className="w-5 h-5 text-blue-600" />
                                Insights
                            </h3>
                            <ul className="space-y-2 pl-4">
                                {analysis.insights.map((i, idx) => (
                                    <li key={idx} className="text-gray-700 flex items-start gap-2">
                                        <span className="text-blue-600 mt-1.5">•</span>
                                        <span>{i}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div className="border-t border-gray-200 pt-4">
                            <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                                <CheckCircle className="w-5 h-5 text-green-600" />
                                Recomendaciones
                            </h3>
                            <ul className="space-y-2 pl-4">
                                {analysis.recommendations.map((r, idx) => (
                                    <li key={idx} className="text-gray-700 flex items-start gap-2">
                                        <span className="text-green-600 mt-1.5">•</span>
                                        <span>{r}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                )}

                {/* Footer */}
                <div className="mt-10 md:mt-12 text-center text-gray-500 text-sm space-y-1">
                    <p className="font-medium">Desarrollado por Jorge Lago Campos</p>
                    <p>Powered by Claude AI</p>
                </div>
            </div>
        </div>
    )
}
