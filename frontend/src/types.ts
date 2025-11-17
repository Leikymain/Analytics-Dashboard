// Tipos para Analytics Dashboard

export type VisualizationSuggestion = {
    type: string
    columns: string[]
    title: string
  }
  
  export type AnalysisResponse = {
    summary: string
    insights: string[]
    recommendations: string[]
    key_metrics: Record<string, number | string>
    data_quality: {
      completitud?: string
      issues?: string[]
      calidad_general?: 'buena' | 'media' | 'baja' | string
    }
    visualizations_suggested: VisualizationSuggestion[]
    tokens_used: number
    timestamp: string
  }
  
  export type DataSample = {
    columns: string[]
    sample_rows: Array<Record<string, unknown>>
    total_rows: number
    data_types: Record<string, string>
  }
  