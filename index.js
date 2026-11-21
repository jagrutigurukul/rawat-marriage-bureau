// Vercel entry point (Express preset, zero-config): Vercel finds this file, sees it imports express,
// and runs the exported app as one Vercel Function. Files in public/ are served by Vercel's CDN.
const fs = require('fs');
const path = require('path');
const express = require('express');
const api = require('./lib/instance');

const app = express();
app.use(api);
// Fallback: if a page request ever reaches the function, answer with the website shell.
const INDEX = path.join(__dirname, 'public', 'index.html');
app.get(/^\/(?!api\/).*/, (req, res, next) => fs.readFile(INDEX, 'utf8', (e, html) => (e ? next() : res.type('html').set('Cache-Control', 'no-cache').send(html))));

module.exports = app;
