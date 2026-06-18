-- ============================================================
--  Tatiana Hernández — Cosmetología Estética
--  Esquema de base de datos (SQLite — arranque inmediato)
--  Para producción ver schema.mysql.sql
-- ============================================================

PRAGMA foreign_keys = ON;

-- Usuarios del sistema (cosmetóloga / administrador) -----------
CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT    NOT NULL,
  email         TEXT    NOT NULL UNIQUE,
  password_hash TEXT    NOT NULL,
  role          TEXT    NOT NULL DEFAULT 'cosmetologa',  -- cosmetologa | admin
  created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- Pacientes ---------------------------------------------------
CREATE TABLE IF NOT EXISTS patients (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  first_name   TEXT NOT NULL,
  last_name    TEXT NOT NULL,
  document     TEXT,
  birth_date   TEXT,
  phone        TEXT,
  email        TEXT,
  eps          TEXT,
  address      TEXT,
  city         TEXT,
  sex          TEXT,           -- Femenino | Masculino | Otro
  rh           TEXT,           -- O+, O-, A+, ...
  occupation   TEXT,
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at   TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_patients_document ON patients(document);
CREATE INDEX IF NOT EXISTS idx_patients_name ON patients(last_name, first_name);

-- Ficha técnica / valoración cosmetológica --------------------
CREATE TABLE IF NOT EXISTS fichas (
  id                      INTEGER PRIMARY KEY AUTOINCREMENT,
  patient_id              INTEGER NOT NULL,
  attention_date          TEXT,
  -- Antecedentes de salud
  antecedentes_personales TEXT,
  antecedentes_familiares TEXT,
  estado_salud            TEXT,   -- Adecuado | Con tratamiento médico | Condición activa
  cirugias                TEXT,
  embarazo_lactancia      TEXT,   -- SI | NO
  tratamiento_medico      TEXT,   -- SI | NO
  tratamiento_medico_cual TEXT,
  alergias                TEXT,   -- SI | NO
  alergias_cual           TEXT,
  productos_cosmeticos    TEXT,
  fuma                    TEXT,   -- SI | NO
  alcohol                 TEXT,   -- SI | NO
  bebidas_oscuras         TEXT,   -- SI | NO
  laser_reciente          TEXT,   -- SI | NO
  laser_fecha             TEXT,
  -- Valoración cosmetológica (listas guardadas como JSON)
  tipo_piel               TEXT,   -- JSON array
  estado_piel             TEXT,   -- JSON array
  poros_lesiones          TEXT,   -- JSON array
  afecciones              TEXT,   -- JSON array
  mapa_facial             TEXT,   -- JSON {zona: estado}
  observacion             TEXT,
  created_at              TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_fichas_patient ON fichas(patient_id);

-- Diagnóstico de acné -----------------------------------------
CREATE TABLE IF NOT EXISTS diagnoses (
  id                    INTEGER PRIMARY KEY AUTOINCREMENT,
  ficha_id              INTEGER NOT NULL,
  patient_id            INTEGER NOT NULL,
  tipo_acne             TEXT,   -- JSON array
  grado                 TEXT,   -- I | II | III | IV
  tiempo_acne           TEXT,
  tratamientos_previos  TEXT,   -- JSON array
  factores              TEXT,   -- JSON array
  diagnostico_detallado TEXT,
  auto_sugerencia       TEXT,   -- diagnóstico generado automáticamente
  created_at            TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (ficha_id)   REFERENCES fichas(id)   ON DELETE CASCADE,
  FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
);

-- Sesiones / plan de tratamiento ------------------------------
CREATE TABLE IF NOT EXISTS sessions (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  patient_id     INTEGER NOT NULL,
  session_number INTEGER,
  session_date   TEXT,
  duration       TEXT,   -- 30 | 45 | 60 | 90 min
  procedimientos TEXT,   -- JSON array
  productos      TEXT,   -- JSON array de {producto, concentracion, zona}
  cuidados_casa  TEXT,   -- JSON {limpiador, tonico, hidratante, bloqueador, indicaciones[]}
  protocolo      TEXT,   -- JSON array de pasos {n, texto, hecho}
  proxima_cita   TEXT,
  observaciones  TEXT,
  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_sessions_patient ON sessions(patient_id);

-- Consentimiento informado ------------------------------------
CREATE TABLE IF NOT EXISTS consents (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  patient_id        INTEGER NOT NULL,
  procedure_name    TEXT NOT NULL DEFAULT 'Tratamiento de Acné',
  accepted          INTEGER NOT NULL DEFAULT 0,  -- 0/1
  signature_patient TEXT,   -- imagen base64 de la firma
  signature_pro     TEXT,
  patient_cedula    TEXT,
  signed_at         TEXT,
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
);

-- Fotografías clínicas ----------------------------------------
CREATE TABLE IF NOT EXISTS photos (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  patient_id  INTEGER NOT NULL,
  session_id  INTEGER,
  type        TEXT,   -- antes | durante | despues
  data        TEXT,   -- base64 (dev) o ruta de archivo (prod)
  caption     TEXT,
  taken_at    TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_photos_patient ON photos(patient_id);

-- Agenda de citas ---------------------------------------------
CREATE TABLE IF NOT EXISTS appointments (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  patient_id  INTEGER,
  patient_name TEXT,            -- por si la cita es de alguien aún no registrado
  phone       TEXT,
  datetime    TEXT NOT NULL,
  service     TEXT,
  status      TEXT NOT NULL DEFAULT 'agendada', -- agendada|reprogramada|cancelada|atendida
  notes       TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_appointments_datetime ON appointments(datetime);
