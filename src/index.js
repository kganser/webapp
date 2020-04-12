// TODOS:
// * view style scoping
// * typescript
// * api/fe split setup

const reload = require('./libs/reload');
const dev = process.env.NODE_ENV != 'production';

if (dev && reload()) return;

const level = require('level');
const express = require('express');
const webapp = require('./libs/webapp');
const {hashPassword, verifyPassword} = require('./libs/util');

const app = express();
const port = process.env.PORT || 80;
const config = {};

const db = level('db', {valueEncoding: 'json'});

app.use(
  webapp({
    dev,
    config,
    projectDir: __dirname,
    sessionKey: process.env.SESSION_KEY || 'ThisIsASecret'
  })
);

app.get('/', (req, res) => {
  res.renderPage('home', {meta: {title: 'Home'}, ip: req.ip});
});

app.get('/login', (req, res) => {
  res.renderPage('login', {meta: {title: 'Log In'}});
});

app.post('/login', async (req, res) => {
  const {email, password} = req.body;
  try {
    if (!email || !password) throw new Error('Invalid login');
    const user = await db.get('users/' + encodeURIComponent(email));
    if (!user || !(await verifyPassword(password, user.password))) throw new Error('Invalid login');
    res.logIn({name: user.name, email}).redirect('/');
  } catch (e) {
    res.error(e.notFound ? 'Invalid login' : e.message).redirect(req.path);
  }
});

app.get('/logout', (req, res) => {
  res.logOut().redirect('/');
});

app.get('/register', (req, res) => {
  res.renderPage('register', {meta: {title: 'Register'}});
});

app.post('/register', async (req, res) => {
  const {name, email, password} = req.body;
  try {
    if (!email) throw new Error('Invalid email');
    if (!password) throw new Error('Invalid password');
    const path = 'users/' + encodeURIComponent(email);
    await db.get(path);
    throw new Error('An account with this email address already exists');
  } catch (e) {
    try {
      if (!e.notFound) throw e;
      const hash = await hashPassword(password);
      await db.put(path, {name, email, password: hash});
      res.logIn({name, email}).redirect('/');
    } catch (e) {
      res.error(e.message).redirect(req.path);
    }
  }
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
