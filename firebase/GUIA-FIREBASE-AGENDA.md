# Agenda + Mis citas con Firebase — Guía de integración

Este paquete convierte la Agenda y Mis citas de "solo este dispositivo" a un
**backend real** con Firebase (Firestore + Authentication), con **bloqueo de
horarios** (sin dobles reservas) e **identidad por usuaria** (cada quien ve solo
sus citas). No cambia el diseño visual (beige/dorado, tipografías serif).

Archivos:
- `firestore.rules` — reglas de seguridad completas.
- `th-agenda-firebase.js` — módulo con toda la lógica (auth, reservar, mis citas, cancelar).
- Esta guía — modelo de datos, pasos, vistas HTML y explicaciones.

---

## 1. Modelo de datos

### Colección `horarios`  (una franja = un documento)
- **ID (determinista):** `AAAA-MM-DD_HH-mm`  → ej. `2026-07-25_10-00`
  (ese ID único impide que un mismo horario exista dos veces).
- **Campos:**
  | campo        | tipo   | ejemplo         |
  |--------------|--------|-----------------|
  | `fecha`      | string | `"2026-07-25"`  |
  | `hora`       | string | `"10:00"`       |
  | `servicio`   | string | `""` (opcional) |
  | `duracionMin`| number | `60`            |
  | `estado`     | string | `"disponible"` \| `"reservado"` |

### Colección `citas`  (ID automático)
| campo          | tipo      | ejemplo |
|----------------|-----------|---------|
| `userId`       | string    | UID de Firebase Auth (**se deriva de Auth, no del cliente**) |
| `nombreCliente`| string    | `"Ana Pérez"` |
| `telefono`     | string    | `"+573145435927"` |
| `servicio`     | string    | `"Limpieza facial profunda"` |
| `fecha`        | string    | `"2026-07-25"` |
| `hora`         | string    | `"10:00"` |
| `estado`       | string    | `"confirmada"` \| `"cancelada"` \| `"completada"` |
| `horarioId`    | string    | `"2026-07-25_10-00"` (slot reservado) |
| `creadaEn`     | timestamp | `serverTimestamp()` |

---

## 2. Configuración de Firebase (una sola vez)

1. Entra a **console.firebase.google.com** → crea un proyecto.
2. **Build → Firestore Database → Crear** (modo producción).
3. **Build → Authentication → Sign-in method:** activa **Teléfono** (y opcional **Correo/contraseña**).
   - Para Teléfono: agrega tu dominio (`edissonarnessen.github.io`) en *Authentication → Settings → Authorized domains*.
4. **Configuración del proyecto → Tus apps → Web (</>)**: copia el objeto `firebaseConfig`
   y pégalo en `th-agenda-firebase.js`.
5. **Firestore → Rules:** pega el contenido de `firestore.rules`. En `esAdmin()` pon
   el **UID real de Tatiana** (lo ves en *Authentication → Users* tras iniciar sesión una vez).
6. Publica horarios (una vez logueada como Tatiana), desde la consola del navegador:
   ```js
   import('./firebase/th-agenda-firebase.js').then(m =>
     m.crearHorariosDelDia('2026-07-25', ['09:00','10:30','12:00','14:00','15:30','17:00'])
   );
   ```

> **Plan gratuito (Spark):** Firestore y Auth por correo son gratis. El **SMS del
> teléfono** tiene un límite diario gratuito; con mucho volumen, Firebase pide el
> plan Blaze (pago por uso). Si prefieres 0 costo garantizado, usa **Auth por correo**.

---

## 3. Ajuste de seguridad (CSP) en `index.html`

Firebase usa dominios externos, así que hay que ampliar la Content-Security-Policy.
Reemplaza la CSP actual por esta (agrega los dominios de Google/Firebase):

```
default-src 'self'; base-uri 'self'; object-src 'none'; form-action 'self' https://wa.me;
img-src 'self' data: blob:;
style-src 'self' 'unsafe-inline';
font-src 'self' data:;
script-src 'self' 'unsafe-inline' https://www.gstatic.com https://www.google.com https://apis.google.com https://script.google.com https://script.googleusercontent.com;
connect-src 'self' https://firestore.googleapis.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://www.googleapis.com https://script.google.com https://script.googleusercontent.com;
frame-src https://www.google.com https://TU_PROYECTO.firebaseapp.com;
media-src 'self'; manifest-src 'self'; worker-src 'self'; upgrade-insecure-requests
```

> Con Firebase el sitio ya **no funciona 100% offline** (necesita conexión para
> reservar/consultar). El resto del sitio (servicios, galería, etc.) sigue offline.

---

## 4. Reglas de seguridad (resumen)

Están completas en `firestore.rules`. En corto:
- **citas:** `read`/`update` solo si `resource.data.userId == request.auth.uid`;
  `create` solo si `request.resource.data.userId == request.auth.uid`. Nunca se
  confía en un `userId` mandado por el cliente.
- **horarios:** `read` para autenticados; `update` solo del campo `estado`
  (`disponible`↔`reservado`); `create`/`delete` solo la administradora.

---

## 5. Vistas HTML (integradas al menú existente)

Tu menú ya resalta la sección activa (la función `showView` marca con `.active` el
enlace del `data-nav` correspondiente). Solo agrega estas dos secciones con su
`data-view`, y sus enlaces en el menú y en la barra inferior (ya existen "Agenda" y
"Mis citas"; estas versiones las reemplazan cuando conectes Firebase).

```html
<!-- ====== AGENDA (Firebase) ====== -->
<section class="agenda" id="agenda" data-view="agenda">
  <div class="wrap">
    <div class="sec-head reveal">
      <span class="eyebrow">Reserva tu cita</span>
      <h2>Agenda tu <span class="script metal-text">ritual de cuidado</span></h2>
    </div>

    <!-- Bloque de acceso (login) -->
    <div class="form-card reveal" id="authBox">
      <div class="field">
        <label>Tu celular (con indicativo)</label>
        <input type="tel" id="authTel" placeholder="+57 314 000 0000">
      </div>
      <button class="btn btn-gold" id="btnEnviarSMS">Recibir código por SMS</button>

      <div class="field" id="codigoWrap" hidden style="margin-top:14px">
        <label>Código que te llegó por SMS</label>
        <input type="text" id="authCodigo" inputmode="numeric" placeholder="6 dígitos">
        <button class="btn btn-gold" id="btnVerificar" style="margin-top:10px">Entrar</button>
      </div>
    </div>

    <!-- Selección de fecha + horarios -->
    <div class="form-card reveal" id="agendaBox" hidden>
      <div class="field">
        <label>Elige el día</label>
        <input type="date" id="agFecha">
      </div>
      <div class="slots" id="agSlots"></div>
      <p class="err" id="agMsg"></p>
    </div>
  </div>
</section>

<!-- ====== MIS CITAS (Firebase) ====== -->
<section class="ficha" id="miscitas" data-view="miscitas">
  <div class="wrap">
    <div class="sec-head reveal">
      <span class="eyebrow">Tus reservas</span>
      <h2>Mis <span class="script metal-text">citas</span></h2>
    </div>
    <div class="form-card reveal">
      <div id="misCitasFB"></div>
    </div>
  </div>
</section>

<!-- reCAPTCHA invisible que exige Firebase para el SMS -->
<div id="recaptcha-container"></div>
```

CSS de los horarios (añádelo a tu `<style>`, usa tu paleta):

```css
.slots{display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:10px;margin-top:8px}
.slot{display:flex;flex-direction:column;gap:2px;padding:12px;border-radius:14px;cursor:pointer;
  border:1px solid var(--line);background:var(--cream-card);color:var(--cocoa);transition:transform .2s,box-shadow .25s}
.slot:hover{transform:translateY(-2px);box-shadow:0 12px 22px -14px rgba(166,134,63,.7)}
.slot-hora{font-family:'Cormorant Garamond',serif;font-size:1.2rem;font-weight:600}
.slot-estado{font-size:.7rem;letter-spacing:.1em;text-transform:uppercase;color:var(--gold-deep)}
.slot-ocupado{opacity:.5;cursor:not-allowed;background:rgba(120,100,80,.12)}
.slot-ocupado .slot-estado{color:var(--taupe)}
```

---

## 6. JS que conecta las vistas (module glue)

```html
<script type="module">
  import {
    alCambiarSesion, enviarCodigoSMS, verificarCodigoSMS,
    reservarTurno, renderAgenda, renderMisCitasFB, cancelarCita
  } from './firebase/th-agenda-firebase.js';

  const $ = (id) => document.getElementById(id);

  // --- Login por SMS ---
  $('btnEnviarSMS').addEventListener('click', async () => {
    try { await enviarCodigoSMS($('authTel').value.trim()); $('codigoWrap').hidden = false; }
    catch (e) { alert('No se pudo enviar el SMS: ' + e.message); }
  });
  $('btnVerificar').addEventListener('click', async () => {
    try { await verificarCodigoSMS($('authCodigo').value.trim()); }
    catch (e) { alert('Código incorrecto: ' + e.message); }
  });

  // --- Cuando cambia la sesión, muestra Agenda o el login ---
  alCambiarSesion((user) => {
    $('authBox').hidden = !!user;
    $('agendaBox').hidden = !user;
    if (user) {
      const hoy = new Date().toISOString().slice(0, 10);
      $('agFecha').value = hoy; $('agFecha').min = hoy;
      renderAgenda(hoy, $('agSlots'));
      renderMisCitasFB($('misCitasFB'));
    }
  });

  // --- Cambiar de día recarga los horarios ---
  $('agFecha').addEventListener('change', (e) => renderAgenda(e.target.value, $('agSlots')));

  // --- Reservar al tocar un horario disponible ---
  $('agSlots').addEventListener('click', async (e) => {
    const b = e.target.closest('.slot:not(.slot-ocupado)'); if (!b) return;
    const nombre = prompt('Tu nombre completo:'); if (!nombre) return;
    try {
      await reservarTurno(b.dataset.horario, { nombre, servicio: b.dataset.servicio });
      $('agMsg').textContent = '¡Cita confirmada! 🌿';
      renderAgenda($('agFecha').value, $('agSlots'));   // refresca disponibilidad
      renderMisCitasFB($('misCitasFB'));
    } catch (err) {
      $('agMsg').textContent = err.message;             // "Ese horario acaba de ser tomado…"
      renderAgenda($('agFecha').value, $('agSlots'));
    }
  });

  // --- Cancelar cita ---
  $('misCitasFB').addEventListener('click', async (e) => {
    const c = e.target.closest('[data-cancelar]'); if (!c) return;
    if (!confirm('¿Cancelar esta cita?')) return;
    await cancelarCita(c.dataset.cancelar);
    renderMisCitasFB($('misCitasFB'));
    renderAgenda($('agFecha').value, $('agSlots'));      // el horario vuelve a estar libre
  });
</script>
```

---

## 7. Por qué la transacción y el userId de Auth (lo que pediste)

**¿Por qué la transacción es indispensable?**
Reservar tiene dos pasos: *leer* el horario y comprobar que está `disponible`, y
luego *escribir* que pasa a `reservado`. Sin transacción, dos clientas podrían
**leer al mismo tiempo** que el horario está libre y **ambas escribir** la reserva
→ doble cita. `runTransaction` hace ese leer-comprobar-escribir de forma **atómica**
con control de concurrencia: si el documento del horario cambió entre la lectura y
el commit, Firestore reintenta o cancela; así **solo una** reserva gana y la otra
recibe *"Ese horario acaba de ser tomado, por favor elige otro"*.

**¿Por qué el `userId` debe venir de Auth y no del cliente?**
El navegador es un entorno no confiable: cualquiera puede editar el JavaScript y
**enviar el `userId` que quiera**. Si confiáramos en ese valor, alguien podría poner
el UID de otra persona y **leer o modificar citas ajenas**. Por eso el `userId` se
toma de `auth.currentUser.uid` (identidad verificada por Firebase) y, sobre todo,
las **reglas de seguridad** exigen `resource.data.userId == request.auth.uid`: el
servidor valida la propiedad contra la identidad autenticada, algo que el cliente
**no puede falsificar**.
