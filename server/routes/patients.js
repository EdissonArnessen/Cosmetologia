'use strict';
const express = require('express');
const db = require('../db');
const { requireAuth } = require('../auth');

const router = express.Router();
router.use(requireAuth);

// Listar / buscar pacientes
router.get('/', (req, res) => {
  const q = (req.query.q || '').trim();
  let rows;
  if (q) {
    const like = `%${q}%`;
    rows = db.prepare(
      `SELECT * FROM patients
       WHERE first_name LIKE ? OR last_name LIKE ? OR document LIKE ? OR phone LIKE ?
       ORDER BY created_at DESC`
    ).all(like, like, like, like);
  } else {
    rows = db.prepare('SELECT * FROM patients ORDER BY created_at DESC').all();
  }
  res.json(rows);
});

// Obtener un paciente con su historia (fichas, sesiones, consentimientos, fotos, citas)
router.get('/:id', (req, res) => {
  const id = req.params.id;
  const patient = db.prepare('SELECT * FROM patients WHERE id = ?').get(id);
  if (!patient) return res.status(404).json({ error: 'Paciente no encontrado' });

  const fichas = db.prepare('SELECT * FROM fichas WHERE patient_id = ? ORDER BY created_at DESC').all(id);
  const diagnoses = db.prepare('SELECT * FROM diagnoses WHERE patient_id = ? ORDER BY created_at DESC').all(id);
  const sessions = db.prepare('SELECT * FROM sessions WHERE patient_id = ? ORDER BY session_number DESC, created_at DESC').all(id);
  const consents = db.prepare('SELECT * FROM consents WHERE patient_id = ? ORDER BY created_at DESC').all(id);
  const photos = db.prepare('SELECT id, patient_id, session_id, type, caption, taken_at FROM photos WHERE patient_id = ? ORDER BY taken_at DESC').all(id);
  const appointments = db.prepare('SELECT * FROM appointments WHERE patient_id = ? ORDER BY datetime DESC').all(id);

  res.json({ patient, fichas, diagnoses, sessions, consents, photos, appointments });
});

// Crear paciente
router.post('/', (req, res) => {
  const b = req.body || {};
  if (!b.first_name || !b.last_name) {
    return res.status(400).json({ error: 'Nombres y apellidos son obligatorios' });
  }
  const stmt = db.prepare(
    `INSERT INTO patients (first_name,last_name,document,birth_date,phone,email,eps,address,city,sex,rh,occupation)
     VALUES (@first_name,@last_name,@document,@birth_date,@phone,@email,@eps,@address,@city,@sex,@rh,@occupation)`
  );
  const info = stmt.run({
    first_name: b.first_name, last_name: b.last_name, document: b.document || null,
    birth_date: b.birth_date || null, phone: b.phone || null, email: b.email || null,
    eps: b.eps || null, address: b.address || null, city: b.city || null,
    sex: b.sex || null, rh: b.rh || null, occupation: b.occupation || null
  });
  const patient = db.prepare('SELECT * FROM patients WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json(patient);
});

// Actualizar paciente
router.put('/:id', (req, res) => {
  const b = req.body || {};
  const exists = db.prepare('SELECT id FROM patients WHERE id = ?').get(req.params.id);
  if (!exists) return res.status(404).json({ error: 'Paciente no encontrado' });
  db.prepare(
    `UPDATE patients SET first_name=@first_name,last_name=@last_name,document=@document,
      birth_date=@birth_date,phone=@phone,email=@email,eps=@eps,address=@address,city=@city,
      sex=@sex,rh=@rh,occupation=@occupation,updated_at=datetime('now') WHERE id=@id`
  ).run({
    id: req.params.id,
    first_name: b.first_name, last_name: b.last_name, document: b.document || null,
    birth_date: b.birth_date || null, phone: b.phone || null, email: b.email || null,
    eps: b.eps || null, address: b.address || null, city: b.city || null,
    sex: b.sex || null, rh: b.rh || null, occupation: b.occupation || null
  });
  res.json(db.prepare('SELECT * FROM patients WHERE id = ?').get(req.params.id));
});

// Eliminar paciente (y su historia por cascada)
router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM patients WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
