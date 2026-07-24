# Guía de publicación y seguridad — Tatiana Hernández · Estética Integral

Esta guía te explica, paso a paso y en lenguaje sencillo, cómo **publicar tu
página gratis en internet**, qué mejoras de **seguridad** se aplicaron y cómo
**mantenerla** (cambiar la clave, precios, WhatsApp, etc.).

El sitio es un **único archivo** (`index.html`) más algunos archivos de apoyo.
Funciona en **computador, celular y tableta**, se puede **instalar como app** y
abre incluso **sin conexión**.

---

## 1. ¿Qué se mejoró?

**Seguridad**
- **HTTPS** (candado) automático en todas las opciones de publicación gratuitas.
- **Content-Security-Policy (CSP)** y otras cabeceras que limitan de dónde puede
  cargarse el código: reduce el riesgo de inyección de scripts (XSS).
- **La clave de administrador ya no está en el código en texto plano.** Ahora se
  guarda solo su “huella” (SHA-256) y se verifica de forma segura. Además hay
  **bloqueo temporal** tras 5 intentos fallidos.
- Todos los datos que se muestran en el panel se **escapan** (no se puede colar
  código a través de un nombre o una nota).

**Compatibilidad y estabilidad**
- **Responsive** afinado para móvil, **tableta** y escritorio, con textos y
  botones de tamaño cómodo para el dedo.
- **PWA**: `manifest.webmanifest` + `sw.js` (service worker) → carga rápida,
  instalable y con **modo sin conexión**.
- **Accesibilidad**: foco visible para navegación con teclado, mejor contraste
  de interacción.

**Presencia profesional (SEO y redes)**
- Título y descripción optimizados, **Open Graph / Twitter** para que se vea
  bonito al compartir por WhatsApp/redes.
- **Datos estructurados** (JSON-LD tipo *BeautySalon*) para buscadores.
- `favicon.svg`, iconos de instalación, `robots.txt` y `sitemap.xml`.

---

## 2. Publicar GRATIS — elige UNA opción

> Las tres son gratuitas y dan HTTPS. Ordenadas de más simple a más completa.

### Opción A · Netlify Drop (la más rápida, sin cuenta técnica)
1. Entra a **https://app.netlify.com/drop**
2. Arrastra la **carpeta del proyecto** (la que contiene `index.html`).
3. En segundos te da una dirección tipo `https://tu-sitio.netlify.app`.
4. Ventaja: aplica automáticamente las **cabeceras de seguridad** del archivo
   `_headers`. Puedes conectar tu dominio propio gratis.

### Opción B · GitHub Pages (automático desde este repositorio)
Ya dejé configurado el despliegue automático (`.github/workflows/deploy-pages.yml`).
Una sola vez debes activarlo:
1. En GitHub, entra al repositorio → **Settings** → **Pages**.
2. En **Build and deployment → Source**, elige **GitHub Actions**.
3. Aprueba/fusiona los cambios a la rama **main**. El sitio se publica solo en
   `https://edissonarnessen.github.io/cosmetologia/`.
4. Cada vez que se actualice `main`, se vuelve a publicar automáticamente.

> GitHub Pages no permite cabeceras personalizadas, por eso la seguridad
> esencial (CSP, referrer, nosniff) va también dentro del HTML como `<meta>`.

### Opción C · Cloudflare Pages (rendimiento y seguridad completos)
1. Entra a **https://pages.cloudflare.com** → *Create a project* → conecta tu
   cuenta de GitHub y elige este repositorio.
2. *Build command*: **(vacío)**. *Output directory*: **`/`** (raíz).
3. Publica. Aplica automáticamente el archivo `_headers` (CSP, HSTS, etc.).

---

## 3. Muy importante: ajusta la dirección de tu sitio

Cuando sepas tu dirección final (por ejemplo `https://tusitio.netlify.app`),
reemplázala en estos archivos donde hoy aparece
`https://edissonarnessen.github.io/cosmetologia/`:
- `index.html` → etiquetas `canonical`, `og:url` y el bloque JSON-LD.
- `robots.txt` y `sitemap.xml`.

No es obligatorio para que funcione, pero mejora el posicionamiento (SEO) y
cómo se ve al compartir el enlace.

---

## 4. Cambiar la clave de administrador (¡hazlo!)

La clave por defecto es **`Tatiana2025*`**. Cámbiala así:

1. Abre tu sitio ya publicado, pulsa **F12** (o clic derecho → *Inspeccionar*)
   y ve a la pestaña **Console** (Consola).
2. Pega esto, escribe tu nueva clave entre las comillas y pulsa Enter:
   ```js
   (async p => { const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(p));
   return [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join(''); })('MI-NUEVA-CLAVE').then(console.log)
   ```
3. Copia el texto largo que aparece (la “huella”).
4. En `index.html`, busca `var CLAVE_HASH =` y reemplaza el valor entre comillas
   por tu huella. Guarda y vuelve a publicar.

> Consejo: una clave fuerte tiene 12+ caracteres, con mayúsculas, números y un
> símbolo.

---

## 5. Sobre los datos y la privacidad (importante)

- Las citas, fichas y consentimientos se guardan **en el dispositivo** donde se
  usan (almacenamiento local del navegador). **No viajan a ningún servidor** a
  menos que conectes Google Sheets (ver punto 6).
- Por eso: **usa el panel de administrador solo en tu propio equipo**, no en
  computadores públicos o compartidos.
- Como manejas **datos personales de salud**, en Colombia aplica la Ley 1581 de
  2012 (*Habeas Data*): pide autorización de tratamiento de datos a tus
  pacientes (el consentimiento informado ya ayuda) y no compartas la información.
- Si en el futuro necesitas historia clínica robusta multiusuario, este mismo
  repositorio incluye una **versión con servidor** (`server/`, ver `README.md`)
  con base de datos, login real y respaldo — ideal cuando quieras dar ese paso.

---

## 6. (Opcional) Respaldo en la nube con Google Sheets — gratis

Para que las citas/fichas se guarden también en una hoja de cálculo tuya:
1. Crea el Apps Script de Google (hoja + `Implementar → Aplicación web`).
2. Copia la URL que termina en `/exec`.
3. En `index.html`, busca `var REGISTRO_URL` y `var REGISTRO_TOKEN` y pon tu URL
   y tu clave secreta. Con esto, además, el login de administrador se valida
   contra tu servidor de Google.

---

## 7. Personalizar (todo dentro de `index.html`)

- **WhatsApp**: busca `var WA = "573145435927"` y pon tu número (con código de
  país, sin `+` ni espacios).
- **Precios y abono**: busca `var PRECIOS` y `var ABONO` (Nequi, Daviplata,
  banco, porcentaje del abono).
- **Promociones**: busca `var PROMOS` (puedes editar textos y ofertas).
- **Redes**: Instagram y TikTok están en el pie de página y en los botones
  flotantes.

---

## 8. Publicar una versión nueva

Cada vez que cambies el `index.html`:
- **Netlify Drop**: vuelve a arrastrar la carpeta.
- **GitHub Pages / Cloudflare**: sube los cambios (o fusiona a `main`) y se
  publica solo.
- Si activaste el modo sin conexión y no ves los cambios, sube el número de
  versión del caché en `sw.js` (`th-estetica-v1` → `v2`) para forzar la
  actualización.

---

*Tu bienestar es mi prioridad, y tu equilibrio mi propósito.* 🌿
