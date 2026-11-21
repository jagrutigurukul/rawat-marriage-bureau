// Local development: website + API on http://localhost:3000   (npm run dev)
const path = require('path');
const express = require('express');
const app = require('./index');
const local = express();
local.use(express.static(path.join(__dirname, 'public')));
local.use(app);
const port = +(process.env.PORT || 3000);
local.listen(port, () => console.log(`Rawat Marriage Bureau → http://localhost:${port}`));
