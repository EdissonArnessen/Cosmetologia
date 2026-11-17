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
/* Correos autorizados para crear su acceso de administradora en el primer ingreso.
   (También se validan en firestore.rules para que sea seguro.) */
const ADMIN_BOOTSTRAP = ['yuliethhernandezrtpo1991@gmail.com', 'biohazaa@gmail.com'];
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
  // Recordar correo
  try{ const re = localStorage.getItem('th_admin_email'); if(re){ el('email').value = re; const r = el('remember'); if(r) r.checked = true; } }catch(_){}
  // Mostrar/ocultar contraseña
  const eye = el('eyeBtn');
  if(eye) eye.addEventListener('click', ()=>{
    const p = el('pass'); const mostrar = p.type === 'password';
    p.type = mostrar ? 'text' : 'password';
    el('eyeIcon').innerHTML = mostrar
      ? '<path d="M17.9 17.9A10.4 10.4 0 0112 19C5 19 1 12 1 12a18.4 18.4 0 015.1-5.9M9.9 4.2A10.4 10.4 0 0112 4c7 0 11 7 11 7a18.3 18.3 0 01-2.2 3.2M1 1l22 22M9.5 9.5a3 3 0 004 4" />'
      : '<path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"/><circle cx="12" cy="12" r="3"/>';
  });

  el('loginForm').addEventListener('submit', async (e)=>{
    e.preventDefault();
    const email = el('email').value.trim();
    const pass  = el('pass').value;
    const btn = el('loginBtn'); const err = el('loginErr');
    err.textContent = ''; btn.disabled = true; btn.textContent = 'Ingresando…';
    try{ if(el('remember') && el('remember').checked) localStorage.setItem('th_admin_email', email); else localStorage.removeItem('th_admin_email'); }catch(_){}
    try{
      await fb.signIn(fb.auth, email, pass);
    }catch(ex){
      err.textContent = codigoAuth(ex.code);
      btn.disabled = false; btn.textContent = 'Ingresar →';
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
      // Primer ingreso de una administradora autorizada → ofrecer crear su acceso
      if(ADMIN_BOOTSTRAP.includes((u.email||'').toLowerCase())){ mostrarBootstrap(u); return; }
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

function mostrarLogin(){
  el('app').classList.add('hidden'); el('loginWrap').classList.remove('hidden');
  const form = el('loginForm'); if(form) form.classList.remove('hidden');
  const bc = el('bootCard'); if(bc) bc.classList.add('hidden');
  const btn = el('loginBtn'); if(btn){ btn.disabled=false; btn.textContent='Ingresar →'; }
  if(el('pass')) el('pass').value='';
}

/* Primer ingreso de administradora: crea su documento de usuario (rol admin). */
function mostrarBootstrap(u){
  el('app').classList.add('hidden'); el('loginWrap').classList.remove('hidden');
  const form = el('loginForm'); if(form) form.classList.add('hidden');
  let bc = el('bootCard');
  if(!bc){ bc = document.createElement('form'); bc.id='bootCard'; bc.className='glass-card'; el('loginWrap').appendChild(bc); }
  bc.classList.remove('hidden');
  const nombreSug = (u.email||'').toLowerCase().startsWith('yulieth') ? 'Yuliet Tatiana Hernández' : '';
  bc.innerHTML = `
    <img class="gc-logo-img" src="../img/logo-th.png" alt="Tatiana Hernández · Estética Integral">
    <h1>¡Hola, administradora!</h1>
    <p class="gc-hint">Es tu primer ingreso con <b>${esc(u.email)}</b>.<br>Crea tu acceso para continuar.</p>
    <div class="in">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0116 0"/></svg>
      <input type="text" id="bootNombre" placeholder="Tu nombre completo" aria-label="Tu nombre completo" value="${esc(nombreSug)}">
    </div>
    <p class="err-msg" id="bootErr"></p>
    <button type="button" class="gc-btn" id="bootBtn">Crear mi acceso →</button>
    <button type="button" class="gc-btn" id="bootCancel" style="background:transparent;border:1px solid rgba(255,255,255,.5);box-shadow:none;margin-top:10px">Cancelar</button>`;
  el('bootBtn').onclick = async ()=>{
    const nombre = (el('bootNombre').value||'').trim() || u.email;
    const b = el('bootBtn'); b.disabled=true; b.textContent='Creando…';
    try{
      await fb.setDoc(fb.doc(fb.db,'usuarios',u.uid), { nombre, email:u.email, rol:'admin', activo:true, creadoEn:fb.serverTimestamp() });
      perfil = { id:u.uid, nombre, email:u.email, rol:'admin', activo:true };
      bc.classList.add('hidden'); if(form) form.classList.remove('hidden');
      mostrarApp();
    }catch(ex){
      console.error(ex);
      el('bootErr').textContent = 'No se pudo crear el acceso: ' + (ex.message||'revisa las reglas de seguridad.');
      b.disabled=false; b.textContent='Crear mi acceso →';
    }
  };
  el('bootCancel').onclick = ()=> fb.signOut(fb.auth);
}
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
  { id:'agenda',       label:'Agenda',             roles:['admin','recepcion','profesional'], icon:'M3 5h18v16H3zM3 9h18M8 3v4M16 3v4' },
  { id:'clientes',     label:'Clientes',           roles:['admin','recepcion'],               icon:'M16 21v-2a4 4 0 00-8 0v2M12 11a4 4 0 100-8 4 4 0 000 8' },
  { id:'profesionales',label:'Profesionales',      roles:['admin'],                           icon:'M17 21v-2a4 4 0 00-4-4H7a4 4 0 00-4 4v2M11 11a4 4 0 100-8 4 4 0 000 8M21 21v-2a4 4 0 00-3-3.8' },
  { id:'servicios',    label:'Servicios',          roles:['admin'],                           icon:'M4 7l8-4 8 4-8 4zM4 7v10l8 4 8-4V7' },
  { id:'fichas',       label:'Fichas de atención', roles:['admin','profesional'],             icon:'M6 3h9l5 5v13H6zM14 3v5h5M9 13h6M9 17h4' },
  { id:'pagos',        label:'Pagos y caja',       roles:['admin','recepcion'],               icon:'M3 7h18v10H3zM3 11h18M7 15h4' },
  { id:'reportes',     label:'Reportes',           roles:['admin'],                           icon:'M4 20V9M10 20V4M16 20v-7M22 20H2' },
  { id:'usuarios',     label:'Usuarios',           roles:['admin'],                           icon:'M16 21v-2a4 4 0 00-8 0v2M12 11a4 4 0 100-8 4 4 0 000 8M20 8v6M23 11h-6' },
  { id:'configuracion',label:'Configuración',      roles:['admin'],                           icon:'M12 15a3 3 0 100-6 3 3 0 000 6zM19 12a7 7 0 00-.1-1l2-1.6-2-3.4-2.3 1a7 7 0 00-1.7-1l-.3-2.4H9.4l-.3 2.4a7 7 0 00-1.7 1l-2.3-1-2 3.4L5 11a7 7 0 000 2l-2 1.6 2 3.4 2.3-1a7 7 0 001.7 1l.3 2.4h4.2l.3-2.4a7 7 0 001.7-1l2.3 1 2-3.4-2-1.6a7 7 0 00.1-1z' }
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
    dashboard: vistaDashboard, agenda: vistaAgenda, clientes: vistaClientes, profesionales: vistaProfesionales,
    servicios: vistaServicios, fichas: vistaFichas, pagos: vistaPagos, reportes: vistaReportes,
    usuarios: vistaUsuarios, configuracion: vistaConfiguracion
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
 * Fechas, estados de cita y utilidades de datos
 * ============================================================ */
const MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
const MESES_L = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const ESTADOS = {
  pendiente:   { label:'Pendiente',   cls:'e-pend' },
  confirmada:  { label:'Confirmada',  cls:'e-conf' },
  en_atencion: { label:'En atención', cls:'e-aten' },
  finalizada:  { label:'Finalizada',  cls:'e-fin' },
  cancelada:   { label:'Cancelada',   cls:'e-canc' },
  no_asistio:  { label:'No asistió',  cls:'e-no' }
};
function hoyISO(){ const d=new Date(); return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); }
function isoDe(d){ return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); }
function mmHHaMin(h){ const [a,b]=(h||'0:0').split(':').map(Number); return a*60+(b||0); }
function minAHHMM(m){ return String(Math.floor(m/60)).padStart(2,'0')+':'+String(m%60).padStart(2,'0'); }
let cacheCitas = null;
async function cargarCitas(forzar){
  if(cacheCitas && !forzar) return cacheCitas;
  const snap = await fb.getDocs(fb.collection(fb.db,'citas'));
  cacheCitas = snap.docs.map(d=>({ id:d.id, ...d.data() }));
  return cacheCitas;
}
async function asegurarCatalogos(){
  if(!cacheServicios.length){ try{ const s=await fb.getDocs(fb.collection(fb.db,'servicios')); cacheServicios=s.docs.map(d=>({id:d.id,...d.data()})); }catch(_){} }
  if(!cacheProfesionales.length){ try{ const p=await fb.getDocs(fb.collection(fb.db,'profesionales')); cacheProfesionales=p.docs.map(d=>({id:d.id,...d.data()})); }catch(_){} }
}

/* Gráfica de barras verticales (SVG, sin librerías) */
function barChart(data, opts){
  opts = opts||{};
  const w=opts.w||520, h=opts.h||170, pad=28, n=data.length||1;
  const max = Math.max(1, ...data.map(d=>d.value));
  const bw = (w-pad*2)/n;
  const bars = data.map((d,i)=>{
    const bh = Math.round((h-pad-18) * d.value / max);
    const x = pad + i*bw + bw*0.18, y = h-18-bh, ww = bw*0.64;
    const val = opts.money ? money(d.value) : d.value;
    return `<g>
      <rect x="${x}" y="${y}" width="${ww}" height="${bh}" rx="5" fill="url(#gBar)"></rect>
      ${d.value?`<text x="${x+ww/2}" y="${y-5}" text-anchor="middle" class="bc-val">${val}</text>`:''}
      <text x="${x+ww/2}" y="${h-5}" text-anchor="middle" class="bc-lbl">${esc(d.label)}</text>
    </g>`;
  }).join('');
  return `<svg viewBox="0 0 ${w} ${h}" class="chart" preserveAspectRatio="xMidYMid meet">
    <defs><linearGradient id="gBar" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#DCC68C"></stop><stop offset="1" stop-color="#A6863F"></stop></linearGradient></defs>
    ${bars}</svg>`;
}
/* Barras horizontales (ranking) */
function rankBars(data, opts){
  opts = opts||{};
  const max = Math.max(1, ...data.map(d=>d.value));
  if(!data.length) return '<div class="empty" style="padding:24px"><p>Sin datos todavía.</p></div>';
  return '<div class="rank">'+data.map(d=>`
    <div class="rank-row">
      <span class="rank-lbl">${esc(d.label)}</span>
      <span class="rank-bar"><i style="width:${Math.round(100*d.value/max)}%"></i></span>
      <span class="rank-val">${opts.money?money(d.value):d.value}</span>
    </div>`).join('')+'</div>';
}

/* ============================================================
 * DASHBOARD (inteligente)
 * ============================================================ */
async function vistaDashboard(v){
  v.innerHTML = `
    <div class="welcome">
      <div class="wl-top"><h2>Hola, <span>${esc((perfil.nombre||'').split(' ')[0]||'bienvenida')}</span></h2><span class="wl-date">${fechaLarga(hoyISO())}</span></div>
      <p>Bienvenida a tu espacio de bienestar — donde la belleza, la armonía y la tranquilidad se encuentran.</p>
      <p class="wl-insight" id="wlInsight"></p>
    </div>
    <div class="kpi-grid" id="kpis"><div class="loading" style="grid-column:1/-1">Cargando indicadores…</div></div>
    <div class="dash-2col">
      <div class="panel"><div class="panel-head"><h3>Citas por mes</h3><span class="t-sub">últimos 6 meses</span></div><div class="panel-pad" id="chCitas"></div></div>
      <div class="panel"><div class="panel-head"><h3>Servicios más solicitados</h3></div><div class="panel-pad" id="chServicios"></div></div>
    </div>
    <div class="dash-2col">
      <div class="panel"><div class="panel-head"><h3>Ingresos por mes</h3><span class="t-sub">citas finalizadas</span></div><div class="panel-pad" id="chIngresos"></div></div>
      <div class="panel"><div class="panel-head"><h3>Próximas citas</h3></div><div id="proxCitas"></div></div>
    </div>`;
  let citas=[], clientes=[];
  try{
    await asegurarCatalogos();
    citas = await cargarCitas(true);
    const cs = await fb.getDocs(fb.collection(fb.db,'clientes')); clientes = cs.docs.map(d=>d.data());
  }catch(ex){ el('kpis').innerHTML = `<div class="empty" style="grid-column:1/-1">No se pudieron cargar los datos.<br><small>${esc(ex.message)}</small></div>`; return; }

  const hoy = hoyISO();
  const ahora = new Date(); const mesAct = ahora.getMonth(), anioAct = ahora.getFullYear();
  const enMesActual = (iso)=>{ const [a,m]=iso.split('-').map(Number); return a===anioAct && (m-1)===mesAct; };
  const vivas = citas.filter(c=> c.estado!=='cancelada' && c.estado!=='no_asistio');
  const kpis = [
    { k:'Citas hoy',         v: citas.filter(c=>c.fecha===hoy && c.estado!=='cancelada').length, ic:'M3 5h18v16H3zM3 9h18M8 3v4M16 3v4', go:'agenda', hint:'Citas programadas para el día de hoy. Toca para abrir la agenda.' },
    { k:'Pendientes',        v: citas.filter(c=>c.estado==='pendiente').length, ic:'M12 8v4l3 2M21 12a9 9 0 11-9-9', go:'agenda', hint:'Citas aún por confirmar. Toca para revisarlas en la agenda.' },
    { k:'Confirmadas',       v: citas.filter(c=>c.estado==='confirmada').length, ic:'M20 6L9 17l-5-5', go:'agenda', hint:'Citas confirmadas por el cliente. Toca para ver la agenda.' },
    { k:'Atendidas (mes)',   v: citas.filter(c=>c.estado==='finalizada' && enMesActual(c.fecha)).length, ic:'M9 11l3 3L22 4M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11', go:'agenda', hint:'Servicios finalizados este mes. Toca para ver el detalle.' },
    { k:'Canceladas (mes)',  v: citas.filter(c=>c.estado==='cancelada' && enMesActual(c.fecha)).length, ic:'M18 6L6 18M6 6l12 12', go:'agenda', hint:'Citas canceladas este mes. Toca para revisarlas.' },
    { k:'Clientes nuevos (mes)', v: clientes.filter(c=> c.fechaRegistro && enMesActual(c.fechaRegistro)).length, ic:'M16 21v-2a4 4 0 00-8 0v2M12 11a4 4 0 100-8 4 4 0 000 8M19 8v6M22 11h-6', go:'clientes', hint:'Clientes registrados este mes. Toca para ir a Clientes.' },
    { k:'Ingresos del mes',  v: money(citas.filter(c=>c.estado==='finalizada' && enMesActual(c.fecha)).reduce((s,c)=>s+(Number(c.precio)||0),0)), ic:'M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6', txt:true, go:'agenda', hint:'Ingresos de las citas finalizadas este mes.' },
    { k:'Clientes activos',  v: clientes.filter(c=>c.activo!==false).length, ic:'M16 21v-2a4 4 0 00-8 0v2M12 11a4 4 0 100-8 4 4 0 000 8', go:'clientes', hint:'Clientes activos en total. Toca para ver sus expedientes.' }
  ];
  el('kpis').innerHTML = kpis.map(d=>`<button type="button" class="kpi kpi-link" data-ir="${d.go||''}" title="${esc(d.hint||d.k)}" aria-label="${esc(d.k+'. '+(d.hint||''))}"><div class="ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="${d.ic}"/></svg></div><div class="v"${d.txt?' style="font-size:1.5rem"':''}>${d.v}</div><div class="k">${d.k}</div><span class="kpi-hint">${esc(d.hint||'')}</span></button>`).join('');
  el('kpis').querySelectorAll('.kpi-link[data-ir]').forEach(b=>{ const t=b.getAttribute('data-ir'); if(t) b.onclick=()=>irA(t); });
  // Dato inteligente del día
  const nHoy = citas.filter(c=>c.fecha===hoy && c.estado!=='cancelada').length;
  const nPend = citas.filter(c=>c.estado==='pendiente').length;
  const ins = el('wlInsight');
  if(ins) ins.innerHTML = (nHoy||nPend)
    ? `Hoy tienes <b>${nHoy}</b> cita${nHoy===1?'':'s'} y <b>${nPend}</b> pendiente${nPend===1?'':'s'} por confirmar.`
    : 'No hay citas registradas aún. Carga datos de ejemplo en <b>Configuración</b> o crea tu primera cita en la <b>Agenda</b>. 🌿';

  // Citas por mes (6 meses)
  const meses6=[]; for(let i=5;i>=0;i--){ const d=new Date(anioAct,mesAct-i,1); meses6.push({ y:d.getFullYear(), m:d.getMonth() }); }
  const citasMes = meses6.map(mm=>({ label:MESES[mm.m], value: vivas.filter(c=>{const[a,m]=c.fecha.split('-').map(Number); return a===mm.y && (m-1)===mm.m;}).length }));
  el('chCitas').innerHTML = barChart(citasMes);
  // Ingresos por mes
  const ingMes = meses6.map(mm=>({ label:MESES[mm.m], value: citas.filter(c=>c.estado==='finalizada').filter(c=>{const[a,m]=c.fecha.split('-').map(Number); return a===mm.y && (m-1)===mm.m;}).reduce((s,c)=>s+(Number(c.precio)||0),0) }));
  el('chIngresos').innerHTML = barChart(ingMes, { money:true });
  // Servicios más solicitados (top 5)
  const cuenta={}; vivas.forEach(c=>{ const n=c.servicioNombre||'—'; cuenta[n]=(cuenta[n]||0)+1; });
  const topServ = Object.entries(cuenta).map(([label,value])=>({label,value})).sort((a,b)=>b.value-a.value).slice(0,5);
  el('chServicios').innerHTML = rankBars(topServ);
  // Próximas citas
  const prox = citas.filter(c=> c.fecha>=hoy && c.estado!=='cancelada' && c.estado!=='no_asistio')
    .sort((a,b)=> (a.fecha+a.horaInicio).localeCompare(b.fecha+b.horaInicio)).slice(0,6);
  el('proxCitas').innerHTML = prox.length ? '<div class="prox-list">'+prox.map(c=>`
    <div class="prox-item">
      <div class="prox-fh"><b>${fechaCorta(c.fecha)}</b><span>${esc(c.horaInicio||'')}</span></div>
      <div class="prox-info"><div class="t-strong">${esc(c.clienteNombre||'Cliente')}</div><div class="t-sub">${esc(c.servicioNombre||'')} · ${esc(c.profesionalNombre||'')}</div></div>
      <span class="badge-e ${ESTADOS[c.estado]?.cls||''}">${ESTADOS[c.estado]?.label||c.estado}</span>
    </div>`).join('')+'</div>'
    : `<div class="empty"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3"><path d="M3 5h18v16H3zM3 9h18M8 3v4M16 3v4"/></svg><p>No hay próximas citas.</p><button class="btn btn-gold btn-sm" id="irAgenda">Ir a la agenda</button></div>`;
  const ia=el('irAgenda'); if(ia) ia.onclick=()=>irA('agenda');
}
function fechaCorta(iso){ if(!iso) return ''; const [a,m,d]=iso.split('-').map(Number); return d+' '+MESES[m-1]; }

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
  let datos = [], citasTodas = [];
  try{
    const snap = await fb.getDocs(fb.collection(fb.db,'clientes'));
    datos = snap.docs.map(d=>({id:d.id, ...d.data()}));
    datos.sort((a,b)=>(a.nombres||'').localeCompare(b.nombres||''));
  }catch(ex){ el('cliBody').innerHTML = `<tr><td colspan="6" class="empty">No se pudieron cargar los clientes.<br><small>${esc(ex.message)}</small></td></tr>`; return; }
  try{ await asegurarCatalogos(); citasTodas = await cargarCitas(true); }catch(_){ citasTodas = []; }

  function pintar(lista){
    const body = el('cliBody');
    if(!lista.length){ body.innerHTML = `<tr><td colspan="6"><div class="empty"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0116 0"/></svg><p>Aún no hay clientes registrados.</p></div></td></tr>`; return; }
    body.innerHTML = lista.map(c=>`
      <tr>
        <td><button class="link-cli" data-exp="${c.id}" title="Ver expediente"><span class="t-strong">${esc((c.nombres||'')+' '+(c.apellidos||''))}</span></button>${c.fechaNacimiento?`<div class="t-sub">Nac.: ${esc(c.fechaNacimiento)}</div>`:''}</td>
        <td>${esc(c.identificacion||'—')}</td>
        <td>${esc(c.telefono||'—')}</td>
        <td>${esc(c.email||'—')}</td>
        <td><span class="badge ${c.activo===false?'off':'on'}">${c.activo===false?'Inactivo':'Activo'}</span></td>
        <td><div class="row-actions">
          <button class="icon-btn" data-exp="${c.id}" title="Ver expediente"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 4h10l6 6v10a0 0 0 01 0 0H4zM14 4v6h6"/><path d="M8 14h8M8 17h5"/></svg></button>
          ${puedeEditar?`<button class="icon-btn" data-edit="${c.id}" title="Editar"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z"/></svg></button>`:''}
          ${puedeEditar?`<button class="icon-btn" data-toggle="${c.id}" title="Activar/Inactivar"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M18 6L6 18M6 6l12 12"/></svg></button>`:''}
        </div></td>
      </tr>`).join('');
    body.querySelectorAll('[data-exp]').forEach(b=> b.onclick=()=> verExpediente(datos.find(x=>x.id===b.getAttribute('data-exp')), citasTodas));
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

/* ---- Expediente del cliente: historial + plan sugerido inteligente ---- */
function diasEntre(isoA, isoB){ return Math.round((new Date(isoB)-new Date(isoA))/86400000); }
function cadenciaDe(nombre){
  const n=(nombre||'').toLowerCase();
  if(n.includes('masaje')) return { sem:2, txt:'cada 2 semanas' };
  if(n.includes('bienestar')) return { sem:3, txt:'cada 3 semanas' };
  if(n.includes('limpieza')||n.includes('facial')) return { sem:4, txt:'cada 4 semanas' };
  if(n.includes('armon')||n.includes('estética')||n.includes('estetica')||n.includes('avanzad')) return { sem:5, txt:'cada 4 a 6 semanas' };
  return { sem:4, txt:'cada 4 semanas' };
}
function sumarSemanas(iso, sem){ const d=iso?new Date(iso):new Date(); d.setDate(d.getDate()+sem*7); return isoDe(d); }

function verExpediente(cli, todasCitas){
  if(!cli) return;
  const nombre = ((cli.nombres||'')+' '+(cli.apellidos||'')).trim();
  const mias = (todasCitas||[]).filter(c=> c.clienteId===cli.id)
    .sort((a,b)=> (b.fecha+(b.horaInicio||'')).localeCompare(a.fecha+(a.horaInicio||'')));
  const hoy = hoyISO();
  const final = mias.filter(c=> c.estado==='finalizada');
  const futuras = mias.filter(c=> c.fecha>=hoy && (c.estado==='pendiente'||c.estado==='confirmada'))
    .sort((a,b)=> (a.fecha+a.horaInicio).localeCompare(b.fecha+b.horaInicio));
  const noAsistio = mias.filter(c=> c.estado==='no_asistio').length;
  const gastado = final.reduce((s,c)=> s+(Number(c.precio)||0), 0);
  const ultima = final[0]; // ya viene ordenado desc
  const prox = futuras[0];
  const diasUlt = ultima ? diasEntre(ultima.fecha, hoy) : null;

  // frecuencia de servicios
  const freq = {}; final.forEach(c=>{ const n=c.servicioNombre||'Servicio'; if(!freq[n]) freq[n]={n, veces:0, id:c.servicioId}; freq[n].veces++; });
  const ranking = Object.values(freq).sort((a,b)=> b.veces-a.veces);
  const favorito = ranking[0];

  // ---- recomendaciones inteligentes ----
  const recs = [];
  let sugServId = favorito?.id || (cacheServicios[0]||{}).id || '';
  let sugFecha = sumarSemanas(ultima?ultima.fecha:hoy, favorito?cadenciaDe(favorito.n).sem:4);
  if(sugFecha < hoy) sugFecha = hoy;

  if(!final.length){
    recs.push(`Es un cliente ${mias.length?'sin servicios finalizados aún':'nuevo'}. Agenda una <b>valoración inicial</b> (limpieza facial o diagnóstico) para conocer sus necesidades y personalizar su plan.`);
  } else {
    const cad = cadenciaDe(favorito.n);
    recs.push(`Su servicio preferido es <b>${esc(favorito.n)}</b> (${favorito.veces} ${favorito.veces===1?'vez':'veces'}). Recomendación: mantener sesiones <b>${cad.txt}</b> — próxima ideal el <b>${fechaCorta(sugFecha)}</b>.`);
    if(ranking.length>=2) recs.push(`También ha realizado ${ranking.slice(1,3).map(r=>'<b>'+esc(r.n)+'</b>').join(' y ')}. Considera un <b>plan combinado</b> (facial + bienestar) para resultados integrales.`);
    const precioRef = Number((cacheServicios.find(s=>s.id===favorito.id)||{}).precio)|| (ultima?Number(ultima.precio):0) || 0;
    if(precioRef){ const paq=Math.round(precioRef*4*0.9/1000)*1000; recs.push(`<b>Plan sugerido:</b> paquete de <b>4 sesiones</b> de ${esc(favorito.n)} por aprox. <b>${money(paq)}</b> (ahorro del 10% frente a $${(precioRef*4).toLocaleString('es-CO')}).`); }
  }
  if(diasUlt!=null && diasUlt>60) recs.push(`⚠️ Han pasado <b>${diasUlt} días</b> desde su última visita. Es buen momento para <b>reactivarla</b> con un mensaje o una promoción.`);
  if(noAsistio>=2) recs.push(`Registra <b>${noAsistio} inasistencias</b>. Conviene <b>confirmar por WhatsApp</b> el día anterior a cada cita.`);
  if(!prox && final.length) recs.push(`No tiene próximas citas agendadas — un buen momento para proponerle la siguiente sesión.`);

  const chips = `
    <div class="exp-chips">
      <div class="exp-chip"><span class="v">${final.length}</span><span class="k">Servicios realizados</span></div>
      <div class="exp-chip"><span class="v">${money(gastado)}</span><span class="k">Inversión total</span></div>
      <div class="exp-chip"><span class="v">${ultima?fechaCorta(ultima.fecha):'—'}</span><span class="k">Última visita</span></div>
      <div class="exp-chip"><span class="v">${prox?fechaCorta(prox.fecha):'Sin agendar'}</span><span class="k">Próxima cita</span></div>
    </div>`;

  const histHTML = mias.length ? '<div class="exp-hist">'+mias.map(c=>`
    <div class="exp-row">
      <div class="exp-fh"><b>${fechaCorta(c.fecha)}</b><span>${esc((c.horaInicio||'').slice(0,5))}</span></div>
      <div class="exp-si"><div class="t-strong">${esc(c.servicioNombre||'Servicio')}</div><div class="t-sub">${esc(c.profesionalNombre||'')}${c.precio?` · ${money(c.precio)}`:''}</div></div>
      <span class="badge-e ${ESTADOS[c.estado]?.cls||''}">${ESTADOS[c.estado]?.label||c.estado}</span>
    </div>`).join('')+'</div>'
    : `<div class="empty" style="padding:20px"><p>Este cliente aún no tiene citas registradas.</p></div>`;

  const telRaw = (cli.whatsapp||cli.telefono||'').replace(/\D/g,'');
  const telE = telRaw ? (telRaw.length===10?'57'+telRaw:telRaw) : '';
  const waMsg = encodeURIComponent(`Hola ${cli.nombres||''}, te saludamos de Tatiana Hernández · Estética Integral 🌿. Queremos agendar tu próxima sesión${favorito?` de ${favorito.n}`:''}. ¿Qué día te queda bien?`);

  modal({
    titulo:`Expediente · ${nombre}`,
    textoGuardar:'Agendar próxima cita',
    cuerpo:`
      <div class="exp">
        ${chips}
        <div class="exp-grid">
          <div class="exp-col">
            <h4 class="exp-h">Historial de atenciones</h4>
            ${histHTML}
          </div>
          <div class="exp-col">
            <div class="plan-card">
              <div class="plan-top"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l2.4 6.3L21 9l-5 4.3L17.5 20 12 16.3 6.5 20 8 13.3 3 9l6.6-.7z"/></svg><span>Plan sugerido para ${esc(cli.nombres||'la clienta')}</span></div>
              <ul class="plan-list">${recs.map(r=>`<li>${r}</li>`).join('')}</ul>
              ${telE?`<a class="btn btn-ghost btn-sm" href="https://wa.me/${telE}?text=${waMsg}" target="_blank" rel="noopener" style="margin-top:4px">Invitar por WhatsApp</a>`:''}
            </div>
          </div>
        </div>
      </div>`,
    guardar: async ()=>{
      setTimeout(()=> formCita(null, sugFecha, { clienteId: cli.id, servicioId: sugServId }), 0);
      return true;
    }
  });
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
 * AGENDA (calendario tipo Outlook: mes + día)
 * ============================================================ */
let agMes = null;      // Date del primer día del mes mostrado
let agSel = null;      // día seleccionado (ISO)
let agProf = '';       // filtro por profesional (id)
async function vistaAgenda(v){
  if(!agMes){ const n=new Date(); agMes=new Date(n.getFullYear(), n.getMonth(), 1); }
  if(!agSel) agSel = hoyISO();
  v.innerHTML = `
    <div id="recordatorioCard"></div>
    <div class="panel">
      <div class="panel-head ag-head">
        <div class="ag-nav">
          <button class="icon-btn" id="agPrev" title="Mes anterior"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 18l-6-6 6-6"/></svg></button>
          <h3 id="agTitulo"></h3>
          <button class="icon-btn" id="agNext" title="Mes siguiente"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg></button>
          <button class="btn btn-ghost btn-sm" id="agHoy">Hoy</button>
        </div>
        <div class="spacer"></div>
        <select id="agFiltro" class="ag-filtro"><option value="">Todos los profesionales</option></select>
        <button class="btn btn-gold btn-sm" id="agNueva">+ Nueva cita</button>
      </div>
      <div class="cal" id="cal"></div>
    </div>
    <div class="panel" id="diaPanel"></div>`;
  try{
    await asegurarCatalogos(); await cargarCitas(true);
    if(!window.__cliMap){ const cs=await fb.getDocs(fb.collection(fb.db,'clientes')); window.__cliMap={}; cs.docs.forEach(d=>{ const x=d.data(); window.__cliMap[d.id]=x.telefono||x.whatsapp||''; }); }
  }
  catch(ex){ el('cal').innerHTML = `<div class="empty" style="padding:30px">No se pudieron cargar las citas.<br><small>${esc(ex.message)}</small></div>`; return; }
  // filtro profesionales
  el('agFiltro').innerHTML = '<option value="">Todos los profesionales</option>' +
    cacheProfesionales.filter(p=>p.activo!==false).map(p=>`<option value="${p.id}" ${agProf===p.id?'selected':''}>${esc(p.nombre)}</option>`).join('');
  el('agFiltro').onchange = (e)=>{ agProf=e.target.value; pintarRecordatorio(); pintarCalendario(); pintarDia(); };
  el('agPrev').onclick = ()=>{ agMes=new Date(agMes.getFullYear(), agMes.getMonth()-1, 1); pintarCalendario(); };
  el('agNext').onclick = ()=>{ agMes=new Date(agMes.getFullYear(), agMes.getMonth()+1, 1); pintarCalendario(); };
  el('agHoy').onclick = ()=>{ const n=new Date(); agMes=new Date(n.getFullYear(),n.getMonth(),1); agSel=hoyISO(); pintarCalendario(); pintarDia(); };
  el('agNueva').onclick = ()=> formCita(null, agSel);
  pintarRecordatorio(); pintarCalendario(); pintarDia();
}
function citasDe(iso){
  return (cacheCitas||[]).filter(c=> c.fecha===iso && (!agProf || c.profesionalId===agProf))
    .sort((a,b)=> (a.horaInicio||'').localeCompare(b.horaInicio||''));
}
/* Tarjeta de "Próximo recordatorio" (para una mejor atención) */
function pintarRecordatorio(){
  const cont=el('recordatorioCard'); if(!cont) return;
  const hoy=hoyISO(); const ahora=new Date(); const hm=ahora.getHours()*60+ahora.getMinutes();
  const prox=(cacheCitas||[])
    .filter(c=> (!agProf||c.profesionalId===agProf) && (c.estado==='pendiente'||c.estado==='confirmada')
      && (c.fecha>hoy || (c.fecha===hoy && mmHHaMin(c.horaInicio)>=hm)))
    .sort((a,b)=> (a.fecha+a.horaInicio).localeCompare(b.fecha+b.horaInicio))[0];
  if(!prox){ cont.innerHTML=''; return; }
  const tel=((window.__cliMap||{})[prox.clienteId]||'').replace(/\D/g,'');
  const telE = tel ? (tel.length===10 ? '57'+tel : tel) : '';
  const msg=encodeURIComponent(`Hola ${prox.clienteNombre}, te recordamos tu cita en Tatiana Hernández · Estética Integral el ${fechaCorta(prox.fecha)} a las ${(prox.horaInicio||'').slice(0,5)} para ${prox.servicioNombre||'tu servicio'}. ¡Te esperamos! 🌿`);
  cont.innerHTML=`<div class="rec-card">
    <div class="rec-ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 01-3.4 0"/></svg></div>
    <div class="rec-body">
      <div class="rec-top">Próximo recordatorio</div>
      <div class="rec-main"><b>${esc(prox.clienteNombre||'Cliente')}</b> · ${esc(prox.servicioNombre||'')}</div>
      <div class="rec-sub">${fechaLarga(prox.fecha)} · ${esc((prox.horaInicio||'').slice(0,5))} · ${esc(prox.profesionalNombre||'')}</div>
    </div>
    ${telE?`<a class="btn btn-gold btn-sm rec-wa" href="https://wa.me/${telE}?text=${msg}" target="_blank" rel="noopener">Recordar por WhatsApp</a>`:''}
  </div>`;
}
function pintarCalendario(){
  const y=agMes.getFullYear(), m=agMes.getMonth();
  el('agTitulo').textContent = MESES_L[m]+' '+y;
  const primero=new Date(y,m,1); let dow=(primero.getDay()+6)%7; // Lun=0
  const diasMes=new Date(y,m+1,0).getDate();
  const hoy=hoyISO();
  let cells='';
  const cab=['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'].map(d=>`<div class="cal-dow">${d}</div>`).join('');
  for(let i=0;i<dow;i++) cells+='<div class="cal-cell out"></div>';
  for(let d=1; d<=diasMes; d++){
    const iso=`${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const cs=citasDe(iso);
    const dots = cs.slice(0,4).map(c=>`<i class="cal-dot ${ESTADOS[c.estado]?.cls||''}"></i>`).join('');
    const dotsWrap = cs.length ? `<span class="cal-dots">${dots}</span>` : '';
    const cnt = cs.length ? `<span class="cal-count">${cs.length}</span>` : '';
    const esHoy = iso===hoy;
    cells+=`<div class="cal-cell${esHoy?' hoy':''}${iso===agSel?' sel':''}" data-dia="${iso}">
      <span class="cal-num">${d}</span>${esHoy?'<span class="cal-hoy">HOY</span>':''}${cnt}${dotsWrap}</div>`;
  }
  el('cal').innerHTML = `<div class="cal-grid cal-cab">${cab}</div><div class="cal-grid">${cells}</div>`;
  el('cal').querySelectorAll('[data-dia]').forEach(c=> c.onclick=()=>{ agSel=c.getAttribute('data-dia'); pintarCalendario(); pintarDia(); });
}
function pintarDia(){
  const cs=citasDe(agSel);
  const dp=el('diaPanel');
  dp.innerHTML = `<div class="panel-head"><h3>${fechaLarga(agSel)}</h3><span class="t-sub" style="margin-left:6px">${cs.length} cita${cs.length===1?'':'s'}</span><div class="spacer"></div>
      <button class="btn btn-gold btn-sm" id="diaNueva">+ Cita este día</button></div>
    <div id="diaLista"></div>`;
  el('diaNueva').onclick=()=> formCita(null, agSel);
  el('diaLista').innerHTML = cs.length ? '<div class="ev-list">'+cs.map(c=>`
    <button class="ev-card ${ESTADOS[c.estado]?.cls||''}" data-cita="${c.id}">
      <span class="ev-time">${esc((c.horaInicio||'').slice(0,5))}<small>${esc((c.horaFin||'').slice(0,5))}</small></span>
      <span class="ev-body"><span class="t-strong">${esc(c.clienteNombre||'Cliente')}</span><span class="t-sub">${esc(c.servicioNombre||'')} · ${esc(c.profesionalNombre||'')}</span></span>
      <span class="badge-e ${ESTADOS[c.estado]?.cls||''}">${ESTADOS[c.estado]?.label||c.estado}</span>
    </button>`).join('')+'</div>'
    : `<div class="empty" style="padding:28px"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3"><path d="M3 5h18v16H3zM3 9h18M8 3v4M16 3v4"/></svg><p>No hay citas este día.</p></div>`;
  el('diaLista').querySelectorAll('[data-cita]').forEach(b=> b.onclick=()=>{ const c=(cacheCitas||[]).find(x=>x.id===b.getAttribute('data-cita')); if(c) formCita(c, c.fecha); });
}
function fechaLarga(iso){ if(!iso) return ''; const [a,m,d]=iso.split('-').map(Number); const dt=new Date(a,m-1,d); const dias=['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado']; return `${dias[dt.getDay()]} ${d} de ${MESES_L[m-1]}, ${a}`; }

function formCita(cita, fechaDefault, prefill){
  const e = cita || prefill || {};
  const puede = ['admin','recepcion'].includes(perfil.rol);
  const servActivos = cacheServicios.filter(s=>s.activo!==false);
  const cliActivos = []; // se cargan abajo
  const estOpts = Object.entries(ESTADOS).map(([k,o])=>`<option value="${k}" ${e.estado===k?'selected':''}>${o.label}</option>`).join('');
  const servOpts = '<option value="">Elige un servicio…</option>'+servActivos.map(s=>`<option value="${s.id}" ${e.servicioId===s.id?'selected':''}>${esc(s.nombre)}</option>`).join('');
  modal({
    titulo: cita?'Editar cita':'Nueva cita',
    textoGuardar: cita?'Guardar cambios':'Crear cita',
    cuerpo:`
      <div class="grid2">
        <div class="field full"><label>Servicio *</label><select id="ci_serv">${servOpts}</select></div>
        <div class="field full"><label>Profesional responsable *</label><select id="ci_prof"><option value="">Primero elige el servicio…</option></select><p class="hint" id="ci_profHint"></p></div>
        <div class="field full"><label>Cliente *</label><select id="ci_cli"><option value="">Cargando clientes…</option></select></div>
        <div class="field"><label>Fecha *</label><input type="date" id="ci_fecha" value="${esc(e.fecha||fechaDefault||hoyISO())}" min="${hoyISO()}"></div>
        <div class="field"><label>Hora inicio *</label><input type="time" id="ci_hora" value="${esc(e.horaInicio||'09:00')}" step="900"></div>
        <div class="field"><label>Duración (min)</label><input type="number" id="ci_dur" min="15" step="5" value="${esc(e.duracionMin||60)}"></div>
        <div class="field"><label>Precio (COP)</label><input type="number" id="ci_precio" min="0" value="${esc(e.precio||0)}"></div>
        <div class="field full"><label>Estado</label><select id="ci_estado">${estOpts||''}</select></div>
        <div class="field full"><label>Observaciones</label><textarea id="ci_obs" rows="2">${esc(e.observaciones)}</textarea></div>
      </div>
      <p class="hint">Un profesional no puede tener dos citas a la misma hora. El sistema lo valida automáticamente.</p>`,
    guardar: async ()=>{
      const servId=el('ci_serv').value, profId=el('ci_prof').value, cliId=el('ci_cli').value;
      const fecha=el('ci_fecha').value, hora=el('ci_hora').value, dur=Number(el('ci_dur').value)||60;
      if(!servId||!profId||!cliId||!fecha||!hora){ toast('Completa servicio, profesional, cliente, fecha y hora.','bad'); return false; }
      const serv=cacheServicios.find(s=>s.id===servId)||{};
      const prof=cacheProfesionales.find(p=>p.id===profId)||{};
      const cli=(window.__cli||[]).find(c=>c.id===cliId)||{};
      const ini=mmHHaMin(hora), fin=ini+dur;
      const citas=await cargarCitas();
      const choca=citas.some(c=> c.id!==(cita?.id) && c.profesionalId===profId && c.fecha===fecha
        && c.estado!=='cancelada' && c.estado!=='no_asistio'
        && (mmHHaMin(c.horaInicio) < fin && mmHHaMin(c.horaFin) > ini));
      if(choca){ toast('Ese profesional ya tiene una cita que se cruza en ese horario.','bad'); return false; }
      const data = {
        fecha, horaInicio:hora, horaFin:minAHHMM(fin), duracionMin:dur,
        servicioId:servId, servicioNombre:serv.nombre||'',
        profesionalId:profId, profesionalNombre:prof.nombre||'',
        clienteId:cliId, clienteNombre:((cli.nombres||'')+' '+(cli.apellidos||'')).trim(),
        precio:Number(el('ci_precio').value)||0, estado:el('ci_estado').value||'pendiente',
        observaciones:el('ci_obs').value.trim()
      };
      if(cita){ await fb.updateDoc(fb.doc(fb.db,'citas',cita.id), data); await auditar('editar','cita',`${data.clienteNombre} · ${fecha} ${hora}`); toast('Cita actualizada','ok'); }
      else { data.creadaEn=fb.serverTimestamp(); await fb.addDoc(fb.collection(fb.db,'citas'), data); await auditar('crear','cita',`${data.clienteNombre} · ${fecha} ${hora}`); toast('Cita creada','ok'); }
      cacheCitas=null; irA('agenda');
    }
  });
  // Poblar profesionales según servicio + clientes + prefill
  const selServ=el('ci_serv'), selProf=el('ci_prof');
  function pintarProfes(){
    const sid=selServ.value;
    const aptos=cacheProfesionales.filter(p=>p.activo!==false && (p.serviciosHabilitados||[]).includes(sid));
    if(!sid){ selProf.innerHTML='<option value="">Primero elige el servicio…</option>'; el('ci_profHint').textContent=''; return; }
    if(!aptos.length){ selProf.innerHTML='<option value="">Sin profesionales habilitados</option>'; el('ci_profHint').textContent='Asigna este servicio a un profesional en el módulo Profesionales.'; return; }
    selProf.innerHTML=aptos.map(p=>`<option value="${p.id}" ${e.profesionalId===p.id?'selected':''}>${esc(p.nombre)}</option>`).join('');
    el('ci_profHint').textContent='';
  }
  selServ.addEventListener('change', ()=>{
    const s=cacheServicios.find(x=>x.id===selServ.value);
    if(s){ if(s.duracionMin) el('ci_dur').value=s.duracionMin; if(s.precio) el('ci_precio').value=s.precio; }
    pintarProfes();
  });
  if((prefill&&prefill.servicioId) && selServ){ selServ.dispatchEvent(new Event('change')); }
  else pintarProfes();
  // clientes
  (async()=>{
    try{
      if(!window.__cli){ const cs=await fb.getDocs(fb.collection(fb.db,'clientes')); window.__cli=cs.docs.map(d=>({id:d.id,...d.data()})).filter(c=>c.activo!==false); }
      const sel=el('ci_cli'); if(!sel) return;
      sel.innerHTML='<option value="">Elige un cliente…</option>'+window.__cli.sort((a,b)=>(a.nombres||'').localeCompare(b.nombres||'')).map(c=>`<option value="${c.id}" ${e.clienteId===c.id?'selected':''}>${esc(((c.nombres||'')+' '+(c.apellidos||'')).trim())}</option>`).join('');
    }catch(_){ const sel=el('ci_cli'); if(sel) sel.innerHTML='<option value="">No se pudieron cargar</option>'; }
  })();
}

/* ============================================================
 * REPORTES (inteligencia del negocio)
 * ============================================================ */
let repPeriodo = 'mes';
function rangoPeriodo(p){
  const n=new Date(); const y=n.getFullYear(), m=n.getMonth();
  if(p==='mes')      return { desde:isoDe(new Date(y,m,1)),   hasta:isoDe(new Date(y,m+1,0)),  label:'Este mes' };
  if(p==='anterior') return { desde:isoDe(new Date(y,m-1,1)), hasta:isoDe(new Date(y,m,0)),    label:'Mes anterior' };
  if(p==='90d'){ const d=new Date(n); d.setDate(d.getDate()-90); return { desde:isoDe(d), hasta:isoDe(n), label:'Últimos 90 días' }; }
  return { desde:isoDe(new Date(y,0,1)), hasta:isoDe(new Date(y,11,31)), label:'Año '+y };
}
async function vistaReportes(v){
  v.innerHTML = `
    <div class="panel">
      <div class="panel-head">
        <h3>Reportes</h3><div class="spacer"></div>
        <select id="repSel" class="ag-filtro">
          <option value="mes">Este mes</option>
          <option value="anterior">Mes anterior</option>
          <option value="90d">Últimos 90 días</option>
          <option value="anio">Este año</option>
        </select>
        <button class="btn btn-ghost btn-sm" id="repCsv">⬇ Exportar CSV</button>
      </div>
      <p class="hint" id="repRango" style="margin:0 2px 2px"></p>
    </div>
    <div class="kpi-grid" id="repKpis"><div class="loading" style="grid-column:1/-1">Cargando…</div></div>
    <div class="dash-2col">
      <div class="panel"><div class="panel-head"><h3>Ingresos por mes</h3><span class="t-sub">finalizadas</span></div><div class="panel-pad" id="repIng"></div></div>
      <div class="panel"><div class="panel-head"><h3>Servicios por ingresos</h3></div><div class="panel-pad" id="repServ"></div></div>
    </div>
    <div class="dash-2col">
      <div class="panel"><div class="panel-head"><h3>Profesionales por ingresos</h3></div><div class="panel-pad" id="repProf"></div></div>
      <div class="panel"><div class="panel-head"><h3>Resumen por estado</h3></div><div class="panel-pad" id="repEstados"></div></div>
    </div>`;
  let citas=[];
  try{ await asegurarCatalogos(); citas = await cargarCitas(true); }
  catch(ex){ el('repKpis').innerHTML = `<div class="empty" style="grid-column:1/-1">No se pudieron cargar los datos.<br><small>${esc(ex.message)}</small></div>`; return; }

  function pintar(){
    const r = rangoPeriodo(repPeriodo);
    el('repRango').textContent = `${r.label} · del ${fechaCorta(r.desde)} al ${fechaCorta(r.hasta)}`;
    const enRango = citas.filter(c=> c.fecha>=r.desde && c.fecha<=r.hasta);
    const fin = enRango.filter(c=> c.estado==='finalizada');
    const canc = enRango.filter(c=> c.estado==='cancelada').length;
    const noA = enRango.filter(c=> c.estado==='no_asistio').length;
    const ingresos = fin.reduce((s,c)=> s+(Number(c.precio)||0), 0);
    const ticket = fin.length ? Math.round(ingresos/fin.length) : 0;
    const clientes = new Set(fin.map(c=>c.clienteId)).size;
    const totalGest = enRango.length;
    const tasaCanc = totalGest ? Math.round(100*(canc+noA)/totalGest) : 0;
    const kpis = [
      { k:'Ingresos', v:money(ingresos), txt:true, ic:'M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6' },
      { k:'Servicios finalizados', v:fin.length, ic:'M9 11l3 3L22 4M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11' },
      { k:'Ticket promedio', v:money(ticket), txt:true, ic:'M3 7h18v10H3zM3 11h18M7 15h4' },
      { k:'Clientes atendidos', v:clientes, ic:'M16 21v-2a4 4 0 00-8 0v2M12 11a4 4 0 100-8 4 4 0 000 8' },
      { k:'Cancelaciones', v:canc, ic:'M18 6L6 18M6 6l12 12' },
      { k:'Inasistencias', v:noA, ic:'M12 8v4M12 16h.01M10.3 3.9l-8 14A2 2 0 004 21h16a2 2 0 001.7-3L13.7 4a2 2 0 00-3.4 0z' },
      { k:'Tasa de cancelación', v:tasaCanc+'%', txt:true, ic:'M3 3v18h18M7 14l4-4 4 4 5-6' },
      { k:'Citas gestionadas', v:totalGest, ic:'M3 5h18v16H3zM3 9h18M8 3v4M16 3v4' }
    ];
    el('repKpis').innerHTML = kpis.map(d=>`<div class="kpi"><div class="ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="${d.ic}"/></svg></div><div class="v"${d.txt?' style="font-size:1.5rem"':''}>${d.v}</div><div class="k">${d.k}</div></div>`).join('');

    // ingresos por mes dentro del rango
    const porMes={};
    fin.forEach(c=>{ const [a,m]=c.fecha.split('-'); const key=a+'-'+m; porMes[key]=(porMes[key]||0)+(Number(c.precio)||0); });
    const keys=Object.keys(porMes).sort();
    const ingData = keys.map(k=>({ label:MESES[Number(k.split('-')[1])-1], value:porMes[k] }));
    el('repIng').innerHTML = ingData.length ? barChart(ingData,{money:true}) : '<div class="empty" style="padding:24px"><p>Sin ingresos en el periodo.</p></div>';

    // servicios por ingresos
    const serv={}; fin.forEach(c=>{ const n=c.servicioNombre||'—'; serv[n]=(serv[n]||0)+(Number(c.precio)||0); });
    el('repServ').innerHTML = rankBars(Object.entries(serv).map(([label,value])=>({label,value})).sort((a,b)=>b.value-a.value).slice(0,6),{money:true});
    // profesionales por ingresos
    const prof={}; fin.forEach(c=>{ const n=c.profesionalNombre||'—'; prof[n]=(prof[n]||0)+(Number(c.precio)||0); });
    el('repProf').innerHTML = rankBars(Object.entries(prof).map(([label,value])=>({label,value})).sort((a,b)=>b.value-a.value),{money:true});
    // resumen por estado
    const est={}; enRango.forEach(c=>{ est[c.estado]=(est[c.estado]||0)+1; });
    el('repEstados').innerHTML = rankBars(Object.entries(est).map(([k,value])=>({label:ESTADOS[k]?.label||k,value})).sort((a,b)=>b.value-a.value));

    el('repCsv').onclick = ()=> exportarCSV(fin, r);
  }
  el('repSel').value = repPeriodo;
  el('repSel').onchange = (e)=>{ repPeriodo=e.target.value; pintar(); };
  pintar();
}
function exportarCSV(citas, r){
  const cab = ['Fecha','Hora','Cliente','Servicio','Profesional','Estado','Precio'];
  const filas = citas.sort((a,b)=>(a.fecha+a.horaInicio).localeCompare(b.fecha+b.horaInicio))
    .map(c=> [c.fecha, (c.horaInicio||''), (c.clienteNombre||''), (c.servicioNombre||''), (c.profesionalNombre||''), (ESTADOS[c.estado]?.label||c.estado), (Number(c.precio)||0)]);
  const total = citas.reduce((s,c)=>s+(Number(c.precio)||0),0);
  filas.push([]); filas.push(['','','','','','TOTAL', total]);
  const csv = [cab, ...filas].map(f=> f.map(x=>{ const s=String(x==null?'':x); return /[",;\n]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s; }).join(';')).join('\r\n');
  const blob = new Blob(['﻿'+csv], {type:'text/csv;charset=utf-8'});
  const url = URL.createObjectURL(blob); const a=document.createElement('a');
  a.href=url; a.download=`reporte_${repPeriodo}_${r.desde}_a_${r.hasta}.csv`; document.body.appendChild(a); a.click();
  setTimeout(()=>{ URL.revokeObjectURL(url); a.remove(); }, 100);
  toast('Reporte exportado','ok');
}

/* ============================================================
 * PAGOS Y CAJA
 * ============================================================ */
let pagFecha = '';
const METODOS = { efectivo:'Efectivo', tarjeta:'Tarjeta', transferencia:'Transferencia', otro:'Otro' };
async function vistaPagos(v){
  if(!pagFecha) pagFecha = hoyISO();
  v.innerHTML = `
    <div class="panel">
      <div class="panel-head">
        <h3>Pagos y caja</h3><div class="spacer"></div>
        <input type="date" id="pagDia" value="${pagFecha}" class="ag-filtro" style="max-width:170px">
      </div>
      <div class="kpi-grid" id="pagKpis" style="margin:4px 0 0"><div class="loading" style="grid-column:1/-1">Cargando…</div></div>
    </div>
    <div class="panel">
      <div class="panel-head"><h3>Cobros del día</h3><span class="t-sub" id="pagSub"></span></div>
      <div class="table-wrap"><table>
        <thead><tr><th>Hora</th><th>Cliente</th><th>Servicio</th><th>Profesional</th><th>Método</th><th style="text-align:right">Monto</th></tr></thead>
        <tbody id="pagBody"><tr><td colspan="6" class="loading">Cargando…</td></tr></tbody>
      </table></div>
    </div>`;
  let citas=[];
  try{ await asegurarCatalogos(); citas = await cargarCitas(true); }
  catch(ex){ el('pagBody').innerHTML = `<tr><td colspan="6" class="empty">No se pudieron cargar.<br><small>${esc(ex.message)}</small></td></tr>`; return; }

  function pintar(){
    const hoy=pagFecha;
    const [ay,am]=hoy.split('-');
    const finMes = citas.filter(c=> c.estado==='finalizada' && c.fecha.startsWith(ay+'-'+am));
    const finDia = citas.filter(c=> c.estado==='finalizada' && c.fecha===hoy).sort((a,b)=>(a.horaInicio||'').localeCompare(b.horaInicio||''));
    const totalDia = finDia.reduce((s,c)=>s+(Number(c.precio)||0),0);
    const totalMes = finMes.reduce((s,c)=>s+(Number(c.precio)||0),0);
    const porMetodo={}; finDia.forEach(c=>{ const m=c.metodoPago||'sin'; porMetodo[m]=(porMetodo[m]||0)+(Number(c.precio)||0); });
    const efe=porMetodo.efectivo||0, tar=(porMetodo.tarjeta||0)+(porMetodo.transferencia||0);
    const kpis=[
      { k:'Caja del día', v:money(totalDia), ic:'M3 7h18v10H3zM3 11h18M7 15h4' },
      { k:'Cobros del día', v:finDia.length, ic:'M9 11l3 3L22 4M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11' },
      { k:'Efectivo', v:money(efe), ic:'M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6' },
      { k:'Tarjeta / transf.', v:money(tar), ic:'M3 7h18v10H3zM3 11h18' },
      { k:'Total del mes', v:money(totalMes), ic:'M3 5h18v16H3zM3 9h18M8 3v4M16 3v4' }
    ];
    el('pagKpis').innerHTML = kpis.map(d=>`<div class="kpi"><div class="ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="${d.ic}"/></svg></div><div class="v" style="font-size:1.4rem">${d.v}</div><div class="k">${d.k}</div></div>`).join('');
    el('pagSub').textContent = fechaLarga(hoy);
    const puede = ['admin','recepcion'].includes(perfil.rol);
    el('pagBody').innerHTML = finDia.length ? finDia.map(c=>`
      <tr>
        <td>${esc((c.horaInicio||'').slice(0,5))}</td>
        <td class="t-strong">${esc(c.clienteNombre||'Cliente')}</td>
        <td>${esc(c.servicioNombre||'')}</td>
        <td>${esc(c.profesionalNombre||'')}</td>
        <td>${puede?`<select class="met-sel ag-filtro" data-met="${c.id}" style="max-width:150px"><option value="">— sin registrar —</option>${Object.entries(METODOS).map(([k,l])=>`<option value="${k}" ${c.metodoPago===k?'selected':''}>${l}</option>`).join('')}</select>`:esc(METODOS[c.metodoPago]||'—')}</td>
        <td style="text-align:right" class="t-strong">${money(c.precio)}</td>
      </tr>`).join('') : `<tr><td colspan="6"><div class="empty" style="padding:24px"><p>No hay cobros finalizados este día.</p></div></td></tr>`;
    el('pagBody').querySelectorAll('[data-met]').forEach(s=> s.onchange=async()=>{
      const id=s.getAttribute('data-met'); const val=s.value;
      try{ await fb.updateDoc(fb.doc(fb.db,'citas',id), { metodoPago: val });
        const c=(cacheCitas||[]).find(x=>x.id===id); if(c) c.metodoPago=val;
        toast('Método de pago registrado','ok'); pintar();
      }catch(ex){ toast('No se pudo guardar: '+ex.message,'bad'); }
    });
  }
  el('pagDia').onchange = (e)=>{ pagFecha=e.target.value||hoyISO(); pintar(); };
  pintar();
}

/* ============================================================
 * FICHAS DE ATENCIÓN (historia clínica por servicio)
 * ============================================================ */
async function vistaFichas(v){
  v.innerHTML = `
    <div class="panel">
      <div class="panel-head">
        <h3>Fichas de atención</h3><div class="spacer"></div>
        <div class="search"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4-4"/></svg>
          <input id="fiBuscar" placeholder="Buscar cliente o servicio"></div>
      </div>
      <p class="hint" style="margin:0 2px 2px">Registro de cada atención realizada: observaciones, productos usados y recomendaciones.</p>
      <div class="table-wrap"><table>
        <thead><tr><th>Fecha</th><th>Cliente</th><th>Servicio</th><th>Profesional</th><th>Ficha</th><th></th></tr></thead>
        <tbody id="fiBody"><tr><td colspan="6" class="loading">Cargando…</td></tr></tbody>
      </table></div>
    </div>`;
  let citas=[], fichas={};
  try{
    await asegurarCatalogos(); citas = await cargarCitas(true);
    const fs = await fb.getDocs(fb.collection(fb.db,'fichas')); fs.docs.forEach(d=> fichas[d.id]={id:d.id,...d.data()});
  }catch(ex){ el('fiBody').innerHTML = `<tr><td colspan="6" class="empty">No se pudieron cargar.<br><small>${esc(ex.message)}</small></td></tr>`; return; }
  const atenciones = citas.filter(c=> c.estado==='finalizada' || c.estado==='en_atencion')
    .sort((a,b)=> (b.fecha+(b.horaInicio||'')).localeCompare(a.fecha+(a.horaInicio||'')));

  function pintar(lista){
    const body=el('fiBody');
    body.innerHTML = lista.length ? lista.map(c=>{
      const tiene = !!fichas[c.id];
      return `<tr>
        <td>${fechaCorta(c.fecha)} <span class="t-sub">${esc((c.horaInicio||'').slice(0,5))}</span></td>
        <td class="t-strong">${esc(c.clienteNombre||'Cliente')}</td>
        <td>${esc(c.servicioNombre||'')}</td>
        <td>${esc(c.profesionalNombre||'')}</td>
        <td>${tiene?'<span class="badge on">Registrada</span>':'<span class="badge off">Pendiente</span>'}</td>
        <td><div class="row-actions"><button class="btn btn-ghost btn-sm" data-ficha="${c.id}">${tiene?'Ver / editar':'Crear ficha'}</button></div></td>
      </tr>`;
    }).join('') : `<tr><td colspan="6"><div class="empty" style="padding:24px"><p>Aún no hay atenciones finalizadas para documentar.</p></div></td></tr>`;
    body.querySelectorAll('[data-ficha]').forEach(b=> b.onclick=()=> formFicha(citas.find(x=>x.id===b.getAttribute('data-ficha')), fichas[b.getAttribute('data-ficha')], ()=>irA('fichas')));
  }
  pintar(atenciones);
  el('fiBuscar').addEventListener('input', e=>{
    const q=e.target.value.toLowerCase().trim();
    pintar(!q?atenciones:atenciones.filter(c=> (`${c.clienteNombre||''} ${c.servicioNombre||''} ${c.profesionalNombre||''}`).toLowerCase().includes(q)));
  });
}
function formFicha(cita, ficha, onOk){
  if(!cita) return;
  const e = ficha||{};
  modal({
    titulo:`Ficha · ${cita.clienteNombre||'Cliente'}`,
    textoGuardar:'Guardar ficha',
    cuerpo:`
      <p class="hint" style="margin-top:0">${esc(cita.servicioNombre||'')} · ${fechaCorta(cita.fecha)} · ${esc(cita.profesionalNombre||'')}</p>
      <div class="grid2">
        <div class="field full"><label>Motivo / estado inicial</label><textarea id="fi_motivo" rows="2">${esc(e.motivo)}</textarea></div>
        <div class="field full"><label>Procedimiento y observaciones</label><textarea id="fi_obs" rows="3">${esc(e.observaciones)}</textarea></div>
        <div class="field full"><label>Productos / insumos usados</label><textarea id="fi_prod" rows="2">${esc(e.productos)}</textarea></div>
        <div class="field full"><label>Recomendaciones para casa</label><textarea id="fi_rec" rows="2">${esc(e.recomendaciones)}</textarea></div>
        <div class="field"><label>Próxima sesión sugerida</label><input type="date" id="fi_prox" value="${esc(e.proximaSugerida)}"></div>
        <div class="field"><label>Piel / sensibilidad / alergias</label><input id="fi_piel" value="${esc(e.piel)}"></div>
      </div>`,
    guardar: async ()=>{
      const data = {
        citaId: cita.id, clienteId: cita.clienteId||'', clienteNombre: cita.clienteNombre||'',
        servicioNombre: cita.servicioNombre||'', profesionalNombre: cita.profesionalNombre||'',
        profesionalUid: perfil.id, fecha: cita.fecha,
        motivo: el('fi_motivo').value.trim(), observaciones: el('fi_obs').value.trim(),
        productos: el('fi_prod').value.trim(), recomendaciones: el('fi_rec').value.trim(),
        proximaSugerida: el('fi_prox').value, piel: el('fi_piel').value.trim(),
        actualizadoEn: fb.serverTimestamp()
      };
      if(ficha){ await fb.updateDoc(fb.doc(fb.db,'fichas',cita.id), data); }
      else { data.creadoEn = fb.serverTimestamp(); await fb.setDoc(fb.doc(fb.db,'fichas',cita.id), data); }
      await auditar(ficha?'editar':'crear','ficha',`${cita.clienteNombre} · ${cita.servicioNombre}`);
      toast('Ficha guardada','ok'); onOk && onOk();
    }
  });
}

/* ============================================================
 * CONFIGURACIÓN (+ datos de ejemplo)
 * ============================================================ */
async function vistaConfiguracion(v){
  v.innerHTML = `
    <div class="panel">
      <div class="panel-head"><h3>Configuración</h3></div>
      <div class="panel-pad">
        <div class="cfg-row">
          <div>
            <b>Datos de ejemplo</b>
            <p class="t-sub">Crea 30 clientes y ~40 citas repartidas en los últimos 3 meses para ver el dashboard y la agenda con información. Ideal para probar y afinar.</p>
          </div>
          <button class="btn btn-gold btn-sm" id="btnSeed">Cargar datos de ejemplo</button>
        </div>
        <div class="cfg-row">
          <div><b>Horario de atención</b><p class="t-sub">9:00 a.m. – 6:00 p.m. (se configurará por profesional en una próxima fase).</p></div>
        </div>
        <div class="cfg-row">
          <div><b>Proyecto</b><p class="t-sub">Firebase · tatianahernandez-40b70 · Plan Spark (gratuito)</p></div>
        </div>
      </div>
    </div>
    <p class="hint" id="seedMsg"></p>`;
  el('btnSeed').onclick = sembrarEjemplo;
}

async function sembrarEjemplo(){
  if(!await confirmar('¿Crear 30 clientes y ~40 citas de ejemplo de los últimos 3 meses?')) return;
  const btn=el('btnSeed'); btn.disabled=true; btn.textContent='Generando…';
  const msg=el('seedMsg'); const set=(t)=>{ if(msg) msg.textContent=t; };
  try{
    await asegurarCatalogos();
    // 1) Servicios con precio
    let servs = cacheServicios.filter(s=>s.activo!==false);
    if(servs.length < 3){
      const base=[
        {nombre:'Masajes relajantes',categoria:CATEGORIAS[0],precio:90000,duracionMin:60},
        {nombre:'Masaje descontracturante',categoria:CATEGORIAS[1],precio:100000,duracionMin:60},
        {nombre:'Tratamiento de bienestar avanzado',categoria:CATEGORIAS[2],precio:140000,duracionMin:75},
        {nombre:'Limpieza facial profunda',categoria:CATEGORIAS[3],precio:120000,duracionMin:60},
        {nombre:'Estética avanzada y armonía facial',categoria:CATEGORIAS[4],precio:250000,duracionMin:60}
      ];
      servs=[];
      for(const s of base){ const r=await fb.addDoc(fb.collection(fb.db,'servicios'),{...s,prepMin:0,limpiezaMin:10,activo:true,creadoEn:fb.serverTimestamp()}); servs.push({id:r.id,...s}); }
      cacheServicios=servs;
    }
    // 2) Profesionales (al menos 2) con todos los servicios habilitados
    let profs=cacheProfesionales.filter(p=>p.activo!==false);
    if(profs.length < 2){
      const nuevos=[
        {nombre:'Yuliet Tatiana Hernández',especialidad:'Cosmetología y estética'},
        {nombre:'Valentina Osorio',especialidad:'Masajes y bienestar'}
      ];
      const allServ=servs.map(s=>s.id);
      for(const p of nuevos){ const r=await fb.addDoc(fb.collection(fb.db,'profesionales'),{...p,serviciosHabilitados:allServ,diasDisponibles:['Lun','Mar','Mié','Jue','Vie','Sáb'],horaInicio:'09:00',horaFin:'18:00',activo:true,creadoEn:fb.serverTimestamp()}); profs.push({id:r.id,...p,serviciosHabilitados:allServ}); }
      cacheProfesionales=profs;
    } else { profs.forEach(p=>{ if(!(p.serviciosHabilitados||[]).length) p.serviciosHabilitados=servs.map(s=>s.id); }); }

    // 3) 30 clientes
    const nombres=['Ana','María','Valentina','Camila','Daniela','Laura','Sofía','Isabella','Juliana','Carolina','Paula','Andrea','Natalia','Luisa','Manuela','Gabriela','Sara','Mariana','Catalina','Alejandra','Diana','Lina','Tatiana','Juliana','Ángela','Carmen','Patricia','Lucía','Verónica','Adriana'];
    const apellidos=['Pérez','Gómez','Rodríguez','Ramírez','López','Martínez','García','Hernández','Ríos','Mesa','Cardona','Osorio','Castaño','Vélez','Arango','Restrepo','Giraldo','Quintero','Zapata','Muñoz'];
    const clientesIds=[];
    for(let i=0;i<30;i++){
      const nom=nombres[i%nombres.length], ape=apellidos[i%apellidos.length]+' '+apellidos[(i*3+1)%apellidos.length];
      const dreg=new Date(); dreg.setDate(dreg.getDate()-Math.floor(Math.random()*90));
      const r=await fb.addDoc(fb.collection(fb.db,'clientes'),{
        nombres:nom, apellidos:ape, identificacion:String(1000000000+Math.floor(Math.random()*8999999)),
        telefono:'3'+String(100000000+Math.floor(Math.random()*899999999)), whatsapp:'', email:(nom+'.'+ape.split(' ')[0]).toLowerCase().replace(/[^a-z.]/g,'')+'@correo.com',
        fechaNacimiento:'', observaciones:'', activo:true, fechaRegistro:isoDe(dreg), creadoEn:fb.serverTimestamp()
      });
      clientesIds.push({id:r.id,nombres:nom,apellidos:ape});
      set('Creando clientes… '+(i+1)+'/30');
    }
    // 4) ~40 citas en 90 días
    const estadosPasado=['finalizada','finalizada','finalizada','cancelada','no_asistio'];
    const estadosFuturo=['confirmada','pendiente','confirmada'];
    const horas=['09:00','10:00','11:00','12:00','14:00','15:00','16:00','17:00'];
    const total=40;
    for(let i=0;i<total;i++){
      const off=Math.floor(Math.random()*110)-90; // -90..+20 días
      const dt=new Date(); dt.setDate(dt.getDate()+off);
      if(dt.getDay()===0) dt.setDate(dt.getDate()+1); // evitar domingo
      const fecha=isoDe(dt);
      const serv=servs[Math.floor(Math.random()*servs.length)];
      const aptos=profs.filter(p=>(p.serviciosHabilitados||[]).includes(serv.id)); const prof=(aptos.length?aptos:profs)[Math.floor(Math.random()*(aptos.length||profs.length))];
      const cli=clientesIds[Math.floor(Math.random()*clientesIds.length)];
      const hora=horas[Math.floor(Math.random()*horas.length)];
      const dur=serv.duracionMin||60;
      const estado= off<0 ? estadosPasado[Math.floor(Math.random()*estadosPasado.length)] : (off===0?'confirmada':estadosFuturo[Math.floor(Math.random()*estadosFuturo.length)]);
      // evitar cruce simple (mismo prof, misma fecha+hora)
      const dup=(cacheCitas||[]).some(c=>c.profesionalId===prof.id&&c.fecha===fecha&&c.horaInicio===hora);
      if(dup) continue;
      const cita={ fecha, horaInicio:hora, horaFin:minAHHMM(mmHHaMin(hora)+dur), duracionMin:dur,
        servicioId:serv.id, servicioNombre:serv.nombre, profesionalId:prof.id, profesionalNombre:prof.nombre,
        clienteId:cli.id, clienteNombre:(cli.nombres+' '+cli.apellidos), precio:serv.precio||0, estado, observaciones:'', creadaEn:fb.serverTimestamp() };
      const r=await fb.addDoc(fb.collection(fb.db,'citas'),cita);
      if(!cacheCitas) cacheCitas=[]; cacheCitas.push({id:r.id,...cita});
      set('Creando citas… '+(i+1)+'/'+total);
    }
    await auditar('sembrar','ejemplo','30 clientes + citas');
    cacheCitas=null; window.__cli=null;
    toast('¡Datos de ejemplo creados! 🌿','ok');
    set('Listo. Revisa el Dashboard y la Agenda.');
    irA('dashboard');
  }catch(ex){ console.error(ex); toast('No se pudo generar: '+(ex.message||''),'bad'); set('Error: '+(ex.message||'')); btn.disabled=false; btn.textContent='Cargar datos de ejemplo'; }
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
