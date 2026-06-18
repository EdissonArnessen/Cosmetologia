'use strict';
/* ============================================================
   Datos maestros (tomados de la ficha física de acné)
   ============================================================ */
const TIPO_PIEL = ['Normal','Seca','Mixta','Grasa','Acneica','Pigmentada'];
const ESTADO_PIEL = ['Sensible','Deshidratada','Desvitalizada','Asfixiada','Exigente','Madura','Flácida','Seborreica'];
const POROS = ['Poros abiertos','Poros cerrados','Comedón blanco','Comedón negro','Quistes de millium'];
const AFECCIONES = ['Comedones','Pápulas','Pústulas','Alergias','Couperose','Dermatitis','Herpes','Queratosis','Efélides','Nevus','Cicatrices','Nódulos','Quistes','Lentigos','Máculas','Melasma','Telangiectasia','Otras'];
const TIPOS_ACNE = [
  ['comedogenico','Comedogénico','Puntos negros y blancos, sin inflamación'],
  ['inflamatorio','Inflamatorio','Pápulas y pústulas con inflamación activa'],
  ['quistico','Quístico','Nódulos y quistes profundos, dolorosos'],
  ['hormonal','Hormonal','Zona mandibular y barbilla, ciclo'],
  ['cosmetica','Por cosmética','Reacción a productos comedogénicos'],
  ['cicatricial','Cicatricial','Manchas post-acné, hiperpigmentación']
];
const GRADOS = [['I','Leve'],['II','Moderado'],['III','Severo'],['IV','Muy severo']];
const TIEMPO_ACNE = ['< 6 meses','6 m - 1 año','1 - 3 años','+ 3 años'];
const TRAT_PREVIOS = ['Antibióticos tópicos','Retinoides','Ácido salicílico','Peróxido de benzoilo','Limpiezas faciales','Luz LED / Láser','Peelings químicos','Tratamiento médico','Ninguno'];
const FACTORES = ['Alimentación','Estrés','Ciclo hormonal','Exposición solar','Cosméticos','Medicamentos','Skincare inadecuado','Clima / Humedad'];
const PROCEDIMIENTOS = ['Limpieza facial profunda','Hidratación profunda','Peeling enzimático','Peeling químico','Terapia LED anti-acné','Extracción comedones','Mascarilla purificante','Mesoterapia','Alta frecuencia','Microdermoabrasión','Aromaterapia','Fotoprotección final'];
const PROTOCOLO_ACNE = ['Leche limpiadora','Higienizar con jabón espumoso','Exfoliar con gránulos','Ácido Mandélico','Desincrustante con papel osmótico','Extracción','Alta frecuencia con gel de caléndula','Mascarilla de arcilla con tónico salicílico','Hantiox con ultrasonido','Aplicar tónico tree con pulverizador','Serum revitalizante','Esferas frías','Protector solar'];
const ZONAS_FACIALES = ['Frente','Sien Izq','Sien Der','Ojo Izq','Ojo Der','Nariz','Pómulo Izq','Pómulo Der','Labios','Mandíbula Izq','Mandíbula Der','Mentón','Cuello'];
const DECLARACIONES = [
  'He recibido información clara sobre el procedimiento, sus beneficios, riesgos y cuidados posteriores. Mis dudas fueron resueltas satisfactoriamente.',
  'Entiendo y acepto que pueden ocurrir efectos secundarios como hiperemia, sensibilidad, edemas, descamación o reacciones alérgicas en el área tratada.',
  'Confirmo que la información suministrada sobre mis antecedentes de salud, alergias y medicamentos es veraz y completa.',
  'Me comprometo a seguir las indicaciones de cuidado en casa, usar protector solar diario y asistir a las citas de seguimiento recomendadas.',
  'Comprendo que no se garantizan resultados específicos, pues cada organismo responde de forma individual a los tratamientos.',
  'Autorizo el registro fotográfico del antes y después para uso exclusivo de la profesional en sus redes sociales.',
  'Entiendo que una vez cancelado el procedimiento no se realizan reembolsos.',
  'Me comprometo a utilizar el protector solar como sea indicado y a realizar el tratamiento en casa que me sea prescrito.'
];

/* ============================================================
   Helpers de UI: chips (multi) y pills (único)
   ============================================================ */
function chips(name, options, selected = []) {
  return `<div class="chip-group" data-chipgroup="${name}">` +
    options.map(o => {
      const [val, label] = Array.isArray(o) ? o : [o, o];
      const on = selected.includes(val) ? ' on' : '';
      return `<span class="chip${on}" data-val="${esc(val)}">${esc(label)}</span>`;
    }).join('') + `</div>`;
}
function pills(name, options, selected = '') {
  return `<div class="pill-group" data-pillgroup="${name}">` +
    options.map(o => {
      const [val, label] = Array.isArray(o) ? o : [o, o];
      const on = selected === val ? ' on' : '';
      return `<span class="pill${on}" data-val="${esc(val)}">${esc(label)}</span>`;
    }).join('') + `</div>`;
}
function bindChips(root) {
  root.querySelectorAll('[data-chipgroup] .chip').forEach(c => {
    c.addEventListener('click', () => c.classList.toggle('on'));
  });
  root.querySelectorAll('[data-pillgroup]').forEach(g => {
    g.querySelectorAll('.pill').forEach(p => p.addEventListener('click', () => {
      g.querySelectorAll('.pill').forEach(x => x.classList.remove('on'));
      p.classList.add('on');
    }));
  });
}
function readChips(root, name) {
  return [...root.querySelectorAll(`[data-chipgroup="${name}"] .chip.on`)].map(c => c.dataset.val);
}
function readPill(root, name) {
  const el = root.querySelector(`[data-pillgroup="${name}"] .pill.on`);
  return el ? el.dataset.val : '';
}

/* ============================================================
   Mapa facial SVG interactivo
   ============================================================ */
function facialMapSVG() {
  // Cada zona cicla: sin afección -> afectada -> tratada -> sin afección
  const z = (id, label, shape) =>
    `<g class="zona-g"><title>${label}</title>${shape.replace('<PATH', `class="zona" data-zona="${id}" data-estado=""`)}</g>`;
  return `
  <div class="mapa-facial">
    <svg viewBox="0 0 240 300" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Mapa facial">
      <!-- contorno guía -->
      <ellipse cx="120" cy="135" rx="78" ry="98" fill="none" stroke="var(--linea)" stroke-width="1.5"/>
      ${z('Frente','Frente','<ellipse <PATH cx="120" cy="70" rx="58" ry="28"/>')}
      ${z('Sien Izq','Sien izquierda','<ellipse <PATH cx="64" cy="100" rx="16" ry="22"/>')}
      ${z('Sien Der','Sien derecha','<ellipse <PATH cx="176" cy="100" rx="16" ry="22"/>')}
      ${z('Ojo Izq','Ojo izquierdo','<ellipse <PATH cx="95" cy="118" rx="18" ry="11"/>')}
      ${z('Ojo Der','Ojo derecho','<ellipse <PATH cx="145" cy="118" rx="18" ry="11"/>')}
      ${z('Nariz','Nariz','<path <PATH d="M120 122 L112 160 Q120 170 128 160 Z"/>')}
      ${z('Pómulo Izq','Pómulo izquierdo','<ellipse <PATH cx="80" cy="158" rx="22" ry="18"/>')}
      ${z('Pómulo Der','Pómulo derecho','<ellipse <PATH cx="160" cy="158" rx="22" ry="18"/>')}
      ${z('Labios','Labios','<ellipse <PATH cx="120" cy="195" rx="24" ry="11"/>')}
      ${z('Mandíbula Izq','Mandíbula izquierda','<path <PATH d="M70 185 Q72 218 100 232 L102 205 Q86 198 76 182 Z"/>')}
      ${z('Mandíbula Der','Mandíbula derecha','<path <PATH d="M170 185 Q168 218 140 232 L138 205 Q154 198 164 182 Z"/>')}
      ${z('Mentón','Mentón','<ellipse <PATH cx="120" cy="222" rx="24" ry="16"/>')}
      ${z('Cuello','Cuello','<rect <PATH x="92" y="244" width="56" height="40" rx="10"/>')}
    </svg>
    <div class="leyenda">
      <span><i style="background:var(--crema-2)"></i>Sin afección</span>
      <span><i style="background:#d98b6a"></i>Zona afectada</span>
      <span><i style="background:#7fb37c"></i>Zona tratada</span>
    </div>
    <div class="text-muted-th" style="font-size:.8rem;margin-top:.3rem;">Toca cada zona para cambiar su estado.</div>
  </div>`;
}
function bindFacialMap(root) {
  const order = ['', 'afectada', 'tratada'];
  root.querySelectorAll('.zona').forEach(z => {
    z.addEventListener('click', () => {
      const cur = z.getAttribute('data-estado') || '';
      const next = order[(order.indexOf(cur) + 1) % order.length];
      z.setAttribute('data-estado', next);
    });
  });
}
function readFacialMap(root) {
  const out = {};
  root.querySelectorAll('.zona').forEach(z => {
    const e = z.getAttribute('data-estado');
    if (e) out[z.dataset.zona] = e;
  });
  return out;
}

/* ============================================================
   Formulario de FICHA TÉCNICA (incluye diagnóstico)
   ============================================================ */
const Ficha = {
  renderForm(patient) {
    const hoy = new Date().toISOString().slice(0, 10);
    return `
    <form id="fichaForm">
      <div class="section-head"><span class="num">1</span><h3>Datos de atención</h3></div>
      <div class="grid-3">
        <div><label class="form-label">Paciente</label>
          <input class="form-control" value="${esc(patient.first_name + ' ' + patient.last_name)}" disabled></div>
        <div><label class="form-label">Fecha de atención</label>
          <input type="date" id="f_attention" class="form-control" value="${hoy}"></div>
        <div><label class="form-label">Documento</label>
          <input class="form-control" value="${esc(patient.document || '')}" disabled></div>
      </div>

      <div class="section-head"><span class="num">2</span><h3>Antecedentes de salud</h3></div>
      <div class="grid-2">
        <div><label class="form-label">Antecedentes personales</label><textarea id="f_ap" rows="2"></textarea></div>
        <div><label class="form-label">Antecedentes familiares</label><textarea id="f_af" rows="2"></textarea></div>
      </div>
      <div class="mt-3"><label class="form-label">Estado actual de salud</label>
        ${pills('estado', ['Adecuado','Con tratamiento médico','Condición activa'])}</div>
      <div class="grid-2 mt-3">
        <div><label class="form-label">Intervenciones quirúrgicas</label><input id="f_cir" class="form-control"></div>
        <div><label class="form-label">¿Embarazada o en lactancia?</label>${pills('emb', ['SI','NO'])}</div>
      </div>
      <div class="grid-2 mt-3">
        <div><label class="form-label">¿Tratamiento médico actual?</label>${pills('trat', ['SI','NO'])}
          <input id="f_tratcual" class="form-control mt-2" placeholder="¿Cuál?"></div>
        <div><label class="form-label">¿Alergias a sustancias/medicamentos?</label>${pills('alg', ['SI','NO'])}
          <input id="f_algcual" class="form-control mt-2" placeholder="¿Cuáles?"></div>
      </div>
      <div class="mt-3"><label class="form-label">Productos cosméticos o medicamentos actuales</label>
        <input id="f_prod" class="form-control"></div>
      <div class="grid-4 mt-3">
        <div><label class="form-label">¿Fuma?</label>${pills('fuma', ['SI','NO'])}</div>
        <div><label class="form-label">¿Consume licor?</label>${pills('alc', ['SI','NO'])}</div>
        <div><label class="form-label">¿Bebidas oscuras?</label>${pills('beb', ['SI','NO'])}</div>
        <div><label class="form-label">¿Láser/exfoliación reciente?</label>${pills('laser', ['SI','NO'])}
          <input type="date" id="f_laserf" class="form-control mt-2"></div>
      </div>

      <div class="section-head"><span class="num">3</span><h3>Mapa facial · zonas afectadas</h3></div>
      ${facialMapSVG()}

      <div class="section-head"><span class="num">4</span><h3>Clasificación de la piel</h3></div>
      <label class="form-label">Tipo de piel</label>${chips('tpiel', TIPO_PIEL)}
      <label class="form-label mt-3">Estado de la piel</label>${chips('epiel', ESTADO_PIEL)}

      <div class="section-head"><span class="num">5</span><h3>Poros y lesiones</h3></div>
      <label class="form-label">Poros y comedones presentes</label>${chips('poros', POROS)}
      <label class="form-label mt-3">Afecciones presentes</label>${chips('afec', AFECCIONES)}
      <div class="mt-3"><label class="form-label">Observación del profesional</label><textarea id="f_obs" rows="2"></textarea></div>

      <div class="section-head"><span class="num">6</span><h3>Diagnóstico de acné</h3></div>
      <label class="form-label">Tipo de acné diagnosticado</label>${chips('tipoacne', TIPOS_ACNE.map(t => [t[0], t[1]]))}
      <div class="grid-2 mt-3">
        <div><label class="form-label">Grado de severidad</label>${pills('grado', GRADOS)}</div>
        <div><label class="form-label">Tiempo con acné</label>${pills('tiempo', TIEMPO_ACNE)}</div>
      </div>
      <label class="form-label mt-3">Tratamientos previos utilizados</label>${chips('prev', TRAT_PREVIOS)}
      <label class="form-label mt-3">Factores desencadenantes</label>${chips('factores', FACTORES)}

      <div class="card-th mt-3" style="background:var(--crema-2);">
        <div class="d-flex justify-content-between align-items-center">
          <strong class="serif">Diagnóstico automático sugerido</strong>
          <button type="button" class="btn-ghost" id="genDiag"><i class="fa-solid fa-wand-magic-sparkles me-1"></i>Generar</button>
        </div>
        <p id="autoDiag" class="text-muted-th mb-0 mt-2" style="font-style:italic;">Pulsa «Generar» tras marcar el tipo y grado.</p>
      </div>
      <div class="mt-3"><label class="form-label">Diagnóstico profesional detallado</label><textarea id="f_diagdet" rows="3"></textarea></div>

      <div class="d-flex gap-2 mt-4">
        <button type="submit" class="btn-oro"><i class="fa-solid fa-floppy-disk me-2"></i>Guardar ficha y diagnóstico</button>
        <button type="button" class="btn-ghost" id="cancelFicha">Cancelar</button>
      </div>
    </form>`;
  },

  bind(root, patient, onSaved) {
    bindChips(root);
    bindFacialMap(root);

    root.querySelector('#genDiag').addEventListener('click', async () => {
      const payload = {
        tipo_acne: readChips(root, 'tipoacne'),
        grado: readPill(root, 'grado'),
        afecciones: readChips(root, 'afec'),
        tipo_piel: readChips(root, 'tpiel'),
        factores: readChips(root, 'factores')
      };
      try {
        const r = await api('/fichas/preview-diagnostico', { method: 'POST', body: payload });
        root.querySelector('#autoDiag').textContent = r.auto_sugerencia;
      } catch (e) { toast(e.message, true); }
    });

    root.querySelector('#cancelFicha').addEventListener('click', () => onSaved && onSaved(null));

    root.querySelector('#fichaForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const data = {
        patient_id: patient.id,
        attention_date: root.querySelector('#f_attention').value,
        antecedentes_personales: root.querySelector('#f_ap').value,
        antecedentes_familiares: root.querySelector('#f_af').value,
        estado_salud: readPill(root, 'estado'),
        cirugias: root.querySelector('#f_cir').value,
        embarazo_lactancia: readPill(root, 'emb'),
        tratamiento_medico: readPill(root, 'trat'),
        tratamiento_medico_cual: root.querySelector('#f_tratcual').value,
        alergias: readPill(root, 'alg'),
        alergias_cual: root.querySelector('#f_algcual').value,
        productos_cosmeticos: root.querySelector('#f_prod').value,
        fuma: readPill(root, 'fuma'),
        alcohol: readPill(root, 'alc'),
        bebidas_oscuras: readPill(root, 'beb'),
        laser_reciente: readPill(root, 'laser'),
        laser_fecha: root.querySelector('#f_laserf').value,
        tipo_piel: readChips(root, 'tpiel'),
        estado_piel: readChips(root, 'epiel'),
        poros_lesiones: readChips(root, 'poros'),
        afecciones: readChips(root, 'afec'),
        mapa_facial: readFacialMap(root),
        observacion: root.querySelector('#f_obs').value,
        diagnostico: {
          tipo_acne: readChips(root, 'tipoacne'),
          grado: readPill(root, 'grado'),
          tiempo_acne: readPill(root, 'tiempo'),
          tratamientos_previos: readChips(root, 'prev'),
          factores: readChips(root, 'factores'),
          diagnostico_detallado: root.querySelector('#f_diagdet').value
        }
      };
      try {
        await api('/fichas', { method: 'POST', body: data });
        toast('Ficha y diagnóstico guardados');
        onSaved && onSaved(true);
      } catch (ex) { toast(ex.message, true); }
    });
  }
};

/* ============================================================
   Formulario de SESIÓN / plan de tratamiento + protocolo
   ============================================================ */
const Sesion = {
  renderForm(patient, nextNumber) {
    return `
    <form id="sesionForm">
      <div class="grid-2">
        <div><label class="form-label">Número de sesión</label>
          <input type="number" id="s_num" class="form-control" value="${nextNumber}" min="1"></div>
        <div><label class="form-label">Duración estimada</label>${pills('dur', ['30 min','45 min','60 min','90 min'])}</div>
      </div>
      <label class="form-label mt-3">Procedimientos a realizar</label>${chips('proc', PROCEDIMIENTOS)}

      <div class="section-head"><span class="num">P</span><h3>Protocolo de sesión · acné</h3></div>
      <div id="protoList">
        ${PROTOCOLO_ACNE.map((p, i) => `
          <label class="d-flex align-items-center gap-2 mb-2" style="cursor:pointer;">
            <input type="checkbox" class="proto-check" data-n="${i + 1}" data-txt="${esc(p)}">
            <span><strong>${i + 1}.</strong> ${esc(p)}</span>
          </label>`).join('')}
      </div>

      <div class="section-head"><span class="num">C</span><h3>Cuidados en casa</h3></div>
      <div class="grid-2">
        <div><label class="form-label">Limpiador recomendado</label><input id="c_limp" class="form-control"></div>
        <div><label class="form-label">Tónico / Serum</label><input id="c_ton" class="form-control"></div>
        <div><label class="form-label">Hidratante</label><input id="c_hid" class="form-control"></div>
        <div><label class="form-label">Bloqueador solar (FPS mínimo)</label><input id="c_fps" class="form-control"></div>
      </div>
      <div class="grid-2 mt-3">
        <div><label class="form-label">Próxima cita recomendada</label>${pills('prox', ['7 días','15 días','21 días','1 mes'])}</div>
        <div><label class="form-label">Observaciones</label><textarea id="s_obs" rows="2"></textarea></div>
      </div>

      <div class="d-flex gap-2 mt-4">
        <button type="submit" class="btn-oro"><i class="fa-solid fa-floppy-disk me-2"></i>Guardar sesión</button>
        <button type="button" class="btn-ghost" id="cancelSesion">Cancelar</button>
      </div>
    </form>`;
  },
  bind(root, patient, onSaved) {
    bindChips(root);
    root.querySelector('#cancelSesion').addEventListener('click', () => onSaved && onSaved(null));
    root.querySelector('#sesionForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const protocolo = [...root.querySelectorAll('.proto-check')].map(c => ({
        n: +c.dataset.n, texto: c.dataset.txt, hecho: c.checked
      }));
      const data = {
        patient_id: patient.id,
        session_number: +root.querySelector('#s_num').value || null,
        session_date: new Date().toISOString().slice(0, 10),
        duration: readPill(root, 'dur'),
        procedimientos: readChips(root, 'proc'),
        protocolo,
        cuidados_casa: {
          limpiador: root.querySelector('#c_limp').value,
          tonico: root.querySelector('#c_ton').value,
          hidratante: root.querySelector('#c_hid').value,
          bloqueador: root.querySelector('#c_fps').value
        },
        proxima_cita: readPill(root, 'prox'),
        observaciones: root.querySelector('#s_obs').value
      };
      try {
        await api('/clinical/sessions', { method: 'POST', body: data });
        toast('Sesión registrada');
        onSaved && onSaved(true);
      } catch (ex) { toast(ex.message, true); }
    });
  }
};

/* ============================================================
   CONSENTIMIENTO INFORMADO + firma + PDF
   ============================================================ */
function makeSignaturePad(canvas) {
  const ctx = canvas.getContext('2d');
  const ratio = window.devicePixelRatio || 1;
  function resize() {
    const r = canvas.getBoundingClientRect();
    canvas.width = r.width * ratio; canvas.height = r.height * ratio;
    ctx.scale(ratio, ratio); ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.strokeStyle = '#2C2418';
  }
  setTimeout(resize, 30);
  let drawing = false, empty = true;
  function pos(e) {
    const r = canvas.getBoundingClientRect();
    const p = e.touches ? e.touches[0] : e;
    return { x: p.clientX - r.left, y: p.clientY - r.top };
  }
  function start(e) { drawing = true; empty = false; const { x, y } = pos(e); ctx.beginPath(); ctx.moveTo(x, y); e.preventDefault(); }
  function move(e) { if (!drawing) return; const { x, y } = pos(e); ctx.lineTo(x, y); ctx.stroke(); e.preventDefault(); }
  function end() { drawing = false; }
  canvas.addEventListener('mousedown', start); canvas.addEventListener('mousemove', move);
  window.addEventListener('mouseup', end);
  canvas.addEventListener('touchstart', start); canvas.addEventListener('touchmove', move);
  canvas.addEventListener('touchend', end);
  return {
    clear() { ctx.clearRect(0, 0, canvas.width, canvas.height); empty = true; },
    isEmpty() { return empty; },
    dataURL() { return empty ? null : canvas.toDataURL('image/png'); }
  };
}

const Consentimiento = {
  renderForm(patient) {
    return `
    <h3 class="serif" style="font-size:1.4rem;">Consentimiento informado</h3>
    <p class="text-muted-th" style="font-size:.9rem;">Procedimiento: Tratamiento de Acné · Cosmetóloga: Tatiana Hernández</p>
    <div style="max-height:230px;overflow:auto;border:1px solid var(--linea);border-radius:12px;padding:1rem;background:var(--crema);">
      ${DECLARACIONES.map((d, i) => `<p style="font-size:.86rem;"><strong>${i + 1}.</strong> ${esc(d)}</p>`).join('')}
    </div>
    <label class="d-flex align-items-center gap-2 mt-3" style="cursor:pointer;">
      <input type="checkbox" id="consAccept"> <span>El paciente declara haber leído y aceptado las condiciones.</span>
    </label>
    <div class="grid-2 mt-3">
      <div>
        <label class="form-label">Firma del paciente</label>
        <div class="firma-box"><canvas id="sigPaciente"></canvas></div>
        <button type="button" class="btn-ghost mt-1" id="clearPac" style="font-size:.8rem;">Borrar firma</button>
        <input class="form-control mt-2" id="consCedula" placeholder="N° de cédula del paciente">
      </div>
      <div>
        <label class="form-label">Firma de la cosmetóloga</label>
        <div class="firma-box"><canvas id="sigPro"></canvas></div>
        <button type="button" class="btn-ghost mt-1" id="clearPro" style="font-size:.8rem;">Borrar firma</button>
      </div>
    </div>
    <div class="d-flex gap-2 mt-4">
      <button type="button" class="btn-oro" id="saveCons"><i class="fa-solid fa-floppy-disk me-2"></i>Guardar consentimiento</button>
      <button type="button" class="btn-outline-oro" id="pdfCons"><i class="fa-solid fa-file-pdf me-2"></i>Generar PDF</button>
      <button type="button" class="btn-ghost" id="cancelCons">Cancelar</button>
    </div>`;
  },
  bind(root, patient, onSaved) {
    const padPac = makeSignaturePad(root.querySelector('#sigPaciente'));
    const padPro = makeSignaturePad(root.querySelector('#sigPro'));
    root.querySelector('#clearPac').addEventListener('click', () => padPac.clear());
    root.querySelector('#clearPro').addEventListener('click', () => padPro.clear());
    root.querySelector('#cancelCons').addEventListener('click', () => onSaved && onSaved(null));

    root.querySelector('#saveCons').addEventListener('click', async () => {
      if (!root.querySelector('#consAccept').checked) return toast('Marca la aceptación del paciente', true);
      try {
        await api('/clinical/consents', {
          method: 'POST',
          body: {
            patient_id: patient.id,
            accepted: true,
            signature_patient: padPac.dataURL(),
            signature_pro: padPro.dataURL(),
            patient_cedula: root.querySelector('#consCedula').value,
            signed_at: new Date().toISOString()
          }
        });
        toast('Consentimiento guardado');
        onSaved && onSaved(true);
      } catch (ex) { toast(ex.message, true); }
    });

    root.querySelector('#pdfCons').addEventListener('click', () => {
      Consentimiento.generarPDF(patient, {
        cedula: root.querySelector('#consCedula').value,
        firmaPac: padPac.dataURL(), firmaPro: padPro.dataURL()
      });
    });
  },
  generarPDF(patient, extra) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const W = doc.internal.pageSize.getWidth();
    let y = 56;
    doc.setFillColor(201, 162, 75); doc.rect(0, 0, W, 8, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(18); doc.setTextColor(74, 59, 42);
    doc.text('Tatiana Hernández — Cosmetología Estética', W / 2, y, { align: 'center' }); y += 22;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(11);
    doc.text('Consentimiento Informado · Tratamiento de Acné', W / 2, y, { align: 'center' }); y += 28;
    doc.setFontSize(10);
    doc.text(`Paciente: ${patient.first_name} ${patient.last_name}`, 56, y); y += 16;
    doc.text(`Documento: ${extra.cedula || patient.document || '—'}`, 56, y); y += 16;
    doc.text(`Fecha: ${new Date().toLocaleString('es-CO')}`, 56, y); y += 22;

    doc.setFontSize(9.5);
    DECLARACIONES.forEach((d, i) => {
      const lines = doc.splitTextToSize(`${i + 1}. ${d}`, W - 112);
      doc.text(lines, 56, y); y += lines.length * 12 + 4;
    });
    y += 10;
    if (extra.firmaPac) { try { doc.addImage(extra.firmaPac, 'PNG', 56, y, 150, 55); } catch (e) {} }
    if (extra.firmaPro) { try { doc.addImage(extra.firmaPro, 'PNG', W - 206, y, 150, 55); } catch (e) {} }
    y += 60;
    doc.line(56, y, 206, y); doc.line(W - 206, y, W - 56, y); y += 14;
    doc.setFontSize(8.5);
    doc.text('Firma del paciente y N° cédula', 56, y);
    doc.text('Firma cosmetóloga — Tatiana Hernández', W - 206, y);
    doc.save(`Consentimiento_${patient.last_name}_${patient.first_name}.pdf`);
    toast('PDF generado');
  }
};
