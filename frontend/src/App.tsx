import { useState } from 'react'
import type { ChangeEvent } from 'react'
import { Upload, AlertCircle, CheckCircle, Loader, FileText, Sparkles, BarChart3 } from 'lucide-react'
import DemoTokenModal from './components/DemoTokenModal.tsx'
import type { AnalysisResponse, DataSample } from './types'

export default function AnalyticsDashboard() {
    const [file, setFile] = useState<File | null>(null)
    const [loadingPreview, setLoadingPreview] = useState(false)
    const [loadingAnalysis, setLoadingAnalysis] = useState(false)
    const [analysis, setAnalysis] = useState<AnalysisResponse | null>(null)
    const [preview, setPreview] = useState<DataSample | null>(null)
    const [error, setError] = useState<string | null>(null)

    // Initialize token state from localStorage to prevent modal flash
    const [hasDemoToken, setHasDemoToken] = useState<boolean>(() => {
        const stored = localStorage.getItem('demo_token')
        return !!(stored && stored.trim())
    })
    const [demoToken, setDemoToken] = useState<string>(() => {
        const stored = localStorage.getItem('demo_token')
        return stored && stored.trim() ? stored : ''
    })

    const rawBase = (import.meta.env.VITE_API_BASE_URL as string) || (import.meta.env.DEV ? 'http://localhost:8002' : '')
    const API_URL = (rawBase.startsWith('http') ? rawBase : `https://${rawBase}`).replace(/\/+$/, '')

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

    const handleDrop = (files: FileList) => {
        if (files.length > 0 && files[0].name.endsWith('.csv')) {
            const input = document.createElement('input')
            input.type = 'file'
            input.accept = '.csv'
            const dataTransfer = new DataTransfer()
            dataTransfer.items.add(files[0])
            input.files = dataTransfer.files
            const event = { target: input } as unknown as ChangeEvent<HTMLInputElement>
            handleFileChange(event)
        }
    }

    if (!hasDemoToken) {
        return (
            <div className="w-full h-screen bg-linear-to-br from-gray-50 via-blue-50/30 to-purple-50/30">
                <DemoTokenModal onSubmit={handleTokenSubmit} />
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-white flex flex-col items-center py-8 md:py-12 px-4 md:px-8" style={{ color: '#1a1a1a' }}>
            {/* Header Centrado - Más Ancho */}
            <header className="w-full max-w-[1400px] mb-16 text-center px-4 md:px-8">
                <div className="flex items-center justify-center gap-4 mb-6">
                    <BarChart3 className="w-10 h-10 md:w-12 md:h-12" style={{ color: '#667eea' }} />
                    <h1 
                        className="font-bold tracking-tight"
                        style={{ 
                            fontSize: 'clamp(32px, 4vw, 36px)',
                            color: '#1a1a1a'
                        }}
                    >
                        Analytics Dashboard AI
                    </h1>
                </div>
                <div className="w-full max-w-[200px] mx-auto h-px" style={{ backgroundColor: '#e0e0e0' }}></div>
            </header>

            {/* Main Content - Más Ancho */}
            <main className="w-full max-w-[1400px] flex flex-col items-center space-y-8 px-4 md:px-8">
                {/* Sección de Carga - Más Ancha */}
                <div 
                    className="w-full bg-white rounded-2xl p-8 md:p-10 transition-all duration-250 ease-out"
                    style={{ boxShadow: '0 6px 20px rgba(0,0,0,0.08)' }}
                >
                    <div className="text-center space-y-3 mb-10">
                        <h2 className="text-2xl md:text-3xl font-bold" style={{ color: '#1a1a1a' }}>
                            Carga tu archivo CSV
                        </h2>
                        <p className="text-base md:text-lg" style={{ color: '#555' }}>
                            Sube tus datos y obtén insights automáticos
                        </p>
                    </div>

                    {/* Área de Drag & Drop - Más Grande */}
                    <div 
                        className="border-2 border-dashed rounded-2xl text-center cursor-pointer transition-all duration-250 ease-out group flex flex-col items-center justify-center"
                        style={{
                            borderRadius: '16px',
                            backgroundColor: '#f8f9fa',
                            borderColor: '#e0e0e0',
                            minHeight: '180px',
                            padding: '48px 32px'
                        }}
                        onDragOver={(e) => {
                            e.preventDefault()
                            e.currentTarget.style.borderColor = '#667eea'
                            e.currentTarget.style.backgroundColor = '#f0f4ff'
                        }}
                        onDragLeave={(e) => {
                            e.currentTarget.style.borderColor = '#e0e0e0'
                            e.currentTarget.style.backgroundColor = '#f8f9fa'
                        }}
                        onDrop={(e) => {
                            e.preventDefault()
                            e.currentTarget.style.borderColor = '#e0e0e0'
                            e.currentTarget.style.backgroundColor = '#f8f9fa'
                            handleDrop(e.dataTransfer.files)
                        }}
                    >
                        <Upload className="w-20 h-20 md:w-24 md:h-24 mx-auto mb-6 transition-all duration-250 ease-out" style={{ color: '#999' }} />
                        <label htmlFor="file-upload" className="cursor-pointer block">
                            <p className="text-lg md:text-xl font-semibold transition-all duration-250 ease-out" style={{ color: '#1a1a1a' }}>
                                Haz clic o arrastra tu archivo CSV aquí
                            </p>
                        </label>
                        <input 
                            type="file" 
                            accept=".csv" 
                            onChange={handleFileChange} 
                            className="hidden" 
                            id="file-upload" 
                        />
                    </div>

                    {/* Espaciador antes de vista previa */}
                    {(file || preview) && <div style={{ height: '24px' }} />}

                    {/* Archivo Cargado */}
                    {file && (
                        <div 
                            className="w-full p-5 rounded-xl transition-all duration-250 ease-out"
                            style={{ 
                                backgroundColor: '#f0f9ff',
                                boxShadow: '0 6px 20px rgba(0,0,0,0.08)'
                            }}
                        >
                            <div className="flex items-center justify-center gap-3">
                                <CheckCircle className="w-5 h-5" style={{ color: '#10b981' }} />
                                <span className="font-semibold text-base md:text-lg" style={{ color: '#1a1a1a' }}>
                                    {file.name}
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Loading Preview */}
                    {loadingPreview && (
                        <div className="flex items-center justify-center gap-3 py-6">
                            <Loader className="w-6 h-6 animate-spin" style={{ color: '#667eea' }} />
                            <span className="font-medium text-base" style={{ color: '#555' }}>
                                Cargando preview...
                            </span>
                        </div>
                    )}

                    {/* Vista Previa */}
                    {preview && (
                        <>
                            <div style={{ height: '24px' }} />
                            <div 
                                className="w-full p-6 rounded-xl transition-all duration-250 ease-out"
                                style={{ 
                                    backgroundColor: '#f8f9fa',
                                    boxShadow: '0 6px 20px rgba(0,0,0,0.08)'
                                }}
                            >
                                <div className="flex items-center gap-2 mb-4">
                                    <FileText className="w-5 h-5" style={{ color: '#667eea' }} />
                                    <h3 className="font-bold text-lg" style={{ color: '#1a1a1a' }}>Vista Previa</h3>
                                </div>
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between py-2 border-b" style={{ borderColor: '#e0e0e0' }}>
                                        <span className="font-semibold" style={{ color: '#1a1a1a' }}>Filas:</span>
                                        <span className="font-medium" style={{ color: '#555' }}>{preview.total_rows}</span>
                                    </div>
                                    <div className="flex items-start justify-between py-2">
                                        <span className="font-semibold" style={{ color: '#1a1a1a' }}>Columnas:</span>
                                        <span className="font-medium text-right max-w-xs" style={{ color: '#555' }}>
                                            {preview.columns.join(', ')}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <div style={{ height: '24px' }} />
                        </>
                    )}

                    {/* Espaciador entre vista previa y botón */}
                    {file && <div style={{ height: '28px' }} />}

                    {/* Botón Analizar - Más Ancho */}
                    {file && (
                        <div className="w-full flex justify-center">
                            <button
                                onClick={handleAnalyze}
                                disabled={loadingAnalysis}
                                className="text-white font-bold text-base transition-all duration-250 ease-out focus:outline-none focus:ring-4 focus:ring-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                                style={{
                                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                    height: '48px',
                                    borderRadius: '12px',
                                    width: '80%',
                                    maxWidth: '700px'
                                }}
                                onMouseEnter={(e) => {
                                    if (!loadingAnalysis) {
                                        e.currentTarget.style.filter = 'brightness(1.1)'
                                        e.currentTarget.style.transform = 'translateY(-1px)'
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.filter = 'brightness(1)'
                                    e.currentTarget.style.transform = 'translateY(0)'
                                }}
                                onMouseDown={(e) => {
                                    if (!loadingAnalysis) {
                                        e.currentTarget.style.transform = 'scale(0.98)'
                                    }
                                }}
                                onMouseUp={(e) => {
                                    if (!loadingAnalysis) {
                                        e.currentTarget.style.transform = 'translateY(-1px)'
                                    }
                                }}
                            >
                                {loadingAnalysis ? (
                                    <span className="flex items-center justify-center gap-3">
                                        <Loader className="w-6 h-6 animate-spin" />
                                        <span>Analizando con IA...</span>
                                    </span>
                                ) : (
                                    <span className="flex items-center justify-center gap-2">
                                        <Sparkles className="w-5 h-5" />
                                        Analizar Datos
                                    </span>
                                )}
                            </button>
                            <br />
                        </div>
                    )}
                </div>

                {/* Error Alert */}
                {error && (
                    <div 
                        className="w-full p-5 rounded-xl flex items-start gap-4 transition-all duration-250 ease-out"
                        style={{ 
                            backgroundColor: '#fef2f2',
                            border: '1px solid #fecaca',
                            boxShadow: '0 6px 20px rgba(0,0,0,0.08)'
                        }}
                    >
                        <AlertCircle className="w-6 h-6 shrink-0 mt-0.5" style={{ color: '#ef4444' }} />
                        <p className="font-semibold text-base leading-relaxed" style={{ color: '#dc2626' }}>
                            {error}
                        </p>
                    </div>
                )}

                {/* Resultados del Análisis */}
                {analysis && (
                    <div 
                        className="w-full bg-white rounded-2xl p-8 md:p-10 transition-all duration-250 ease-out space-y-6"
                        style={{ boxShadow: '0 6px 20px rgba(0,0,0,0.08)' }}
                    >
                        <div className="border-b pb-4" style={{ borderColor: '#e0e0e0' }}>
                            <h2 className="text-2xl font-bold" style={{ color: '#1a1a1a' }}>
                                Resumen del Análisis
                            </h2>
                        </div>

                        <div 
                            className="p-6 rounded-xl transition-all duration-250 ease-out"
                            style={{ 
                                backgroundColor: '#f8f9fa',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
                            }}
                        >
                            <p className="leading-relaxed text-base md:text-lg font-medium" style={{ color: '#1a1a1a' }}>
                                {analysis.summary}
                            </p>
                            <br />
                        </div>

                        <div className="grid md:grid-cols-2 gap-6">
                            {/* Insights */}
                            <div className="space-y-4">
                                <h3 className="text-xl font-bold flex items-center gap-3" style={{ color: '#1a1a1a' }}>
                                    <div className="p-2 rounded-xl" style={{ backgroundColor: '#eff6ff' }}>
                                        <BarChart3 className="w-5 h-5" style={{ color: '#667eea' }} />
                                    </div>
                                    <span>Insights</span>
                                </h3>
                                <ul className="space-y-3">
                                    {analysis.insights.map((i, idx) => (
                                        <li key={idx} className="flex items-start gap-3 text-base leading-relaxed">
                                            <span className="mt-1 text-xl font-bold shrink-0" style={{ color: '#667eea' }}>•</span>
                                            <span className="font-medium" style={{ color: '#1a1a1a' }}>{i}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            {/* Recommendations */}
                            <div className="space-y-4">
                                <h3 className="text-xl font-bold flex items-center gap-3" style={{ color: '#1a1a1a' }}>
                                    <div className="p-2 rounded-xl" style={{ backgroundColor: '#f0fdf4' }}>
                                        <CheckCircle className="w-5 h-5" style={{ color: '#10b981' }} />
                                    </div>
                                    <span>Recomendaciones</span>
                                </h3>
                                <ul className="space-y-3">
                                    {analysis.recommendations.map((r, idx) => (
                                        <li key={idx} className="flex items-start gap-3 text-base leading-relaxed">
                                            <span className="mt-1 text-xl font-bold shrink-0" style={{ color: '#10b981' }}>•</span>
                                            <span className="font-medium" style={{ color: '#1a1a1a' }}>{r}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            <br />
                        </div>
                    </div>
                )}
            </main>
        </div>
    )
}
