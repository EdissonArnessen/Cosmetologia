'use strict';
const express = require('express');
const db = require('../db');
const { requireAuth } = require('../auth');
const { generarDiagnostico } = require('../diagnosis');

const router = express.Router();
router.use(requireAuth);

const J = (v) => JSON.stringify(Array.isArray(v) || (v && typeof v === 'object') ? v : (v ?? null));

// Crear ficha técnica (incluye diagnóstico) ---------------------
router.post('/', (req, res) => {
  const b = req.body || {};
  if (!b.patient_id) return res.status(400).json({ error: 'patient_id es obligatorio' });
  const patient = db.prepare('SELECT id FROM patients WHERE id = ?').get(b.patient_id);
  if (!patient) return res.status(404).json({ error: 'Paciente no encontrado' });

  const tx = db.transaction(() => {
    const fichaInfo = db.prepare(
      `INSERT INTO fichas (patient_id,attention_date,antecedentes_personales,antecedentes_familiares,
        estado_salud,cirugias,embarazo_lactancia,tratamiento_medico,tratamiento_medico_cual,
        alergias,alergias_cual,productos_cosmeticos,fuma,alcohol,bebidas_oscuras,laser_reciente,
        laser_fecha,tipo_piel,estado_piel,poros_lesiones,afecciones,mapa_facial,observacion)
       VALUES (@patient_id,@attention_date,@ap,@af,@estado,@cir,@emb,@trat,@tratcual,@alg,@algcual,
        @prod,@fuma,@alc,@beb,@laser,@laserf,@tpiel,@epiel,@poros,@afec,@mapa,@obs)`
    ).run({
      patient_id: b.patient_id,
      attention_date: b.attention_date || null,
      ap: b.antecedentes_personales || null,
      af: b.antecedentes_familiares || null,
      estado: b.estado_salud || null,
      cir: b.cirugias || null,
      emb: b.embarazo_lactancia || null,
      trat: b.tratamiento_medico || null,
      tratcual: b.tratamiento_medico_cual || null,
      alg: b.alergias || null,
      algcual: b.alergias_cual || null,
      prod: b.productos_cosmeticos || null,
      fuma: b.fuma || null,
      alc: b.alcohol || null,
      beb: b.bebidas_oscuras || null,
      laser: b.laser_reciente || null,
      laserf: b.laser_fecha || null,
      tpiel: J(b.tipo_piel || []),
      epiel: J(b.estado_piel || []),
      poros: J(b.poros_lesiones || []),
      afec: J(b.afecciones || []),
      mapa: J(b.mapa_facial || {}),
      obs: b.observacion || null
    });
    const fichaId = fichaInfo.lastInsertRowid;

    // Diagnóstico (si vienen campos de diagnóstico)
    const d = b.diagnostico || {};
    const auto = generarDiagnostico({
      tipo_acne: d.tipo_acne || [],
      grado: d.grado,
      afecciones: b.afecciones || [],
      tipo_piel: b.tipo_piel || [],
      factores: d.factores || []
    });
    db.prepare(
      `INSERT INTO diagnoses (ficha_id,patient_id,tipo_acne,grado,tiempo_acne,
         tratamientos_previos,factores,diagnostico_detallado,auto_sugerencia)
       VALUES (@ficha,@pat,@tipo,@grado,@tiempo,@prev,@fac,@det,@auto)`
    ).run({
      ficha: fichaId, pat: b.patient_id,
      tipo: J(d.tipo_acne || []), grado: d.grado || null,
      tiempo: d.tiempo_acne || null, prev: J(d.tratamientos_previos || []),
      fac: J(d.factores || []), det: d.diagnostico_detallado || null, auto
    });

    return fichaId;
  });

  const fichaId = tx();
  res.status(201).json({
    ficha: db.prepare('SELECT * FROM fichas WHERE id = ?').get(fichaId),
    diagnosis: db.prepare('SELECT * FROM diagnoses WHERE ficha_id = ?').get(fichaId)
  });
});

// Vista previa del diagnóstico automático (sin guardar) ---------
router.post('/preview-diagnostico', (req, res) => {
  const b = req.body || {};
  res.json({ auto_sugerencia: generarDiagnostico(b) });
});

router.get('/:id', (req, res) => {
  const ficha = db.prepare('SELECT * FROM fichas WHERE id = ?').get(req.params.id);
  if (!ficha) return res.status(404).json({ error: 'Ficha no encontrada' });
  const diagnosis = db.prepare('SELECT * FROM diagnoses WHERE ficha_id = ?').get(req.params.id);
  res.json({ ficha, diagnosis });
});

module.exports = router;
