'use strict';
require('dotenv').config();
const bcrypt = require('bcryptjs');
const db = require('./db');

const email = (process.env.SEED_EMAIL || 'tatiana@cosmetologia.com').toLowerCase();
const password = process.env.SEED_PASSWORD || 'Tatiana2025*';
const name = process.env.SEED_NAME || 'Tatiana Hernández';

const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
if (existing) {
  console.log(`La usuaria ${email} ya existe. No se hace nada.`);
  process.exit(0);
}

const hash = bcrypt.hashSync(password, 10);
db.prepare('INSERT INTO users (name,email,password_hash,role) VALUES (?,?,?,?)')
  .run(name, email, hash, 'cosmetologa');

console.log('Usuaria creada correctamente:');
console.log('  Correo:      ' + email);
console.log('  Contraseña:  ' + password);
console.log('\n  Cambia la contraseña en producción (variable SEED_PASSWORD).');
process.exit(0);
