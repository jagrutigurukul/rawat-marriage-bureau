// Builds the app once per server instance, using environment variables (Vercel → Settings → Environment Variables).
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const express = require('express');
const { createApp } = require('./app');

const missing = ['DATABASE_URL', 'JWT_SECRET'].filter((k) => !process.env[k]);
let app;
if (missing.length) {
  app = express();
  app.use('/api', (req, res) => res.status(503).json({ ok: false, code: 'CONFIG_MISSING', missing }));
  console.error('Missing environment variables:', missing.join(', '));
} else {
  app = createApp({ JWT_SECRET: process.env.JWT_SECRET, TOKEN_DAYS: +(process.env.TOKEN_DAYS || 7) });
}
module.exports = app;
