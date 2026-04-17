// client.ts — Client Axios centralise pour appeler l'API FastAPI
import axios from 'axios'

// URL de base de l'API backend
const BASE_URL = 'http://localhost:8000'

// Instance Axios avec configuration par defaut
export const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Types TypeScript pour les reponses de l'API

export interface PrixHistorique {
  date: string
  valeur: number
}

export interface HistoriqueResponse {
  data: PrixHistorique[]
  count: number
}

export interface PredictionResponse {
  prediction: number
  borne_inf: number
  borne_sup: number
  date_prediction: string
  prix_actuel: number
  variation_pct: number
  derniere_mise_a_jour: string
}

export interface MetriqueModele {
  modele: string
  RMSE: number
  MAE: number
  R2: number
  meilleur: boolean
}

export interface MetriquesResponse {
  data: MetriqueModele[]
  meilleur_modele: string
}

export interface FeatureItem {
  feature: string
  importance: number
  importance_norm: number
}

export interface FeaturesResponse {
  data: FeatureItem[]
}

export interface SparklineResponse {
  data: { date: string; prix: number }[]
}

export interface PrixActuelResponse {
  prix: number
  variation_pct: number
  date: string
  source: string
}

// Fonctions d'appel aux endpoints

/** Recupere les 100 derniers prix historiques */
export async function fetchHistorique(): Promise<HistoriqueResponse> {
  const response = await apiClient.get<HistoriqueResponse>('/api/historique')
  return response.data
}

/** Recupere la prediction a 4 semaines */
export async function fetchPrediction(): Promise<PredictionResponse> {
  const response = await apiClient.get<PredictionResponse>('/api/prediction')
  return response.data
}

/** Recupere les metriques de performance des modeles */
export async function fetchMetriques(): Promise<MetriquesResponse> {
  const response = await apiClient.get<MetriquesResponse>('/api/metriques')
  return response.data
}

/** Recupere les 5 features les plus importantes */
export async function fetchFeatures(): Promise<FeaturesResponse> {
  const response = await apiClient.get<FeaturesResponse>('/api/features')
  return response.data
}

/** Recupere les 10 derniers prix pour le sparkline */
export async function fetchSparkline(): Promise<SparklineResponse> {
  const response = await apiClient.get<SparklineResponse>('/api/sparkline')
  return response.data
}

/** Recupere le prix actuel du Brent en temps reel */
export async function fetchPrixActuel(): Promise<PrixActuelResponse> {
  const response = await apiClient.get<PrixActuelResponse>('/api/prix_actuel')
  return response.data
}
