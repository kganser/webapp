// TODOS:
// * view style scoping
// * typescript
// * docker config
// * api/fe split setup

const dev = process.env.NODE_ENV != 'production';

// TODO: move this into a module
if (dev) {
  const path = require('path');

  if (!process.send) {
    // Parent process (watches for changes in files required by child process)
    const main = process.argv[1];
    const cp = require('child_process');
    const watcher = require('chokidar').watch(main, {ignoreInitial: true});
    const args = process.argv.slice(2);
    const cache = {};
    let child, lastError, pause;
    const fork = () => {
      if (pause) return;
      if (child && child.connected) return child.kill();
      child = cp.fork(main, args); //, config.inspector ? {execArgv: ['--inspect']} : undefined);
      child.on('message', message => {
        if (message.err) {
          if (message.err == lastError) {
            console.error('Waiting for another change before retrying...');
            pause = true;
          } else {
            console.error("Can't execute file " + main + ':\n' + message.err);
          }
          lastError = message.err;
        } else if (message.file) {
          watcher.add(message.file);
        } else if (message.get) {
          const key = message.get;
          child.send({cache: {key, value: cache[key] || null}});
        } else if (message.set) {
          cache[message.set.key] = message.set.value;
        }
      });
      child.on('exit', fork);
    };
    fork();
    watcher.on('change', file => {
      console.log('File ' + path.relative(process.cwd(), file) + ' has changed; reloading...');
      lastError = null;
      pause = false;
      fork();
    });
    return;
  }

  // Child process (sends required files, unhandled exceptions to parent)
  const module = require('module');
  const load = module._load;
  const rootdir = path.resolve(__dirname, '..');
  const cacheListeners = {};
  module._load = (name, parent, isMain) => {
    const file = module._resolveFilename(name, parent);
    if (!file.indexOf(rootdir) && !/node_modules/.test(file)) process.send({file: file});
    return load(name, parent, isMain);
  };
  process.on('uncaughtException', err => {
    process.send({err: err && err.stack});
  });
  process.on('message', message => {
    if (message.cache) {
      const key = message.cache.key;
      const listener = cacheListeners[key];
      if (listener) {
        listener(message.cache.value);
        delete cacheListeners[key];
      }
    }
  });
  process.cache = (key, value) => {
    process.send({set: {key: key, value: value}});
  };
  process.getCached = (key, callback) => {
    cacheListeners[key] = callback;
    process.send({get: key});
  };
}

const level = require('level');
const express = require('express');
const webapp = require('./middleware/webapp');
const {base64Mac, jwt, passwordHash, passwordVerify} = require('./libs/util');

const app = express();
const port = 3000;
const config = {};

const key = 'ThisIsASecret'; // TODO: use docker env

const db = level('db', {valueEncoding: 'json'});

app.use(webapp(config, {dev}));
// TODO: move into webapp()
app.use((req, res, next) => {
  const token = req.cookies.auth;
  if (token) {
    const parts = token.split('.');
    if (parts.length == 3 && base64Mac(key, parts[0] + '.' + parts[1]) == parts[2]) {
      const login = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));

      // check login.type, login.iat (vs ttl)
      req.login = login;
      req.token = token;
    }
  }
  next();
});

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
    if (!user || !(await passwordVerify(password, user.password))) throw new Error('Invalid login');
    res.cookie('auth', jwt(key, {name: user.name, email})).redirect('/');
  } catch (e) {
    res.error(e.notFound ? 'Invalid login' : e.message);
  }
});

app.get('/logout', (req, res) => {
  res.clearCookie('auth').redirect('/');
});

app.get('/register', (req, res) => {
  res.renderPage('register', {meta: {title: 'Register'}});
});

app.post('/register', async (req, res) => {
  const {name, email, password} = req.body;
  if (!email) return res.error('Invalid email');
  if (!password) return res.error('Invalid password');
  const path = 'users/' + encodeURIComponent(email);
  try {
    await db.get(path);
    throw new Error('An account with this email address already exists');
  } catch (e) {
    if (!e.notFound) return res.error(e.message);
    try {
      const hash = await passwordHash(password);
      await db.put(path, {name, email, password: hash});
      res.cookie('auth', jwt({name, email})).redirect('/');
    } catch (e) {
      res.error(e.message);
    }
  }
});

app.listen(80, () => {
  console.log(`Server listening on port 80`);
});
