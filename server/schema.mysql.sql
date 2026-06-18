-- ============================================================
--  Tatiana Hernández — Cosmetología Estética
--  Esquema de base de datos para PRODUCCIÓN (MySQL 8)
--  Ejecutar:  mysql -u root -p < schema.mysql.sql
-- ============================================================

CREATE DATABASE IF NOT EXISTS tatiana_cosmetologia
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE tatiana_cosmetologia;

CREATE TABLE IF NOT EXISTS users (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(120) NOT NULL,
  email         VARCHAR(160) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role          VARCHAR(30)  NOT NULL DEFAULT 'cosmetologa',
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS patients (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  first_name  VARCHAR(120) NOT NULL,
  last_name   VARCHAR(120) NOT NULL,
  document    VARCHAR(40),
  birth_date  DATE,
  phone       VARCHAR(40),
  email       VARCHAR(160),
  eps         VARCHAR(120),
  address     VARCHAR(200),
  city        VARCHAR(120),
  sex         VARCHAR(20),
  rh          VARCHAR(8),
  occupation  VARCHAR(120),
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_patients_document (document),
  INDEX idx_patients_name (last_name, first_name)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS fichas (
  id                      INT AUTO_INCREMENT PRIMARY KEY,
  patient_id              INT NOT NULL,
  attention_date          DATE,
  antecedentes_personales TEXT,
  antecedentes_familiares TEXT,
  estado_salud            VARCHAR(60),
  cirugias                TEXT,
  embarazo_lactancia      VARCHAR(4),
  tratamiento_medico      VARCHAR(4),
  tratamiento_medico_cual TEXT,
  alergias                VARCHAR(4),
  alergias_cual           TEXT,
  productos_cosmeticos    TEXT,
  fuma                    VARCHAR(4),
  alcohol                 VARCHAR(4),
  bebidas_oscuras         VARCHAR(4),
  laser_reciente          VARCHAR(4),
  laser_fecha             VARCHAR(40),
  tipo_piel               JSON,
  estado_piel             JSON,
  poros_lesiones          JSON,
  afecciones              JSON,
  mapa_facial             JSON,
  observacion             TEXT,
  created_at              DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_fichas_patient FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
  INDEX idx_fichas_patient (patient_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS diagnoses (
  id                    INT AUTO_INCREMENT PRIMARY KEY,
  ficha_id              INT NOT NULL,
  patient_id            INT NOT NULL,
  tipo_acne             JSON,
  grado                 VARCHAR(8),
  tiempo_acne           VARCHAR(40),
  tratamientos_previos  JSON,
  factores              JSON,
  diagnostico_detallado TEXT,
  auto_sugerencia       TEXT,
  created_at            DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_diag_ficha   FOREIGN KEY (ficha_id)   REFERENCES fichas(id)   ON DELETE CASCADE,
  CONSTRAINT fk_diag_patient FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS sessions (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  patient_id     INT NOT NULL,
  session_number INT,
  session_date   DATE,
  duration       VARCHAR(20),
  procedimientos JSON,
  productos      JSON,
  cuidados_casa  JSON,
  protocolo      JSON,
  proxima_cita   VARCHAR(40),
  observaciones  TEXT,
  created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_sessions_patient FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
  INDEX idx_sessions_patient (patient_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS consents (
  id                INT AUTO_INCREMENT PRIMARY KEY,
  patient_id        INT NOT NULL,
  procedure_name    VARCHAR(120) NOT NULL DEFAULT 'Tratamiento de Acné',
  accepted          TINYINT(1) NOT NULL DEFAULT 0,
  signature_patient LONGTEXT,
  signature_pro     LONGTEXT,
  patient_cedula    VARCHAR(40),
  signed_at         DATETIME,
  created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_consents_patient FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS photos (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  patient_id  INT NOT NULL,
  session_id  INT,
  type        VARCHAR(20),
  data        LONGTEXT,
  caption     VARCHAR(200),
  taken_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_photos_patient FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
  INDEX idx_photos_patient (patient_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS appointments (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  patient_id   INT,
  patient_name VARCHAR(200),
  phone        VARCHAR(40),
  datetime     DATETIME NOT NULL,
  service      VARCHAR(160),
  status       VARCHAR(20) NOT NULL DEFAULT 'agendada',
  notes        TEXT,
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_appt_patient FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE SET NULL,
  INDEX idx_appt_datetime (datetime)
) ENGINE=InnoDB;
