# Sistema de administración — Tatiana Hernández · Estética Integral
## Fase 1 (cimientos): guía de conexión y modelo de datos

El panel vive en la carpeta **`admin/`** y es **independiente** de la página pública
(el sitio de presentación no cambia). Está construido sobre **Firebase**
(Authentication + Firestore), por lo que no necesitas servidor propio.

Archivos:
- `admin/index.html` — estructura (login + panel).
- `admin/estilos.css` — diseño (beige/crema/dorado, responsive).
- `admin/app.js` — toda la lógica (login, roles, módulos).
- `admin/config.js` — **aquí pegas la configuración de tu proyecto Firebase**.
- `firebase/firestore.rules` — reglas de seguridad por rol.

---

## 1. Qué incluye la Fase 1
- **Inicio de sesión** por correo y contraseña, con **roles**.
- **Dashboard** con indicadores (clientes, profesionales, servicios activos).
- **Clientes**: registrar, editar, activar/inactivar, búsqueda por nombre/cédula/teléfono.
- **Profesionales**: registrar, especialidad, **servicios que puede realizar**, días y horario.
- **Servicios**: catálogo por categoría, precio, duración, preparación y limpieza de cabina;
  botón para **cargar el catálogo base** (los 5 servicios).
- **Usuarios del panel**: la administradora crea cuentas de Recepción y Profesional.
- **Auditoría**: cada cambio queda registrado (quién y cuándo).

Los módulos **Agenda, Fichas de atención, Pagos, Reportes y Configuración**
aparecen en el menú marcados como *“· pronto”* y se construyen en las fases siguientes.

---

## 2. Roles y qué ve cada uno
| Rol | Acceso |
|-----|--------|
| **Administrador** | Todo: dashboard, clientes, profesionales, servicios, usuarios (y lo que viene). |
| **Recepcionista** | Dashboard y Clientes (y, en Fase 2, agenda y pagos). |
| **Profesional** | Dashboard (y, en Fase 2, su agenda y fichas de atención). |

Las reglas de seguridad (`firestore.rules`) obligan estos permisos **en el servidor**:
aunque alguien manipule el navegador, no puede ver ni cambiar lo que su rol no permite.

---

## 3. Modelo de datos (colecciones de Firestore)
- **usuarios/{uid}**: `nombre, email, rol` (`admin|recepcion|profesional`), `activo`.
- **clientes/{id}**: `identificacion, nombres, apellidos, telefono, whatsapp, email,
  fechaNacimiento, fechaRegistro, observaciones, activo`.
- **profesionales/{id}**: `nombre, documento, telefono, email, especialidad,
  serviciosHabilitados[], diasDisponibles[], horaInicio, horaFin, activo`.
- **servicios/{id}**: `nombre, categoria, descripcion, precio, duracionMin, prepMin,
  limpiezaMin, activo`.
- **auditoria/{id}**: `accion, entidad, detalle, porUid, porNombre, rol, en`.
- *(Fase 2)* **citas, pagos, fichas** — ya contempladas en las reglas.

---

## 4. Conexión (una sola vez) — pasos en la consola de Firebase
Proyecto: **tatianahernandez-40b70** (`console.firebase.google.com`).

1. **Firestore Database → Crear base de datos** → modo *producción* → ubicación
   `southamerica-east1` (o la que prefieras). Crear.
2. **Firestore → Reglas**: borra lo que haya y **pega el contenido de
   `firebase/firestore.rules`** → *Publicar*.
3. **Authentication → Comenzar → Sign-in method → Correo/contraseña → Habilitar**.
4. **Authentication → Users → Agregar usuario**: escribe el correo y una contraseña
   para Tatiana (la **administradora**). Al crearlo, **copia el UID** que aparece.
5. **Firestore → Iniciar colección**:
   - ID de la colección: `usuarios`
   - ID del documento: **pega el UID** del paso 4
   - Campos:
     - `nombre` (string) = `Yuliet Tatiana Hernández`
     - `email` (string) = el mismo correo
     - `rol` (string) = `admin`
     - `activo` (boolean) = `true`
   - Guardar. *(Este es el primer administrador; los demás se crean desde el panel.)*
6. **Configuración del proyecto ⚙️ → Tus apps → Web `</>`** (créala si no existe) y
   **copia el objeto `firebaseConfig`**. Pégalo en **`admin/config.js`** reemplazando
   las líneas `PEGA_AQUI…`.

Listo: entra a `…/Cosmetologia/admin/` con el correo y la contraseña del paso 4.

> La **apiKey** de Firebase para web no es secreta (es un identificador público);
> la seguridad real la dan las reglas y el login. Por eso es seguro tenerla en el código.

---

## 5. Crear el resto del equipo (desde el panel)
Una vez dentro como administradora: **Usuarios → + Nuevo usuario** → nombre, correo,
rol (Recepcionista o Profesional) y una contraseña temporal. La cuenta se crea sin
cerrar tu sesión.

---

## 6. Roadmap siguiente
- **Fase 2 — Agenda y reservas**: calendario (día/semana/mes/profesional/cabina),
  estados de cita, validación de choques de horario, tiempos de preparación/limpieza,
  reglas de negocio (ninguna cita sin profesional, sin dobles reservas).
- **Fase 3 — Fichas de atención y seguimiento** (incl. consentimiento informado).
- **Fase 4 — Pagos y caja**.
- **Fase 5 — Reportes** (Excel/PDF) y **notificaciones** (WhatsApp/correo).

---

## 7. Protección de datos (Colombia · Ley 1581 de 2012)
El sistema maneja datos personales y de salud. Recomendaciones:
- Mantener contraseñas fuertes y por persona (no compartir cuentas).
- Diligenciar y guardar el **consentimiento informado** (Fase 3).
- Informar a las clientas la finalidad del tratamiento de sus datos.
- Hacer copias de seguridad periódicas (Firestore → Exportar).
