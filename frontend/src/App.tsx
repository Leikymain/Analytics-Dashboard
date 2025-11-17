import { useState, useEffect } from 'react'
import type { ChangeEvent } from 'react'
import { Upload, AlertCircle, BarChart3, CheckCircle, Loader } from 'lucide-react'
import DemoTokenModal from './components/DemoTokenModal.tsx'
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

    const rawBase = (import.meta.env.VITE_API_BASE_URL as string) || (import.meta.env.DEV ? 'http://localhost:8002' : '')
    const API_URL = (rawBase.startsWith('http') ? rawBase : `https://${rawBase}`).replace(/\/+$/, '')

    useEffect(() => {
        const stored = localStorage.getItem('demo_token')
        if (stored && stored.trim()) { setDemoToken(stored); setHasDemoToken(true) }
    }, [])

    const handleTokenSubmit = (token: string) => {
        localStorage.setItem('demo_token', token)
        setDemoToken(token)
        setHasDemoToken(true)
        setError(null)
    }

    const getAuthHeader = (): HeadersInit => demoToken ? { Authorization: `Bearer ${demoToken}` } : {}

    const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
        setAnalysis(null); setPreview(null); setError(null)
        if (!hasDemoToken) { setError('Debes introducir un token de acceso primero'); return }

        const selectedFile = e.target.files?.[0]
        if (!selectedFile) return
        if (!selectedFile.name.endsWith('.csv')) { setError('Solo se aceptan archivos CSV'); return }

        setFile(selectedFile)
        const formData = new FormData()
        formData.append('file', selectedFile)
        setLoadingPreview(true)

        try {
            const res = await fetch(`${API_URL}/preview/csv`, { method: 'POST', body: formData, headers: getAuthHeader() })
            if (!res.ok) throw new Error(res.status === 401 ? 'No autorizado' : res.status === 429 ? 'Demasiadas peticiones, intenta más tarde' : 'Error al cargar preview')
            const data: DataSample = await res.json()
            setPreview(data)
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Error al cargar preview')
        } finally { setLoadingPreview(false) }
    }

    const handleAnalyze = async () => {
        if (!file || !hasDemoToken) return
        setLoadingAnalysis(true); setError(null); setAnalysis(null)

        const formData = new FormData()
        formData.append('file', file)

        try {
            const res = await fetch(`${API_URL}/analyze/csv`, { method: 'POST', body: formData, headers: getAuthHeader() })
            if (!res.ok) throw new Error(res.status === 401 ? 'No autorizado' : res.status === 429 ? 'Demasiadas peticiones, intenta más tarde' : 'Error en el análisis')
            const data: AnalysisResponse = await res.json()
            setAnalysis(data)
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Error en el análisis')
        } finally { setLoadingAnalysis(false) }
    }

    if (!hasDemoToken) {
        return (
            <div className="w-full h-screen grid place-items-center bg-gradient-to-br from-blue-50 via-white to-purple-50">
                <DemoTokenModal onSubmit={handleTokenSubmit} />
            </div>
        )
    }

    return (
        <div className="w-full min-h-screen grid place-items-center bg-gradient-to-br from-blue-50 via-white to-purple-50 p-4 md:p-8 py-8 md:py-12">
            <div className="w-full max-w-6xl grid gap-10 md:gap-12">

                {/* Header */}
                <div className="text-center w-full space-y-4">
                    <div className="flex items-center justify-center gap-3 md:gap-4">
                        <div className="bg-gradient-to-br from-blue-600 to-purple-600 p-3.5 md:p-4 rounded-2xl shadow-xl ring-4 ring-blue-500/20">
                            <BarChart3 className="w-9 h-9 md:w-11 md:h-11 text-white" />
                        </div>
                        <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold text-gray-900 tracking-tight leading-tight">
                            Analytics Dashboard AI
                        </h1>
                    </div>
                    <p className="text-gray-600 text-base md:text-lg lg:text-xl max-w-2xl mx-auto leading-relaxed font-medium">
                        Sube tu CSV y obtén insights automáticos con Inteligencia Artificial
                    </p>
                </div>

                {/* Upload / Preview */}
                <div className="w-full max-w-3xl mx-auto bg-white rounded-3xl shadow-2xl p-6 md:p-10 space-y-7">
                    <div className="border-2 border-dashed border-gray-300 rounded-2xl p-10 md:p-14 text-center hover:border-blue-400 hover:bg-blue-50/50 transition-all duration-300 cursor-pointer group">
                        <Upload className="w-16 h-16 md:w-20 md:h-20 text-gray-400 mx-auto mb-5 group-hover:text-blue-500 transition-all duration-300 transform group-hover:scale-110" />
                        <label htmlFor="file-upload" className="cursor-pointer text-blue-600 hover:text-blue-700 font-semibold text-lg md:text-xl inline-block transition-colors leading-relaxed">
                            Haz clic para subir archivo CSV
                        </label>
                        <input type="file" accept=".csv" onChange={handleFileChange} className="hidden" id="file-upload" />
                        {file && (
                            <div className="mt-5 flex items-center justify-center gap-2.5 text-green-600 animate-in fade-in slide-in-from-top-1 duration-200">
                                <CheckCircle className="w-5 h-5 md:w-6 md:h-6" />
                                <span className="font-semibold text-base md:text-lg">{file.name}</span>
                            </div>
                        )}
                    </div>

                    {loadingPreview && (
                        <div className="flex items-center justify-center gap-3 text-blue-600 py-4">
                            <Loader className="w-6 h-6 animate-spin" />
                            <span className="font-semibold text-base md:text-lg">Cargando preview...</span>
                        </div>
                    )}

                    {preview && (
                        <div className="p-6 md:p-7 bg-gradient-to-br from-gray-50 to-blue-50 rounded-2xl border border-gray-200 shadow-inner animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <h3 className="font-bold text-gray-900 mb-4 text-xl md:text-2xl tracking-tight">Vista Previa</h3>
                            <div className="space-y-3 text-gray-700 text-base md:text-lg leading-relaxed">
                                <p className="flex items-center gap-2">
                                    <strong className="text-gray-900 font-semibold min-w-[80px]">Filas:</strong>
                                    <span className="font-medium">{preview.total_rows}</span>
                                </p>
                                <p className="flex items-start gap-2">
                                    <strong className="text-gray-900 font-semibold min-w-[80px]">Columnas:</strong>
                                    <span className="font-medium">{preview.columns.join(', ')}</span>
                                </p>
                            </div>
                        </div>
                    )}

                    {file && (
                        <button
                            onClick={handleAnalyze}
                            disabled={loadingAnalysis}
                            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-5 md:py-6 rounded-xl font-semibold text-lg md:text-xl hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-xl hover:shadow-2xl transform hover:-translate-y-1 disabled:transform-none active:scale-[0.98] focus:outline-none focus:ring-4 focus:ring-blue-500/30"
                        >
                            {loadingAnalysis ? (
                                <span className="flex items-center justify-center gap-3">
                                    <Loader className="w-6 h-6 animate-spin" />
                                    <span>Analizando con IA...</span>
                                </span>
                            ) : 'Analizar Datos'}
                        </button>
                    )}
                </div>

                {/* Error */}
                {error && (
                    <div className="w-full max-w-3xl mx-auto bg-red-50 border-l-4 border-red-500 p-6 md:p-7 rounded-r-xl shadow-lg animate-in fade-in slide-in-from-left-2 duration-300">
                        <div className="flex items-start gap-4">
                            <AlertCircle className="w-6 h-6 md:w-7 md:h-7 text-red-500 flex-shrink-0 mt-0.5" />
                            <p className="text-red-700 font-semibold text-base md:text-lg leading-relaxed">{error}</p>
                        </div>
                    </div>
                )}

                {/* Analysis */}
                {analysis && (
                    <div className="w-full max-w-3xl mx-auto space-y-8 bg-white p-8 md:p-10 rounded-3xl shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="border-b border-gray-200 pb-6">
                            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight">Resumen del Análisis</h2>
                        </div>
                        <div className="bg-gradient-to-br from-blue-50 to-purple-50 p-6 md:p-7 rounded-2xl border border-gray-200 shadow-inner">
                            <p className="text-gray-700 leading-relaxed text-base md:text-lg font-medium">{analysis.summary}</p>
                        </div>

                        <div className="border-t border-gray-200 pt-6 space-y-4">
                            <h3 className="text-xl md:text-2xl font-bold text-gray-900 flex items-center gap-3 tracking-tight">
                                <div className="bg-blue-100 p-2 rounded-xl">
                                    <BarChart3 className="w-6 h-6 text-blue-600" />
                                </div>
                                <span>Insights</span>
                            </h3>
                            <ul className="space-y-3 pl-2">
                                {analysis.insights.map((i, idx) => (
                                    <li key={idx} className="text-gray-700 flex items-start gap-3 text-base md:text-lg leading-relaxed">
                                        <span className="text-blue-600 mt-2 text-xl font-bold">•</span>
                                        <span className="font-medium flex-1">{i}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div className="border-t border-gray-200 pt-6 space-y-4">
                            <h3 className="text-xl md:text-2xl font-bold text-gray-900 flex items-center gap-3 tracking-tight">
                                <div className="bg-green-100 p-2 rounded-xl">
                                    <CheckCircle className="w-6 h-6 text-green-600" />
                                </div>
                                <span>Recomendaciones</span>
                            </h3>
                            <ul className="space-y-3 pl-2">
                                {analysis.recommendations.map((r, idx) => (
                                    <li key={idx} className="text-gray-700 flex items-start gap-3 text-base md:text-lg leading-relaxed">
                                        <span className="text-green-600 mt-2 text-xl font-bold">•</span>
                                        <span className="font-medium flex-1">{r}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                )}

                {/* Footer */}
                <div className="text-center text-gray-500 text-sm md:text-base space-y-1.5 pt-4">
                    <p className="font-semibold">Desarrollado por Jorge Lago Campos</p>
                    <p className="font-medium">Powered by Claude AI</p>
                </div>
            </div>
        </div>
    )
}
