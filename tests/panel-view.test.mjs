import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createHash } from 'node:crypto';

const source = fs.readFileSync(new URL('../lib/client.js', import.meta.url), 'utf8');
const marker = 'return module.exports;}});';
assert.equal(source.split(marker).length, 2, 'Unique test-only factory instrumentation anchor');
const instrumented = source.replace('  // Optional locale service:', '  module.exports.__test.active = { view, camera, controller, speech, dual, changed };\n  // Optional locale service:')
  .replace(marker, 'module.exports.__test = { OverlayViewState, panelMessages, gestureGuide, renderGestureGuide, css };' + marker);
const state = (value) => ({ getSnapshot: () => value, subscribe: () => () => {} });
const nodes = (tree) => !tree || typeof tree !== 'object' ? [] : [tree, ...tree.children.flatMap(nodes)];
const text = (tree) => tree == null || tree === false ? '' : typeof tree !== 'object' ? String(tree) : tree.children.map(text).join(' ');

function fixture({ localeEnabled = false } = {}) {
  const counts = { network: 0, media: 0, play: 0, scroll: 0, trackStop: 0, focused: [], localeWrites: 0 };
  let registration, component, hookIndex = 0;
  const hooks = [], pending = [], disposers = [], mountedRefs = new Set(), timers = new Map();
  const styleNodes = new Set(), listeners = new Set(), localeListeners = new Set(), dictionaries = new Map();
  const row = { selected: false, setAttribute() { this.selected = true; }, removeAttribute() { this.selected = false; }, scrollIntoView() { counts.scroll++; } };
  const element = (type, props) => ({ type, srcObject: null, play() { counts.play++; return Promise.resolve(); }, focus() { counts.focused.push(props['aria-label'] || props['aria-controls'] || type); } });
  const react = {
    createElement(type, props, ...children) { return { type, props: props || {}, children: children.flat(Infinity).filter((x) => x != null && x !== false) }; },
    useSyncExternalStore() {},
    useRef(initial) { const index = hookIndex++; return hooks[index] ||= { current: initial }; },
    useEffect(callback, deps) {
      const index = hookIndex++, old = hooks[index];
      if (!old || deps.some((value, i) => !Object.is(value, old.deps[i]))) pending.push(() => {
        old?.cleanup?.(); hooks[index] = { deps: [...deps], cleanup: callback() };
      });
    },
  };
  const eventTarget = (name) => ({
    addEventListener(event, callback) { listeners.add({ name, event, callback }); },
    removeEventListener(event, callback) { for (const value of listeners) if (value.name === name && value.event === event && value.callback === callback) listeners.delete(value); },
  });
  const document = { ...eventTarget('document'), hidden: false,
    createElement() { const tag = { dataset: {}, remove() { styleNodes.delete(tag); } }; return tag; },
    head: { append(tag) { styleNodes.add(tag); } },
    querySelector(selector) { return selector.startsWith('[data-row-key=') || selector === '.dsh-gc-list li.active' ? row : null; },
  };
  const window = { ...eventTarget('window'), __ModuleLoader__: { load(value) { registration = value; } } };
  const locale = { active: 'zh',
    bind(namespace) { return (key) => dictionaries.get(namespace)?.[this.active]?.[key] || key; },
    register(namespace, language, dictionary) {
      const value = dictionaries.get(namespace) || {}; value[language] = dictionary; dictionaries.set(namespace, value);
      return () => { delete value[language]; if (!Object.keys(value).length) dictionaries.delete(namespace); };
    },
    subscribe(callback) { localeListeners.add(callback); return () => localeListeners.delete(callback); },
    setLocale() { counts.localeWrites++; throw Error('Panel must not change locale preferences'); },
  };
  const context = vm.createContext({ document, window, console, performance,
    CSS: { escape: String },
    setTimeout(callback) { const key = timers.size + 1; timers.set(key, callback); return key; },
    clearTimeout(key) { timers.delete(key); },
    fetch() { counts.network++; throw Error('Unexpected network in presentation test'); },
    navigator: { mediaDevices: { getUserMedia() { counts.media++; throw Error('Unexpected media request in presentation test'); } } },
  });
  vm.runInContext(instrumented, context, { filename: 'client.test-instrumented.js', timeout: 1000 });
  const exports = registration.factory((name) => { assert.equal(name, 'react'); return react; });
  const services = {
    sessions: { list: state({ ids: [], byId: {} }) },
    uiSession: { adapter: { current: state(null) }, sessionStatus: state(new Map()) },
    conversation: {}, uiWorkspace: {},
    workspaces: { list: state({ items: [], pinnedSessionIds: [], archivedSessionIds: [] }) },
    connection: { state: state('connected') }, locale: localeEnabled ? locale : undefined,
    slots: {
      entries() { return []; },
      inject(name, callback) { assert.equal(name, 'shell.overlay'); disposers.push(callback()); },
      register(options, panel) { assert.equal(options.id, 'dsh-gesture-control.overlay'); assert.equal(options.order, 200); component = panel; return () => {}; },
    },
  };
  exports.apply({
    get(name) { assert.ok(name in services, `Unexpected service ${name}`); return services[name]; },
    effect(callback) { const off = callback(); if (typeof off === 'function') disposers.push(off); },
  });
  function render() {
    hookIndex = 0;
    const tree = component(), next = new Set();
    for (const node of nodes(tree)) if (node.props.ref) {
      const ref = node.props.ref; next.add(ref);
      ref.current ||= element(node.type, node.props);
    }
    for (const ref of mountedRefs) if (!next.has(ref)) ref.current = null;
    mountedRefs.clear(); for (const ref of next) mountedRefs.add(ref);
    while (pending.length) pending.shift()();
    return tree;
  }
  function dispose() {
    const active = exports.__test.active;
    active.dual.rx = active.dual.tx = null; active.dual.arm = null; active.speech.state = 'idle';
    for (const hook of hooks) hook?.cleanup?.();
    for (const off of disposers.reverse()) off?.();
    assert.equal(counts.network, 0); assert.equal(counts.media, 0); assert.equal(counts.localeWrites, 0);
    assert.equal(styleNodes.size, 0); assert.equal(listeners.size, 0); assert.equal(localeListeners.size, 0); assert.equal(dictionaries.size, 0);
  }
  return { ...exports.__test, counts, render, row, locale, localeListeners, dictionaries, dispose };
}
const find = (tree, predicate) => nodes(tree).find(predicate);
const button = (tree, label) => { const node = find(tree, (x) => x.type === 'button' && x.props['aria-label'] === label); assert.ok(node, label); return node; };
const main = (tree) => find(tree, (x) => x.type === 'button' && x.props['aria-controls'] === 'dsh-gc-main');
const tab = (tree, section) => find(tree, (x) => x.props.role === 'tab' && x.props['data-panel-section'] === section);

test('presentation transitions preserve the chosen section and have a reload-safe restore path', () => {
  const f = fixture(), view = new f.OverlayViewState();
  assert.equal(view.previewVisible, false);
  view.toggle(); assert.equal(view.previewVisible, true);
  view.select('guide'); assert.equal(view.previewVisible, false);
  view.minimize(); assert.equal(view.minimized, true); assert.equal(view.expanded, false);
  view.restore(); assert.equal(view.minimized, false); assert.equal(view.expanded, true); assert.equal(view.section, 'guide');
  assert.equal(view.select('not-a-section'), false); assert.equal(view.section, 'guide');
  view.select('control'); assert.equal(view.previewVisible, true);
  view.collapse(); assert.equal(view.previewVisible, false);
  assert.equal(new f.OverlayViewState().minimized, false);
  f.dispose();
});

test('the inactive overlay and new guide do not request devices or networking', () => {
  const f = fixture(); let tree = f.render();
  assert.equal(main(tree).props['aria-expanded'], false);
  assert.equal(nodes(tree).filter((x) => x.type === 'video').length, 0);
  main(tree).props.onClick(); tree = f.render();
  tab(tree, 'guide').props.onClick(); tree = f.render();
  assert.equal(tab(tree, 'guide').props['aria-selected'], true);
  assert.match(text(find(tree, (x) => x.props.id === 'dsh-gc-section-guide')), /✊ 握拳/);
  assert.equal(f.counts.network, 0); assert.equal(f.counts.media, 0);
  f.dispose();
});

test('minimize gates every strip, picker, code, draft and toast without stopping active work', () => {
  const f = fixture(), a = f.active;
  const stream = { getTracks: () => [{ stop() { f.counts.trackStop++; } }] };
  a.camera.enabled = true; a.camera.ready = true; a.camera.stream = stream;
  a.controller.actions = true; a.speech.state = 'recording';
  a.controller.panel = { index: 0, items: [{ sessionId: 'session-A', title: 'PRIVATE SESSION' }] };
  a.dual.remote = true; a.dual.arm = { retained: true }; a.dual.tx = { code: '12345678', ready: false }; a.dual.rx = { code: '87654321', ready: false };
  a.dual.draft = () => ({ text: 'PRIVATE DRAFT' }); a.changed('PRIVATE TOAST');
  let tree = f.render();
  assert.match(text(tree), /PRIVATE SESSION/); assert.match(text(tree), /PRIVATE DRAFT/); assert.match(text(tree), /12345678/);
  assert.equal(f.row.selected, true);
  const scroll = f.counts.scroll, arm = a.dual.arm;
  button(tree, '最小化小窗').props.onClick(); tree = f.render();
  assert.equal(nodes(tree).filter((x) => x.type === 'button').length, 1);
  assert.equal(nodes(tree).some((x) => ['section', 'textarea', 'video'].includes(x.type)), false);
  assert.doesNotMatch(text(tree), /PRIVATE|12345678|87654321/);
  assert.equal(f.row.selected, false); assert.equal(f.counts.scroll, scroll);
  assert.equal(a.camera.enabled, true); assert.equal(a.camera.stream, stream); assert.equal(a.controller.actions, true);
  assert.equal(a.speech.state, 'recording'); assert.equal(a.dual.arm, arm); assert.equal(a.dual.remote, true); assert.equal(f.counts.trackStop, 0);
  assert.equal(a.controller.panel.items[0].sessionId, 'session-A', 'Hidden picker scene is preserved, not silently rerouted');
  assert.equal(f.counts.focused.at(-1), '恢复手势控制小窗');
  button(tree, '恢复手势控制小窗').props.onClick(); tree = f.render();
  assert.match(text(tree), /PRIVATE SESSION/); assert.equal(main(tree).props['aria-expanded'], true); assert.equal(f.row.selected, true);
  f.dispose();
});

test('tab changes and minimize/restore reattach the same retained stream to preview', () => {
  const f = fixture(), a = f.active, stream = { getTracks: () => [] };
  a.camera.enabled = true; a.camera.ready = true; a.camera.stream = stream;
  let tree = f.render(); main(tree).props.onClick(); tree = f.render();
  let video = find(tree, (x) => x.type === 'video').props.ref.current;
  assert.equal(video.srcObject, stream); assert.equal(f.counts.play, 1);
  tab(tree, 'guide').props.onClick(); tree = f.render(); assert.equal(video.srcObject, null);
  assert.equal(nodes(tree).some((x) => x.type === 'video'), false);
  tab(tree, 'control').props.onClick(); tree = f.render(); video = find(tree, (x) => x.type === 'video').props.ref.current;
  assert.equal(video.srcObject, stream); assert.equal(f.counts.play, 2);
  button(tree, '最小化小窗').props.onClick(); tree = f.render(); assert.equal(video.srcObject, null);
  button(tree, '恢复手势控制小窗').props.onClick(); tree = f.render();
  assert.equal(find(tree, (x) => x.type === 'video').props.ref.current.srcObject, stream); assert.equal(f.counts.play, 3);
  f.dispose();
});

test('tab keyboard navigation, native buttons and scoped Escape remain operable', () => {
  const f = fixture(); let tree = f.render(); main(tree).props.onClick(); tree = f.render();
  const openerLabel = main(tree).props['aria-label'] || main(tree).props['aria-controls'];
  find(tree, (node) => node.type === 'button' && text(node) === '收起控制栏').props.onClick(); tree = f.render();
  assert.equal(main(tree).props['aria-expanded'], false); assert.equal(f.counts.focused.at(-1), openerLabel);
  main(tree).props.onClick(); tree = f.render();
  let prevented = 0, stopped = 0;
  tab(tree, 'control').props.onKeyDown({ key: 'ArrowRight', preventDefault() { prevented++; }, currentTarget: { parentElement: { querySelector() { return { focus() {} }; } } } });
  tree = f.render(); assert.equal(tab(tree, 'guide').props.tabIndex, 0); assert.equal(prevented, 1);
  for (const node of nodes(tree).filter((x) => x.type === 'button')) assert.equal(node.props.type, 'button');
  tree.props.onKeyDown({ key: 'Escape', stopPropagation() { stopped++; } }); tree = f.render();
  assert.equal(main(tree).props['aria-expanded'], false); assert.equal(stopped, 1);
  tree.props.onKeyDown({ key: 'Escape', stopPropagation() { stopped++; } }); assert.equal(stopped, 1, 'Do not consume unrelated Host Escape when collapsed');
  f.dispose();
});

test('new interface text follows optional locale without writing preferences and fully disposes', () => {
  const f = fixture({ localeEnabled: true });
  assert.equal(f.dictionaries.size, 1); assert.equal(f.localeListeners.size, 1);
  let tree = f.render(); assert.ok(button(tree, '最小化小窗'));
  f.locale.active = 'en'; for (const callback of f.localeListeners) callback(); tree = f.render();
  assert.ok(button(tree, 'Minimize panel')); assert.equal(text(tab(tree, 'guide')), 'Gesture guide');
  assert.equal(f.counts.localeWrites, 0);
  f.dispose();
});

test('the guide covers every assigned gesture and the distinct local/peer/busy semantics', () => {
  const f = fixture(), dict = f.panelMessages.zh;
  assert.deepEqual(Array.from(f.gestureGuide, (x) => x[0]), ['fist', 'palm', 'thumb', 'thumbDown', '1', '2', '3', '4', 'toggleSessions', 'togglePeer', 'swipeVertical', 'swipeHorizontal']);
  for (const language of ['zh', 'en']) for (const [, title, rows] of f.gestureGuide) {
    assert.ok(f.panelMessages[language][title]);
    for (const [scene, description] of rows) { assert.ok(f.panelMessages[language][scene]); assert.ok(f.panelMessages[language][description]); }
  }
  assert.match(dict.thumbPeer, /即使对端正在运行也会排队/);
  assert.match(dict.thumbChat, /任务运行中不发送/);
  assert.match(dict.palmQuestion, /第 5 个选项，不开始录音/);
  assert.match(dict.fistQuestion, /再放下手并握拳提交/);
  assert.match(dict.guidePriority, /不随切换改投/);
  assert.match(dict.targetPeer, /不重新绑定 Dual/);
  assert.match(dict.interactionMinimize, /1\/2\/握拳仍操作该列表/);
  assert.match(dict.interactionStop, /请取消/);
  assert.match(dict.speechPrivacy, /远程模型会收到文本，此时尚未按 👍 提交/);
  assert.match(text(f.renderGestureGuide((key) => dict[key])), /语音准备与数据去向/);
  f.dispose();
});

test('layout offset and card bounds share one constant and preserve click-through/theme tokens', () => {
  const f = fixture();
  assert.match(f.css, /--dsh-gc-top:108px/); assert.match(f.css, /top:var\(--dsh-gc-top\)/);
  assert.match(f.css, /100dvh - var\(--dsh-gc-top\) - 92px/);
  assert.match(f.css, /max-height:calc\(100dvh - var\(--dsh-gc-top\) - 12px\)/);
  assert.match(f.css, /flex:0 1 auto;min-height:0/); assert.match(f.css, /flex-shrink:0/);
  assert.match(f.css, /pointer-events:none/); assert.match(f.css, /dsh-gc-toolbar[^}]*pointer-events:auto/);
  assert.match(f.css, /dsh-gc-minimized>button\{width:32px/);
  assert.doesNotMatch(f.css, /#[0-9a-f]{3,8}\b/i);
  assert.match(f.css, /--dsw-alias-bg-overlay/); assert.match(f.css, /max-width:calc\(100vw - 36px\)/);
  f.dispose();
});

test('the gesture, speech, pairing and RPC business prefix is unchanged from 0.1.7', () => {
  const reference = JSON.parse(fs.readFileSync(new URL('./helpers/gesture-business-prefix.json', import.meta.url), 'utf8'));
  const prefix = source.split('// src/panel-view.js')[0].replace(/var version = "[^"]+";/, 'var version = "__VERSION__";');
  assert.equal(createHash('sha256').update(prefix).digest('hex'), reference.sha256);
});
