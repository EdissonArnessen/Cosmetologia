'use strict';
// Genera una sugerencia de diagnóstico automática a partir de los datos
// de la valoración y del diagnóstico. Es una ayuda para la profesional,
// no reemplaza el criterio clínico.

const TIPOS = {
  comedogenico: 'acné comedogénico (puntos negros y blancos, poros obstruidos sin inflamación)',
  inflamatorio: 'acné inflamatorio (pápulas y pústulas con inflamación activa)',
  quistico: 'acné quístico (nódulos y quistes profundos)',
  hormonal: 'componente hormonal (predominio mandibular y mentón)',
  cosmetica: 'acné cosmético (reacción a productos comedogénicos)',
  cicatricial: 'secuelas cicatriciales e hiperpigmentación post-acné'
};

const GRADO_TXT = {
  'I': 'Grado I (leve)',
  'II': 'Grado II (moderado)',
  'III': 'Grado III (severo)',
  'IV': 'Grado IV (muy severo)'
};

function generarDiagnostico({ tipo_acne = [], grado, afecciones = [], tipo_piel = [], factores = [] }) {
  const partes = [];

  const tipos = (Array.isArray(tipo_acne) ? tipo_acne : [])
    .map(t => TIPOS[t]).filter(Boolean);
  if (tipos.length) {
    partes.push('Cuadro compatible con ' + tipos.join('; ') + '.');
  }

  if (grado && GRADO_TXT[grado]) {
    partes.push('Severidad estimada: ' + GRADO_TXT[grado] + '.');
  }

  const piel = (Array.isArray(tipo_piel) ? tipo_piel : []);
  if (piel.length) {
    partes.push('Tipo de piel registrado: ' + piel.join(', ') + '.');
  }

  const af = (Array.isArray(afecciones) ? afecciones : []);
  if (af.length) {
    partes.push('Lesiones presentes: ' + af.join(', ') + '.');
  }

  const fac = (Array.isArray(factores) ? factores : []);
  if (fac.length) {
    partes.push('Factores desencadenantes a controlar: ' + fac.join(', ') + '.');
  }

  // Recomendación de enfoque según severidad
  if (grado === 'III' || grado === 'IV') {
    partes.push('Sugerencia: protocolo intensivo y valorar derivación a dermatología.');
  } else if (grado === 'II') {
    partes.push('Sugerencia: protocolo combinado de limpieza profunda + activos exfoliantes.');
  } else if (grado === 'I') {
    partes.push('Sugerencia: protocolo de mantenimiento y educación en rutina en casa.');
  }

  return partes.join(' ') || 'Datos insuficientes para una sugerencia automática.';
}

module.exports = { generarDiagnostico };
