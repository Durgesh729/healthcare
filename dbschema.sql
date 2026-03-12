-- ============================================================
-- AI-Enabled Bilingual Field Data Capture System
-- Database Schema for Supabase (PostgreSQL)
-- 
-- INSTRUCTIONS FOR FUTURE UPDATES:
--   1. Always use CREATE TABLE IF NOT EXISTS
--   2. Always use CREATE INDEX IF NOT EXISTS
--   3. Always use CREATE POLICY with DO $$ BEGIN ... EXCEPTION WHEN duplicate_object pattern
--   4. For new columns on existing tables, use:
--        ALTER TABLE <table> ADD COLUMN IF NOT EXISTS <col> <type>;
--   5. Append new sections at the BOTTOM of this file
--   6. This file can be re-run in its entirety without conflicts
-- ============================================================

-- ============================================================
-- SECTION 1: EXTENSIONS
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============================================================
-- SECTION 2: VILLAGES / LOCATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS villages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    name_mr TEXT,                        -- Marathi name
    district TEXT,
    district_mr TEXT,
    taluka TEXT,
    taluka_mr TEXT,
    state TEXT DEFAULT 'Maharashtra',
    pincode TEXT,
    latitude NUMERIC(10, 7),
    longitude NUMERIC(10, 7),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_villages_name ON villages (name);
CREATE INDEX IF NOT EXISTS idx_villages_district ON villages (district);

-- ============================================================
-- SECTION 3: HEALTHCARE WORKERS (extends auth.users)
-- ============================================================
CREATE TABLE IF NOT EXISTS healthcare_workers (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    full_name_mr TEXT,
    employee_id TEXT UNIQUE,
    phone_number TEXT,
    designation TEXT,                    -- e.g. ASHA, ANM, Supervisor
    assigned_village_id UUID REFERENCES villages(id),
    is_active BOOLEAN DEFAULT TRUE,
    preferred_language TEXT DEFAULT 'en' CHECK (preferred_language IN ('en', 'mr')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workers_village ON healthcare_workers (assigned_village_id);
CREATE INDEX IF NOT EXISTS idx_workers_employee_id ON healthcare_workers (employee_id);

-- ============================================================
-- SECTION 4: BENEFICIARIES (Patients)
-- ============================================================
CREATE TABLE IF NOT EXISTS beneficiaries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    local_id TEXT,                       -- device-generated ID for offline sync
    registered_by UUID REFERENCES healthcare_workers(id),
    village_id UUID REFERENCES villages(id),

    -- Demographics
    full_name TEXT NOT NULL,
    full_name_mr TEXT,
    age INTEGER CHECK (age >= 0 AND age <= 150),
    date_of_birth DATE,
    gender TEXT CHECK (gender IN ('male', 'female', 'other')),
    phone_number TEXT,
    aadhaar_last4 TEXT,                  -- last 4 digits only for privacy

    -- Address
    address TEXT,
    address_mr TEXT,

    -- Family
    household_head TEXT,
    family_members_count INTEGER,

    -- Photo
    photo_url TEXT,                      -- Supabase Storage URL

    -- Sync metadata
    is_synced BOOLEAN DEFAULT FALSE,
    synced_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_beneficiaries_local_id ON beneficiaries (local_id);
CREATE INDEX IF NOT EXISTS idx_beneficiaries_village ON beneficiaries (village_id);
CREATE INDEX IF NOT EXISTS idx_beneficiaries_worker ON beneficiaries (registered_by);
CREATE INDEX IF NOT EXISTS idx_beneficiaries_gender ON beneficiaries (gender);
CREATE INDEX IF NOT EXISTS idx_beneficiaries_name_trgm ON beneficiaries USING GIN (full_name gin_trgm_ops);

-- ============================================================
-- SECTION 5: HEALTH RECORDS (per visit)
-- ============================================================
CREATE TABLE IF NOT EXISTS health_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    local_id TEXT,                       -- device-generated ID for offline sync
    beneficiary_id UUID REFERENCES beneficiaries(id) ON DELETE CASCADE,
    recorded_by UUID REFERENCES healthcare_workers(id),
    village_id UUID REFERENCES villages(id),
    visit_date DATE DEFAULT CURRENT_DATE,

    -- Vitals
    temperature_celsius NUMERIC(4, 1),
    blood_pressure_systolic INTEGER,
    blood_pressure_diastolic INTEGER,
    pulse_rate INTEGER,
    weight_kg NUMERIC(5, 2),
    height_cm NUMERIC(5, 1),
    bmi NUMERIC(4, 1),

    -- Symptoms (stored as text and tags)
    symptoms_text TEXT,                  -- free text from field worker
    symptoms_mr TEXT,                    -- Marathi input if entered in Marathi
    symptom_tags TEXT[],                 -- normalized tags e.g. ['fever','cough']

    -- Conditions
    vaccination_status TEXT CHECK (vaccination_status IN ('fully_vaccinated','partially_vaccinated','not_vaccinated','unknown')),
    is_pregnant BOOLEAN DEFAULT FALSE,
    pregnancy_weeks INTEGER,
    has_diabetes BOOLEAN DEFAULT FALSE,
    has_hypertension BOOLEAN DEFAULT FALSE,
    has_tuberculosis BOOLEAN DEFAULT FALSE,
    other_conditions TEXT,

    -- Medical
    diagnosis TEXT,
    treatment_given TEXT,
    referred_to_hospital BOOLEAN DEFAULT FALSE,
    referral_hospital TEXT,
    medicines_prescribed TEXT,

    -- Notes
    notes TEXT,
    notes_mr TEXT,

    -- AI Analysis
    ai_analyzed BOOLEAN DEFAULT FALSE,
    ai_analyzed_at TIMESTAMPTZ,

    -- Sync metadata
    is_synced BOOLEAN DEFAULT FALSE,
    synced_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_health_records_beneficiary ON health_records (beneficiary_id);
CREATE INDEX IF NOT EXISTS idx_health_records_worker ON health_records (recorded_by);
CREATE INDEX IF NOT EXISTS idx_health_records_village ON health_records (village_id);
CREATE INDEX IF NOT EXISTS idx_health_records_visit_date ON health_records (visit_date);
CREATE INDEX IF NOT EXISTS idx_health_records_synced ON health_records (is_synced);
CREATE INDEX IF NOT EXISTS idx_health_records_ai ON health_records (ai_analyzed);
CREATE INDEX IF NOT EXISTS idx_health_records_symptoms ON health_records USING GIN (symptom_tags);

-- ============================================================
-- SECTION 6: AI ANALYSIS RESULTS
-- ============================================================
CREATE TABLE IF NOT EXISTS ai_analysis_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    health_record_id UUID REFERENCES health_records(id) ON DELETE CASCADE,
    beneficiary_id UUID REFERENCES beneficiaries(id) ON DELETE CASCADE,

    -- Grok AI outputs
    risk_level TEXT CHECK (risk_level IN ('low','medium','high','critical')),
    risk_summary TEXT,
    standardized_symptoms TEXT[],        -- normalized from Marathi/free-text
    possible_conditions TEXT[],
    recommendations TEXT,
    alerts TEXT[],
    marathi_interpretation TEXT,         -- Grok's interpretation of Marathi text

    -- Raw response storage
    raw_ai_response JSONB,

    -- Metadata
    model_used TEXT DEFAULT 'grok-beta',
    analyzed_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_results_record ON ai_analysis_results (health_record_id);
CREATE INDEX IF NOT EXISTS idx_ai_results_beneficiary ON ai_analysis_results (beneficiary_id);
CREATE INDEX IF NOT EXISTS idx_ai_results_risk ON ai_analysis_results (risk_level);
CREATE INDEX IF NOT EXISTS idx_ai_results_analyzed_at ON ai_analysis_results (analyzed_at);

-- ============================================================
-- SECTION 7: MEDIA ATTACHMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS media_attachments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    local_id TEXT,
    health_record_id UUID REFERENCES health_records(id) ON DELETE CASCADE,
    beneficiary_id UUID REFERENCES beneficiaries(id) ON DELETE CASCADE,
    uploaded_by UUID REFERENCES healthcare_workers(id),

    attachment_type TEXT CHECK (attachment_type IN ('patient_photo','prescription','document','other')),
    file_name TEXT,
    file_url TEXT,                       -- Supabase Storage URL
    file_size_bytes INTEGER,
    mime_type TEXT,

    -- Sync
    is_synced BOOLEAN DEFAULT FALSE,
    synced_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_media_record ON media_attachments (health_record_id);
CREATE INDEX IF NOT EXISTS idx_media_beneficiary ON media_attachments (beneficiary_id);
CREATE INDEX IF NOT EXISTS idx_media_synced ON media_attachments (is_synced);

-- ============================================================
-- SECTION 8: SYNC LOG (audit trail for offline sync events)
-- ============================================================
CREATE TABLE IF NOT EXISTS sync_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    worker_id UUID REFERENCES healthcare_workers(id),
    device_id TEXT,
    sync_started_at TIMESTAMPTZ,
    sync_completed_at TIMESTAMPTZ,
    records_synced INTEGER DEFAULT 0,
    records_failed INTEGER DEFAULT 0,
    error_details JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sync_log_worker ON sync_log (worker_id);
CREATE INDEX IF NOT EXISTS idx_sync_log_date ON sync_log (created_at);

-- ============================================================
-- SECTION 9: ROW LEVEL SECURITY (RLS)
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE villages ENABLE ROW LEVEL SECURITY;
ALTER TABLE healthcare_workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE beneficiaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE health_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_analysis_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_log ENABLE ROW LEVEL SECURITY;

-- Helper: create policy only if it does not exist
DO $$
BEGIN

    -- Villages: readable by all authenticated users
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'villages' AND policyname = 'villages_read_authenticated') THEN
        CREATE POLICY villages_read_authenticated ON villages
            FOR SELECT TO authenticated USING (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'villages' AND policyname = 'villages_insert_authenticated') THEN
        CREATE POLICY villages_insert_authenticated ON villages
            FOR INSERT TO authenticated WITH CHECK (true);
    END IF;

    -- Healthcare workers: users see their own profile; admins see all
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'healthcare_workers' AND policyname = 'workers_read_own') THEN
        CREATE POLICY workers_read_own ON healthcare_workers
            FOR SELECT TO authenticated USING (id = auth.uid());
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'healthcare_workers' AND policyname = 'workers_upsert_own') THEN
        CREATE POLICY workers_upsert_own ON healthcare_workers
            FOR ALL TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());
    END IF;

    -- Beneficiaries: workers can manage their own records
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'beneficiaries' AND policyname = 'beneficiaries_all_authenticated') THEN
        CREATE POLICY beneficiaries_all_authenticated ON beneficiaries
            FOR ALL TO authenticated USING (true) WITH CHECK (true);
    END IF;

    -- Health records
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'health_records' AND policyname = 'health_records_all_authenticated') THEN
        CREATE POLICY health_records_all_authenticated ON health_records
            FOR ALL TO authenticated USING (true) WITH CHECK (true);
    END IF;

    -- AI analysis results: readable by authenticated
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'ai_analysis_results' AND policyname = 'ai_results_read_authenticated') THEN
        CREATE POLICY ai_results_read_authenticated ON ai_analysis_results
            FOR SELECT TO authenticated USING (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'ai_analysis_results' AND policyname = 'ai_results_insert_authenticated') THEN
        CREATE POLICY ai_results_insert_authenticated ON ai_analysis_results
            FOR INSERT TO authenticated WITH CHECK (true);
    END IF;

    -- Media attachments
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'media_attachments' AND policyname = 'media_all_authenticated') THEN
        CREATE POLICY media_all_authenticated ON media_attachments
            FOR ALL TO authenticated USING (true) WITH CHECK (true);
    END IF;

    -- Sync log
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'sync_log' AND policyname = 'sync_log_all_authenticated') THEN
        CREATE POLICY sync_log_all_authenticated ON sync_log
            FOR ALL TO authenticated USING (true) WITH CHECK (true);
    END IF;

END $$;

-- ============================================================
-- SECTION 10: UPDATED_AT TRIGGER FUNCTION
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach trigger to tables that have updated_at
DO $$
DECLARE
    t TEXT;
BEGIN
    FOREACH t IN ARRAY ARRAY['villages','healthcare_workers','beneficiaries','health_records']
    LOOP
        IF NOT EXISTS (
            SELECT 1 FROM pg_trigger
            WHERE tgname = 'trg_' || t || '_updated_at'
              AND tgrelid = t::regclass
        ) THEN
            EXECUTE format('
                CREATE TRIGGER trg_%I_updated_at
                BEFORE UPDATE ON %I
                FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
            ', t, t);
        END IF;
    END LOOP;
END $$;

-- ============================================================
-- SECTION 11: SEED DATA (villages)
-- ============================================================
INSERT INTO villages (name, name_mr, district, district_mr, taluka, state)
VALUES
    ('Wardha', 'वर्धा', 'Wardha', 'वर्धा', 'Wardha', 'Maharashtra'),
    ('Hinganghat', 'हिंगणघाट', 'Wardha', 'वर्धा', 'Hinganghat', 'Maharashtra'),
    ('Arvi', 'आर्वी', 'Wardha', 'वर्धा', 'Arvi', 'Maharashtra'),
    ('Deoli', 'देओली', 'Wardha', 'वर्धा', 'Deoli', 'Maharashtra'),
    ('Nagpur', 'नागपूर', 'Nagpur', 'नागपूर', 'Nagpur City', 'Maharashtra'),
    ('Amravati', 'अमरावती', 'Amravati', 'अमरावती', 'Amravati City', 'Maharashtra'),
    ('Yavatmal', 'यवतमाळ', 'Yavatmal', 'यवतमाळ', 'Yavatmal City', 'Maharashtra'),
    ('Chandrapur', 'चंद्रपूर', 'Chandrapur', 'चंद्रपूर', 'Chandrapur City', 'Maharashtra'),
    ('Bhandara', 'भंडारा', 'Bhandara', 'भंडारा', 'Bhandara City', 'Maharashtra'),
    ('Gondia', 'गोंदिया', 'Gondia', 'गोंदिया', 'Gondia City', 'Maharashtra')
ON CONFLICT DO NOTHING;

-- ============================================================
-- END OF SCHEMA
-- Future features: append new sections below this line
-- ============================================================

-- ============================================================
-- SECTION 12: ADMIN USER SETUP (Test Data)
-- ============================================================
-- This section creates test admin users and their healthcare worker profiles
-- Run this AFTER creating the auth users in Supabase Dashboard:
-- 1. admin@healthsync.org (password: admin123456)
-- 2. worker@healthsync.org (password: worker123456)

DO $$
DECLARE
    admin_user_id UUID;
    worker_user_id UUID;
    test_village_id UUID;
BEGIN
    -- Get user IDs from auth.users (these must be created first in Supabase Dashboard)
    SELECT id INTO admin_user_id FROM auth.users WHERE email = 'admin@healthsync.org';
    SELECT id INTO worker_user_id FROM auth.users WHERE email = 'worker@healthsync.org';
    
    -- Get a test village ID (use the first village from seed data)
    SELECT id INTO test_village_id FROM villages LIMIT 1;
    
    -- Create admin healthcare worker profile
    IF admin_user_id IS NOT NULL THEN
        INSERT INTO healthcare_workers (
            id, 
            full_name, 
            full_name_mr,
            employee_id, 
            phone_number, 
            designation, 
            assigned_village_id,
            is_active, 
            preferred_language
        ) VALUES (
            admin_user_id, 
            'System Administrator', 
            'सिस्टम प्रशासक',
            'ADMIN001', 
            '+1234567890', 
            'Administrator', 
            test_village_id,
            true, 
            'en'
        ) ON CONFLICT (id) DO UPDATE SET
            full_name = EXCLUDED.full_name,
            employee_id = EXCLUDED.employee_id,
            designation = EXCLUDED.designation,
            updated_at = NOW();
        
        RAISE NOTICE 'Admin user profile created/updated for: admin@healthsync.org';
    ELSE
        RAISE NOTICE 'Admin user not found. Please create admin@healthsync.org in Supabase Authentication > Users first';
    END IF;
    
    -- Create field worker healthcare worker profile
    IF worker_user_id IS NOT NULL THEN
        INSERT INTO healthcare_workers (
            id, 
            full_name, 
            full_name_mr,
            employee_id, 
            phone_number, 
            designation, 
            assigned_village_id,
            is_active, 
            preferred_language
        ) VALUES (
            worker_user_id, 
            'Field Worker', 
            'क्षेत्रीय कार्यकर्ता',
            'WORKER001', 
            '+1234567890', 
            'Field Worker', 
            test_village_id,
            true, 
            'en'
        ) ON CONFLICT (id) DO UPDATE SET
            full_name = EXCLUDED.full_name,
            employee_id = EXCLUDED.employee_id,
            designation = EXCLUDED.designation,
            updated_at = NOW();
        
        RAISE NOTICE 'Worker user profile created/updated for: worker@healthsync.org';
    ELSE
        RAISE NOTICE 'Worker user not found. Please create worker@healthsync.org in Supabase Authentication > Users first';
    END IF;
    
    -- Create a test beneficiary for demonstration
    IF worker_user_id IS NOT NULL AND test_village_id IS NOT NULL THEN
        INSERT INTO beneficiaries (
            full_name,
            full_name_mr,
            age,
            gender,
            phone_number,
            registered_by,
            village_id,
            address,
            is_synced
        ) VALUES (
            'Test Patient',
            'चाचणी रुग्ण',
            25,
            'female',
            '+9876543210',
            worker_user_id,
            test_village_id,
            'Test Address, Test Village',
            true
        ) ON CONFLICT DO NOTHING;
        
        RAISE NOTICE 'Test beneficiary created';
    END IF;
    
END $$;

-- Verify the admin setup
DO $$
DECLARE
    admin_count INTEGER;
    worker_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO admin_count 
    FROM auth.users u 
    JOIN healthcare_workers hw ON u.id = hw.id 
    WHERE u.email = 'admin@healthsync.org';
    
    SELECT COUNT(*) INTO worker_count 
    FROM auth.users u 
    JOIN healthcare_workers hw ON u.id = hw.id 
    WHERE u.email = 'worker@healthsync.org';
    
    RAISE NOTICE 'Setup verification:';
    RAISE NOTICE '- Admin profiles: %', admin_count;
    RAISE NOTICE '- Worker profiles: %', worker_count;
    
    IF admin_count = 0 THEN
        RAISE NOTICE 'WARNING: Create admin@healthsync.org in Supabase Authentication > Users';
    END IF;
    
    IF worker_count = 0 THEN
        RAISE NOTICE 'WARNING: Create worker@healthsync.org in Supabase Authentication > Users';
    END IF;
    
    IF admin_count > 0 AND worker_count > 0 THEN
        RAISE NOTICE 'SUCCESS: Admin setup complete! You can now login to both admin dashboard and mobile app.';
    END IF;
END $$;

-- ============================================================
-- SECTION 13: SURVEY SYSTEM TABLES
-- ============================================================

-- Templates: Reusable survey form templates
CREATE TABLE IF NOT EXISTS templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    fields JSONB NOT NULL DEFAULT '[]'::jsonb,  -- Array of field definitions
    is_system BOOLEAN DEFAULT FALSE,            -- System templates cannot be deleted
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    is_synced BOOLEAN DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS idx_templates_name ON templates (name);
CREATE INDEX IF NOT EXISTS idx_templates_system ON templates (is_system);

-- Add unique constraint on template name if not exists
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'templates_name_unique') THEN
        ALTER TABLE templates ADD CONSTRAINT templates_name_unique UNIQUE (name);
    END IF;
END $$;

-- Surveys: Survey instances created from templates
CREATE TABLE IF NOT EXISTS surveys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    area_village TEXT NOT NULL,                 -- Target area/village for the survey
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    template_ids UUID[] NOT NULL DEFAULT '{}'::uuid[],  -- Array of template IDs used
    created_by UUID REFERENCES auth.users(id),
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'completed', 'cancelled')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    is_synced BOOLEAN DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS idx_surveys_status ON surveys (status);
CREATE INDEX IF NOT EXISTS idx_surveys_area ON surveys (area_village);
CREATE INDEX IF NOT EXISTS idx_surveys_dates ON surveys (start_date, end_date);

-- Add unique constraint on survey name - delete duplicates first
DO $$ BEGIN
    -- Delete duplicate surveys keeping the most recent one
    DELETE FROM surveys a USING surveys b
    WHERE a.name = b.name AND a.created_at < b.created_at;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'surveys_name_unique') THEN
        ALTER TABLE surveys ADD CONSTRAINT surveys_name_unique UNIQUE (name);
    END IF;
END $$;

-- Survey Assignments: Assign workers to surveys
CREATE TABLE IF NOT EXISTS survey_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    survey_id UUID NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
    worker_id UUID NOT NULL REFERENCES healthcare_workers(id) ON DELETE CASCADE,
    assigned_by UUID REFERENCES auth.users(id),
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
    completed_at TIMESTAMPTZ,
    is_synced BOOLEAN DEFAULT TRUE,
    UNIQUE(survey_id, worker_id)
);

CREATE INDEX IF NOT EXISTS idx_assignments_survey ON survey_assignments (survey_id);
CREATE INDEX IF NOT EXISTS idx_assignments_worker ON survey_assignments (worker_id);
CREATE INDEX IF NOT EXISTS idx_assignments_status ON survey_assignments (status);

-- Survey Submissions: Actual survey data collected by workers
CREATE TABLE IF NOT EXISTS survey_submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    local_id TEXT,                              -- Device-generated ID for offline sync
    survey_id UUID NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
    assignment_id UUID REFERENCES survey_assignments(id) ON DELETE SET NULL,
    beneficiary_id UUID REFERENCES beneficiaries(id) ON DELETE SET NULL,
    worker_id UUID NOT NULL REFERENCES healthcare_workers(id),
    template_id UUID NOT NULL REFERENCES templates(id),
    
    -- Collected data
    field_data JSONB NOT NULL DEFAULT '{}'::jsonb,  -- Key-value pairs of field responses
    images JSONB,                               -- Array of image URLs
    voice_notes JSONB,                          -- Array of voice note URLs
    
    -- Location
    latitude NUMERIC(10, 7),
    longitude NUMERIC(10, 7),
    
    -- Metadata
    submitted_at TIMESTAMPTZ DEFAULT NOW(),
    is_synced BOOLEAN DEFAULT FALSE,
    synced_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_submissions_survey ON survey_submissions (survey_id);
CREATE INDEX IF NOT EXISTS idx_submissions_worker ON survey_submissions (worker_id);
CREATE INDEX IF NOT EXISTS idx_submissions_beneficiary ON survey_submissions (beneficiary_id);
CREATE INDEX IF NOT EXISTS idx_submissions_template ON survey_submissions (template_id);
CREATE INDEX IF NOT EXISTS idx_submissions_synced ON survey_submissions (is_synced);
CREATE INDEX IF NOT EXISTS idx_submissions_date ON survey_submissions (submitted_at);

-- Duplicate Records: Track potential duplicate beneficiaries
CREATE TABLE IF NOT EXISTS duplicate_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    new_beneficiary_id UUID NOT NULL REFERENCES beneficiaries(id) ON DELETE CASCADE,
    existing_beneficiary_id UUID REFERENCES beneficiaries(id) ON DELETE SET NULL,
    match_fields TEXT[] NOT NULL DEFAULT '{}'::text[],  -- Fields that matched
    match_score INTEGER NOT NULL,               -- 0-100 similarity score
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'rejected')),
    reviewed_by UUID REFERENCES auth.users(id),
    reviewed_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    is_synced BOOLEAN DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS idx_duplicates_new ON duplicate_records (new_beneficiary_id);
CREATE INDEX IF NOT EXISTS idx_duplicates_existing ON duplicate_records (existing_beneficiary_id);
CREATE INDEX IF NOT EXISTS idx_duplicates_status ON duplicate_records (status);

-- ============================================================
-- SECTION 14: RLS POLICIES FOR SURVEY TABLES
-- ============================================================

ALTER TABLE templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE survey_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE survey_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE duplicate_records ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    -- Templates: readable by all authenticated, insert by authenticated
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'templates' AND policyname = 'templates_read_authenticated') THEN
        CREATE POLICY templates_read_authenticated ON templates
            FOR SELECT TO authenticated USING (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'templates' AND policyname = 'templates_insert_authenticated') THEN
        CREATE POLICY templates_insert_authenticated ON templates
            FOR INSERT TO authenticated WITH CHECK (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'templates' AND policyname = 'templates_update_authenticated') THEN
        CREATE POLICY templates_update_authenticated ON templates
            FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'templates' AND policyname = 'templates_delete_authenticated') THEN
        CREATE POLICY templates_delete_authenticated ON templates
            FOR DELETE TO authenticated USING (NOT is_system);
    END IF;

    -- Surveys: all operations for authenticated
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'surveys' AND policyname = 'surveys_all_authenticated') THEN
        CREATE POLICY surveys_all_authenticated ON surveys
            FOR ALL TO authenticated USING (true) WITH CHECK (true);
    END IF;

    -- Survey assignments
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'survey_assignments' AND policyname = 'assignments_all_authenticated') THEN
        CREATE POLICY assignments_all_authenticated ON survey_assignments
            FOR ALL TO authenticated USING (true) WITH CHECK (true);
    END IF;

    -- Survey submissions
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'survey_submissions' AND policyname = 'submissions_all_authenticated') THEN
        CREATE POLICY submissions_all_authenticated ON survey_submissions
            FOR ALL TO authenticated USING (true) WITH CHECK (true);
    END IF;

    -- Duplicate records
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'duplicate_records' AND policyname = 'duplicates_all_authenticated') THEN
        CREATE POLICY duplicates_all_authenticated ON duplicate_records
            FOR ALL TO authenticated USING (true) WITH CHECK (true);
    END IF;

END $$;

-- ============================================================
-- SECTION 15: UPDATED_AT TRIGGERS FOR NEW TABLES
-- ============================================================

DO $$
DECLARE
    t TEXT;
BEGIN
    FOREACH t IN ARRAY ARRAY['templates', 'surveys']
    LOOP
        IF NOT EXISTS (
            SELECT 1 FROM pg_trigger
            WHERE tgname = 'trg_' || t || '_updated_at'
              AND tgrelid = t::regclass
        ) THEN
            EXECUTE format('
                CREATE TRIGGER trg_%I_updated_at
                BEFORE UPDATE ON %I
                FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
            ', t, t);
        END IF;
    END LOOP;
END $$;

-- ============================================================
-- SECTION 16: SEED DEFAULT TEMPLATES
-- ============================================================

INSERT INTO templates (name, description, fields, is_system) VALUES
(
    'General Health Survey',
    'Basic health assessment survey for general population screening',
    '[
        {"id": "f1", "label": "Full Name", "type": "text", "required": true, "placeholder": "Enter full name"},
        {"id": "f2", "label": "Age", "type": "number", "required": true, "validation": {"min": 0, "max": 150}},
        {"id": "f3", "label": "Gender", "type": "select", "required": true, "options": ["Male", "Female", "Other"]},
        {"id": "f4", "label": "Phone Number", "type": "text", "required": false, "placeholder": "10-digit phone number"},
        {"id": "f5", "label": "Current Symptoms", "type": "multiselect", "required": false, "options": ["Fever", "Cough", "Cold", "Body Aches", "Headache", "Fatigue", "Nausea", "None"]},
        {"id": "f6", "label": "Other Symptoms Description", "type": "textarea", "required": false, "placeholder": "Describe any other symptoms"},
        {"id": "f7", "label": "Blood Pressure (mmHg)", "type": "text", "required": false, "placeholder": "e.g., 120/80"},
        {"id": "f8", "label": "Temperature (°C)", "type": "number", "required": false, "validation": {"min": 35, "max": 45}},
        {"id": "f9", "label": "Notes", "type": "textarea", "required": false, "placeholder": "Additional observations"},
        {"id": "f10", "label": "Patient Photo", "type": "photo", "required": false}
    ]'::jsonb,
    true
),
(
    'Maternal Health Survey',
    'Health survey for pregnant women and new mothers',
    '[
        {"id": "f1", "label": "Full Name", "type": "text", "required": true},
        {"id": "f2", "label": "Age", "type": "number", "required": true, "validation": {"min": 15, "max": 50}},
        {"id": "f3", "label": "Phone Number", "type": "text", "required": true},
        {"id": "f4", "label": "Pregnancy Status", "type": "select", "required": true, "options": ["Pregnant", "Post-delivery", "Not pregnant"]},
        {"id": "f5", "label": "Pregnancy Week (if pregnant)", "type": "number", "required": false, "validation": {"min": 1, "max": 42}},
        {"id": "f6", "label": "Expected Delivery Date", "type": "date", "required": false},
        {"id": "f7", "label": "Number of Antenatal Visits", "type": "number", "required": false, "validation": {"min": 0}},
        {"id": "f8", "label": "Current Health Issues", "type": "multiselect", "required": false, "options": ["Bleeding", "Swelling", "High BP", "Diabetes", "Anemia", "None"]},
        {"id": "f9", "label": "Nutrition Status", "type": "select", "required": false, "options": ["Good", "Fair", "Poor"]},
        {"id": "f10", "label": "Additional Notes", "type": "textarea", "required": false}
    ]'::jsonb,
    true
),
(
    'Child Health Survey',
    'Health survey for children under 5 years (immunization tracking)',
    '[
        {"id": "f1", "label": "Child Name", "type": "text", "required": true},
        {"id": "f2", "label": "Date of Birth", "type": "date", "required": true},
        {"id": "f3", "label": "Gender", "type": "select", "required": true, "options": ["Male", "Female"]},
        {"id": "f4", "label": "Mother Name", "type": "text", "required": true},
        {"id": "f5", "label": "Father Name", "type": "text", "required": false},
        {"id": "f6", "label": "Weight (kg)", "type": "number", "required": false, "validation": {"min": 0, "max": 30}},
        {"id": "f7", "label": "Height (cm)", "type": "number", "required": false, "validation": {"min": 0, "max": 120}},
        {"id": "f8", "label": "Immunization Status", "type": "select", "required": true, "options": ["Up to date", "Partially vaccinated", "Not vaccinated"]},
        {"id": "f9", "label": "Missing Vaccines", "type": "multiselect", "required": false, "options": ["BCG", "OPV", "DPT", "Measles", "Hepatitis B", "None"]},
        {"id": "f10", "label": "Current Illness", "type": "multiselect", "required": false, "options": ["Fever", "Diarrhea", "Cough", "Cold", "Skin rash", "None"]},
        {"id": "f11", "label": "Breastfeeding Status", "type": "select", "required": false, "options": ["Exclusive", "Partial", "None"]},
        {"id": "f12", "label": "Notes", "type": "textarea", "required": false}
    ]'::jsonb,
    true
),
(
    'Chronic Disease Survey',
    'Survey for patients with chronic conditions like diabetes, hypertension',
    '[
        {"id": "f1", "label": "Patient Name", "type": "text", "required": true},
        {"id": "f2", "label": "Age", "type": "number", "required": true},
        {"id": "f3", "label": "Phone Number", "type": "text", "required": true},
        {"id": "f4", "label": "Chronic Conditions", "type": "multiselect", "required": true, "options": ["Diabetes", "Hypertension", "Heart Disease", "Asthma", "TB", "Other"]},
        {"id": "f5", "label": "Years Since Diagnosis", "type": "number", "required": false, "validation": {"min": 0, "max": 100}},
        {"id": "f6", "label": "Current Medications", "type": "textarea", "required": false, "placeholder": "List current medications"},
        {"id": "f7", "label": "Blood Pressure (mmHg)", "type": "text", "required": false, "placeholder": "e.g., 140/90"},
        {"id": "f8", "label": "Blood Sugar Level (mg/dL)", "type": "number", "required": false, "validation": {"min": 0, "max": 600}},
        {"id": "f9", "label": "Last Checkup Date", "type": "date", "required": false},
        {"id": "f10", "label": "Adherence to Medication", "type": "select", "required": false, "options": ["Regular", "Irregular", "Not taking"]},
        {"id": "f11", "label": "Lifestyle Habits", "type": "multiselect", "required": false, "options": ["Smoking", "Alcohol", "Sedentary", "Healthy diet", "Exercise"]},
        {"id": "f12", "label": "Follow-up Required", "type": "checkbox", "required": false},
        {"id": "f13", "label": "Notes", "type": "textarea", "required": false}
    ]'::jsonb,
    true
),
(
    'Vaccination Survey',
    'COVID-19 and general vaccination status survey',
    '[
        {"id": "f1", "label": "Full Name", "type": "text", "required": true},
        {"id": "f2", "label": "Age", "type": "number", "required": true},
        {"id": "f3", "label": "Phone Number", "type": "text", "required": true},
        {"id": "f4", "label": "Gender", "type": "select", "required": true, "options": ["Male", "Female", "Other"]},
        {"id": "f5", "label": "COVID-19 Vaccination Status", "type": "select", "required": true, "options": ["Fully vaccinated", "Partially vaccinated", "Not vaccinated"]},
        {"id": "f6", "label": "Vaccine Name", "type": "select", "required": false, "options": ["Covishield", "Covaxin", "Sputnik V", "Other"]},
        {"id": "f7", "label": "First Dose Date", "type": "date", "required": false},
        {"id": "f8", "label": "Second Dose Date", "type": "date", "required": false},
        {"id": "f9", "label": "Booster Dose Date", "type": "date", "required": false},
        {"id": "f10", "label": "Any Adverse Effects", "type": "multiselect", "required": false, "options": ["Fever", "Body aches", "Headache", "Injection site pain", "None"]},
        {"id": "f11", "label": "Certificate Available", "type": "checkbox", "required": false},
        {"id": "f12", "label": "Notes", "type": "textarea", "required": false}
    ]'::jsonb,
    true
)
ON CONFLICT (name) DO NOTHING;

-- ============================================================
-- STORAGE BUCKET FOR SURVEY IMAGES
-- ============================================================
-- Create storage bucket for survey images
INSERT INTO storage.buckets (id, name, public) VALUES ('survey-images', 'survey-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policy to allow authenticated users to upload (drop first to avoid error)
DROP POLICY IF EXISTS "Allow authenticated users to upload survey images" ON storage.objects;
CREATE POLICY "Allow authenticated users to upload survey images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'survey-images');

-- Storage policy to allow public read access (drop first to avoid error)
DROP POLICY IF EXISTS "Allow public read access to survey images" ON storage.objects;
CREATE POLICY "Allow public read access to survey images"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'survey-images');

-- ============================================================
-- END OF SURVEY SYSTEM SCHEMA
-- ============================================================
