'use strict';
require('dotenv').config();
const path = require('path');
const express = require('express');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 3000;

// --- Seguridad de cabeceras (XSS, clickjacking, etc.) ---
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", 'https://cdn.jsdelivr.net', "'unsafe-inline'"],
      styleSrc: ["'self'", 'https://cdn.jsdelivr.net', 'https://fonts.googleapis.com', 'https://cdnjs.cloudflare.com', "'unsafe-inline'"],
      fontSrc: ["'self'", 'https://fonts.gstatic.com', 'https://cdnjs.cloudflare.com'],
      imgSrc: ["'self'", 'data:', 'blob:'],
      connectSrc: ["'self'"]
    }
  },
  crossOriginEmbedderPolicy: false
}));

app.use(express.json({ limit: '12mb' })); // límite amplio para fotos/firmas base64
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Límite general de peticiones a la API
app.use('/api', rateLimit({ windowMs: 60 * 1000, max: 200 }));

// --- Rutas de la API ---
app.use('/api/auth', require('./routes/auth'));
app.use('/api/patients', require('./routes/patients'));
app.use('/api/fichas', require('./routes/fichas'));
app.use('/api/clinical', require('./routes/clinical'));
app.use('/api/dashboard', require('./routes/dashboard'));

// --- Archivos estáticos (frontend) ---
app.use(express.static(path.join(__dirname, '..', 'public')));

// SPA fallback para rutas del panel
app.get(/^\/app(\/.*)?$/, (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'app.html'));
});

// Manejo de errores
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

app.listen(PORT, () => {
  console.log(`\n  Tatiana Hernández — Plataforma clínica`);
  console.log(`  Servidor activo en http://localhost:${PORT}\n`);
});
