'use strict';
const jwt = require('jsonwebtoken');

const SECRET = process.env.JWT_SECRET || 'cambia-este-secreto-en-produccion';
const TOKEN_NAME = 'th_token';

function signToken(user) {
  return jwt.sign(
    { id: user.id, name: user.name, email: user.email, role: user.role },
    SECRET,
    { expiresIn: '12h' }
  );
}

// Protege rutas: exige token válido en cookie o header Authorization
function requireAuth(req, res, next) {
  const fromCookie = req.cookies && req.cookies[TOKEN_NAME];
  const header = req.headers.authorization || '';
  const fromHeader = header.startsWith('Bearer ') ? header.slice(7) : null;
  const token = fromCookie || fromHeader;
  if (!token) return res.status(401).json({ error: 'No autenticado' });
  try {
    req.user = jwt.verify(token, SECRET);
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Sesión inválida o expirada' });
  }
}

module.exports = { signToken, requireAuth, TOKEN_NAME, SECRET };
