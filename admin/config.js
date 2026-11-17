/* ============================================================================
 *  CONFIGURACIÓN DE FIREBASE — Panel de administración
 *  Tatiana Hernández · Estética Integral
 *
 *  CÓMO COMPLETARLA (una sola vez):
 *  1) Entra a https://console.firebase.google.com  → proyecto "tatianahernandez-40b70"
 *  2) Icono de engranaje ⚙️ (arriba a la izq.) → "Configuración del proyecto"
 *  3) Baja a "Tus apps". Si no hay una app Web, crea una con el icono </>
 *     (ponle un apodo, p. ej. "Panel admin"). NO necesitas Hosting.
 *  4) Copia el objeto firebaseConfig que te muestra y PÉGALO abajo
 *     reemplazando este objeto completo.
 *
 *  Nota de seguridad: la "apiKey" de Firebase para web NO es secreta; es un
 *  identificador público del proyecto. La seguridad real la dan las REGLAS
 *  (firebase/firestore.rules) y el login. Por eso es seguro tenerla aquí.
 * ========================================================================== */

export const firebaseConfig = {
  apiKey: "PEGA_AQUI_TU_API_KEY",
  authDomain: "tatianahernandez-40b70.firebaseapp.com",
  projectId: "tatianahernandez-40b70",
  storageBucket: "tatianahernandez-40b70.appspot.com",
  messagingSenderId: "PEGA_AQUI_TU_SENDER_ID",
  appId: "PEGA_AQUI_TU_APP_ID"
};

/* El panel detecta solo si ya está configurado (cuando reemplazas la apiKey). */
export const CONFIGURADO = !firebaseConfig.apiKey.startsWith("PEGA_AQUI");
