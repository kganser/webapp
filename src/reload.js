const path = require('path');

module.exports = () => {
  if (!process.send) {
    // Parent process (watches for changes in files required by child process)
    const main = process.argv[1];
    const cp = require('child_process');
    const watcher = require('chokidar').watch(main, {ignoreInitial: true});
    const args = process.argv.slice(2);
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
  module._load = (name, parent, isMain) => {
    const file = module._resolveFilename(name, parent);
    if (file[0] == '/' && !/node_modules/.test(file)) {
      process.send({file: file});
    }
    return load(name, parent, isMain);
  };
  process.on('uncaughtException', err => {
    process.send({err: err && err.stack});
  });
};
