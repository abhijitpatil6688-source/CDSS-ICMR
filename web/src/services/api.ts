import axios from 'axios'
import type { RadiologyRequest, RadiologyResponse } from '../types/radiology'

const api = axios.create({
  // In dev: Vite proxies /api/v1 → localhost:8000
  // In production: set VITE_API_BASE_URL=https://your-app.onrender.com/api/v1
  baseURL: import.meta.env.VITE_API_BASE_URL ?? '/api/v1',
  headers: { 'Content-Type': 'application/json' },
})

export const radiologyApi = {
  recommend: (request: RadiologyRequest): Promise<RadiologyResponse> =>
    api.post<RadiologyResponse>('/radiology/recommend', request).then(r => r.data),

  getSystems: (): Promise<{ systems: { value: string; label: string }[] }> =>
    api.get('/radiology/systems').then(r => r.data),

  getSymptoms: (): Promise<{ symptoms: string[] }> =>
    api.get('/radiology/symptoms').then(r => r.data),

  getConditions: (): Promise<{ conditions: string[] }> =>
    api.get('/radiology/conditions').then(r => r.data),
}
