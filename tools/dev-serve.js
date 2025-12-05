#!/usr/bin/env node
const express = require('express');
const path = require('path');

const app = express();
const port = process.env.PORT || 8080;

const distRoot = path.join(process.cwd(), 'dist', process.argv[2] || require('fs').readdirSync(path.join(process.cwd(),'dist'))[0]);

app.use(express.static(distRoot, { maxAge: '1h' }));

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(distRoot, 'index.html'));
});

app.listen(port, () => {
  console.log(`Dev SPA server serving ${distRoot} on http://127.0.0.1:${port}`);
});
