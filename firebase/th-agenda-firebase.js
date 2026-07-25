/* ============================================================================
 *  MÓDULO DE AGENDA + MIS CITAS con Firebase (Firestore + Auth)
 *  Tatiana Hernández · Estética Integral
 *
 *  Cómo se usa: se importa como módulo ESM desde el HTML:
 *    <script type="module" src="firebase/th-agenda-firebase.js"></script>
 *
 *  Requiere: un proyecto de Firebase con Firestore y Authentication activados
 *  (Teléfono y/o Correo). Pega tu configuración en firebaseConfig (abajo).
 * ========================================================================== */

// --- SDK de Firebase (v10, modular, desde el CDN oficial) ---
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js';
import {
  getFirestore, doc, collection, getDocs, setDoc, query, where, orderBy,
  runTransaction, serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js';
import {
  getAuth, onAuthStateChanged, signOut,
  RecaptchaVerifier, signInWithPhoneNumber,
  signInWithEmailAndPassword
} from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js';

/* ============================================================
 * 1) CONFIGURACIÓN  — reemplaza con la de TU proyecto Firebase
 *    (Consola de Firebase > Configuración del proyecto > Tus apps > Web)
 * ============================================================ */
const firebaseConfig = {
  apiKey: "TU_API_KEY",
  authDomain: "TU_PROYECTO.firebaseapp.com",
  projectId: "TU_PROYECTO",
  storageBucket: "TU_PROYECTO.appspot.com",
  messagingSenderId: "TU_SENDER_ID",
  appId: "TU_APP_ID"
};

const app  = initializeApp(firebaseConfig);
const db   = getFirestore(app);
const auth = getAuth(app);

/* ============================================================
 * 2) LOGIN CON FIREBASE AUTH (teléfono por SMS + alterno por correo)
 * ============================================================ */

// Guarda temporalmente el "reto" del SMS entre "enviar código" y "verificar código".
let confirmacionSMS = null;

/* Prepara el reCAPTCHA (invisible) que Firebase exige para el envío de SMS.
 * Necesita un contenedor vacío en el HTML: <div id="recaptcha-container"></div> */
function iniciarRecaptcha() {
  if (window.__recaptcha) return;
  window.__recaptcha = new RecaptchaVerifier(auth, 'recaptcha-container', { size: 'invisible' });
}

/* Paso 1 del login por teléfono: envía el código por SMS.
 * telefonoE164 debe ir en formato internacional, ej: "+573145435927" */
async function enviarCodigoSMS(telefonoE164) {
  iniciarRecaptcha();
  confirmacionSMS = await signInWithPhoneNumber(auth, telefonoE164, window.__recaptcha);
  return true; // el SMS fue enviado; ahora pide el código a la clienta
}

/* Paso 2 del login por teléfono: verifica el código de 6 dígitos.
 * Al confirmarlo, Firebase crea/recupera la usuaria y devuelve su UID estable. */
async function verificarCodigoSMS(codigo) {
  if (!confirmacionSMS) throw new Error('Primero solicita el código por SMS.');
  const cred = await confirmacionSMS.confirm(codigo);
  return cred.user; // cred.user.uid  ·  cred.user.phoneNumber
}

/* Alternativa por correo electrónico (si la clienta prefiere no usar SMS). */
async function loginCorreo(email, password) {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  return cred.user;
}

/* Cierra la sesión. */
function cerrarSesion() { return signOut(auth); }

/* Reacciona a los cambios de sesión (login/logout) para pintar la interfaz. */
function alCambiarSesion(callback) { return onAuthStateChanged(auth, callback); }

/* ============================================================
 * 3) RESERVA DE TURNO  (transacción: evita citas duplicadas)
 *    reservarTurno(horarioId, datosCliente)
 *    - horarioId: ID determinista del slot, ej "2026-07-25_10-00"
 *    - datosCliente: { nombre, telefono, servicio? }
 * ============================================================ */
async function reservarTurno(horarioId, datosCliente) {
  const user = auth.currentUser;
  if (!user) throw new Error('Inicia sesión para reservar tu cita.');

  const horarioRef = doc(db, 'horarios', horarioId);
  const citaRef    = doc(collection(db, 'citas')); // ID automático para la cita

  // runTransaction: lee y escribe de forma ATÓMICA. Si el horario cambia entre
  // la lectura y la escritura, Firestore reintenta o cancela la operación.
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(horarioRef);          // 1) leer el horario
    if (!snap.exists()) throw new Error('Ese horario ya no existe.');

    const h = snap.data();
    if (h.estado !== 'disponible') {                // 2) verificar disponibilidad
      throw new Error('Ese horario acaba de ser tomado, por favor elige otro');
    }

    tx.update(horarioRef, { estado: 'reservado' }); // 3) bloquear el horario
    tx.set(citaRef, {                               // 4) crear la cita ligada
      userId: user.uid,                             //    ← UID de Auth (NO del cliente)
      nombreCliente: datosCliente.nombre || '',
      telefono: datosCliente.telefono || user.phoneNumber || '',
      servicio: h.servicio || datosCliente.servicio || '',
      fecha: h.fecha,
      hora: h.hora,
      estado: 'confirmada',
      horarioId: horarioId,
      creadaEn: serverTimestamp()
    });
  });

  return citaRef.id; // id de la cita creada
}

/* ============================================================
 * 4) MIS CITAS  (cada usuaria ve SOLO las suyas)
 *    obtenerMisCitas()  → arreglo de citas del usuario actual
 * ============================================================ */
async function obtenerMisCitas() {
  const user = auth.currentUser;
  if (!user) return [];
  // El filtro por userId + las reglas de seguridad garantizan que nadie vea
  // las citas de otra persona.
  const q = query(
    collection(db, 'citas'),
    where('userId', '==', user.uid),
    orderBy('fecha')
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/* ============================================================
 * 5) CANCELAR CITA  (transacción: cancela y libera el horario)
 *    cancelarCita(citaId)
 * ============================================================ */
async function cancelarCita(citaId) {
  const user = auth.currentUser;
  if (!user) throw new Error('Inicia sesión.');

  const citaRef = doc(db, 'citas', citaId);

  await runTransaction(db, async (tx) => {
    // --- Primero TODAS las lecturas, luego las escrituras (regla de Firestore) ---
    const citaSnap = await tx.get(citaRef);
    if (!citaSnap.exists()) throw new Error('La cita no existe.');

    const c = citaSnap.data();
    if (c.userId !== user.uid) throw new Error('No puedes cancelar esta cita.');
    if (c.estado === 'cancelada') return; // ya estaba cancelada

    let horarioRef = null, horarioExiste = false;
    if (c.horarioId) {
      horarioRef = doc(db, 'horarios', c.horarioId);
      const hs = await tx.get(horarioRef);
      horarioExiste = hs.exists();
    }

    // --- Escrituras ---
    tx.update(citaRef, { estado: 'cancelada' });                 // cancela la cita
    if (horarioExiste) tx.update(horarioRef, { estado: 'disponible' }); // libera el slot
  });
}

/* ============================================================
 * 6) HORARIOS de un día  (para pintar la Agenda)
 *    cargarHorarios("2026-07-25") → arreglo de slots ordenados por hora
 * ============================================================ */
async function cargarHorarios(fecha) {
  const q = query(
    collection(db, 'horarios'),
    where('fecha', '==', fecha),
    orderBy('hora')
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/* ============================================================
 * 7) SEMBRAR HORARIOS (solo la profesional/administradora)
 *    crearHorariosDelDia("2026-07-25", ["09:00","10:30","12:00"], "")
 *    El ID determinista "fecha_HH-mm" impide crear el mismo slot dos veces.
 * ============================================================ */
/* Horas de trabajo por defecto: 9:00 a. m. – 6:00 p. m.
   Cada franja dura 60 min; la última inicia a las 17:00 y termina a las 18:00. */
function horasLaborales() {
  return ['09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00'];
}

async function crearHorariosDelDia(fecha, horas = horasLaborales(), servicio = '') {
  for (const hora of horas) {
    const id = fecha + '_' + hora.replace(':', '-'); // "2026-07-25_10-00"
    await setDoc(doc(db, 'horarios', id), {
      fecha, hora, servicio, duracionMin: 60, estado: 'disponible'
    }); // sin merge: si ya existe, lo deja tal cual (no duplica)
  }
}

/* ============================================================
 * 8) PINTAR LAS VISTAS (Agenda y Mis citas)
 * ============================================================ */

/* AGENDA: pinta la lista de horarios del día; los 'reservado' salen en gris. */
async function renderAgenda(fecha, contenedor) {
  contenedor.innerHTML = '<div class="ag-cargando">Cargando horarios…</div>';
  const slots = await cargarHorarios(fecha);
  if (!slots.length) {
    contenedor.innerHTML = '<div class="ag-vacio">No hay horarios publicados para este día.</div>';
    return;
  }
  contenedor.innerHTML = slots.map((s) => {
    const ocupado = s.estado !== 'disponible';
    return `<button type="button" class="slot ${ocupado ? 'slot-ocupado' : ''}"
              data-horario="${s.id}" data-servicio="${s.servicio || ''}"
              ${ocupado ? 'disabled aria-disabled="true"' : ''}>
              <span class="slot-hora">${s.hora}</span>
              <span class="slot-estado">${ocupado ? 'Reservado' : 'Disponible'}</span>
            </button>`;
  }).join('');
}

/* MIS CITAS: pinta las citas de la usuaria como tarjetas, con botón Cancelar. */
async function renderMisCitasFB(contenedor) {
  if (!auth.currentUser) {
    contenedor.innerHTML = '<div class="mc-empty">Inicia sesión para ver tus citas.</div>';
    return;
  }
  contenedor.innerHTML = '<div class="ag-cargando">Cargando tus citas…</div>';
  const citas = await obtenerMisCitas();
  if (!citas.length) {
    contenedor.innerHTML = '<div class="mc-empty">Aún no tienes citas. ¡Agenda la primera!</div>';
    return;
  }
  const badge = { confirmada: 'mc-manana', cancelada: 'mc-pasada', completada: 'mc-proxima' };
  contenedor.innerHTML = citas.map((c) => `
    <div class="mc-card ${c.estado === 'cancelada' ? 'mc-past' : ''}">
      <div class="mc-top">
        <span class="mc-serv">${c.servicio || 'Servicio'}</span>
        <span class="mc-badge ${badge[c.estado] || ''}">${c.estado}</span>
      </div>
      <div class="mc-meta">🗓️ ${c.fecha} · 🕐 ${c.hora}</div>
      ${c.estado === 'confirmada'
        ? `<div class="mc-actions"><button type="button" class="mc-btn" data-cancelar="${c.id}">Cancelar cita</button></div>`
        : ''}
    </div>`).join('');
}

/* ============================================================
 * 9) EXPORTA todo para usarlo desde el resto de la app
 * ============================================================ */
export {
  auth, db,
  enviarCodigoSMS, verificarCodigoSMS, loginCorreo, cerrarSesion, alCambiarSesion,
  reservarTurno, obtenerMisCitas, cancelarCita,
  cargarHorarios, crearHorariosDelDia, horasLaborales,
  renderAgenda, renderMisCitasFB
};
