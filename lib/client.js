window.__ModuleLoader__.load({id:'dsh-gesture-control',factory:(require)=>{var module={exports:{}};var exports=module.exports;
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf, __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: !0 });
}, __copyProps = (to, from, except, desc) => {
  if (from && typeof from == "object" || typeof from == "function")
    for (let key of __getOwnPropNames(from))
      !__hasOwnProp.call(to, key) && key !== except && __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: !0 }) : target,
  mod
)), __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: !0 }), mod);

// src/client.js
var client_exports = {};
__export(client_exports, {
  apply: () => apply,
  inject: () => inject
});
module.exports = __toCommonJS(client_exports);
var import_react = __toESM(require("react"), 1);

// package.json
var version = "0.1.8";

// src/dsh-adapter.js
var locked = (state) => ["adjudicating", "submitting", "sending"].includes(state?.phase), snapshot = (source) => source?.getSnapshot?.(), sameQuestion = (a, b) => !!a && !!b && a.sessionId === b.sessionId && a.key === b.key && a.id === b.id, checkedSignature = (buttons) => buttons.map((b) => b.getAttribute("aria-checked") === "true" ? "1" : "0").join(""), answerSignature = (native) => JSON.stringify([checkedSignature(native.buttons), ...[...native.section.querySelectorAll('input, textarea, [contenteditable="true"]')].map((field) => field.value ?? field.textContent ?? "")]), usable = (button) => !!button && button.isConnected !== !1 && !button.disabled && button.getAttribute("aria-disabled") !== "true";
function recency(ids, byId) {
  return [...new Set(ids)].sort((a, b) => (byId[b]?.updatedAt ?? 0) - (byId[a]?.updatedAt ?? 0) || a.localeCompare(b));
}
function manualOrder(ids, saved, byId, pins, archived) {
  let members = new Set(ids), included = /* @__PURE__ */ new Set(), ordered = [];
  for (let id of saved ?? []) members.has(id) && !included.has(id) && (included.add(id), ordered.push(id));
  let leading = [];
  for (let id of pins) members.has(id) && !included.has(id) && !archived.has(id) && byId[id] && (included.add(id), leading.push(id));
  let rest = recency(ids.filter((id) => !included.has(id)), byId), ordinary = rest.filter((id) => !archived.has(id)), result = [...leading, ...ordered, ...ordinary, ...rest.filter((id) => archived.has(id))], pending = new Set(ordinary), place = (id) => {
    if (!pending.delete(id)) return;
    let parent = byId[id]?.parentId;
    !parent || parent === id || !result.includes(parent) || (place(parent), result.splice(result.indexOf(id), 1), result.splice(result.indexOf(parent), 0, id));
  };
  for (let id of [...ordinary].reverse()) place(id);
  return result;
}
var DshAdapter = class {
  constructor(ctx) {
    this.ctx = ctx, this.sessions = ctx.get("sessions"), this.uiSession = ctx.get("uiSession"), this.conversation = ctx.get("conversation"), this.uiWorkspace = ctx.get("uiWorkspace"), this.workspaces = ctx.get("workspaces") ?? this.uiWorkspace?.workspaces, this.listeners = /* @__PURE__ */ new Set(), this.disposers = [], this.dynamicDisposers = [], this.highlight = null, this.paint = null, this.sending = /* @__PURE__ */ new Set();
  }
  // Public SlotScopeAdapter source; legacy builds may still expose current directly.
  _currentSource() {
    return this.uiSession.adapter?.current ?? this.uiSession.current;
  }
  _status(id) {
    return snapshot(this.uiSession.sessionStatus)?.get(id);
  }
  _interactions(id) {
    let result = /* @__PURE__ */ new Set(), pending = this._status(id)?.pendingInteraction;
    pending && result.add(pending);
    for (let domain of this.uiSession.pendingDomains ?? [])
      for (let value of domain.valuesSnapshot()) value.sessionId === id && result.add(value);
    return [...result];
  }
  _blocked(id) {
    return this._interactions(id).some((p) => p.kind !== "question" || p.review !== void 0);
  }
  _shell(binding2) {
    if (!(!binding2 || binding2.sessionId === void 0))
      return this.conversation.input.for(binding2.ctx);
  }
  _borrow(id) {
    return this.sessions.binding(id);
  }
  current() {
    let selected = snapshot(this._currentSource()), sessionId = selected?.key;
    if (!sessionId) return null;
    let binding2 = this._borrow(sessionId), state = snapshot(binding2?.session) ?? snapshot(selected.hooks?.session), row = snapshot(this.sessions.list)?.byId?.[sessionId], result = {
      sessionId,
      running: !!(this._status(sessionId)?.running ?? state?.running ?? row?.running),
      blank: !!(state?.blank ?? row?.blank),
      blocked: this._blocked(sessionId)
    }, question = this.questionView();
    return question && (result.question = question), result;
  }
  contextKey() {
    let current = this.current();
    return current ? JSON.stringify([current.sessionId, current.question?.key ?? null, current.question?.id ?? null]) : null;
  }
  /** Borrow only: diagnostics must not open, retain, switch, or submit a session. */
  getDraft(sessionId) {
    let binding2 = this._borrow(sessionId);
    return binding2 ? snapshot(this._shell(binding2)?.state)?.draft ?? "" : "";
  }
  retain(sessionId) {
    if (typeof sessionId != "string" || !sessionId) throw new TypeError("A sessionId is required");
    let reference = this.sessions.retain(sessionId, { source: "controllerOperation" }), released = !1;
    return {
      ready: Promise.resolve(reference.ready).then((binding2) => {
        if (binding2?.sessionId !== sessionId) throw new Error("Retained session identity mismatch");
        return binding2;
      }),
      release() {
        released || (released = !0, reference.release());
      }
    };
  }
  async _using(id, operation) {
    let reference = this.retain(id);
    try {
      return await operation(await reference.ready);
    } finally {
      reference.release();
    }
  }
  async stop(sessionId) {
    return this._using(sessionId, async ({ session }) => (await session.cancel())?.ok === !0);
  }
  async continueSession(sessionId) {
    return this._using(sessionId, async ({ session }) => snapshot(session)?.blank !== !1 || this._interactions(sessionId).length ? !1 : (await session.prompt([{ type: "text", text: "\u7EE7\u7EED" }], "queue"))?.ok === !0);
  }
  /** Resolve at transcription completion, against the latest editor revision. */
  async appendTranscript(sessionId, text, signal) {
    return typeof text != "string" || !text.trim() ? !1 : this._using(sessionId, async (binding2) => {
      let shell = this._shell(binding2);
      for (let attempt = 0; attempt < 2; attempt += 1) {
        if (signal?.aborted) return !1;
        let state = snapshot(shell?.state);
        if (!state || locked(state)) return !1;
        let capture = shell.actions.captureInsertion(), before = shell.projection?.detectText ?? state.draft, end = before.length, insertion = { ...capture, start: end, end }, segment = (state.draft && !/\s$/.test(state.draft) ? `
` : "") + text.trim();
        if (shell.actions.insertText(segment, insertion))
          return shell.actions.persistDraft(), this.clearTranscript(), this.transcript = { sessionId, start: end, end: end + segment.length, value: before + segment }, this.unwatchTranscript = shell.state.subscribe(() => this.trackTranscript(shell)), !0;
      }
      return !1;
    });
  }
  clearTranscript() {
    this.unwatchTranscript?.(), this.unwatchTranscript = null, this.transcript = null;
  }
  // Keep the inserted range attached to edits outside it. An edit inside the
  // dictation gives ownership back to the user instead of deleting their edit.
  trackTranscript(shell) {
    let mark = this.transcript;
    if (!mark) return;
    let next = shell.projection?.detectText ?? snapshot(shell.state)?.draft ?? "", old = mark.value;
    if (next === old) return;
    let first = 0;
    for (; first < old.length && first < next.length && old[first] === next[first]; ) first++;
    let end = old.length, nextEnd = next.length;
    for (; end > first && nextEnd > first && old[end - 1] === next[nextEnd - 1]; )
      end--, nextEnd--;
    if (end <= mark.start)
      mark.start += next.length - old.length, mark.end += next.length - old.length;
    else if (first < mark.end) {
      this.clearTranscript();
      return;
    }
    mark.value = next;
  }
  async undoTranscript(sessionId) {
    return this.transcript?.sessionId !== sessionId ? !1 : this._using(sessionId, async (binding2) => {
      let shell = this._shell(binding2);
      if (!shell || locked(snapshot(shell.state))) return !1;
      this.trackTranscript(shell);
      let mark = this.transcript;
      if (mark?.sessionId !== sessionId) return !1;
      let span = { ...shell.actions.captureInsertion(), start: mark.start, end: mark.end };
      return shell.actions.insertText("", span) ? (this.clearTranscript(), shell.actions.persistDraft(), !0) : !1;
    });
  }
  /** Returns true only after an observable submission receipt, not submit():void. */
  async sendDraft(sessionId) {
    if (this.sending.has(sessionId)) return !1;
    this.sending.add(sessionId);
    try {
      return await this._using(sessionId, async (binding2) => {
        if (this._interactions(sessionId).length) return !1;
        let shell = this._shell(binding2), beforeInput = snapshot(shell?.state);
        if (!beforeInput || locked(beforeInput) || !beforeInput.draft.trim() && !beforeInput.attachmentIds?.length) return !1;
        let before = snapshot(binding2.session), echoes = new Set((before?.pendingSubmissions ?? []).map((e) => e.requestId)), queue = new Set(beforeInput.queue ?? []);
        return new Promise((resolve) => {
          let off = [], timer, finished = !1, started = !1, finish = (value) => {
            if (!finished) {
              finished = !0, clearTimeout(timer);
              for (let dispose of off) dispose();
              resolve(value);
            }
          }, check = () => {
            if (!started || finished) return;
            let state = snapshot(binding2.session), input = snapshot(shell.state);
            if (state?.removed || state?.promptError && state.promptError !== before?.promptError) return finish(!1);
            ((state?.pendingSubmissions ?? []).some((e) => !echoes.has(e.requestId)) || !before?.running && state?.running || (input?.queue ?? []).some((e) => !queue.has(e))) && finish(!0);
          };
          for (let source of [binding2.session, shell.state])
            source?.subscribe && off.push(source.subscribe(check));
          timer = setTimeout(() => finish(!1), 2500);
          try {
            if (this._interactions(sessionId).length) return finish(!1);
            started = !0;
            let possiblePromise = shell.actions.submit();
            possiblePromise?.then && possiblePromise.then(check, () => finish(!1)), check();
          } catch {
            finish(!1);
          }
        });
      });
    } finally {
      this.sending.delete(sessionId);
    }
  }
  // The workspace plugin deliberately exposes actions only on uiWorkspace.view.
  // Its registered singleton slot store is the authoritative read-only view state.
  _viewSource() {
    return this.ctx.slots?.entries("sidebar.workspaces")?.find((e) => e.options?.name === "sidebar.workspaces")?.options?.store?.create();
  }
  listSessions() {
    let list = snapshot(this.sessions.list) ?? { ids: [], byId: {} }, ws = snapshot(this.workspaces?.list) ?? { items: [] }, view = snapshot(this._viewSource()) ?? { groupBy: "workspace", orderBy: "updated" }, archived = new Set(ws.archivedSessionIds ?? []), pins = new Set(ws.pinnedSessionIds ?? []), current = snapshot(this._currentSource())?.key, members = new Set(list.ids), hidden = new Set(ws.items.filter((w) => typeof this.uiWorkspace.isWorkspaceVisible === "function" && !this.uiWorkspace.isWorkspaceVisible(w.workspaceId)).flatMap((w) => w.sessionIds)), visible = (id) => {
      let row = list.byId[id];
      // Official controllers already project membership for the caller. Honor
      // optional legacy visibility extensions without requiring those extensions.
      return members.has(id) && !!row && row.origin !== "subagent" && (!row.blank || id === current) && !archived.has(id) && !hidden.has(id) && (typeof this.uiWorkspace.isSessionVisible !== "function" || this.uiWorkspace.isSessionVisible(id));
    }, workspaces = ws.items.filter((w) => typeof this.uiWorkspace.isWorkspaceVisible !== "function" || this.uiWorkspace.isWorkspaceVisible(w.workspaceId)), workspaceBySession = /* @__PURE__ */ new Map();
    for (let w of workspaces) for (let id of w.sessionIds) workspaceBySession.set(id, w);
    let order = (ids2, account) => {
      let selected = ids2.filter(visible), ordered = view.orderBy === "manual" ? manualOrder(selected, view.sessionOrderByAccount?.[account], list.byId, pins, archived) : recency(selected, list.byId);
      return [
        ...ordered.filter((id) => list.byId[id].blank),
        ...ordered.filter((id) => !list.byId[id].blank && pins.has(id)),
        ...ordered.filter((id) => !list.byId[id].blank && !pins.has(id))
      ];
    }, nestedOrder = (workspace) => {
      let normalize = (path2) => (/^[A-Za-z]:[/\\]/.test(path2) || path2.startsWith("\\\\") ? path2.replaceAll("\\", "/") : path2).replace(/\/+$/, ""), path = normalize(workspace.path ?? ""), parent;
      for (let candidate of workspaces) {
        let root = normalize(candidate.path ?? "");
        root && root !== path && path.startsWith(`${root}/`) && (!parent || root.length > normalize(parent.path).length) && (parent = candidate);
      }
      return parent?.workspaceId;
    }, parents = view.groupBy === "workspace-tree" ? new Map(workspaces.map((w) => [w.workspaceId, nestedOrder(w)])) : /* @__PURE__ */ new Map(), walk = (parent) => workspaces.filter((w) => parents.get(w.workspaceId) === parent).flatMap((w) => [
      ...view.groupBy === "workspace-tree" ? walk(w.workspaceId) : [],
      ...order(w.sessionIds, w.workspaceId)
    ]), ids = view.groupBy === "flat" ? order(list.ids, "__flat_session_order__") : [...walk(void 0), ...order(list.ids.filter((id) => !workspaceBySession.has(id)), "")];
    return [...new Set(ids)].map((sessionId) => {
      let w = workspaceBySession.get(sessionId), title = list.byId[sessionId].blank ? "" : list.byId[sessionId].title?.trim() ?? "";
      return { sessionId, title: title || (list.byId[sessionId].blank ? "\u65B0\u4F1A\u8BDD" : "\u672A\u547D\u540D\u4F1A\u8BDD"), workspaceTitle: w?.title?.trim() || w?.path?.split(/[\\/]/).filter(Boolean).pop() || "" };
    });
  }
  openSession(sessionId) {
    return this.uiWorkspace.openSession(sessionId);
  }
  _nativeQuestion() {
    let sessionId = snapshot(this._currentSource())?.key;
    if (!sessionId || this._blocked(sessionId)) return null;
    let pending = this._status(sessionId)?.pendingInteraction;
    if (pending?.kind !== "question" || pending.sessionId !== sessionId || pending.review !== void 0 || snapshot(pending)?.closed) return null;
    let doc = globalThis.document;
    if (!doc?.querySelectorAll) return null;
    let roots = [...doc.querySelectorAll("[data-question-key]")].filter((r) => r.getAttribute("data-question-key") === pending.key && r.isConnected !== !1);
    if (roots.length !== 1) return null;
    let root = roots[0], section = root.querySelector("section[aria-labelledby]"), labelled = section?.getAttribute("aria-labelledby"), prefix = `question-${pending.key}-`;
    if (!labelled?.startsWith(prefix)) return null;
    let suffix = labelled.slice(prefix.length);
    if (!/^\d+$/.test(suffix)) return null;
    let index = Number(suffix), question = pending.questions?.[index];
    if (!question || question.id === void 0) return null;
    let buttons = [...section.querySelectorAll('button[role="radio"], button[role="checkbox"]')], options = question.options ?? [];
    return {
      root,
      section,
      buttons,
      pending,
      complete: buttons.length === options.length,
      view: {
        key: pending.key,
        sessionId,
        id: question.id,
        multi: question.multiSelect === !0,
        options: options.map((o) => ({ label: o.label, ...o.description === void 0 ? {} : { description: o.description } })),
        index,
        total: pending.questions.length
      }
    };
  }
  _clearPaint() {
    if (this.paint) {
      let { node, outline, outlineOffset } = this.paint;
      node.style.outline = outline, node.style.outlineOffset = outlineOffset, node.removeAttribute("data-dsh-gesture-highlight"), this.paint = null;
    }
  }
  _validHighlight(native) {
    return (!native || !sameQuestion(this.highlight, native.view) || this.highlight.signature !== answerSignature(native)) && (this.highlight = null, this._clearPaint()), this.highlight;
  }
  questionView() {
    let native = this._nativeQuestion(), highlight = this._validHighlight(native);
    return native ? { ...native.view, highlight: highlight?.option ?? -1 } : null;
  }
  _highlight(native, option) {
    this._clearPaint();
    let node = native.buttons[option];
    this.highlight = { ...native.view, option, signature: answerSignature(native) }, this.paint = { node, outline: node.style.outline, outlineOffset: node.style.outlineOffset }, node.style.outline = "2px solid var(--dsw-alias-state-business-primary, #7165f6)", node.style.outlineOffset = "2px", node.setAttribute("data-dsh-gesture-highlight", "true"), node.scrollIntoView?.({ block: "nearest" }), this._notify();
  }
  questionMove(delta, expectedQuestion) {
    if (!Number.isFinite(delta) || !delta) return !1;
    let native = this._nativeQuestion();
    if (!native || !native.complete || !native.buttons.length || expectedQuestion && !sameQuestion(expectedQuestion, native.view)) return !1;
    let old = this._validHighlight(native)?.option, selected = native.buttons.findIndex((b) => b.getAttribute("aria-checked") === "true"), start = old ?? (selected >= 0 ? selected : delta > 0 ? -1 : 0), count = native.buttons.length, option = ((start + Math.trunc(delta)) % count + count) % count;
    return this._highlight(native, option), !0;
  }
  async chooseNumber(n, expectedQuestion) {
    if (!Number.isInteger(n) || n < 1 || n > 5) return !1;
    let native = this._nativeQuestion(), captured = expectedQuestion ?? native?.view;
    if (!native || !native.complete || !sameQuestion(captured, native.view) || n > native.buttons.length) return !1;
    let live = this._nativeQuestion();
    if (!live || !sameQuestion(captured, live.view) || !usable(live.buttons[n - 1])) return !1;
    this._highlight(live, n - 1);
    let final = this._nativeQuestion();
    if (!final || !final.complete || !sameQuestion(captured, final.view) || !usable(final.buttons[n - 1])) return !1;
    if (final.buttons[n - 1].click(), !final.view.multi) {
      await new Promise((resolve) => setTimeout(resolve, 0));
      let after = this._nativeQuestion();
      after && sameQuestion(captured, after.view) && after.buttons[n - 1]?.getAttribute("aria-checked") === "true" && await this.confirmQuestion(captured);
    }
    return this._notify(), !0;
  }
  async confirmQuestion(expectedQuestion) {
    let native = this._nativeQuestion(), captured = expectedQuestion ?? native?.view;
    if (!native || !native.complete || !sameQuestion(captured, native.view)) return !1;
    if (native.view.multi) {
      let highlight = this._validHighlight(native);
      if (highlight) {
        let button2 = native.buttons[highlight.option];
        return usable(button2) ? (button2.click(), this.highlight = null, this._clearPaint(), this._notify(), !0) : !1;
      }
    }
    if (!native.view.multi) {
      let option = this._validHighlight(native)?.option;
      if (option !== void 0 && native.buttons[option].getAttribute("aria-checked") !== "true") {
        if (!usable(native.buttons[option])) return !1;
        native.buttons[option].click(), await new Promise((resolve) => setTimeout(resolve, 0));
        let after = this._nativeQuestion();
        if (!after || !sameQuestion(captured, after.view))
          return this._notify(), !0;
      }
    }
    let live = this._nativeQuestion();
    if (!live || !sameQuestion(captured, live.view)) return !1;
    let footer = live.section.querySelector("footer"), button = (footer ? [...footer.querySelectorAll("button")] : []).at(-1);
    return usable(button) ? (button.click(), this._notify(), !0) : !1;
  }
  _notify() {
    for (let fn of [...this.listeners]) fn(this.current());
  }
  _watchDynamic() {
    for (let off of this.dynamicDisposers.splice(0)) off();
    let id = snapshot(this._currentSource())?.key, binding2 = id ? this._borrow(id) : void 0, sources = [binding2?.session, binding2 && this._shell(binding2)?.state, ...this._interactions(id)];
    for (let source of sources) source?.subscribe && this.dynamicDisposers.push(source.subscribe(() => this._notify()));
  }
  subscribe(fn) {
    if (typeof fn != "function") throw new TypeError("A listener is required");
    if (this.listeners.add(fn), this.listeners.size === 1) {
      let changed = () => {
        this._watchDynamic(), this._notify();
      };
      for (let source of [this._currentSource(), this.uiSession.sessionStatus, this.sessions.list, this.workspaces?.list, this.uiWorkspace.sessionVisibility, this.uiWorkspace.workspaceVisibility, this._viewSource()])
        source?.subscribe && this.disposers.push(source.subscribe(changed));
      this.ctx.slots?.subscribe && this.disposers.push(this.ctx.slots.subscribe("sidebar.workspaces", changed));
      let doc = globalThis.document;
      if (doc?.addEventListener) {
        let input = () => this._notify();
        doc.addEventListener("input", input, !0), this.disposers.push(() => doc.removeEventListener("input", input, !0));
      }
      if (doc?.body && globalThis.MutationObserver) {
        let observer = new MutationObserver(() => this._notify());
        observer.observe(doc.body, { subtree: !0, childList: !0, attributes: !0, attributeFilter: ["aria-labelledby", "aria-checked", "disabled", "data-question-key"] }), this.disposers.push(() => observer.disconnect());
      }
      this._watchDynamic();
    }
    let active = !0;
    return () => {
      if (active && (active = !1, this.listeners.delete(fn), !this.listeners.size)) {
        for (let off of [...this.disposers.splice(0), ...this.dynamicDisposers.splice(0)]) off();
        this.highlight = null, this._clearPaint();
      }
    };
  }
};

// src/speech.js
async function speechApi(method, data = {}, signal) {
  let response = await fetch(`/dsh-gesture-control/speech/${method}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(data), signal }), result = await response.json();
  if (!response.ok) throw new Error(result.error || `\u8BED\u97F3\u670D\u52A1 HTTP ${response.status}`);
  return result;
}
function encodeWav(samples, rate = 16e3) {
  let buffer = new ArrayBuffer(44 + samples.length * 2), view = new DataView(buffer), str = (p, s) => [...s].forEach((c, i) => view.setUint8(p + i, c.charCodeAt(0)));
  return str(0, "RIFF"), view.setUint32(4, 36 + samples.length * 2, !0), str(8, "WAVE"), str(12, "fmt "), view.setUint32(16, 16, !0), view.setUint16(20, 1, !0), view.setUint16(22, 1, !0), view.setUint32(24, rate, !0), view.setUint32(28, rate * 2, !0), view.setUint16(32, 2, !0), view.setUint16(34, 16, !0), str(36, "data"), view.setUint32(40, samples.length * 2, !0), samples.forEach((s, i) => view.setInt16(44 + i * 2, Math.round(Math.max(-1, Math.min(1, s)) * (s < 0 ? 32768 : 32767)), !0)), new Uint8Array(buffer);
}
async function wavOf(blob) {
  let context = new AudioContext();
  try {
    let decoded = await context.decodeAudioData(await blob.arrayBuffer()), frames = Math.ceil(decoded.duration * 16e3), offline = new OfflineAudioContext(1, frames, 16e3), source = offline.createBufferSource();
    return source.buffer = decoded, source.connect(offline.destination), source.start(), encodeWav((await offline.startRendering()).getChannelData(0));
  } finally {
    await context.close();
  }
}
function base64(bytes) {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 8192) binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
  return btoa(binary);
}
var SpeechCapture = class {
  constructor(adapter, changed, deps = {}) {
    this.adapter = adapter, this.changed = changed, this.deps = deps, this.state = "idle", this.active = null, this.sequence = 0;
  }
  get busy() {
    return this.state !== "idle";
  }
  setState(state, message) {
    this.state = state, this.changed(message);
  }
  async start(sessionId, peerDraft = null) {
    if (this.busy) return;
    let capture = { id: ++this.sequence, sessionId, peerDraft, ref: this.adapter.retain(sessionId), controller: new AbortController(), chunks: [] };
    this.active = capture, this.setState("opening", "\u6B63\u5728\u51C6\u5907\u9EA6\u514B\u98CE");
    try {
      if (await capture.ref.ready, this.active !== capture) return;
      let catalog = await (this.deps.api || speechApi)("catalog", {}, capture.controller.signal);
      if (this.active !== capture) return;
      let provider = catalog.providers.find((p) => p.id === catalog.selection.providerId);
      if (!provider || !["ready", "standby"].includes(provider.preparation.phase)) throw new Error("\u8BF7\u5148\u70B9\u51FB\u300C\u51C6\u5907\u8BED\u97F3\u6A21\u578B\u300D\uFF0C\u5728 DSH \u5B98\u65B9\u8BED\u97F3\u8BBE\u7F6E\u4E2D\u5B8C\u6210\u672C\u5730\u6A21\u578B\u51C6\u5907");
      capture.selection = { ...catalog.selection, language: "zh" };
      let stream = await (this.deps.getUserMedia || ((c) => navigator.mediaDevices.getUserMedia(c)))({ audio: { echoCancellation: !0, noiseSuppression: !0 }, video: !1 });
      if (this.active !== capture) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      capture.stream = stream;
      let Recorder = this.deps.MediaRecorder || MediaRecorder;
      capture.recorder = new Recorder(stream), capture.recorder.ondataavailable = (event) => {
        event.data.size && capture.chunks.push(event.data);
      }, capture.stopped = new Promise((resolve, reject) => {
        capture.recorder.onstop = resolve, capture.recorder.onerror = (event) => reject(event.error || new Error("\u5F55\u97F3\u5931\u8D25"));
      }), capture.recorder.start(250), capture.timer = setTimeout(() => {
        this.stop().catch((e) => this.changed(e.message));
      }, Math.min(catalog.maxDurationSeconds, 110) * 1e3), this.setState("recording", "\u6B63\u5728\u542C \xB7 \u63E1\u62F3\u7ED3\u675F");
    } catch (error) {
      this.active === capture && (this.cleanup(capture), this.setState("idle", `\u5F55\u97F3\u672A\u5F00\u59CB\uFF1A${error.message}`));
    }
  }
  async stop() {
    let capture = this.active;
    if (!(!capture || this.state !== "recording")) {
      clearTimeout(capture.timer), this.setState("transcribing", "\u5F55\u97F3\u5DF2\u7ED3\u675F \xB7 \u6B63\u5728\u8F6C\u5199\uFF0C\u8BF7\u7A0D\u5019");
      try {
        capture.recorder.stop(), await capture.stopped, capture.stream.getTracks().forEach((t) => t.stop());
        let bytes = await (this.deps.wavOf || wavOf)(new Blob(capture.chunks, { type: capture.recorder.mimeType }));
        if (this.active !== capture) return;
        let api = this.deps.api || speechApi, result = await api("transcribe", { audioBase64: base64(bytes), ...capture.selection }, capture.controller.signal);
        if (this.active !== capture) return;
        let text = result.text.trim();
        if (text) {
          this.setState("polishing", "\u8F6C\u5199\u5DF2\u5B8C\u6210 \xB7 \u6B63\u5728\u6574\u7406\u672C\u6BB5\u6807\u70B9");
          let notice = "\u5DF2\u6574\u7406\u672C\u6BB5";
          try {
            let signal = AbortSignal.any([capture.controller.signal, AbortSignal.timeout(22e3)]), edited = await api("polish", { text }, signal);
            if (!edited?.text?.trim()) throw new Error("\u6574\u7406\u7ED3\u679C\u4E3A\u7A7A");
            text = edited.text.trim();
          } catch {
            notice = "\u5DF2\u4FDD\u7559\u539F\u59CB\u8F6C\u5199";
          }
          if (this.active !== capture) return;
          let inserted = capture.peerDraft ? (capture.peerDraft.append(text), !0) : await this.adapter.appendTranscript(capture.sessionId, text, capture.controller.signal);
          if (this.active !== capture) return;
          this.setState("idle", inserted === !1 ? `\u8349\u7A3F\u6682\u4E0D\u53EF\u7F16\u8F91 \xB7 \u8BF7\u590D\u5236\u672C\u6BB5\uFF1A${text}` : `${notice} \xB7 \u{1F44D} \u53D1\u9001\uFF0C\u{1F44E} \u64A4\u9500\u672C\u6BB5\uFF0C\u5F20\u638C\u7EE7\u7EED\u5F55`);
        } else this.setState("idle", "\u6CA1\u6709\u8BC6\u522B\u5230\u8BED\u97F3 \xB7 \u539F\u8349\u7A3F\u5DF2\u4FDD\u7559");
      } catch (error) {
        this.active === capture && this.setState("idle", `\u8F6C\u5199\u5931\u8D25 \xB7 \u539F\u8349\u7A3F\u5DF2\u4FDD\u7559\uFF1A${error.message}`);
      } finally {
        this.active === capture && this.cleanup(capture);
      }
    }
  }
  cleanup(capture) {
    capture.cleaned || (capture.cleaned = !0, clearTimeout(capture.timer), capture.stream?.getTracks().forEach((t) => t.stop()), capture.ref.release(), this.active === capture && (this.active = null));
  }
  cancel() {
    let capture = this.active;
    capture && (this.active = null, capture.controller.abort(), clearTimeout(capture.timer), capture.recorder?.state === "recording" && capture.recorder.stop(), this.cleanup(capture)), this.setState("idle", "\u624B\u52BF\u5DF2\u5173\u95ED \xB7 \u539F\u8349\u7A3F\u5DF2\u4FDD\u7559");
  }
};

// src/controller.js
var GestureController = class {
  constructor(adapter, speech, changed, dual = null) {
    this.adapter = adapter, this.speech = speech, this.changed = changed, this.actions = !1, this.panel = null, this.inFlight = !1, this.dual = dual;
  }
  contextKey() {
    let l = this.dual?.tx;
    return JSON.stringify([
      this.adapter.contextKey(),
      this.speech.state,
      this.scene(),
      this.actions,
      this.dual?.remote || !1,
      l?.id,
      l?.ready,
      l?.scene?.key
    ]);
  }
  scene() {
    return this.dual?.remote ? this.dual.tx?.scene?.kind || "chat" : this.panel ? "sessions" : this.adapter.current()?.question ? "question" : "chat";
  }
  async dispatchPeer(event) {
    let dual = this.dual, sid = this.adapter.current()?.sessionId, l = dual.tx;
    if (!l?.ready || l.sid !== sid) {
      this.changed("\u5BF9\u7AEF\u672A\u5C31\u7EEA\u6216\u4F1A\u8BDD\u5DF2\u5207\u6362 \xB7 \u6BD4 6 \u5207\u56DE\u672C\u673A");
      return;
    }
    let draft = dual.draft(), scene = this.scene();
    if (event.type === "palm" && scene === "question") event = { type: "number", number: 5 };
    else if (event.type === "palm" && scene === "chat") {
      await this.speech.start(sid, draft);
      return;
    }
    if (event.type === "thumbDown") {
      this.changed(draft.undo() ? "\u5DF2\u64A4\u9500\u5BF9\u7AEF\u8349\u7A3F\u7684\u672C\u6BB5\u8F6C\u5199" : "\u6CA1\u6709\u53EF\u64A4\u9500\u7684\u5B8C\u6574\u8F6C\u5199");
      return;
    }
    if (event.type === "thumb" && scene === "chat") {
      let revision = draft.revision;
      if (!draft.text.trim()) event = { type: "continue" };
      else {
        draft.sendRevision !== revision && (draft.sendRevision = revision, draft.sendId = crypto.randomUUID());
        let reply = await dual.command({ type: "text", text: draft.text }, draft.sendId);
        draft.revision === revision && draft.edit(""), this.changed(reply);
        return;
      }
    }
    ["fist", "continue", "number", "swipe", "toggleSessions"].includes(event.type) && this.changed(await dual.command(event));
  }
  openList() {
    let items = this.adapter.listSessions();
    if (!items.length) {
      this.changed("\u5F53\u524D\u6CA1\u6709\u53EF\u9009\u4F1A\u8BDD");
      return;
    }
    let selected = items.findIndex((i) => i.sessionId === this.adapter.current()?.sessionId);
    this.panel = { items, index: Math.max(0, selected) }, this.moveInList();
  }
  moveInList(direction) {
    let panel = this.panel, step = direction === "up" ? -1 : direction === "down" ? 1 : 0;
    panel.index = Math.max(0, Math.min(panel.items.length - 1, panel.index + step)), this.changed(`\u4F1A\u8BDD ${panel.index + 1}/${panel.items.length} \xB7 ${panel.items[panel.index].title} \xB7 \u63E1\u62F3\u8FDB\u5165`);
  }
  async dispatch(event, expectedContext = this.contextKey()) {
    if (expectedContext === this.contextKey() && this.actions) {
      if (event.type === "togglePeer" && this.dual) {
        this.panel = null, this.dual.toggle().catch((e) => this.changed(e.message));
        return;
      }
      if (!this.inFlight) {
        this.inFlight = !0;
        try {
          if (this.speech.busy) {
            event.type === "fist" && this.speech.state === "recording" ? await this.speech.stop() : this.speech.state === "transcribing" && this.changed("\u6B63\u5728\u8F6C\u5199 \xB7 \u5B8C\u6210\u5E76\u68C0\u67E5\u540E\u518D\u53D1\u9001");
            return;
          }
          if (this.dual?.remote) {
            await this.dispatchPeer(event);
            return;
          }
          if (event.type === "toggleSessions") {
            this.panel ? (this.panel = null, this.changed("\u5DF2\u6536\u8D77\u4F1A\u8BDD\u5217\u8868")) : this.openList();
            return;
          }
          if (this.panel) {
            if (event.type === "number" && (event.number === 1 || event.number === 2))
              this.moveInList(event.number === 1 ? "up" : "down");
            else if (event.type === "fist") {
              let item = this.panel.items[this.panel.index];
              this.panel = null, item && (await this.adapter.openSession(item.sessionId), this.changed(`\u5DF2\u8FDB\u5165\u300C${item.title}\u300D`));
            }
            return;
          }
          let current = this.adapter.current();
          if (current?.question) {
            if (event.type === "swipe" && ["up", "down"].includes(event.direction)) {
              let moved = this.adapter.questionMove(event.direction === "up" ? -1 : 1, current.question);
              this.changed(moved === !1 ? "\u8FD9\u9053\u9898\u6682\u65F6\u6CA1\u6709\u53EF\u9009\u9879" : "\u5DF2\u79FB\u52A8\u9009\u9879\u9AD8\u4EAE \xB7 \u63E1\u62F3\u9009\u62E9\u6216\u63D0\u4EA4");
            } else if (event.type === "number" || event.type === "palm") {
              let accepted = await this.adapter.chooseNumber(event.type === "palm" ? 5 : event.number, current.question);
              this.changed(accepted === !1 ? "\u9898\u76EE\u72B6\u6001\u5DF2\u53D8\u5316 \xB7 \u8BF7\u67E5\u770B DSH \u539F\u9898\u76EE" : current.question.multi ? "\u5DF2\u5207\u6362\u52FE\u9009 \xB7 \u63E1\u62F3\u7EDF\u4E00\u63D0\u4EA4" : "\u5DF2\u9009\u62E9 \xB7 \u6CBF\u7528 DSH \u539F\u9898\u76EE\u4EA4\u4E92");
            } else if (event.type === "fist") {
              let accepted = await this.adapter.confirmQuestion(current.question);
              this.changed(accepted === !1 ? "\u5F53\u524D\u9898\u76EE\u672A\u63D0\u4EA4 \xB7 \u8BF7\u5148\u9009\u62E9\u6216\u67E5\u770B DSH \u539F\u9898\u76EE" : current.question.multi && current.question.highlight >= 0 ? "\u5DF2\u5207\u6362\u9AD8\u4EAE\u9879 \xB7 \u53EF\u7EE7\u7EED\u6D4F\u89C8\uFF0C\u63E1\u62F3\u7EDF\u4E00\u63D0\u4EA4" : "\u5DF2\u786E\u8BA4\u5F53\u524D\u9898\u76EE");
            }
            return;
          }
          if (!current) {
            this.changed("\u8BF7\u5148\u6253\u5F00\u4E00\u4E2A\u4F1A\u8BDD");
            return;
          }
          if (current.blocked) {
            this.changed("\u5F53\u524D\u6709\u5F85\u5904\u7406\u4EA4\u4E92 \xB7 \u8BF7\u4F7F\u7528 DSH \u539F\u9762\u677F");
            return;
          }
          if (event.type === "fist" && current.running) {
            let accepted = await this.adapter.stop(current.sessionId);
            this.changed(accepted === !1 ? "\u505C\u6B62\u8BF7\u6C42\u672A\u63A5\u7EB3 \xB7 \u8BF7\u67E5\u770B DSH \u539F\u4F1A\u8BDD" : "\u5DF2\u505C\u6B62\u672C\u8F6E");
          } else if (event.type === "palm")
            await this.speech.start(current.sessionId);
          else if (event.type === "thumbDown") {
            let undone = await this.adapter.undoTranscript(current.sessionId);
            this.changed(undone ? "\u5DF2\u64A4\u9500\u521A\u624D\u8FD9\u6BB5\u53E3\u8FF0 \xB7 \u53EF\u5F20\u638C\u91CD\u5F55" : "\u6CA1\u6709\u53EF\u64A4\u9500\u7684\u5B8C\u6574\u8F6C\u5199 \xB7 \u8349\u7A3F\u5DF2\u4FDD\u7559");
          } else if (event.type === "thumb" && !current.running)
            if (this.adapter.getDraft(current.sessionId)?.trim()) {
              let result = await this.adapter.sendDraft(current.sessionId);
              this.changed(result === !1 ? "\u8349\u7A3F\u4ECD\u5F85\u53D1\u9001 \xB7 \u8BF7\u68C0\u67E5 DSH \u8F93\u5165\u6846" : "\u6D88\u606F\u5DF2\u53D1\u9001");
            } else if (current.blank)
              this.changed("\u5148\u544A\u8BC9\u6211\u8981\u505A\u4EC0\u4E48");
            else {
              let accepted = await this.adapter.continueSession(current.sessionId);
              this.changed(accepted === !1 ? "\u7EE7\u7EED\u672A\u53D1\u9001 \xB7 \u5F53\u524D\u72B6\u6001\u5DF2\u53D8\u5316\uFF0C\u8BF7\u67E5\u770B DSH \u539F\u4F1A\u8BDD" : "\u5DF2\u53D1\u9001\u53EF\u89C1\u7684\u300C\u7EE7\u7EED\u300D");
            }
        } catch (error) {
          this.changed(error instanceof Error ? error.message : String(error));
        } finally {
          this.inFlight = !1;
        }
      }
    }
  }
  close() {
    this.panel = null, this.dual?.resetSender(), this.speech.cancel();
  }
};

// src/gestures.js
var PALM_POINTS = [0, 5, 9, 13, 17], FINGERS = [[5, 6, 7, 8], [9, 10, 11, 12], [13, 14, 15, 16], [17, 18, 19, 20]], CANNED = { Closed_Fist: "fist", Open_Palm: "palm", Thumb_Up: "thumb", Thumb_Down: "thumbDown", Pointing_Up: "1", Victory: "2" }, PICKER_DIGIT_MS = 300, LIST_TOGGLE_MS = 500, POSES = /* @__PURE__ */ new Set(["fist", "palm", "thumb", "thumbDown", "toggleSessions", "togglePeer", "1", "2", "3", "4", "5"]);
function pointIsValid(point) {
  return point != null && Number.isFinite(point.x) && Number.isFinite(point.y);
}
function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y, (a.z ?? 0) - (b.z ?? 0));
}
function isStraight(a, joint, b, minimumAngle = 150) {
  let u = [a.x - joint.x, a.y - joint.y, (a.z ?? 0) - (joint.z ?? 0)], v = [b.x - joint.x, b.y - joint.y, (b.z ?? 0) - (joint.z ?? 0)], product = Math.hypot(...u) * Math.hypot(...v);
  return product < 1e-10 ? !1 : (u[0] * v[0] + u[1] * v[1] + u[2] * v[2]) / product <= Math.cos(minimumAngle * Math.PI / 180);
}
function classifyHand(landmarks, category, score) {
  if (!Array.isArray(landmarks) || landmarks.length < 21 || !landmarks.slice(0, 21).every((point) => pointIsValid(point) && (point.z == null || Number.isFinite(point.z))))
    return { pose: "none", center: { x: 0.5, y: 0.5 } };
  let center = {
    x: 1 - PALM_POINTS.reduce((sum, index) => sum + landmarks[index].x, 0) / PALM_POINTS.length,
    y: PALM_POINTS.reduce((sum, index) => sum + landmarks[index].y, 0) / PALM_POINTS.length
  }, name = typeof category == "string" ? category : category?.categoryName, confidence = score ?? category?.score, scale = Math.max(distance(landmarks[0], landmarks[9]), distance(landmarks[5], landmarks[17]));
  if (scale < 1e-5) return { pose: "none", center };
  let fingers = FINGERS.map(([mcp, pip, dip, tip]) => isStraight(landmarks[mcp], landmarks[pip], landmarks[dip]) && isStraight(landmarks[pip], landmarks[dip], landmarks[tip]) && distance(landmarks[tip], landmarks[0]) > distance(landmarks[pip], landmarks[0]) + scale * 0.1), thumb = isStraight(landmarks[2], landmarks[3], landmarks[4]) && distance(landmarks[4], landmarks[0]) > distance(landmarks[3], landmarks[0]) + scale * 0.1 && distance(landmarks[4], landmarks[5]) > distance(landmarks[3], landmarks[5]) + scale * 0.1 && distance(landmarks[4], landmarks[17]) > distance(landmarks[3], landmarks[17]) + scale * 0.1, count = fingers.filter(Boolean).length + Number(thumb);
  if (thumb && fingers[3] && !fingers[1] && !fingers[2])
    return { pose: fingers[0] ? "toggleSessions" : "togglePeer", center };
  if (Object.hasOwn(CANNED, name) && Number.isFinite(confidence) && confidence >= 0.65)
    return { pose: CANNED[name], center };
  if (name === "ILoveYou" && Number.isFinite(confidence) && confidence >= 0.65)
    return { pose: count === 3 ? "uncertain" : "toggleSessions", center };
  let pose = "none";
  if (count === 0) pose = "fist";
  else if (count === 1 && thumb) {
    let dx = landmarks[4].x - landmarks[2].x, dy = landmarks[4].y - landmarks[2].y;
    Math.abs(dy) >= Math.max(scale * 0.18, Math.abs(dx) * 0.65) && (pose = dy < 0 ? "thumb" : "thumbDown");
  } else count === 1 && fingers[0] ? pose = "1" : count >= 2 && (pose = String(count));
  return { pose, center };
}
function normalizePose(pose) {
  return POSES.has(pose) ? pose === "5" ? "palm" : pose : "none";
}
function actionFor(pose) {
  return /^\d$/.test(pose) ? { type: "number", number: Number(pose) } : { type: pose };
}
function displacement(a, b) {
  let dx = b.x - a.x, dy = b.y - a.y;
  return { dx, dy, major: Math.max(Math.abs(dx), Math.abs(dy)), minor: Math.min(Math.abs(dx), Math.abs(dy)) };
}
var GestureGate = class {
  constructor({
    fistMs = 450,
    thumbMs = 650,
    numberMs = 650,
    palmMs = 160,
    releaseMs = 250,
    poseReleaseMs = 300,
    swipeDistance = 0.18,
    swipeDominance = 1.5,
    swipeMinMs = 120,
    swipeMaxMs = 700,
    stillDistance = 0.035
  } = {}) {
    this.options = {
      fistMs,
      thumbMs,
      numberMs,
      palmMs,
      releaseMs,
      poseReleaseMs,
      swipeDistance,
      swipeDominance,
      swipeMinMs,
      swipeMaxMs,
      stillDistance
    }, this.reset();
  }
  reset() {
    this._candidate = null, this._lock = null, this._release = null, this._lastTimestamp = null;
  }
  _newCandidate(pose, timestamp, contextKey, center, motionTimestamp = timestamp) {
    return {
      pose,
      contextKey,
      holdSince: timestamp,
      stillCenter: center,
      motion: center ? [{ ...center, timestamp: motionTimestamp }] : []
    };
  }
  _latch(pose, kind) {
    this._lock = { pose, kind, fistCanRelease: pose !== "fist" }, this._candidate = null, this._release = null;
  }
  _tryRelease(pose, timestamp, contextKey, center) {
    if (this._lock.kind === "swipe" && pose !== "none" && pose !== "fist" && (this._lock.fistCanRelease = !0), !(pose === "none" || (this._lock.kind === "swipe" ? pose === "fist" && this._lock.fistCanRelease || pose === "toggleSessions" || pose === "togglePeer" : pose !== this._lock.pose))) {
      this._release = null;
      return;
    }
    !this._release || this._release.pose !== pose ? this._release = { pose, timestamp, contextKey, invalid: !1 } : Object.is(this._release.contextKey, contextKey) || (this._release.invalid = !0);
    let duration = pose === "none" ? this.options.releaseMs : this.options.poseReleaseMs;
    if (timestamp - this._release.timestamp < duration) return;
    let released = this._release;
    if (this._lock = null, this._release = null, pose !== "none") {
      if (released.invalid) {
        this._latch(pose, "context");
        return;
      }
      this._candidate = this._newCandidate(pose, released.timestamp, released.contextKey, center, timestamp);
    }
  }
  _swipe(candidate, center, timestamp) {
    if (!center)
      return candidate.motion = [], candidate.stillCenter = null, null;
    let { swipeDistance, swipeDominance, swipeMinMs, swipeMaxMs } = this.options;
    candidate.motion = candidate.motion.filter((sample) => timestamp - sample.timestamp <= swipeMaxMs);
    let matches = (sample) => {
      let delta = displacement(sample, center);
      return delta.major > swipeDistance && delta.major >= delta.minor * swipeDominance;
    };
    if (candidate.motion.some((sample) => timestamp - sample.timestamp < swipeMinMs && matches(sample)))
      return candidate.motion = [{ ...center, timestamp }], null;
    for (let sample of candidate.motion) {
      if (timestamp - sample.timestamp < swipeMinMs || !matches(sample)) continue;
      let { dx, dy } = displacement(sample, center);
      return {
        type: "swipe",
        direction: Math.abs(dx) >= Math.abs(dy) ? dx > 0 ? "right" : "left" : dy > 0 ? "down" : "up"
      };
    }
    return candidate.motion.push({ ...center, timestamp }), candidate.motion.length > 256 && candidate.motion.splice(0, candidate.motion.length - 256), null;
  }
  update(observation, timestamp, contextKey, scene = "chat") {
    if (!Number.isFinite(timestamp) || this._lastTimestamp !== null && timestamp < this._lastTimestamp) return null;
    if (this._lastTimestamp = timestamp, observation?.pose === "uncertain")
      return this._candidate = null, this._release = null, null;
    let pose = normalizePose(observation?.pose), center = pointIsValid(observation?.center) ? { x: observation.center.x, y: observation.center.y } : null, pickerDigit = scene === "sessions" && (pose === "1" || pose === "2"), toggle = pose === "toggleSessions" || pose === "togglePeer";
    if (this._candidate && !Object.is(this._candidate.contextKey, contextKey) && this._latch(this._candidate.pose, "context"), this._lock && (this._tryRelease(pose, timestamp, contextKey, center), this._lock))
      return null;
    if (pose === "none")
      return this._candidate = null, null;
    (!this._candidate || this._candidate.pose !== pose) && (this._candidate = this._newCandidate(pose, timestamp, contextKey, center));
    let candidate = this._candidate, swipe = scene === "sessions" || toggle ? null : this._swipe(candidate, center, timestamp);
    if (swipe)
      return this._latch(pose, "swipe"), swipe;
    !pickerDigit && !toggle && center && candidate.stillCenter && displacement(candidate.stillCenter, center).major > this.options.stillDistance ? (candidate.holdSince = timestamp, candidate.stillCenter = center) : center && !candidate.stillCenter && (candidate.stillCenter = center);
    let duration = toggle ? LIST_TOGGLE_MS : pickerDigit ? PICKER_DIGIT_MS : pose === "fist" ? this.options.fistMs : pose === "thumb" || pose === "thumbDown" ? this.options.thumbMs : pose === "palm" && scene !== "question" ? this.options.palmMs : this.options.numberMs;
    return timestamp - candidate.holdSince < duration ? null : (this._latch(pose, "static"), actionFor(pose));
  }
};

// src/camera.js
var CameraPreview = class {
  constructor(controller, changed, observed) {
    this.controller = controller, this.changed = changed, this.observed = observed, this.gate = new GestureGate(), this.generation = 0, this.enabled = !1, this.visibilityEpoch = 0, this.awaitRelease = !1;
  }
  contextKey() {
    return `${this.controller.contextKey()}|visible:${this.visibilityEpoch}`;
  }
  suspend() {
    ++this.visibilityEpoch, this.awaitRelease = !0, this.noneSince = null;
  }
  acceptAfterVisibility(observation, timestamp) {
    return this.awaitRelease ? (observation.pose === "none" ? (this.noneSince ??= timestamp, timestamp - this.noneSince >= 250 && (this.awaitRelease = !1, this.gate.reset())) : this.noneSince = null, !1) : !0;
  }
  async start() {
    if (this.enabled) return;
    let generation = ++this.generation;
    this.enabled = !0, this.gate.reset(), this.awaitRelease = !1, this.changed("\u6B63\u5728\u5F00\u542F\u6444\u50CF\u5934 \xB7 \u9996\u6B21\u52A0\u8F7D\u672C\u5730\u624B\u52BF\u6A21\u578B");
    try {
      let stream = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 15, max: 20 } }, audio: !1 });
      if (generation !== this.generation) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      if (this.stream = stream, typeof ImageCapture == "function" ? this.capture = new ImageCapture(stream.getVideoTracks()[0]) : (this.source = document.createElement("video"), this.source.muted = !0, this.source.playsInline = !0, this.source.srcObject = stream, await this.source.play()), generation !== this.generation) return;
      let worker = new Worker("/dsh-gesture-control/assets/vision-worker.js", { type: "module" });
      this.worker = worker, worker.onerror = (e) => {
        generation === this.generation && this.fail(e.message || "\u624B\u52BF Worker \u542F\u52A8\u5931\u8D25");
      }, worker.onmessage = ({ data }) => {
        if (generation === this.generation) {
          if (data.type === "ready")
            this.ready = !0, this.changed("\u624B\u52BF\u5DF2\u5F00\u542F \xB7 \u5F53\u524D\u4E3A\u4EC5\u9884\u89C8\u6A21\u5F0F"), this.schedule();
          else if (data.type === "error") this.fail(data.error);
          else if (data.type === "result") {
            this.processing = !1;
            let currentContext = this.contextKey();
            if (this.frameContext !== currentContext || document.hidden) {
              this.schedule();
              return;
            }
            let observation = classifyHand(data.landmarks, data.category, data.score), scene = this.controller.scene(), event = this.acceptAfterVisibility(observation, data.timestamp) ? this.gate.update(observation, data.timestamp, currentContext, scene) : null;
            this.observed(observation, event), event && this.controller.dispatch(event, this.controller.contextKey()), this.schedule();
          }
        }
      }, worker.postMessage({ type: "init" });
    } catch (error) {
      generation === this.generation && this.fail(error.message || String(error));
    }
  }
  schedule() {
    clearTimeout(this.timer), this.enabled && this.ready && (this.timer = setTimeout(() => this.frame(), 90));
  }
  async frame() {
    if (!this.enabled || this.processing) return;
    if (document.hidden || this.source && this.source.readyState < 2) {
      this.schedule();
      return;
    }
    this.processing = !0;
    let generation = this.generation;
    try {
      let frameContext = this.contextKey(), bitmap = this.capture ? await this.capture.grabFrame() : await createImageBitmap(this.source);
      if (generation !== this.generation) {
        bitmap.close();
        return;
      }
      if (frameContext !== this.contextKey()) {
        bitmap.close(), this.processing = !1, this.schedule();
        return;
      }
      this.frameContext = frameContext, this.worker.postMessage({ type: "frame", bitmap, timestamp: performance.now() }, [bitmap]);
    } catch (error) {
      generation === this.generation && this.fail(error.message || String(error));
    }
  }
  fail(message) {
    this.stop(), this.controller.actions = !1, this.controller.close(), this.changed(`\u6444\u50CF\u5934/\u6A21\u578B\u672A\u5F00\u542F\uFF1A${message}\u3002\u68C0\u67E5 Desktop \u5A92\u4F53\u6743\u9650\u3001\u8BBE\u5907\u5360\u7528\u548C\u786C\u4EF6\u52A0\u901F\u540E\u70B9\u51FB\u91CD\u8BD5\u3002`);
  }
  stop() {
    ++this.generation, this.enabled = !1, this.ready = !1, this.processing = !1, clearTimeout(this.timer), this.stream?.getTracks().forEach((t) => t.stop()), this.stream = null, this.capture = null, this.source && (this.source.pause(), this.source.srcObject = null, this.source = null), this.worker?.postMessage({ type: "close" }), this.worker?.terminate(), this.worker = null, this.gate.reset();
  }
};

// src/dual-wire.js
var PREFIX = `DSH-GESTURE-LINK/1
`, uuid = (value) => typeof value == "string" && /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(value);
function binding(value) {
  let b = value?.binding, p = value?.peer;
  if (value?.protocol !== "agent-only-v1" || value.phase !== "running" || b?.status !== "confirmed" || b.bound !== !0 || b.localReady !== !0 || b.dispatchReady !== !0 || p?.paired !== !0 || p.localReady !== !0 || p.peerReady !== !0 || p.ready !== !0 || ![b.operationId, p.pairingId, p.deviceId, p.peerDeviceId].every(uuid) || !Number.isSafeInteger(p.authorityVersion))
    throw Error("\u8BF7\u5728\u5F53\u524D\u4F1A\u8BDD\u5B8C\u6210 Dual \u7ED1\u5B9A\uFF0C\u7B49\u4E24\u7AEF\u90FD\u663E\u793A\u53EF\u6536\u53D1");
  return { pair: p.pairingId, from: p.deviceId, to: p.peerDeviceId, bind: b.operationId, rev: p.authorityVersion };
}
var sameBinding = (a, b) => a && b && ["pair", "from", "to", "bind", "rev"].every((k) => a[k] === b[k]);
function validSignal(s) {
  if (!s || !["offer", "answer"].includes(s.type) || ![s.id, s.pair, s.from, s.to, s.bind].every(uuid) || s.type === "answer" && !uuid(s.forBind) || typeof s.sdp != "string" || s.sdp.length > 10500 || Object.keys(s).some((k) => !["type", "sdp", "id", "pair", "from", "to", "bind", ...s.type === "answer" ? ["forBind"] : []].includes(k))) return !1;
  let media = s.sdp.match(/^m=[^\r\n]+/gm);
  return media?.length === 1 && /^m=application \d+ UDP\/DTLS\/SCTP webrtc-datachannel$/.test(media[0]) && /^a=fingerprint:sha-256 [0-9A-F:]+\r?$/im.test(s.sdp);
}
var forPeer = (s, scope) => s.pair === scope.pair && s.from === scope.to && s.to === scope.from;
function parseSignal(row) {
  if (row?.direction !== "in" || row.type !== "message" || typeof row.payload?.text != "string" || !row.payload.text.startsWith(PREFIX)) return null;
  try {
    let s = JSON.parse(row.payload.text.slice(PREFIX.length));
    return validSignal(s) ? s : null;
  } catch {
    return null;
  }
}

// src/peer-gestures.js
var PeerDraft = class {
  constructor() {
    this.text = "", this.last = null, this.revision = 0;
  }
  edit(text) {
    this.text = text, this.last = null, this.revision++;
  }
  append(text) {
    let before = this.text;
    this.edit(before + (before && !/\s$/.test(before) ? `
` : "") + text.trim()), this.last = before;
  }
  undo() {
    return this.last === null ? !1 : (this.edit(this.last), !0);
  }
};
function peerScene(adapter, sessionId, picker) {
  if (picker) return { kind: "sessions", key: JSON.stringify([picker.items[picker.index]?.sessionId, picker.index]) };
  let c = adapter.current();
  return c?.sessionId === sessionId && c.question ? { kind: "question", key: JSON.stringify([c.question.key, c.question.id, c.question.index, c.question.highlight]) } : adapter._interactions(sessionId).length ? { kind: "blocked", key: "" } : { kind: "chat", key: adapter._status(sessionId)?.running ? "running" : "idle" };
}
async function actOnPeer(adapter, sessionId, pickerState, act, expected, guard, changed) {
  guard();
  let scene = peerScene(adapter, sessionId, pickerState.panel);
  if (expected?.kind !== scene.kind || expected?.key !== scene.key) throw Error("\u5BF9\u7AEF\u754C\u9762\u5DF2\u53D8\u5316\uFF0C\u8BF7\u91CD\u65B0\u505A\u624B\u52BF");
  if (act.type === "toggleSessions") {
    if (pickerState.panel) pickerState.panel = null;
    else {
      let items = adapter.listSessions();
      if (!items.length) throw Error("\u5BF9\u7AEF\u6CA1\u6709\u53EF\u9009\u4F1A\u8BDD");
      pickerState.panel = { items, index: Math.max(0, items.findIndex((i) => i.sessionId === adapter.current()?.sessionId)) };
    }
    return changed(), pickerState.panel ? "\u5BF9\u7AEF\u5DF2\u6253\u5F00\u4F1A\u8BDD\u5217\u8868" : "\u5BF9\u7AEF\u5DF2\u6536\u8D77\u4F1A\u8BDD\u5217\u8868";
  }
  if (scene.kind === "sessions") {
    let p = pickerState.panel;
    if (act.type === "fist")
      return pickerState.panel = null, changed(), await adapter.openSession(p.items[p.index].sessionId), "\u5BF9\u7AEF\u5DF2\u6253\u5F00\u9009\u4E2D\u4F1A\u8BDD";
    if (act.type !== "number" || ![1, 2].includes(act.number)) throw Error("\u5BF9\u7AEF\u5217\u8868\u8BF7\u7528 1\u30012 \u6216\u63E1\u62F3");
    return p.index = Math.max(0, Math.min(p.items.length - 1, p.index + (act.number === 1 ? -1 : 1))), changed(), "\u5BF9\u7AEF\u9AD8\u4EAE\uFF1A" + p.items[p.index].title;
  }
  if (scene.kind === "blocked") throw Error("\u8BF7\u5728\u5BF9\u7AEF DSH \u5904\u7406\u5F85\u786E\u8BA4\u4EA4\u4E92");
  if (scene.kind === "question") {
    let q = adapter.current().question, ok;
    if (act.type === "fist") ok = await adapter.confirmQuestion(q);
    else if (act.type === "number" && Number.isInteger(act.number) && act.number >= 1 && act.number <= 5) ok = await adapter.chooseNumber(act.number, q);
    else if (act.type === "swipe" && ["up", "down"].includes(act.direction)) ok = adapter.questionMove(act.direction === "up" ? -1 : 1, q);
    else throw Error("\u5BF9\u7AEF\u6B63\u5728\u7B49\u5F85\u7B54\u9898");
    if (ok === !1) throw Error("\u5BF9\u7AEF\u9898\u76EE\u5DF2\u53D8\u5316\u6216\u672A\u63A5\u7EB3\u64CD\u4F5C");
    return "\u5BF9\u7AEF\u5DF2\u5904\u7406\u7B54\u9898\u624B\u52BF";
  }
  if (!["fist", "continue", "text"].includes(act.type)) throw Error("\u5BF9\u7AEF\u5F53\u524D\u4E0D\u63A5\u53D7\u8FD9\u4E2A\u624B\u52BF");
  return adapter._using(sessionId, async ({ session }) => {
    if (guard(), peerScene(adapter, sessionId, null).kind !== "chat") throw Error("\u5BF9\u7AEF\u4F1A\u8BDD\u5DF2\u6709\u5F85\u786E\u8BA4\u4EA4\u4E92");
    let state = session.getSnapshot();
    if (act.type === "fist") {
      if (!(adapter._status(sessionId)?.running ?? state.running)) throw Error("\u5BF9\u7AEF\u5F53\u524D\u6CA1\u6709\u6267\u884C\u4E2D\u7684\u56DE\u5408");
      if (!(await session.cancel())?.ok) throw Error("\u5BF9\u7AEF\u672A\u63A5\u7EB3\u505C\u6B62\u8BF7\u6C42");
      return "\u5BF9\u7AEF\u5DF2\u63A5\u7EB3\u505C\u6B62\u8BF7\u6C42";
    }
    let text = act.type === "continue" ? "\u7EE7\u7EED" : act.text;
    if (typeof text != "string" || !text.trim() || text.length > 12e3) throw Error("\u5BF9\u7AEF\u6D88\u606F\u987B\u4E3A 1\u201312000 \u5B57");
    if (act.type === "continue" && state.blank) throw Error("\u5BF9\u7AEF\u662F\u7A7A\u767D\u4F1A\u8BDD\uFF0C\u8BF7\u5148\u53E3\u8FF0\u4EFB\u52A1");
    if (act.type === "continue" && (adapter._status(sessionId)?.running ?? state.running)) throw Error("\u5BF9\u7AEF\u56DE\u5408\u6B63\u5728\u8FDB\u884C");
    if (!(await session.prompt([{ type: "text", text }], "queue"))?.ok) throw Error("\u5BF9\u7AEF\u672A\u63A5\u7EB3\u6D88\u606F");
    return act.type === "text" ? "\u5BF9\u7AEF\u4F1A\u8BDD\u5DF2\u63A5\u7EB3\u6587\u5B57" : "\u5BF9\u7AEF\u5DF2\u63A5\u7EB3\u300C\u7EE7\u7EED\u300D";
  });
}

// src/dual-link.js
var sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)), fail = (message) => {
  throw Error(message);
}, send = (l, obj) => l.dc.send(JSON.stringify(obj));
async function localDescription(pc, type) {
  await pc.setLocalDescription(type === "offer" ? await pc.createOffer() : await pc.createAnswer());
  let end = Date.now() + 5500;
  for (; pc.iceGatheringState !== "complete" && pc.signalingState !== "closed" && Date.now() < end; ) await sleep(70);
  let sdp = pc.localDescription?.sdp;
  return (!sdp || !/^a=candidate:/m.test(sdp)) && fail("\u6CA1\u6709\u53EF\u7528\u7684\u5C40\u57DF\u7F51\u5730\u5740"), sdp;
}
async function checkCode(pc) {
  let fp = (d) => /^a=fingerprint:sha-256 ([\da-f:]+)\r?$/im.exec(d?.sdp || "")?.[1]?.toUpperCase(), keys = [fp(pc.localDescription), fp(pc.remoteDescription)];
  keys.some((k) => !k) && fail("\u65E0\u6CD5\u6838\u5BF9\u6570\u636E\u901A\u9053\u6307\u7EB9");
  let hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(keys.sort().join("|")));
  return Array.from(new Uint8Array(hash).slice(0, 4), (x) => x.toString(16).padStart(2, "0")).join("").toUpperCase();
}
var DualLink = class {
  constructor(connection, adapter, changed) {
    this.connection = connection, this.adapter = adapter, this.changed = changed, this.tx = this.rx = this.arm = null, this.remote = !1, this.panel = null, this.drafts = /* @__PURE__ */ new Map(), this.serial = 0, this.receiveSerial = 0;
  }
  draft() {
    let key = this.tx?.draftKey || !this.tx && this.lastDraftKey;
    return key ? (this.drafts.has(key) || this.drafts.set(key, new PeerDraft()), this.drafts.get(key)) : null;
  }
  async dual(action, sessionId, extra = {}) {
    (!this.connection?.isLoopback || this.connection.state.getSnapshot() !== "connected") && fail("\u8BF7\u4F7F\u7528\u672C\u673A DSH \u5DF2\u8FDE\u63A5\u7684\u684C\u9762\u7A97\u53E3");
    let r = await this.connection.rpc.call("/dualtransfer-rpc", "agent", { action, payload: { sessionId, ...extra } }, AbortSignal.timeout(6e3));
    return r?.ok !== !0 && fail(r?.error?.code || "Dual \u672A\u8FDE\u63A5"), r.value;
  }
  status(sid) {
    return this.dual("status", sid).then(binding);
  }
  async signal(l, type, sdp) {
    this.check(l), sameBinding(l.scope, await this.status(l.sid)) || fail("Dual \u7ED1\u5B9A\u5DF2\u53D8\u5316"), this.check(l);
    let { pair, from, to, bind } = l.scope, payload = { type, sdp, id: l.id, pair, from, to, bind, ...type === "answer" ? { forBind: l.peerBind } : {} };
    let result = await this.connection.rpc.call("/dsh-gesture-dual", "signal", payload, AbortSignal.timeout(11e3));
    result?.ok !== !0 && fail(result?.error?.message || "Dual \u672A\u63A5\u7EB3\u8FDE\u63A5\u6D88\u606F");
    result.value?.submitted !== !0 && fail("Dual \u672A\u63A5\u7EB3\u8FDE\u63A5\u6D88\u606F");
  }
  check(l) {
    (!l || this[l.role] !== l || this.connection.state.getSnapshot() !== "connected") && fail("\u624B\u52BF\u8FDE\u63A5\u5DF2\u5173\u95ED");
  }
  drop(l) {
    !l || this[l.role] !== l || (this[l.role] = null, clearTimeout(l.timer), clearInterval(l.heartbeat), l.unsubscribe?.(), l.dc?.close(), l.pc.close(), l.pending && (clearTimeout(l.pending.timer), l.pending.reject(Error("\u8FDE\u63A5\u5DF2\u65AD\u5F00\uFF0C\u6267\u884C\u7ED3\u679C\u672A\u786E\u8BA4"))), l.role === "rx" && (this.panel = null), this.changed());
  }
  async listen(on) {
    let serial = ++this.receiveSerial;
    if (this.arm = null, this.drop(this.rx), this.changed(), !on) return;
    let sid = this.adapter.current()?.sessionId, v = await this.dual("history", sid, { limit: 1, beforeSeq: null }), scope = binding(v);
    if (v.history?.available || fail("Dual \u5F53\u524D\u4F1A\u8BDD\u5386\u53F2\u4E0D\u53EF\u7528"), serial !== this.receiveSerial) return;
    let arm = this.arm = { sid, scope, epoch: v.history.epoch, cursor: v.history.globalTail };
    this.changed("\u5DF2\u7B49\u5019\u5BF9\u7AEF\u8FDE\u63A5 \xB7 \u63A5\u6536\u7AEF\u65E0\u9700\u5F00\u542F\u6444\u50CF\u5934"), this.watch(arm);
  }
  async watch(w) {
    let alive = () => this.arm === w || this.tx === w;
    try {
      for (; alive(); ) {
        if (!(w === this.arm && this.rx) && !(w === this.tx && w.pc.remoteDescription)) {
          let beforeSeq = null, newest, rows = [];
          do {
            let v = await this.dual("history", w.sid, { beforeSeq, limit: 25 });
            if (!alive()) return;
            (!sameBinding(w.scope, binding(v)) || !v.history?.available || v.history.epoch !== w.epoch) && fail("Dual \u5DF2\u65AD\u7EBF\u6216\u7ED1\u5B9A\u5DF2\u53D8\u5316\uFF0C\u8BF7\u91CD\u65B0\u8FDE\u63A5");
            let h2 = v.history;
            newest ??= h2.globalTail, rows.push(...h2.items.filter((row) => row.seq > w.cursor && row.seq <= newest)), beforeSeq = h2.hasMore && h2.items.at(-1)?.seq > w.cursor ? h2.nextBeforeSeq : null;
          } while (beforeSeq);
          w.cursor = newest;
          for (let row of rows.reverse()) {
            let s = parseSignal(row);
            !alive() || !s || !forPeer(s, w.scope) || row.expiresAt <= Date.now() || (w === this.arm && s.type === "offer" && !this.rx ? await this.answer(w, s) : w === this.tx && s.type === "answer" && s.id === w.id && s.forBind === w.scope.bind && !w.pc.remoteDescription && (w.peerBind = s.bind, w.draftKey = JSON.stringify([w.sid, w.scope.pair, w.scope.bind, s.bind]), this.lastDraftKey = w.draftKey, await w.pc.setRemoteDescription({ type: "answer", sdp: s.sdp })));
          }
        }
        if (w === this.tx && w.pc.remoteDescription) return;
        await sleep(w === this.arm ? 2400 : 950);
      }
    } catch (e) {
      if (!alive()) return;
      this.arm === w ? (this.arm = null, this.drop(this.rx)) : this.drop(w), this.changed(e.message);
    }
  }
  create(role, sid, scope, id) {
    let pc = new RTCPeerConnection({ iceServers: [] }), l = { role, sid, scope, id, pc, ready: !1, scene: null, results: /* @__PURE__ */ new Map() };
    this[role] = l;
    let lost = (msg) => {
      this[role] === l && (this.drop(l), this.changed(msg));
    };
    return l.timer = setTimeout(() => lost("\u5BF9\u7AEF\u672A\u786E\u8BA4\u8FDE\u63A5 \xB7 \u68C0\u67E5\u63A5\u6536\u5F00\u5173\u4E0E\u6821\u9A8C\u7801\u540E\u91CD\u8FDE"), 55e3), pc.onconnectionstatechange = () => {
      ["failed", "closed", "disconnected"].includes(pc.connectionState) && lost("\u5BF9\u7AEF\u6570\u636E\u901A\u9053\u5DF2\u65AD\u5F00");
    }, l;
  }
  async toggle() {
    if (this.remote) {
      ++this.serial, this.remote = !1, this.tx?.ready || this.drop(this.tx), this.changed("\u5DF2\u5207\u56DE\u672C\u673A");
      return;
    }
    this.remote = !0;
    let sid = this.adapter.current()?.sessionId, serial = ++this.serial;
    if (this.tx?.ready && this.tx.sid === sid) {
      this.changed("\u5DF2\u5207\u81F3\u5BF9\u7AEF");
      return;
    }
    this.drop(this.tx), this.changed("\u6B63\u5728\u8FDE\u63A5\u5BF9\u7AEF \xB7 \u518D\u6BD4 6 \u53EF\u5207\u56DE\u672C\u673A");
    try {
      let v = await this.dual("history", sid, { limit: 1, beforeSeq: null }), scope = binding(v);
      if (serial !== this.serial) return;
      v.history?.available || fail("\u8BF7\u5148\u5F00\u542F Dual \u5E76\u7ED1\u5B9A\u5F53\u524D\u4F1A\u8BDD");
      let l = this.create("tx", sid, scope, crypto.randomUUID());
      l.epoch = v.history.epoch, l.cursor = v.history.globalTail, this.attach(l, l.pc.createDataChannel("dsh-gesture/1")), await this.signal(l, "offer", await localDescription(l.pc, "offer")), this.check(l), this.watch(l);
    } catch (e) {
      serial === this.serial && (this.drop(this.tx), this.changed(e.message + " \xB7 \u6BD4 6 \u5207\u56DE\u672C\u673A"));
    }
  }
  async answer(arm, s) {
    let l = this.create("rx", arm.sid, arm.scope, s.id);
    l.peerBind = s.bind, arm.results ??= /* @__PURE__ */ new Map(), l.results = arm.results;
    try {
      l.pc.ondatachannel = (e) => {
        e.channel.label !== "dsh-gesture/1" || l.dc ? e.channel.close() : this.attach(l, e.channel);
      }, await l.pc.setRemoteDescription({ type: "offer", sdp: s.sdp }), await this.signal(l, "answer", await localDescription(l.pc, "answer"));
    } catch (e) {
      throw this.drop(l), e;
    }
  }
  attach(l, dc) {
    l.dc = dc, dc.onclose = () => this.drop(l), dc.onopen = async () => {
      try {
        let code = await checkCode(l.pc);
        this.check(l), l.code = code, this.changed("\u624B\u52BF\u8FDE\u63A5\u6821\u9A8C\u7801 " + code + " \xB7 \u8BF7\u5728\u63A5\u6536\u7AEF\u6838\u5BF9\u5E76\u5141\u8BB8");
        let checking = !1;
        l.heartbeat = setInterval(async () => {
          if (!checking) {
            checking = !0;
            try {
              sameBinding(l.scope, await this.status(l.sid)) || fail("Dual \u7ED1\u5B9A\u5DF2\u53D8\u5316"), this.check(l), l.role === "rx" && l.ready && this.updateScene(l);
            } catch (e) {
              this[l.role] === l && (this.drop(l), this.changed(e.message));
            } finally {
              checking = !1;
            }
          }
        }, 12e3);
      } catch {
        this.drop(l);
      }
    }, dc.onmessage = ({ data }) => {
      if (this[l.role] !== l || typeof data != "string" || data.length > 8e4) return;
      let m;
      try {
        m = JSON.parse(data);
      } catch {
        return;
      }
      if (!(!m || typeof m != "object")) {
        if (l.role === "rx") {
          m.type === "action" && l.ready && uuid(m.id) && this.execute(l, m);
          return;
        }
        if (m.type === "scene" && ["chat", "blocked", "question", "sessions"].includes(m.scene?.kind) && typeof m.scene.key == "string") {
          clearTimeout(l.timer), l.scene = m.scene, l.ready = !0, this.changed();
          return;
        }
        if (m.type === "result" && l.pending?.id === m.id) {
          let p = l.pending;
          l.pending = null, clearTimeout(p.timer), m.ok === !0 ? p.resolve(String(m.message)) : p.reject(Error(String(m.message)));
        }
      }
    };
  }
  approve() {
    let l = this.rx;
    this.check(l), (!l.code || l.dc.readyState !== "open") && fail("\u8FDE\u63A5\u5C1A\u672A\u5C31\u7EEA"), clearTimeout(l.timer), l.ready = !0, this.updateScene(l), l.unsubscribe = this.adapter.subscribe(() => {
      this.rx === l && l.dc.readyState === "open" && this.updateScene(l);
    }), this.changed("\u5DF2\u5141\u8BB8\u672C\u6B21\u8FDE\u63A5\u63A7\u5236 Dual \u7ED1\u5B9A\u7684\u4F1A\u8BDD");
  }
  updateScene(l) {
    let scene = peerScene(this.adapter, l.sid, this.panel);
    (!l.scene || l.scene.kind !== scene.kind || l.scene.key !== scene.key) && (l.scene = scene, send(l, { type: "scene", scene }));
  }
  async execute(l, m) {
    if (l.results.has(m.id)) {
      let old = l.results.get(m.id);
      old && send(l, old);
      return;
    }
    if (l.acting) {
      send(l, { type: "result", id: m.id, ok: !1, message: "\u5BF9\u7AEF\u6B63\u5728\u5904\u7406\u4E0A\u4E00\u4E2A\u624B\u52BF" });
      return;
    }
    l.acting = !0, l.results.set(m.id, null);
    let result;
    try {
      sameBinding(l.scope, await this.status(l.sid)) || fail("Dual \u7ED1\u5B9A\u5DF2\u53D8\u5316");
      let guard = () => {
        this.check(l), (!l.ready || this.arm?.sid !== l.sid) && fail("\u63A5\u6536\u5DF2\u5173\u95ED");
      };
      guard();
      let message = await actOnPeer(this.adapter, l.sid, this, m.act, m.scene, guard, () => this.changed());
      result = { type: "result", id: m.id, ok: !0, message };
    } catch (e) {
      result = { type: "result", id: m.id, ok: !1, message: e.message };
    } finally {
      l.acting = !1;
    }
    l.results.set(m.id, result), l.results.size > 128 && l.results.delete(l.results.keys().next().value), !(this.rx !== l || l.dc.readyState !== "open") && (this.updateScene(l), send(l, result));
  }
  async command(act, id = crypto.randomUUID()) {
    let l = this.tx;
    (!this.remote || !l?.ready || this.adapter.current()?.sessionId !== l.sid) && fail("\u5BF9\u7AEF\u672A\u5C31\u7EEA\uFF0C\u6216\u5DF2\u79BB\u5F00\u53D1\u8D77\u4F1A\u8BDD"), l.pending && fail("\u6B63\u5728\u7B49\u5019\u4E0A\u4E00\u6761\u6307\u4EE4\u7684\u7ED3\u679C");
    let scene = l.scene, serial = this.serial;
    return sameBinding(l.scope, await this.status(l.sid)) || (this.drop(l), fail("Dual \u7ED1\u5B9A\u5DF2\u53D8\u5316")), this.check(l), (!this.remote || this.serial !== serial || this.adapter.current()?.sessionId !== l.sid) && fail("\u76EE\u6807\u5DF2\u5207\u6362"), (scene?.kind !== l.scene?.kind || scene?.key !== l.scene?.key) && fail("\u5BF9\u7AEF\u573A\u666F\u5DF2\u53D8\u5316\uFF0C\u8BF7\u91CD\u65B0\u505A\u624B\u52BF"), new Promise((resolve, reject) => {
      let timer = setTimeout(() => {
        l.pending = null, reject(Error("\u5BF9\u7AEF\u6267\u884C\u7ED3\u679C\u672A\u786E\u8BA4"));
      }, 6500);
      l.pending = { id, resolve, reject, timer };
      try {
        send(l, { type: "action", id, act, scene });
      } catch (e) {
        clearTimeout(timer), l.pending = null, reject(e);
      }
    });
  }
  resetSender() {
    ++this.serial, this.remote = !1, this.drop(this.tx);
  }
  close() {
    ++this.receiveSerial, this.arm = null, this.drop(this.rx), this.resetSender();
  }
};

// src/panel-view.js
// Presentation state only: never starts/stops devices or changes gesture routing.
var OverlayViewState = class {
  constructor() { this.expanded = !1; this.minimized = !1; this.section = "control"; }
  toggle() { this.minimized = !1; this.expanded = !this.expanded; }
  collapse() { this.expanded = !1; }
  minimize() { this.expanded = !1; this.minimized = !0; }
  restore() { this.minimized = !1; this.expanded = !0; }
  select(section) {
    if (!["control", "guide"].includes(section)) return !1;
    return this.section = section, this.expanded = !0, this.minimized = !1, !0;
  }
  get previewVisible() { return this.expanded && !this.minimized && this.section === "control"; }
};
var panelTextEntries = {
  control: ["控制", "Controls"],
  guide: ["使用说明", "Gesture guide"],
  sections: ["手势控制栏目", "Gesture Control sections"],
  minimize: ["最小化小窗", "Minimize panel"],
  minimizeHint: ["隐藏状态条和小窗，仅保留右侧恢复按钮；识别与双机接收状态保持不变", "Hide the panel and status strips, keeping only an edge restore button. Recognition and peer reception keep their current state."],
  restore: ["恢复手势控制小窗", "Restore Gesture Control panel"],
  restoreHint: ["点击恢复。最小化仅隐藏界面，识别和已允许的双机接收保持原状态。", "Restore the panel. Minimizing hides the UI only; recognition and approved peer reception keep their current state."],
  collapse: ["收起控制栏", "Collapse panel"],
  guideIntro: ["同一个手势会随场景改变作用。先开启手势，再勾选“接入 DSH 动作”；仅预览时只显示识别结果，不执行下列动作。", "A gesture's action depends on the scene. Start recognition and enable DSH actions first. Preview-only mode displays recognition results without executing these actions."],
  guideRelease: ["每次触发后先放下手，再做下一次。🤟 和 🤙 稳住约半秒。1、2 在会话列表中较快触发，其余数字需稳住；3 建议伸食指、中指、无名指，避免与 🤟 混淆。", "Lower your hand between actions. Hold 🤟 and 🤙 for about half a second. Digits 1 and 2 trigger faster in the session picker; hold other digits steady. For 3, use index, middle and ring fingers to avoid 🤟."],
  guidePriority: ["录音中只有握拳结束录音，🤙 仍可切换目标，其余手势暂不处理。麦克风准备、转写和整理标点时请等待，🤙 仍可切换；正在处理的口述始终写回开始时的会话或独立对端草稿，不随切换改投。", "While recording, a fist ends recording and 🤙 can still change the target; other gestures are ignored. Wait during microphone setup, transcription and punctuation cleanup; 🤙 remains available. Dictation stays bound to its original session or peer draft."],
  sceneChat: ["普通会话", "Chat"],
  sceneList: ["会话列表", "Session picker"],
  sceneQuestion: ["普通选择题", "Ordinary question"],
  sceneVoice: ["语音处理", "Speech"],
  scenePeer: ["双机目标", "Peer target"],
  sceneOther: ["其他场景", "Other scenes"],
  fistTitle: ["✊ 握拳", "✊ Fist"],
  fistChat: ["没有录音且任务正在运行：请求停止本轮；任务空闲时不发送消息。若有待审批交互，请使用 DSH 原面板。", "Without recording, request cancellation of a running turn. An idle fist sends nothing. Handle pending approvals in the native DSH panel."],
  fistList: ["进入当前高亮的会话，并收起会话列表。", "Open the highlighted session and close the picker."],
  fistQuestion: ["确认单选；多选有滑动高亮时先切换该项勾选，再放下手并握拳提交。直接用数字勾选后可握拳提交。沿用 DSH 原题目的下一题/提交行为。", "Confirm a single choice. In multi-select, a highlighted option is toggled first; lower your hand and make another fist to submit. After selecting with digits, use a fist to submit. Native DSH question navigation is preserved."],
  fistVoice: ["录音中：结束录音，随后转写并自动整理标点，不立即发送。麦克风准备、转写或整理标点时握拳不取消处理。", "End active recording, then transcribe and automatically clean up punctuation; this does not send the draft. A fist does not cancel microphone setup, transcription or cleanup."],
  fistPeer: ["无本地录音时，按对端场景进入会话、确认题目或停止对端运行轮次；对端审批仍在原面板处理。", "Without local recording, open a session, confirm a question or cancel a running peer turn according to the peer scene. Handle peer approvals in its native panel."],
  palmTitle: ["🖐 张掌 / 数字 5", "🖐 Open palm / 5"],
  palmChat: ["开始口述；任务运行中也可录音。此后握拳只结束这次录音，不同时停止原任务。可连续口述多段。", "Start dictation, including while a turn is running. A subsequent fist ends that recording instead of also cancelling the turn. More dictation can be appended later."],
  palmList: ["不移动列表，也不开始录音。", "Does not move the picker or start recording."],
  palmQuestion: ["表示第 5 个选项，不开始录音；选项少于 5 个时不选取。单选沿用原题确认，多选切换勾选。", "Select option 5 rather than record; do nothing if fewer than five options exist. Single-choice follows native confirmation; multi-choice toggles the checkbox."],
  palmPeer: ["对端普通聊天时，在发送机录音并写入独立对端草稿；对端处于题目时表示选项 5，处于列表时无动作。", "For peer chat, record on the sender into its separate peer draft. For a peer question, select option 5. In a peer picker, do nothing."],
  thumbTitle: ["👍 拇指向上", "👍 Thumb up"],
  thumbChat: ["任务空闲且有文字草稿：提交草稿。没有文字且不是空白会话：发送可见的“继续”。空白会话先口述内容；任务运行中不发送。", "When idle, submit a nonempty text draft. With no text in a nonblank session, send a visible Continue message. Dictate first in a blank session. Do not send while a local turn is running."],
  thumbOther: ["会话列表和题目里不确认、不进入；这些场景用握拳。录音、转写及整理标点时也不发送。", "Does not enter sessions or confirm questions; use a fist there. Does not send while recording, transcribing or cleaning up punctuation."],
  thumbPeer: ["对端为普通聊天且独立草稿有文字：提交给 Dual 绑定会话，即使对端正在运行也会排队。空草稿的“继续”只在对端非空白且空闲时接纳。对端题目、列表或审批时不发送文字。", "For peer chat, submit the separate peer draft to the Dual-bound session; a running peer turn can queue it. An empty draft requests Continue only for an idle, nonblank peer session. Do not send text into peer questions, pickers or approvals."],
  downTitle: ["👎 拇指向下", "👎 Thumb down"],
  downChat: ["撤销最后一段仍完整保留的口述文字，保留原草稿；不是撤销任务、清空输入框或删除历史。若手动改过该段，撤销标记会失效。", "Undo the last intact dictation segment while preserving the original draft. This is not task undo, input clearing or history deletion. Editing that segment invalidates its undo marker."],
  downOther: ["本机会话列表、题目和审批中无撤销动作；语音正在处理时请等待。", "No local undo action in pickers, questions or approvals. Wait while speech is being processed."],
  downPeer: ["连接就绪且没有语音处理时，撤销发送机独立对端草稿的最后一段完整口述；对端是聊天、题目、列表或审批都可撤销这份草稿，不撤销对端已提交消息。手改草稿会清除撤销标记。", "With a ready connection and no speech processing, undo the last intact dictation in the sender's separate peer draft, regardless of the peer scene. This does not undo submitted peer messages. Manual draft edits clear its undo marker."],
  oneTitle: ["☝ 数字 1 · 食指", "☝ Digit 1 · index finger"],
  oneList: ["高亮上一条会话，到第一条后停住，不循环。", "Highlight the previous session; stop at the first entry without wrapping."],
  oneQuestion: ["选择第 1 项；单选按原题确认，多选切换勾选。", "Select option 1; follow native single-choice confirmation or toggle a multi-choice checkbox."],
  twoTitle: ["✌ 数字 2 · 食指和中指", "✌ Digit 2 · index and middle fingers"],
  twoList: ["高亮下一条会话，到最后一条后停住，不循环。", "Highlight the next session; stop at the last entry without wrapping."],
  twoQuestion: ["选择第 2 项；没有第 2 项时不选取。", "Select option 2; do nothing if it does not exist."],
  threeTitle: ["数字 3 · 食指、中指、无名指", "Digit 3 · index, middle and ring fingers"],
  threeQuestion: ["选择第 3 项；没有第 3 项时不选取。", "Select option 3; do nothing if it does not exist."],
  fourTitle: ["数字 4 · 四根手指", "Digit 4 · four fingers"],
  fourQuestion: ["选择第 4 项；没有第 4 项时不选取。", "Select option 4; do nothing if it does not exist."],
  digitsOther: ["普通聊天不输入数字、不滚动页面，也不发送；会话列表只使用 1 和 2。录音和转写中请等待。", "In chat, do not type digits, scroll or send. Only 1 and 2 are used in the session picker. Wait while recording or transcribing."],
  digitsPeer: ["作用取决于对端场景：列表用 1/2 上下移动，题目用 1–5 选择；对端普通聊天没有数字动作。", "Use the peer scene: 1/2 navigate its picker, 1–5 select question options, and digits do nothing in peer chat."],
  listTitle: ["🤟 拇指、食指、小指 · 会话列表", "🤟 Thumb, index and little fingers · picker"],
  listAction: ["打开或收起会话列表，再用 1 上移、2 下移、握拳进入。普通题目和待审批时也可打开列表，但录音、转写、整理标点时暂不处理此手势。", "Toggle the picker, then use 1/2 to navigate and a fist to enter. It also works from questions and pending approvals, but is ignored while speech is busy."],
  listPeer: ["目标为对端时，开关的是对端会话列表，不是发送机本地列表；受 Dual 当前绑定与接收允许范围约束。", "With a peer target, toggle its picker rather than the sender's local picker, within the current Dual binding and reception permission."],
  targetTitle: ["🤙 拇指、小指 · 数字 6 · 切换目标", "🤙 Thumb and little finger · 6 · target"],
  targetAction: ["切换本机 / 对端指令目标，含录音、转写、题目、列表与审批场景；它不选择第 6 个题目选项，也不自动转交已开始的口述。", "Toggle local/peer routing, including during speech, questions, pickers and approvals. This is not option 6 and does not retarget dictation already in progress."],
  targetPeer: ["首次连接须两端已安装 Dual、完成配对并绑定会话；接收端勾选允许连接，核对相同的 8 位校验码后明确允许。未就绪时不执行对端指令；接收端无需摄像头。对端列表只浏览，不重新绑定 Dual；停止、文字和“继续”始终发往原绑定会话。", "Both devices need Dual, pairing and a session binding. The receiver enables reception, checks the matching eight-digit code and explicitly approves. No peer commands run before readiness. The receiver needs no camera. Browsing the peer picker does not rebind Dual: cancellation, text and Continue still target its original bound session."],
  verticalTitle: ["↑ / ↓ 手在画面中上下滑动", "↑ / ↓ Vertical hand swipe"],
  verticalQuestion: ["只在普通选择题中循环移动选项高亮，握拳选择或提交；超过 5 个选项也可这样浏览。滑动本身不勾选、不提交。", "Cycle the highlight in ordinary questions, then use a fist to select or submit. This also reaches options beyond 5. Swiping alone neither checks nor submits."],
  verticalOther: ["普通聊天不滚动对话；会话列表也不用滑动，请用 1/2。语音忙碌时不处理。对端遵循同样的题目规则。", "Does not scroll chat or move a session picker; use 1/2 in pickers. Ignored while speech is busy. Peer questions follow the same rule."],
  horizontalTitle: ["← / → 手在画面中左右滑动", "← / → Horizontal hand swipe"],
  horizontalAction: ["目前没有绑定动作：不翻页、不切会话、不切目标，也不提交。切会话用 🤟 后配合 1/2/握拳，切目标用 🤙。", "No action is currently assigned: no paging, session switching, target switching or submission. Use 🤟 then 1/2/fist for sessions, and 🤙 for the target."],
  interactionTitle: ["待审批、窗口隐藏与停止", "Approvals, hiding and stopping"],
  interactionApproval: ["审批、复核等交互请在 DSH 原面板处理；手势不代替同意或拒绝。普通选择题才支持上述选项动作。🤟 和 🤙 仍可切场景；双机 👎 只撤销独立草稿。", "Handle approvals and reviews in the native DSH panel. Gestures do not approve or reject them. The option gestures above apply to ordinary questions. 🤟 and 🤙 can still change scenes; peer 👎 only undoes its separate draft."],
  interactionMinimize: ["收起控制栏、切到说明栏或最小化插件小窗，都只改变显示，识别和已允许的接收保持原状态。最小化后右侧 ✋ 按钮可恢复；若原先打开了会话列表，1/2/握拳仍操作该列表，恢复后可查看高亮。页面重载后小窗恢复默认位置与收起状态。", "Collapsing, viewing this guide or minimizing the plugin changes presentation only. Recognition and approved reception retain their state. Restore with the edge ✋ button. An open picker remains active for 1/2/fist; restore to see its selection. Reload resets panel placement and presentation."],
  interactionWindow: ["宿主窗口切后台、最小化或页面隐藏时，本地摄像头手势暂停；正在录音会结束并继续转写/整理标点，摄像头轨道仍保留。恢复后先放下手再做手势。已允许的对端接收不因此关闭。", "When the host page is hidden or minimized, local camera gestures pause. Active recording ends and continues through transcription/cleanup; camera tracks stay retained. Lower your hand after returning. Approved peer reception is not closed by page visibility alone."],
  interactionStop: ["“停止识别并释放设备”会停止本地相机、取消本地口述处理并重置发送目标，保留原草稿。若还要关闭对端接收，请取消“允许配对设备连接当前 Dual 会话”；只取消“接入 DSH 动作”也不会取消口述或接收。", "Stop recognition and release devices stops the local camera, cancels local dictation and resets sender routing while preserving the original draft. Disable the reception checkbox separately to stop peer reception. Turning off DSH actions alone cancels neither dictation nor reception."],
  speechTitle: ["语音准备与数据去向", "Speech setup and data flow"],
  speechPrivacy: ["录音交给 DSH 当前所选语音提供方；配置本地 SenseVoice 时音频本机处理，选择云端时发送给该服务。握拳结束后，文字自动交给默认模型整理标点，远程模型会收到文本，此时尚未按 👍 提交；失败时保留原转写。", "Audio goes to the speech provider selected in DSH: local SenseVoice processes it locally; cloud providers receive the audio. After a fist ends recording, text is automatically sent to the default model for punctuation cleanup before 👍 submission. A remote model receives that text. On cleanup failure, the original transcription is retained."],
  prepareSpeech: ["准备语音模型", "Prepare speech model"],
  prepareMicrophone: ["预先确认麦克风权限", "Check microphone permission"],
  mediaPrivacy: ["手势模型和 WASM 随包提供，视频本地推理；摄像头/麦克风权限由 Desktop 与操作系统管理。", "The gesture model and WASM are bundled and video inference runs locally. Desktop and the operating system manage camera/microphone permissions."],
  guideTarget: ["当前本机会话", "Current local session"],
  noSession: ["未打开会话", "No open session"]
};
var panelMessages = Object.fromEntries(["zh", "en"].map((language, index) => [language, Object.fromEntries(Object.entries(panelTextEntries).map(([key, values]) => [key, values[index]]))]));
var gestureGuide = [
  ["fist", "fistTitle", [["sceneChat", "fistChat"], ["sceneList", "fistList"], ["sceneQuestion", "fistQuestion"], ["sceneVoice", "fistVoice"], ["scenePeer", "fistPeer"]]],
  ["palm", "palmTitle", [["sceneChat", "palmChat"], ["sceneList", "palmList"], ["sceneQuestion", "palmQuestion"], ["scenePeer", "palmPeer"]]],
  ["thumb", "thumbTitle", [["sceneChat", "thumbChat"], ["sceneOther", "thumbOther"], ["scenePeer", "thumbPeer"]]],
  ["thumbDown", "downTitle", [["sceneChat", "downChat"], ["sceneOther", "downOther"], ["scenePeer", "downPeer"]]],
  ["1", "oneTitle", [["sceneList", "oneList"], ["sceneQuestion", "oneQuestion"], ["sceneOther", "digitsOther"], ["scenePeer", "digitsPeer"]]],
  ["2", "twoTitle", [["sceneList", "twoList"], ["sceneQuestion", "twoQuestion"], ["sceneOther", "digitsOther"], ["scenePeer", "digitsPeer"]]],
  ["3", "threeTitle", [["sceneQuestion", "threeQuestion"], ["sceneOther", "digitsOther"], ["scenePeer", "digitsPeer"]]],
  ["4", "fourTitle", [["sceneQuestion", "fourQuestion"], ["sceneOther", "digitsOther"], ["scenePeer", "digitsPeer"]]],
  ["toggleSessions", "listTitle", [["sceneOther", "listAction"], ["scenePeer", "listPeer"]]],
  ["togglePeer", "targetTitle", [["sceneOther", "targetAction"], ["scenePeer", "targetPeer"]]],
  ["swipeVertical", "verticalTitle", [["sceneQuestion", "verticalQuestion"], ["sceneOther", "verticalOther"]]],
  ["swipeHorizontal", "horizontalTitle", [["sceneOther", "horizontalAction"]]]
];
function renderGestureGuide(t) {
  return h("div", { className: "dsh-gc-guide", "data-gesture-guide": "scenes" },
    h("p", null, t("guideIntro")), h("p", null, t("guideRelease")),
    h("p", { className: "dsh-gc-status" }, t("guidePriority")),
    ...gestureGuide.map(([id, title, rows]) => h("section", { key: id, className: "dsh-gc-guide-item", "data-guide-gesture": id },
      h("h3", null, t(title)),
      h("dl", null, rows.map(([scene, text]) => h("div", { key: scene }, h("dt", null, t(scene)), h("dd", null, t(text)))))
    )),
    h("section", { className: "dsh-gc-guide-item" }, h("h3", null, t("interactionTitle")),
      h("p", null, t("interactionApproval")), h("p", null, t("interactionMinimize")),
      h("p", null, t("interactionWindow")), h("p", null, t("interactionStop"))),
    h("section", { className: "dsh-gc-guide-item" }, h("h3", null, t("speechTitle")),
      h("p", null, t("speechPrivacy")), h("p", null, t("mediaPrivacy")))
  );
}

// src/client.js
var inject = ["slots", "sessions", "uiSession", "uiWorkspace", "conversation", "workspaces", "connection"], h = import_react.default.createElement;
var poseNames = { togglePeer: "\u{1F919} 6 \xB7 \u5207\u6362\u6307\u4EE4\u76EE\u6807", none: "\u7B49\u5F85\u624B\u52BF", uncertain: "\u8BF7\u7A33\u4F4F\u624B\u5F62", fist: "\u63E1\u62F3", palm: "\u5F20\u638C", thumb: "\u62C7\u6307\u5411\u4E0A", thumbDown: "\u62C7\u6307\u5411\u4E0B", toggleSessions: "\u{1F91F} \u4F1A\u8BDD\u5217\u8868", 5: "\u5F20\u638C / 5" }, css = `
.dsh-gc{--dsh-gc-top:108px;position:fixed;right:18px;top:var(--dsh-gc-top);z-index:900;display:flex;flex-direction:column;align-items:flex-end;max-height:calc(100vh - var(--dsh-gc-top) - 12px);max-height:calc(100dvh - var(--dsh-gc-top) - 12px);max-width:calc(100vw - 36px);pointer-events:none;font:13px/1.5 system-ui,sans-serif;color:var(--dsw-alias-label-primary)}
.dsh-gc>.dsh-gc-toolbar,.dsh-gc>.dsh-gc-live,.dsh-gc>.dsh-gc-toast,.dsh-gc>button{flex-shrink:0}
.dsh-gc button{font:inherit;cursor:pointer;border:1px solid var(--dsw-alias-border-l1);border-radius:9px;padding:6px 10px;background:var(--dsw-alias-bg-layer-2);color:inherit}.dsh-gc button:disabled{opacity:.5;cursor:default}.dsh-gc button:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:2px}
.dsh-gc-toolbar{display:flex;gap:5px;align-items:center;pointer-events:auto}.dsh-gc>button,.dsh-gc-card,.dsh-gc-picker{pointer-events:auto}.dsh-gc-toolbar .dsh-gc-minimize{padding:6px 9px}
.dsh-gc-card,.dsh-gc-picker{box-sizing:border-box;max-width:100%}.dsh-gc-card{margin-top:7px;width:310px;flex:0 1 auto;min-height:0;max-height:max(72px,calc(100vh - var(--dsh-gc-top) - 92px));max-height:max(72px,calc(100dvh - var(--dsh-gc-top) - 92px));overflow:auto;border:1px solid var(--dsw-alias-border-l1);border-radius:14px;background:var(--dsw-alias-bg-overlay);padding:14px;box-shadow:0 8px 32px color-mix(in srgb,var(--dsw-alias-label-primary) 18%,transparent)}
.dsh-gc-card p{margin:7px 0}.dsh-gc-row{display:flex;align-items:center;gap:8px;flex-wrap:wrap}.dsh-gc-status{padding:8px 10px;border-radius:8px;background:color-mix(in srgb,var(--dsw-alias-brand-primary) 12%,transparent);overflow-wrap:anywhere}
.dsh-gc video{width:100%;height:180px;object-fit:cover;transform:scaleX(-1);border-radius:9px;background:var(--dsw-alias-bg-base)}.dsh-gc small{color:var(--dsw-alias-label-secondary)}.dsh-gc-list{list-style:none;margin:8px 0;padding:0;max-height:260px;max-height:min(260px,45dvh);overflow:auto}.dsh-gc-list li{padding:7px;border-radius:7px}.dsh-gc-list li.active{background:color-mix(in srgb,var(--dsw-alias-brand-primary) 23%,transparent)}.dsh-gc-list small{display:block}.dsh-gc label{display:flex;align-items:center;gap:7px;margin-top:7px}.dsh-gc ol{padding-left:23px}.dsh-gc textarea{box-sizing:border-box;max-width:100%;color:inherit;background:var(--dsw-alias-bg-layer-1);border:1px solid var(--dsw-alias-border-l1)}
.dsh-gc-live,.dsh-gc-toast{border:1px solid var(--dsw-alias-border-l1);border-radius:8px;background:var(--dsw-alias-bg-overlay);padding:3px 8px;margin-top:4px}.dsh-gc-live{font-size:12px;overflow-wrap:anywhere}.dsh-gc-toast{max-width:290px;box-shadow:0 3px 14px color-mix(in srgb,var(--dsw-alias-label-primary) 15%,transparent);overflow-wrap:anywhere}
.dsh-gc-picker{position:fixed;left:12px;bottom:20px;width:280px;padding:10px;border-radius:10px;background:var(--dsw-alias-bg-overlay);border:1px solid var(--dsw-alias-border-l1);box-shadow:0 4px 20px color-mix(in srgb,var(--dsw-alias-label-primary) 15%,transparent)}
.dsh-gc-tabs{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:12px}.dsh-gc-tabs [aria-selected="true"]{border-color:var(--dsw-alias-brand-primary);background:color-mix(in srgb,var(--dsw-alias-brand-primary) 12%,var(--dsw-alias-bg-layer-2))}.dsh-gc-section[hidden]{display:none}
.dsh-gc-guide{overflow-wrap:anywhere}.dsh-gc-guide-item{border-top:1px solid var(--dsw-alias-border-l1);margin-top:12px;padding-top:8px}.dsh-gc-guide h3{font-size:14px;line-height:1.5;margin:0 0 6px}.dsh-gc-guide dl,.dsh-gc-guide dd{margin:0}.dsh-gc-guide dl>div{margin:7px 0}.dsh-gc-guide dt{font-weight:600;color:var(--dsw-alias-label-secondary)}.dsh-gc-speech-setup{border-top:1px solid var(--dsw-alias-border-l1);margin-top:12px;padding-top:10px}
.dsh-gc.dsh-gc-minimized{right:0;max-width:36px}.dsh-gc-minimized>button{width:32px;min-height:38px;padding:5px 2px;border-radius:9px 0 0 9px}
[data-dsh-gc-selected]{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:-2px}
`;
function apply(ctx) {
  let listeners = /* @__PURE__ */ new Set(), revision = 0, status = "\u70B9\u51FB\u5F00\u542F\u624B\u52BF\u540E\u624D\u4F7F\u7528\u6444\u50CF\u5934 \xB7 \u9ED8\u8BA4\u4EC5\u9884\u89C8", view = new OverlayViewState(), recognition = "\u7B49\u5F85\u624B\u52BF", toast = "", toastTimer, motionUntil = 0, emit = () => {
    revision++;
    for (let fn of listeners) fn();
  }, changed = (message) => {
    message && (status = toast = message, clearTimeout(toastTimer), toastTimer = setTimeout(() => {
      toast = "", emit();
    }, 2800)), emit();
  }, adapter = new DshAdapter(ctx), speech = new SpeechCapture(adapter, changed), dual = new DualLink(ctx.get("connection"), adapter, changed), controller = new GestureController(adapter, speech, changed, dual), camera = new CameraPreview(controller, changed, (observation, event) => {
    let label = poseNames[observation.pose] || "\u6570\u5B57 " + observation.pose;
    if (event?.type === "swipe")
      label = { up: "\u4E0A\u6ED1", down: "\u4E0B\u6ED1", left: "\u5DE6\u6ED1", right: "\u53F3\u6ED1" }[event.direction], motionUntil = performance.now() + 350;
    else if (performance.now() < motionUntil) return;
    recognition !== label && (recognition = label, emit());
  }), subscribe = (listener) => (listeners.add(listener), () => listeners.delete(listener)), stop = () => {
    camera.stop(), recognition = "\u7B49\u5F85\u624B\u52BF", motionUntil = 0, controller.actions = !1, controller.close(), emit();
  }, visibility = () => {
    document.hidden ? (camera.suspend(), speech.state === "recording" && speech.stop(), changed("\u7A97\u53E3\u5DF2\u9690\u85CF \xB7 \u624B\u52BF\u6682\u505C\uFF1B\u8FD8\u539F\u540E\u5148\u653E\u4E0B\u624B\u518D\u64CD\u4F5C")) : camera.enabled && changed("\u7A97\u53E3\u5DF2\u6062\u590D \xB7 \u8BF7\u5148\u653E\u4E0B\u624B\uFF0C\u518D\u505A\u4E0B\u4E00\u6B21\u624B\u52BF");
  };
  ctx.effect(() => {
    let tag = document.createElement("style");
    return tag.dataset.pluginCss = "dsh-gesture-control", tag.textContent = css, document.head.append(tag), () => tag.remove();
  }), ctx.effect(() => {
    let unsubscribe = adapter.subscribe(emit);
    document.addEventListener("visibilitychange", visibility), window.addEventListener("pagehide", stop);
    let endLinks = () => dual.close();
    window.addEventListener("pagehide", endLinks);
    let disconnect = dual.connection?.state.subscribe(() => {
      dual.connection.state.getSnapshot() !== "connected" && endLinks();
    });
    return () => {
      disconnect?.(), endLinks(), stop(), clearTimeout(toastTimer), adapter.clearTranscript(), unsubscribe(), document.removeEventListener("visibilitychange", visibility), window.removeEventListener("pagehide", stop), window.removeEventListener("pagehide", endLinks), listeners.clear();
    };
  });
  // Optional locale service: no preference writes and no new hard dependency.
  let locale = ctx.get("locale"), translate = locale?.bind?.("dsh-gesture-control.panel.v018"), t = (key) => {
    let value = translate?.(key);
    return value && value !== key ? value : panelMessages.zh[key] ?? key;
  };
  ctx.effect(() => {
    if (!locale?.register || !translate) return;
    let disposers = [];
    try {
      for (let language of ["zh", "en"]) disposers.push(locale.register("dsh-gesture-control.panel.v018", language, panelMessages[language]));
      if (locale.subscribe) disposers.push(locale.subscribe(emit));
    } catch (error) {
      for (let dispose of disposers.reverse()) dispose();
      throw error;
    }
    return () => { for (let dispose of disposers.reverse()) dispose(); };
  });
  function Panel() {
    import_react.default.useSyncExternalStore(subscribe, () => revision, () => revision);
    let video = import_react.default.useRef(null), mainButton = import_react.default.useRef(null), restoreButton = import_react.default.useRef(null), wasMinimized = import_react.default.useRef(!1), previewVisible = view.previewVisible, current = adapter.current(), panel = dual.panel || controller.panel, draft = dual.remote ? dual.draft() : null, route = dual.remote ? dual.tx?.ready ? "\u76EE\u6807\uFF1A\u5BF9\u7AEF" : "\u5BF9\u7AEF\u672A\u5C31\u7EEA" : "\u76EE\u6807\uFF1A\u672C\u673A", stream = camera.stream;
    import_react.default.useEffect(() => {
      let element = video.current;
      if (!(!previewVisible || !element || !stream))
        return element.srcObject = stream, element.play().catch(() => {
        }), () => {
          element.srcObject = null;
        };
    }, [previewVisible, stream]);
    import_react.default.useEffect(() => {
      if (view.minimized) restoreButton.current?.focus();
      else if (wasMinimized.current) mainButton.current?.focus();
      wasMinimized.current = view.minimized;
    }, [view.minimized]);
    let target = view.minimized ? null : panel?.items[panel.index]?.sessionId;
    import_react.default.useEffect(() => {
      if (!target) return;
      document.querySelector(".dsh-gc-list li.active")?.scrollIntoView({ block: "nearest" });
      let row = document.querySelector('[data-row-key="session:' + CSS.escape(target) + '"]');
      return row?.setAttribute("data-dsh-gc-selected", ""), row?.scrollIntoView({ block: "nearest" }), () => row?.removeAttribute("data-dsh-gc-selected");
    }, [target]);
    if (view.minimized) return h("div", { className: "dsh-gc dsh-gc-minimized", "data-gesture-control": version },
      h("button", { type: "button", ref: restoreButton, title: t("restoreHint"), "aria-label": t("restore"), onClick: () => { view.restore(); emit(); } }, "✋"));
    let tabKey = (event) => {
      let next = event.key === "Home" ? "control" : event.key === "End" ? "guide" : ["ArrowLeft", "ArrowRight"].includes(event.key) ? view.section === "control" ? "guide" : "control" : null;
      if (!next) return;
      event.preventDefault();
      view.select(next); emit();
      event.currentTarget.parentElement?.querySelector('[data-panel-section="' + next + '"]')?.focus();
    };
    let prepare = async () => {
      try {
        let catalog = await speechApi("catalog");
        await speechApi("prepare", { providerId: catalog.selection.providerId }), changed("\u5DF2\u8BF7\u6C42\u51C6\u5907\u8BED\u97F3\u6A21\u578B \xB7 \u8FDB\u5EA6\u89C1 DSH \u5B98\u65B9\u8BED\u97F3\u63D2\u4EF6\u8BBE\u7F6E\uFF0C\u5B8C\u6210\u540E\u518D\u5F20\u638C");
      } catch (error) {
        changed(error.message);
      }
    }, prepareMicrophone = async () => {
      try {
        (await navigator.mediaDevices.getUserMedia({ audio: !0 })).getTracks().forEach((track) => track.stop()), changed("\u9EA6\u514B\u98CE\u6743\u9650\u5DF2\u786E\u8BA4\u5E76\u91CA\u653E \xB7 \u56DE\u5230\u4E3B\u5C4F\u540E\u5F20\u638C\u5F00\u59CB\u53E3\u8FF0");
      } catch (error) {
        changed(`\u9EA6\u514B\u98CE\u672A\u5F00\u542F\uFF1A${error.message}`);
      }
    }, start = async () => {
      await camera.start(), emit();
    }, mode = camera.ready ? controller.actions ? "\u6267\u884C" : "\u4EC5\u9884\u89C8" : "\u6B63\u5728\u5F00\u542F", audio = { opening: "\u9EA6\u514B\u98CE\u51C6\u5907\u4E2D", recording: "\u5F55\u97F3\u4E2D", transcribing: "\u8F6C\u5199\u4E2D", polishing: "\u6574\u7406\u6807\u70B9\u4E2D" }[speech.state];
    return h(
      "div",
      { className: "dsh-gc", "data-gesture-control": version, onKeyDown: (event) => {
        if (event.key === "Escape" && view.expanded) { event.stopPropagation(); view.collapse(); emit(); mainButton.current?.focus(); }
      } },
      h("div", { className: "dsh-gc-toolbar" },
        h("button", { type: "button", ref: mainButton, onClick: () => { view.toggle(); emit(); }, "aria-expanded": view.expanded, "aria-controls": "dsh-gc-main" }, camera.enabled ? "◉ 手势控制" : "✋ 手势控制"),
        h("button", { type: "button", className: "dsh-gc-minimize", "aria-label": t("minimize"), title: t("minimizeHint"), onClick: () => { view.minimize(); emit(); } }, "−")),
      h("div", { className: "dsh-gc-live" }, camera.enabled ? [route, mode, audio, recognition].filter(Boolean).join(" \xB7 ") : "\u8BC6\u522B\u5DF2\u5173\u95ED", dual.arm ? dual.rx?.ready ? " \xB7 \u6B63\u5728\u63A5\u6536" : " \xB7 \u7B49\u5019\u5BF9\u7AEF" : null, h("small", null, " \xB7 v" + version)),
      dual.remote && dual.tx?.code && !dual.tx.ready && h("div", { className: "dsh-gc-live" }, "\u8BF7\u5728\u5BF9\u7AEF\u6838\u5BF9 " + dual.tx.code),
      dual.rx?.code && !dual.rx.ready && h("button", { type: "button", onClick: () => {
        try {
          dual.approve();
        } catch (e) {
          changed(e.message);
        }
      } }, "\u4E24\u7AEF\u6821\u9A8C\u7801\u76F8\u540C\u624D\u5141\u8BB8 \xB7 " + dual.rx.code),
      draft?.text && !view.expanded && h("div", { className: "dsh-gc-toast" }, "\u5BF9\u7AEF\u8349\u7A3F \xB7 " + draft.text),
      toast && h("div", { className: "dsh-gc-toast", role: "status" }, toast),
      panel && h(
        "section",
        { className: "dsh-gc-picker", "aria-label": "\u9009\u62E9\u4F1A\u8BDD" },
        h("strong", null, "\u261D 1 \u4E0A\u4E00\u6761 \xB7 \u270C 2 \u4E0B\u4E00\u6761 \xB7 \u63E1\u62F3\u8FDB\u5165"),
        h("div", null, h("small", null, "\u540C\u5411\u518D\u8D70\u4E00\u6761\uFF0C\u653E\u4E0B\u624B\u518D\u6BD4\u4E00\u6B21\u3002\u6BD4 \u{1F91F} \u6536\u8D77\u5217\u8868\u3002")),
        h("ul", { className: "dsh-gc-list" }, panel.items.map((item, index) => h("li", { key: item.sessionId, className: panel.index === index ? "active" : "", onClick: () => {
          panel.index = index, emit();
        } }, item.title, h("small", null, item.workspaceTitle || "\u9ED8\u8BA4\u5DE5\u4F5C\u533A"))))
      ),
      h(
        "section",
        { className: "dsh-gc-card", id: "dsh-gc-main", style: { display: view.expanded ? "block" : "none" }, "aria-label": "手势控制" },
        h("div", { className: "dsh-gc-tabs", role: "tablist", "aria-label": t("sections") },
          ...["control", "guide"].map((section) => h("button", { key: section, type: "button", id: "dsh-gc-tab-" + section, role: "tab", "data-panel-section": section, "aria-selected": view.section === section, "aria-controls": "dsh-gc-section-" + section, tabIndex: view.section === section ? 0 : -1, onClick: () => { view.select(section); emit(); }, onKeyDown: tabKey }, t(section)))),
        h("div", { className: "dsh-gc-section", id: "dsh-gc-section-control", role: "tabpanel", "aria-labelledby": "dsh-gc-tab-control", hidden: view.section !== "control" },
        h("strong", null, "\u5355\u624B\u63A7\u5236 \xB7 \u65E0\u9700\u5207\u6362\u952E\u76D8\u7126\u70B9"),
        h("p", { className: "dsh-gc-status" }, status),
        previewVisible && h("video", { ref: video, muted: !0, playsInline: !0, "aria-label": "\u672C\u5730\u955C\u50CF\u6444\u50CF\u5934\u9884\u89C8" }),
        h(
          "div",
          { className: "dsh-gc-row" },
          h("button", { type: "button", onClick: start, disabled: camera.enabled }, "\u5F00\u542F\u624B\u52BF"),
          h("button", { type: "button", onClick: () => {
            view.collapse(), emit(), mainButton.current?.focus();
          } }, t("collapse")),
          h("button", { type: "button", onClick: stop, disabled: !camera.enabled && !speech.busy }, "\u505C\u6B62\u8BC6\u522B\u5E76\u91CA\u653E\u8BBE\u5907")
        ),
        h("label", null, h("input", { type: "checkbox", checked: controller.actions, disabled: !camera.ready, onChange: (e) => {
          controller.actions = e.target.checked, controller.actions || (controller.panel = null, dual.resetSender()), changed(controller.actions ? "\u5DF2\u63A5\u5165 DSH \u52A8\u4F5C" : "\u4EC5\u9884\u89C8 \xB7 \u4E0D\u6267\u884C DSH \u52A8\u4F5C");
        } }), "\u63A5\u5165 DSH \u52A8\u4F5C"),
        h("label", null, h("input", { type: "checkbox", checked: !!dual.arm, onChange: (e) => dual.listen(e.target.checked).catch((err) => changed(err.message)) }), "\u5141\u8BB8\u914D\u5BF9\u8BBE\u5907\u8FDE\u63A5\u5F53\u524D Dual \u4F1A\u8BDD"),
        h("p", null, "\u{1F919} \u62C7\u6307\u548C\u5C0F\u6307\u4F38\u5F00\u4FDD\u6301\u534A\u79D2\uFF0C\u5207\u6362\u672C\u673A / \u5BF9\u7AEF\u3002\u9996\u6B21\u8FDE\u63A5\u5728\u63A5\u6536\u7AEF\u6838\u5BF9\u6821\u9A8C\u7801\u3002"),
        draft && h("label", null, "\u5BF9\u7AEF\u6587\u5B57\u8349\u7A3F", h("textarea", { value: draft.text, maxLength: 12e3, placeholder: "\u5F20\u638C\u53E3\u8FF0\uFF0C\u63E1\u62F3\u8F6C\u5199\uFF0C\u7AD6\u62C7\u6307\u53D1\u9001", onChange: (e) => {
          draft.edit(e.target.value), emit();
        } })),
        h("p", null, h("small", null, "\u6536\u8D77\u5C0F\u7A97\u540E\u7167\u5E38\u8BC6\u522B\u3002\u{1F91F} \u4FDD\u6301\u534A\u79D2\u5F00\u5173\u4F1A\u8BDD\u5217\u8868\uFF0C1 \u4E0A\u30012 \u4E0B\uFF0C\u63E1\u62F3\u8FDB\u5165\u3002")),
        speech.state === "recording" && h("button", { type: "button", onClick: () => speech.stop() }, "\u7ED3\u675F\u5F55\u97F3"),
        !panel && current?.question && h(
          "div",
          null,
          h("strong", null, `\u9898\u76EE ${current.question.index + 1}/${current.question.total} \xB7 ${current.question.multi ? "\u591A\u9009\uFF0C\u63E1\u62F3\u63D0\u4EA4" : "\u5355\u9009"}`),
          h("ol", null, current.question.options.map((option, index) => h("li", { key: index }, `${index + 1}. ${option.label}`))),
          h("small", null, "1\u20135 \u5BF9\u5E94\u9009\u9879\u3002\u9009 3 \u53EF\u4F38\u98DF\u6307\u3001\u4E2D\u6307\u3001\u65E0\u540D\u6307\u3002\u{1F91F} \u6253\u5F00\u4F1A\u8BDD\u5217\u8868\u3002\u66F4\u591A\u9009\u9879\u53EF\u4E0A\u4E0B\u6ED1\u52A8\u6D4F\u89C8\u3002")
        ),
        h("section", { className: "dsh-gc-speech-setup" },
          h("strong", null, t("speechTitle")),
          h("p", null, t("speechPrivacy")),
          h("div", { className: "dsh-gc-row" },
            h("button", { type: "button", onClick: prepare }, t("prepareSpeech")),
            h("button", { type: "button", onClick: prepareMicrophone }, t("prepareMicrophone"))),
          h("p", null, h("small", null, t("mediaPrivacy"))),
          h("small", null, t("guideTarget") + ": " + (current?.sessionId || t("noSession"))))
        ),
        h("div", { className: "dsh-gc-section", id: "dsh-gc-section-guide", role: "tabpanel", "aria-labelledby": "dsh-gc-tab-guide", hidden: view.section !== "guide" }, renderGestureGuide(t))
      )
    );
  }
  let slots = ctx.get("slots");
  slots.inject("shell.overlay", () => slots.register({ name: "shell.overlay", id: "dsh-gesture-control.overlay", order: 200 }, Panel));
}

return module.exports;}});
