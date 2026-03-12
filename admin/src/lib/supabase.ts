import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://gpwmhxlxizlpiecarvgn.supabase.co'
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdwd21oeGx4aXpscGllY2FydmduIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMyMDYyMTEsImV4cCI6MjA4ODc4MjIxMX0.E1Sz5SGUb5y0nNlcnP0E6bmTkgEG-4JW-DgQ_SvntXU'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

export type Worker = {
  id: string
  full_name: string
  employee_id: string
  phone_number: string
  designation: string
  is_active: boolean
  preferred_language: string
  created_at: string
}

export type Beneficiary = {
  id: string
  full_name: string
  age: number
  gender: string
  phone_number: string
  village_id: string
  is_synced: boolean
  created_at: string
}

export type HealthRecord = {
  id: string
  beneficiary_id: string
  recorded_by: string
  village_id: string
  visit_date: string
  temperature_celsius: number
  blood_pressure_systolic: number
  blood_pressure_diastolic: number
  symptoms_text: string
  symptom_tags: string[]
  vaccination_status: string
  is_pregnant: boolean
  ai_analyzed: boolean
  is_synced: boolean
  created_at: string
  beneficiaries?: Beneficiary
  healthcare_workers?: Worker
  villages?: { name: string }
  ai_analysis_results?: AIResult[]
}

export type AIResult = {
  id: string
  health_record_id: string
  risk_level: string
  risk_summary: string
  standardized_symptoms: string[]
  possible_conditions: string[]
  recommendations: string
  alerts: string[]
  analyzed_at: string
}

export type Village = {
  id: string
  name: string
  district: string
  taluka: string
}

export type SyncLog = {
  id: string
  worker_id: string
  records_synced: number
  records_failed: number
  sync_completed_at: string
  created_at: string
}
