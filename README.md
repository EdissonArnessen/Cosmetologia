# Tatiana Hernández — Plataforma Clínica de Cosmetología Estética

Aplicación web full-stack para la gestión clínica del consultorio: registro de
pacientes, ficha técnica digital de acné, diagnóstico automático, plan de
tratamiento por sesiones, consentimiento informado con firma, agenda de citas y
panel administrativo con estadísticas.

Diseñada con la identidad de marca (crema · dorado · bronce, tipografías
Cormorant Garamond + Pinyon Script) y conectada a **WhatsApp** para los
recordatorios y el contacto con pacientes.

---

## 1. Requisitos

- **Node.js 18 o superior** (probado en Node 22)
- npm (incluido con Node)

---

## 2. Instalación y arranque (desarrollo)

```bash
# 1. Instalar dependencias
npm install

# 2. Crear el archivo de configuración
cp .env.example .env
#    (edita .env y cambia JWT_SECRET y SEED_PASSWORD)

# 3. Crear la usuaria inicial (cosmetóloga)
npm run seed

# 4. Arrancar el servidor
npm start
```

Abre el navegador en **http://localhost:3000**

- Página pública (clientes): `/`
- Acceso al panel: `/login.html`
- Panel profesional: `/app`

### Credenciales por defecto

| Correo | Contraseña |
|---|---|
| `tatiana@cosmetologia.com` | `Tatiana2025*` |

> **Cambia estos datos antes de poner la app en producción** (variables
> `SEED_EMAIL`, `SEED_PASSWORD` en `.env`, o creando la usuaria con otra clave).

---

## 3. Base de datos

Por defecto la app usa **SQLite** (archivo `data.db`), que se crea solo al
arrancar. No requiere instalar ningún motor de base de datos: ideal para
empezar a usar de inmediato.

Para **producción con MySQL 8** se incluye el esquema equivalente en
`server/schema.mysql.sql`:

```bash
mysql -u root -p < server/schema.mysql.sql
```

(En ese caso habría que adaptar `server/db.js` para usar un cliente MySQL como
`mysql2`. La estructura de tablas es idéntica.)

---

## 4. Estructura del proyecto

```
tatiana-app/
├── package.json
├── .env.example
├── server/
│   ├── index.js           Servidor Express + seguridad
│   ├── db.js              Conexión SQLite + carga del esquema
│   ├── auth.js            JWT + middleware de protección
│   ├── diagnosis.js       Motor de diagnóstico automático de acné
│   ├── seed.js            Crea la usuaria inicial
│   ├── schema.sql         Esquema SQLite (desarrollo)
│   ├── schema.mysql.sql   Esquema MySQL 8 (producción)
│   └── routes/
│       ├── auth.js        Login / logout / perfil
│       ├── patients.js    CRUD de pacientes + búsqueda
│       ├── fichas.js      Ficha técnica + diagnóstico
│       ├── clinical.js    Sesiones, consentimientos, citas, fotos
│       └── dashboard.js   Estadísticas
└── public/
    ├── index.html         Página pública (clientes)
    ├── login.html         Acceso al panel
    ├── app.html           Shell del panel (SPA)
    ├── manifest.json      PWA
    ├── css/style.css      Sistema de diseño de marca
    └── js/
        ├── api.js         Cliente de API + utilidades
        ├── ficha.js       Ficha de acné, mapa facial, sesiones, consentimiento
        └── app.js         Router y vistas del panel
```

---

## 5. Módulos incluidos

1. **Acceso seguro** — login con contraseña cifrada (bcrypt) y sesión por JWT.
2. **Pacientes** — registro, búsqueda y edición.
3. **Ficha técnica de acné** — antecedentes de salud, mapa facial interactivo,
   clasificación de piel, poros y afecciones.
4. **Diagnóstico** — selección de tipo y grado de acné + sugerencia automática.
5. **Consentimiento informado** — texto legal, firma digital del paciente y de
   la cosmetóloga, y exportación a **PDF**.
6. **Plan de tratamiento por sesiones** — protocolo de 13 pasos, procedimientos
   y cuidados en casa.
7. **Historia clínica** — línea de tiempo con todo el historial del paciente.
8. **Fotografías clínicas** — antes / durante / después.
9. **Agenda** — citas con estados y recordatorio por WhatsApp.
10. **Panel administrativo** — métricas, próximas citas y procedimientos más
    realizados.

---

## 6. Seguridad

- Contraseñas cifradas con **bcrypt**.
- Sesiones con **JWT** en cookie `httpOnly`.
- Cabeceras protegidas con **helmet** (CSP, anti-clickjacking, nosniff).
- **Límite de intentos** de login y de peticiones a la API.
- Consultas con sentencias preparadas (protección contra inyección SQL).

---

## 7. Despliegue en un servidor

1. Sube el proyecto al servidor (sin `node_modules` ni `data.db`).
2. `npm install --production`
3. Crea el `.env` con un `JWT_SECRET` largo y `NODE_ENV=production`.
4. `npm run seed`
5. Mantén el proceso vivo con **pm2**: `pm2 start server/index.js --name tatiana`
6. Pon **Nginx** delante con HTTPS (Let's Encrypt). Con `NODE_ENV=production`
   la cookie de sesión viaja solo por HTTPS.

---

## 8. Pendientes recomendados para una siguiente fase

- Almacenar las fotos como archivos en disco / nube en lugar de base64 (en
  producción con MySQL, mover a almacenamiento de objetos).
- Recordatorios automáticos por correo o WhatsApp Business API (requieren un
  servicio externo y, en el caso de WhatsApp, una cuenta de proveedor).
- Exportación de la historia clínica completa a PDF/Excel.
- Edición de pacientes y sesiones desde la interfaz (el backend ya lo soporta).

---

*Tu bienestar es mi prioridad, y tu equilibrio mi propósito.*
