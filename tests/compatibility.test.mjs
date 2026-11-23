import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';

const require = createRequire(import.meta.url);
const semver = require('./helpers/semver');
const manifest = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const client = readFileSync(new URL('../lib/client.js', import.meta.url), 'utf8');
const adapterSource = client.slice(client.indexOf('// src/dsh-adapter.js'), client.indexOf('// src/speech.js'));
assert.ok(adapterSource.includes('var DshAdapter = class'));
const { DshAdapter, locked } = vm.runInNewContext(`${adapterSource}\n({ DshAdapter, locked })`, { setTimeout, clearTimeout });

// This is engine-policy evaluation, not a claim that future versions were run.
// DSH's compatibility gate explicitly uses includePrerelease:true.
const matrix = [
  ['0.2.0', false], ['0.2.1-alpha.5', false], ['0.2.1-rc.1', false],
  ['0.2.1-rc.2', true], ['0.2.1-rc.3', true], ['0.2.1-rc.4', true],
  ['0.2.1-rc.5', true], ['0.2.1-rc.99', true], ['0.2.1', true],
  ['0.2.2-alpha.2', false], ['0.2.2-alpha.3', false],
  ['0.2.2-rc.1', true], ['0.2.2-rc.2', true], ['0.2.2-rc.3', true],
  ['0.2.2-rc.4', true], ['0.2.2-rc.5', true], ['0.2.2-rc.99', true],
  ['0.2.2', true], ['0.2.2+build.1', true],
  ['0.2.3-alpha.1', false], ['0.2.3-alpha.2', false],
  ['0.2.3-rc.1', false], ['0.2.3', false], ['0.3.0', false],
  ['1.0.0', false], ['not-a-version', false]
];
for (const [version, expected] of matrix) {
  test(`engine policy ${version}: ${expected ? 'included' : 'excluded'}`, () => {
    assert.equal(semver.satisfies(version, manifest.engines.dsh, { includePrerelease: true }), expected);
    assert.equal(semver.satisfies(version, manifest.engines.dsh), expected);
  });
}
test('the former exact engine rejects 0.2.2 while the new bounded range admits it', () => {
  assert.equal(semver.satisfies('0.2.2-rc.5', '0.2.1-rc.2', { includePrerelease: true }), false);
  assert.equal(semver.satisfies('0.2.2-rc.5', manifest.engines.dsh, { includePrerelease: true }), true);
  assert.equal(semver.satisfies('0.2.3-alpha.2', '>=0.2.1-rc.2 <0.3.0', { includePrerelease: true }), true);
  assert.equal(semver.satisfies('0.2.3-alpha.2', manifest.engines.dsh, { includePrerelease: true }), false);
});

function source(initial) {
  let value = initial;
  const listeners = new Set();
  return {
    getSnapshot: () => value,
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    set(next) { value = next; for (const fn of [...listeners]) fn(); },
    get count() { return listeners.size; }
  };
}
function fixture({ legacy = false, visibility, workspaceVisibility, phase = 'plain', retainError } = {}) {
  const rows = {
    a: { title: 'Alpha', updatedAt: 10, blank: false },
    b: { title: 'Beta', updatedAt: 20, blank: false },
    current: { title: '', updatedAt: 30, blank: true },
    blank: { title: '', updatedAt: 40, blank: true },
    archived: { title: 'Archived', updatedAt: 50, blank: false },
    sub: { title: 'Child', updatedAt: 60, blank: false, origin: 'subagent' },
    notProjected: { title: 'Not in ids', updatedAt: 100, blank: false }
  };
  const list = source({ ids: ['a', 'b', 'current', 'blank', 'archived', 'sub'], byId: rows });
  const workspaceList = source({ items: [{ workspaceId: 'w', path: '/fixture', title: 'Fixture', sessionIds: Object.keys(rows) }], pinnedSessionIds: ['a'], archivedSessionIds: ['archived'] });
  const current = source({ key: 'current', hooks: {}, props: {} });
  const status = source(new Map());
  const view = source({ groupBy: 'workspace', orderBy: 'updated' });
  const input = source({ phase, draft: 'Fixture draft', draftRev: 1, queue: [], attachmentIds: [] });
  const session = source({ blank: false, running: false, pendingSubmissions: [] });
  const calls = { retain: 0, release: 0, opened: 0, submit: 0, insert: 0, cancel: 0 };
  session.cancel = async () => { calls.cancel++; return { ok: true }; };
  const actions = {
    captureInsertion: () => ({ start: 0, end: 0, draftRev: 1 }),
    insertText: () => { calls.insert++; return true; },
    persistDraft() {},
    submit() { calls.submit++; session.set({ ...session.getSnapshot(), pendingSubmissions: [{ requestId: 'fixture-receipt' }] }); }
  };
  const shell = { state: input, actions };
  const bindings = new Map(list.getSnapshot().ids.map(id => [id, { sessionId: id, session, ctx: { fixtureId: id } }]));
  const sessions = {
    list,
    binding: id => bindings.get(id),
    retain(id) {
      calls.retain++;
      return { ready: retainError ? Promise.reject(retainError) : Promise.resolve(bindings.get(id)), release() { calls.release++; } };
    }
  };
  const uiSession = { sessionStatus: status, pendingDomains: [] };
  const uiWorkspace = { openSession() { calls.opened++; } };
  if (legacy) {
    uiSession.current = current;
    uiWorkspace.workspaces = { list: workspaceList };
  } else {
    uiSession.adapter = { current };
    Object.defineProperty(uiSession, 'current', { get() { throw new Error('private current must not be read'); } });
    Object.defineProperty(uiWorkspace, 'workspaces', { get() { throw new Error('private workspaces must not be read'); } });
  }
  if (visibility) uiWorkspace.isSessionVisible = visibility;
  if (workspaceVisibility) uiWorkspace.isWorkspaceVisible = workspaceVisibility;
  const slotListeners = new Set();
  const services = { sessions, uiSession, uiWorkspace, workspaces: legacy ? undefined : { list: workspaceList }, conversation: { input: { for: () => shell } } };
  const ctx = {
    get: name => services[name],
    slots: {
      entries: () => [{ options: { name: 'sidebar.workspaces', store: { create: () => view } } }],
      subscribe(name, fn) { slotListeners.add(fn); return () => slotListeners.delete(fn); }
    }
  };
  return { adapter: new DshAdapter(ctx), list, workspaceList, current, status, view, input, session, calls, slotListeners, uiSession };
}
const ids = adapter => Array.from(adapter.listSessions(), row => row.sessionId);

test('official public workspaces and adapter.current work without private fields or visibility extensions', () => {
  const f = fixture();
  assert.deepEqual(ids(f.adapter), ['current', 'a', 'b']);
  assert.equal(f.adapter.current().sessionId, 'current');
  assert.equal(f.calls.retain, 0);
  assert.equal(f.calls.opened, 0);
});
test('the picker keeps projected membership, archive, subagent and non-current blank filters', () => {
  const f = fixture();
  assert.ok(!ids(f.adapter).some(id => ['notProjected', 'archived', 'sub', 'blank'].includes(id)));
  const state = f.workspaceList.getSnapshot();
  f.workspaceList.set({ ...state, items: [{ ...state.items[0], sessionIds: ['notProjected'] }] });
  assert.ok(!ids(f.adapter).includes('notProjected'));
});
test('legacy sources remain supported and optional session visibility still restricts the picker', () => {
  const f = fixture({ legacy: true, visibility: id => id !== 'b' });
  assert.deepEqual(ids(f.adapter), ['current', 'a']);
});
test('a hidden legacy workspace cannot leak its sessions into the ungrouped fallback', () => {
  const f = fixture({ legacy: true, workspaceVisibility: () => false });
  assert.deepEqual(ids(f.adapter), []);
});
test('manual ordering and flat view still use the singleton sidebar view source', () => {
  const f = fixture();
  f.workspaceList.set({ ...f.workspaceList.getSnapshot(), pinnedSessionIds: [] });
  f.view.set({ groupBy: 'flat', orderBy: 'manual', sessionOrderByAccount: { __flat_session_order__: ['b', 'a', 'current'] } });
  assert.deepEqual(ids(f.adapter), ['current', 'b', 'a']);
});
test('workspace-tree order remains child-before-parent', () => {
  const f = fixture();
  const list = f.list.getSnapshot();
  f.list.set({ ids: ['a', 'b'], byId: list.byId });
  f.workspaceList.set({ items: [
    { workspaceId: 'parent', path: '/fixture', sessionIds: ['a'] },
    { workspaceId: 'child', path: '/fixture/child', sessionIds: ['b'] }
  ] });
  f.view.set({ groupBy: 'workspace-tree', orderBy: 'updated' });
  assert.deepEqual(ids(f.adapter), ['b', 'a']);
});
test('public current and workspace subscriptions update and dispose without retaining sessions', () => {
  const f = fixture();
  let events = 0;
  const off = f.adapter.subscribe(() => { events++; });
  assert.equal(f.current.count, 1);
  assert.equal(f.workspaceList.count, 1);
  f.current.set({ key: 'b', hooks: {}, props: {} });
  assert.equal(f.adapter.current().sessionId, 'b');
  f.workspaceList.set(f.workspaceList.getSnapshot());
  assert.ok(events >= 2);
  off(); off();
  for (const s of [f.current, f.status, f.list, f.workspaceList, f.view, f.session, f.input]) assert.equal(s.count, 0);
  assert.equal(f.slotListeners.size, 0);
  assert.equal(f.calls.retain, 0);
});
test('DSH 0.2.2 sending phase is locked before draft submission or transcript insertion', async () => {
  const f = fixture({ phase: 'sending' });
  assert.equal(locked({ phase: 'sending' }), true);
  assert.equal(await f.adapter.sendDraft('b'), false);
  assert.equal(await f.adapter.appendTranscript('b', 'dictation'), false);
  assert.equal(f.calls.submit, 0);
  assert.equal(f.calls.insert, 0);
  assert.equal(f.calls.retain, f.calls.release);
});
test('plain input still submits only after the existing observable receipt', async () => {
  const f = fixture();
  assert.equal(await f.adapter.sendDraft('b'), true);
  assert.equal(f.calls.submit, 1);
  assert.equal(f.calls.retain, 1);
  assert.equal(f.calls.release, 1);
});
test('session operations retain and release exactly once even when ready rejects', async () => {
  const f = fixture();
  assert.equal(await f.adapter.stop('b'), true);
  assert.equal(f.calls.cancel, 1);
  assert.equal(f.calls.retain, 1);
  assert.equal(f.calls.release, 1);
  const error = new Error('fixture retired');
  const retired = fixture({ retainError: error });
  await assert.rejects(retired.adapter.stop('b'), error);
  assert.equal(retired.calls.retain, 1);
  assert.equal(retired.calls.release, 1);
});
test('pending approval still blocks draft submission without clicking or accepting it', async () => {
  const f = fixture();
  f.status.set(new Map([['b', { pendingInteraction: { kind: 'approval', sessionId: 'b' } }]]));
  assert.equal(await f.adapter.sendDraft('b'), false);
  assert.equal(f.calls.submit, 0);
  assert.equal(f.calls.retain, f.calls.release);
});
