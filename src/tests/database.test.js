const database = require('../database');

const data = {
  array: ['elem', 1, {a: null, b: [1,2,3]}],
  object: {boolean: true},
  string: 'value'
};

let db;
const dbName = '__testdb';

const clean = () => database.delete(dbName).catch(() => null);

beforeAll(clean);
afterAll(clean);

test('upgrade', async () => {
  expect.assertions(5);
  db = database.open(dbName, {
    onUpgradeNeeded: async (txn, version) => {
      expect(version).toBe(0);
      expect(await txn.get([])).toStrictEqual({});
    }
  });
  await db.put([], {data: 'test'});
  await db.close();
  db = database.open(dbName, {
    version: 2,
    onUpgradeNeeded: async (txn, version) => {
      expect(version).toBe(1);
      expect(await txn.get([])).toStrictEqual({data: 'test'});
      txn.put([], data);
    }
  });
  expect(await db.get([])).toStrictEqual(data);
});

test('get', () => {
  return db.transaction('readonly', async txn => {
    const [root, array] = await Promise.all([txn.get([]), txn.get(['array'])]);
    expect([root, array]).toStrictEqual([data, data.array]);
  });
});

test('count', () => {
  return db.transaction('readonly', async txn => {
    const counts = await Promise.all([
      txn.count(['array']),
      txn.count(['object']),
      txn.count(['string'])
    ]);
    expect(counts).toStrictEqual([3, 1, 0]);
  });
});

test('put', () => {
  return db.transaction('readwrite', async txn => {
    await txn.put(['object', 'boolean'], false);
    const result = await txn.get(['object', 'boolean']);
    expect(result).toBe(false);
  });
});

test('insert', () => {
  return db.transaction('readwrite', async txn => {
    await txn.insert(['array', 2], 2);
    const result = await txn.get(['array']);
    expect(result).toStrictEqual(['elem', 1, 2, {a: null, b: [1,2,3]}]);
  });
});

test('append', () => {
  return db.transaction('readwrite', async txn => {
    await txn.append(['array'], {object: {}});
    const result = await txn.get(['array']);
    expect(result).toStrictEqual(['elem', 1, 2, {a: null, b: [1,2,3]}, {object: {}}]);
  });
});

test('delete', async () => {
  return db.transaction('readwrite', async txn => {
    await txn.delete(['object']);
    const result = await Promise.all([
      txn.get([]),
      txn.get(['object']),
      txn.get(['object', 'boolean'])
    ]);
    expect(result).toStrictEqual([
      {array: ['elem', 1, 2, {a: null, b: [1,2,3]}, {object: {}}], string: 'value'},
      undefined,
      undefined
    ]);
  });
});

test('delete array element', () => {
  return db.transaction('readwrite', async txn => {
    await txn.delete(['array', 3]);
    const result = await txn.get(['array']);
    expect(result).toStrictEqual(['elem', 1, 2, {object: {}}]);
  });
});

test('array index resolution 1', () => {
  return db.transaction('readonly', async txn => {
    const result = await Promise.all([
      txn.get(['array', 3]),
      txn.get(['array', 4])
    ]);
    expect(result).toStrictEqual([{object: {}}, undefined]);
  });
});

test('array index resolution 2', () => {
  return db.transaction('readwrite', async txn => {
    await txn.put(['array', 4], 4);
    const result = await txn.get(['array']);
    expect(result).toStrictEqual(['elem', 1, 2, {object: {}}, 4]);
  });
});

test('non-array paths', async () => {
  const a = await db.get();
  expect(a).toStrictEqual({array: ['elem', 1, 2, {object: {}}, 4], string: 'value'});
  const b = await db.get('string');
  expect(b).toStrictEqual('value');
});

test('cursor function', async () => {
  const log = [];
  const result = await db.get([], (path, array) => {
    log.push([path, array]);
    return array ? {
      upperBound: 3,
      action: key => {
        if (key == 1) return 'skip';
      },
      value: (key, value) => {
        switch (log.push([key, value])) {
          case 3: return value;
          case 4: return 3;
          case 8: return {data: value};
        }
      }
    } : {
      upperBound: 'string',
      upperExclusive: true
    };
  });
  expect(log).toStrictEqual([
    [[], false],
    [['array'], true],
    [0, 'elem'],
    [2, 2],
    [['array', 3], false],
    [['array', 3, 'object'], false],
    [3, {object: {}}],
    [null, ['elem', /* undefined */, 3]]
  ]);
  expect(result).toEqual({array: {data: ['elem', undefined, 3]}}); // array gaps
});

test('cursor object', async () => {
  const log = [];
  const result = await db.get(['array'], {
    lowerBound: 1,
    upperBound: 2,
    action: key => {
      log.push(key);
    }
  });
  expect(log).toStrictEqual([0, 1]);
  expect(result).toStrictEqual([1, 2]);
});

test('cursor enum', async () => {
  const shallow = await db.get(['array'], 'shallow');
  expect(shallow).toStrictEqual([]);
  const immediates = await db.get([], 'immediates');
  expect(immediates).toStrictEqual({array: [], string: 'value'});
});

test('cursor desc', async () => {
  const result = await db.get(['array'], {descending: true});
  expect(result).toStrictEqual([4, {object: {}}, 2, 1, "elem"]);
});

test('encoding', () => {
  return db.transaction('readwrite', async txn => {
    await txn.put(['%'], {'%key': "'válue'"});
    expect(await txn.get(['%'])).toStrictEqual({'%key': "'válue'"});
    await txn.put(['25'], ['test']); // '%' encodes to '%25'
    await txn.delete('%');
    expect(await txn.get(['25'])).toStrictEqual(['test']);
    expect(await txn.get(['%'])).toStrictEqual(undefined);
  });
});

test('exception', async () => {
  expect.assertions(2);
  let data;
  const error = new Error('a');
  try {
    await db.transaction('readwrite', async txn => {
      data = await txn.get([]);
      await txn.put(['error'], true);
      throw error;
    });
  } catch (e) {
    expect(e).toBe(error);
  }
  const result = await db.get([]);
  expect(result).toStrictEqual(data);
});

test('multiple exceptions', async () => {
  expect.assertions(2);
  let data;
  const error = new Error('b');
  try {
    await db.transaction('readwrite', async txn => {
      data = await txn.get([]);
      await txn.put(['error'], true);
      await Promise.all([
        Promise.reject(error),
        Promise.reject(new Error('c'))
      ]);
    });
  } catch (e) {
    expect(e).toBe(error);
  }
  const result = await db.get([]);
  expect(result).toStrictEqual(data);
});

test('transaction closed error', done => {
  db.transaction('readonly', txn => {
    setTimeout(async () => {
      try {
        await txn.get([]);
      } catch (e) {
        done();
      }
    });
  });
})
