import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const manifest = JSON.parse(read('package.json'));
const sha256 = (p) => createHash('sha256').update(fs.readFileSync(path.join(root, p))).digest('hex');
function loadClient(extra = {}, react = { createElement() {} }) {
  let registration;
  const context = vm.createContext({ ...extra, window: { ...extra.window, __ModuleLoader__: { load(r) { registration = r; } } } });
  vm.runInContext(read('lib/client.js'), context, { filename: 'lib/client.js', timeout: 1000 });
  assert.equal(registration.id, 'dsh-gesture-control');
  const exports = registration.factory((id) => {
    assert.equal(id, 'react', 'Only the Host-provided React import is expected');
    return react;
  });
  return { exports, context, registration };
}

test('prebuilt client module factory initializes without the togglePeer crash', () => {
  const { exports } = loadClient();
  assert.equal(typeof exports.apply, 'function');
  assert.deepEqual(Array.from(exports.inject), ['slots', 'sessions', 'uiSession', 'uiWorkspace', 'conversation', 'workspaces', 'connection']);
});

test('client registers its overlay and disposes mock effects without opening devices or networking', () => {
  const nodes = new Set();
  const listeners = new Set();
  const eventTarget = (name) => ({
    addEventListener(event, fn) { listeners.add([name, event, fn]); },
    removeEventListener(event, fn) { for (const item of listeners) if (item[0] === name && item[1] === event && item[2] === fn) listeners.delete(item); },
  });
  const document = { ...eventTarget('document'),
    createElement() { const tag = { dataset: {}, remove() { nodes.delete(tag); } }; return tag; },
    head: { append(tag) { nodes.add(tag); } },
    querySelector() { return null; },
  };
  const window = { ...eventTarget('window') };
  let reg;
  window.__ModuleLoader__ = { load(value) { reg = value; } };
  let networkCalls = 0;
  const { exports } = loadClient({ document, window, clearTimeout, setTimeout, fetch() { networkCalls++; throw Error('Unexpected network in inactive mock overlay'); } });
  const state = (value) => ({ getSnapshot: () => value, subscribe: () => () => {} });
  let overlay;
  const disposers = [];
  const services = {
    sessions: { list: state({ byId: {} }) },
    uiSession: { current: state(null), sessionStatus: state(new Map()) },
    conversation: {},
    uiWorkspace: { workspaces: { list: state([]) } },
    connection: { state: state('connected') },
    slots: {
      entries() { return []; },
      inject(name, callback) { assert.equal(name, 'shell.overlay'); callback(); },
      register(options, component) { overlay = { options, component }; return () => { overlay = null; }; },
    },
  };
  exports.apply({
    get(name) { assert.ok(name in services, `Unexpected service ${name}`); return services[name]; },
    effect(callback) { const off = callback(); if (typeof off === 'function') disposers.push(off); },
  });
  assert.equal(overlay.options.id, 'dsh-gesture-control.overlay');
  assert.equal(typeof overlay.component, 'function');
  assert.equal(nodes.size, 1);
  assert.ok(listeners.size >= 3);
  for (const off of disposers.reverse()) off();
  assert.equal(nodes.size, 0);
  assert.equal(listeners.size, 0);
  assert.equal(networkCalls, 0);
});

test('host entry exports a plugin apply function and declares its injected route services', async () => {
  const host = await import(new URL('../lib/index.js', import.meta.url));
  assert.equal(typeof host.apply, 'function');
  let injected;
  host.apply({ inject(names, callback) { injected = Array.from(names); assert.equal(typeof callback, 'function'); } });
  assert.deepEqual(injected, ['webServer', 'connection']);
});

test('fixed gesture model bytes match the disclosed upstream artifact', () => {
  const model = path.join(root, 'assets/gesture_recognizer.task');
  assert.equal(fs.statSync(model).size, 8373440);
  assert.equal(sha256('assets/gesture_recognizer.task'), '97952348cf6a6a4915c2ea1496b4b37ebabc50cbbf80571435643c455f2b0482');
  assert.equal(JSON.parse(read('assets/manifest.json')).modelSha256, sha256('assets/gesture_recognizer.task'));
});

test('bundle, localized metadata and original icon are included in exports', () => {
  assert.equal(manifest.name, 'dsh-gesture-control');
  assert.equal(manifest.version, '0.1.6');
  assert.equal(manifest.engines.dsh, '0.2.1-rc.2');
  assert.match(read('cordis.patch.yml'), /name: dsh-gesture-control/);
  for (const language of ['en', 'zh']) {
    const locale = JSON.parse(read(`locale/${language}.json`));
    assert.ok(locale.meta.title && locale.meta.description);
  }
  assert.equal(manifest.exports['./locale/*.json'], './locale/*.json');
  assert.equal(manifest.exports['./icon'], './icon.svg');
  assert.match(read('icon.svg'), /<svg/);
  assert.ok(!manifest.scripts?.preinstall && !manifest.scripts?.install && !manifest.scripts?.postinstall);
});

test('runtime, third-party notices, permissions patch and documented regression command exist', () => {
  for (const p of ['assets/vision-worker.js', 'assets/vision_bundle.mjs', 'assets/MEDIAPIPE_LICENSE.txt', 'assets/MEDIAPIPE_README.md', 'desktop/README.md', 'desktop/media-permissions.mjs', 'desktop/desktop-0.12.1-media.patch', 'LICENSE', 'THIRD_PARTY_NOTICES.md', 'RELEASE-NOTES.md', 'tests/helpers/DSH-LICENSE.txt']) {
    assert.ok(fs.statSync(path.join(root, p)).isFile(), p);
  }
  assert.match(read('THIRD_PARTY_NOTICES.md'), /5997480830/);
  assert.match(manifest.scripts.test, /tests\/\*\.test\.mjs/);
});

test('privacy and Desktop prerequisites stay explicit in the README', () => {
  assert.match(read('README.md'), /NotAllowedError/);
  assert.match(read('README.md'), /远程服务/);
  assert.match(read('README.md'), /预构建运行包/);
  assert.match(read('README.md'), /仍待验证/);
  const client = read('lib/client.js');
  assert.match(client, /录音交给 DSH 当前所选语音提供方/);
  assert.match(client, /远程模型会收到文本，此时尚未按 👍 提交/);
});
