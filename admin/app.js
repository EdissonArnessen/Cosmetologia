/* ============================================================================
 *  PANEL DE ADMINISTRACIÓN — Tatiana Hernández · Estética Integral
 *  Fase 1 (cimientos): login por roles + Clientes + Profesionales + Servicios
 *                      + Usuarios del panel + Dashboard.
 *  Backend: Firebase (Auth + Firestore).  Config en ./config.js
 * ========================================================================== */
import { firebaseConfig, CONFIGURADO } from './config.js';

const SDK = 'https://www.gstatic.com/firebasejs/10.12.5';
const CATEGORIAS = [
  'Masajes relajantes',
  'Masaje descontracturante',
  'Tratamiento de bienestar avanzado',
  'Limpieza facial profunda',
  'Estética avanzada y armonía facial'
];
const ROLES = { admin:'Administrador', recepcion:'Recepcionista', profesional:'Profesional' };
const DIAS = ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'];

/* ---------- utilidades DOM ---------- */
const $  = (s, r=document) => r.querySelector(s);
const el = (sel) => document.getElementById(sel);
function esc(s){ return String(s==null?'':s).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function toast(msg, tipo){ const t=el('toast'); t.textContent=msg; t.className='toast show '+(tipo||''); setTimeout(()=>t.classList.remove('show'), 3200); }
function initials(n){ return (n||'?').trim().split(/\s+/).slice(0,2).map(w=>w[0]||'').join('').toUpperCase(); }
function money(n){ const v=Number(n)||0; return '$'+v.toLocaleString('es-CO'); }

/* ---------- estado ---------- */
const fb = {};
let usuario = null;     // Firebase Auth user
let perfil  = null;     // doc /usuarios/{uid}
let cacheServicios = [];
let cacheProfesionales = [];

/* ============================================================
 * Carga de Firebase (SDK modular por CDN)
 * ============================================================ */
async function loadFirebase(){
  const appMod  = await import(`${SDK}/firebase-app.js`);
  const authMod = await import(`${SDK}/firebase-auth.js`);
  const fsMod   = await import(`${SDK}/firebase-firestore.js`);
  fb.app  = appMod.initializeApp(firebaseConfig);
  fb.auth = authMod.getAuth(fb.app);
  fb.db   = fsMod.getFirestore(fb.app);
  Object.assign(fb, {
    _app: appMod, _auth: authMod, _fs: fsMod,
    signIn: authMod.signInWithEmailAndPassword,
    signOut: authMod.signOut,
    onAuth: authMod.onAuthStateChanged,
    createUser: authMod.createUserWithEmailAndPassword,
    collection: fsMod.collection, doc: fsMod.doc,
    getDoc: fsMod.getDoc, getDocs: fsMod.getDocs,
    addDoc: fsMod.addDoc, setDoc: fsMod.setDoc,
    updateDoc: fsMod.updateDoc, deleteDoc: fsMod.deleteDoc,
    query: fsMod.query, where: fsMod.where, orderBy: fsMod.orderBy,
    serverTimestamp: fsMod.serverTimestamp
  });
}

/* ============================================================
 * Arranque
 * ============================================================ */
if(!CONFIGURADO){ renderSetup(); }
else { arrancar(); }

async function arrancar(){
  try{ await loadFirebase(); }
  catch(e){ console.error(e); el('loginErr').textContent = 'No se pudo conectar con Firebase. Revisa tu conexión.'; return; }
  wireLogin();
  fb.onAuth(fb.auth, onAuthChange);
}

/* ============================================================
 * Autenticación
 * ============================================================ */
function wireLogin(){
  el('loginForm').addEventListener('submit', async (e)=>{
    e.preventDefault();
    const email = el('email').value.trim();
    const pass  = el('pass').value;
    const btn = el('loginBtn'); const err = el('loginErr');
    err.textContent = ''; btn.disabled = true; btn.textContent = 'Ingresando…';
    try{
      await fb.signIn(fb.auth, email, pass);
    }catch(ex){
      err.textContent = codigoAuth(ex.code);
      btn.disabled = false; btn.textContent = 'Ingresar';
    }
  });
  el('logoutBtn').addEventListener('click', ()=> fb.signOut(fb.auth));
}
function codigoAuth(code){
  const m = {
    'auth/invalid-email':'Correo no válido.',
    'auth/user-not-found':'No existe una cuenta con ese correo.',
    'auth/wrong-password':'Contraseña incorrecta.',
    'auth/invalid-credential':'Correo o contraseña incorrectos.',
    'auth/too-many-requests':'Demasiados intentos. Espera unos minutos.',
    'auth/user-disabled':'Esta cuenta está deshabilitada.'
  };
  return m[code] || 'No se pudo iniciar sesión. Intenta de nuevo.';
}

async function onAuthChange(u){
  const btn = el('loginBtn'); if(btn){ btn.disabled=false; btn.textContent='Ingresar'; }
  if(!u){ usuario=null; perfil=null; mostrarLogin(); return; }
  usuario = u;
  // Cargar perfil (rol)
  try{
    const snap = await fb.getDoc(fb.doc(fb.db,'usuarios',u.uid));
    if(!snap.exists()){
      el('loginErr').textContent = 'Tu usuario no está habilitado en el panel. Contacta a la administradora.';
      await fb.signOut(fb.auth); return;
    }
    perfil = { id:u.uid, ...snap.data() };
    if(perfil.activo === false){
      el('loginErr').textContent = 'Tu cuenta está inactiva. Contacta a la administradora.';
      await fb.signOut(fb.auth); return;
    }
  }catch(ex){
    console.error(ex);
    el('loginErr').textContent = 'No se pudo cargar tu perfil. Revisa las reglas de seguridad.';
    await fb.signOut(fb.auth); return;
  }
  mostrarApp();
}

function mostrarLogin(){ el('app').classList.add('hidden'); el('loginWrap').classList.remove('hidden'); el('pass').value=''; }
function mostrarApp(){
  el('loginWrap').classList.add('hidden'); el('app').classList.remove('hidden');
  el('sbAvatar').textContent = initials(perfil.nombre || usuario.email);
  el('sbName').textContent = perfil.nombre || usuario.email;
  el('sbRole').textContent = ROLES[perfil.rol] || perfil.rol;
  construirMenu();
  wireChrome();
  const inicial = (location.hash||'#dashboard').slice(1);
  irA(permitido(inicial) ? inicial : 'dashboard');
}

/* ============================================================
 * Menú lateral según rol
 * ============================================================ */
const MENU = [
  { id:'dashboard',    label:'Dashboard',          roles:['admin','recepcion','profesional'], icon:'M3 13h8V3H3zM13 21h8V11h-8zM13 3v6h8V3zM3 21h8v-6H3z' },
  { id:'agenda',       label:'Agenda',             roles:['admin','recepcion','profesional'], icon:'M3 5h18v16H3zM3 9h18M8 3v4M16 3v4', soon:true },
  { id:'clientes',     label:'Clientes',           roles:['admin','recepcion'],               icon:'M16 21v-2a4 4 0 00-8 0v2M12 11a4 4 0 100-8 4 4 0 000 8' },
  { id:'profesionales',label:'Profesionales',      roles:['admin'],                           icon:'M17 21v-2a4 4 0 00-4-4H7a4 4 0 00-4 4v2M11 11a4 4 0 100-8 4 4 0 000 8M21 21v-2a4 4 0 00-3-3.8' },
  { id:'servicios',    label:'Servicios',          roles:['admin'],                           icon:'M4 7l8-4 8 4-8 4zM4 7v10l8 4 8-4V7' },
  { id:'fichas',       label:'Fichas de atención', roles:['admin','profesional'],             icon:'M6 3h9l5 5v13H6zM14 3v5h5M9 13h6M9 17h4', soon:true },
  { id:'pagos',        label:'Pagos y caja',       roles:['admin','recepcion'],               icon:'M3 7h18v10H3zM3 11h18M7 15h4', soon:true },
  { id:'reportes',     label:'Reportes',           roles:['admin'],                           icon:'M4 20V9M10 20V4M16 20v-7M22 20H2', soon:true },
  { id:'usuarios',     label:'Usuarios',           roles:['admin'],                           icon:'M16 21v-2a4 4 0 00-8 0v2M12 11a4 4 0 100-8 4 4 0 000 8M20 8v6M23 11h-6' },
  { id:'configuracion',label:'Configuración',      roles:['admin'],                           icon:'M12 15a3 3 0 100-6 3 3 0 000 6zM19 12a7 7 0 00-.1-1l2-1.6-2-3.4-2.3 1a7 7 0 00-1.7-1l-.3-2.4H9.4l-.3 2.4a7 7 0 00-1.7 1l-2.3-1-2 3.4L5 11a7 7 0 000 2l-2 1.6 2 3.4 2.3-1a7 7 0 001.7 1l.3 2.4h4.2l.3-2.4a7 7 0 001.7-1l2.3 1 2-3.4-2-1.6a7 7 0 00.1-1z', soon:true }
];
function permitido(id){ const m = MENU.find(x=>x.id===id); return m && m.roles.includes(perfil.rol); }
function construirMenu(){
  const nav = el('sbNav');
  nav.innerHTML = MENU.filter(m=>m.roles.includes(perfil.rol)).map(m=>
    `<button class="sb-link" data-ir="${m.id}">
       <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="${m.icon}"/></svg>
       <span>${m.label}</span>${m.soon?' <small style="opacity:.6;font-size:.62rem">· pronto</small>':''}
     </button>`
  ).join('');
  nav.querySelectorAll('[data-ir]').forEach(b=> b.addEventListener('click', ()=>{ irA(b.getAttribute('data-ir')); cerrarSidebar(); }));
}
function wireChrome(){
  el('hamb').onclick = ()=>{ el('sidebar').classList.toggle('open'); el('sbOverlay').classList.toggle('open'); };
  el('sbOverlay').onclick = cerrarSidebar;
}
function cerrarSidebar(){ el('sidebar').classList.remove('open'); el('sbOverlay').classList.remove('open'); }

/* ============================================================
 * Router
 * ============================================================ */
function irA(id){
  if(!permitido(id)) id='dashboard';
  location.hash = '#'+id;
  el('sbNav').querySelectorAll('.sb-link').forEach(b=> b.classList.toggle('active', b.getAttribute('data-ir')===id));
  const titulos = {dashboard:'Dashboard',agenda:'Agenda',clientes:'Clientes',profesionales:'Profesionales',servicios:'Servicios',fichas:'Fichas de atención',pagos:'Pagos y caja',reportes:'Reportes',usuarios:'Usuarios',configuracion:'Configuración'};
  el('viewTitle').textContent = titulos[id] || id;
  const v = el('view'); v.innerHTML = '<div class="loading">Cargando…</div>';
  ({
    dashboard: vistaDashboard, clientes: vistaClientes, profesionales: vistaProfesionales,
    servicios: vistaServicios, usuarios: vistaUsuarios
  }[id] || vistaProximamente)(v);
}
function vistaProximamente(v){
  v.innerHTML = `<div class="panel"><div class="empty">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M12 8v4l3 2M21 12a9 9 0 11-9-9"/></svg>
    <h3>Próximamente</h3><p>Este módulo se construye en la siguiente fase del sistema.</p></div></div>`;
}

/* ============================================================
 * Auditoría
 * ============================================================ */
async function auditar(accion, entidad, detalle){
  try{
    await fb.addDoc(fb.collection(fb.db,'auditoria'), {
      accion, entidad, detalle: detalle||'', porUid: usuario.uid,
      porNombre: perfil.nombre||usuario.email, rol: perfil.rol, en: fb.serverTimestamp()
    });
  }catch(_){/* la auditoría nunca interrumpe la operación */}
}

/* ============================================================
 * Modal genérico
 * ============================================================ */
function modal({ titulo, cuerpo, guardar, textoGuardar='Guardar' }){
  let m = el('modalRoot');
  if(!m){ m = document.createElement('div'); m.id='modalRoot'; document.body.appendChild(m); }
  m.innerHTML = `
    <div class="modal open">
      <div class="modal-bg" data-cerrar></div>
      <div class="modal-card">
        <div class="modal-head"><h3>${esc(titulo)}</h3><button class="modal-close" data-cerrar>&times;</button></div>
        <div class="modal-body">${cuerpo}</div>
        <div class="modal-foot">
          <button class="btn btn-ghost" data-cerrar>Cancelar</button>
          <button class="btn btn-gold" id="mGuardar">${esc(textoGuardar)}</button>
        </div>
      </div>
    </div>`;
  const cerrar = ()=>{ m.innerHTML=''; };
  m.querySelectorAll('[data-cerrar]').forEach(b=> b.addEventListener('click', cerrar));
  el('mGuardar').addEventListener('click', async ()=>{
    const btn = el('mGuardar'); btn.disabled=true; btn.textContent='Guardando…';
    try{ const ok = await guardar(); if(ok!==false) cerrar(); }
    catch(ex){ console.error(ex); toast(ex.message||'No se pudo guardar','bad'); }
    finally{ if(el('mGuardar')){ btn.disabled=false; btn.textContent=textoGuardar; } }
  });
  return { cerrar };
}
async function confirmar(msg){ return window.confirm(msg); }

/* ============================================================
 * DASHBOARD
 * ============================================================ */
async function vistaDashboard(v){
  v.innerHTML = `
    <div class="welcome">
      <h2>Bienvenida a tu <span>espacio de bienestar</span></h2>
      <p>Un lugar donde la belleza, la armonía y la tranquilidad se encuentran.</p>
    </div>
    <div class="kpi-grid" id="kpis"></div>
    <div class="panel"><div class="panel-head"><h3>Próximas citas</h3></div>
      <div class="empty">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M3 5h18v16H3zM3 9h18M8 3v4M16 3v4"/></svg>
        <p>El calendario de citas llega en la Fase 2 (módulo Agenda).</p>
      </div>
    </div>`;
  const defs = [
    { k:'Clientes activos', col:'clientes', filtro:c=>c.activo!==false, ic:'M16 21v-2a4 4 0 00-8 0v2M12 11a4 4 0 100-8 4 4 0 000 8' },
    { k:'Profesionales',    col:'profesionales', filtro:p=>p.activo!==false, ic:'M17 21v-2a4 4 0 00-4-4H7a4 4 0 00-4 4v2M11 11a4 4 0 100-8 4 4 0 000 8' },
    { k:'Servicios activos',col:'servicios', filtro:s=>s.activo!==false, ic:'M4 7l8-4 8 4-8 4zM4 7v10l8 4 8-4V7' }
  ];
  const cont = el('kpis');
  cont.innerHTML = defs.map(d=>`<div class="kpi"><div class="ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="${d.ic}"/></svg></div><div class="v" id="kpi-${d.col}">—</div><div class="k">${d.k}</div></div>`).join('')
    + `<div class="kpi"><div class="ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M3 5h18v16H3zM3 9h18M8 3v4M16 3v4"/></svg></div><div class="v">—</div><div class="k">Citas hoy · Fase 2</div></div>`;
  for(const d of defs){
    try{
      const snap = await fb.getDocs(fb.collection(fb.db, d.col));
      const n = snap.docs.map(x=>x.data()).filter(d.filtro).length;
      const cell = el('kpi-'+d.col); if(cell) cell.textContent = n;
    }catch(_){ const cell = el('kpi-'+d.col); if(cell) cell.textContent='—'; }
  }
}

/* ============================================================
 * CLIENTES
 * ============================================================ */
async function vistaClientes(v){
  const puedeEditar = ['admin','recepcion'].includes(perfil.rol);
  v.innerHTML = `
    <div class="panel">
      <div class="panel-head">
        <h3>Clientes</h3><div class="spacer"></div>
        <div class="search"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4-4"/></svg>
          <input id="buscarCli" placeholder="Buscar por nombre, cédula o teléfono"></div>
        ${puedeEditar?'<button class="btn btn-gold btn-sm" id="nuevoCli">+ Nuevo cliente</button>':''}
      </div>
      <div class="table-wrap"><table>
        <thead><tr><th>Cliente</th><th>Identificación</th><th>Teléfono</th><th>Correo</th><th>Estado</th><th></th></tr></thead>
        <tbody id="cliBody"><tr><td colspan="6" class="loading">Cargando…</td></tr></tbody>
      </table></div>
    </div>`;
  let datos = [];
  try{
    const snap = await fb.getDocs(fb.collection(fb.db,'clientes'));
    datos = snap.docs.map(d=>({id:d.id, ...d.data()}));
    datos.sort((a,b)=>(a.nombres||'').localeCompare(b.nombres||''));
  }catch(ex){ el('cliBody').innerHTML = `<tr><td colspan="6" class="empty">No se pudieron cargar los clientes.<br><small>${esc(ex.message)}</small></td></tr>`; return; }

  function pintar(lista){
    const body = el('cliBody');
    if(!lista.length){ body.innerHTML = `<tr><td colspan="6"><div class="empty"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0116 0"/></svg><p>Aún no hay clientes registrados.</p></div></td></tr>`; return; }
    body.innerHTML = lista.map(c=>`
      <tr>
        <td><div class="t-strong">${esc((c.nombres||'')+' '+(c.apellidos||''))}</div>${c.fechaNacimiento?`<div class="t-sub">Nac.: ${esc(c.fechaNacimiento)}</div>`:''}</td>
        <td>${esc(c.identificacion||'—')}</td>
        <td>${esc(c.telefono||'—')}</td>
        <td>${esc(c.email||'—')}</td>
        <td><span class="badge ${c.activo===false?'off':'on'}">${c.activo===false?'Inactivo':'Activo'}</span></td>
        <td><div class="row-actions">
          ${puedeEditar?`<button class="icon-btn" data-edit="${c.id}" title="Editar"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z"/></svg></button>`:''}
          ${puedeEditar?`<button class="icon-btn" data-toggle="${c.id}" title="Activar/Inactivar"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M18 6L6 18M6 6l12 12"/></svg></button>`:''}
        </div></td>
      </tr>`).join('');
    body.querySelectorAll('[data-edit]').forEach(b=> b.onclick=()=> formCliente(datos.find(x=>x.id===b.getAttribute('data-edit')), recargar));
    body.querySelectorAll('[data-toggle]').forEach(b=> b.onclick=()=> toggleCliente(datos.find(x=>x.id===b.getAttribute('data-toggle')), recargar));
  }
  async function recargar(){ irA('clientes'); }
  pintar(datos);
  el('buscarCli').addEventListener('input', (e)=>{
    const q = e.target.value.toLowerCase().trim();
    pintar(!q ? datos : datos.filter(c=> (`${c.nombres||''} ${c.apellidos||''} ${c.identificacion||''} ${c.telefono||''}`).toLowerCase().includes(q)));
  });
  if(puedeEditar) el('nuevoCli').onclick = ()=> formCliente(null, recargar);
}

function formCliente(c, onOk){
  const e = c||{};
  modal({
    titulo: c?'Editar cliente':'Nuevo cliente',
    cuerpo: `
      <div class="grid2">
        <div class="field"><label>Nombres *</label><input id="f_nombres" value="${esc(e.nombres)}"></div>
        <div class="field"><label>Apellidos *</label><input id="f_apellidos" value="${esc(e.apellidos)}"></div>
        <div class="field"><label>Identificación</label><input id="f_id" value="${esc(e.identificacion)}"></div>
        <div class="field"><label>Teléfono *</label><input id="f_tel" value="${esc(e.telefono)}"></div>
        <div class="field"><label>WhatsApp</label><input id="f_wa" value="${esc(e.whatsapp)}"></div>
        <div class="field"><label>Correo electrónico</label><input id="f_email" type="email" value="${esc(e.email)}"></div>
        <div class="field"><label>Fecha de nacimiento</label><input id="f_nac" type="date" value="${esc(e.fechaNacimiento)}"></div>
        <div class="field"><label>Estado</label><select id="f_activo"><option value="si"${e.activo!==false?' selected':''}>Activo</option><option value="no"${e.activo===false?' selected':''}>Inactivo</option></select></div>
        <div class="field full"><label>Observaciones</label><textarea id="f_obs" rows="2">${esc(e.observaciones)}</textarea></div>
      </div>`,
    guardar: async ()=>{
      const nombres=el('f_nombres').value.trim(), apellidos=el('f_apellidos').value.trim(), tel=el('f_tel').value.trim();
      if(!nombres||!apellidos||!tel){ toast('Completa nombres, apellidos y teléfono.','bad'); return false; }
      const data = {
        nombres, apellidos, identificacion:el('f_id').value.trim(), telefono:tel,
        whatsapp:el('f_wa').value.trim(), email:el('f_email').value.trim(),
        fechaNacimiento:el('f_nac').value, observaciones:el('f_obs').value.trim(),
        activo: el('f_activo').value==='si'
      };
      if(c){ await fb.updateDoc(fb.doc(fb.db,'clientes',c.id), data); await auditar('editar','cliente',`${nombres} ${apellidos}`); toast('Cliente actualizado','ok'); }
      else { data.fechaRegistro = new Date().toISOString().slice(0,10); data.creadoEn = fb.serverTimestamp();
             await fb.addDoc(fb.collection(fb.db,'clientes'), data); await auditar('crear','cliente',`${nombres} ${apellidos}`); toast('Cliente registrado','ok'); }
      onOk && onOk();
    }
  });
}
async function toggleCliente(c, onOk){
  const nuevo = c.activo===false;
  if(!await confirmar(`¿${nuevo?'Activar':'Inactivar'} a ${c.nombres} ${c.apellidos}?`)) return;
  await fb.updateDoc(fb.doc(fb.db,'clientes',c.id), { activo:nuevo });
  await auditar(nuevo?'activar':'inactivar','cliente',`${c.nombres} ${c.apellidos}`);
  toast(nuevo?'Cliente activado':'Cliente inactivado','ok'); onOk && onOk();
}

/* ============================================================
 * SERVICIOS
 * ============================================================ */
async function vistaServicios(v){
  v.innerHTML = `
    <div class="panel">
      <div class="panel-head">
        <h3>Catálogo de servicios</h3><div class="spacer"></div>
        <button class="btn btn-gold btn-sm" id="nuevoSrv">+ Nuevo servicio</button>
      </div>
      <div class="table-wrap"><table>
        <thead><tr><th>Servicio</th><th>Categoría</th><th>Precio</th><th>Duración</th><th>Estado</th><th></th></tr></thead>
        <tbody id="srvBody"><tr><td colspan="6" class="loading">Cargando…</td></tr></tbody>
      </table></div>
    </div>`;
  let datos=[];
  try{
    const snap = await fb.getDocs(fb.collection(fb.db,'servicios'));
    datos = snap.docs.map(d=>({id:d.id, ...d.data()}));
    cacheServicios = datos;
    datos.sort((a,b)=> CATEGORIAS.indexOf(a.categoria)-CATEGORIAS.indexOf(b.categoria) || (a.nombre||'').localeCompare(b.nombre||''));
  }catch(ex){ el('srvBody').innerHTML=`<tr><td colspan="6" class="empty">No se pudieron cargar los servicios.<br><small>${esc(ex.message)}</small></td></tr>`; return; }
  const body = el('srvBody');
  if(!datos.length){
    body.innerHTML = `<tr><td colspan="6"><div class="empty">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3"><path d="M4 7l8-4 8 4-8 4zM4 7v10l8 4 8-4V7"/></svg>
      <p>Aún no hay servicios.</p>
      <button class="btn btn-ghost btn-sm" id="seed">Cargar catálogo base (5 servicios)</button>
    </div></td></tr>`;
    el('seed').onclick = sembrarServicios;
  } else {
    body.innerHTML = datos.map(s=>`
      <tr>
        <td><div class="t-strong">${esc(s.nombre)}</div>${s.descripcion?`<div class="t-sub">${esc((s.descripcion||'').slice(0,70))}${(s.descripcion||'').length>70?'…':''}</div>`:''}</td>
        <td><span class="badge cat">${esc(s.categoria||'—')}</span></td>
        <td>${s.precio?money(s.precio):'—'}</td>
        <td>${s.duracionMin?esc(s.duracionMin)+' min':'—'}</td>
        <td><span class="badge ${s.activo===false?'off':'on'}">${s.activo===false?'Inactivo':'Activo'}</span></td>
        <td><div class="row-actions">
          <button class="icon-btn" data-edit="${s.id}" title="Editar"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z"/></svg></button>
          <button class="icon-btn" data-toggle="${s.id}" title="Activar/Inactivar"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
        </div></td>
      </tr>`).join('');
    body.querySelectorAll('[data-edit]').forEach(b=> b.onclick=()=> formServicio(datos.find(x=>x.id===b.getAttribute('data-edit')), ()=>irA('servicios')));
    body.querySelectorAll('[data-toggle]').forEach(b=> b.onclick=async()=>{ const s=datos.find(x=>x.id===b.getAttribute('data-toggle')); const nuevo=s.activo===false; await fb.updateDoc(fb.doc(fb.db,'servicios',s.id),{activo:nuevo}); await auditar(nuevo?'activar':'inactivar','servicio',s.nombre); toast('Estado actualizado','ok'); irA('servicios'); });
  }
  el('nuevoSrv').onclick = ()=> formServicio(null, ()=>irA('servicios'));
}

function formServicio(s, onOk){
  const e = s||{};
  const opts = CATEGORIAS.map(c=>`<option ${e.categoria===c?'selected':''}>${esc(c)}</option>`).join('');
  modal({
    titulo: s?'Editar servicio':'Nuevo servicio',
    cuerpo:`
      <div class="grid2">
        <div class="field full"><label>Nombre *</label><input id="s_nombre" value="${esc(e.nombre)}"></div>
        <div class="field full"><label>Categoría *</label><select id="s_cat">${opts}</select></div>
        <div class="field full"><label>Descripción</label><textarea id="s_desc" rows="2">${esc(e.descripcion)}</textarea></div>
        <div class="field"><label>Precio (COP)</label><input id="s_precio" type="number" min="0" value="${esc(e.precio)}"></div>
        <div class="field"><label>Duración (min)</label><input id="s_dur" type="number" min="0" value="${esc(e.duracionMin)}"></div>
        <div class="field"><label>Preparación (min)</label><input id="s_prep" type="number" min="0" value="${esc(e.prepMin)}"></div>
        <div class="field"><label>Limpieza cabina (min)</label><input id="s_limp" type="number" min="0" value="${esc(e.limpiezaMin)}"></div>
        <div class="field full"><label>Estado</label><select id="s_activo"><option value="si"${e.activo!==false?' selected':''}>Activo</option><option value="no"${e.activo===false?' selected':''}>Inactivo</option></select></div>
      </div>
      <p class="hint">Los profesionales habilitados para cada servicio se asignan desde el módulo <b>Profesionales</b>.</p>`,
    guardar: async ()=>{
      const nombre=el('s_nombre').value.trim();
      if(!nombre){ toast('El nombre es obligatorio.','bad'); return false; }
      const data = { nombre, categoria:el('s_cat').value, descripcion:el('s_desc').value.trim(),
        precio:Number(el('s_precio').value)||0, duracionMin:Number(el('s_dur').value)||0,
        prepMin:Number(el('s_prep').value)||0, limpiezaMin:Number(el('s_limp').value)||0,
        activo: el('s_activo').value==='si' };
      if(s){ await fb.updateDoc(fb.doc(fb.db,'servicios',s.id), data); await auditar('editar','servicio',nombre); toast('Servicio actualizado','ok'); }
      else { data.creadoEn=fb.serverTimestamp(); await fb.addDoc(fb.collection(fb.db,'servicios'), data); await auditar('crear','servicio',nombre); toast('Servicio creado','ok'); }
      onOk && onOk();
    }
  });
}
async function sembrarServicios(){
  if(!await confirmar('¿Cargar los 5 servicios base? Luego puedes editarlos.')) return;
  const base = [
    { nombre:'Masajes relajantes', categoria:CATEGORIAS[0], descripcion:'Reduce el estrés y estimula la circulación sanguínea, devolviéndole calma al cuerpo y la mente.', duracionMin:60 },
    { nombre:'Masaje descontracturante', categoria:CATEGORIAS[1], descripcion:'Libera la tensión muscular acumulada y restaura la función natural del músculo.', duracionMin:60 },
    { nombre:'Tratamiento de bienestar avanzado', categoria:CATEGORIAS[2], descripcion:'Terapias sensoriales que combinan los principios activos de la naturaleza con técnicas de relajación profunda.', duracionMin:75 },
    { nombre:'Limpieza facial profunda', categoria:CATEGORIAS[3], descripcion:'Purifica los poros, previene el acné, hidrata la piel y favorece la renovación celular.', duracionMin:60 },
    { nombre:'Estética avanzada y armonía facial', categoria:CATEGORIAS[4], descripcion:'Ciencia, arte y naturalidad para tu rostro. Resultados naturales y armoniosos.', duracionMin:60 }
  ];
  try{
    for(const s of base){ await fb.addDoc(fb.collection(fb.db,'servicios'), { ...s, precio:0, prepMin:0, limpiezaMin:10, activo:true, creadoEn:fb.serverTimestamp() }); }
    await auditar('sembrar','servicios','catálogo base');
    toast('Catálogo base cargado','ok'); irA('servicios');
  }catch(ex){ toast('No se pudo cargar: '+ex.message,'bad'); }
}

/* ============================================================
 * PROFESIONALES
 * ============================================================ */
async function vistaProfesionales(v){
  v.innerHTML = `
    <div class="panel">
      <div class="panel-head"><h3>Profesionales</h3><div class="spacer"></div>
        <button class="btn btn-gold btn-sm" id="nuevoPro">+ Nuevo profesional</button></div>
      <div class="table-wrap"><table>
        <thead><tr><th>Profesional</th><th>Especialidad</th><th>Servicios habilitados</th><th>Estado</th><th></th></tr></thead>
        <tbody id="proBody"><tr><td colspan="5" class="loading">Cargando…</td></tr></tbody>
      </table></div>
    </div>`;
  // asegurar catálogo de servicios para los checkboxes
  if(!cacheServicios.length){ try{ const s=await fb.getDocs(fb.collection(fb.db,'servicios')); cacheServicios=s.docs.map(d=>({id:d.id,...d.data()})); }catch(_){} }
  let datos=[];
  try{
    const snap = await fb.getDocs(fb.collection(fb.db,'profesionales'));
    datos = snap.docs.map(d=>({id:d.id, ...d.data()})); cacheProfesionales = datos;
    datos.sort((a,b)=>(a.nombre||'').localeCompare(b.nombre||''));
  }catch(ex){ el('proBody').innerHTML=`<tr><td colspan="5" class="empty">No se pudieron cargar.<br><small>${esc(ex.message)}</small></td></tr>`; return; }
  const body = el('proBody');
  if(!datos.length){ body.innerHTML = `<tr><td colspan="5"><div class="empty"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0116 0"/></svg><p>Aún no hay profesionales.</p></div></td></tr>`; }
  else body.innerHTML = datos.map(p=>{
    const servN = (p.serviciosHabilitados||[]).length;
    return `<tr>
      <td><div class="t-strong">${esc(p.nombre)}</div>${p.telefono?`<div class="t-sub">${esc(p.telefono)}</div>`:''}</td>
      <td>${esc(p.especialidad||'—')}</td>
      <td>${servN?`${servN} servicio${servN>1?'s':''}`:'<span class="t-sub">sin asignar</span>'}</td>
      <td><span class="badge ${p.activo===false?'off':'on'}">${p.activo===false?'Inactivo':'Activo'}</span></td>
      <td><div class="row-actions">
        <button class="icon-btn" data-edit="${p.id}" title="Editar"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z"/></svg></button>
        <button class="icon-btn" data-toggle="${p.id}" title="Activar/Inactivar"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
      </div></td></tr>`;
  }).join('');
  body.querySelectorAll('[data-edit]').forEach(b=> b.onclick=()=> formProfesional(datos.find(x=>x.id===b.getAttribute('data-edit')), ()=>irA('profesionales')));
  body.querySelectorAll('[data-toggle]').forEach(b=> b.onclick=async()=>{ const p=datos.find(x=>x.id===b.getAttribute('data-toggle')); const nuevo=p.activo===false; await fb.updateDoc(fb.doc(fb.db,'profesionales',p.id),{activo:nuevo}); await auditar(nuevo?'activar':'inactivar','profesional',p.nombre); toast('Estado actualizado','ok'); irA('profesionales'); });
  el('nuevoPro').onclick = ()=> formProfesional(null, ()=>irA('profesionales'));
}

function formProfesional(p, onOk){
  const e = p||{};
  const servSel = new Set(e.serviciosHabilitados||[]);
  const diasSel = new Set(e.diasDisponibles||[]);
  const srvChecks = cacheServicios.length
    ? cacheServicios.map(s=>`<label class="chk"><input type="checkbox" value="${s.id}" ${servSel.has(s.id)?'checked':''}> ${esc(s.nombre)}</label>`).join('')
    : '<p class="hint">Crea primero los servicios para poder asignarlos.</p>';
  const diasChecks = DIAS.map(d=>`<label class="chk"><input type="checkbox" value="${d}" ${diasSel.has(d)?'checked':''}> ${d}</label>`).join('');
  modal({
    titulo: p?'Editar profesional':'Nuevo profesional',
    cuerpo:`
      <div class="grid2">
        <div class="field"><label>Nombre completo *</label><input id="p_nombre" value="${esc(e.nombre)}"></div>
        <div class="field"><label>Documento</label><input id="p_doc" value="${esc(e.documento)}"></div>
        <div class="field"><label>Teléfono</label><input id="p_tel" value="${esc(e.telefono)}"></div>
        <div class="field"><label>Correo</label><input id="p_email" type="email" value="${esc(e.email)}"></div>
        <div class="field"><label>Especialidad</label><input id="p_esp" value="${esc(e.especialidad)}"></div>
        <div class="field"><label>Estado</label><select id="p_activo"><option value="si"${e.activo!==false?' selected':''}>Activo</option><option value="no"${e.activo===false?' selected':''}>Inactivo</option></select></div>
        <div class="field"><label>Hora inicio</label><input id="p_hi" type="time" value="${esc(e.horaInicio||'09:00')}"></div>
        <div class="field"><label>Hora fin</label><input id="p_hf" type="time" value="${esc(e.horaFin||'18:00')}"></div>
      </div>
      <div class="field full"><label>Días disponibles</label><div class="chk-grid" id="p_dias">${diasChecks}</div></div>
      <div class="field full"><label>Servicios que puede realizar</label><div class="chk-grid" id="p_serv">${srvChecks}</div></div>`,
    guardar: async ()=>{
      const nombre=el('p_nombre').value.trim();
      if(!nombre){ toast('El nombre es obligatorio.','bad'); return false; }
      const serviciosHabilitados = [...$('#p_serv').querySelectorAll('input:checked')].map(i=>i.value);
      const diasDisponibles = [...$('#p_dias').querySelectorAll('input:checked')].map(i=>i.value);
      const data = { nombre, documento:el('p_doc').value.trim(), telefono:el('p_tel').value.trim(),
        email:el('p_email').value.trim(), especialidad:el('p_esp').value.trim(),
        horaInicio:el('p_hi').value, horaFin:el('p_hf').value,
        diasDisponibles, serviciosHabilitados, activo: el('p_activo').value==='si' };
      if(p){ await fb.updateDoc(fb.doc(fb.db,'profesionales',p.id), data); await auditar('editar','profesional',nombre); toast('Profesional actualizado','ok'); }
      else { data.creadoEn=fb.serverTimestamp(); await fb.addDoc(fb.collection(fb.db,'profesionales'), data); await auditar('crear','profesional',nombre); toast('Profesional creado','ok'); }
      onOk && onOk();
    }
  });
}

/* ============================================================
 * USUARIOS DEL PANEL (solo admin)
 * ============================================================ */
async function vistaUsuarios(v){
  v.innerHTML = `
    <div class="panel">
      <div class="panel-head"><h3>Usuarios del panel</h3><div class="spacer"></div>
        <button class="btn btn-gold btn-sm" id="nuevoUsr">+ Nuevo usuario</button></div>
      <div class="table-wrap"><table>
        <thead><tr><th>Nombre</th><th>Correo</th><th>Rol</th><th>Estado</th><th></th></tr></thead>
        <tbody id="usrBody"><tr><td colspan="5" class="loading">Cargando…</td></tr></tbody>
      </table></div>
    </div>
    <p class="hint">Los usuarios inician sesión con su correo y contraseña. Cada rol ve solo lo que le corresponde.</p>`;
  let datos=[];
  try{
    const snap = await fb.getDocs(fb.collection(fb.db,'usuarios'));
    datos = snap.docs.map(d=>({id:d.id, ...d.data()}));
  }catch(ex){ el('usrBody').innerHTML=`<tr><td colspan="5" class="empty">No se pudieron cargar.<br><small>${esc(ex.message)}</small></td></tr>`; return; }
  el('usrBody').innerHTML = datos.map(u=>`
    <tr>
      <td class="t-strong">${esc(u.nombre||'—')}${u.id===usuario.uid?' <span class="t-sub">(tú)</span>':''}</td>
      <td>${esc(u.email||'—')}</td>
      <td><span class="badge cat">${esc(ROLES[u.rol]||u.rol)}</span></td>
      <td><span class="badge ${u.activo===false?'off':'on'}">${u.activo===false?'Inactivo':'Activo'}</span></td>
      <td><div class="row-actions">
        ${u.id!==usuario.uid?`<button class="icon-btn" data-toggle="${u.id}" title="Activar/Inactivar"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M18 6L6 18M6 6l12 12"/></svg></button>`:''}
      </div></td>
    </tr>`).join('');
  el('usrBody').querySelectorAll('[data-toggle]').forEach(b=> b.onclick=async()=>{ const u=datos.find(x=>x.id===b.getAttribute('data-toggle')); const nuevo=u.activo===false; await fb.updateDoc(fb.doc(fb.db,'usuarios',u.id),{activo:nuevo}); await auditar(nuevo?'activar':'inactivar','usuario',u.email); toast('Estado actualizado','ok'); irA('usuarios'); });
  el('nuevoUsr').onclick = formUsuario;
}

function formUsuario(){
  const opts = Object.entries(ROLES).map(([k,v])=>`<option value="${k}">${v}</option>`).join('');
  modal({
    titulo:'Nuevo usuario del panel',
    textoGuardar:'Crear usuario',
    cuerpo:`
      <div class="grid2">
        <div class="field full"><label>Nombre completo *</label><input id="u_nombre"></div>
        <div class="field"><label>Correo *</label><input id="u_email" type="email"></div>
        <div class="field"><label>Rol *</label><select id="u_rol">${opts}</select></div>
        <div class="field full"><label>Contraseña temporal *</label><input id="u_pass" type="text" placeholder="mínimo 6 caracteres"></div>
      </div>
      <p class="hint">Se crea la cuenta y podrá cambiar su contraseña luego. Tu sesión no se cierra.</p>`,
    guardar: async ()=>{
      const nombre=el('u_nombre').value.trim(), email=el('u_email').value.trim(), rol=el('u_rol').value, pass=el('u_pass').value;
      if(!nombre||!email||pass.length<6){ toast('Completa nombre, correo y contraseña (6+).','bad'); return false; }
      // App secundaria: crea el usuario SIN cerrar la sesión de la admin.
      const sec = fb._app.initializeApp(firebaseConfig, 'secundaria-'+Date.now());
      const secAuth = fb._auth.getAuth(sec);
      try{
        const cred = await fb.createUser(secAuth, email, pass);
        await fb.setDoc(fb.doc(fb.db,'usuarios',cred.user.uid), { nombre, email, rol, activo:true, creadoEn:fb.serverTimestamp() });
        await fb.signOut(secAuth);
        await auditar('crear','usuario',`${email} (${rol})`);
        toast('Usuario creado','ok'); irA('usuarios');
      }catch(ex){ toast(codigoAuth(ex.code)||ex.message,'bad'); return false; }
      finally{ try{ await fb._app.deleteApp(sec); }catch(_){ } }
    }
  });
}

/* ============================================================
 * Pantalla de configuración inicial (sin Firebase conectado)
 * ============================================================ */
function renderSetup(){
  document.body.innerHTML = `
  <div class="setup">
    <h2>Conecta tu proyecto de Firebase</h2>
    <p>El panel está listo. Solo falta pegar la configuración de tu proyecto <code>tatianahernandez-40b70</code>.</p>
    <ol>
      <li>Abre <code>console.firebase.google.com</code> → tu proyecto.</li>
      <li>⚙️ <b>Configuración del proyecto</b> → <b>Tus apps</b> → crea una app <b>Web</b> (icono <code>&lt;/&gt;</code>) si no existe.</li>
      <li>Copia el objeto <code>firebaseConfig</code> que te muestra.</li>
      <li>Pégalo en el archivo <code>admin/config.js</code> (reemplaza las líneas con <code>PEGA_AQUI…</code>).</li>
      <li>Activa en la consola: <b>Authentication → Sign-in method → Correo/contraseña</b>, y <b>Firestore Database → Crear</b>.</li>
    </ol>
    <p class="hint">Cuando lo pegues, esta pantalla se convierte automáticamente en el inicio de sesión del panel.</p>
  </div>`;
}
