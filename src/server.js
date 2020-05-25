// TODOS:
// * view style scoping
// * typescript
// * api/fe split setup

const webapp = require('.');
const dev = process.env.NODE_ENV != 'production';

if (dev && webapp.reload()) return;

const express = require('express');
const database = require('./database');
const {hashPassword, verifyPassword} = webapp.util;

const app = express();
const port = process.env.PORT || (dev ? 3000 : 80);
const dataDir = process.env.DATA_DIR || '.';
const config = {};

const db = database.open(`${dataDir}/db`, {
  onUpgradeNeeded: txn => {
    txn.put([], {users: {}});
  }
});

app.use(
  webapp.router({
    dev,
    config,
    views: {
      home: require('./views/home'),
      login: require('./views/login'),
      register: require('./views/register')
    },
    sessionKey: process.env.SESSION_KEY || 'ThisIsASecret'
  })
);

app.get('/', (req, res) => {
  res.renderPage('home', {meta: {title: 'Home'}});
});

app.get('/login', (req, res) => {
  res.renderPage('login', {meta: {title: 'Log In'}});
});

app.post('/login', async (req, res) => {
  const {email, password} = req.body;
  try {
    if (!email || !password) throw new Error('Invalid login');
    const user = await db.get(['users', email]);
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
    const txn = db.transaction('readwrite');
    if (await txn.get(['users', email], 'shallow'))
      throw new Error('An account with this email address already exists');
    const hash = await hashPassword(password);
    await db.put(['users', email], {name, email, password: hash});
    res.logIn({name, email}).redirect('/');
  } catch (e) {
    res.error(e.message).redirect(req.path);
  }
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
