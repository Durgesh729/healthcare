import * as SQLite from 'expo-sqlite';

export interface Village {
  id: string;
  name: string;
  district: string;
  state: string;
  population?: number;
  created_at: string;
}

export interface Worker {
  id: string;
  name: string;
  phone: string;
  village_id: string;
  role: 'field_worker' | 'supervisor';
  created_at: string;
}

export interface Beneficiary {
  id: string;
  name: string;
  age: number;
  gender: 'male' | 'female' | 'other';
  phone?: string;
  village_id: string;
  worker_id: string;
  created_at: string;
  synced: boolean;
}

export interface HealthRecord {
  id: string;
  beneficiary_id: string;
  worker_id: string;
  symptoms: string[];
  vital_signs?: any;
  notes?: string;
  media_urls?: string[];
  created_at: string;
  synced: boolean;
}

export interface PatientImage {
  id: string;
  beneficiary_id: string;
  local_uri: string;
  description?: string;
  image_type: 'disease' | 'infection' | 'wound' | 'other';
  created_at: string;
  synced: boolean;
  remote_url?: string;
}

// Template field types
export type FieldType = 'text' | 'number' | 'dropdown' | 'date' | 'image' | 'voice' | 'select' | 'multiselect' | 'textarea' | 'checkbox' | 'photo';

export interface FieldValidation {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  minValue?: number;
  maxValue?: number;
  pattern?: string; // regex pattern
  numericOnly?: boolean;
  options?: string[]; // for dropdown fields
}

export interface TemplateField {
  id: string;
  type: FieldType;
  label: string;
  placeholder?: string;
  validation: FieldValidation;
  order: number;
  // Database format compatibility
  required?: boolean;
  options?: string[];
  min?: number;
  max?: number;
}

export interface Template {
  id: string;
  name: string;
  description?: string;
  fields: TemplateField[];
  is_system: boolean; // true for predefined templates
  created_by?: string; // worker_id for custom templates
  created_at: string;
  updated_at: string;
  synced: boolean;
}

export interface Survey {
  id: string;
  name: string;
  description?: string;
  area_village: string;
  start_date: string;
  end_date: string;
  template_ids: string[]; // array of template IDs
  created_by: string; // admin/worker ID
  status: 'draft' | 'active' | 'completed' | 'cancelled';
  created_at: string;
  updated_at: string;
  synced: boolean;
}

export interface SurveyAssignment {
  id: string;
  survey_id: string;
  worker_id: string;
  assigned_by: string;
  assigned_at: string;
  status: 'pending' | 'in_progress' | 'completed';
  synced: boolean;
}

export interface SurveySubmission {
  id: string;
  survey_id: string;
  assignment_id?: string | null; // Optional - null for open surveys available to all workers
  beneficiary_id: string;
  worker_id: string;
  template_id: string;
  field_data: Record<string, any>; // field_id -> value mapping
  images?: string[]; // local URIs
  voice_notes?: string[]; // local URIs
  submitted_at: string;
  synced: boolean;
}

export interface DuplicateRecord {
  id: string;
  new_beneficiary_id: string;
  existing_beneficiary_id?: string;
  match_fields: string[]; // which fields matched
  match_score: number; // 0-100 similarity score
  status: 'pending' | 'approved' | 'merged' | 'rejected' | 'verification_requested';
  reviewed_by?: string;
  reviewed_at?: string;
  notes?: string;
  created_at: string;
  synced: boolean;
}

let db: SQLite.SQLiteDatabase | null = null;
let isInitialized = false;

export const initializeDatabase = async (): Promise<void> => {
  if (isInitialized && db) {
    return;
  }
  
  try {
    console.log('📦 Opening database...');
    
    // Use the synchronous API wrapped in a promise
    db = SQLite.openDatabaseSync('health_monitor.db');
    
    if (!db) {
      throw new Error('Failed to open database - db is null');
    }
    
    console.log('📦 Database opened, creating tables...');
    
    // Create tables using sync API
    db.execSync(`PRAGMA journal_mode = WAL;`);
    
    db.execSync(`
      CREATE TABLE IF NOT EXISTS villages (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        district TEXT NOT NULL,
        state TEXT NOT NULL,
        population INTEGER,
        created_at TEXT NOT NULL,
        synced INTEGER DEFAULT 0
      );
    `);
    
    db.execSync(`
      CREATE TABLE IF NOT EXISTS workers (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        phone TEXT NOT NULL,
        village_id TEXT NOT NULL,
        role TEXT NOT NULL,
        created_at TEXT NOT NULL,
        synced INTEGER DEFAULT 0,
        FOREIGN KEY (village_id) REFERENCES villages (id)
      );
    `);
    
    db.execSync(`
      CREATE TABLE IF NOT EXISTS beneficiaries (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        age INTEGER NOT NULL,
        gender TEXT NOT NULL,
        phone TEXT,
        village_id TEXT NOT NULL,
        worker_id TEXT NOT NULL,
        created_at TEXT NOT NULL,
        synced INTEGER DEFAULT 0,
        FOREIGN KEY (village_id) REFERENCES villages (id),
        FOREIGN KEY (worker_id) REFERENCES workers (id)
      );
    `);
    
    db.execSync(`
      CREATE TABLE IF NOT EXISTS health_records (
        id TEXT PRIMARY KEY,
        beneficiary_id TEXT NOT NULL,
        worker_id TEXT NOT NULL,
        symptoms TEXT NOT NULL,
        vital_signs TEXT,
        notes TEXT,
        media_urls TEXT,
        created_at TEXT NOT NULL,
        synced INTEGER DEFAULT 0,
        FOREIGN KEY (beneficiary_id) REFERENCES beneficiaries (id),
        FOREIGN KEY (worker_id) REFERENCES workers (id)
      );
    `);
    
    db.execSync(`
      CREATE TABLE IF NOT EXISTS sync_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        table_name TEXT NOT NULL,
        record_id TEXT NOT NULL,
        action TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        success INTEGER DEFAULT 0
      );
    `);
    
    db.execSync(`
      CREATE TABLE IF NOT EXISTS patient_images (
        id TEXT PRIMARY KEY,
        beneficiary_id TEXT NOT NULL,
        local_uri TEXT NOT NULL,
        description TEXT,
        image_type TEXT NOT NULL,
        created_at TEXT NOT NULL,
        synced INTEGER DEFAULT 0,
        remote_url TEXT,
        FOREIGN KEY (beneficiary_id) REFERENCES beneficiaries (id)
      );
    `);
    
    // Templates table
    db.execSync(`
      CREATE TABLE IF NOT EXISTS templates (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        fields TEXT NOT NULL,
        is_system INTEGER DEFAULT 0,
        created_by TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        synced INTEGER DEFAULT 0
      );
    `);
    
    // Surveys table
    db.execSync(`
      CREATE TABLE IF NOT EXISTS surveys (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        area_village TEXT NOT NULL,
        start_date TEXT NOT NULL,
        end_date TEXT NOT NULL,
        template_ids TEXT NOT NULL,
        created_by TEXT NOT NULL,
        status TEXT DEFAULT 'draft',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        synced INTEGER DEFAULT 0
      );
    `);
    
    // Survey assignments table
    db.execSync(`
      CREATE TABLE IF NOT EXISTS survey_assignments (
        id TEXT PRIMARY KEY,
        survey_id TEXT NOT NULL,
        worker_id TEXT NOT NULL,
        assigned_by TEXT NOT NULL,
        assigned_at TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        synced INTEGER DEFAULT 0,
        FOREIGN KEY (survey_id) REFERENCES surveys (id),
        FOREIGN KEY (worker_id) REFERENCES workers (id)
      );
    `);
    
    // Survey submissions table
    db.execSync(`
      CREATE TABLE IF NOT EXISTS survey_submissions (
        id TEXT PRIMARY KEY,
        survey_id TEXT NOT NULL,
        assignment_id TEXT,
        beneficiary_id TEXT NOT NULL,
        worker_id TEXT NOT NULL,
        template_id TEXT NOT NULL,
        field_data TEXT NOT NULL,
        images TEXT,
        voice_notes TEXT,
        submitted_at TEXT NOT NULL,
        synced INTEGER DEFAULT 0,
        FOREIGN KEY (survey_id) REFERENCES surveys (id),
        FOREIGN KEY (assignment_id) REFERENCES survey_assignments (id),
        FOREIGN KEY (beneficiary_id) REFERENCES beneficiaries (id),
        FOREIGN KEY (template_id) REFERENCES templates (id)
      );
    `);
    
    // Migration: Fix assignment_id NOT NULL constraint in existing table
    db.execSync(`
      CREATE TABLE IF NOT EXISTS survey_submissions_new (
        id TEXT PRIMARY KEY,
        survey_id TEXT NOT NULL,
        assignment_id TEXT,
        beneficiary_id TEXT NOT NULL,
        worker_id TEXT NOT NULL,
        template_id TEXT NOT NULL,
        field_data TEXT NOT NULL,
        images TEXT,
        voice_notes TEXT,
        submitted_at TEXT NOT NULL,
        synced INTEGER DEFAULT 0,
        FOREIGN KEY (survey_id) REFERENCES surveys (id),
        FOREIGN KEY (assignment_id) REFERENCES survey_assignments (id),
        FOREIGN KEY (beneficiary_id) REFERENCES beneficiaries (id),
        FOREIGN KEY (template_id) REFERENCES templates (id)
      );
    `);
    db.execSync(`
      INSERT OR IGNORE INTO survey_submissions_new 
      SELECT id, survey_id, assignment_id, beneficiary_id, worker_id, template_id, field_data, images, voice_notes, submitted_at, synced 
      FROM survey_submissions
    `);
    db.execSync(`DROP TABLE IF EXISTS survey_submissions`);
    db.execSync(`ALTER TABLE survey_submissions_new RENAME TO survey_submissions`);
    
    // Duplicate records table
    db.execSync(`
      CREATE TABLE IF NOT EXISTS duplicate_records (
        id TEXT PRIMARY KEY,
        new_beneficiary_id TEXT NOT NULL,
        existing_beneficiary_id TEXT,
        match_fields TEXT NOT NULL,
        match_score INTEGER NOT NULL,
        status TEXT DEFAULT 'pending',
        reviewed_by TEXT,
        reviewed_at TEXT,
        notes TEXT,
        created_at TEXT NOT NULL,
        synced INTEGER DEFAULT 0,
        FOREIGN KEY (new_beneficiary_id) REFERENCES beneficiaries (id),
        FOREIGN KEY (existing_beneficiary_id) REFERENCES beneficiaries (id)
      );
    `);
    
    isInitialized = true;
    console.log('✅ Database tables created successfully');
  } catch (error) {
    console.error('❌ Database initialization error:', error);
    db = null;
    isInitialized = false;
    throw error;
  }
};

const getDb = (): SQLite.SQLiteDatabase => {
  if (!db || !isInitialized) {
    throw new Error('Database not initialized. Call initializeDatabase() first.');
  }
  return db;
};

export const insertBeneficiary = async (beneficiary: Omit<Beneficiary, 'synced'>) => {
  const database = getDb();
  database.runSync(
    'INSERT INTO beneficiaries (id, name, age, gender, phone, village_id, worker_id, created_at, synced) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)',
    [beneficiary.id, beneficiary.name, beneficiary.age, beneficiary.gender, beneficiary.phone || null, beneficiary.village_id, beneficiary.worker_id, beneficiary.created_at]
  );
};

export const insertHealthRecord = async (record: Omit<HealthRecord, 'synced'>) => {
  const database = getDb();
  database.runSync(
    'INSERT INTO health_records (id, beneficiary_id, worker_id, symptoms, vital_signs, notes, media_urls, created_at, synced) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)',
    [record.id, record.beneficiary_id, record.worker_id, JSON.stringify(record.symptoms), JSON.stringify(record.vital_signs), record.notes || null, JSON.stringify(record.media_urls), record.created_at]
  );
};

export const getUnsyncedBeneficiaries = async (): Promise<Beneficiary[]> => {
  const database = getDb();
  const result = database.getAllSync('SELECT * FROM beneficiaries WHERE synced = 0');
  return result.map((row: any) => ({
    ...row,
    synced: Boolean(row.synced)
  })) as Beneficiary[];
};

export const getUnsyncedHealthRecords = async (): Promise<HealthRecord[]> => {
  const database = getDb();
  const result = database.getAllSync('SELECT * FROM health_records WHERE synced = 0');
  return result.map((row: any) => ({
    ...row,
    symptoms: JSON.parse(row.symptoms as string),
    vital_signs: row.vital_signs ? JSON.parse(row.vital_signs as string) : null,
    media_urls: row.media_urls ? JSON.parse(row.media_urls as string) : null,
    synced: Boolean(row.synced)
  })) as HealthRecord[];
};

export const markAsSynced = async (table: string, id: string) => {
  const database = getDb();
  database.runSync(`UPDATE ${table} SET synced = 1 WHERE id = ?`, [id]);
};

export const getBeneficiaries = async (): Promise<Beneficiary[]> => {
  const database = getDb();
  const result = database.getAllSync('SELECT * FROM beneficiaries ORDER BY created_at DESC');
  return result.map((row: any) => ({
    ...row,
    synced: Boolean(row.synced)
  })) as Beneficiary[];
};

export const getVillages = async (): Promise<Village[]> => {
  const database = getDb();
  const result = database.getAllSync('SELECT * FROM villages ORDER BY name');
  return result.map((row: any) => ({
    ...row,
    synced: Boolean(row.synced)
  })) as Village[];
};

export const getHealthRecords = async (): Promise<HealthRecord[]> => {
  const database = getDb();
  const result = database.getAllSync('SELECT * FROM health_records ORDER BY created_at DESC');
  return result.map((row: any) => ({
    ...row,
    symptoms: JSON.parse(row.symptoms as string),
    vital_signs: row.vital_signs ? JSON.parse(row.vital_signs as string) : null,
    media_urls: row.media_urls ? JSON.parse(row.media_urls as string) : null,
    synced: Boolean(row.synced)
  })) as HealthRecord[];
};

// Patient Image functions
export const insertPatientImage = async (image: Omit<PatientImage, 'synced'>) => {
  const database = getDb();
  database.runSync(
    'INSERT INTO patient_images (id, beneficiary_id, local_uri, description, image_type, created_at, synced, remote_url) VALUES (?, ?, ?, ?, ?, ?, 0, ?)',
    [image.id, image.beneficiary_id, image.local_uri, image.description || null, image.image_type, image.created_at, image.remote_url || null]
  );
};

export const getPatientImages = async (beneficiaryId: string): Promise<PatientImage[]> => {
  const database = getDb();
  const result = database.getAllSync('SELECT * FROM patient_images WHERE beneficiary_id = ? ORDER BY created_at DESC', [beneficiaryId]);
  return result.map((row: any) => ({
    ...row,
    synced: Boolean(row.synced)
  })) as PatientImage[];
};

export const getUnsyncedPatientImages = async (): Promise<PatientImage[]> => {
  const database = getDb();
  const result = database.getAllSync('SELECT * FROM patient_images WHERE synced = 0');
  return result.map((row: any) => ({
    ...row,
    synced: Boolean(row.synced)
  })) as PatientImage[];
};

export const updatePatientImageRemoteUrl = async (id: string, remoteUrl: string) => {
const database = getDb();
database.runSync('UPDATE patient_images SET remote_url = ?, synced = 1 WHERE id = ?', [remoteUrl, id]);
};

export const deletePatientImage = async (id: string) => {
const database = getDb();
database.runSync('DELETE FROM patient_images WHERE id = ?', [id]);
};

// Template functions
export const insertTemplate = async (template: Omit<Template, 'synced'>) => {
  const database = getDb();
  try {
    const fieldsStr = typeof template.fields === 'string' ? template.fields : JSON.stringify(template.fields);
    database.runSync(
      'INSERT INTO templates (id, name, description, fields, is_system, created_by, created_at, updated_at, synced) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)',
      [template.id, template.name, template.description || null, fieldsStr, template.is_system ? 1 : 0, template.created_by || null, template.created_at, template.updated_at]
    );
    console.log('✅ DB: Template inserted successfully:', template.id);
  } catch (e) {
    console.log('❌ DB: Failed to insert template:', template.id, 'Error:', e);
    throw e;
  }
};

export const getTemplates = async (): Promise<Template[]> => {
  const database = getDb();
  const result = database.getAllSync('SELECT * FROM templates ORDER BY created_at DESC');
  return result.map((row: any) => ({
    id: row.id,
    name: row.name,
    description: row.description,
    fields: JSON.parse(row.fields as string),
    is_system: Boolean(row.is_system),
    created_by: row.created_by,
    created_at: row.created_at,
    updated_at: row.updated_at,
    synced: Boolean(row.synced)
  })) as Template[];
};

export const getTemplateById = async (id: string): Promise<Template | null> => {
  console.log('🔍 getTemplateById called with id:', id, 'type:', typeof id);
  const database = getDb();
  const result = database.getAllSync('SELECT * FROM templates WHERE id = ?', [id]);
  console.log('🔍 Query result count:', result.length);
  if (result.length === 0) {
    // List all templates to debug
    const allTemplates = database.getAllSync('SELECT id, name FROM templates');
    console.log('🔍 All templates in DB:', allTemplates);
    return null;
  }
  const row = result[0] as any;
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    fields: JSON.parse(row.fields as string),
    is_system: Boolean(row.is_system),
    created_by: row.created_by,
    created_at: row.created_at,
    updated_at: row.updated_at,
    synced: Boolean(row.synced)
  } as Template;
};

export const updateTemplate = async (id: string, updates: Partial<Template>) => {
  const database = getDb();
  if (updates.fields) {
    database.runSync(
      'UPDATE templates SET name = ?, description = ?, fields = ?, updated_at = ? WHERE id = ?',
      [updates.name ?? null, updates.description ?? null, JSON.stringify(updates.fields), updates.updated_at ?? new Date().toISOString(), id]
    );
  } else {
    database.runSync(
      'UPDATE templates SET name = ?, description = ?, updated_at = ? WHERE id = ?',
      [updates.name ?? null, updates.description ?? null, updates.updated_at ?? new Date().toISOString(), id]
    );
  }
};

export const deleteTemplate = async (id: string) => {
  const database = getDb();
  database.runSync('DELETE FROM templates WHERE id = ?', [id]);
};

// Survey functions
export const insertSurvey = async (survey: Omit<Survey, 'synced'>) => {
  const database = getDb();
  database.runSync(
    'INSERT INTO surveys (id, name, description, area_village, start_date, end_date, template_ids, created_by, status, created_at, updated_at, synced) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)',
    [survey.id, survey.name, survey.description || null, survey.area_village, survey.start_date, survey.end_date, JSON.stringify(survey.template_ids), survey.created_by, survey.status, survey.created_at, survey.updated_at]
  );
};

export const getSurveys = async (): Promise<Survey[]> => {
  const database = getDb();
  const result = database.getAllSync('SELECT * FROM surveys ORDER BY created_at DESC');
  return result.map((row: any) => ({
    id: row.id,
    name: row.name,
    description: row.description,
    area_village: row.area_village,
    start_date: row.start_date,
    end_date: row.end_date,
    template_ids: JSON.parse(row.template_ids as string),
    created_by: row.created_by,
    status: row.status,
    created_at: row.created_at,
    updated_at: row.updated_at,
    synced: Boolean(row.synced)
  })) as Survey[];
};

export const getSurveyById = async (id: string): Promise<Survey | null> => {
  const database = getDb();
  const result = database.getAllSync('SELECT * FROM surveys WHERE id = ?', [id]);
  if (result.length === 0) return null;
  const row = result[0] as any;
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    area_village: row.area_village,
    start_date: row.start_date,
    end_date: row.end_date,
    template_ids: JSON.parse(row.template_ids as string),
    created_by: row.created_by,
    status: row.status,
    created_at: row.created_at,
    updated_at: row.updated_at,
    synced: Boolean(row.synced)
  } as Survey;
};

export const updateSurvey = async (id: string, updates: Partial<Survey>) => {
  const database = getDb();
  const templateIds = updates.template_ids ? JSON.stringify(updates.template_ids) : null;
  database.runSync(
    'UPDATE surveys SET name = ?, description = ?, area_village = ?, start_date = ?, end_date = ?, template_ids = COALESCE(?, template_ids), status = ?, updated_at = ? WHERE id = ?',
    [updates.name ?? null, updates.description ?? null, updates.area_village ?? null, updates.start_date ?? null, updates.end_date ?? null, templateIds, updates.status ?? null, updates.updated_at ?? new Date().toISOString(), id]
  );
};

export const deleteSurvey = async (id: string) => {
  const database = getDb();
  database.runSync('DELETE FROM surveys WHERE id = ?', [id]);
};

export const getSurveyAssignments = async (surveyId?: string, workerId?: string): Promise<SurveyAssignment[]> => {
  const database = getDb();
  let query = 'SELECT * FROM survey_assignments';
  const params: any[] = [];
  const conditions: string[] = [];

  if (surveyId) {
    conditions.push('survey_id = ?');
    params.push(surveyId);
  }
  if (workerId) {
    conditions.push('worker_id = ?');
    params.push(workerId);
  }

  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }
  query += ' ORDER BY assigned_at DESC';

  const result = database.getAllSync(query, params);
  return result.map((row: any) => ({
    id: row.id,
    survey_id: row.survey_id,
    worker_id: row.worker_id,
    assigned_by: row.assigned_by,
    assigned_at: row.assigned_at,
    status: row.status,
    synced: Boolean(row.synced)
  })) as SurveyAssignment[];
};

export const getSurveyAssignmentById = async (id: string): Promise<SurveyAssignment | null> => {
  const database = getDb();
  const result = database.getAllSync('SELECT * FROM survey_assignments WHERE id = ?', [id]);
  if (result.length === 0) return null;
  const row = result[0] as any;
  return {
    id: row.id,
    survey_id: row.survey_id,
    worker_id: row.worker_id,
    assigned_by: row.assigned_by,
    assigned_at: row.assigned_at,
    status: row.status,
    synced: Boolean(row.synced)
  } as SurveyAssignment;
};

export const updateSurveyAssignmentStatus = async (id: string, status: SurveyAssignment['status']) => {
  const database = getDb();
  database.runSync('UPDATE survey_assignments SET status = ? WHERE id = ?', [status, id]);
};

export const insertSurveyAssignment = async (assignment: Omit<SurveyAssignment, 'synced'>) => {
  const database = getDb();
  database.runSync(
    'INSERT INTO survey_assignments (id, survey_id, worker_id, assigned_by, assigned_at, status, synced) VALUES (?, ?, ?, ?, ?, ?, 0)',
    [assignment.id, assignment.survey_id, assignment.worker_id, assignment.assigned_by, assignment.assigned_at, assignment.status]
  );
};

// Survey Submission functions
export const insertSurveySubmission = async (submission: Omit<SurveySubmission, 'synced'>) => {
  const database = getDb();
  database.runSync(
    'INSERT INTO survey_submissions (id, survey_id, assignment_id, beneficiary_id, worker_id, template_id, field_data, images, voice_notes, submitted_at, synced) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)',
    [submission.id, submission.survey_id, submission.assignment_id || null, submission.beneficiary_id, submission.worker_id, submission.template_id, JSON.stringify(submission.field_data), submission.images ? JSON.stringify(submission.images) : null, submission.voice_notes ? JSON.stringify(submission.voice_notes) : null, submission.submitted_at]
  );
};

export const getSurveySubmissions = async (surveyId?: string, workerId?: string): Promise<SurveySubmission[]> => {
  const database = getDb();
  let query = 'SELECT * FROM survey_submissions';
  const params: any[] = [];
  const conditions: string[] = [];

  if (surveyId) {
    conditions.push('survey_id = ?');
    params.push(surveyId);
  }
  if (workerId) {
    conditions.push('worker_id = ?');
    params.push(workerId);
  }

  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }
  query += ' ORDER BY submitted_at DESC';

  const result = database.getAllSync(query, params);
  return result.map((row: any) => ({
    ...row,
    field_data: JSON.parse(row.field_data as string),
    images: row.images ? JSON.parse(row.images as string) : undefined,
    voice_notes: row.voice_notes ? JSON.parse(row.voice_notes as string) : undefined,
    synced: Boolean(row.synced)
  })) as SurveySubmission[];
};

export const getUnsyncedSurveySubmissions = async (): Promise<SurveySubmission[]> => {
  const database = getDb();
  const result = database.getAllSync('SELECT * FROM survey_submissions WHERE synced = 0');
  return result.map((row: any) => ({
    ...row,
    field_data: JSON.parse(row.field_data as string),
    images: row.images ? JSON.parse(row.images as string) : undefined,
    voice_notes: row.voice_notes ? JSON.parse(row.voice_notes as string) : undefined,
    synced: Boolean(row.synced)
  })) as SurveySubmission[];
};

// Mark a submission for re-sync (useful when images need to be re-uploaded)
export const markSubmissionForResync = async (submissionId: string): Promise<void> => {
  const database = getDb();
  database.runSync(
    'UPDATE survey_submissions SET synced = 0 WHERE id = ?',
    [submissionId]
  );
  console.log(` Marked submission ${submissionId} for re-sync`);
};

// Get all submissions (for checking which ones have local URIs)
export const getAllSurveySubmissions = async (): Promise<SurveySubmission[]> => {
  const database = getDb();
  const result = database.getAllSync('SELECT * FROM survey_submissions ORDER BY submitted_at DESC');
  return result.map((row: any) => ({
    ...row,
    field_data: JSON.parse(row.field_data as string),
    images: row.images ? JSON.parse(row.images as string) : undefined,
    voice_notes: row.voice_notes ? JSON.parse(row.voice_notes as string) : undefined,
    synced: Boolean(row.synced)
  })) as SurveySubmission[];
};

// Duplicate Record functions
export const insertDuplicateRecord = async (duplicate: Omit<DuplicateRecord, 'synced'>) => {
  const database = getDb();
  database.runSync(
    'INSERT INTO duplicate_records (id, new_beneficiary_id, existing_beneficiary_id, match_fields, match_score, status, reviewed_by, reviewed_at, notes, created_at, synced) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)',
    [duplicate.id, duplicate.new_beneficiary_id, duplicate.existing_beneficiary_id || null, JSON.stringify(duplicate.match_fields), duplicate.match_score, duplicate.status, duplicate.reviewed_by || null, duplicate.reviewed_at || null, duplicate.notes || null, duplicate.created_at]
  );
};

export const getDuplicateRecords = async (status?: DuplicateRecord['status']): Promise<DuplicateRecord[]> => {
  const database = getDb();
  let query = 'SELECT * FROM duplicate_records';
  const params: any[] = [];

if (status) {
query += ' WHERE status = ?';
params.push(status);
}
query += ' ORDER BY created_at DESC';

const result = database.getAllSync(query, params);
return result.map((row: any) => ({
...row,
match_fields: JSON.parse(row.match_fields as string),
synced: Boolean(row.synced)
})) as DuplicateRecord[];
};

export const updateDuplicateRecordStatus = async (id: string, status: DuplicateRecord['status'], reviewedBy: string, notes?: string) => {
const database = getDb();
database.runSync(
'UPDATE duplicate_records SET status = ?, reviewed_by = ?, reviewed_at = ?, notes = ? WHERE id = ?',
[status, reviewedBy, new Date().toISOString(), notes || null, id]
);
};

// Duplicate detection function
export const checkForDuplicateBeneficiary = async (name: string, phone: string | undefined, village: string, age: number): Promise<Beneficiary | null> => {
  const database = getDb();

  // Check for exact matches on name + village + age
  const nameVillageAgeMatch = database.getAllSync(
    'SELECT * FROM beneficiaries WHERE LOWER(name) = LOWER(?) AND village_id = ? AND age = ? LIMIT 1',
    [name.trim().toLowerCase(), village, age]
  );

  if (nameVillageAgeMatch.length > 0) {
    const row = nameVillageAgeMatch[0] as any;
    return {
      id: row.id,
      name: row.name,
      age: row.age,
      gender: row.gender,
      phone: row.phone,
      village_id: row.village_id,
      worker_id: row.worker_id,
      created_at: row.created_at,
      synced: Boolean(row.synced)
    } as Beneficiary;
  }

  // Check for phone match if provided
  if (phone && phone.trim()) {
    const phoneMatch = database.getAllSync(
      'SELECT * FROM beneficiaries WHERE phone = ? LIMIT 1',
      [phone.trim()]
    );

    if (phoneMatch.length > 0) {
      const row = phoneMatch[0] as any;
      return {
        id: row.id,
        name: row.name,
        age: row.age,
        gender: row.gender,
        phone: row.phone,
        village_id: row.village_id,
        worker_id: row.worker_id,
        created_at: row.created_at,
        synced: Boolean(row.synced)
      } as Beneficiary;
    }
  }

  return null;
};

// Calculate similarity score between two beneficiaries
export const calculateSimilarityScore = (newData: { name: string; phone?: string; village: string; age: number }, existing: Beneficiary): { score: number; matchFields: string[] } => {
let score = 0;
const matchFields: string[] = [];

// Name similarity (case-insensitive)
if (newData.name.toLowerCase().trim() === existing.name.toLowerCase().trim()) {
score += 40;
matchFields.push('name');
} else if (newData.name.toLowerCase().includes(existing.name.toLowerCase()) || existing.name.toLowerCase().includes(newData.name.toLowerCase())) {
score += 20;
matchFields.push('name_partial');
}

// Phone match
if (newData.phone && existing.phone && newData.phone.trim() === existing.phone.trim()) {
score += 30;
matchFields.push('phone');
}

// Village match
if (newData.village === existing.village_id) {
score += 15;
matchFields.push('village');
}

// Age match
if (newData.age === existing.age) {
score += 15;
matchFields.push('age');
}

return { score, matchFields };
};