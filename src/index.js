const express = require('express');
const webapp = require('./middleware/webapp');

// TODOS:
// * auto reload in dev
// * view style scoping
// * typescript, prettier config
// * docker config

const app = express();
const port = 3000;
const config = {};

app.use(webapp(config));

app.get('/', (req, res) => {
  res.renderPage('home', {meta: {title: 'Home'}, ip: req.ip});
});

app.get('/about', (req, res) => {
  res.renderPage('about', {meta: {title: 'About'}});
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
