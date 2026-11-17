/* ============================================================================
 *  CONFIGURACIÓN DE FIREBASE — Panel de administración
 *  Tatiana Hernández · Estética Integral
 *  Proyecto: tatianahernandez-40b70
 *
 *  Nota de seguridad: la "apiKey" de Firebase para web NO es secreta; es un
 *  identificador público del proyecto. La seguridad real la dan las REGLAS
 *  (firebase/firestore.rules) y el inicio de sesión. Por eso es seguro tenerla aquí.
 * ========================================================================== */

export const firebaseConfig = {
  apiKey: "AIzaSyDIuYVyFCm1zEAKMIL7_XPEyxxhhxSxPRo",
  authDomain: "tatianahernandez-40b70.firebaseapp.com",
  projectId: "tatianahernandez-40b70",
  storageBucket: "tatianahernandez-40b70.firebasestorage.app",
  messagingSenderId: "764924150289",
  appId: "1:764924150289:web:582a234a39e45350b767b0",
  measurementId: "G-S7NBDY8JHC"
};

/* El panel detecta solo si ya está configurado. */
export const CONFIGURADO = !firebaseConfig.apiKey.startsWith("PEGA_AQUI");
