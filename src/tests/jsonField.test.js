const {useRef} = require('React');
const renderer = require('react-test-renderer');
const jsonField = require('../views/jsonField');
const {jsx} = require('../util');
const {initComponents} = require('..');

const component = initComponents({jsonField}).jsonField;
const value = {
  string: 'hello',
  array: [false, 1, "two", null, {}, [5]],
  object: {nested: {deeply: true}}
};
const valueMeta = {
  data: {
    string: 'hello',
    array: {
      data: [
        false,
        1,
        "two",
        null,
        {collapsed: true, data: {}},
        {collapsed: true, data: [5]}
      ]
    },
    object: {
      collapsed: true,
      data: {
        nested: {
          data: {deeply: true}
        }
      }
    }
  },
  remaining: 2
};

// TODO: test interactions with UI & imperative API
// TODO: figure out how to get screenshots

test('Read-only basic', () => {
  const element = renderer.create(jsx([component, {value}]));
  expect(element.toJSON()).toMatchSnapshot();
});

test('Read-only with metadata', () => {
  const element = renderer.create(jsx([component, {metadata: true, value: valueMeta}]));
  expect(element.toJSON()).toMatchSnapshot();
});

test('Editable uncontrolled', () => {
  // defaultValue or value + onChange imply editable
  const element = renderer.create(jsx([component, {defaultValue: value}]));
  expect(element.toJSON()).toMatchSnapshot();
});

test('Editable controlled', () => {
  const element = renderer.create(jsx([component, {value, onChange: () => null}]));
  expect(element.toJSON()).toMatchSnapshot();
});

test('Editable with metadata', () => {
  const element = renderer.create(jsx([component, {
    metadata: true,
    value: valueMeta,
    onChange: () => null,
    onLoad: () => null
  }]));
  expect(element.toJSON()).toMatchSnapshot();
});

test('Top-level array', () => {
  const element = renderer.create(jsx([component, {defaultValue: [1,2,3]}]));
  expect(element.toJSON()).toMatchSnapshot();
});

test('Top-level scalar', () => {
  const element = renderer.create(jsx([component, {defaultValue: null}]));
  expect(element.toJSON()).toMatchSnapshot();
});