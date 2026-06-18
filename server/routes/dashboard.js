'use strict';
const express = require('express');
const db = require('../db');
const { requireAuth } = require('../auth');

const router = express.Router();
router.use(requireAuth);

router.get('/stats', (req, res) => {
  const totalPatients = db.prepare('SELECT COUNT(*) c FROM patients').get().c;
  const totalSessions = db.prepare('SELECT COUNT(*) c FROM sessions').get().c;
  const totalFichas = db.prepare('SELECT COUNT(*) c FROM fichas').get().c;

  const today = new Date().toISOString().slice(0, 10);
  const citasHoy = db.prepare(
    `SELECT COUNT(*) c FROM appointments WHERE substr(datetime,1,10) = ? AND status != 'cancelada'`
  ).get(today).c;

  const proximasCitas = db.prepare(
    `SELECT a.*, p.first_name, p.last_name FROM appointments a
     LEFT JOIN patients p ON p.id = a.patient_id
     WHERE a.datetime >= datetime('now') AND a.status != 'cancelada'
     ORDER BY a.datetime ASC LIMIT 8`
  ).all();

  // Pacientes nuevos por mes (últimos 6 meses)
  const porMes = db.prepare(
    `SELECT substr(created_at,1,7) ym, COUNT(*) c FROM patients
     GROUP BY ym ORDER BY ym DESC LIMIT 6`
  ).all().reverse();

  // Procedimientos más realizados (desempaqueta el JSON en JS)
  const sesiones = db.prepare('SELECT procedimientos FROM sessions').all();
  const conteo = {};
  for (const s of sesiones) {
    let arr = [];
    try { arr = JSON.parse(s.procedimientos || '[]'); } catch (e) {}
    for (const p of arr) conteo[p] = (conteo[p] || 0) + 1;
  }
  const topProcedimientos = Object.entries(conteo)
    .sort((a, b) => b[1] - a[1]).slice(0, 6)
    .map(([nombre, total]) => ({ nombre, total }));

  res.json({
    totalPatients, totalSessions, totalFichas, citasHoy,
    proximasCitas, porMes, topProcedimientos
  });
});

module.exports = router;
