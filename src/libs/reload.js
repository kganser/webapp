const path = require('path');

module.exports = () => {
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
    return true;
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
};
