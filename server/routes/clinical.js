'use strict';
const express = require('express');
const db = require('../db');
const { requireAuth } = require('../auth');

const router = express.Router();
router.use(requireAuth);

const J = (v) => JSON.stringify(v ?? null);

// ---------- SESIONES / PLAN DE TRATAMIENTO ----------
router.post('/sessions', (req, res) => {
  const b = req.body || {};
  if (!b.patient_id) return res.status(400).json({ error: 'patient_id es obligatorio' });
  const info = db.prepare(
    `INSERT INTO sessions (patient_id,session_number,session_date,duration,procedimientos,
       productos,cuidados_casa,protocolo,proxima_cita,observaciones)
     VALUES (@pat,@num,@fecha,@dur,@proc,@prod,@cuid,@prot,@prox,@obs)`
  ).run({
    pat: b.patient_id, num: b.session_number || null, fecha: b.session_date || null,
    dur: b.duration || null, proc: J(b.procedimientos || []), prod: J(b.productos || []),
    cuid: J(b.cuidados_casa || {}), prot: J(b.protocolo || []),
    prox: b.proxima_cita || null, obs: b.observaciones || null
  });
  res.status(201).json(db.prepare('SELECT * FROM sessions WHERE id = ?').get(info.lastInsertRowid));
});

router.get('/sessions/:id', (req, res) => {
  const s = db.prepare('SELECT * FROM sessions WHERE id = ?').get(req.params.id);
  if (!s) return res.status(404).json({ error: 'Sesión no encontrada' });
  res.json(s);
});

// ---------- CONSENTIMIENTO INFORMADO ----------
router.post('/consents', (req, res) => {
  const b = req.body || {};
  if (!b.patient_id) return res.status(400).json({ error: 'patient_id es obligatorio' });
  const info = db.prepare(
    `INSERT INTO consents (patient_id,procedure_name,accepted,signature_patient,signature_pro,patient_cedula,signed_at)
     VALUES (@pat,@proc,@acc,@firmaP,@firmaPro,@ced,@signed)`
  ).run({
    pat: b.patient_id, proc: b.procedure_name || 'Tratamiento de Acné',
    acc: b.accepted ? 1 : 0, firmaP: b.signature_patient || null,
    firmaPro: b.signature_pro || null, ced: b.patient_cedula || null,
    signed: b.signed_at || new Date().toISOString()
  });
  res.status(201).json(db.prepare('SELECT * FROM consents WHERE id = ?').get(info.lastInsertRowid));
});

// ---------- AGENDA DE CITAS ----------
router.get('/appointments', (req, res) => {
  const rows = db.prepare('SELECT * FROM appointments ORDER BY datetime ASC').all();
  res.json(rows);
});

router.post('/appointments', (req, res) => {
  const b = req.body || {};
  if (!b.datetime) return res.status(400).json({ error: 'Fecha y hora son obligatorias' });
  const info = db.prepare(
    `INSERT INTO appointments (patient_id,patient_name,phone,datetime,service,status,notes)
     VALUES (@pat,@name,@phone,@dt,@srv,@st,@notes)`
  ).run({
    pat: b.patient_id || null, name: b.patient_name || null, phone: b.phone || null,
    dt: b.datetime, srv: b.service || null, st: b.status || 'agendada', notes: b.notes || null
  });
  res.status(201).json(db.prepare('SELECT * FROM appointments WHERE id = ?').get(info.lastInsertRowid));
});

router.put('/appointments/:id', (req, res) => {
  const b = req.body || {};
  const exists = db.prepare('SELECT id FROM appointments WHERE id = ?').get(req.params.id);
  if (!exists) return res.status(404).json({ error: 'Cita no encontrada' });
  db.prepare(
    `UPDATE appointments SET datetime=@dt,service=@srv,status=@st,notes=@notes WHERE id=@id`
  ).run({
    id: req.params.id, dt: b.datetime, srv: b.service || null,
    st: b.status || 'agendada', notes: b.notes || null
  });
  res.json(db.prepare('SELECT * FROM appointments WHERE id = ?').get(req.params.id));
});

router.delete('/appointments/:id', (req, res) => {
  db.prepare('DELETE FROM appointments WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// ---------- FOTOGRAFÍAS CLÍNICAS ----------
router.post('/photos', (req, res) => {
  const b = req.body || {};
  if (!b.patient_id || !b.data) return res.status(400).json({ error: 'patient_id y data son obligatorios' });
  const info = db.prepare(
    `INSERT INTO photos (patient_id,session_id,type,data,caption) VALUES (@pat,@sess,@type,@data,@cap)`
  ).run({
    pat: b.patient_id, sess: b.session_id || null, type: b.type || 'antes',
    data: b.data, cap: b.caption || null
  });
  res.status(201).json({ id: info.lastInsertRowid });
});

router.get('/photos/:id', (req, res) => {
  const p = db.prepare('SELECT * FROM photos WHERE id = ?').get(req.params.id);
  if (!p) return res.status(404).json({ error: 'Foto no encontrada' });
  res.json(p);
});

module.exports = router;
