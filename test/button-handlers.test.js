const assert = require('assert');
const path = require('path');
const fs = require('fs');
const vm = require('vm');

function createElement(id = null) {
  return {
    id,
    value: '',
    textContent: '',
    innerHTML: '',
    style: {},
    classList: {
      add() {},
      remove() {},
      toggle() {},
      contains() { return false; }
    },
    dataset: {},
    addEventListener() {},
    querySelector() { return null; },
    querySelectorAll() { return []; },
    appendChild() {},
    removeChild() {},
    setAttribute() {},
    getAttribute() { return null; }
  };
}

function createDocument() {
  const elements = new Map();
  const listeners = {};

  const document = {
    addEventListener(eventName, callback) {
      listeners[eventName] = callback;
    },
    dispatchEvent(eventName) {
      if (listeners[eventName]) {
        listeners[eventName]();
      }
    },
    getElementById(id) {
      return elements.get(id) || null;
    },
    createElement() {
      return createElement();
    },
    body: createElement('body')
  };

  return { document, elements };
}

function loadScript(filePath, document) {
  const code = fs.readFileSync(filePath, 'utf8');
  const context = {
    window: {},
    document,
    console,
    localStorage: {
      getItem() { return null; },
      setItem() {},
      removeItem() {}
    },
    setTimeout,
    clearTimeout,
    fetch: async () => ({ ok: true, json: async () => ({}) })
  };

  context.window = context;
  vm.createContext(context);
  vm.runInContext(code, context, { filename: filePath });
}

(function run() {
  const { document, elements } = createDocument();
  loadScript(path.join(__dirname, '..', 'public', 'js', 'signup.js'), document);

  assert.doesNotThrow(() => {
    document.dispatchEvent('DOMContentLoaded');
  }, 'signup.js should not throw when required elements are missing');
})();

console.log('button handler smoke test passed');
