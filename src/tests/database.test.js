const database = require('../database');

const data = {
  array: ['elem', 1, {a: null, b: [1,2,3]}],
  object: {boolean: true},
  string: 'value'
};

let db;

const clean = () => database.delete('__testdb').catch(() => null);

beforeAll(clean);
afterAll(clean);

test('upgrade', async () => {
  let oldVersion;
  db = database.open('__testdb', {
    onUpgradeNeeded: (txn, version) => {
      oldVersion = version;
    }
  });
  const first = await db.get([]);
  expect(oldVersion).toBe(0);
  expect(first).toStrictEqual({});
  await db.close();
  db = database.open('__testdb', {
    version: 2,
    onUpgradeNeeded: (txn, version) => {
      oldVersion = version;
      txn.put([], data);
    }
  });
  const second = await db.get([]);
  expect(oldVersion).toBe(1);
  expect(second).toStrictEqual(data);
});

test('get', async () => {
  const txn = db.transaction('readonly');
  const [root, array] = await Promise.all([txn.get([]), txn.get(['array'])]);
  expect([root, array]).toStrictEqual([data, data.array]);
});

test('count', async () => {
  const txn = db.transaction('readonly');
  const counts = await Promise.all([
    txn.count(['array']),
    txn.count(['object']),
    txn.count(['string'])
  ]);
  expect(counts).toStrictEqual([3, 1, 0]);
});

test('put', async () => {
  const txn = db.transaction('readwrite');
  await txn.put(['object', 'boolean'], false);
  const result = await txn.get(['object', 'boolean']);
  expect(result).toBe(false);
});

test('insert', async () => {
  const txn = db.transaction('readwrite');
  await txn.insert(['array', 2], 2);
  const result = await txn.get(['array']);
  expect(result).toStrictEqual(['elem', 1, 2, {a: null, b: [1,2,3]}]);
});

test('append', async () => {
  const txn = db.transaction('readwrite');
  await txn.append(['array'], {object: {}});
  const result = await txn.get(['array']);
  expect(result).toStrictEqual(['elem', 1, 2, {a: null, b: [1,2,3]}, {object: {}}]);
});

test('delete', async () => {
  const txn = db.transaction('readwrite');
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

test('delete array element', async () => {
  const txn = db.transaction('readwrite');
  await txn.delete(['array', 3]);
  const result = await txn.get(['array']);
  expect(result).toStrictEqual(['elem', 1, 2, {object: {}}]);
});

test('array index resolution 1', async () => {
  const txn = db.transaction('readonly');
  const result = await Promise.all([txn.get(['array', 3]), txn.get(['array', 4])]);
  expect(result).toStrictEqual([{object: {}}, undefined]);
});

test('array index resolution 2', async () => {
  const txn = db.transaction('readwrite');
  await txn.put(['array', 4], 4);
  const result = await txn.get(['array']);
  expect(result).toStrictEqual(['elem', 1, 2, {object: {}}, 4]);
});

test('cursor function', async () => {
  const log = [];
  result = await db.get([], (path, array) => {
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
    [null, ['elem', undefined, 3]]
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

test('encoding', async () => {
  var txn = db.transaction('readwrite');
  await txn.put(['e$caped "stríng"'], "'válue'");
  const result = await txn.get(['e$caped "stríng"']);
  expect(result).toStrictEqual("'válue'");
});