'use strict';
/* ============================================================
   Estado y router
   ============================================================ */
const view = document.getElementById('view');
let CURRENT_USER = null;

// Navegación lateral móvil
const sidebar = document.getElementById('sidebar');
const backdrop = document.getElementById('backdrop');
document.getElementById('menuToggle').addEventListener('click', () => {
  sidebar.classList.toggle('open'); backdrop.classList.toggle('show');
});
backdrop.addEventListener('click', () => { sidebar.classList.remove('open'); backdrop.classList.remove('show'); });
function closeMobileNav() { sidebar.classList.remove('open'); backdrop.classList.remove('show'); }

document.getElementById('logoutBtn').addEventListener('click', async () => {
  await api('/auth/logout', { method: 'POST' }).catch(() => {});
  window.location.href = '/login.html';
});

document.querySelectorAll('.sidebar [data-route]').forEach(a => {
  a.addEventListener('click', () => { go(a.dataset.route); closeMobileNav(); });
});
function setActive(route) {
  document.querySelectorAll('.sidebar [data-route]').forEach(a =>
    a.classList.toggle('active', a.dataset.route === route));
}

async function go(route, param) {
  document.getElementById('modal').classList.add('hidden'); // cierra modal/panel abierto
  document.getElementById('modalCard').style.maxWidth = '560px';
  setActive(route);
  view.innerHTML = `<div class="text-center text-muted-th py-5"><i class="fa-solid fa-spinner fa-spin fa-2x"></i></div>`;
  try {
    if (route === 'dashboard') await renderDashboard();
    else if (route === 'patients') await renderPatients();
    else if (route === 'new-patient') renderNewPatient();
    else if (route === 'patient') await renderPatientDetail(param);
    else if (route === 'agenda') await renderAgenda();
  } catch (e) { view.innerHTML = `<p style="color:var(--alerta)">${esc(e.message)}</p>`; }
}

/* ============================================================
   Dashboard
   ============================================================ */
async function renderDashboard() {
  const s = await api('/dashboard/stats');
  const maxMes = Math.max(1, ...s.porMes.map(m => m.c));
  view.innerHTML = `
    <div class="eyebrow">Panel</div>
    <h1 class="page-title">Hola, ${esc(CURRENT_USER.name.split(' ')[0])} 💛</h1>
    <p class="text-muted-th">Tu bienestar es mi prioridad, y tu equilibrio mi propósito.</p>

    <div class="grid-4 mt-3">
      <div class="stat"><div class="n">${s.totalPatients}</div><div class="l">Pacientes registrados</div></div>
      <div class="stat"><div class="n">${s.citasHoy}</div><div class="l">Citas hoy</div></div>
      <div class="stat"><div class="n">${s.totalSessions}</div><div class="l">Sesiones realizadas</div></div>
      <div class="stat"><div class="n">${s.totalFichas}</div><div class="l">Fichas técnicas</div></div>
    </div>

    <div class="grid-2 mt-4">
      <div class="card-th">
        <h3 style="font-size:1.2rem;">Pacientes nuevos por mes</h3>
        ${s.porMes.length ? `<div style="display:flex;align-items:flex-end;gap:.8rem;height:140px;margin-top:1rem;">
          ${s.porMes.map(m => `
            <div style="flex:1;text-align:center;">
              <div style="background:linear-gradient(180deg,var(--oro),var(--bronce));border-radius:8px 8px 0 0;height:${Math.round(m.c / maxMes * 110)}px;min-height:6px;"></div>
              <div class="text-muted-th" style="font-size:.72rem;margin-top:.3rem;">${esc(m.ym.slice(5))}</div>
              <div style="font-weight:600;color:var(--bronce);font-size:.85rem;">${m.c}</div>
            </div>`).join('')}
        </div>` : `<p class="text-muted-th">Aún no hay datos.</p>`}
      </div>
      <div class="card-th">
        <h3 style="font-size:1.2rem;">Próximas citas</h3>
        ${s.proximasCitas.length ? s.proximasCitas.map(c => `
          <div class="d-flex justify-content-between align-items-center py-2" style="border-bottom:1px solid var(--linea);">
            <div><strong>${esc((c.first_name || c.patient_name || 'Cita') + ' ' + (c.last_name || ''))}</strong>
              <div class="text-muted-th" style="font-size:.8rem;">${esc(c.service || 'Servicio')}</div></div>
            <div class="text-end" style="font-size:.82rem;">${fmtDateTime(c.datetime)}</div>
          </div>`).join('') : `<p class="text-muted-th">Sin citas próximas.</p>`}
      </div>
    </div>

    <div class="card-th mt-4">
      <h3 style="font-size:1.2rem;">Procedimientos más realizados</h3>
      ${s.topProcedimientos.length ? s.topProcedimientos.map(p => `
        <div class="d-flex align-items-center gap-2 my-2">
          <div style="flex:0 0 220px;font-size:.88rem;">${esc(p.nombre)}</div>
          <div style="flex:1;background:var(--crema-2);border-radius:50px;height:14px;overflow:hidden;">
            <div style="background:linear-gradient(90deg,var(--oro),var(--bronce));height:100%;width:${Math.round(p.total / s.topProcedimientos[0].total * 100)}%;"></div>
          </div>
          <strong style="color:var(--bronce);">${p.total}</strong>
        </div>`).join('') : `<p class="text-muted-th">Aún no hay sesiones registradas.</p>`}
    </div>`;
}

/* ============================================================
   Lista de pacientes
   ============================================================ */
async function renderPatients(q = '') {
  const list = await api('/patients' + (q ? '?q=' + encodeURIComponent(q) : ''));
  view.innerHTML = `
    <div class="d-flex justify-content-between align-items-center flex-wrap gap-2">
      <div><div class="eyebrow">Gestión</div><h1 class="page-title">Pacientes</h1></div>
      <button class="btn-oro" onclick="go('new-patient')"><i class="fa-solid fa-user-plus me-2"></i>Registrar</button>
    </div>
    <div class="my-3"><input id="searchP" class="form-control" placeholder="Buscar por nombre, documento o teléfono…" value="${esc(q)}" style="max-width:420px;"></div>
    ${list.length ? `<table class="table-th">
      <thead><tr><th>Paciente</th><th>Documento</th><th>Teléfono</th><th>Registro</th></tr></thead>
      <tbody>${list.map(p => `
        <tr onclick="go('patient', ${p.id})">
          <td><strong>${esc(p.first_name)} ${esc(p.last_name)}</strong></td>
          <td>${esc(p.document || '—')}</td>
          <td>${esc(p.phone || '—')}</td>
          <td class="text-muted-th">${fmtDate(p.created_at)}</td>
        </tr>`).join('')}</tbody>
    </table>` : `<div class="card-th text-center text-muted-th py-5">No hay pacientes que coincidan. Registra el primero.</div>`}`;

  const search = document.getElementById('searchP');
  let to;
  search.addEventListener('input', () => { clearTimeout(to); to = setTimeout(() => renderPatients(search.value.trim()), 300); });
}

/* ============================================================
   Registro de paciente
   ============================================================ */
function renderNewPatient(prefill = {}) {
  view.innerHTML = `
    <div class="eyebrow">Registro</div>
    <h1 class="page-title">Nuevo paciente</h1>
    <form id="patientForm" class="card-th mt-3" style="max-width:760px;">
      <div class="grid-2">
        <div><label class="form-label">Nombres *</label><input id="p_first" class="form-control" required></div>
        <div><label class="form-label">Apellidos *</label><input id="p_last" class="form-control" required></div>
        <div><label class="form-label">Documento</label><input id="p_doc" class="form-control"></div>
        <div><label class="form-label">Fecha de nacimiento</label><input type="date" id="p_birth" class="form-control"></div>
        <div><label class="form-label">Celular / WhatsApp</label><input id="p_phone" class="form-control"></div>
        <div><label class="form-label">Correo electrónico</label><input type="email" id="p_email" class="form-control"></div>
        <div><label class="form-label">EPS</label><input id="p_eps" class="form-control"></div>
        <div><label class="form-label">Ocupación</label><input id="p_occ" class="form-control"></div>
        <div><label class="form-label">Dirección</label><input id="p_addr" class="form-control"></div>
        <div><label class="form-label">Ciudad</label><input id="p_city" class="form-control"></div>
        <div><label class="form-label">Sexo</label>
          <select id="p_sex" class="form-select"><option value="">—</option><option>Femenino</option><option>Masculino</option><option>Otro</option></select></div>
        <div><label class="form-label">Grupo sanguíneo / RH</label>
          <select id="p_rh" class="form-select"><option value="">—</option>${['O+','O-','A+','A-','B+','B-','AB+','AB-'].map(r => `<option>${r}</option>`).join('')}</select></div>
      </div>
      <div class="d-flex gap-2 mt-4">
        <button type="submit" class="btn-oro"><i class="fa-solid fa-floppy-disk me-2"></i>Guardar paciente</button>
        <button type="button" class="btn-ghost" onclick="go('patients')">Cancelar</button>
      </div>
    </form>`;

  document.getElementById('patientForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const body = {
      first_name: val('p_first'), last_name: val('p_last'), document: val('p_doc'),
      birth_date: val('p_birth'), phone: val('p_phone'), email: val('p_email'),
      eps: val('p_eps'), occupation: val('p_occ'), address: val('p_addr'),
      city: val('p_city'), sex: val('p_sex'), rh: val('p_rh')
    };
    try {
      const p = await api('/patients', { method: 'POST', body });
      toast('Paciente registrado');
      go('patient', p.id);
    } catch (ex) { toast(ex.message, true); }
  });
}
const val = (id) => document.getElementById(id).value.trim();

/* ============================================================
   Detalle de paciente (historia clínica + acciones)
   ============================================================ */
async function renderPatientDetail(id) {
  const d = await api('/patients/' + id);
  const p = d.patient;
  const diag = d.diagnoses[0];
  view.innerHTML = `
    <a class="text-muted-th" style="cursor:pointer;" onclick="go('patients')"><i class="fa-solid fa-arrow-left me-1"></i>Pacientes</a>
    <div class="d-flex justify-content-between align-items-start flex-wrap gap-2 mt-2">
      <div>
        <h1 class="page-title">${esc(p.first_name)} ${esc(p.last_name)}</h1>
        <div class="text-muted-th">${esc(p.document || 'Sin documento')} · ${esc(p.phone || 'Sin teléfono')} · ${esc(p.sex || '')} ${esc(p.rh || '')}</div>
      </div>
      <div class="d-flex gap-2 flex-wrap">
        ${p.phone ? `<a class="btn-outline-oro" target="_blank" href="${waLink('Hola ' + p.first_name + ', te escribo de parte de Tatiana Hernández 💛')}"><i class="fa-brands fa-whatsapp me-1"></i>WhatsApp</a>` : ''}
        <button class="btn-oro" id="btnFicha"><i class="fa-solid fa-file-medical me-1"></i>Nueva ficha</button>
      </div>
    </div>

    <div class="grid-4 mt-3">
      <button class="btn-ghost" id="qFicha"><i class="fa-solid fa-file-medical me-1"></i>Ficha técnica</button>
      <button class="btn-ghost" id="qSesion"><i class="fa-solid fa-list-check me-1"></i>Nueva sesión</button>
      <button class="btn-ghost" id="qConsent"><i class="fa-solid fa-file-signature me-1"></i>Consentimiento</button>
      <button class="btn-ghost" id="qFoto"><i class="fa-solid fa-camera me-1"></i>Subir foto</button>
    </div>

    ${diag ? `<div class="card-th mt-4" style="background:var(--crema-2);">
      <div class="eyebrow">Último diagnóstico</div>
      <p class="mb-1" style="font-style:italic;">${esc(diag.auto_sugerencia || '')}</p>
      ${diag.diagnostico_detallado ? `<p class="mb-0 text-muted-th" style="font-size:.9rem;">${esc(diag.diagnostico_detallado)}</p>` : ''}
    </div>` : ''}

    <h3 class="serif mt-4" style="font-size:1.3rem;">Historia clínica</h3>
    <div id="tl" class="mt-2"></div>`;

  // Acciones
  const openFicha = () => panel(Ficha.renderForm(p), (root) => Ficha.bind(root, p, reload));
  document.getElementById('btnFicha').addEventListener('click', openFicha);
  document.getElementById('qFicha').addEventListener('click', openFicha);
  document.getElementById('qSesion').addEventListener('click', () => {
    const next = (d.sessions[0]?.session_number || 0) + 1;
    panel(Sesion.renderForm(p, next), (root) => Sesion.bind(root, p, reload));
  });
  document.getElementById('qConsent').addEventListener('click', () => {
    panel(Consentimiento.renderForm(p), (root) => Consentimiento.bind(root, p, reload));
  });
  document.getElementById('qFoto').addEventListener('click', () => subirFoto(p, reload));

  function reload(ok) { if (ok !== null) go('patient', id); else closePanel(); }

  // Línea de tiempo
  const tl = document.getElementById('tl');
  const eventos = [];
  d.fichas.forEach(f => eventos.push({ t: f.created_at, ic: 'fa-file-medical', titulo: 'Ficha técnica', desc: resumenFicha(f) }));
  d.sessions.forEach(s => eventos.push({ t: s.created_at, ic: 'fa-list-check', titulo: `Sesión ${s.session_number || ''}`, desc: (parseJSON(s.procedimientos, []) || []).join(', ') || '—' }));
  d.consents.forEach(c => eventos.push({ t: c.created_at, ic: 'fa-file-signature', titulo: 'Consentimiento firmado', desc: c.procedure_name }));
  d.photos.forEach(ph => eventos.push({ t: ph.taken_at, ic: 'fa-camera', titulo: `Foto (${ph.type})`, desc: ph.caption || '' }));
  eventos.sort((a, b) => (b.t || '').localeCompare(a.t || ''));

  tl.innerHTML = eventos.length ? `<div class="timeline">${eventos.map(e => `
    <div class="ev">
      <div class="d-flex justify-content-between"><strong><i class="fa-solid ${e.ic} me-2" style="color:var(--bronce)"></i>${esc(e.titulo)}</strong>
        <span class="text-muted-th" style="font-size:.8rem;">${fmtDateTime(e.t)}</span></div>
      <div class="text-muted-th" style="font-size:.88rem;">${esc(e.desc)}</div>
    </div>`).join('')}</div>` : `<div class="card-th text-center text-muted-th py-4">Sin registros aún. Comienza con la ficha técnica.</div>`;
}

function resumenFicha(f) {
  const tipo = parseJSON(f.tipo_piel, []) || [];
  const afec = parseJSON(f.afecciones, []) || [];
  return [tipo.length ? 'Piel: ' + tipo.join(', ') : '', afec.length ? 'Afecciones: ' + afec.join(', ') : ''].filter(Boolean).join(' · ') || 'Registro de valoración';
}

/* Panel deslizable (reutiliza el modal a pantalla grande) */
function panel(html, bind) {
  const card = document.getElementById('modalCard');
  card.style.maxWidth = '760px';
  card.innerHTML = `<div class="d-flex justify-content-end"><button class="btn-ghost" onclick="closePanel()"><i class="fa-solid fa-xmark"></i></button></div>` + html;
  document.getElementById('modal').classList.remove('hidden');
  if (bind) bind(card);
}
function closePanel() { document.getElementById('modal').classList.add('hidden'); }

/* Subida de foto clínica (base64) */
function subirFoto(patient, onSaved) {
  panel(`
    <h3 class="serif" style="font-size:1.3rem;">Fotografía clínica</h3>
    <label class="form-label">Tipo</label>
    <div class="pill-group" data-pillgroup="ftipo">
      ${['antes','durante','despues'].map((t, i) => `<span class="pill${i === 0 ? ' on' : ''}" data-val="${t}">${t}</span>`).join('')}
    </div>
    <label class="form-label mt-3">Imagen (galería o cámara)</label>
    <input type="file" id="fInput" accept="image/*" capture="environment" class="form-control">
    <img id="fPrev" class="mt-3 hidden" style="max-width:100%;border-radius:12px;">
    <input class="form-control mt-3" id="fCap" placeholder="Descripción (opcional)">
    <div class="d-flex gap-2 mt-4">
      <button class="btn-oro" id="fSave"><i class="fa-solid fa-floppy-disk me-2"></i>Guardar foto</button>
      <button class="btn-ghost" onclick="closePanel()">Cancelar</button>
    </div>`, (root) => {
    bindChips(root);
    let dataUrl = null;
    root.querySelector('#fInput').addEventListener('change', (e) => {
      const file = e.target.files[0]; if (!file) return;
      const reader = new FileReader();
      reader.onload = () => { dataUrl = reader.result; const img = root.querySelector('#fPrev'); img.src = dataUrl; img.classList.remove('hidden'); };
      reader.readAsDataURL(file);
    });
    root.querySelector('#fSave').addEventListener('click', async () => {
      if (!dataUrl) return toast('Selecciona una imagen', true);
      try {
        await api('/clinical/photos', { method: 'POST', body: { patient_id: patient.id, type: readPill(root, 'ftipo'), data: dataUrl, caption: root.querySelector('#fCap').value } });
        toast('Foto guardada'); onSaved && onSaved(true);
      } catch (ex) { toast(ex.message, true); }
    });
  });
}

/* ============================================================
   Agenda
   ============================================================ */
async function renderAgenda() {
  const citas = await api('/clinical/appointments');
  view.innerHTML = `
    <div class="d-flex justify-content-between align-items-center flex-wrap gap-2">
      <div><div class="eyebrow">Organización</div><h1 class="page-title">Agenda</h1></div>
      <button class="btn-oro" id="newAppt"><i class="fa-solid fa-plus me-2"></i>Nueva cita</button>
    </div>
    ${citas.length ? `<table class="table-th mt-3">
      <thead><tr><th>Fecha y hora</th><th>Paciente</th><th>Servicio</th><th>Estado</th><th></th></tr></thead>
      <tbody>${citas.map(c => `
        <tr>
          <td>${fmtDateTime(c.datetime)}</td>
          <td>${esc(c.patient_name || '—')}</td>
          <td>${esc(c.service || '—')}</td>
          <td><span class="badge-th badge-${esc(c.status)}">${esc(c.status)}</span></td>
          <td class="text-end">
            ${c.phone ? `<a class="btn-ghost" target="_blank" href="${waLink('Hola ' + (c.patient_name || '') + ', te recuerdo tu cita el ' + fmtDateTime(c.datetime) + ' 💛')}" title="Recordatorio WhatsApp"><i class="fa-brands fa-whatsapp"></i></a>` : ''}
            <button class="btn-ghost" onclick="cancelAppt(${c.id})" title="Cancelar"><i class="fa-solid fa-xmark"></i></button>
          </td>
        </tr>`).join('')}</tbody>
    </table>` : `<div class="card-th text-center text-muted-th py-5 mt-3">No hay citas agendadas.</div>`}`;

  document.getElementById('newAppt').addEventListener('click', async () => {
    const pacientes = await api('/patients');
    panel(`
      <h3 class="serif" style="font-size:1.3rem;">Nueva cita</h3>
      <label class="form-label">Paciente</label>
      <select id="a_pat" class="form-select"><option value="">— Sin registrar —</option>
        ${pacientes.map(p => `<option value="${p.id}" data-name="${esc(p.first_name + ' ' + p.last_name)}" data-phone="${esc(p.phone || '')}">${esc(p.first_name)} ${esc(p.last_name)}</option>`).join('')}</select>
      <div class="grid-2 mt-3">
        <div><label class="form-label">Nombre (si no está registrado)</label><input id="a_name" class="form-control"></div>
        <div><label class="form-label">Teléfono</label><input id="a_phone" class="form-control"></div>
      </div>
      <div class="grid-2 mt-3">
        <div><label class="form-label">Fecha y hora</label><input type="datetime-local" id="a_dt" class="form-control"></div>
        <div><label class="form-label">Servicio</label><input id="a_srv" class="form-control" placeholder="Ej. Limpieza facial"></div>
      </div>
      <div class="mt-3"><label class="form-label">Notas</label><textarea id="a_notes" rows="2"></textarea></div>
      <div class="d-flex gap-2 mt-4">
        <button class="btn-oro" id="a_save"><i class="fa-solid fa-floppy-disk me-2"></i>Agendar</button>
        <button class="btn-ghost" onclick="closePanel()">Cancelar</button>
      </div>`, (root) => {
      const sel = root.querySelector('#a_pat');
      sel.addEventListener('change', () => {
        const o = sel.selectedOptions[0];
        root.querySelector('#a_name').value = o.dataset.name || '';
        root.querySelector('#a_phone').value = o.dataset.phone || '';
      });
      root.querySelector('#a_save').addEventListener('click', async () => {
        const dt = root.querySelector('#a_dt').value;
        if (!dt) return toast('Indica fecha y hora', true);
        try {
          await api('/clinical/appointments', { method: 'POST', body: {
            patient_id: sel.value || null,
            patient_name: root.querySelector('#a_name').value || null,
            phone: root.querySelector('#a_phone').value || null,
            datetime: dt, service: root.querySelector('#a_srv').value,
            notes: root.querySelector('#a_notes').value
          }});
          toast('Cita agendada'); closePanel(); go('agenda');
        } catch (ex) { toast(ex.message, true); }
      });
    });
  });
}
async function cancelAppt(id) {
  const citas = await api('/clinical/appointments');
  const c = citas.find(x => x.id === id); if (!c) return;
  try {
    await api('/clinical/appointments/' + id, { method: 'PUT', body: { datetime: c.datetime, service: c.service, status: 'cancelada', notes: c.notes } });
    toast('Cita cancelada'); go('agenda');
  } catch (e) { toast(e.message, true); }
}

/* ============================================================
   Arranque
   ============================================================ */
(async function init() {
  try {
    const me = await api('/auth/me');
    CURRENT_USER = me.user;
    document.getElementById('userBox').innerHTML = `<i class="fa-solid fa-user me-1"></i>${esc(CURRENT_USER.name)}`;
    go('dashboard');
  } catch (e) { window.location.href = '/login.html'; }
})();
