const sqlite = require('sqlite3');
const fs = require('fs');

const defaultStore = 'data';

const wait = (callback, count = 0) => {
  const finish = () => {
    if (!--count && callback) {
      callback();
      callback = null;
    }
  };
  return {
    finish,
    track: () => {
      count++;
      return finish;
    }
  };
};
const encodePath = path => path.map(encodeURIComponent).join('/');
const makeKey = path => {
  if (!path.length) return [null, ''];
  return [encodePath(path.slice(0, -1)), path[path.length - 1]];
  // TODO: require root to be object or array
};
const makeValue = (value, type) => {
  if (type == 'array') return [];
  if (type == 'object') return {};
  if (type == 'number') return +value;
  if (type == 'null') return null;
  if (type == 'boolean') return value == '1';
  return value;
};
const dbRun = (db, statement, params) => new Promise((resolve, reject) => {
  db.run(statement, params, error => {
    if (error) reject(error);
    else resolve();
  });
});
const dbGet = (db, statement, params) => new Promise((resolve, reject) => {
  db.get(statement, params, (error, result) => {
    if (error) reject(error);
    else resolve(result);
  });
});
const getNextIndex = async (db, store, path) => {
  const result = await dbGet(db,
    `SELECT key FROM ${store} WHERE parent = ? ORDER BY CAST(key AS INTEGER) DESC LIMIT 1`,
    encodePath(path));
  return result ? +result.key + 1 : 0;
};
const getOne = (db, store, path) => {
  const [parent, key] = makeKey(path);
  return dbGet(db,
    `SELECT * FROM ${store} WHERE parent ${parent == null ? 'IS NULL' : '= ?'} AND key = ?`,
    parent == null ? key : [parent, key]);
};
const get = (db, store, {type, value}, parent, path, cursor) => new Promise((resolve, reject) => {
  value = makeValue(value, type);
  if (type != 'object' && type != 'array') return resolve(value);
  const array = type == 'array';
  let level = cursor(path, array);

  const {track, finish} = wait(() => {
    // TODO: traverse desc arrays in desc order
    if (level.value) value = level.value(null, value);
    resolve(value);
  }, 1);

  if (level === false) return finish();
  if (!level || typeof level != 'object') level = {action: level};
  if (typeof level.action != 'function') level.action = () => {};
  const {descending, lowerBound, upperBound, lowerExclusive, upperExclusive} = level;

  // TODO: array bounds from end (desc)

  const args = [encodePath(parent)];
  const cond = [];
  const limit = [0, -1]; // offset, count
  const order = descending ? 'DESC' : 'ASC';
  if (lowerBound != null) {
    if (array) {
      limit[0] = lowerBound;
      if (lowerExclusive) limit[0]++;
    } else {
      args.push(lowerBound);
      cond.push(`AND key ${lowerExclusive ? '>' : '>='} ?`);
    }
  }
  if (upperBound != null) {
    if (array) {
      limit[1] = upperBound - (lowerBound || 0) + 1;
      if (upperExclusive) limit[1]--;
    } else {
      args.push(upperBound);
      cond.push(`AND key ${upperExclusive ? '<' : '<='} ?`);
    }
  }

  let index = 0;
  db.each(
    `SELECT * FROM ${store} WHERE parent = ? ${cond.join(' ')} ORDER BY key ${order} LIMIT ?, ?`,
    args.concat(limit),
    (error, item) => {
      if (error) return reject(error);
      const key = array ? index++ : item.key;
      const action = level.action(key);
      if (action == 'stop') {
        finish();
      } else if (action != 'skip') {
        track();
        if (!array) value[key] = undefined; // set properties in order
        get(db, store, item, parent.concat(item.key), path.concat(key), cursor).then(child => {
          if (level.value) child = level.value(key, child);
          if (child !== undefined) value[array && lowerBound ? key - lowerBound + 1 : key] = child;
          else if (!array) delete value[key];
          finish();
        });
      }
    },
    finish
  );
});
const putOne = (db, store, path, type, value) => {
  const [parent, key] = makeKey(path);
  return dbRun(db,
    `INSERT OR REPLACE INTO ${store} (parent, key, type, value) VALUES (?, ?, ?, ?)`,
    [parent, key, type, value]);
};
const put = async (db, store, path, value) => {
  // { key: (key or index relative to parent)
  //   parent: (path of parent entry)
  //   type: (string|number|boolean|null|array|object)
  //   value: (or null if array or object) }
  const type = Array.isArray(value) ? 'array'
    : typeof value == 'object' ? value ? 'object' : 'null' : typeof value;
  await Promise.all([
    putOne(db, store, path, type, type == 'array' || type == 'object' ? null : value)
  ].concat(
    type == 'object' ? Object.entries(value).map(
      ([key, value]) => put(db, store, path.concat(key), value)
    ) :
    type == 'array' ? value.map(
      (item, i) => put(db, store, path.concat(i), item)
    ) :
    []
  ));
};
const shiftChildren = async (db, store, pathFrom, pathTo, type) => {
  if (type != 'object' && type != 'array') return;
  await new Promise((resolve, reject) => {
    const {track, finish} = wait(resolve, 1);
    db.each(
      `SELECT * FROM ${store} WHERE parent = ?`,
      encodePath(pathFrom),
      (error, result) => {
        if (error) {
          reject(error);
        } else {
          if (result) {
            const {key, type, value} = result;
            const from = pathFrom.concat(key);
            const to = pathTo.concat(key);
            deleteOne(db, store, from).then(track());
            putOne(db, store, to, type, value).then(track());
            shiftChildren(db, store, from, to, type).then(track());
          }
          finish();
        }
      }
    );
  });
};
const deleteOne = (db, store, path) => {
  const [parent, key] = makeKey(path);
  return dbRun(db, `DELETE FROM ${store} WHERE parent = ? AND key = ?`, [parent, key]);
};
const deleteChildren = async (db, store, path) => {
  // TODO: escape path
  return dbRun(db, `DELETE FROM ${store} WHERE parent LIKE ?`, encodePath(path) + '%');
};
const createObjectStore = async (db, name) => {
  await dbRun(db, `CREATE TABLE ${name} (parent TEXT, key TEXT, type TEXT, value TEXT, PRIMARY KEY (parent, key))`);
  if (name == defaultStore) await putOne(db, name, [], 'object', 1);
};
const deleteObjectStore = async (db, name) => {
  await dbRun(db, `DELETE TABLE ${name}`);
};
const normalizeCursor = cursor => {
  if (cursor == 'shallow') return () => false;
  if (cursor == 'immediates') return path => !path.length;
  if (cursor && typeof cursor == 'object') return path => path.length ? undefined : cursor;
  if (typeof cursor != 'function') return () => {};
  return cursor;
};
const connect = database => new Promise((resolve, reject) => {
  const db = new sqlite.Database(database, error => {
    if (error) reject(error);
    else resolve(db);
  });
});
const makeTransaction = (begin, commit, rollback) => {
  let setup, error, success, failure, pending = 1;

  setImmediate(() => {
    if (!--pending) success(); // ended without operations
  });

  return {
    promise: new Promise((resolve, reject) => {
      success = resolve;
      failure = reject;
    }),
    track: command => async (...args) => {
      if (!pending) throw new Error('Transaction has closed');
      pending++;
      if (!setup) setup = begin();
      await setup;
      if (!pending) return;
      let result;
      try {
        result = await command(...args);
      } catch (e) {
        error = e;
        pending = 0;
        rollback();
        failure(error);
      }
      setImmediate(async () => {
        if (error || --pending) return;
        await commit();
        success();
      });
      return result;
    }
  };
};

exports.open = (database, options) => {
  
  const {version = 1, onUpgradeNeeded} = options || {};
  if (typeof version != 'number' || version < 1 || version % 1)
    throw new Error(`Invalid version: ${version}`);

  let master, write, closed;
  const upgrade = transaction('upgrade');

  async function transaction(type, callback, stores) {

    if (closed) throw new Error('Connection closed');
    if (type == 'upgrade' ? master : type != 'readonly' && type != 'readwrite')
      throw new Error(`Invalid transaction type ${type}`);

    stores = [].concat(stores == null ? defaultStore : stores);
    const readonly = type == 'readonly';
    let db;

    const {track, promise} = makeTransaction(
      async () => {
        if (readonly) {
          await upgrade;
          // separate read connections; TODO fixed pool?
          db = await connect(database);
        } else {
          // serialized write transactions using "master" connection
          if (!master) master = connect(database);
          db = await master;
          if (write) {
            const previous = write;
            write = promise;
            await previous.catch(e => null);
          } else {
            write = promise;
          }
        }
        return dbRun(db, 'BEGIN IMMEDIATE');
      },
      () => dbRun(db, 'COMMIT'),
      () => dbRun(db, 'ROLLBACK')
    );

    const op = (writable, method) => track(async (store, path, value) => {
      if (writable && readonly) throw new Error('Transaction is read-only');

      // TODO: escape store name
      if (stores.length == 1) {
        value = path;
        path = store;
        store = stores[0];
      }

      if (typeof path == 'string') path = [path];
      else if (path === undefined) path = [];
      else if (!Array.isArray(path)) throw new Error('Invalid path');

      // resolve path: substitute array indices in path with numeric keys;
      // if path represents an empty array slot, fills in with next available index
      let exists = true;
      for (let i = 0; i < path.length; i++) {
        if (typeof path[i] != 'number') continue;
        const subPath = path.slice(0, i);
        const container = await getOne(db, store, subPath);
        if (!container) {
          exists = false;
          break;
        }
        if (container.type != 'array') continue;
        const entry = await dbGet(db,
          `SELECT key FROM ${store} WHERE parent = ? LIMIT 1 OFFSET ?`,
          [encodePath(subPath), path[i]]);
        if (entry) {
          path[i] = +entry.key;
        } else {
          if (i == path.length - 1)
            path[i] = await getNextIndex(db, store, subPath);
          exists = false;
          break;
        }
      }

      return method(store, path, value, exists);
    });

    const txn = {
      get: op(false, async (store, path, cursor, exists) => {
        const result = await getOne(db, store, path);
        if (result) return get(db, store, result, path, [], normalizeCursor(cursor));
      }),
      count: op(false, async (store, path) => {
        const result = await dbGet(db,
          `SELECT count(*) AS count FROM ${store} WHERE parent = ?`,
          encodePath(path));
        return result.count;
      }),
      put: op(true, async (store, path, value, exists) => {
        const parent = await getOne(db, store, path.slice(0, -1));
        if (!parent && path.length)
          throw new Error('Parent resource does not exist');
        if (parent && parent.type != 'object' && parent.type != 'array')
          throw Error('Parent resource is not an object or array');
        if (parent && parent.type == 'array' && typeof path[path.length - 1] != 'number')
          throw new Error('Invalid index to array resource');
        if (exists) await deleteChildren(db, store, path);
        return put(db, store, path, value);
      }),
      insert: op(true, async (store, path, value, exists) => {
        const parent = path.slice(0, -1);
        const key = path[path.length - 1];
        if (typeof key != 'number')
          throw new Error('Resource is not an array item');
        if (exists) {
          // TODO: optimize query for last item to shift
          const parentPath = encodePath(parent);
          const result = await dbGet(db,
            `SELECT CAST(key AS INTEGER) AS i FROM ${store} WHERE parent = ? AND
            (SELECT COUNT(*) FROM ${store} WHERE parent = ? AND CAST(key AS INTEGER) BETWEEN ? AND i) <= ?
            ORDER BY i DESC LIMIT 1`,
            [parentPath, parentPath, key, key]);
          for (let index = result ? result.i : key; index >= key; index--) {
            const fromPath = parent.concat(index);
            const toPath = parent.concat(index + 1);
            const {type, value} = await getOne(db, store, fromPath);
            await Promise.all([
              deleteOne(db, store, fromPath),
              putOne(db, store, toPath, type, value),
              shiftChildren(db, store, fromPath, toPath, type)
            ]);
          }
        }
        return put(db, store, path, value);
      }),
      append: op(true, async (store, path, value) => {
        const parent = await getOne(db, store, path);
        if (!parent) throw new Error('Resource does not exist');
        if (parent.type != 'array') throw new Error('Resource is not an array');
        const index = await getNextIndex(db, store, path);
        return put(db, store, path.concat(index), value);
      }),
      delete: op(true, async (store, path) => {
        await Promise.all([
          deleteChildren(db, store, path),
          deleteOne(db, store, path)
        ]);
      })
    };

    if (type == 'upgrade') {
      const getVersion = track(() =>
        getOne(db, defaultStore, []).catch(e => {
          if (String(e.message) != `SQLITE_ERROR: no such table: ${defaultStore}`)
            throw e;
        }
      ));

      getVersion().then(async record => {
        if (record && +record.value >= version) return;

        const putVersion = track(version =>
          putOne(db, defaultStore, [], 'object', version)
        );

        txn.createObjectStore = track(name => createObjectStore(db, name));
        txn.deleteObjectStore = track(name => deleteObjectStore(db, name));

        if (record) await putVersion(version);
        else await txn.createObjectStore(defaultStore);
        if (onUpgradeNeeded) onUpgradeNeeded(txn, record ? +record.value : 0);
      });
    } else {
      await track(callback)(txn);
    }

    return promise;
  };

  return {
    transaction,
    get: async (path, cursor, store) => {
      let result;
      await transaction('readonly', async txn => {
        result = await txn.get(path, cursor);
      }, store);
      return result;
    },
    count: async (path, bounds, store) => {
      let result;
      await transaction('readonly', async txn => {
        result = await txn.count(path);
      }, store);
      return result;
    },
    put: (path, value, store) => {
      return transaction('readwrite', txn => {
        txn.put(path, value);
      }, store);
    },
    insert: (path, value, store) => {
      return transaction('readwrite', txn => {
        txn.insert(path, value);
      }, store);
    },
    append: (path, value, store) => {
      return transaction('readwrite', txn => {
        txn.append(path, value);
      }, store);
    },
    delete: (path, store) => {
      return transaction('readwrite', txn => {
        txn.delete(path);
      }, store);
    },
    close: async () => {
      if (closed) return;
      closed = true;
      const db = await master;
      return new Promise((resolve, reject) => {
        db.close(error => {
          if (error) reject(error);
          else resolve();
        });
      });
    }
  };
};

exports.delete = database => new Promise((resolve, reject) => {
  fs.unlink(database, error => {
    if (error) reject(error);
    else resolve();
  });
});
